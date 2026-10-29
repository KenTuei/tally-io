import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { config } from '../../../config/config.js';
import { ValidationError } from '../../../middleware/error.middleware.js';
import {
  initiateSTKPush,
  handleSTKCallback,
  querySTKStatus,
} from './mpesa.service.js';
import { v4 as uuidv4 } from 'uuid';

const stkPushSchema = z.object({
  phoneNumber: z.string().regex(/^2547\d{8}$|^2541\d{8}$/, 'Phone must be in 254XXXXXXXXX format'),
  saleId: z.string().min(1),
  amount: z.number().int().positive(), // KES cents — converted to shillings internally
  accountReference: z.string().max(12),
  transactionDesc: z.string().max(13).default('Sale payment'),
});

export async function mpesaRoutes(app: FastifyInstance): Promise<void> {
  // POST /api/v1/integrations/mpesa/stk-push
  app.post('/stk-push', async (request, reply) => {
    const body = stkPushSchema.parse(request.body);

    const result = await initiateSTKPush({
      phoneNumber: body.phoneNumber,
      amount: Math.round(body.amount / 100), // cents → whole KES shillings
      accountReference: body.accountReference,
      transactionDesc: body.transactionDesc,
      saleId: body.saleId,
      organizationId: request.tenantId,
      idempotencyKey: uuidv4(),
    });

    return reply.send({ data: result });
  });

  // POST /api/v1/integrations/mpesa/callback
  // This endpoint is called by Safaricom — NO auth middleware
  app.post('/callback', { config: { skipAuth: true } }, async (request, reply) => {
    // Validate the callback has expected shape
    const body = request.body as Record<string, unknown>;
    if (!body?.['Body']) {
      return reply.status(400).send({});
    }

    try {
      await handleSTKCallback(body as unknown as Parameters<typeof handleSTKCallback>[0]);
    } catch (err) {
      // Always return 200 to Safaricom — log the error server-side
      request.log.error(err, 'M-Pesa callback processing error');
    }

    // Safaricom expects exactly this response on success
    return reply.status(200).send({
      ResultCode: 0,
      ResultDesc: 'Confirmation received successfully',
    });
  });

  // GET /api/v1/integrations/mpesa/status/:checkoutRequestId
  app.get('/status/:checkoutRequestId', async (request, reply) => {
    const { checkoutRequestId } = request.params as { checkoutRequestId: string };
    const status = await querySTKStatus(checkoutRequestId);
    return reply.send({ data: { status } });
  });

  // GET /api/v1/integrations/mpesa/health
  app.get('/health', async (_request, reply) => {
    return reply.send({
      data: {
        configured: config.mpesa.isConfigured,
        environment: config.mpesa.environment,
        shortcode: config.mpesa.shortcode ?? null,
        callbackUrl: config.mpesa.callbackUrl ?? null,
      },
    });
  });
}
