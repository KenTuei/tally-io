import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password too long'),
  firstName: z.string().min(1).max(50).trim(),
  lastName: z.string().min(1).max(50).trim(),
  phone: z.string().optional(),
  organizationName: z.string().min(1).max(100).trim(),
  businessType: z.enum([
    'retail',
    'supermarket',
    'wholesale',
    'distribution',
    'restaurant',
    'cafe',
    'hardware',
    'agrovet',
    'pharmacy',
    'salon',
    'service',
    'other',
  ]),
  country: z.string().length(2, 'Country must be ISO 3166-1 alpha-2').default('KE'),
  currency: z.string().length(3, 'Currency must be ISO 4217').default('KES'),
  timezone: z.string().default('Africa/Nairobi'),
  deviceId: z.string().uuid(),
  deviceType: z.enum(['web', 'desktop', 'mobile']).default('web'),
});

export const loginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1),
  deviceId: z.string().uuid(),
  deviceType: z.enum(['web', 'desktop', 'mobile']).default('web'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
  deviceId: z.string().uuid(),
});

export const passwordResetRequestSchema = z.object({
  email: z.string().email().toLowerCase(),
});

export const passwordResetConfirmSchema = z.object({
  token: z.string().min(1),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(72),
});

export const logoutSchema = z.object({
  refreshToken: z.string().optional(),
  allDevices: z.boolean().default(false),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestSchema>;
export type PasswordResetConfirmInput = z.infer<typeof passwordResetConfirmSchema>;
export type LogoutInput = z.infer<typeof logoutSchema>;
