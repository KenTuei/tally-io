import mongoose, { type Document, type Model, Schema } from 'mongoose';

// ----- Sale -------------------------------------------------------
export interface ISale extends Document {
  _id: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
  registerId: mongoose.Types.ObjectId;
  shiftId: mongoose.Types.ObjectId;
  receiptNumber: string;
  status: string;
  customerId?: mongoose.Types.ObjectId;
  cashierId: mongoose.Types.ObjectId;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  amountPaid: number;
  change: number;
  notes?: string;
  deviceId: string;
  offlineId?: string;
  syncStatus: string;
  completedAt?: Date;
  voidedAt?: Date;
  voidedBy?: mongoose.Types.ObjectId;
  voidReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const saleSchema = new Schema<ISale>(
  {
    organizationId: { type: Schema.Types.ObjectId, required: true },
    branchId: { type: Schema.Types.ObjectId, required: true },
    registerId: { type: Schema.Types.ObjectId, required: true },
    shiftId: { type: Schema.Types.ObjectId, required: true },
    receiptNumber: { type: String, required: true },
    status: { type: String, required: true, default: 'completed' },
    customerId: { type: Schema.Types.ObjectId },
    cashierId: { type: Schema.Types.ObjectId, required: true },
    subtotal: { type: Number, required: true, min: 0 },
    discountAmount: { type: Number, required: true, default: 0 },
    taxAmount: { type: Number, required: true, default: 0 },
    total: { type: Number, required: true, min: 0 },
    amountPaid: { type: Number, required: true, min: 0 },
    change: { type: Number, required: true, default: 0 },
    notes: { type: String },
    deviceId: { type: String, required: true },
    offlineId: { type: String },
    syncStatus: { type: String, default: 'synced' },
    completedAt: { type: Date },
    voidedAt: { type: Date },
    voidedBy: { type: Schema.Types.ObjectId },
    voidReason: { type: String },
  },
  { timestamps: true },
);

saleSchema.index({ organizationId: 1, receiptNumber: 1 }, { unique: true });
saleSchema.index({ organizationId: 1, branchId: 1, completedAt: -1 });
saleSchema.index({ organizationId: 1, cashierId: 1, completedAt: -1 });
saleSchema.index({ organizationId: 1, customerId: 1 });
saleSchema.index({ offlineId: 1 }, { sparse: true, unique: true });

export const SaleModel: Model<ISale> = mongoose.model<ISale>('sales', saleSchema);

// ----- SaleItem -------------------------------------------------------
export interface ISaleItem extends Document {
  _id: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  saleId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  variantId?: mongoose.Types.ObjectId;
  productName: string;
  sku: string;
  barcode?: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  discountAmount: number;
  taxAmount: number;
  lineTotal: number;
  createdAt: Date;
}

const saleItemSchema = new Schema<ISaleItem>(
  {
    organizationId: { type: Schema.Types.ObjectId, required: true },
    saleId: { type: Schema.Types.ObjectId, required: true },
    productId: { type: Schema.Types.ObjectId, required: true },
    variantId: { type: Schema.Types.ObjectId },
    productName: { type: String, required: true },
    sku: { type: String, required: true },
    barcode: { type: String },
    quantity: { type: Number, required: true, min: 0 },
    unitPrice: { type: Number, required: true, min: 0 },
    costPrice: { type: Number, required: true, min: 0 },
    discountAmount: { type: Number, required: true, default: 0 },
    taxAmount: { type: Number, required: true, default: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { timestamps: true },
);

saleItemSchema.index({ saleId: 1 });
saleItemSchema.index({ organizationId: 1, productId: 1 });

export const SaleItemModel: Model<ISaleItem> = mongoose.model<ISaleItem>('saleItems', saleItemSchema);

// ----- PaymentAttempt -------------------------------------------------------
export interface IPaymentAttempt extends Document {
  _id: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  saleId: mongoose.Types.ObjectId;
  method: string;
  amount: number;
  currency: string;
  status: string;
  reference?: string;
  idempotencyKey: string;
  initiatedAt: Date;
  confirmedAt?: Date;
  createdAt: Date;
}

const paymentAttemptSchema = new Schema<IPaymentAttempt>(
  {
    organizationId: { type: Schema.Types.ObjectId, required: true },
    saleId: { type: Schema.Types.ObjectId, required: true },
    method: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: 'KES' },
    status: { type: String, required: true, default: 'confirmed' },
    reference: { type: String },
    idempotencyKey: { type: String, required: true },
    initiatedAt: { type: Date, required: true },
    confirmedAt: { type: Date },
  },
  { timestamps: true },
);

paymentAttemptSchema.index({ saleId: 1 });
paymentAttemptSchema.index({ idempotencyKey: 1 }, { unique: true });

export const PaymentAttemptModel: Model<IPaymentAttempt> = mongoose.model<IPaymentAttempt>(
  'paymentAttempts',
  paymentAttemptSchema,
);
