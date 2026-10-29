import mongoose, { type Document, type Model, Schema } from 'mongoose';

// ----- Branch -------------------------------------------------------
export interface IBranch extends Document {
  _id: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  name: string;
  code: string;
  address?: {
    street?: string;
    city?: string;
    county?: string;
    country: string;
    postalCode?: string;
  };
  phone?: string;
  email?: string;
  managerId?: mongoose.Types.ObjectId;
  isMainBranch: boolean;
  mapLat?: number;
  mapLng?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const branchSchema = new Schema<IBranch>(
  {
    organizationId: { type: Schema.Types.ObjectId, required: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    address: {
      street: { type: String },
      city: { type: String },
      county: { type: String },
      country: { type: String, default: 'KE' },
      postalCode: { type: String },
    },
    phone: { type: String },
    email: { type: String, lowercase: true },
    managerId: { type: Schema.Types.ObjectId, ref: 'users' },
    isMainBranch: { type: Boolean, default: false },
    mapLat: { type: Number },
    mapLng: { type: Number },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

branchSchema.index({ organizationId: 1 });
branchSchema.index({ organizationId: 1, code: 1 }, { unique: true });
branchSchema.index({ organizationId: 1, isActive: 1 });

export const BranchModel: Model<IBranch> = mongoose.model<IBranch>('branches', branchSchema);

// ----- Register -------------------------------------------------------
export interface IRegister extends Document {
  _id: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
  name: string;
  deviceId?: string;
  isActive: boolean;
  currentShiftId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const registerSchema = new Schema<IRegister>(
  {
    organizationId: { type: Schema.Types.ObjectId, required: true },
    branchId: { type: Schema.Types.ObjectId, required: true },
    name: { type: String, required: true, trim: true },
    deviceId: { type: String },
    isActive: { type: Boolean, default: true },
    currentShiftId: { type: Schema.Types.ObjectId },
  },
  { timestamps: true },
);

registerSchema.index({ organizationId: 1, branchId: 1 });

export const RegisterModel: Model<IRegister> = mongoose.model<IRegister>(
  'registers',
  registerSchema,
);

// ----- Shift -------------------------------------------------------
export interface IShift extends Document {
  _id: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
  registerId: mongoose.Types.ObjectId;
  cashierId: mongoose.Types.ObjectId;
  status: 'open' | 'closed';
  openingFloat: number;
  expectedCash?: number;
  closingCount?: number;
  variance?: number;
  openedAt: Date;
  closedAt?: Date;
  closedBy?: mongoose.Types.ObjectId;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const shiftSchema = new Schema<IShift>(
  {
    organizationId: { type: Schema.Types.ObjectId, required: true },
    branchId: { type: Schema.Types.ObjectId, required: true },
    registerId: { type: Schema.Types.ObjectId, required: true },
    cashierId: { type: Schema.Types.ObjectId, required: true },
    status: { type: String, enum: ['open', 'closed'], default: 'open' },
    openingFloat: { type: Number, required: true, min: 0 },
    expectedCash: { type: Number },
    closingCount: { type: Number },
    variance: { type: Number },
    openedAt: { type: Date, required: true },
    closedAt: { type: Date },
    closedBy: { type: Schema.Types.ObjectId },
    notes: { type: String },
  },
  { timestamps: true },
);

shiftSchema.index({ organizationId: 1, branchId: 1, status: 1 });
shiftSchema.index({ organizationId: 1, cashierId: 1, openedAt: -1 });
shiftSchema.index({ registerId: 1, status: 1 });

export const ShiftModel: Model<IShift> = mongoose.model<IShift>('shifts', shiftSchema);

// ----- StockTransfer -------------------------------------------------------
export interface IStockTransferItem {
  productId: mongoose.Types.ObjectId;
  variantId?: mongoose.Types.ObjectId;
  productName: string;
  sku: string;
  quantityRequested: number;
  quantityDispatched?: number;
  quantityReceived?: number;
  unitCost?: number;
}

export interface IStockTransfer extends Document {
  _id: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  fromBranchId: mongoose.Types.ObjectId;
  toBranchId: mongoose.Types.ObjectId;
  transferNumber: string;
  status: 'draft' | 'dispatched' | 'received' | 'cancelled';
  items: IStockTransferItem[];
  initiatedBy: mongoose.Types.ObjectId;
  approvedBy?: mongoose.Types.ObjectId;
  dispatchedAt?: Date;
  receivedAt?: Date;
  cancelledAt?: Date;
  cancelledBy?: mongoose.Types.ObjectId;
  cancelReason?: string;
  notes?: string;
  idempotencyKey: string;
  createdAt: Date;
  updatedAt: Date;
}

const stockTransferSchema = new Schema<IStockTransfer>(
  {
    organizationId: { type: Schema.Types.ObjectId, required: true },
    fromBranchId: { type: Schema.Types.ObjectId, required: true },
    toBranchId: { type: Schema.Types.ObjectId, required: true },
    transferNumber: { type: String, required: true },
    status: {
      type: String,
      enum: ['draft', 'dispatched', 'received', 'cancelled'],
      default: 'draft',
    },
    items: [
      {
        productId: { type: Schema.Types.ObjectId, required: true },
        variantId: { type: Schema.Types.ObjectId },
        productName: { type: String, required: true },
        sku: { type: String, required: true },
        quantityRequested: { type: Number, required: true, min: 1 },
        quantityDispatched: { type: Number },
        quantityReceived: { type: Number },
        unitCost: { type: Number },
      },
    ],
    initiatedBy: { type: Schema.Types.ObjectId, required: true },
    approvedBy: { type: Schema.Types.ObjectId },
    dispatchedAt: { type: Date },
    receivedAt: { type: Date },
    cancelledAt: { type: Date },
    cancelledBy: { type: Schema.Types.ObjectId },
    cancelReason: { type: String },
    notes: { type: String },
    idempotencyKey: { type: String, required: true },
  },
  { timestamps: true },
);

stockTransferSchema.index({ organizationId: 1, fromBranchId: 1, status: 1 });
stockTransferSchema.index({ organizationId: 1, toBranchId: 1, status: 1 });
stockTransferSchema.index({ organizationId: 1, transferNumber: 1 }, { unique: true });
stockTransferSchema.index({ idempotencyKey: 1 }, { unique: true });

export const StockTransferModel: Model<IStockTransfer> = mongoose.model<IStockTransfer>(
  'stockTransfers',
  stockTransferSchema,
);
