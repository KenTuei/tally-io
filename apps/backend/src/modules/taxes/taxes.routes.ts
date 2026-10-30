import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import mongoose from 'mongoose';
import { NotFoundError, ValidationError, ConflictError, ForbiddenError } from '../../middleware/error.middleware.js';
import { can } from '../../middleware/tenant.middleware.js';
import { TaxRateModel } from './taxes.models.js';

const createTaxSchema = z.object({
  name: z.string().min(1).max(50).trim(),
  code: z.string().min(1).max(20).trim().toUpperCase(),
  rate: z.number().int().min(0).max(10000), // e.g. 1600 = 16%
  isInclusive: z.boolean().default(false),
  isDefault: z.boolean().default(false),
  appliesToServices: z.boolean().default(true),
});

export async function taxRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/v1/taxes
  app.get('/', async (request, reply) => {
    const taxes = await TaxRateModel.find({
      organizationId: new mongoose.Types.ObjectId(request.tenantId),
      isActive: true,
    }).sort({ isDefault: -1, name: 1 }).lean();

    return reply.send({ data: taxes.map((t) => ({ ...t, id: t._id.toString() })) });
  });

  // POST /api/v1/taxes
  app.post('/', async (request, reply) => {
    if (!can(request.userRole, 'settings:manage')) {
      throw new ForbiddenError('Permission denied');
    }

    const body = createTaxSchema.parse(request.body);
    const orgId = new mongoose.Types.ObjectId(request.tenantId);

    // Unique code per org
    const existing = await TaxRateModel.findOne({ organizationId: orgId, code: body.code });
    if (existing) throw new ConflictError(`Tax code ${body.code} already exists`);

    // If setting as default, unset others
    if (body.isDefault) {
      await TaxRateModel.updateMany({ organizationId: orgId }, { $set: { isDefault: false } });
    }

    const tax = await TaxRateModel.create({ ...body, organizationId: orgId });
    return reply.status(201).send({ data: { ...tax.toObject(), id: tax._id.toString() } });
  });

  // PATCH /api/v1/taxes/:id
  app.patch('/:id', async (request, reply) => {
    if (!can(request.userRole, 'settings:manage')) throw new ForbiddenError('Permission denied');

    const { id } = request.params as { id: string };
    const body = createTaxSchema.partial().parse(request.body);
    const orgId = new mongoose.Types.ObjectId(request.tenantId);

    if (body.isDefault) {
      await TaxRateModel.updateMany({ organizationId: orgId }, { $set: { isDefault: false } });
    }

    const tax = await TaxRateModel.findOneAndUpdate(
      { _id: id, organizationId: orgId },
      { $set: body },
      { new: true },
    ).lean();

    if (!tax) throw new NotFoundError('Tax rate');
    return reply.send({ data: { ...tax, id: tax._id.toString() } });
  });

  // DELETE /api/v1/taxes/:id  (soft delete)
  app.delete('/:id', async (request, reply) => {
    if (!can(request.userRole, 'settings:manage')) throw new ForbiddenError('Permission denied');

    const { id } = request.params as { id: string };
    const tax = await TaxRateModel.findOneAndUpdate(
      { _id: id, organizationId: new mongoose.Types.ObjectId(request.tenantId) },
      { $set: { isActive: false } },
      { new: true },
    );

    if (!tax) throw new NotFoundError('Tax rate');
    return reply.send({ data: { success: true } });
  });
}

/** Seed a default Kenyan VAT (16%) for a new organization */
export async function seedDefaultTaxRates(organizationId: string): Promise<void> {
  const existing = await TaxRateModel.countDocuments({
    organizationId: new mongoose.Types.ObjectId(organizationId),
  });
  if (existing > 0) return;

  await TaxRateModel.insertMany([
    {
      organizationId: new mongoose.Types.ObjectId(organizationId),
      name: 'VAT',
      code: 'VAT16',
      rate: 1600,        // 16%
      isInclusive: false,
      isDefault: true,
      isActive: true,
      appliesToServices: true,
    },
    {
      organizationId: new mongoose.Types.ObjectId(organizationId),
      name: 'Exempt',
      code: 'EXEMPT',
      rate: 0,
      isInclusive: false,
      isDefault: false,
      isActive: true,
      appliesToServices: true,
    },
  ]);
}
