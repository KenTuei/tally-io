import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { api, ApiError } from '../../lib/api';
import { getOrCreateDeviceId } from '../../lib/utils';
import type { LoginResponse } from '@tally/shared-types';

const registerSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  organizationName: z.string().min(1, 'Business name is required').max(100),
  businessType: z.enum([
    'retail', 'supermarket', 'wholesale', 'distribution',
    'restaurant', 'cafe', 'hardware', 'agrovet',
    'pharmacy', 'salon', 'service', 'other',
  ], { required_error: 'Please select a business type' }),
});

type RegisterForm = z.infer<typeof registerSchema>;

const businessTypes = [
  { value: 'retail', label: 'Retail Shop' },
  { value: 'supermarket', label: 'Supermarket' },
  { value: 'wholesale', label: 'Wholesale' },
  { value: 'distribution', label: 'Distribution' },
  { value: 'restaurant', label: 'Restaurant / Café' },
  { value: 'hardware', label: 'Hardware Shop' },
  { value: 'agrovet', label: 'Agrovet' },
  { value: 'pharmacy', label: 'Pharmacy' },
  { value: 'salon', label: 'Salon / Beauty' },
  { value: 'service', label: 'Service Business' },
  { value: 'other', label: 'Other' },
];

export function RegisterPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterForm) => {
    setError(null);
    try {
      const response = await api.post<LoginResponse>('/auth/register', {
        ...data,
        country: 'KE',
        currency: 'KES',
        timezone: 'Africa/Nairobi',
        deviceId: getOrCreateDeviceId(),
        deviceType: 'web',
      });

      setAuth({
        user: response.user,
        organization: response.organization,
        accessToken: response.tokens.accessToken,
        refreshToken: response.tokens.refreshToken,
      });

      navigate('/');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    }
  };

  const fieldClass =
    'w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors';
  const errorClass = 'mt-1 text-xs text-destructive';

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mb-4">
            <span className="text-primary-foreground font-bold text-xl">T</span>
          </div>
          <h1 className="text-2xl font-bold">Create your account</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Start with a free trial — no credit card required
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-sm text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {/* Name */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium mb-1">
                First name
              </label>
              <input
                id="firstName"
                type="text"
                autoComplete="given-name"
                className={fieldClass}
                {...register('firstName')}
              />
              {errors.firstName && <p className={errorClass}>{errors.firstName.message}</p>}
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium mb-1">
                Last name
              </label>
              <input
                id="lastName"
                type="text"
                autoComplete="family-name"
                className={fieldClass}
                {...register('lastName')}
              />
              {errors.lastName && <p className={errorClass}>{errors.lastName.message}</p>}
            </div>
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              Email address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              className={fieldClass}
              {...register('email')}
            />
            {errors.email && <p className={errorClass}>{errors.email.message}</p>}
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="At least 8 characters"
              className={fieldClass}
              {...register('password')}
            />
            {errors.password && <p className={errorClass}>{errors.password.message}</p>}
          </div>

          {/* Business name */}
          <div>
            <label htmlFor="organizationName" className="block text-sm font-medium mb-1">
              Business name
            </label>
            <input
              id="organizationName"
              type="text"
              placeholder="e.g. Nairobi Supermarket"
              className={fieldClass}
              {...register('organizationName')}
            />
            {errors.organizationName && (
              <p className={errorClass}>{errors.organizationName.message}</p>
            )}
          </div>

          {/* Business type */}
          <div>
            <label htmlFor="businessType" className="block text-sm font-medium mb-1">
              Business type
            </label>
            <select
              id="businessType"
              className={fieldClass}
              {...register('businessType')}
            >
              <option value="">Select your business type</option>
              {businessTypes.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            {errors.businessType && (
              <p className={errorClass}>{errors.businessType.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 px-4 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-2"
          >
            {isSubmitting ? 'Creating account...' : 'Create account'}
          </button>

          <p className="text-xs text-muted-foreground text-center">
            By creating an account, you agree to our terms of service and privacy policy.
          </p>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link to="/login" className="text-primary hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
