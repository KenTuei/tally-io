import type { ID, ISO8601String, UserRole } from './common.js';

export interface JwtPayload {
  sub: ID;           // userId
  org: ID;           // organizationId
  role: UserRole;
  branches: ID[];    // empty = access to all branches
  deviceId: string;
  jti: string;       // token ID for revocation
  iat: number;
  exp: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;  // seconds until access token expiry
}

export interface UserProfile {
  id: ID;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  emailVerified: boolean;
  isActive: boolean;
  createdAt: ISO8601String;
}

export interface LoginRequest {
  email: string;
  password: string;
  deviceId: string;
  deviceType: 'web' | 'desktop' | 'mobile';
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  organizationName: string;
  businessType: string;
  country: string;
  currency: string;
}

export interface LoginResponse {
  user: UserProfile;
  organization: {
    id: ID;
    name: string;
    businessType: string;
    currency: string;
    country: string;
    onboardingStatus?: 'pending' | 'in_progress' | 'complete';
  };
  tokens: AuthTokens;
}

export interface RefreshTokenRequest {
  refreshToken: string;
  deviceId: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirmRequest {
  token: string;
  newPassword: string;
}
