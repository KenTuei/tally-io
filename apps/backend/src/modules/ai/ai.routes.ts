import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ValidationError } from '../../middleware/error.middleware.js';
import { chat } from './ai.service.js';
import { config } from '../../config/config.js';

const chatSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string().min(1).max(2000),
    }),
  ).min(1).max(50),
});

export async function aiRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/v1/ai/status
  app.get('/status', async (_request, reply) => {
    return reply.send({
      data: {
        available: config.gemini.isConfigured,
        model: config.gemini.model,
        message: config.gemini.isConfigured
          ? 'AI assistant is ready'
          : 'AI assistant requires GEMINI_API_KEY configuration',
      },
    });
  });

  // POST /api/v1/ai/chat
  app.post('/chat', async (request, reply) => {
    const body = chatSchema.safeParse(request.body);
    if (!body.success) {
      throw new ValidationError('Invalid chat request');
    }

    const response = await chat(
      body.data.messages,
      request.tenantId,
      request.userRole,
    );

    return reply.send({ data: response });
  });

  // GET /api/v1/ai/suggestions — starter prompts
  app.get('/suggestions', async (_request, reply) => {
    return reply.send({
      data: [
        'What were my sales today?',
        'Which products are running low on stock?',
        'Show me the top 5 products this week.',
        'How much cash should be in the register right now?',
        'Compare this month\'s sales to last month.',
        'What payment methods are customers using most?',
        'Which products haven\'t sold this week?',
        'Summarize today\'s transactions.',
      ],
    });
  });
}
