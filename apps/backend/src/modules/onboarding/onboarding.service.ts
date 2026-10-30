/**
 * Onboarding service — questionnaire, plan recommendation, reminder scheduling.
 */
import mongoose from 'mongoose';
import { nanoid } from 'nanoid';
import { OrganizationModel, UserModel, MembershipModel } from '../auth/auth.models.js';
import { SubscriptionPlanModel, SubscriptionModel } from '../subscriptions/subscriptions.models.js';
import { OnboardingReminderModel } from '../email/email.models.js';
import { onboardingQueue } from '../../queues/queues.js';
import {
  sendEmail,
  canSendEmail,
  buildOnboardingReminder1Email,
  buildOnboardingReminder2Email,
  buildOnboardingReminder3Email,
} from '../email/email.service.js';
import { config } from '../../config/config.js';
import { logger } from '../../config/logger.js';

export interface OnboardingAnswers {
  // Step 1
  businessType: string;
  businessTypeCustom?: string;
  // Step 2
  businessName?: string;
  businessDescription?: string;
  country?: string;
  county?: string;
  address?: string;
  phone?: string;
  businessEmail?: string;
  currency?: string;
  mapLat?: number;
  mapLng?: number;
  // Step 3 — product businesses
  approximateProducts?: string;
  hasExpiryDates?: boolean;
  sharedStock?: boolean;
  sellsWholesale?: boolean;
  tracksSuppliers?: boolean;
  // Step 3 — service businesses
  services?: string[];
  numberOfStaff?: number;
  appointmentBased?: boolean;
  staffCommissions?: boolean;
  alsoProvidesProducts?: boolean;
  // Step 4
  numberOfBranches?: number;
  numberOfEmployees?: number;
  monthlySalesRange?: string;
  expectsMoreBranches?: boolean;
  // Step 5
  goals?: string[];
}

/**
 * Save questionnaire progress. Idempotent — can be called after each step.
 */
export async function saveOnboardingProgress(
  organizationId: string,
  step: number,
  answers: Partial<OnboardingAnswers>,
): Promise<void> {
  const updates: Record<string, unknown> = {
    onboardingStatus: step >= 5 ? 'complete' : 'in_progress',
    onboardingStep: step,
    onboardingData: answers,
  };

  if (answers.businessName?.trim()) {
    const name = answers.businessName.trim();
    const currentOrganization = await OrganizationModel.findById(organizationId)
      .select('name')
      .lean();
    if (currentOrganization?.name !== name) {
      updates.name = name;
      const slugBase = name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      updates.slug = `${slugBase || 'business'}-${nanoid(6)}`;
    }
  }
  if (answers.businessType) updates.businessType = answers.businessType;
  if (answers.country) updates.country = answers.country;
  if (answers.currency) updates.currency = answers.currency;
  if (answers.phone) updates.contactPhone = answers.phone;
  if (answers.businessEmail) updates.contactEmail = answers.businessEmail;
  if (answers.county) updates['address.county'] = answers.county;
  if (answers.address) updates['address.street'] = answers.address;

  await OrganizationModel.findByIdAndUpdate(organizationId, { $set: updates });

  // Cancel pending onboarding reminders when complete
  if (step >= 5) {
    await cancelOnboardingReminders(organizationId);
  }
}

/**
 * Recommend a subscription plan based on questionnaire answers.
 */
export async function recommendPlan(
  answers: OnboardingAnswers,
): Promise<{ planName: string; reason: string; alternatives: string[] }> {
  const plans = await SubscriptionPlanModel.find({ isActive: true }).sort({ sortOrder: 1 });

  if (plans.length === 0) {
    return {
      planName: 'starter',
      reason: 'Start with our Starter plan to manage your POS, sales, and inventory.',
      alternatives: [],
    };
  }

  const branches = answers.numberOfBranches ?? 1;
  const staff = answers.numberOfEmployees ?? 1;
  const needsMultiBranch = branches > 1 || !!answers.expectsMoreBranches;
  const needsAI = answers.goals?.includes('ai_recommendations');
  const isLarge = staff > 20 || answers.monthlySalesRange === 'above_1m';

  let recommended = plans[0]!;

  for (const plan of plans) {
    if (needsMultiBranch && plan.limits.maxBranches >= branches) {
      recommended = plan;
    }
    if (isLarge && plan.limits.maxUsers >= staff) {
      recommended = plan;
    }
  }

  const reasons: string[] = [];
  if (needsMultiBranch) reasons.push(`manages ${branches} branches`);
  if (needsAI) reasons.push('includes AI recommendations');
  if (isLarge) reasons.push(`supports ${staff}+ staff`);

  const reason =
    reasons.length > 0
      ? `The ${recommended.displayName} plan is a good fit for your business — it ${reasons.join(', ')}.`
      : `The ${recommended.displayName} plan covers everything you need to get started.`;

  const alternatives = plans
    .filter((p) => p._id.toString() !== recommended._id.toString())
    .map((p) => p.name);

  return { planName: recommended.name, reason, alternatives };
}

/**
 * Provision the initial subscription for a new organization.
 * Creates a trial subscription based on the recommended plan.
 */
export async function provisionTrialSubscription(
  organizationId: string,
  planName = 'starter',
): Promise<void> {
  const plan = await SubscriptionPlanModel.findOne({ name: planName, isActive: true });
  const fallbackPlan = await SubscriptionPlanModel.findOne({ isActive: true }).sort({
    sortOrder: 1,
  });

  const selectedPlan = plan ?? fallbackPlan;
  if (!selectedPlan) {
    logger.warn({ organizationId }, 'No subscription plan found, skipping trial provisioning');
    return;
  }

  const now = new Date();
  const trialEnd = new Date(
    now.getTime() + config.subscription.defaultTrialDays * 24 * 60 * 60 * 1000,
  );

  // Upsert — safe to call multiple times
  await SubscriptionModel.findOneAndUpdate(
    { organizationId: new mongoose.Types.ObjectId(organizationId) },
    {
      $setOnInsert: {
        organizationId: new mongoose.Types.ObjectId(organizationId),
        planId: selectedPlan._id,
        planName: selectedPlan.name,
        status: config.subscription.enforcement ? 'trialing' : 'dev_bypass',
        trialEndsAt: trialEnd,
        currentPeriodStart: now,
        currentPeriodEnd: trialEnd,
        limits: selectedPlan.limits,
        cancelAtPeriodEnd: false,
        bypassEnforcement: !config.subscription.enforcement,
        bypassReason: config.subscription.enforcement ? undefined : 'SUBSCRIPTION_ENFORCEMENT=false',
      },
    },
    { upsert: true, new: true },
  );
}

/**
 * Seed default subscription plans if none exist.
 * Called on server startup.
 */
export async function seedSubscriptionPlans(): Promise<void> {
  const count = await SubscriptionPlanModel.countDocuments();
  if (count > 0) return;

  const plans = [
    {
      name: 'starter',
      displayName: 'Starter',
      description: 'Essential POS for a single-branch business',
      price: 99900, // KES 999/month
      currency: 'KES',
      interval: 'month' as const,
      limits: {
        maxBranches: 1,
        maxUsers: 3,
        maxRegisters: 2,
        features: ['pos', 'products', 'inventory', 'sales', 'basic_reports'],
      },
      isActive: true,
      sortOrder: 0,
    },
    {
      name: 'growth',
      displayName: 'Growth',
      description: 'Advanced inventory, AI recommendations, and customer management',
      price: 249900, // KES 2499/month
      currency: 'KES',
      interval: 'month' as const,
      limits: {
        maxBranches: 2,
        maxUsers: 10,
        maxRegisters: 5,
        features: [
          'pos', 'products', 'inventory', 'sales', 'advanced_reports',
          'customers', 'expenses', 'ai_assistant', 'expiry_alerts',
          'email_automation',
        ],
      },
      isActive: true,
      sortOrder: 1,
    },
    {
      name: 'multi_branch',
      displayName: 'Multi-Branch',
      description: 'Centralized management for multiple stores',
      price: 499900, // KES 4999/month
      currency: 'KES',
      interval: 'month' as const,
      limits: {
        maxBranches: 10,
        maxUsers: 30,
        maxRegisters: 20,
        features: [
          'pos', 'products', 'inventory', 'sales', 'advanced_reports',
          'customers', 'expenses', 'ai_assistant', 'expiry_alerts',
          'email_automation', 'multi_branch', 'stock_transfers',
          'branch_analytics', 'referrals',
        ],
      },
      isActive: true,
      sortOrder: 2,
    },
    {
      name: 'enterprise',
      displayName: 'Enterprise',
      description: 'Large-scale operations with custom limits',
      price: 999900, // KES 9999/month
      currency: 'KES',
      interval: 'month' as const,
      limits: {
        maxBranches: 9999,
        maxUsers: 9999,
        maxRegisters: 9999,
        features: ['all'],
      },
      isActive: true,
      sortOrder: 3,
    },
  ];

  await SubscriptionPlanModel.insertMany(plans);
  logger.info('Seeded default subscription plans');
}

/**
 * Schedule onboarding reminder emails for a new user.
 */
export async function scheduleOnboardingReminders(
  userId: string,
  organizationId: string,
): Promise<void> {
  const DELAYS = {
    incomplete_1: 3 * 60 * 60 * 1000,        // 3 hours
    incomplete_2: 24 * 60 * 60 * 1000,        // 24 hours
    incomplete_3: 3 * 24 * 60 * 60 * 1000,   // 3 days
  } as const;

  for (const [emailType, delay] of Object.entries(DELAYS)) {
    const scheduledAt = new Date(Date.now() + delay);
    const reminder = await OnboardingReminderModel.create({
      userId: new mongoose.Types.ObjectId(userId),
      organizationId: new mongoose.Types.ObjectId(organizationId),
      emailType,
      scheduledAt,
      cancelled: false,
    });

    await onboardingQueue.add(
      emailType,
      {
        userId,
        organizationId,
        emailType: emailType as 'incomplete_1' | 'incomplete_2' | 'incomplete_3',
        reminderId: reminder._id.toString(),
      },
      { delay, jobId: `onboarding-${userId}-${emailType}` },
    );
  }
}

/**
 * Cancel pending reminders (when onboarding completes).
 */
export async function cancelOnboardingReminders(organizationId: string): Promise<void> {
  await OnboardingReminderModel.updateMany(
    {
      organizationId: new mongoose.Types.ObjectId(organizationId),
      sentAt: null,
      cancelled: false,
    },
    { $set: { cancelled: true, cancelReason: 'onboarding_completed' } },
  );
}

/**
 * Process an onboarding reminder job (called by BullMQ worker).
 */
export async function processOnboardingReminder(data: {
  userId: string;
  organizationId: string;
  emailType: string;
  reminderId: string;
}): Promise<void> {
  // Recheck: has onboarding been completed since the job was scheduled?
  const org = await OrganizationModel.findById(data.organizationId);
  if (!org || org.onboardingStatus === 'complete') {
    await OnboardingReminderModel.findByIdAndUpdate(data.reminderId, {
      $set: { cancelled: true, cancelReason: 'onboarding_completed' },
    });
    return;
  }

  const reminder = await OnboardingReminderModel.findById(data.reminderId);
  if (!reminder || reminder.cancelled || reminder.sentAt) return;

  const user = await UserModel.findById(data.userId);
  if (!user || !user.isActive) return;

  const resumeUrl = `${config.frontendUrl}/onboarding?org=${data.organizationId}`;
  const businessType = (org.onboardingData as Record<string, unknown> | undefined)?.['businessType'] as string | undefined ?? 'retail';

  const alreadySent = !(await canSendEmail(user.email, data.emailType, 20));
  if (alreadySent) return;

  let emailData: { subject: string; html: string; text: string };

  switch (data.emailType) {
    case 'incomplete_1':
      emailData = buildOnboardingReminder1Email({ firstName: user.firstName, resumeUrl });
      break;
    case 'incomplete_2':
      emailData = buildOnboardingReminder2Email({
        firstName: user.firstName,
        businessType,
        resumeUrl,
      });
      break;
    case 'incomplete_3':
      emailData = buildOnboardingReminder3Email({ firstName: user.firstName, resumeUrl });
      break;
    default:
      return;
  }

  await sendEmail({
    to: user.email,
    ...emailData,
    template: data.emailType,
    userId: data.userId,
    organizationId: data.organizationId,
    isTransactional: true,
  });

  await reminder.updateOne({ $set: { sentAt: new Date() } });
}
