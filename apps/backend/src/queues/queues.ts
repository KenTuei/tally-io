/**
 * BullMQ queue definitions.
 * All queues share the same Redis connection from config.
 */
import { Queue, Worker, type Job } from 'bullmq';
import IORedis from 'ioredis';
import { config } from '../config/config.js';
import { logger } from '../config/logger.js';

// ── Shared Redis connection ──────────────────────────────────────────────────
export const redisConnection = new IORedis(config.redis.url, {
  maxRetriesPerRequest: null, // required by BullMQ
  enableReadyCheck: false,
  lazyConnect: true,
});

redisConnection.on('error', (err) => {
  logger.warn({ err: err.message }, 'Redis connection error (queues will be unavailable)');
});

// ── Queue names ──────────────────────────────────────────────────────────────
export const QUEUE_NAMES = {
  EMAIL: 'email',
  ONBOARDING_REMINDERS: 'onboarding-reminders',
  PROJECTION_UPDATES: 'projection-updates',
  NOTIFICATIONS: 'notifications',
} as const;

// ── Email queue ──────────────────────────────────────────────────────────────
export interface EmailJobData {
  to: string;
  subject: string;
  html: string;
  text: string;
  template: string;
  userId?: string;
  organizationId?: string;
  isTransactional?: boolean;
}

export const emailQueue = new Queue<EmailJobData>(QUEUE_NAMES.EMAIL, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});

// ── Onboarding reminder queue ────────────────────────────────────────────────
export interface OnboardingReminderJobData {
  userId: string;
  organizationId: string;
  emailType: 'incomplete_1' | 'incomplete_2' | 'incomplete_3';
  reminderId: string;
}

export const onboardingQueue = new Queue<OnboardingReminderJobData>(
  QUEUE_NAMES.ONBOARDING_REMINDERS,
  {
    connection: redisConnection,
    defaultJobOptions: {
      attempts: 2,
      backoff: { type: 'fixed', delay: 60000 },
      removeOnComplete: 50,
      removeOnFail: 100,
    },
  },
);

// ── Workers ───────────────────────────────────────────────────────────────────

let emailWorker: Worker | null = null;
let onboardingWorker: Worker | null = null;

export function startWorkers(): void {
  // Email worker
  emailWorker = new Worker<EmailJobData>(
    QUEUE_NAMES.EMAIL,
    async (job: Job<EmailJobData>) => {
      const { sendEmail } = await import('../modules/email/email.service.js');
      await sendEmail(job.data);
    },
    { connection: redisConnection, concurrency: 3 },
  );

  emailWorker.on('completed', (job) => {
    logger.debug({ template: job.data.template, to: job.data.to }, 'Email job completed');
  });

  emailWorker.on('failed', (job, err) => {
    logger.error(
      { jobId: job?.id, template: job?.data.template, err: err.message },
      'Email job failed',
    );
  });

  // Onboarding reminder worker
  onboardingWorker = new Worker<OnboardingReminderJobData>(
    QUEUE_NAMES.ONBOARDING_REMINDERS,
    async (job: Job<OnboardingReminderJobData>) => {
      const { processOnboardingReminder } = await import(
        '../modules/onboarding/onboarding.service.js'
      );
      await processOnboardingReminder(job.data);
    },
    { connection: redisConnection, concurrency: 2 },
  );

  onboardingWorker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err: err.message }, 'Onboarding reminder job failed');
  });

  logger.info('BullMQ workers started');
}

export async function stopWorkers(): Promise<void> {
  await Promise.all([emailWorker?.close(), onboardingWorker?.close()]);
  await redisConnection.quit();
  logger.info('BullMQ workers stopped');
}
