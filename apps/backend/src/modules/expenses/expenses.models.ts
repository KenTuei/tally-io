import mongoose, { type Document, type Model, Schema } from 'mongoose';

// ----- ExpenseCategory -----------------------------------------------
export interface IExpenseCategory extends Document {
  _id: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  name: string;
  isActive: boolean;
  createdAt: Date;
}

const expenseCategorySchema = new Schema<IExpenseCategory>(
  {
    organizationId: { type: Schema.Types.ObjectId, required: true },
    name: { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

expenseCategorySchema.index({ organizationId: 1 });

export const ExpenseCategoryModel: Model<IExpenseCategory> =
  mongoose.model<IExpenseCategory>('expenseCategories', expenseCategorySchema);

// ----- Expense -------------------------------------------------------
export interface IExpense extends Document {
  _id: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
  categoryId?: mongoose.Types.ObjectId;
  amount: number;  // cents
  currency: string;
  paymentMethod: string;
  supplierId?: mongoose.Types.ObjectId;
  payeeName: string;
  reference?: string;
  notes?: string;
  attachments: string[];
  date: Date;
  approvedBy?: mongoose.Types.ObjectId;
  status: 'pending' | 'approved' | 'rejected';
  recordedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const expenseSchema = new Schema<IExpense>(
  {
    organizationId: { type: Schema.Types.ObjectId, required: true },
    branchId: { type: Schema.Types.ObjectId, required: true },
    categoryId: { type: Schema.Types.ObjectId },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'KES' },
    paymentMethod: { type: String, required: true },
    supplierId: { type: Schema.Types.ObjectId },
    payeeName: { type: String, required: true, trim: true },
    reference: { type: String },
    notes: { type: String },
    attachments: [{ type: String }],
    date: { type: Date, required: true },
    approvedBy: { type: Schema.Types.ObjectId },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'approved' },
    recordedBy: { type: Schema.Types.ObjectId, required: true },
  },
  { timestamps: true },
);

expenseSchema.index({ organizationId: 1, branchId: 1, date: -1 });
expenseSchema.index({ organizationId: 1, categoryId: 1 });
expenseSchema.index({ organizationId: 1, date: -1 });

export const ExpenseModel: Model<IExpense> = mongoose.model<IExpense>(
  'expenses',
  expenseSchema,
);
