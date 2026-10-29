import mongoose, { type Document, type Model, Schema } from 'mongoose';

export interface ICustomer extends Document {
  _id: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  name: string;
  phone?: string;
  email?: string;
  address?: {
    street?: string;
    city?: string;
    county?: string;
    country: string;
  };
  notes?: string;
  creditAllowed: boolean;
  creditLimit?: number;    // cents
  currentBalance?: number; // cents — outstanding balance
  loyaltyPoints: number;
  // Marketing
  marketingConsent: boolean;
  marketingConsentAt?: Date;
  marketingOptOutAt?: Date;
  // Birthday (opt-in only)
  birthDay?: number;  // 1-31
  birthMonth?: number; // 1-12
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const customerSchema = new Schema<ICustomer>(
  {
    organizationId: { type: Schema.Types.ObjectId, required: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, lowercase: true, trim: true },
    address: {
      street: { type: String },
      city: { type: String },
      county: { type: String },
      country: { type: String, default: 'KE' },
    },
    notes: { type: String },
    creditAllowed: { type: Boolean, default: false },
    creditLimit: { type: Number, min: 0 },
    currentBalance: { type: Number, default: 0 },
    loyaltyPoints: { type: Number, default: 0 },
    marketingConsent: { type: Boolean, default: false },
    marketingConsentAt: { type: Date },
    marketingOptOutAt: { type: Date },
    birthDay: { type: Number, min: 1, max: 31 },
    birthMonth: { type: Number, min: 1, max: 12 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

customerSchema.index({ organizationId: 1 });
customerSchema.index({ organizationId: 1, phone: 1 });
customerSchema.index({ organizationId: 1, email: 1 }, { sparse: true });
customerSchema.index({ organizationId: 1, isActive: 1 });

export const CustomerModel: Model<ICustomer> = mongoose.model<ICustomer>(
  'customers',
  customerSchema,
);
