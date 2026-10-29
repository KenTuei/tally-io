import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ValidationError } from '../../middleware/error.middleware.js';
import {
  saveOnboardingProgress,
  recommendPlan,
  provisionTrialSubscription,
} from './onboarding.service.js';
import { OrganizationModel } from '../auth/auth.models.js';
import { SubscriptionPlanModel, SubscriptionModel } from '../subscriptions/subscriptions.models.js';
import mongoose from 'mongoose';

const progressSchema = z.object({
  step: z.number().int().min(0).max(5),
  answers: z.record(z.unknown()),
});

const recommendSchema = z.object({
  answers: z.object({
    businessType: z.string(),
    numberOfBranches: z.number().optional(),
    numberOfEmployees: z.number().optional(),
    monthlySalesRange: z.string().optional(),
    expectsMoreBranches: z.boolean().optional(),
    goals: z.array(z.string()).optional(),
  }),
});

export async function onboardingRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/v1/onboarding/status
  app.get('/status', async (request, reply) => {
    const org = await OrganizationModel.findById(request.tenantId).lean();
    return reply.send({
      data: {
        status: org?.onboardingStatus ?? 'pending',
        step: org?.onboardingStep ?? 0,
        answers: org?.onboardingData ?? {},
      },
    });
  });

  // PATCH /api/v1/onboarding/progress
  app.patch('/progress', async (request, reply) => {
    const body = progressSchema.safeParse(request.body);
    if (!body.success) throw new ValidationError('Invalid onboarding data');

    await saveOnboardingProgress(request.tenantId, body.data.step, body.data.answers);
    return reply.send({ data: { step: body.data.step, saved: true } });
  });

  // POST /api/v1/onboarding/complete
  app.post('/complete', async (request, reply) => {
    const body = progressSchema.safeParse(request.body);
    if (!body.success) throw new ValidationError('Invalid onboarding data');

    await saveOnboardingProgress(request.tenantId, 5, body.data.answers);
    return reply.send({ data: { complete: true } });
  });

  // POST /api/v1/onboarding/recommend-plan
  app.post('/recommend-plan', async (request, reply) => {
    const body = recommendSchema.safeParse(request.body);
    if (!body.success) throw new ValidationError('Invalid answers');

    const recommendation = await recommendPlan(body.data.answers);
    return reply.send({ data: recommendation });
  });

  // GET /api/v1/onboarding/plans
  app.get('/plans', async (_request, reply) => {
    const plans = await SubscriptionPlanModel.find({ isActive: true })
      .sort({ sortOrder: 1 })
      .lean();
    return reply.send({ data: plans.map((p) => ({ ...p, id: p._id.toString() })) });
  });

  // POST /api/v1/onboarding/select-plan
  app.post('/select-plan', async (request, reply) => {
    const body = (request.body as { planName?: string }) ?? {};
    const planName = body.planName ?? 'starter';

    await provisionTrialSubscription(request.tenantId, planName);

    const subscription = await SubscriptionModel.findOne({
      organizationId: new mongoose.Types.ObjectId(request.tenantId),
    }).lean();

    return reply.send({
      data: {
        plan: subscription?.planName,
        status: subscription?.status,
        trialEndsAt: subscription?.trialEndsAt,
        bypassEnforcement: subscription?.bypassEnforcement,
      },
    });
  });
}
