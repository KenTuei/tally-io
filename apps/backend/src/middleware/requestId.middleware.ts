import type { FastifyReply, FastifyRequest } from 'fastify';

export function requestIdMiddleware(request: FastifyRequest, reply: FastifyReply, done: () => void): void {
  // Ensure request ID is in the response header for tracing
  void reply.header('X-Request-Id', request.id);
  done();
}
