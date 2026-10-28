import mongoose, { type Document, type Model, Schema } from 'mongoose';

export interface IInventoryEvent extends Document {
  _id: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  variantId?: mongoose.Types.ObjectId;
  type: string;
  quantity: number;
  unitCost?: number;
  referenceType: string;
  referenceId: mongoose.Types.ObjectId;
  reason?: string;
  actorId: mongoose.Types.ObjectId;
  deviceId: string;
  idempotencyKey: string;
  batchNumber?: string;
  expiryDate?: Date;
  createdAt: Date;
}

const inventoryEventSchema = new Schema<IInventoryEvent>(
  {
    organizationId: { type: Schema.Types.ObjectId, required: true },
    branchId: { type: Schema.Types.ObjectId, required: true },
    productId: { type: Schema.Types.ObjectId, required: true },
    variantId: { type: Schema.Types.ObjectId },
    type: { type: String, required: true },
    quantity: { type: Number, required: true },
    unitCost: { type: Number },
    referenceType: { type: String, required: true },
    referenceId: { type: Schema.Types.ObjectId, required: true },
    reason: { type: String },
    actorId: { type: Schema.Types.ObjectId, required: true },
    deviceId: { type: String, required: true },
    idempotencyKey: { type: String, required: true, unique: true },
    batchNumber: { type: String },
    expiryDate: { type: Date },
  },
  { timestamps: true, capped: false },
);

inventoryEventSchema.index({ organizationId: 1, productId: 1, branchId: 1 });
inventoryEventSchema.index({ organizationId: 1, branchId: 1, type: 1, createdAt: 1 });
inventoryEventSchema.index({ idempotencyKey: 1 }, { unique: true });

export const InventoryEventModel: Model<IInventoryEvent> = mongoose.model<IInventoryEvent>(
  'inventoryEvents',
  inventoryEventSchema,
);
