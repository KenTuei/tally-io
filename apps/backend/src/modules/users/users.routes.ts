import type { FastifyInstance } from 'fastify';

export async function userRoutes(app: FastifyInstance): Promise<void> {
  app.get('/', async (_req, reply) => {
    return reply.send({ data: [], message: 'Module not yet implemented' });
  });
}
