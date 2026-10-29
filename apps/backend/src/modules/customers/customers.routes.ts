import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import mongoose from 'mongoose';
import { NotFoundError, ValidationError } from '../../middleware/error.middleware.js';
import { can } from '../../middleware/tenant.middleware.js';
import { ForbiddenError } from '../../middleware/error.middleware.js';
import { CustomerModel } from './customers.models.js';

const createCustomerSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  phone: z.string().max(20).optional(),
  email: z.string().email().optional(),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    county: z.string().optional(),
    country: z.string().default('KE'),
  }).optional(),
  notes: z.string().max(500).optional(),
  creditAllowed: z.boolean().default(false),
  creditLimit: z.number().int().nonnegative().optional(),
  marketingConsent: z.boolean().default(false),
  birthDay: z.number().int().min(1).max(31).optional(),
  birthMonth: z.number().int().min(1).max(12).optional(),
});

const customerQuerySchema = z.object({
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export async function customerRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/v1/customers
  app.get('/', async (request, reply) => {
    if (!can(request.userRole, 'customer:view')) {
      throw new ForbiddenError('You do not have permission to view customers');
    }

    const query = customerQuerySchema.parse(request.query);
    const orgId = new mongoose.Types.ObjectId(request.tenantId);
    const filter: Record<string, unknown> = { organizationId: orgId, isActive: true };

    if (query.q) {
      filter['$or'] = [
        { name: { $regex: query.q, $options: 'i' } },
        { phone: { $regex: query.q, $options: 'i' } },
        { email: { $regex: query.q, $options: 'i' } },
      ];
    }

    const skip = (query.page - 1) * query.limit;
    const [customers, total] = await Promise.all([
      CustomerModel.find(filter).sort({ name: 1 }).skip(skip).limit(query.limit).lean(),
      CustomerModel.countDocuments(filter),
    ]);

    return reply.send({
      data: customers.map((c) => ({ ...c, id: c._id.toString() })),
      pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
    });
  });

  // POST /api/v1/customers
  app.post('/', async (request, reply) => {
    if (!can(request.userRole, 'customer:create')) {
      throw new ForbiddenError('You do not have permission to create customers');
    }

    const body = createCustomerSchema.parse(request.body);
    const orgId = new mongoose.Types.ObjectId(request.tenantId);

    // Check for duplicate phone
    if (body.phone) {
      const existing = await CustomerModel.findOne({ organizationId: orgId, phone: body.phone });
      if (existing) throw new ValidationError('A customer with this phone number already exists');
    }

    const customer = await CustomerModel.create({ ...body, organizationId: orgId });
    return reply.status(201).send({ data: { ...customer.toObject(), id: customer._id.toString() } });
  });

  // GET /api/v1/customers/:id
  app.get('/:id', async (request, reply) => {
    if (!can(request.userRole, 'customer:view')) throw new ForbiddenError('Permission denied');

    const { id } = request.params as { id: string };
    const customer = await CustomerModel.findOne({
      _id: id,
      organizationId: new mongoose.Types.ObjectId(request.tenantId),
    }).lean();

    if (!customer) throw new NotFoundError('Customer');
    return reply.send({ data: { ...customer, id: customer._id.toString() } });
  });

  // PATCH /api/v1/customers/:id
  app.patch('/:id', async (request, reply) => {
    if (!can(request.userRole, 'customer:create')) throw new ForbiddenError('Permission denied');

    const { id } = request.params as { id: string };
    const body = createCustomerSchema.partial().parse(request.body);

    const customer = await CustomerModel.findOneAndUpdate(
      { _id: id, organizationId: new mongoose.Types.ObjectId(request.tenantId) },
      { $set: body },
      { new: true },
    ).lean();

    if (!customer) throw new NotFoundError('Customer');
    return reply.send({ data: { ...customer, id: customer._id.toString() } });
  });
}
