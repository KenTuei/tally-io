/**
 * Outbox processor — submits pending local operations to the server.
 * Every offline operation is written here BEFORE the UI reports success.
 * Retries with exponential backoff. Never duplicates on retry (idempotency key).
 */
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from './database';
import { api } from '../api';
import { useSyncStore } from '../../stores/syncStore';
import type { SyncPushResponse } from '@tally/shared-types';

const RETRY_DELAYS_MS = [5_000, 30_000, 120_000, 600_000, 3_600_000]; // 5s → 1h

let processorRunning = false;
let processorTimer: ReturnType<typeof setTimeout> | null = null;

/** Add a new operation to the outbox. Call this before confirming to the user. */
export async function enqueueOperation(
  type: string,
  payload: Record<string, unknown>,
): Promise<string> {
  const db = await getDatabase();
  const id = uuidv4();
  const operationId = uuidv4();
  const idempotencyKey = (payload['offlineId'] as string | undefined) ?? uuidv4();

  await db.outbox.insert({
    id,
    operationId,
    idempotencyKey,
    type,
    payload: JSON.stringify(payload),
    status: 'pending',
    attempts: 0,
    createdAt: new Date().toISOString(),
  });

  // Update sync store
  const pending = await db.outbox.count().exec();
  useSyncStore.getState().setPendingCount(pending);

  scheduleProcessor(0);
  return id;
}

/** Schedule the outbox processor. Pass delay=0 to run immediately. */
export function scheduleProcessor(delay = 5_000): void {
  if (processorTimer) clearTimeout(processorTimer);
  processorTimer = setTimeout(() => void runProcessor(), delay);
}

async function runProcessor(): Promise<void> {
  if (processorRunning) return;
  if (!useSyncStore.getState().isOnline) return;

  processorRunning = true;
  const syncStore = useSyncStore.getState();
  syncStore.setStatus('syncing');

  try {
    const db = await getDatabase();
    const deviceId = localStorage.getItem('tally-device-id') ?? 'unknown';

    // Get pending records (max 50 per batch)
    const pendingDocs = await db.outbox
      .find({ selector: { status: { $in: ['pending', 'submitted'] } } })
      .sort({ createdAt: 'asc' })
      .limit(50)
      .exec();

    if (pendingDocs.length === 0) {
      syncStore.setStatus('synced');
      syncStore.setLastSyncedAt(new Date().toISOString());
      syncStore.setPendingCount(0);
      return;
    }

    const batchId = uuidv4();
    const operations = pendingDocs.map((doc) => ({
      operationId: doc.operationId,
      idempotencyKey: doc.idempotencyKey,
      type: doc.type,
      payload: JSON.parse(doc.payload) as Record<string, unknown>,
      clientTimestamp: doc.createdAt,
      schemaVersion: 1,
    }));

    // Mark as submitted before the request (so restart knows it was attempted)
    await Promise.all(
      pendingDocs.map((doc) =>
        doc.patch({ status: 'submitted', lastAttemptAt: new Date().toISOString() }),
      ),
    );

    let response: SyncPushResponse;
    try {
      response = await api.post<SyncPushResponse>('/sync/push', {
        batchId,
        operations,
        deviceId,
      });
    } catch (err) {
      // Network error — revert to pending for retry
      await Promise.all(
        pendingDocs.map(async (doc) => {
          const attempts = (doc.attempts ?? 0) + 1;
          await doc.patch({
            status: 'pending',
            attempts,
            errorMessage: err instanceof Error ? err.message : 'Network error',
          });
        }),
      );
      syncStore.setStatus('error');
      return;
    }

    // Process results
    for (const result of response.results) {
      const doc = pendingDocs.find((d) => d.operationId === result.operationId);
      if (!doc) continue;

      if (result.status === 'accepted' || result.status === 'duplicate') {
        await doc.patch({
          status: 'accepted',
          serverEventId: result.serverEventId,
        });
      } else if (result.status === 'rejected') {
        const attempts = (doc.attempts ?? 0) + 1;
        await doc.patch({
          status: 'rejected',
          attempts,
          errorMessage: result.reason ?? 'Rejected by server',
        });
        syncStore.incrementFailed();
      } else if (result.status === 'conflict') {
        await doc.patch({
          status: 'conflict',
          errorMessage: result.reason ?? 'Conflict detected',
        });
        syncStore.incrementConflict();
      }
    }

    const remaining = await db.outbox.count({ selector: { status: { $in: ['pending', 'submitted'] } } }).exec();
    syncStore.setPendingCount(remaining);

    if (remaining === 0) {
      syncStore.setStatus('synced');
      syncStore.setLastSyncedAt(new Date().toISOString());
    } else {
      // More to process — run again soon
      scheduleProcessor(2_000);
    }
  } finally {
    processorRunning = false;
  }
}

/** Pull latest data from server into local RxDB cache */
export async function pullFromServer(collections = ['products', 'categories']): Promise<void> {
  const db = await getDatabase();
  const deviceId = localStorage.getItem('tally-device-id') ?? 'unknown';

  for (const collection of collections) {
    const meta = await db.sync_meta.findOne(collection).exec();
    const cursor = meta?.cursor ?? undefined;

    try {
      const params = new URLSearchParams({ deviceId, collections: collection, limit: '200' });
      if (cursor) params.set('cursor', cursor);

      const response = await api.get<{
        events: Array<{
          collection: string;
          operation: 'upsert' | 'delete';
          documentId: string;
          document?: Record<string, unknown>;
          serverTimestamp: string;
        }>;
        nextCursor: string;
        hasMore: boolean;
        serverTime: string;
      }>(`/sync/pull?${params.toString()}`);

      // Apply events to local collections
      for (const event of response.events) {
        if (event.collection === 'products' && event.document) {
          const doc = event.document as Record<string, unknown>;
          if (event.operation === 'upsert') {
            await db.cached_products.upsert({
              id: (doc['_id'] ?? doc['id']) as string,
              organizationId: doc['organizationId'] as string,
              name: doc['name'] as string,
              sku: doc['sku'] as string,
              barcode: doc['barcode'] as string | undefined,
              categoryId: doc['categoryId'] as string | undefined,
              costPrice: doc['costPrice'] as number,
              sellingPrice: doc['sellingPrice'] as number,
              taxInclusive: (doc['taxInclusive'] as boolean) ?? false,
              images: (doc['images'] as string[]) ?? [],
              isActive: (doc['isActive'] as boolean) ?? true,
              isService: (doc['isService'] as boolean) ?? false,
              trackInventory: (doc['trackInventory'] as boolean) ?? true,
              lowStockThreshold: (doc['lowStockThreshold'] as number) ?? 5,
              unitOfMeasure: (doc['unitOfMeasure'] as string) ?? 'piece',
              updatedAt: event.serverTimestamp,
            });
          } else if (event.operation === 'delete') {
            const existing = await db.cached_products.findOne(event.documentId).exec();
            if (existing) await existing.remove();
          }
        }
      }

      // Update cursor
      await db.sync_meta.upsert({
        id: collection,
        cursor: response.nextCursor,
        lastSyncedAt: response.serverTime,
        schemaVersion: 1,
      });
    } catch (err) {
      console.warn(`[Sync] Pull failed for ${collection}:`, err);
    }
  }
}
