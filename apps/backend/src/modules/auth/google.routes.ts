import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ValidationError } from '../../middleware/error.middleware.js';
import { signInWithGoogle, verifyGoogleToken } from './google.service.js';
import { config } from '../../config/config.js';

const googleSignInSchema = z.object({
  idToken: z.string().min(1, 'Google ID token is required'),
  deviceId: z.string().uuid(),
  deviceType: z.enum(['web', 'desktop', 'mobile']).default('web'),
});

export async function googleAuthRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/v1/auth/google/status
  app.get('/google/status', async (_request, reply) => {
    return reply.send({
      data: {
        available: config.google.isConfigured,
        message: config.google.isConfigured
          ? 'Google Sign-In is configured'
          : 'Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to enable Google Sign-In',
      },
    });
  });

  // POST /api/v1/auth/google
  // The frontend performs Google OAuth via the Google SDK (client-side popup/redirect),
  // receives an ID token, then sends it here for server-side verification.
  app.post('/google', async (request, reply) => {
    const result = googleSignInSchema.safeParse(request.body);
    if (!result.success) {
      throw new ValidationError('Invalid Google sign-in request');
    }

    const { idToken, deviceId, deviceType } = result.data;

    // Verify the token server-side — never trust client-provided user data
    const googlePayload = await verifyGoogleToken(idToken);

    const response = await signInWithGoogle(googlePayload, deviceId, deviceType);

    return reply.send({ data: response });
  });
}
