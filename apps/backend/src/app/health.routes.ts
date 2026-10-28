import type { FastifyInstance } from 'fastify';
import mongoose from 'mongoose';

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/', async (_req, reply) => {
    const dbState = mongoose.connection.readyState;
    const dbStatus = dbState === 1 ? 'connected' : dbState === 2 ? 'connecting' : 'disconnected';

    const healthy = dbState === 1;

    return reply.status(healthy ? 200 : 503).send({
      status: healthy ? 'ok' : 'degraded',
      version: process.env['npm_package_version'] ?? '0.1.0',
      environment: process.env['NODE_ENV'] ?? 'development',
      timestamp: new Date().toISOString(),
      services: {
        database: {
          status: dbStatus,
          healthy: dbState === 1,
        },
      },
    });
  });

  app.get('/ready', async (_req, reply) => {
    const isReady = mongoose.connection.readyState === 1;
    return reply.status(isReady ? 200 : 503).send({
      ready: isReady,
    });
  });

  app.get('/live', async (_req, reply) => {
    return reply.status(200).send({ alive: true });
  });
}
