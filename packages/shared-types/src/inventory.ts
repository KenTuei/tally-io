import type { ID, ISO8601String, MoneyAmount, InventoryEventType } from './common.js';

export interface InventoryEvent {
  id: ID;
  organizationId: ID;
  branchId: ID;
  productId: ID;
  variantId?: ID;
  type: InventoryEventType;
  quantity: number;       // signed delta
  unitCost?: MoneyAmount;
  referenceType: 'sale' | 'purchase_order' | 'adjustment' | 'transfer' | 'stocktake' | 'return';
  referenceId: ID;
  reason?: string;
  actorId: ID;
  deviceId: string;
  idempotencyKey: string;
  batchNumber?: string;
  expiryDate?: ISO8601String;
  createdAt: ISO8601String;
}

export interface StockProjection {
  organizationId: ID;
  branchId: ID;
  productId: ID;
  variantId?: ID;
  quantityOnHand: number;
  lastInventoryEventId: ID;
  updatedAt: ISO8601String;
}

export interface StockAdjustmentRequest {
  productId: ID;
  variantId?: ID;
  branchId: ID;
  quantity: number;
  reason: string;
  idempotencyKey: string;
}

export interface StockTransferRequest {
  productId: ID;
  variantId?: ID;
  fromBranchId: ID;
  toBranchId: ID;
  quantity: number;
  reason?: string;
  idempotencyKey: string;
}

export interface LowStockAlert {
  productId: ID;
  productName: string;
  sku: string;
  branchId: ID;
  branchName: string;
  quantityOnHand: number;
  lowStockThreshold: number;
}
