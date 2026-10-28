import mongoose, { type Document, type Model, Schema } from 'mongoose';

// ----- Product -------------------------------------------------------
export interface IProduct extends Document {
  _id: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  sku: string;
  barcode?: string;
  categoryId?: mongoose.Types.ObjectId;
  brandId?: mongoose.Types.ObjectId;
  unitOfMeasure: string;
  hasVariants: boolean;
  costPrice: number;
  sellingPrice: number;
  wholesalePrice?: number;
  taxRateId?: mongoose.Types.ObjectId;
  taxInclusive: boolean;
  supplierId?: mongoose.Types.ObjectId;
  images: string[];
  isActive: boolean;
  isService: boolean;
  trackInventory: boolean;
  allowNegativeStock: boolean;
  lowStockThreshold: number;
  batchTracking: boolean;
  expiryTracking: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<IProduct>(
  {
    organizationId: { type: Schema.Types.ObjectId, required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String },
    sku: { type: String, required: true, trim: true },
    barcode: { type: String, trim: true },
    categoryId: { type: Schema.Types.ObjectId },
    brandId: { type: Schema.Types.ObjectId },
    unitOfMeasure: { type: String, default: 'piece' },
    hasVariants: { type: Boolean, default: false },
    costPrice: { type: Number, required: true, min: 0 },
    sellingPrice: { type: Number, required: true, min: 0 },
    wholesalePrice: { type: Number },
    taxRateId: { type: Schema.Types.ObjectId },
    taxInclusive: { type: Boolean, default: false },
    supplierId: { type: Schema.Types.ObjectId },
    images: [{ type: String }],
    isActive: { type: Boolean, default: true },
    isService: { type: Boolean, default: false },
    trackInventory: { type: Boolean, default: true },
    allowNegativeStock: { type: Boolean, default: false },
    lowStockThreshold: { type: Number, default: 5 },
    batchTracking: { type: Boolean, default: false },
    expiryTracking: { type: Boolean, default: false },
  },
  { timestamps: true },
);

productSchema.index({ organizationId: 1, sku: 1 }, { unique: true });
productSchema.index({ organizationId: 1, barcode: 1 }, { sparse: true });
productSchema.index({ organizationId: 1, isActive: 1 });
productSchema.index({ name: 'text', sku: 'text', barcode: 'text' });

export const ProductModel: Model<IProduct> = mongoose.model<IProduct>('products', productSchema);

// ----- Category -------------------------------------------------------
export interface ICategory extends Document {
  _id: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  name: string;
  parentId?: mongoose.Types.ObjectId;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
}

const categorySchema = new Schema<ICategory>(
  {
    organizationId: { type: Schema.Types.ObjectId, required: true },
    name: { type: String, required: true, trim: true },
    parentId: { type: Schema.Types.ObjectId },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

categorySchema.index({ organizationId: 1 });

export const CategoryModel: Model<ICategory> = mongoose.model<ICategory>('categories', categorySchema);

// ----- StockProjection ------------------------------------------------
export interface IStockProjection extends Document {
  _id: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  variantId?: mongoose.Types.ObjectId;
  quantityOnHand: number;
  lastInventoryEventId?: mongoose.Types.ObjectId;
  updatedAt: Date;
}

const stockProjectionSchema = new Schema<IStockProjection>(
  {
    organizationId: { type: Schema.Types.ObjectId, required: true },
    branchId: { type: Schema.Types.ObjectId, required: true },
    productId: { type: Schema.Types.ObjectId, required: true },
    variantId: { type: Schema.Types.ObjectId },
    quantityOnHand: { type: Number, required: true, default: 0 },
    lastInventoryEventId: { type: Schema.Types.ObjectId },
  },
  { timestamps: true },
);

stockProjectionSchema.index(
  { organizationId: 1, branchId: 1, productId: 1, variantId: 1 },
  { unique: true },
);
stockProjectionSchema.index({ organizationId: 1, quantityOnHand: 1 });

export const StockProjectionModel: Model<IStockProjection> = mongoose.model<IStockProjection>(
  'stockProjections',
  stockProjectionSchema,
);
