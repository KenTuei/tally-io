import mongoose, { type Document, type Model, Schema } from 'mongoose';

export interface ISupplier extends Document {
  _id: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  name: string;
  phone?: string;
  email?: string;
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const supplierSchema = new Schema<ISupplier>({
  organizationId: { type: Schema.Types.ObjectId, required: true, index: true },
  name: { type: String, required: true, trim: true },
  phone: { type: String, trim: true },
  email: { type: String, lowercase: true, trim: true },
  notes: { type: String, maxlength: 500 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

supplierSchema.index({ organizationId: 1, name: 1 });
export const SupplierModel: Model<ISupplier> = mongoose.model<ISupplier>('suppliers', supplierSchema);
