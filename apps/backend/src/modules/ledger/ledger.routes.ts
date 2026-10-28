import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import mongoose from 'mongoose';
import { ForbiddenError } from '../../middleware/error.middleware.js';
import { can } from '../../middleware/tenant.middleware.js';
import { LedgerEventModel } from './ledger.models.js';

const querySchema = z.object({
  eventType: z.string().optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  branchId: z.string().optional(),
  actorId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export async function ledgerRoutes(app: FastifyInstance): Promise<void> {
  app.get('/events', async (request, reply) => {
    if (!can(request.userRole, 'audit:view')) {
      throw new ForbiddenError('You do not have permission to view the audit ledger');
    }

    const query = querySchema.parse(request.query);
    const orgId = new mongoose.Types.ObjectId(request.tenantId);

    const filter: Record<string, unknown> = { organizationId: orgId };
    if (query.eventType) filter['eventType'] = query.eventType;
    if (query.entityType) filter['entityType'] = query.entityType;
    if (query.entityId) filter['entityId'] = new mongoose.Types.ObjectId(query.entityId);
    if (query.branchId) filter['branchId'] = new mongoose.Types.ObjectId(query.branchId);
    if (query.actorId) filter['actorId'] = new mongoose.Types.ObjectId(query.actorId);
    if (query.from || query.to) {
      filter['serverTimestamp'] = {
        ...(query.from && { $gte: new Date(query.from) }),
        ...(query.to && { $lte: new Date(query.to) }),
      };
    }

    const skip = (query.page - 1) * query.limit;
    const [events, total] = await Promise.all([
      LedgerEventModel.find(filter)
        .sort({ serverTimestamp: -1 })
        .skip(skip)
        .limit(query.limit)
        .lean(),
      LedgerEventModel.countDocuments(filter),
    ]);

    return reply.send({
      data: events.map((e) => ({ ...e, id: e._id.toString() })),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    });
  });
}
