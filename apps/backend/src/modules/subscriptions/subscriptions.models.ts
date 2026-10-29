import mongoose, { type Document, type Model, Schema } from 'mongoose';

// ----- SubscriptionPlan (config — managed by platform admin) ---------------
export interface IPlanLimits {
  maxBranches: number;
  maxUsers: number;
  maxRegisters: number;
  features: string[];
}

export interface ISubscriptionPlan extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  displayName: string;
  description: string;
  price: number;    // cents per interval
  currency: string;
  interval: 'month' | 'year';
  limits: IPlanLimits;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const subscriptionPlanSchema = new Schema<ISubscriptionPlan>(
  {
    name: { type: String, required: true, unique: true },
    displayName: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'KES' },
    interval: { type: String, enum: ['month', 'year'], default: 'month' },
    limits: {
      maxBranches: { type: Number, required: true },
      maxUsers: { type: Number, required: true },
      maxRegisters: { type: Number, required: true },
      features: [{ type: String }],
    },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const SubscriptionPlanModel: Model<ISubscriptionPlan> =
  mongoose.model<ISubscriptionPlan>('subscriptionPlans', subscriptionPlanSchema);

// ----- Subscription (per organization) ----------------------------------------
export interface ISubscription extends Document {
  _id: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  planId: mongoose.Types.ObjectId;
  planName: string;   // snapshot
  status: 'trialing' | 'active' | 'past_due' | 'cancelled' | 'expired' | 'dev_bypass';
  trialEndsAt?: Date;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  limits: IPlanLimits; // snapshot from plan at subscription time
  cancelAtPeriodEnd: boolean;
  billingProvider?: string;
  billingReference?: string;
  // Development bypass — set via backend admin only, never client-side
  bypassEnforcement: boolean;
  bypassReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const subscriptionSchema = new Schema<ISubscription>(
  {
    organizationId: { type: Schema.Types.ObjectId, required: true },
    planId: { type: Schema.Types.ObjectId, required: true },
    planName: { type: String, required: true },
    status: {
      type: String,
      enum: ['trialing', 'active', 'past_due', 'cancelled', 'expired', 'dev_bypass'],
      default: 'trialing',
    },
    trialEndsAt: { type: Date },
    currentPeriodStart: { type: Date, required: true },
    currentPeriodEnd: { type: Date, required: true },
    limits: {
      maxBranches: { type: Number, required: true },
      maxUsers: { type: Number, required: true },
      maxRegisters: { type: Number, required: true },
      features: [{ type: String }],
    },
    cancelAtPeriodEnd: { type: Boolean, default: false },
    billingProvider: { type: String },
    billingReference: { type: String },
    bypassEnforcement: { type: Boolean, default: false },
    bypassReason: { type: String },
  },
  { timestamps: true },
);

subscriptionSchema.index({ organizationId: 1 }, { unique: true });
subscriptionSchema.index({ status: 1, currentPeriodEnd: 1 });

export const SubscriptionModel: Model<ISubscription> = mongoose.model<ISubscription>(
  'subscriptions',
  subscriptionSchema,
);
