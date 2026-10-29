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
import { tenantMiddleware } from '../middleware/tenant.middleware.js';
import { errorHandler } from '../middleware/error.middleware.js';
import { requestIdMiddleware } from '../middleware/requestId.middleware.js';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: config.logging.level,
    },
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
    keyGenerator: (req) => {
      // Rate limit by user ID if authenticated, otherwise by IP
      return (req.headers['x-user-id'] as string) ?? req.ip;
    },
  });

  // ----- API Documentation (dev only) ----------------------------------
  if (!config.isProd) {
    await app.register(swagger, {
      openapi: {
        info: {
          title: 'Tally.io API',
          description: 'Tally.io Point of Sale and Business Management API',
          version: '1.0.0',
        },
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT',
            },
          },
        },
        security: [{ bearerAuth: [] }],
      },
    });

    await app.register(swaggerUi, {
      routePrefix: '/api/docs',
    });
  }

  // ----- Global middleware ---------------------------------------------
  app.addHook('onRequest', requestIdMiddleware);

  // ----- Connect database ----------------------------------------------
  await connectDatabase();

  // ----- Routes --------------------------------------------------------
  const API_PREFIX = '/api/v1';

  await app.register(healthRoutes, { prefix: `${API_PREFIX}/health` });

  // Public auth routes (no tenant middleware)
  await app.register(authRoutes, { prefix: `${API_PREFIX}/auth` });

  // Authenticated routes — tenant middleware applied per route group
  await app.register(
    async (protectedRoutes) => {
      protectedRoutes.addHook('onRequest', tenantMiddleware);

      await protectedRoutes.register(userRoutes, { prefix: '/users' });
      await protectedRoutes.register(productRoutes, { prefix: '/products' });
      await protectedRoutes.register(inventoryRoutes, { prefix: '/inventory' });
      await protectedRoutes.register(saleRoutes, { prefix: '/sales' });
      await protectedRoutes.register(syncRoutes, { prefix: '/sync' });
      await protectedRoutes.register(ledgerRoutes, { prefix: '/ledger' });
      await protectedRoutes.register(reportRoutes, { prefix: '/reports' });

      // Integrations — M-Pesa callback is public (no tenant middleware), STK push is protected
      await protectedRoutes.register(
        async (intRoutes) => {
          await intRoutes.register(mpesaRoutes, { prefix: '/mpesa' });
        },
        { prefix: '/integrations' },
      );

      // AI Assistant
      await protectedRoutes.register(aiRoutes, { prefix: '/ai' });
    },
    { prefix: API_PREFIX },
  );

  // ----- Error handler -------------------------------------------------
  app.setErrorHandler(errorHandler);

  // ----- Not found handler --------------------------------------------
  app.setNotFoundHandler((_req, reply) => {
    void reply.status(404).send({
      error: {
        code: 'NOT_FOUND',
        message: 'The requested resource was not found',
      },
    });
  });

  return app;
}
