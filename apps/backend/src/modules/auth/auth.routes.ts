import type { FastifyInstance } from 'fastify';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  passwordResetRequestSchema,
  passwordResetConfirmSchema,
} from './auth.schemas.js';
import * as authService from './auth.service.js';
import { ValidationError } from '../../middleware/error.middleware.js';
import { tenantMiddleware } from '../../middleware/tenant.middleware.js';

export async function authRoutes(app: FastifyInstance): Promise<void> {
  // POST /api/v1/auth/register
  app.post('/register', async (request, reply) => {
    const result = registerSchema.safeParse(request.body);
    if (!result.success) {
      throw new ValidationError('Invalid registration data', {
        errors: result.error.errors,
      });
    }

    const response = await authService.register(result.data);
    return reply.status(201).send({ data: response });
  });

  // POST /api/v1/auth/login
  app.post('/login', async (request, reply) => {
    const result = loginSchema.safeParse(request.body);
    if (!result.success) {
      throw new ValidationError('Invalid login data');
    }

    const response = await authService.login(result.data);
    return reply.send({ data: response });
  });

  // POST /api/v1/auth/refresh
  app.post('/refresh', async (request, reply) => {
    const result = refreshTokenSchema.safeParse(request.body);
    if (!result.success) {
      throw new ValidationError('Invalid refresh token request');
    }

    const response = await authService.refreshTokens(result.data);
    return reply.send({ data: response });
  });

  // POST /api/v1/auth/logout
  // Requires authentication
  app.post(
    '/logout',
    { preHandler: [tenantMiddleware] },
    async (request, reply) => {
      const body = request.body as { allDevices?: boolean } | undefined;
      await authService.logout(
        request.userId,
        request.deviceId,
        body?.allDevices ?? false,
      );
      return reply.send({ data: { success: true } });
    },
  );

  // POST /api/v1/auth/password-reset
  app.post('/password-reset', async (request, reply) => {
    const result = passwordResetRequestSchema.safeParse(request.body);
    if (!result.success) {
      throw new ValidationError('Invalid password reset request');
    }

    const response = await authService.requestPasswordReset(result.data.email);
    return reply.send({ data: response });
  });

  // POST /api/v1/auth/password-reset/confirm
  app.post('/password-reset/confirm', async (request, reply) => {
    const result = passwordResetConfirmSchema.safeParse(request.body);
    if (!result.success) {
      throw new ValidationError('Invalid password reset confirmation');
    }

    const response = await authService.confirmPasswordReset(
      result.data.token,
      result.data.newPassword,
    );
    return reply.send({ data: response });
  });

  // POST /api/v1/auth/verify-email
  app.post('/verify-email', async (request, reply) => {
    const body = request.body as { email?: string; code?: string };
    if (!body.email || !body.code) {
      throw new ValidationError('Email and verification code are required');
    }

    const { UserModel } = await import('./auth.models.js');

    const user = await UserModel.findOne({ email: body.email.toLowerCase() })
      .select('+emailVerificationCode +emailVerificationExpiry');

    // Use same error for not-found and wrong code to prevent enumeration
    const invalid = () => { throw new ValidationError('Invalid or expired verification code'); };

    if (!user) return invalid();
    if (user.emailVerified) return reply.send({ data: { verified: true } });
    if (!user.emailVerificationCode) return invalid();
    if (new Date() > (user.emailVerificationExpiry ?? new Date(0))) return invalid();
    if (user.emailVerificationCode !== body.code) return invalid();

    await UserModel.findByIdAndUpdate(user._id, {
      $set: { emailVerified: true },
      $unset: { emailVerificationCode: 1, emailVerificationExpiry: 1 },
    });

    return reply.send({ data: { verified: true } });
  });
}