import mongoose, { type Document, type Model, Schema } from 'mongoose';

export interface ITaxRate extends Document {
  _id: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  name: string;            // e.g. "VAT", "Standard Rate"
  code: string;            // e.g. "VAT16"
  rate: number;            // integer percentage × 100 e.g. 1600 = 16.00%
  isInclusive: boolean;    // price already includes tax
  isDefault: boolean;      // applied to new products by default
  isActive: boolean;
  appliesToServices: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const taxRateSchema = new Schema<ITaxRate>(
  {
    organizationId: { type: Schema.Types.ObjectId, required: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    rate: { type: Number, required: true, min: 0, max: 10000 }, // 0–100.00%
    isInclusive: { type: Boolean, default: false },
    isDefault: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    appliesToServices: { type: Boolean, default: true },
  },
  { timestamps: true },
);

taxRateSchema.index({ organizationId: 1 });
taxRateSchema.index({ organizationId: 1, code: 1 }, { unique: true });
taxRateSchema.index({ organizationId: 1, isDefault: 1 });

export const TaxRateModel: Model<ITaxRate> = mongoose.model<ITaxRate>('taxRates', taxRateSchema);
