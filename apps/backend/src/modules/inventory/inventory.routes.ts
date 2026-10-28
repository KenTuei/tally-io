import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import mongoose from 'mongoose';
import { ForbiddenError, ValidationError } from '../../middleware/error.middleware.js';
import { can } from '../../middleware/tenant.middleware.js';
import { StockProjectionModel } from '../products/products.models.js';
import { InventoryEventModel } from './inventory.models.js';
import { v4 as uuidv4 } from 'uuid';

const stockQuerySchema = z.object({
  q: z.string().optional(),
  branchId: z.string().optional(),
  lowStock: z.coerce.boolean().optional(),
  outOfStock: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(25),
});

const adjustStockSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().optional(),
  branchId: z.string().min(1),
  quantity: z.number().int(),
  reason: z.string().min(1).max(500),
  idempotencyKey: z.string().uuid().optional(),
});

export async function inventoryRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/v1/inventory/stock
  app.get('/stock', async (request, reply) => {
    const query = stockQuerySchema.parse(request.query);
    const orgId = new mongoose.Types.ObjectId(request.tenantId);

    const matchFilter: Record<string, unknown> = { organizationId: orgId };
    if (query.branchId) matchFilter['branchId'] = new mongoose.Types.ObjectId(query.branchId);
    if (query.outOfStock) matchFilter['quantityOnHand'] = { $lte: 0 };

    const skip = (query.page - 1) * query.limit;

    // Join with products to get name, sku, threshold
    const pipeline: mongoose.PipelineStage[] = [
      { $match: matchFilter },
      {
        $lookup: {
          from: 'products',
          localField: 'productId',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $unwind: '$product' },
      ...(query.q
        ? [{ $match: { $or: [{ 'product.name': { $regex: query.q, $options: 'i' } }, { 'product.sku': { $regex: query.q, $options: 'i' } }] } }]
        : []),
      ...(query.lowStock
        ? [{ $match: { $expr: { $and: [{ $gt: ['$quantityOnHand', 0] }, { $lte: ['$quantityOnHand', '$product.lowStockThreshold'] }] } } }]
        : []),
      { $sort: { 'product.name': 1 as const } },
      { $skip: skip },
      { $limit: query.limit },
      {
        $project: {
          productId: 1,
          branchId: 1,
          quantityOnHand: 1,
          updatedAt: 1,
          productName: '$product.name',
          sku: '$product.sku',
          lowStockThreshold: '$product.lowStockThreshold',
        },
      },
    ];

    const [items, totalArr] = await Promise.all([
      StockProjectionModel.aggregate(pipeline),
      StockProjectionModel.aggregate([
        { $match: matchFilter },
        { $lookup: { from: 'products', localField: 'productId', foreignField: '_id', as: 'product' } },
        { $unwind: '$product' },
        ...(query.q ? [{ $match: { $or: [{ 'product.name': { $regex: query.q, $options: 'i' } }, { 'product.sku': { $regex: query.q, $options: 'i' } }] } }] : []),
        { $count: 'total' },
      ]),
    ]);

    const total = (totalArr[0] as { total?: number } | undefined)?.total ?? 0;

    return reply.send({
      data: items,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    });
  });

  // POST /api/v1/inventory/adjust
  app.post('/adjust', async (request, reply) => {
    if (!can(request.userRole, 'inventory:adjust')) {
      throw new ForbiddenError('You do not have permission to adjust inventory');
    }

    const body = adjustStockSchema.parse(request.body);
    const orgId = new mongoose.Types.ObjectId(request.tenantId);
    const idempotencyKey = body.idempotencyKey ?? uuidv4();

    // Check idempotency
    const existing = await InventoryEventModel.findOne({ idempotencyKey });
    if (existing) {
      return reply.send({ data: { id: existing._id.toString(), duplicate: true } });
    }

    // Create inventory event
    const event = await InventoryEventModel.create({
      organizationId: orgId,
      branchId: new mongoose.Types.ObjectId(body.branchId),
      productId: new mongoose.Types.ObjectId(body.productId),
      ...(body.variantId && { variantId: new mongoose.Types.ObjectId(body.variantId) }),
      type: 'adjusted',
      quantity: body.quantity,
      referenceType: 'adjustment',
      referenceId: new mongoose.Types.ObjectId(),
      reason: body.reason,
      actorId: new mongoose.Types.ObjectId(request.userId),
      deviceId: request.headers['x-device-id'] as string ?? 'unknown',
      idempotencyKey,
    });

    // Update stock projection
    await StockProjectionModel.findOneAndUpdate(
      {
        organizationId: orgId,
        branchId: new mongoose.Types.ObjectId(body.branchId),
        productId: new mongoose.Types.ObjectId(body.productId),
      },
      {
        $inc: { quantityOnHand: body.quantity },
        $set: { lastInventoryEventId: event._id },
      },
      { upsert: true, new: true },
    );

    return reply.status(201).send({ data: { id: event._id.toString() } });
  });
}
