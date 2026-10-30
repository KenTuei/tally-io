import mongoose, { type Document, type Model, Schema } from 'mongoose';

export type SetupStepId =
  | 'customize_receipts'
  | 'setup_taxes'
  | 'add_location'
  | 'add_products'
  | 'invite_team';

export interface ISetupChecklist extends Document {
  _id: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  steps: Array<{
    id: SetupStepId;
    completed: boolean;
    completedAt?: Date;
    dismissed: boolean;
  }>;
  allComplete: boolean;
  hidden: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const setupChecklistSchema = new Schema<ISetupChecklist>(
  {
    organizationId: { type: Schema.Types.ObjectId, required: true, unique: true },
    steps: [
      {
        id: { type: String, required: true },
        completed: { type: Boolean, default: false },
        completedAt: { type: Date },
        dismissed: { type: Boolean, default: false },
        _id: false,
      },
    ],
    allComplete: { type: Boolean, default: false },
    hidden: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const SetupChecklistModel: Model<ISetupChecklist> =
  mongoose.model<ISetupChecklist>('setupChecklists', setupChecklistSchema);

export const DEFAULT_STEPS: Array<{
  id: SetupStepId;
  title: string;
  description: string;
  action: string;
  actionUrl: string;
}> = [
  {
    id: 'customize_receipts',
    title: 'Customize your receipts',
    description: 'Choose how your receipts look and what information they display.',
    action: 'Customize receipts',
    actionUrl: '/app/settings',
  },
  {
    id: 'setup_taxes',
    title: 'Set up your taxes',
    description: 'Configure the taxes that apply to your products and services.',
    action: 'Set up taxes',
    actionUrl: '/app/settings',
  },
  {
    id: 'add_location',
    title: 'Add a location',
    description: 'Add your business locations and configure each branch.',
    action: 'Add location',
    actionUrl: '/app/branches',
  },
  {
    id: 'add_products',
    title: 'Add your products',
    description: 'Create your product catalogue or import your existing inventory.',
    action: 'Add products',
    actionUrl: '/app/products',
  },
  {
    id: 'invite_team',
    title: 'Invite your team',
    description: 'Add employees and configure what they can access.',
    action: 'Invite employees',
    actionUrl: '/app/staff',
  },
];
