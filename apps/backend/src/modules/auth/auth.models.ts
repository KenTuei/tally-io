import mongoose, { type Document, type Model, Schema } from 'mongoose';

// ----- User -------------------------------------------------------
export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatar?: string;
  locale?: string;
  // Google OAuth
  googleId?: string;
  googleEmail?: string;
  // Email verification
  emailVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationCode?: string;   // 6-digit OTP
  emailVerificationExpiry?: Date;
  // Password reset
  passwordResetToken?: string;
  passwordResetExpiry?: Date;
  // Marketing
  marketingConsent: boolean;
  marketingConsentAt?: Date;
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
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: false, select: false },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    phone: { type: String },
    avatar: { type: String },
    locale: { type: String, default: 'en' },
    googleId: { type: String },
    googleEmail: { type: String },
    emailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String, select: false },
    emailVerificationCode: { type: String, select: false },
    emailVerificationExpiry: { type: Date, select: false },
    passwordResetToken: { type: String, select: false },
    passwordResetExpiry: { type: Date, select: false },
    marketingConsent: { type: Boolean, default: false },
    marketingConsentAt: { type: Date },
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
        ret['emailVerificationCode'] = undefined;
        ret['emailVerificationExpiry'] = undefined;
        ret['passwordResetToken'] = undefined;
        ret['passwordResetExpiry'] = undefined;
        ret['refreshTokens'] = undefined;
        return ret;
      },
    },
  },
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ googleId: 1 }, { sparse: true, unique: true });
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
  address?: {
    street?: string;
    city?: string;
    county?: string;
    country: string;
    postalCode?: string;
  };
  logo?: string;
  taxNumber?: string;
  vatRegistered: boolean;
  // Onboarding
  onboardingStatus: 'pending' | 'in_progress' | 'complete';
  onboardingStep: number;
  onboardingData?: Record<string, unknown>;
  // Map location (main branch / HQ)
  mapLat?: number;
  mapLng?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const organizationSchema = new Schema<IOrganization>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true },
    businessType: { type: String, required: true },
    currency: { type: String, required: true, default: 'KES' },
    country: { type: String, required: true, default: 'KE' },
    timezone: { type: String, required: true, default: 'Africa/Nairobi' },
    contactEmail: { type: String, required: true, lowercase: true },
    contactPhone: { type: String },
    address: {
      street: { type: String },
      city: { type: String },
      county: { type: String },
      country: { type: String },
      postalCode: { type: String },
    },
    logo: { type: String },
    taxNumber: { type: String },
    vatRegistered: { type: Boolean, default: false },
    onboardingStatus: {
      type: String,
      enum: ['pending', 'in_progress', 'complete'],
      default: 'pending',
    },
    onboardingStep: { type: Number, default: 0 },
    onboardingData: { type: Schema.Types.Mixed },
    mapLat: { type: Number },
    mapLng: { type: Number },
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
  invitationEmail?: string;
  invitationToken?: string;
  invitationExpiresAt?: Date;
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
    invitationEmail: { type: String, lowercase: true },
    invitationToken: { type: String, select: false },
    invitationExpiresAt: { type: Date },
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
