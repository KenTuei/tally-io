import mongoose, { type Document, type Model, Schema } from 'mongoose';

// ----- EmailLog — tracks all sent emails ----------------------------
export interface IEmailLog extends Document {
  _id: mongoose.Types.ObjectId;
  organizationId?: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;
  to: string;
  subject: string;
  template: string;
  provider: string;
  messageId?: string;
  status: 'queued' | 'sent' | 'delivered' | 'bounced' | 'failed';
  attempts: number;
  lastAttemptAt?: Date;
  sentAt?: Date;
  error?: string;
  isTransactional: boolean;  // true = security/ops emails, false = marketing
  createdAt: Date;
  updatedAt: Date;
}

const emailLogSchema = new Schema<IEmailLog>(
  {
    organizationId: { type: Schema.Types.ObjectId },
    userId: { type: Schema.Types.ObjectId },
    to: { type: String, required: true, lowercase: true },
    subject: { type: String, required: true },
    template: { type: String, required: true },
    provider: { type: String, required: true },
    messageId: { type: String },
    status: {
      type: String,
      enum: ['queued', 'sent', 'delivered', 'bounced', 'failed'],
      default: 'queued',
    },
    attempts: { type: Number, default: 0 },
    lastAttemptAt: { type: Date },
    sentAt: { type: Date },
    error: { type: String },
    isTransactional: { type: Boolean, default: true },
  },
  { timestamps: true },
);

emailLogSchema.index({ userId: 1, template: 1, createdAt: -1 });
emailLogSchema.index({ to: 1, template: 1, createdAt: -1 });
emailLogSchema.index({ status: 1, createdAt: -1 });

export const EmailLogModel: Model<IEmailLog> = mongoose.model<IEmailLog>(
  'emailLogs',
  emailLogSchema,
);

// ----- OnboardingReminder — scheduled email tracking ----------------
export interface IOnboardingReminder extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  emailType: 'verification' | 'incomplete_1' | 'incomplete_2' | 'incomplete_3' | 'incomplete_4';
  scheduledAt: Date;
  sentAt?: Date;
  cancelled: boolean;
  cancelReason?: string;
  emailLogId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const onboardingReminderSchema = new Schema<IOnboardingReminder>(
  {
    userId: { type: Schema.Types.ObjectId, required: true },
    organizationId: { type: Schema.Types.ObjectId, required: true },
    emailType: {
      type: String,
      enum: ['verification', 'incomplete_1', 'incomplete_2', 'incomplete_3', 'incomplete_4'],
      required: true,
    },
    scheduledAt: { type: Date, required: true },
    sentAt: { type: Date },
    cancelled: { type: Boolean, default: false },
    cancelReason: { type: String },
    emailLogId: { type: Schema.Types.ObjectId },
  },
  { timestamps: true },
);

onboardingReminderSchema.index({ userId: 1, emailType: 1 });
onboardingReminderSchema.index({ scheduledAt: 1, cancelled: 1, sentAt: 1 });

export const OnboardingReminderModel: Model<IOnboardingReminder> =
  mongoose.model<IOnboardingReminder>('onboardingReminders', onboardingReminderSchema);
