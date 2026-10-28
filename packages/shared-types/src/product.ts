import type { ID, ISO8601String, MoneyAmount } from './common.js';

export interface Product {
  id: ID;
  organizationId: ID;
  name: string;
  description?: string;
  sku: string;
  barcode?: string;
  categoryId?: ID;
  brandId?: ID;
  unitOfMeasure: string;
  hasVariants: boolean;
  costPrice: MoneyAmount;      // cents
  sellingPrice: MoneyAmount;   // cents
  wholesalePrice?: MoneyAmount; // cents
  taxRateId?: ID;
  taxInclusive: boolean;
  supplierId?: ID;
  images: string[];
  isActive: boolean;
  isService: boolean;
  trackInventory: boolean;
  allowNegativeStock: boolean;
  lowStockThreshold: number;
  batchTracking: boolean;
  expiryTracking: boolean;
  createdAt: ISO8601String;
  updatedAt: ISO8601String;
}

export interface ProductVariant {
  id: ID;
  organizationId: ID;
  productId: ID;
  name: string;
  sku: string;
  barcode?: string;
  attributes: Record<string, string>;
  costPrice?: MoneyAmount;
  sellingPrice?: MoneyAmount;
  isActive: boolean;
  createdAt: ISO8601String;
  updatedAt: ISO8601String;
}

export interface Category {
  id: ID;
  organizationId: ID;
  name: string;
  parentId?: ID;
  sortOrder: number;
  isActive: boolean;
  createdAt: ISO8601String;
}

export interface TaxRate {
  id: ID;
  organizationId: ID;
  name: string;
  rate: number;  // e.g. 16 for 16% VAT — stored as integer percentage
  isDefault: boolean;
  isActive: boolean;
}

export interface StockInfo {
  productId: ID;
  variantId?: ID;
  branchId: ID;
  quantityOnHand: number;
  updatedAt: ISO8601String;
}

export interface CreateProductRequest {
  name: string;
  description?: string;
  sku: string;
  barcode?: string;
  categoryId?: string;
  unitOfMeasure: string;
  costPrice: MoneyAmount;
  sellingPrice: MoneyAmount;
  taxRateId?: string;
  taxInclusive?: boolean;
  supplierId?: string;
  trackInventory?: boolean;
  lowStockThreshold?: number;
  isService?: boolean;
}

export interface UpdateProductRequest extends Partial<CreateProductRequest> {
  isActive?: boolean;
}
