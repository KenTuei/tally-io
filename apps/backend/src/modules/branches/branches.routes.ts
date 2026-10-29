import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import mongoose from 'mongoose';
import { ForbiddenError, NotFoundError, ValidationError, ConflictError } from '../../middleware/error.middleware.js';
import { can } from '../../middleware/tenant.middleware.js';
import { BranchModel, RegisterModel, ShiftModel, StockTransferModel } from './branches.models.js';
import { ProductModel, StockProjectionModel } from '../products/products.models.js';
import { InventoryEventModel } from '../inventory/inventory.models.js';
import { LedgerEventModel } from '../ledger/ledger.models.js';
import { v4 as uuidv4 } from 'uuid';

const createBranchSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  code: z.string().min(1).max(10).trim().toUpperCase(),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    county: z.string().optional(),
    country: z.string().default('KE'),
    postalCode: z.string().optional(),
  }).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  managerId: z.string().optional(),
  isMainBranch: z.boolean().default(false),
  mapLat: z.number().optional(),
  mapLng: z.number().optional(),
});

const createRegisterSchema = z.object({
  branchId: z.string().min(1),
  name: z.string().min(1).max(100),
  deviceId: z.string().optional(),
});

const openShiftSchema = z.object({
  registerId: z.string().min(1),
  branchId: z.string().min(1),
  openingFloat: z.number().int().nonnegative(),
});

const closeShiftSchema = z.object({
  closingCount: z.number().int().nonnegative(),
  notes: z.string().max(500).optional(),
});

const createTransferSchema = z.object({
  fromBranchId: z.string().min(1),
  toBranchId: z.string().min(1),
  items: z.array(z.object({
    productId: z.string().min(1),
    variantId: z.string().optional(),
    quantityRequested: z.number().int().positive(),
    unitCost: z.number().int().nonnegative().optional(),
  })).min(1),
  notes: z.string().max(500).optional(),
  idempotencyKey: z.string().uuid().optional(),
});

export async function branchRoutes(app: FastifyInstance): Promise<void> {
  const orgId = () => new mongoose.Types.ObjectId('placeholder'); // placeholder — overridden per request

  // ── Branches ─────────────────────────────────────────────────────────────

  // GET /api/v1/branches
  app.get('/', async (request, reply) => {
    const branches = await BranchModel.find({
      organizationId: new mongoose.Types.ObjectId(request.tenantId),
    }).sort({ isMainBranch: -1, name: 1 }).lean();

    return reply.send({
      data: branches.map((b) => ({ ...b, id: b._id.toString() })),
    });
  });

  // POST /api/v1/branches
  app.post('/', async (request, reply) => {
    if (!can(request.userRole, 'settings:manage')) {
      throw new ForbiddenError('You do not have permission to create branches');
    }

    const body = createBranchSchema.parse(request.body);
    const tenantObjId = new mongoose.Types.ObjectId(request.tenantId);

    // Check for duplicate code
    const existing = await BranchModel.findOne({
      organizationId: tenantObjId,
      code: body.code,
    });
    if (existing) throw new ConflictError(`Branch code ${body.code} already exists`);

    const branch = await BranchModel.create({
      ...body,
      organizationId: tenantObjId,
      managerId: body.managerId ? new mongoose.Types.ObjectId(body.managerId) : undefined,
    });

    return reply.status(201).send({ data: { ...branch.toObject(), id: branch._id.toString() } });
  });

  // GET /api/v1/branches/:id
  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const branch = await BranchModel.findOne({
      _id: id,
      organizationId: new mongoose.Types.ObjectId(request.tenantId),
    }).lean();

    if (!branch) throw new NotFoundError('Branch');
    return reply.send({ data: { ...branch, id: branch._id.toString() } });
  });

  // PATCH /api/v1/branches/:id
  app.patch('/:id', async (request, reply) => {
    if (!can(request.userRole, 'settings:manage')) {
      throw new ForbiddenError('You do not have permission to update branches');
    }

    const { id } = request.params as { id: string };
    const body = createBranchSchema.partial().parse(request.body);

    const branch = await BranchModel.findOneAndUpdate(
      { _id: id, organizationId: new mongoose.Types.ObjectId(request.tenantId) },
      { $set: body },
      { new: true },
    ).lean();

    if (!branch) throw new NotFoundError('Branch');
    return reply.send({ data: { ...branch, id: branch._id.toString() } });
  });

  // ── Registers ─────────────────────────────────────────────────────────────

  // GET /api/v1/branches/registers
  app.get('/registers', async (request, reply) => {
    const tenantObjId = new mongoose.Types.ObjectId(request.tenantId);
    const query: Record<string, unknown> = { organizationId: tenantObjId };

    // Branch managers can only see their branches
    if (request.branchIds.length > 0) {
      query['branchId'] = { $in: request.branchIds.map((id) => new mongoose.Types.ObjectId(id)) };
    }

    const registers = await RegisterModel.find(query).lean();
    return reply.send({ data: registers.map((r) => ({ ...r, id: r._id.toString() })) });
  });

  // POST /api/v1/branches/registers
  app.post('/registers', async (request, reply) => {
    if (!can(request.userRole, 'settings:manage')) {
      throw new ForbiddenError('You do not have permission to create registers');
    }

    const body = createRegisterSchema.parse(request.body);
    const tenantObjId = new mongoose.Types.ObjectId(request.tenantId);

    // Verify branch belongs to this org
    const branch = await BranchModel.findOne({
      _id: body.branchId,
      organizationId: tenantObjId,
    });
    if (!branch) throw new NotFoundError('Branch');

    const register = await RegisterModel.create({
      organizationId: tenantObjId,
      branchId: new mongoose.Types.ObjectId(body.branchId),
      name: body.name,
      deviceId: body.deviceId,
    });

    return reply.status(201).send({ data: { ...register.toObject(), id: register._id.toString() } });
  });

  // ── Shifts ─────────────────────────────────────────────────────────────────

  // POST /api/v1/branches/shifts/open
  app.post('/shifts/open', async (request, reply) => {
    if (!can(request.userRole, 'shift:open')) {
      throw new ForbiddenError('You do not have permission to open shifts');
    }

    const body = openShiftSchema.parse(request.body);
    const tenantObjId = new mongoose.Types.ObjectId(request.tenantId);

    // Check no open shift on this register
    const existingOpen = await ShiftModel.findOne({
      registerId: new mongoose.Types.ObjectId(body.registerId),
      organizationId: tenantObjId,
      status: 'open',
    });
    if (existingOpen) throw new ConflictError('A shift is already open on this register');

    const shift = await ShiftModel.create({
      organizationId: tenantObjId,
      branchId: new mongoose.Types.ObjectId(body.branchId),
      registerId: new mongoose.Types.ObjectId(body.registerId),
      cashierId: new mongoose.Types.ObjectId(request.userId),
      status: 'open',
      openingFloat: body.openingFloat,
      openedAt: new Date(),
    });

    // Update register's currentShiftId
    await RegisterModel.findByIdAndUpdate(body.registerId, {
      $set: { currentShiftId: shift._id },
    });

    // Write ledger event
    await LedgerEventModel.create({
      eventId: uuidv4(),
      idempotencyKey: uuidv4(),
      correlationId: uuidv4(),
      organizationId: tenantObjId,
      branchId: new mongoose.Types.ObjectId(body.branchId),
      deviceId: request.deviceId ?? 'unknown',
      eventType: 'SHIFT_OPENED',
      schemaVersion: 1,
      entityType: 'shift',
      entityId: shift._id,
      actorId: new mongoose.Types.ObjectId(request.userId),
      actorType: 'user',
      clientTimestamp: new Date(),
      serverTimestamp: new Date(),
      offlineCreated: false,
      payload: { registerId: body.registerId, openingFloat: body.openingFloat },
    });

    return reply.status(201).send({ data: { ...shift.toObject(), id: shift._id.toString() } });
  });

  // POST /api/v1/branches/shifts/:shiftId/close
  app.post('/shifts/:shiftId/close', async (request, reply) => {
    const { shiftId } = request.params as { shiftId: string };
    const body = closeShiftSchema.parse(request.body);
    const tenantObjId = new mongoose.Types.ObjectId(request.tenantId);

    const shift = await ShiftModel.findOne({
      _id: shiftId,
      organizationId: tenantObjId,
      status: 'open',
    });
    if (!shift) throw new NotFoundError('Open shift');

    // Only cashier who opened it or managers can close it
    const isOwn = shift.cashierId.toString() === request.userId;
    const canCloseAny = can(request.userRole, 'shift:close:any');
    if (!isOwn && !canCloseAny) {
      throw new ForbiddenError('You can only close your own shifts');
    }

    // Calculate expected cash (opening float + cash sales during this shift)
    // Simplified: expected = opening float (full calculation done by reports)
    const variance = body.closingCount - shift.openingFloat;

    const updated = await ShiftModel.findByIdAndUpdate(
      shiftId,
      {
        $set: {
          status: 'closed',
          closingCount: body.closingCount,
          variance,
          closedAt: new Date(),
          closedBy: new mongoose.Types.ObjectId(request.userId),
          notes: body.notes,
        },
      },
      { new: true },
    ).lean();

    // Clear register's currentShiftId
    await RegisterModel.findByIdAndUpdate(shift.registerId, {
      $unset: { currentShiftId: 1 },
    });

    // Write ledger event
    await LedgerEventModel.create({
      eventId: uuidv4(),
      idempotencyKey: uuidv4(),
      correlationId: uuidv4(),
      organizationId: tenantObjId,
      branchId: shift.branchId,
      deviceId: request.deviceId ?? 'unknown',
      eventType: 'SHIFT_CLOSED',
      schemaVersion: 1,
      entityType: 'shift',
      entityId: shift._id,
      actorId: new mongoose.Types.ObjectId(request.userId),
      actorType: 'user',
      clientTimestamp: new Date(),
      serverTimestamp: new Date(),
      offlineCreated: false,
      payload: {
        openingFloat: shift.openingFloat,
        closingCount: body.closingCount,
        variance,
      },
    });

    return reply.send({ data: { ...updated, id: updated?._id.toString() } });
  });

  // GET /api/v1/branches/shifts — list shifts (current cashier or all for managers)
  app.get('/shifts', async (request, reply) => {
    const tenantObjId = new mongoose.Types.ObjectId(request.tenantId);
    const query: Record<string, unknown> = { organizationId: tenantObjId };

    if (!can(request.userRole, 'shift:close:any')) {
      query['cashierId'] = new mongoose.Types.ObjectId(request.userId);
    }

    const shifts = await ShiftModel.find(query)
      .sort({ openedAt: -1 })
      .limit(50)
      .lean();

    return reply.send({ data: shifts.map((s) => ({ ...s, id: s._id.toString() })) });
  });

  // ── Stock Transfers ────────────────────────────────────────────────────────

  // POST /api/v1/branches/transfers
  app.post('/transfers', async (request, reply) => {
    if (!can(request.userRole, 'inventory:transfer')) {
      throw new ForbiddenError('You do not have permission to create stock transfers');
    }

    const body = createTransferSchema.parse(request.body);
    const tenantObjId = new mongoose.Types.ObjectId(request.tenantId);
    const idempotencyKey = body.idempotencyKey ?? uuidv4();

    // Check idempotency
    const existing = await StockTransferModel.findOne({ idempotencyKey });
    if (existing) {
      return reply.send({ data: { id: existing._id.toString(), duplicate: true } });
    }

    // Verify both branches belong to this org
    const [fromBranch, toBranch] = await Promise.all([
      BranchModel.findOne({ _id: body.fromBranchId, organizationId: tenantObjId }),
      BranchModel.findOne({ _id: body.toBranchId, organizationId: tenantObjId }),
    ]);
    if (!fromBranch) throw new ValidationError('Source branch not found');
    if (!toBranch) throw new ValidationError('Destination branch not found');
    if (body.fromBranchId === body.toBranchId) {
      throw new ValidationError('Source and destination branches must be different');
    }

    // Enrich items with product details
    const productIds = body.items.map((i) => new mongoose.Types.ObjectId(i.productId));
    const products = await ProductModel.find({
      _id: { $in: productIds },
      organizationId: tenantObjId,
    }).lean();
    const productMap = new Map(products.map((p) => [p._id.toString(), p]));

    const enrichedItems = body.items.map((item) => {
      const product = productMap.get(item.productId);
      if (!product) throw new ValidationError(`Product not found: ${item.productId}`);
      return {
        productId: new mongoose.Types.ObjectId(item.productId),
        variantId: item.variantId ? new mongoose.Types.ObjectId(item.variantId) : undefined,
        productName: product.name,
        sku: product.sku,
        quantityRequested: item.quantityRequested,
        unitCost: item.unitCost ?? product.costPrice,
      };
    });

    // Generate transfer number
    const count = await StockTransferModel.countDocuments({ organizationId: tenantObjId });
    const transferNumber = `TRF-${String(count + 1).padStart(5, '0')}`;

    const transfer = await StockTransferModel.create({
      organizationId: tenantObjId,
      fromBranchId: new mongoose.Types.ObjectId(body.fromBranchId),
      toBranchId: new mongoose.Types.ObjectId(body.toBranchId),
      transferNumber,
      status: 'draft',
      items: enrichedItems,
      initiatedBy: new mongoose.Types.ObjectId(request.userId),
      notes: body.notes,
      idempotencyKey,
    });

    return reply.status(201).send({
      data: { ...transfer.toObject(), id: transfer._id.toString() },
    });
  });

  // PATCH /api/v1/branches/transfers/:id/dispatch
  app.patch('/transfers/:id/dispatch', async (request, reply) => {
    if (!can(request.userRole, 'inventory:transfer')) {
      throw new ForbiddenError('You do not have permission to dispatch transfers');
    }

    const { id } = request.params as { id: string };
    const tenantObjId = new mongoose.Types.ObjectId(request.tenantId);

    const transfer = await StockTransferModel.findOne({
      _id: id,
      organizationId: tenantObjId,
      status: 'draft',
    });
    if (!transfer) throw new NotFoundError('Transfer');

    const session = await (await import('mongoose')).default.startSession();

    try {
      await session.withTransaction(async () => {
        // Deduct stock from source branch
        for (const item of transfer.items) {
          await StockProjectionModel.findOneAndUpdate(
            { organizationId: tenantObjId, branchId: transfer.fromBranchId, productId: item.productId },
            { $inc: { quantityOnHand: -item.quantityRequested } },
            { upsert: true, session },
          );

          await InventoryEventModel.create(
            [{
              organizationId: tenantObjId,
              branchId: transfer.fromBranchId,
              productId: item.productId,
              variantId: item.variantId,
              type: 'transferred_out',
              quantity: -item.quantityRequested,
              unitCost: item.unitCost,
              referenceType: 'transfer',
              referenceId: transfer._id,
              reason: `Transfer to ${transfer.toBranchId}`,
              actorId: new mongoose.Types.ObjectId(request.userId),
              deviceId: request.deviceId ?? 'unknown',
              idempotencyKey: `${id}-dispatch-${item.productId.toString()}`,
            }],
            { session },
          );
        }

        await StockTransferModel.findByIdAndUpdate(
          id,
          {
            $set: {
              status: 'dispatched',
              dispatchedAt: new Date(),
              items: transfer.items.map((item) => ({
                  ...Object.fromEntries(Object.entries(item)),
                  quantityDispatched: item.quantityRequested,
              })),
            },
          },
          { session },
        );

        // Ledger event — NOT a sale, does not inflate revenue
        await LedgerEventModel.create(
          [{
            eventId: uuidv4(),
            idempotencyKey: `${id}-dispatch-ledger`,
            correlationId: uuidv4(),
            organizationId: tenantObjId,
            branchId: transfer.fromBranchId,
            deviceId: request.deviceId ?? 'unknown',
            eventType: 'INVENTORY_TRANSFERRED',
            schemaVersion: 1,
            entityType: 'stockTransfer',
            entityId: transfer._id,
            actorId: new mongoose.Types.ObjectId(request.userId),
            actorType: 'user',
            clientTimestamp: new Date(),
            serverTimestamp: new Date(),
            offlineCreated: false,
            payload: {
              transferNumber: transfer.transferNumber,
              fromBranchId: transfer.fromBranchId.toString(),
              toBranchId: transfer.toBranchId.toString(),
              itemCount: transfer.items.length,
            },
          }],
          { session },
        );
      });
    } finally {
      await session.endSession();
    }

    return reply.send({ data: { dispatched: true, transferNumber: transfer.transferNumber } });
  });

  // PATCH /api/v1/branches/transfers/:id/receive
  app.patch('/transfers/:id/receive', async (request, reply) => {
    if (!can(request.userRole, 'inventory:receive')) {
      throw new ForbiddenError('You do not have permission to receive transfers');
    }

    const { id } = request.params as { id: string };
    const tenantObjId = new mongoose.Types.ObjectId(request.tenantId);

    const transfer = await StockTransferModel.findOne({
      _id: id,
      organizationId: tenantObjId,
      status: 'dispatched',
    });
    if (!transfer) throw new NotFoundError('Dispatched transfer');

    const session = await (await import('mongoose')).default.startSession();

    try {
      await session.withTransaction(async () => {
        // Add stock to destination branch
        for (const item of transfer.items) {
          await StockProjectionModel.findOneAndUpdate(
            { organizationId: tenantObjId, branchId: transfer.toBranchId, productId: item.productId },
            { $inc: { quantityOnHand: item.quantityDispatched ?? item.quantityRequested } },
            { upsert: true, session },
          );

          await InventoryEventModel.create(
            [{
              organizationId: tenantObjId,
              branchId: transfer.toBranchId,
              productId: item.productId,
              variantId: item.variantId,
              type: 'transferred_in',
              quantity: item.quantityDispatched ?? item.quantityRequested,
              unitCost: item.unitCost,
              referenceType: 'transfer',
              referenceId: transfer._id,
              reason: `Transfer from ${transfer.fromBranchId}`,
              actorId: new mongoose.Types.ObjectId(request.userId),
              deviceId: request.deviceId ?? 'unknown',
              idempotencyKey: `${id}-receive-${item.productId.toString()}`,
            }],
            { session },
          );
        }

        await StockTransferModel.findByIdAndUpdate(
          id,
          {
            $set: {
              status: 'received',
              receivedAt: new Date(),
              items: transfer.items.map((item) => ({
                  ...Object.fromEntries(Object.entries(item)),
                  quantityReceived: item.quantityDispatched ?? item.quantityRequested,
              })),
            },
          },
          { session },
        );
      });
    } finally {
      await session.endSession();
    }

    return reply.send({ data: { received: true, transferNumber: transfer.transferNumber } });
  });

  // GET /api/v1/branches/transfers
  app.get('/transfers', async (request, reply) => {
    const tenantObjId = new mongoose.Types.ObjectId(request.tenantId);
    const transfers = await StockTransferModel.find({ organizationId: tenantObjId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return reply.send({ data: transfers.map((t) => ({ ...t, id: t._id.toString() })) });
  });

  // ── Cross-branch comparison ─────────────────────────────────────────────────

  // GET /api/v1/branches/comparison
  app.get('/comparison', async (request, reply) => {
    if (!can(request.userRole, 'report:view') && !can(request.userRole, 'report:view:branch')) {
      throw new ForbiddenError('You do not have permission to view branch comparisons');
    }

    const tenantObjId = new mongoose.Types.ObjectId(request.tenantId);
    const { from, to } = request.query as { from?: string; to?: string };

    const startDate = from ? new Date(from) : (() => { const d = new Date(); d.setDate(d.getDate() - 30); return d; })();
    const endDate = to ? new Date(to + 'T23:59:59Z') : new Date();

    const { SaleModel } = await import('../sales/sales.models.js');

    const [branches, salesByBranch] = await Promise.all([
      BranchModel.find({ organizationId: tenantObjId, isActive: true }).lean(),
      SaleModel.aggregate([
        {
          $match: {
            organizationId: tenantObjId,
            status: 'completed',
            completedAt: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $group: {
            _id: '$branchId',
            totalSales: { $sum: '$total' },
            transactions: { $sum: 1 },
            avgOrderValue: { $avg: '$total' },
          },
        },
      ]),
    ]);

    const salesMap = new Map(
      salesByBranch.map((s: Record<string, unknown>) => [s['_id']?.toString() ?? '', s]),
    );

    const comparison = branches.map((branch) => {
      const sales = salesMap.get(branch._id.toString()) as Record<string, number> | undefined;
      return {
        branchId: branch._id.toString(),
        branchName: branch.name,
        branchCode: branch.code,
        totalSales: sales?.['totalSales'] ?? 0,
        transactions: sales?.['transactions'] ?? 0,
        avgOrderValue: sales?.['avgOrderValue'] ?? 0,
      };
    });

    return reply.send({
      data: {
        comparison,
        from: startDate.toISOString(),
        to: endDate.toISOString(),
      },
    });
  });
}
