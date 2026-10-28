import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import mongoose from 'mongoose';
import { ValidationError } from '../../middleware/error.middleware.js';
import { SaleModel } from '../sales/sales.models.js';
import { ProductModel, CategoryModel } from '../products/products.models.js';
import { StockProjectionModel } from '../products/products.models.js';

const pullSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
  collections: z.string().optional(), // comma-separated
  deviceId: z.string().min(1),
});

const pushOperationSchema = z.object({
  operationId: z.string().uuid(),
  idempotencyKey: z.string().uuid(),
  type: z.string().min(1),
  payload: z.record(z.unknown()),
  clientTimestamp: z.string().datetime(),
  schemaVersion: z.number().int().positive(),
});

const pushSchema = z.object({
  batchId: z.string().uuid(),
  operations: z.array(pushOperationSchema).max(50),
  deviceId: z.string().min(1),
});

function decodeCursor(cursor: string): { ts: Date; lastId: string } | null {
  try {
    return JSON.parse(Buffer.from(cursor, 'base64').toString('utf8')) as { ts: Date; lastId: string };
  } catch {
    return null;
  }
}

function encodeCursor(ts: Date, lastId: string): string {
  return Buffer.from(JSON.stringify({ ts, lastId })).toString('base64');
}

export async function syncRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/v1/sync/pull — pull server changes down to client
  app.get('/pull', async (request, reply) => {
    const query = pullSchema.parse(request.query);
    const orgId = new mongoose.Types.ObjectId(request.tenantId);

    const requestedCollections = query.collections?.split(',') ?? ['products', 'categories'];
    const cursorData = query.cursor ? decodeCursor(query.cursor) : null;
    const sinceDate = cursorData?.ts ? new Date(cursorData.ts) : new Date(0);

    const events: Array<{
      collection: string;
      operation: 'upsert' | 'delete';
      documentId: string;
      document?: Record<string, unknown>;
      serverTimestamp: string;
      checksum: string;
    }> = [];

    // Pull product changes
    if (requestedCollections.includes('products')) {
      const products = await ProductModel.find({
        organizationId: orgId,
        updatedAt: { $gt: sinceDate },
      })
        .limit(query.limit)
        .lean();

      for (const p of products) {
        events.push({
          collection: 'products',
          operation: p.isActive ? 'upsert' : 'delete',
          documentId: p._id.toString(),
          document: p.isActive ? (p as unknown as Record<string, unknown>) : undefined,
          serverTimestamp: p.updatedAt.toISOString(),
          checksum: p._id.toString().slice(-8),
        });
      }
    }

    // Pull category changes
    if (requestedCollections.includes('categories')) {
      const categories = await CategoryModel.find({
        organizationId: orgId,
        updatedAt: { $gt: sinceDate },
      })
        .limit(query.limit)
        .lean();

      for (const c of categories) {
        events.push({
          collection: 'categories',
          operation: 'upsert',
          documentId: c._id.toString(),
          document: c as unknown as Record<string, unknown>,
          serverTimestamp: (c as unknown as { updatedAt: Date }).updatedAt?.toISOString() ?? new Date().toISOString(),
          checksum: c._id.toString().slice(-8),
        });
      }
    }

    const now = new Date();
    const nextCursor = encodeCursor(now, '');

    return reply.send({
      data: {
        batchId: new mongoose.Types.ObjectId().toString(),
        cursor: nextCursor,
        nextCursor,
        hasMore: false,
        events,
        serverTime: now.toISOString(),
        schemaVersions: { products: 1, categories: 1, sales: 1 },
      },
    });
  });

  // POST /api/v1/sync/push — submit offline operations to server
  app.post('/push', async (request, reply) => {
    const body = pushSchema.parse(request.body);
    const orgId = new mongoose.Types.ObjectId(request.tenantId);

    const results: Array<{
      operationId: string;
      idempotencyKey: string;
      status: string;
      serverEventId?: string;
      serverTimestamp?: string;
      reason?: string;
    }> = [];

    for (const operation of body.operations) {
      try {
        // Enforce: payload.organizationId must match token-derived tenantId
        if (
          typeof operation.payload['organizationId'] === 'string' &&
          operation.payload['organizationId'] !== request.tenantId
        ) {
          results.push({
            operationId: operation.operationId,
            idempotencyKey: operation.idempotencyKey,
            status: 'rejected',
            reason: 'Organization ID mismatch',
          });
          continue;
        }

        // Route to the appropriate handler based on type
        // For now, SALE_COMPLETED operations are handled here
        if (operation.type === 'SALE_COMPLETED') {
          // Check idempotency via offlineId
          const offlineId = operation.payload['offlineId'] as string | undefined;
          if (offlineId) {
            const existing = await SaleModel.findOne({ organizationId: orgId, offlineId });
            if (existing) {
              results.push({
                operationId: operation.operationId,
                idempotencyKey: operation.idempotencyKey,
                status: 'duplicate',
                serverEventId: existing._id.toString(),
              });
              continue;
            }
          }
        }

        // Generic accepted response — full handler would delegate to the appropriate module
        results.push({
          operationId: operation.operationId,
          idempotencyKey: operation.idempotencyKey,
          status: 'accepted',
          serverTimestamp: new Date().toISOString(),
        });
      } catch (err) {
        results.push({
          operationId: operation.operationId,
          idempotencyKey: operation.idempotencyKey,
          status: 'rejected',
          reason: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    return reply.send({
      data: {
        batchId: body.batchId,
        processedAt: new Date().toISOString(),
        results,
      },
    });
  });
}
