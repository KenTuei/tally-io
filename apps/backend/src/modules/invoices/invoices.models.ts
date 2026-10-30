import mongoose, { type Document, type Model, Schema } from 'mongoose';

// ── Invoice Line Item (embedded) ─────────────────────────────────────────────
export interface IInvoiceItem {
  productId?: mongoose.Types.ObjectId;
  description: string;
  quantity: number;
  unitPrice: number;        // cents
  discountAmount: number;   // cents
  taxRateId?: mongoose.Types.ObjectId;
  taxRate: number;          // integer e.g. 1600 = 16%
  taxAmount: number;        // cents
  lineTotal: number;        // cents (qty × unitPrice - discount + tax)
}

// ── Payment Record (embedded) ─────────────────────────────────────────────────
export interface IInvoicePayment {
  amount: number;           // cents
  method: string;
  reference?: string;
  paidAt: Date;
  notes?: string;
  recordedBy: mongoose.Types.ObjectId;
}

// ── Invoice ───────────────────────────────────────────────────────────────────
export interface IInvoice extends Document {
  _id: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  branchId?: mongoose.Types.ObjectId;
  invoiceNumber: string;
  type: 'invoice' | 'quote' | 'credit_note';
  status: 'draft' | 'sent' | 'viewed' | 'partial' | 'paid' | 'overdue' | 'cancelled' | 'void';

  // Customer
  customerId?: mongoose.Types.ObjectId;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  billingAddress?: {
    street?: string;
    city?: string;
    county?: string;
    country?: string;
  };

  // Dates
  issueDate: Date;
  dueDate?: Date;

  // Line items
  items: IInvoiceItem[];

  // Totals (all cents)
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  amountPaid: number;
  balanceDue: number;

  // Payment records
  payments: IInvoicePayment[];

  // Meta
  notes?: string;
  terms?: string;
  currency: string;
  createdBy: mongoose.Types.ObjectId;

  // Quote-specific
  expiryDate?: Date;
  convertedToInvoiceId?: mongoose.Types.ObjectId;

  // Recurring
  isRecurring: boolean;
  recurringInterval?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually';
  recurringNextDate?: Date;
  recurringEndDate?: Date;
  parentInvoiceId?: mongoose.Types.ObjectId;

  // Related sale
  saleId?: mongoose.Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

const invoiceItemSchema = new Schema<IInvoiceItem>(
  {
    productId: { type: Schema.Types.ObjectId },
    description: { type: String, required: true },
    quantity: { type: Number, required: true, min: 0 },
    unitPrice: { type: Number, required: true, min: 0 },
    discountAmount: { type: Number, default: 0 },
    taxRateId: { type: Schema.Types.ObjectId },
    taxRate: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    lineTotal: { type: Number, required: true },
  },
  { _id: false },
);

const invoicePaymentSchema = new Schema<IInvoicePayment>(
  {
    amount: { type: Number, required: true, min: 1 },
    method: { type: String, required: true },
    reference: { type: String },
    paidAt: { type: Date, required: true },
    notes: { type: String },
    recordedBy: { type: Schema.Types.ObjectId, required: true },
  },
  { _id: true },
);

const invoiceSchema = new Schema<IInvoice>(
  {
    organizationId: { type: Schema.Types.ObjectId, required: true },
    branchId: { type: Schema.Types.ObjectId },
    invoiceNumber: { type: String, required: true },
    type: { type: String, enum: ['invoice', 'quote', 'credit_note'], default: 'invoice' },
    status: {
      type: String,
      enum: ['draft', 'sent', 'viewed', 'partial', 'paid', 'overdue', 'cancelled', 'void'],
      default: 'draft',
    },
    customerId: { type: Schema.Types.ObjectId },
    customerName: { type: String, required: true, trim: true },
    customerEmail: { type: String, lowercase: true },
    customerPhone: { type: String },
    billingAddress: {
      street: { type: String },
      city: { type: String },
      county: { type: String },
      country: { type: String, default: 'KE' },
    },
    issueDate: { type: Date, required: true },
    dueDate: { type: Date },
    items: [invoiceItemSchema],
    subtotal: { type: Number, required: true, default: 0 },
    discountAmount: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    total: { type: Number, required: true, default: 0 },
    amountPaid: { type: Number, default: 0 },
    balanceDue: { type: Number, default: 0 },
    payments: [invoicePaymentSchema],
    notes: { type: String },
    terms: { type: String },
    currency: { type: String, default: 'KES' },
    createdBy: { type: Schema.Types.ObjectId, required: true },
    expiryDate: { type: Date },
    convertedToInvoiceId: { type: Schema.Types.ObjectId },
    isRecurring: { type: Boolean, default: false },
    recurringInterval: { type: String, enum: ['daily', 'weekly', 'monthly', 'quarterly', 'annually'] },
    recurringNextDate: { type: Date },
    recurringEndDate: { type: Date },
    parentInvoiceId: { type: Schema.Types.ObjectId },
    saleId: { type: Schema.Types.ObjectId },
  },
  { timestamps: true },
);

invoiceSchema.index({ organizationId: 1, invoiceNumber: 1 }, { unique: true });
invoiceSchema.index({ organizationId: 1, status: 1, dueDate: 1 });
invoiceSchema.index({ organizationId: 1, customerId: 1 });
invoiceSchema.index({ organizationId: 1, type: 1, createdAt: -1 });
invoiceSchema.index({ organizationId: 1, isRecurring: 1, recurringNextDate: 1 });

export const InvoiceModel: Model<IInvoice> = mongoose.model<IInvoice>('invoices', invoiceSchema);
