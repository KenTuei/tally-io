import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { config } from '../config/config.js';
import { connectDatabase } from '../config/database.js';
import { healthRoutes } from './health.routes.js';
import { authRoutes } from '../modules/auth/auth.routes.js';
import { userRoutes } from '../modules/users/users.routes.js';
import { productRoutes } from '../modules/products/products.routes.js';
import { inventoryRoutes } from '../modules/inventory/inventory.routes.js';
import { saleRoutes } from '../modules/sales/sales.routes.js';
import { syncRoutes } from '../modules/synchronization/sync.routes.js';
import { ledgerRoutes } from '../modules/ledger/ledger.routes.js';
import { reportRoutes } from '../modules/reporting/reporting.routes.js';
import { mpesaRoutes } from '../modules/integrations/mpesa/mpesa.routes.js';
import { aiRoutes } from '../modules/ai/ai.routes.js';
import { branchRoutes } from '../modules/branches/branches.routes.js';
import { customerRoutes } from '../modules/customers/customers.routes.js';
import { expenseRoutes } from '../modules/expenses/expenses.routes.js';
import { onboardingRoutes } from '../modules/onboarding/onboarding.routes.js';
import { googleAuthRoutes } from '../modules/auth/google.routes.js';
import { tenantMiddleware } from '../middleware/tenant.middleware.js';
import { errorHandler } from '../middleware/error.middleware.js';
import { requestIdMiddleware } from '../middleware/requestId.middleware.js';
import { seedSubscriptionPlans } from '../modules/onboarding/onboarding.service.js';
import { startWorkers } from '../queues/queues.js';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: { level: config.logging.level },
    trustProxy: true,
    genReqId: () => crypto.randomUUID(),
  });

  // ----- Plugins -------------------------------------------------------
  await app.register(helmet, {
    contentSecurityPolicy: config.isProd,
    crossOriginEmbedderPolicy: false,
  });

  await app.register(cors, {
    origin: config.isDev
      ? [config.frontendUrl, 'http://localhost:5173', 'http://localhost:1420']
      : [config.frontendUrl],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  await app.register(rateLimit, {
    max: 300,
    timeWindow: '1 minute',
    keyGenerator: (req) => (req.headers['x-user-id'] as string) ?? req.ip,
  });

  // ----- API Docs (dev only) -------------------------------------------
  if (!config.isProd) {
    await app.register(swagger, {
      openapi: {
        info: { title: 'Tally.io API', description: 'Tally.io Business Management API', version: '1.0.0' },
        components: {
          securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
        },
        security: [{ bearerAuth: [] }],
      },
    });
    await app.register(swaggerUi, { routePrefix: '/api/docs' });
  }

  // ----- Global middleware ---------------------------------------------
  app.addHook('onRequest', requestIdMiddleware);

  // ----- Database + seeding --------------------------------------------
  await connectDatabase();
  await seedSubscriptionPlans();

  // ----- Start background workers (gracefully handles Redis unavailable) ---
  try {
    startWorkers();
  } catch (err) {
    app.log.warn({ err }, 'BullMQ workers failed to start — Redis may be unavailable');
  }

  // ----- Routes --------------------------------------------------------
  const API = '/api/v1';

  await app.register(healthRoutes, { prefix: `${API}/health` });

  // Public auth routes (no tenant middleware)
  await app.register(authRoutes, { prefix: `${API}/auth` });
  await app.register(googleAuthRoutes, { prefix: `${API}/auth` });

  // Authenticated + tenant-scoped routes
  await app.register(
    async (protected_) => {
      protected_.addHook('onRequest', tenantMiddleware);

      await protected_.register(userRoutes, { prefix: '/users' });
      await protected_.register(productRoutes, { prefix: '/products' });
      await protected_.register(inventoryRoutes, { prefix: '/inventory' });
      await protected_.register(saleRoutes, { prefix: '/sales' });
      await protected_.register(syncRoutes, { prefix: '/sync' });
      await protected_.register(ledgerRoutes, { prefix: '/ledger' });
      await protected_.register(reportRoutes, { prefix: '/reports' });
      await protected_.register(branchRoutes, { prefix: '/branches' });
      await protected_.register(customerRoutes, { prefix: '/customers' });
      await protected_.register(expenseRoutes, { prefix: '/expenses' });
      await protected_.register(onboardingRoutes, { prefix: '/onboarding' });
      await protected_.register(aiRoutes, { prefix: '/ai' });

      // Integrations
      await protected_.register(
        async (intRoutes) => {
          await intRoutes.register(mpesaRoutes, { prefix: '/mpesa' });
        },
        { prefix: '/integrations' },
      );
    },
    { prefix: API },
  );

  // ----- Error + not-found handlers ------------------------------------
  app.setErrorHandler(errorHandler);
  app.setNotFoundHandler((_req, reply) => {
    void reply.status(404).send({
      error: { code: 'NOT_FOUND', message: 'The requested resource was not found' },
    });
  });

  return app;
}
