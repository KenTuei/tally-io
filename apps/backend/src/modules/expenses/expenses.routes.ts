import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import mongoose from 'mongoose';
import { NotFoundError } from '../../middleware/error.middleware.js';
import { can } from '../../middleware/tenant.middleware.js';
import { ForbiddenError } from '../../middleware/error.middleware.js';
import { ExpenseModel, ExpenseCategoryModel } from './expenses.models.js';
import { LedgerEventModel } from '../ledger/ledger.models.js';
import { v4 as uuidv4 } from 'uuid';

const createExpenseSchema = z.object({
  branchId: z.string().min(1),
  categoryId: z.string().optional(),
  amount: z.number().int().positive(),
  currency: z.string().default('KES'),
  paymentMethod: z.enum(['cash', 'mpesa', 'card', 'bank_transfer', 'other']),
  payeeName: z.string().min(1).max(100),
  reference: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
  date: z.string().datetime(),
});

const expenseQuerySchema = z.object({
  branchId: z.string().optional(),
  categoryId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export async function expenseRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/v1/expenses/categories
  app.get('/categories', async (request, reply) => {
    const categories = await ExpenseCategoryModel.find({
      organizationId: new mongoose.Types.ObjectId(request.tenantId),
      isActive: true,
    }).sort({ name: 1 }).lean();

    return reply.send({ data: categories.map((c) => ({ ...c, id: c._id.toString() })) });
  });

  // POST /api/v1/expenses/categories
  app.post('/categories', async (request, reply) => {
    if (!can(request.userRole, 'expense:create')) throw new ForbiddenError('Permission denied');

    const body = (request.body as { name?: string }) ?? {};
    if (!body.name) throw new Error('name is required');

    const category = await ExpenseCategoryModel.create({
      organizationId: new mongoose.Types.ObjectId(request.tenantId),
      name: body.name,
    });

    return reply.status(201).send({ data: { ...category.toObject(), id: category._id.toString() } });
  });

  // GET /api/v1/expenses
  app.get('/', async (request, reply) => {
    if (!can(request.userRole, 'expense:view')) throw new ForbiddenError('Permission denied');

    const query = expenseQuerySchema.parse(request.query);
    const orgId = new mongoose.Types.ObjectId(request.tenantId);
    const filter: Record<string, unknown> = { organizationId: orgId };

    if (query.branchId) filter['branchId'] = new mongoose.Types.ObjectId(query.branchId);
    if (query.categoryId) filter['categoryId'] = new mongoose.Types.ObjectId(query.categoryId);
    if (query.from || query.to) {
      filter['date'] = {
        ...(query.from && { $gte: new Date(query.from) }),
        ...(query.to && { $lte: new Date(query.to + 'T23:59:59Z') }),
      };
    }

    const skip = (query.page - 1) * query.limit;
    const [expenses, total] = await Promise.all([
      ExpenseModel.find(filter).sort({ date: -1 }).skip(skip).limit(query.limit).lean(),
      ExpenseModel.countDocuments(filter),
    ]);

    return reply.send({
      data: expenses.map((e) => ({ ...e, id: e._id.toString() })),
      pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
    });
  });

  // POST /api/v1/expenses
  app.post('/', async (request, reply) => {
    if (!can(request.userRole, 'expense:create')) throw new ForbiddenError('Permission denied');

    const body = createExpenseSchema.parse(request.body);
    const orgId = new mongoose.Types.ObjectId(request.tenantId);

    const expense = await ExpenseModel.create({
      ...body,
      organizationId: orgId,
      branchId: new mongoose.Types.ObjectId(body.branchId),
      categoryId: body.categoryId ? new mongoose.Types.ObjectId(body.categoryId) : undefined,
      date: new Date(body.date),
      recordedBy: new mongoose.Types.ObjectId(request.userId),
      status: 'approved', // auto-approve unless approval workflow needed
    });

    // Write ledger event
    await LedgerEventModel.create({
      eventId: uuidv4(),
      idempotencyKey: uuidv4(),
      correlationId: uuidv4(),
      organizationId: orgId,
      branchId: new mongoose.Types.ObjectId(body.branchId),
      deviceId: request.deviceId ?? 'unknown',
      eventType: 'EXPENSE_RECORDED',
      schemaVersion: 1,
      entityType: 'expense',
      entityId: expense._id,
      actorId: new mongoose.Types.ObjectId(request.userId),
      actorType: 'user',
      clientTimestamp: new Date(),
      serverTimestamp: new Date(),
      offlineCreated: false,
      payload: {
        amount: expense.amount,
        currency: expense.currency,
        paymentMethod: expense.paymentMethod,
        payeeName: expense.payeeName,
      },
    });

    return reply.status(201).send({ data: { ...expense.toObject(), id: expense._id.toString() } });
  });
}
