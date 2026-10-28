import type { ID, ISO8601String, BusinessType, UserRole } from './common.js';

export interface Organization {
  id: ID;
  name: string;
  slug: string;
  businessType: BusinessType;
  currency: string;
  country: string;
  timezone: string;
  contactEmail: string;
  contactPhone?: string;
  address?: Address;
  logo?: string;
  taxNumber?: string;
  vatRegistered: boolean;
  isActive: boolean;
  createdAt: ISO8601String;
  updatedAt: ISO8601String;
}

export interface Address {
  street?: string;
  city?: string;
  county?: string;
  country: string;
  postalCode?: string;
}

export interface Branch {
  id: ID;
  organizationId: ID;
  name: string;
  code: string;
  address?: Address;
  phone?: string;
  email?: string;
  isMainBranch: boolean;
  isActive: boolean;
  createdAt: ISO8601String;
  updatedAt: ISO8601String;
}

export interface Membership {
  id: ID;
  organizationId: ID;
  userId: ID;
  role: UserRole;
  branchIds: ID[];
  isActive: boolean;
  createdAt: ISO8601String;
}

export interface Register {
  id: ID;
  organizationId: ID;
  branchId: ID;
  name: string;
  deviceId?: string;
  isActive: boolean;
  currentShiftId?: ID;
  createdAt: ISO8601String;
  updatedAt: ISO8601String;
}

export type SubscriptionPlan = 'trial' | 'starter' | 'professional' | 'enterprise';
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'cancelled' | 'expired';

export interface SubscriptionLimits {
  maxBranches: number;
  maxUsers: number;
  maxRegisters: number;
  features: string[];
}

export interface Subscription {
  id: ID;
  organizationId: ID;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  trialEndsAt?: ISO8601String;
  currentPeriodStart: ISO8601String;
  currentPeriodEnd: ISO8601String;
  limits: SubscriptionLimits;
  createdAt: ISO8601String;
  updatedAt: ISO8601String;
}
