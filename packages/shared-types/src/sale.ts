import type {
  ID,
  ISO8601String,
  MoneyAmount,
  PaymentMethod,
  SaleStatus,
} from './common.js';

export interface SaleItem {
  id: ID;
  organizationId: ID;
  saleId: ID;
  productId: ID;
  variantId?: ID;
  productName: string;    // snapshot
  sku: string;            // snapshot
  barcode?: string;       // snapshot
  quantity: number;
  unitPrice: MoneyAmount;
  costPrice: MoneyAmount;
  discountAmount: MoneyAmount;
  taxAmount: MoneyAmount;
  lineTotal: MoneyAmount;
  createdAt: ISO8601String;
}

export interface Payment {
  method: PaymentMethod;
  amount: MoneyAmount;
  reference?: string;
}

export interface Sale {
  id: ID;
  organizationId: ID;
  branchId: ID;
  registerId: ID;
  shiftId: ID;
  receiptNumber: string;
  status: SaleStatus;
  customerId?: ID;
  cashierId: ID;
  items: SaleItem[];
  subtotal: MoneyAmount;
  discountAmount: MoneyAmount;
  taxAmount: MoneyAmount;
  total: MoneyAmount;
  amountPaid: MoneyAmount;
  change: MoneyAmount;
  payments: Payment[];
  notes?: string;
  deviceId: string;
  offlineId?: string;
  syncStatus: 'local' | 'synced' | 'conflict';
  completedAt?: ISO8601String;
  voidedAt?: ISO8601String;
  voidedBy?: ID;
  voidReason?: string;
  createdAt: ISO8601String;
  updatedAt: ISO8601String;
}

export interface CartItem {
  productId: ID;
  variantId?: ID;
  productName: string;
  sku: string;
  barcode?: string;
  quantity: number;
  unitPrice: MoneyAmount;
  costPrice: MoneyAmount;
  discountAmount: MoneyAmount;
  taxAmount: MoneyAmount;
  lineTotal: MoneyAmount;
  taxInclusive: boolean;
}

export interface Cart {
  items: CartItem[];
  customerId?: ID;
  notes?: string;
  subtotal: MoneyAmount;
  discountAmount: MoneyAmount;
  taxAmount: MoneyAmount;
  total: MoneyAmount;
}

export interface CompleteSaleRequest {
  branchId: ID;
  registerId: ID;
  shiftId: ID;
  customerId?: ID;
  items: Array<{
    productId: ID;
    variantId?: ID;
    quantity: number;
    discountAmount?: MoneyAmount;
  }>;
  payments: Payment[];
  notes?: string;
  offlineId?: string;
  deviceId: string;
  clientTimestamp: ISO8601String;
}

export interface Receipt {
  receiptNumber: string;
  businessName: string;
  branchName: string;
  branchAddress?: string;
  cashierName: string;
  date: ISO8601String;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: MoneyAmount;
    discountAmount: MoneyAmount;
    lineTotal: MoneyAmount;
  }>;
  subtotal: MoneyAmount;
  discountAmount: MoneyAmount;
  taxAmount: MoneyAmount;
  total: MoneyAmount;
  payments: Payment[];
  amountPaid: MoneyAmount;
  change: MoneyAmount;
  currency: string;
  footer?: string;
}

export interface Shift {
  id: ID;
  organizationId: ID;
  branchId: ID;
  registerId: ID;
  cashierId: ID;
  status: 'open' | 'closed';
  openingFloat: MoneyAmount;
  expectedCash?: MoneyAmount;
  closingCount?: MoneyAmount;
  variance?: MoneyAmount;
  openedAt: ISO8601String;
  closedAt?: ISO8601String;
  closedBy?: ID;
  notes?: string;
  createdAt: ISO8601String;
}

export interface RefundRequest {
  saleId: ID;
  reason: string;
  items: Array<{
    saleItemId: ID;
    quantity: number;
  }>;
  refundPaymentMethod: PaymentMethod;
  notes?: string;
}
