import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('0.0.0.0'),
  APP_BASE_URL: z.string().url().default('http://localhost:3000'),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),

  // MongoDB
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  MONGODB_DB_NAME: z.string().default('tally_dev'),

  // Auth
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  REFRESH_TOKEN_SECRET: z.string().min(32, 'REFRESH_TOKEN_SECRET must be at least 32 characters'),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default('7d'),

  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),

  // Google OAuth
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALLBACK_URL: z
    .string()
    .url()
    .default('http://localhost:3000/api/v1/auth/google/callback'),

  // M-Pesa (optional in dev)
  MPESA_ENVIRONMENT: z.enum(['sandbox', 'production']).default('sandbox'),
  MPESA_CONSUMER_KEY: z.string().optional(),
  MPESA_CONSUMER_SECRET: z.string().optional(),
  MPESA_SHORTCODE: z.string().optional(),
  MPESA_PASSKEY: z.string().optional(),
  MPESA_CALLBACK_URL: z.string().url().optional(),

  // Gemini AI (optional in dev)
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-2.0-flash'),

  // Email — provider: resend | sendgrid | console (dev)
  EMAIL_PROVIDER: z.enum(['resend', 'sendgrid', 'console']).default('console'),
  EMAIL_FROM: z.string().default('noreply@tally.io'),
  EMAIL_FROM_NAME: z.string().default('Tally.io'),
  RESEND_API_KEY: z.string().optional(),
  SENDGRID_API_KEY: z.string().optional(),

  // Subscription enforcement
  SUBSCRIPTION_ENFORCEMENT: z
    .string()
    .transform((v) => v !== 'false')
    .default('true'),
  DEFAULT_TRIAL_DAYS: z.coerce.number().default(14),

  // Maps (for branch map view)
  MAPS_PROVIDER: z.enum(['google', 'mapbox', 'none']).default('none'),
  GOOGLE_MAPS_API_KEY: z.string().optional(),  // server-side only

  // Logging
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  LOG_PRETTY: z
    .string()
    .transform((v) => v === 'true')
    .default('false'),
});

function validateConfig() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const missing = result.error.errors
      .map((e) => `  ${e.path.join('.')}: ${e.message}`)
      .join('\n');
    console.error('❌ Invalid environment configuration:\n' + missing);
    console.error('\nCopy .env.example to .env and fill in the required values.');
    process.exit(1);
  }

  return result.data;
}

const env = validateConfig();

export const config = {
  nodeEnv: env.NODE_ENV,
  port: env.PORT,
  host: env.HOST,
  appBaseUrl: env.APP_BASE_URL,
  frontendUrl: env.FRONTEND_URL,

  mongodb: {
    uri: env.MONGODB_URI,
    dbName: env.MONGODB_DB_NAME,
  },

  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
    refreshSecret: env.REFRESH_TOKEN_SECRET,
    refreshExpiresIn: env.REFRESH_TOKEN_EXPIRES_IN,
  },

  redis: {
    url: env.REDIS_URL,
  },

  google: {
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    callbackUrl: env.GOOGLE_CALLBACK_URL,
    isConfigured: !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
  },

  mpesa: {
    environment: env.MPESA_ENVIRONMENT,
    consumerKey: env.MPESA_CONSUMER_KEY,
    consumerSecret: env.MPESA_CONSUMER_SECRET,
    shortcode: env.MPESA_SHORTCODE,
    passkey: env.MPESA_PASSKEY,
    callbackUrl: env.MPESA_CALLBACK_URL,
    isConfigured: !!(
      env.MPESA_CONSUMER_KEY &&
      env.MPESA_CONSUMER_SECRET &&
      env.MPESA_SHORTCODE &&
      env.MPESA_PASSKEY
    ),
  },

  gemini: {
    apiKey: env.GEMINI_API_KEY,
    model: env.GEMINI_MODEL,
    isConfigured: !!env.GEMINI_API_KEY,
  },

  email: {
    provider: env.EMAIL_PROVIDER,
    from: env.EMAIL_FROM,
    fromName: env.EMAIL_FROM_NAME,
    resendApiKey: env.RESEND_API_KEY,
    sendgridApiKey: env.SENDGRID_API_KEY,
    isConfigured: !!(env.RESEND_API_KEY || env.SENDGRID_API_KEY),
  },

  subscription: {
    enforcement: env.SUBSCRIPTION_ENFORCEMENT,
    defaultTrialDays: env.DEFAULT_TRIAL_DAYS,
  },

  maps: {
    provider: env.MAPS_PROVIDER,
    googleApiKey: env.GOOGLE_MAPS_API_KEY,
  },

  logging: {
    level: env.LOG_LEVEL,
    pretty: env.LOG_PRETTY,
  },

  isDev: env.NODE_ENV === 'development',
  isTest: env.NODE_ENV === 'test',
  isProd: env.NODE_ENV === 'production',
} as const;
