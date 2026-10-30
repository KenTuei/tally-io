import type { FastifyInstance } from 'fastify';
import mongoose from 'mongoose';
import { z } from 'zod';
import { ForbiddenError } from '../../middleware/error.middleware.js';
import { can } from '../../middleware/tenant.middleware.js';
import { SupplierModel } from './suppliers.models.js';

const supplierSchema = z.object({
  name: z.string().trim().min(1).max(120),
  phone: z.string().max(30).optional(),
  email: z.string().email().optional().or(z.literal('')),
  notes: z.string().max(500).optional(),
});

export async function supplierRoutes(app: FastifyInstance): Promise<void> {
  app.get('/', async (request, reply) => {
    const suppliers = await SupplierModel.find({ organizationId: new mongoose.Types.ObjectId(request.tenantId), isActive: true }).sort({ name: 1 }).lean();
    return reply.send({ data: suppliers.map((supplier) => ({ ...supplier, id: supplier._id.toString() })) });
  });

  app.post('/', async (request, reply) => {
    if (!can(request.userRole, 'inventory:adjust')) throw new ForbiddenError('You do not have permission to add suppliers');
    const body = supplierSchema.parse(request.body);
    const supplier = await SupplierModel.create({ ...body, organizationId: new mongoose.Types.ObjectId(request.tenantId) });
    return reply.status(201).send({ data: { ...supplier.toObject(), id: supplier._id.toString() } });
  });
}
