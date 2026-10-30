import type { FastifyInstance } from 'fastify';
import mongoose from 'mongoose';
import { MembershipModel, OrganizationModel, UserModel } from '../auth/auth.models.js';
import { can } from '../../middleware/tenant.middleware.js';
import { ConflictError, ForbiddenError } from '../../middleware/error.middleware.js';
import { z } from 'zod';

export async function userRoutes(app: FastifyInstance): Promise<void> {
  app.get('/', async (request, reply) => {
    const organizationId = new mongoose.Types.ObjectId(request.tenantId);
    const [memberships, organization] = await Promise.all([
      MembershipModel.find({ organizationId, isActive: true }).sort({ createdAt: 1 }).lean(),
      OrganizationModel.findById(organizationId).select('onboardingData').lean(),
    ]);
    const users = await UserModel.find({ _id: { $in: memberships.map((membership) => membership.userId) } })
      .select('firstName lastName email phone isActive')
      .lean();
    const byId = new Map(users.map((user) => [user._id.toString(), user]));
    const staff = memberships.map((membership) => {
      const user = byId.get(membership.userId.toString());
      return {
        id: membership._id.toString(),
        userId: membership.userId.toString(),
        name: user ? `${user.firstName} ${user.lastName}` : 'Team member',
        email: user?.email ?? '',
        phone: user?.phone,
        role: membership.role,
        isActive: membership.isActive && (user?.isActive ?? false),
      };
    });
    const answers = organization?.onboardingData as { numberOfEmployees?: number; numberOfStaff?: number } | undefined;
    const plannedCount = Math.max(1, answers?.numberOfEmployees ?? answers?.numberOfStaff ?? staff.length);
    return reply.send({ data: { staff, plannedCount, filledCount: staff.length } });
  });

  app.post('/', async (request, reply) => {
    if (!can(request.userRole, 'user:manage')) throw new ForbiddenError('You do not have permission to manage staff');
    const body = z.object({ email: z.string().email(), role: z.enum(['admin', 'manager', 'cashier', 'salesperson', 'inventory_manager', 'accountant', 'auditor']).default('cashier') }).parse(request.body);
    const user = await UserModel.findOne({ email: body.email.toLowerCase().trim(), isActive: true }).select('firstName lastName email phone');
    if (!user) throw new ConflictError('There is no Tally.io account with this email yet. Ask them to create an account first.');
    const organizationId = new mongoose.Types.ObjectId(request.tenantId);
    const existing = await MembershipModel.findOne({ organizationId, userId: user._id });
    if (existing) {
      if (existing.isActive) throw new ConflictError('This person is already on your team.');
      existing.isActive = true;
      existing.role = body.role;
      await existing.save();
      return reply.send({ data: { id: existing._id.toString(), name: `${user.firstName} ${user.lastName}`, email: user.email, phone: user.phone, role: existing.role, isActive: true } });
    }
    const membership = await MembershipModel.create({ organizationId, userId: user._id, role: body.role, branchIds: [], isActive: true, invitedBy: new mongoose.Types.ObjectId(request.userId), acceptedAt: new Date() });
    return reply.status(201).send({ data: { id: membership._id.toString(), name: `${user.firstName} ${user.lastName}`, email: user.email, phone: user.phone, role: membership.role, isActive: true } });
  });
}
