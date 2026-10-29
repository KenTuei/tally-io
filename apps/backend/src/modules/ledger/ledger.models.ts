import mongoose, { type Document, type Model, Schema } from 'mongoose';

export interface ILedgerEvent extends Document {
  _id: mongoose.Types.ObjectId;
  eventId: string;
  idempotencyKey: string;
  correlationId: string;
  causationId?: string;
  organizationId: mongoose.Types.ObjectId;
  branchId?: mongoose.Types.ObjectId;
  deviceId: string;
  eventType: string;
  schemaVersion: number;
  entityType: string;
  entityId: mongoose.Types.ObjectId;
  actorId: mongoose.Types.ObjectId;
  actorType: string;
  clientTimestamp: Date;
  serverTimestamp: Date;
  payload: Record<string, unknown>;
  syncBatchId?: string;
  offlineCreated: boolean;
  createdAt: Date;
}

const ledgerEventSchema = new Schema<ILedgerEvent>(
  {
    eventId: { type: String, required: true },
    idempotencyKey: { type: String, required: true },
    correlationId: { type: String, required: true },
    causationId: { type: String },
    organizationId: { type: Schema.Types.ObjectId, required: true },
    branchId: { type: Schema.Types.ObjectId },
    deviceId: { type: String, required: true },
    eventType: { type: String, required: true },
    schemaVersion: { type: Number, required: true, default: 1 },
    entityType: { type: String, required: true },
    entityId: { type: Schema.Types.ObjectId, required: true },
    actorId: { type: Schema.Types.ObjectId, required: true },
    actorType: { type: String, required: true },
    clientTimestamp: { type: Date, required: true },
    serverTimestamp: { type: Date, required: true },
    payload: { type: Schema.Types.Mixed, required: true },
    syncBatchId: { type: String },
    offlineCreated: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    // No update hooks — ledger events are immutable after creation
  },
);

// No updates allowed — guard in middleware
ledgerEventSchema.pre('findOneAndUpdate', function () {
  throw new Error('LedgerEvent is immutable — use compensating events instead');
});

ledgerEventSchema.index({ organizationId: 1, eventType: 1, serverTimestamp: -1 });
ledgerEventSchema.index({ organizationId: 1, entityType: 1, entityId: 1 });
ledgerEventSchema.index({ organizationId: 1, branchId: 1, serverTimestamp: -1 });
ledgerEventSchema.index({ idempotencyKey: 1 }, { unique: true });
ledgerEventSchema.index({ eventId: 1 }, { unique: true });

export const LedgerEventModel: Model<ILedgerEvent> = mongoose.model<ILedgerEvent>(
  'ledgerEvents',
  ledgerEventSchema,
);
