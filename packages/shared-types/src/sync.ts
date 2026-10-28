import type { ID, ISO8601String } from './common.js';

export interface SyncPullRequest {
  cursor?: string;
  limit?: number;
  collections?: string[];
  deviceId: string;
}

export interface SyncPullEvent {
  collection: string;
  operation: 'upsert' | 'delete' | 'archive';
  documentId: string;
  document?: Record<string, unknown>;
  serverTimestamp: ISO8601String;
  checksum: string;
}

export interface SyncPullResponse {
  batchId: string;
  cursor: string;
  nextCursor: string;
  hasMore: boolean;
  events: SyncPullEvent[];
  serverTime: ISO8601String;
  schemaVersions: Record<string, number>;
}

export interface SyncPushOperation {
  operationId: string;
  idempotencyKey: string;
  type: string;
  payload: Record<string, unknown>;
  clientTimestamp: ISO8601String;
  schemaVersion: number;
}

export interface SyncPushRequest {
  batchId: string;
  operations: SyncPushOperation[];
  deviceId: string;
}

export type SyncOperationStatus = 'accepted' | 'rejected' | 'conflict' | 'duplicate';

export interface SyncOperationResult {
  operationId: string;
  idempotencyKey: string;
  status: SyncOperationStatus;
  serverEventId?: ID;
  serverTimestamp?: ISO8601String;
  reason?: string;
  conflictData?: {
    serverVersion: Record<string, unknown>;
    hint: string;
  };
}

export interface SyncPushResponse {
  batchId: string;
  processedAt: ISO8601String;
  results: SyncOperationResult[];
}

export type OutboxStatus = 'pending' | 'submitted' | 'accepted' | 'rejected' | 'conflict';

export interface OutboxRecord {
  id: string;
  operationId: string;
  idempotencyKey: string;
  type: string;
  payload: string;       // JSON serialized
  status: OutboxStatus;
  attempts: number;
  lastAttemptAt?: ISO8601String;
  serverEventId?: ID;
  errorMessage?: string;
  createdAt: ISO8601String;
}

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error';

export interface SyncState {
  status: SyncStatus;
  lastSyncedAt?: ISO8601String;
  pendingCount: number;
  failedCount: number;
  conflictCount: number;
}
