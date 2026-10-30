import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import mongoose from 'mongoose';
import { NotFoundError, ValidationError, ForbiddenError } from '../../middleware/error.middleware.js';
import { can } from '../../middleware/tenant.middleware.js';
import {
  ProductModel,
  CategoryModel,
  StockProjectionModel,
} from './products.models.js';
import { paginationSchema } from '../../utils/pagination.js';

const productQuerySchema = z.object({
  q: z.string().optional(),
  categoryId: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(20),
});

const createProductSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  description: z.string().max(2000).optional(),
  sku: z.string().min(1).max(100).trim(),
  barcode: z.string().max(100).optional(),
  categoryId: z.string().optional(),
  unitOfMeasure: z.string().default('piece'),
  costPrice: z.number().int().nonnegative(),
  sellingPrice: z.number().int().positive(),
  wholesalePrice: z.number().int().positive().optional(),
  taxRateId: z.string().optional(),
  taxInclusive: z.boolean().default(false),
  supplierId: z.string().optional(),
  trackInventory: z.boolean().default(true),
  isService: z.boolean().default(false),
  lowStockThreshold: z.number().int().nonnegative().default(5),
  allowNegativeStock: z.boolean().default(false),
});

export async function productRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/v1/products
  app.get('/', async (request, reply) => {
    const query = productQuerySchema.parse(request.query);
    const filter: Record<string, unknown> = {
      organizationId: new mongoose.Types.ObjectId(request.tenantId),
    };

    if (query.isActive !== undefined) filter['isActive'] = query.isActive;
    if (query.categoryId) filter['categoryId'] = new mongoose.Types.ObjectId(query.categoryId);

    if (query.q) {
      filter['$text'] = { $search: query.q };
    }

    const skip = (query.page - 1) * query.limit;
    const [products, total] = await Promise.all([
      ProductModel.find(filter)
        .sort(query.q ? { score: { $meta: 'textScore' } } : { name: 1 })
        .skip(skip)
        .limit(query.limit)
        .lean(),
      ProductModel.countDocuments(filter),
    ]);

    return reply.send({
      data: products.map((p) => ({ ...p, id: p._id.toString() })),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
        hasMore: query.page * query.limit < total,
      },
    });
  });

  // GET /api/v1/products/categories
  app.get('/categories', async (request, reply) => {
    const categories = await CategoryModel.find({
      organizationId: new mongoose.Types.ObjectId(request.tenantId),
      isActive: true,
    })
      .sort({ sortOrder: 1, name: 1 })
      .lean();

    return reply.send({
      data: categories.map((c) => ({ ...c, id: c._id.toString() })),
    });
  });

  // POST /api/v1/products/categories
  app.post('/categories', async (request, reply) => {
    if (!can(request.userRole, 'product:create')) {
      throw new ForbiddenError('Permission denied');
    }

    const body = (request.body as { name?: string; parentId?: string; sortOrder?: number }) ?? {};
    if (!body.name?.trim()) throw new ValidationError('Category name is required');

    const category = await CategoryModel.create({
      organizationId: new mongoose.Types.ObjectId(request.tenantId),
      name: body.name.trim(),
      parentId: body.parentId ? new mongoose.Types.ObjectId(body.parentId) : undefined,
      sortOrder: body.sortOrder ?? 0,
      isActive: true,
    });

    return reply.status(201).send({ data: { ...category.toObject(), id: category._id.toString() } });
  });

  // PATCH /api/v1/products/categories/:id
  app.patch('/categories/:id', async (request, reply) => {
    if (!can(request.userRole, 'product:update')) {
      throw new ForbiddenError('Permission denied');
    }

    const { id } = request.params as { id: string };
    const body = request.body as Record<string, unknown>;

    const category = await CategoryModel.findOneAndUpdate(
      { _id: id, organizationId: new mongoose.Types.ObjectId(request.tenantId) },
      { $set: body },
      { new: true },
    ).lean();

    if (!category) throw new NotFoundError('Category');
    return reply.send({ data: { ...category, id: category._id.toString() } });
  });

  // GET /api/v1/products/:id
  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ValidationError('Invalid product ID');
    }

    const product = await ProductModel.findOne({
      _id: id,
      organizationId: new mongoose.Types.ObjectId(request.tenantId),
    }).lean();

    if (!product) throw new NotFoundError('Product');

    return reply.send({ data: { ...product, id: product._id.toString() } });
  });

  // POST /api/v1/products
  app.post('/', async (request, reply) => {
    if (!can(request.userRole, 'product:create')) {
      throw new ForbiddenError('You do not have permission to create products');
    }

    const body = createProductSchema.parse(request.body);

    // Check for duplicate SKU within tenant
    const existing = await ProductModel.findOne({
      organizationId: new mongoose.Types.ObjectId(request.tenantId),
      sku: body.sku,
    });
    if (existing) {
      throw new ValidationError('A product with this SKU already exists');
    }

    const product = await ProductModel.create({
      ...body,
      organizationId: new mongoose.Types.ObjectId(request.tenantId),
      images: [],
      hasVariants: false,
      batchTracking: false,
      expiryTracking: false,
      isActive: true,
    });

    return reply.status(201).send({ data: { ...product.toObject(), id: product._id.toString() } });
  });

  // PATCH /api/v1/products/:id
  app.patch('/:id', async (request, reply) => {
    if (!can(request.userRole, 'product:update')) {
      throw new ForbiddenError('You do not have permission to update products');
    }

    const { id } = request.params as { id: string };
    const body = createProductSchema.partial().parse(request.body);

    const product = await ProductModel.findOneAndUpdate(
      {
        _id: id,
        organizationId: new mongoose.Types.ObjectId(request.tenantId),
      },
      { $set: body },
      { new: true },
    ).lean();

    if (!product) throw new NotFoundError('Product');

    return reply.send({ data: { ...product, id: product._id.toString() } });
  });

  // DELETE /api/v1/products/:id — soft delete
  app.delete('/:id', async (request, reply) => {
    if (!can(request.userRole, 'product:delete')) {
      throw new ForbiddenError('You do not have permission to delete products');
    }

    const { id } = request.params as { id: string };

    const product = await ProductModel.findOneAndUpdate(
      {
        _id: id,
        organizationId: new mongoose.Types.ObjectId(request.tenantId),
      },
      { $set: { isActive: false } },
      { new: true },
    );

    if (!product) throw new NotFoundError('Product');

    return reply.send({ data: { success: true } });
  });
}
