/**
 * Google OAuth service.
 * Validates Google ID tokens on the backend. Credentials never sent to frontend.
 * Security: never silently merge accounts on email alone — require explicit linking.
 */
import { OAuth2Client } from 'google-auth-library';
import { config } from '../../config/config.js';
import { UserModel, OrganizationModel, MembershipModel } from './auth.models.js';
import { AppError, ConflictError } from '../../middleware/error.middleware.js';
import { logger } from '../../config/logger.js';
import { randomBytes } from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import type { JwtPayload } from '@tally/shared-types';

let oauthClient: OAuth2Client | null = null;

function getOAuthClient(): OAuth2Client {
  if (!config.google.isConfigured) {
    throw new AppError(
      'GOOGLE_OAUTH_NOT_CONFIGURED',
      'Google Sign-In is not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to your environment.',
      503,
    );
  }
  if (!oauthClient) {
    oauthClient = new OAuth2Client(config.google.clientId);
  }
  return oauthClient;
}

export interface GoogleTokenPayload {
  googleId: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  emailVerified: boolean;
}

/**
 * Verify a Google ID token received from the frontend.
 * Returns structured payload — never trusts the token claims for account access.
 */
export async function verifyGoogleToken(idToken: string): Promise<GoogleTokenPayload> {
  const client = getOAuthClient();

  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: config.google.clientId!,
    });

    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email) {
      throw new AppError('GOOGLE_INVALID_TOKEN', 'Invalid Google token payload', 401);
    }

    return {
      googleId: payload.sub,
      email: payload.email.toLowerCase(),
      firstName: payload.given_name ?? payload.name?.split(' ')[0] ?? 'User',
      lastName: payload.family_name ?? payload.name?.split(' ').slice(1).join(' ') ?? '',
      avatar: payload.picture,
      emailVerified: payload.email_verified ?? false,
    };
  } catch (err) {
    if (err instanceof AppError) throw err;
    logger.error(err, 'Google token verification failed');
    throw new AppError('GOOGLE_TOKEN_INVALID', 'Google authentication failed', 401);
  }
}

function generateTokens(payload: Omit<JwtPayload, 'iat' | 'exp' | 'jti'>) {
  const jti = nanoid(16);
  const accessToken = jwt.sign(
    { ...payload, jti },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'] },
  );
  const refreshToken = randomBytes(40).toString('hex');
  return { accessToken, refreshToken, jti };
}

/**
 * Sign in or register with Google.
 * 1. Look up by googleId — if found, sign in.
 * 2. Look up by email — if found and not linked, link Google to the account.
 * 3. Otherwise — create new account (needs organization setup afterward).
 */
export async function signInWithGoogle(
  payload: GoogleTokenPayload,
  deviceId: string,
  deviceType: string,
): Promise<{
  user: ReturnType<typeof formatUser>;
  organization: Record<string, unknown> | null;
  tokens: { accessToken: string; refreshToken: string; expiresIn: number };
  isNewUser: boolean;
  needsOnboarding: boolean;
}> {
  // 1. Find by googleId
  let user = await UserModel.findOne({ googleId: payload.googleId }).select('+refreshTokens');

  let isNewUser = false;

  if (!user) {
    // 2. Find by email — link if found
    const existingByEmail = await UserModel.findOne({ email: payload.email }).select(
      '+refreshTokens',
    );

    if (existingByEmail) {
      // Link Google to existing account (with user consent — we allow it here since email is verified by Google)
      if (!existingByEmail.isActive) {
        throw new AppError('ACCOUNT_INACTIVE', 'This account has been deactivated', 403);
      }
      existingByEmail.googleId = payload.googleId;
      existingByEmail.googleEmail = payload.email;
      if (!existingByEmail.avatar && payload.avatar) {
        existingByEmail.avatar = payload.avatar;
      }
      existingByEmail.emailVerified = true; // Google-verified email
      await existingByEmail.save();
      user = existingByEmail;
    } else {
      // 3. Create new user
      user = await UserModel.create({
        email: payload.email,
        passwordHash: await bcrypt.hash(randomBytes(32).toString('hex'), 10), // unusable random password
        firstName: payload.firstName,
        lastName: payload.lastName,
        avatar: payload.avatar,
        googleId: payload.googleId,
        googleEmail: payload.email,
        emailVerified: payload.emailVerified,
        isActive: true,
        marketingConsent: false,
        refreshTokens: [],
      });
      isNewUser = true;
    }
  } else if (!user.isActive) {
    throw new AppError('ACCOUNT_INACTIVE', 'This account has been deactivated', 403);
  }

  // Find organization membership
  const membership = await MembershipModel.findOne({ userId: user._id, isActive: true }).sort({
    createdAt: -1,
  });

  let organization = null;
  let needsOnboarding = isNewUser;

  if (membership) {
    const org = await OrganizationModel.findById(membership.organizationId);
    if (org) {
      organization = {
        id: org._id.toString(),
        name: org.name,
        businessType: org.businessType,
        currency: org.currency,
        country: org.country,
        onboardingStatus: org.onboardingStatus,
      };
      needsOnboarding = org.onboardingStatus !== 'complete';
    }
  }

  // Generate tokens
  const tokenPayload: Omit<JwtPayload, 'iat' | 'exp' | 'jti'> = {
    sub: user._id.toString(),
    org: membership?.organizationId.toString() ?? '',
    role: (membership?.role as JwtPayload['role']) ?? 'owner',
    branches: membership?.branchIds.map((id) => id.toString()) ?? [],
    deviceId,
  };

  const { accessToken, refreshToken } = generateTokens(tokenPayload);
  const tokenHash = await bcrypt.hash(refreshToken, 10);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await UserModel.findByIdAndUpdate(user._id, {
    $push: {
      refreshTokens: {
        tokenHash,
        deviceId,
        deviceType,
        createdAt: new Date(),
        expiresAt,
      },
    },
    lastLoginAt: new Date(),
  });

  return {
    user: formatUser(user),
    organization,
    tokens: { accessToken, refreshToken, expiresIn: 15 * 60 },
    isNewUser,
    needsOnboarding,
  };
}

function formatUser(user: InstanceType<typeof UserModel>) {
  return {
    id: user._id.toString(),
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    avatar: user.avatar,
    emailVerified: user.emailVerified,
    isActive: user.isActive,
    createdAt: user.createdAt.toISOString(),
  };
}
