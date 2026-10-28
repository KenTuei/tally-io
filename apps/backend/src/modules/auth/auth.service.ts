import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import { nanoid } from 'nanoid';
import { config } from '../../config/config.js';
import { UserModel, OrganizationModel, MembershipModel } from './auth.models.js';
import { AuthError, ConflictError, NotFoundError, AppError } from '../../middleware/error.middleware.js';
import type { RegisterInput, LoginInput, RefreshTokenInput } from './auth.schemas.js';
import type { JwtPayload } from '@tally/shared-types';

const BCRYPT_ROUNDS = 12;
const REFRESH_TOKEN_BYTES = 40;

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    + '-'
    + nanoid(6);
}

function generateTokens(payload: Omit<JwtPayload, 'iat' | 'exp' | 'jti'>) {
  const jti = nanoid(16);

  const accessToken = jwt.sign(
    { ...payload, jti },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'] },
  );

  const refreshToken = randomBytes(REFRESH_TOKEN_BYTES).toString('hex');

  return { accessToken, refreshToken, jti };
}

export async function register(input: RegisterInput) {
  // Check for existing user
  const existingUser = await UserModel.findOne({ email: input.email });
  if (existingUser) {
    throw new ConflictError('An account with this email already exists');
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

  // Create user, organization, membership in sequence
  // In production, this should be in a transaction if using replica set
  const user = await UserModel.create({
    email: input.email,
    passwordHash,
    firstName: input.firstName,
    lastName: input.lastName,
    phone: input.phone,
    emailVerified: false,
    isActive: true,
  });

  const organization = await OrganizationModel.create({
    name: input.organizationName,
    slug: generateSlug(input.organizationName),
    businessType: input.businessType,
    currency: input.currency,
    country: input.country,
    timezone: input.timezone,
    contactEmail: input.email,
    isActive: true,
  });

  await MembershipModel.create({
    organizationId: organization._id,
    userId: user._id,
    role: 'owner',
    branchIds: [],
    isActive: true,
    acceptedAt: new Date(),
  });

  // Generate tokens
  const tokenPayload: Omit<JwtPayload, 'iat' | 'exp' | 'jti'> = {
    sub: user._id.toString(),
    org: organization._id.toString(),
    role: 'owner',
    branches: [],
    deviceId: input.deviceId,
  };

  const { accessToken, refreshToken, jti: _jti } = generateTokens(tokenPayload);

  // Store refresh token hash
  const tokenHash = await bcrypt.hash(refreshToken, 10);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await UserModel.findByIdAndUpdate(user._id, {
    $push: {
      refreshTokens: {
        tokenHash,
        deviceId: input.deviceId,
        deviceType: input.deviceType,
        createdAt: new Date(),
        expiresAt,
      },
    },
    lastLoginAt: new Date(),
  });

  return {
    user: {
      id: user._id.toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      emailVerified: user.emailVerified,
      isActive: user.isActive,
      createdAt: user.createdAt.toISOString(),
    },
    organization: {
      id: organization._id.toString(),
      name: organization.name,
      businessType: organization.businessType,
      currency: organization.currency,
      country: organization.country,
    },
    tokens: {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60, // 15 minutes in seconds
    },
  };
}

export async function login(input: LoginInput) {
  // Fetch user with passwordHash (not selected by default)
  const user = await UserModel.findOne({ email: input.email }).select(
    '+passwordHash +refreshTokens',
  );

  if (!user || !user.isActive) {
    // Use same error message to prevent user enumeration
    throw new AuthError('Invalid email or password');
  }

  const passwordValid = await bcrypt.compare(input.password, user.passwordHash);
  if (!passwordValid) {
    throw new AuthError('Invalid email or password');
  }

  // Find active membership
  const membership = await MembershipModel.findOne({
    userId: user._id,
    isActive: true,
  }).sort({ createdAt: -1 });

  if (!membership) {
    throw new AuthError('No active organization membership found');
  }

  const organization = await OrganizationModel.findById(membership.organizationId);
  if (!organization || !organization.isActive) {
    throw new AuthError('Organization not found or inactive');
  }

  const tokenPayload: Omit<JwtPayload, 'iat' | 'exp' | 'jti'> = {
    sub: user._id.toString(),
    org: organization._id.toString(),
    role: membership.role as JwtPayload['role'],
    branches: membership.branchIds.map((id) => id.toString()),
    deviceId: input.deviceId,
  };

  const { accessToken, refreshToken } = generateTokens(tokenPayload);

  // Store refresh token hash, remove expired tokens
  const tokenHash = await bcrypt.hash(refreshToken, 10);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const now = new Date();

  await UserModel.findByIdAndUpdate(user._id, {
    $push: {
      refreshTokens: {
        tokenHash,
        deviceId: input.deviceId,
        deviceType: input.deviceType,
        createdAt: now,
        expiresAt,
      },
    },
    $pull: {
      refreshTokens: { expiresAt: { $lt: now } }, // Remove expired tokens
    },
    lastLoginAt: now,
  });

  return {
    user: {
      id: user._id.toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      emailVerified: user.emailVerified,
      isActive: user.isActive,
      createdAt: user.createdAt.toISOString(),
    },
    organization: {
      id: organization._id.toString(),
      name: organization.name,
      businessType: organization.businessType,
      currency: organization.currency,
      country: organization.country,
    },
    tokens: {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60,
    },
  };
}

export async function refreshTokens(input: RefreshTokenInput) {
  const user = await UserModel.findOne({
    'refreshTokens.deviceId': input.deviceId,
    'refreshTokens.expiresAt': { $gt: new Date() },
  }).select('+refreshTokens');

  if (!user) {
    throw new AuthError('Invalid or expired refresh token');
  }

  // Find matching token
  const matchingToken = await (async () => {
    for (const storedToken of user.refreshTokens) {
      if (
        storedToken.deviceId === input.deviceId &&
        storedToken.expiresAt > new Date()
      ) {
        const matches = await bcrypt.compare(input.refreshToken, storedToken.tokenHash);
        if (matches) return storedToken;
      }
    }
    return null;
  })();

  if (!matchingToken) {
    throw new AuthError('Invalid or expired refresh token');
  }

  // Get current membership
  const membership = await MembershipModel.findOne({
    userId: user._id,
    isActive: true,
  }).sort({ createdAt: -1 });

  if (!membership) {
    throw new AuthError('No active organization membership found');
  }

  const organization = await OrganizationModel.findById(membership.organizationId);
  if (!organization || !organization.isActive) {
    throw new AuthError('Organization not found or inactive');
  }

  // Rotate token — invalidate old, issue new
  const tokenPayload: Omit<JwtPayload, 'iat' | 'exp' | 'jti'> = {
    sub: user._id.toString(),
    org: organization._id.toString(),
    role: membership.role as JwtPayload['role'],
    branches: membership.branchIds.map((id) => id.toString()),
    deviceId: input.deviceId,
  };

  const { accessToken, refreshToken: newRefreshToken } = generateTokens(tokenPayload);
  const newTokenHash = await bcrypt.hash(newRefreshToken, 10);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  // Remove old token, add new one
  await UserModel.findByIdAndUpdate(user._id, {
    $pull: {
      refreshTokens: { tokenHash: matchingToken.tokenHash },
    },
  });

  await UserModel.findByIdAndUpdate(user._id, {
    $push: {
      refreshTokens: {
        tokenHash: newTokenHash,
        deviceId: input.deviceId,
        deviceType: matchingToken.deviceType,
        createdAt: new Date(),
        expiresAt,
      },
    },
  });

  return {
    tokens: {
      accessToken,
      refreshToken: newRefreshToken,
      expiresIn: 15 * 60,
    },
  };
}

export async function logout(userId: string, deviceId?: string, allDevices = false) {
  if (allDevices) {
    await UserModel.findByIdAndUpdate(userId, {
      $set: { refreshTokens: [] },
    });
  } else if (deviceId) {
    await UserModel.findByIdAndUpdate(userId, {
      $pull: { refreshTokens: { deviceId } },
    });
  }

  return { success: true };
}

export async function requestPasswordReset(email: string) {
  const user = await UserModel.findOne({ email });

  // Always return success to prevent user enumeration
  if (!user || !user.isActive) {
    return { message: 'If an account exists, a reset link has been sent' };
  }

  const token = randomBytes(32).toString('hex');
  const tokenHash = await bcrypt.hash(token, 10);
  const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await UserModel.findByIdAndUpdate(user._id, {
    $set: {
      passwordResetToken: tokenHash,
      passwordResetExpiry: expiry,
    },
  });

  // TODO: Send email with token (email service integration)
  // For now, return token in development mode only
  return {
    message: 'If an account exists, a reset link has been sent',
    ...(config.isDev && { devToken: token }),
  };
}

export async function confirmPasswordReset(token: string, newPassword: string) {
  const users = await UserModel.find({
    passwordResetExpiry: { $gt: new Date() },
  }).select('+passwordResetToken +passwordResetExpiry');

  let targetUser = null;
  for (const user of users) {
    if (user.passwordResetToken) {
      const matches = await bcrypt.compare(token, user.passwordResetToken);
      if (matches) {
        targetUser = user;
        break;
      }
    }
  }

  if (!targetUser) {
    throw new AppError('INVALID_TOKEN', 'Invalid or expired reset token', 400);
  }

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

  await UserModel.findByIdAndUpdate(targetUser._id, {
    $set: { passwordHash, refreshTokens: [] }, // Also invalidate all sessions
    $unset: { passwordResetToken: 1, passwordResetExpiry: 1 },
  });

  return { message: 'Password reset successfully' };
}
