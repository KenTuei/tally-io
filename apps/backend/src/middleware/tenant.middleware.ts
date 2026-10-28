import type { FastifyReply, FastifyRequest } from 'fastify';
import jwt from 'jsonwebtoken';
import { config } from '../config/config.js';
import { AuthError } from './error.middleware.js';
import type { JwtPayload, UserRole } from '@tally/shared-types';

// Extend Fastify request with tenant context
declare module 'fastify' {
  interface FastifyRequest {
    tenantId: string;
    userId: string;
    userRole: UserRole;
    branchIds: string[];
    deviceId: string;
    jti: string;
  }
}

export async function tenantMiddleware(
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  const authHeader = request.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    throw new AuthError('Missing or invalid authorization header');
  }

  const token = authHeader.slice(7);

  let payload: JwtPayload;
  try {
    payload = jwt.verify(token, config.jwt.secret) as JwtPayload;
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new AuthError('Access token has expired');
    }
    throw new AuthError('Invalid access token');
  }

  if (!payload.sub || !payload.org) {
    throw new AuthError('Invalid token claims');
  }

  // Inject tenant context — derived from verified token, never from request body
  request.userId = payload.sub;
  request.tenantId = payload.org;
  request.userRole = payload.role;
  request.branchIds = payload.branches;
  request.deviceId = payload.deviceId;
  request.jti = payload.jti;
}

/**
 * Permission check utility — use in service layer.
 * Throws ForbiddenError if the role doesn't have the permission.
 */
export function can(role: UserRole, permission: string): boolean {
  const permissions: Record<string, UserRole[]> = {
    // Sales
    'sale:create': ['owner', 'admin', 'manager', 'cashier', 'salesperson'],
    'sale:void': ['owner', 'admin', 'manager'],
    'sale:view': ['owner', 'admin', 'manager', 'accountant', 'auditor'],
    'sale:view:own': ['cashier', 'salesperson'],

    // Refunds
    'refund:create': ['owner', 'admin', 'manager', 'accountant'],

    // Products
    'product:create': ['owner', 'admin', 'manager', 'inventory_manager'],
    'product:update': ['owner', 'admin', 'manager', 'inventory_manager'],
    'product:delete': ['owner', 'admin'],
    'product:view': ['owner', 'admin', 'manager', 'accountant', 'inventory_manager', 'cashier', 'salesperson', 'auditor'],

    // Inventory
    'inventory:adjust': ['owner', 'admin', 'manager', 'inventory_manager'],
    'inventory:transfer': ['owner', 'admin', 'manager', 'inventory_manager'],
    'inventory:receive': ['owner', 'admin', 'manager', 'inventory_manager'],

    // Customers
    'customer:create': ['owner', 'admin', 'manager', 'cashier', 'salesperson'],
    'customer:view': ['owner', 'admin', 'manager', 'cashier', 'salesperson', 'accountant', 'auditor'],

    // Reports
    'report:view': ['owner', 'admin', 'accountant', 'auditor'],
    'report:view:branch': ['manager'],

    // Users
    'user:manage': ['owner', 'admin'],

    // Settings
    'settings:manage': ['owner', 'admin'],

    // Audit
    'audit:view': ['owner', 'admin', 'accountant', 'auditor'],

    // Shifts
    'shift:open': ['owner', 'admin', 'manager', 'cashier'],
    'shift:close:own': ['owner', 'admin', 'manager', 'cashier'],
    'shift:close:any': ['owner', 'admin', 'manager'],

    // Expenses
    'expense:create': ['owner', 'admin', 'manager', 'accountant'],
    'expense:approve': ['owner', 'admin', 'manager'],
    'expense:view': ['owner', 'admin', 'manager', 'accountant', 'auditor'],
  };

  const allowedRoles = permissions[permission];
  if (!allowedRoles) {
    return false;
  }

  return allowedRoles.includes(role);
}
