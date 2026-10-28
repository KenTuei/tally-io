import type { ID, ISO8601String } from './common.js';

export type LedgerEventType =
  | 'SALE_CREATED'
  | 'SALE_HELD'
  | 'SALE_COMPLETED'
  | 'SALE_VOIDED'
  | 'PAYMENT_INITIATED'
  | 'PAYMENT_CONFIRMED'
  | 'PAYMENT_FAILED'
  | 'PAYMENT_CANCELLED'
  | 'REFUND_REQUESTED'
  | 'REFUND_APPROVED'
  | 'REFUND_COMPLETED'
  | 'REFUND_DENIED'
  | 'INVENTORY_RECEIVED'
  | 'INVENTORY_SOLD'
  | 'INVENTORY_ADJUSTED'
  | 'INVENTORY_TRANSFERRED'
  | 'INVENTORY_RETURNED_TO_STOCK'
  | 'INVENTORY_RETURNED_TO_SUPPLIER'
  | 'STOCKTAKE_COMPLETED'
  | 'STOCK_DAMAGED'
  | 'STOCK_EXPIRED'
  | 'SHIFT_OPENED'
  | 'SHIFT_CLOSED'
  | 'CASH_IN'
  | 'CASH_OUT'
  | 'EXPENSE_RECORDED'
  | 'EXPENSE_APPROVED'
  | 'EXPENSE_REJECTED'
  | 'PURCHASE_ORDER_CREATED'
  | 'GOODS_RECEIVED'
  | 'CUSTOMER_CREDIT_ISSUED'
  | 'CUSTOMER_CREDIT_REPAID';

export interface LedgerEvent {
  id: ID;
  eventId: string;              // UUID v4, client-generated
  idempotencyKey: string;       // UUID v4, unique per business operation
  correlationId: string;
  causationId?: string;

  organizationId: ID;
  branchId?: ID;
  deviceId: string;

  eventType: LedgerEventType;
  schemaVersion: number;
  entityType: string;
  entityId: ID;

  actorId: ID;
  actorType: 'user' | 'system' | 'integration';

  clientTimestamp: ISO8601String;
  serverTimestamp: ISO8601String;

  payload: Record<string, unknown>;

  syncBatchId?: string;
  offlineCreated: boolean;
}

export interface LedgerEventQueryParams {
  eventType?: LedgerEventType;
  entityType?: string;
  entityId?: ID;
  branchId?: ID;
  actorId?: ID;
  from?: ISO8601String;
  to?: ISO8601String;
  page?: number;
  limit?: number;
}
