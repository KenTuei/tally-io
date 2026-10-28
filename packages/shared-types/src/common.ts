// Common types shared across the entire Tally.io platform

export type ID = string;

export type Currency = string; // ISO 4217, e.g. 'KES'

/** Monetary amount in smallest currency unit (e.g. cents). Never a float. */
export type MoneyAmount = number;

export type ISO8601String = string;

export interface Timestamps {
  createdAt: ISO8601String;
  updatedAt: ISO8601String;
}

export interface TenantScoped {
  organizationId: ID;
}

export interface BranchScoped extends TenantScoped {
  branchId: ID;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  requestId?: string;
}

export interface ApiSuccess<T = unknown> {
  data: T;
  requestId?: string;
}

export type BusinessType =
  | 'retail'
  | 'supermarket'
  | 'wholesale'
  | 'distribution'
  | 'restaurant'
  | 'cafe'
  | 'hardware'
  | 'agrovet'
  | 'pharmacy'
  | 'salon'
  | 'service'
  | 'other';

export type UserRole =
  | 'platform_admin'
  | 'owner'
  | 'admin'
  | 'manager'
  | 'accountant'
  | 'inventory_manager'
  | 'cashier'
  | 'salesperson'
  | 'auditor';

export type PaymentMethod =
  | 'cash'
  | 'mpesa'
  | 'card'
  | 'bank_transfer'
  | 'credit'
  | 'other';

export type SaleStatus =
  | 'draft'
  | 'held'
  | 'pending_payment'
  | 'completed'
  | 'partially_refunded'
  | 'refunded'
  | 'voided';

export type InventoryEventType =
  | 'received'
  | 'sold'
  | 'adjusted'
  | 'transferred_in'
  | 'transferred_out'
  | 'returned_to_stock'
  | 'returned_to_supplier'
  | 'stocktake'
  | 'damaged'
  | 'expired';

export type DeviceType = 'web' | 'desktop' | 'mobile';
