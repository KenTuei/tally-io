import type { RxJsonSchema } from 'rxdb';

// ── Local Sale (created offline, pending sync) ──────────────────────────────
export interface LocalSaleDoc {
  id: string;
  organizationId: string;
  branchId: string;
  registerId: string;
  shiftId: string;
  customerId?: string;
  cashierId: string;
  items: Array<{
    productId: string;
    variantId?: string;
    productName: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    costPrice: number;
    discountAmount: number;
    taxAmount: number;
    lineTotal: number;
  }>;
  payments: Array<{ method: string; amount: number; reference?: string }>;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  amountPaid: number;
  change: number;
  notes?: string;
  receiptNumber?: string;
  status: 'local' | 'synced' | 'conflict';
  offlineId: string;
  deviceId: string;
  clientTimestamp: string;
  serverSaleId?: string;
  createdAt: string;
  updatedAt: string;
}

export const localSaleSchema: RxJsonSchema<LocalSaleDoc> = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    organizationId: { type: 'string' },
    branchId: { type: 'string' },
    registerId: { type: 'string' },
    shiftId: { type: 'string' },
    customerId: { type: 'string' },
    cashierId: { type: 'string' },
    items: { type: 'array', items: { type: 'object' } },
    payments: { type: 'array', items: { type: 'object' } },
    subtotal: { type: 'number' },
    discountAmount: { type: 'number' },
    taxAmount: { type: 'number' },
    total: { type: 'number' },
    amountPaid: { type: 'number' },
    change: { type: 'number' },
    notes: { type: 'string' },
    receiptNumber: { type: 'string' },
    status: { type: 'string' },
    offlineId: { type: 'string' },
    deviceId: { type: 'string' },
    clientTimestamp: { type: 'string' },
    serverSaleId: { type: 'string' },
    createdAt: { type: 'string' },
    updatedAt: { type: 'string' },
  },
  required: ['id', 'organizationId', 'branchId', 'offlineId', 'status', 'clientTimestamp'],
  indexes: ['status', 'organizationId', 'createdAt'],
};

// ── Outbox (pending sync operations) ───────────────────────────────────────
export interface OutboxDoc {
  id: string;
  operationId: string;
  idempotencyKey: string;
  type: string;
  payload: string; // JSON serialized
  status: 'pending' | 'submitted' | 'accepted' | 'rejected' | 'conflict';
  attempts: number;
  lastAttemptAt?: string;
  serverEventId?: string;
  errorMessage?: string;
  createdAt: string;
}

export const outboxSchema: RxJsonSchema<OutboxDoc> = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    operationId: { type: 'string' },
    idempotencyKey: { type: 'string' },
    type: { type: 'string' },
    payload: { type: 'string' },
    status: { type: 'string' },
    attempts: { type: 'number' },
    lastAttemptAt: { type: 'string' },
    serverEventId: { type: 'string' },
    errorMessage: { type: 'string' },
    createdAt: { type: 'string' },
  },
  required: ['id', 'operationId', 'idempotencyKey', 'type', 'payload', 'status', 'attempts', 'createdAt'],
  indexes: ['status', 'createdAt'],
};

// ── Cached Product (synced from server, read-only locally) ──────────────────
export interface CachedProductDoc {
  id: string;
  organizationId: string;
  name: string;
  sku: string;
  barcode?: string;
  categoryId?: string;
  costPrice: number;
  sellingPrice: number;
  taxInclusive: boolean;
  images: string[];
  isActive: boolean;
  isService: boolean;
  trackInventory: boolean;
  lowStockThreshold: number;
  unitOfMeasure: string;
  updatedAt: string;
}

export const cachedProductSchema: RxJsonSchema<CachedProductDoc> = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    organizationId: { type: 'string' },
    name: { type: 'string' },
    sku: { type: 'string' },
    barcode: { type: 'string' },
    categoryId: { type: 'string' },
    costPrice: { type: 'number' },
    sellingPrice: { type: 'number' },
    taxInclusive: { type: 'boolean' },
    images: { type: 'array', items: { type: 'string' } },
    isActive: { type: 'boolean' },
    isService: { type: 'boolean' },
    trackInventory: { type: 'boolean' },
    lowStockThreshold: { type: 'number' },
    unitOfMeasure: { type: 'string' },
    updatedAt: { type: 'string' },
  },
  required: ['id', 'organizationId', 'name', 'sku'],
  indexes: ['organizationId', 'sku', 'isActive'],
};

// ── Sync Metadata ──────────────────────────────────────────────────────────
export interface SyncMetaDoc {
  id: string; // e.g. "products", "categories"
  cursor: string;
  lastSyncedAt: string;
  schemaVersion: number;
}

export const syncMetaSchema: RxJsonSchema<SyncMetaDoc> = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    cursor: { type: 'string' },
    lastSyncedAt: { type: 'string' },
    schemaVersion: { type: 'number' },
  },
  required: ['id', 'cursor', 'lastSyncedAt', 'schemaVersion'],
};
