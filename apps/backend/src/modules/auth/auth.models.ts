import mongoose, { type Document, type Model, Schema } from 'mongoose';

// ----- User -------------------------------------------------------
export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  phone?: string;
  emailVerified: boolean;
  emailVerificationToken?: string;
  passwordResetToken?: string;
  passwordResetExpiry?: Date;
  isActive: boolean;
  lastLoginAt?: Date;
  refreshTokens: Array<{
    tokenHash: string;
    deviceId: string;
    deviceType: string;
    createdAt: Date;
    expiresAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true, select: false },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    phone: { type: String },
    emailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String, select: false },
    passwordResetToken: { type: String, select: false },
    passwordResetExpiry: { type: Date, select: false },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
    refreshTokens: {
      type: [
        {
          tokenHash: { type: String, required: true, select: false },
          deviceId: { type: String, required: true },
          deviceType: { type: String, required: true },
          createdAt: { type: Date, required: true },
          expiresAt: { type: Date, required: true },
        },
      ],
      select: false,
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        // Never expose sensitive fields
        ret['passwordHash'] = undefined;
        ret['emailVerificationToken'] = undefined;
        ret['passwordResetToken'] = undefined;
        ret['passwordResetExpiry'] = undefined;
        ret['refreshTokens'] = undefined;
        return ret;
      },
    },
  },
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ emailVerificationToken: 1 }, { sparse: true });
userSchema.index({ passwordResetToken: 1 }, { sparse: true });

export const UserModel: Model<IUser> = mongoose.model<IUser>('users', userSchema);

// ----- Organization -----------------------------------------------
export interface IOrganization extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  businessType: string;
  currency: string;
  country: string;
  timezone: string;
  contactEmail: string;
  contactPhone?: string;
  taxNumber?: string;
  vatRegistered: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const organizationSchema = new Schema<IOrganization>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    businessType: { type: String, required: true },
    currency: { type: String, required: true, default: 'KES' },
    country: { type: String, required: true, default: 'KE' },
    timezone: { type: String, required: true, default: 'Africa/Nairobi' },
    contactEmail: { type: String, required: true, lowercase: true },
    contactPhone: { type: String },
    taxNumber: { type: String },
    vatRegistered: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

organizationSchema.index({ slug: 1 }, { unique: true });

export const OrganizationModel: Model<IOrganization> = mongoose.model<IOrganization>(
  'organizations',
  organizationSchema,
);

// ----- Membership -------------------------------------------------
export interface IMembership extends Document {
  _id: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  role: string;
  branchIds: mongoose.Types.ObjectId[];
  isActive: boolean;
  invitedBy?: mongoose.Types.ObjectId;
  acceptedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const membershipSchema = new Schema<IMembership>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'organizations', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'users', required: true },
    role: { type: String, required: true },
    branchIds: [{ type: Schema.Types.ObjectId, ref: 'branches' }],
    isActive: { type: Boolean, default: true },
    invitedBy: { type: Schema.Types.ObjectId, ref: 'users' },
    acceptedAt: { type: Date },
  },
  { timestamps: true },
);

membershipSchema.index({ organizationId: 1, userId: 1 }, { unique: true });
membershipSchema.index({ userId: 1 });

export const MembershipModel: Model<IMembership> = mongoose.model<IMembership>(
  'memberships',
  membershipSchema,
);
