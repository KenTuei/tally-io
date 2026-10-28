import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { ForbiddenError, NotFoundError, ConflictError, ValidationError } from '../../middleware/error.middleware.js';
import { can } from '../../middleware/tenant.middleware.js';
import { SaleModel, SaleItemModel, PaymentAttemptModel } from './sales.models.js';
import { ProductModel, StockProjectionModel } from '../products/products.models.js';
import { LedgerEventModel } from '../ledger/ledger.models.js';

const completeSaleSchema = z.object({
  branchId: z.string().min(1),
  registerId: z.string().min(1),
  shiftId: z.string().min(1),
  customerId: z.string().optional(),
  items: z.array(
    z.object({
      productId: z.string().min(1),
      variantId: z.string().optional(),
      quantity: z.number().int().positive(),
      discountAmount: z.number().int().nonnegative().default(0),
    }),
  ).min(1, 'At least one item required'),
  payments: z.array(
    z.object({
      method: z.enum(['cash', 'mpesa', 'card', 'bank_transfer', 'other']),
      amount: z.number().int().positive(),
      reference: z.string().optional(),
    }),
  ).min(1),
  notes: z.string().max(500).optional(),
  offlineId: z.string().optional(),
  deviceId: z.string().min(1),
  clientTimestamp: z.string().datetime(),
});

const salesQuerySchema = z.object({
  q: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  branchId: z.string().optional(),
  status: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

async function generateReceiptNumber(orgId: mongoose.Types.ObjectId): Promise<string> {
  const today = new Date();
  const prefix = `TLY-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
  const count = await SaleModel.countDocuments({
    organizationId: orgId,
    createdAt: { $gte: new Date(today.setHours(0, 0, 0, 0)) },
  });
  return `${prefix}-${String(count + 1).padStart(4, '0')}`;
}

export async function saleRoutes(app: FastifyInstance): Promise<void> {
  // POST /api/v1/sales — complete a sale
  app.post('/', async (request, reply) => {
    if (!can(request.userRole, 'sale:create')) {
      throw new ForbiddenError('You do not have permission to create sales');
    }

    const body = completeSaleSchema.parse(request.body);
    const orgId = new mongoose.Types.ObjectId(request.tenantId);

    // Idempotency: if offlineId exists, check for duplicate
    if (body.offlineId) {
      const existing = await SaleModel.findOne({
        organizationId: orgId,
        offlineId: body.offlineId,
      });
      if (existing) {
        return reply.send({
          data: { id: existing._id.toString(), receiptNumber: existing.receiptNumber, duplicate: true },
        });
      }
    }

    // Load products and calculate totals
    const productIds = body.items.map((i) => new mongoose.Types.ObjectId(i.productId));
    const products = await ProductModel.find({
      _id: { $in: productIds },
      organizationId: orgId,
      isActive: true,
    }).lean();

    const productMap = new Map(products.map((p) => [p._id.toString(), p]));

    // Build sale items
    let subtotal = 0;
    let totalDiscount = 0;
    let totalTax = 0;

    const lineItems = body.items.map((item) => {
      const product = productMap.get(item.productId);
      if (!product) throw new ValidationError(`Product not found: ${item.productId}`);

      const unitPrice = product.sellingPrice;
      const lineSubtotal = unitPrice * item.quantity;
      const discount = item.discountAmount ?? 0;
      // Simplified tax: taxRate would come from product.taxRateId
      const taxAmount = 0;
      const lineTotal = lineSubtotal - discount + taxAmount;

      subtotal += lineSubtotal;
      totalDiscount += discount;
      totalTax += taxAmount;

      return {
        organizationId: orgId,
        productId: new mongoose.Types.ObjectId(item.productId),
        variantId: item.variantId ? new mongoose.Types.ObjectId(item.variantId) : undefined,
        productName: product.name,
        sku: product.sku,
        barcode: product.barcode,
        quantity: item.quantity,
        unitPrice,
        costPrice: product.costPrice,
        discountAmount: discount,
        taxAmount,
        lineTotal,
      };
    });

    const total = subtotal - totalDiscount + totalTax;
    const amountPaid = body.payments.reduce((s, p) => s + p.amount, 0);
    const change = Math.max(0, amountPaid - total);

    if (amountPaid < total) {
      throw new ValidationError('Payment amount is less than the total');
    }

    const receiptNumber = await generateReceiptNumber(orgId);
    const branchId = new mongoose.Types.ObjectId(body.branchId);
    const saleId = new mongoose.Types.ObjectId();

    // Use MongoDB session for transaction if available
    const session = await mongoose.startSession();
    let sale: InstanceType<typeof SaleModel> | null = null;

    try {
      await session.withTransaction(async () => {
        // Create sale
        const [createdSale] = await SaleModel.create(
          [
            {
              _id: saleId,
              organizationId: orgId,
              branchId,
              registerId: new mongoose.Types.ObjectId(body.registerId),
              shiftId: new mongoose.Types.ObjectId(body.shiftId),
              receiptNumber,
              status: 'completed',
              customerId: body.customerId ? new mongoose.Types.ObjectId(body.customerId) : undefined,
              cashierId: new mongoose.Types.ObjectId(request.userId),
              subtotal,
              discountAmount: totalDiscount,
              taxAmount: totalTax,
              total,
              amountPaid,
              change,
              notes: body.notes,
              deviceId: body.deviceId,
              offlineId: body.offlineId,
              syncStatus: 'synced',
              completedAt: new Date(),
            },
          ],
          { session },
        );
        sale = createdSale as InstanceType<typeof SaleModel>;

        // Create sale items
        await SaleItemModel.insertMany(
          lineItems.map((item) => ({ ...item, saleId })),
          { session },
        );

        // Create payment attempts
        await PaymentAttemptModel.insertMany(
          body.payments.map((p) => ({
            organizationId: orgId,
            saleId,
            method: p.method,
            amount: p.amount,
            currency: 'KES',
            status: p.method === 'cash' ? 'confirmed' : 'pending',
            reference: p.reference,
            idempotencyKey: uuidv4(),
            initiatedAt: new Date(),
            confirmedAt: p.method === 'cash' ? new Date() : undefined,
          })),
          { session },
        );

        // Write ledger event (append-only)
        await LedgerEventModel.create(
          [
            {
              eventId: uuidv4(),
              idempotencyKey: body.offlineId ?? uuidv4(),
              correlationId: uuidv4(),
              organizationId: orgId,
              branchId,
              deviceId: body.deviceId,
              eventType: 'SALE_COMPLETED',
              schemaVersion: 1,
              entityType: 'sale',
              entityId: saleId,
              actorId: new mongoose.Types.ObjectId(request.userId),
              actorType: 'user',
              clientTimestamp: new Date(body.clientTimestamp),
              serverTimestamp: new Date(),
              offlineCreated: !!body.offlineId,
              payload: {
                receiptNumber,
                total,
                itemCount: body.items.length,
                paymentMethods: body.payments.map((p) => p.method),
              },
            },
          ],
          { session },
        );

        // Update stock projections
        for (const item of lineItems) {
          await StockProjectionModel.findOneAndUpdate(
            {
              organizationId: orgId,
              branchId,
              productId: item.productId,
            },
            { $inc: { quantityOnHand: -item.quantity } },
            { upsert: true, session },
          );
        }
      });
    } finally {
      await session.endSession();
    }

    return reply.status(201).send({
      data: {
        id: saleId.toString(),
        receiptNumber,
        total,
        status: 'completed',
      },
    });
  });

  // GET /api/v1/sales
  app.get('/', async (request, reply) => {
    const query = salesQuerySchema.parse(request.query);
    const orgId = new mongoose.Types.ObjectId(request.tenantId);

    const filter: Record<string, unknown> = { organizationId: orgId };
    if (query.branchId) filter['branchId'] = new mongoose.Types.ObjectId(query.branchId);
    if (query.status) filter['status'] = query.status;
    if (query.from || query.to) {
      filter['completedAt'] = {
        ...(query.from && { $gte: new Date(query.from) }),
        ...(query.to && { $lte: new Date(query.to + 'T23:59:59Z') }),
      };
    }

    const skip = (query.page - 1) * query.limit;
    const [sales, total] = await Promise.all([
      SaleModel.find(filter)
        .sort({ completedAt: -1 })
        .skip(skip)
        .limit(query.limit)
        .lean(),
      SaleModel.countDocuments(filter),
    ]);

    return reply.send({
      data: sales.map((s) => ({ ...s, id: s._id.toString() })),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    });
  });

  // GET /api/v1/sales/:id
  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const orgId = new mongoose.Types.ObjectId(request.tenantId);

    const [sale, items] = await Promise.all([
      SaleModel.findOne({ _id: id, organizationId: orgId }).lean(),
      SaleItemModel.find({ saleId: id, organizationId: orgId }).lean(),
    ]);

    if (!sale) throw new NotFoundError('Sale');

    return reply.send({
      data: {
        ...sale,
        id: sale._id.toString(),
        items: items.map((i) => ({ ...i, id: i._id.toString() })),
      },
    });
  });
}
