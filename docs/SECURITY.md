# Tally.io — Security Architecture

## Authentication

### Token strategy

- **Access token**: JWT, signed with HS256 or RS256, 15-minute TTL
- **Refresh token**: opaque UUID, stored as hash in `users.refreshTokens[]`, 7-day TTL, rotated on each use
- Refresh tokens are stored as bcrypt hashes — compromise of the DB doesn't expose live tokens
- Token rotation: each refresh issues a new access + refresh pair; old refresh token is invalidated
- Revocation: refresh tokens can be individually revoked (logout) or all revoked (security reset)

### Access token payload

```typescript
{
  sub: string;             // userId
  org: string;             // organizationId (from current session)
  role: string;            // membership role
  branches: string[];      // accessible branch IDs (empty = all)
  deviceId: string;        // registered device
  iat: number;
  exp: number;
  jti: string;             // unique token ID for revocation list
}
```

### Password security

- bcrypt with cost factor 12
- Minimum password length: 8 characters
- No maximum length (pre-hash at 72 chars to prevent DoS)
- Password reset via time-limited token (1 hour), stored as hash

---

## Tenant Isolation

### Middleware enforcement

Every authenticated request goes through `tenantMiddleware`:

1. Decode JWT and extract `org` (organizationId)
2. Verify user still has an active membership in that organization
3. Inject `req.tenantId = org` and `req.userRole = role`
4. All downstream queries must use `{ organizationId: req.tenantId }` filter

### Rules

- **Never** trust `organizationId` from the request body or query params for authorization
- **Always** derive tenant scope from the verified JWT payload
- Platform admin endpoints use a separate `platformAdmin` role checked independently
- Cross-organization queries are never permitted in business logic handlers

### Testing tenant isolation

Automated tests verify:
- User from Org A cannot read Org B's sales
- User from Org A cannot write to Org B's products
- Sync endpoints filter by token-derived organizationId
- Report endpoints reject requests with mismatched organizationId

---

## API Security

### Rate limiting

- `/api/v1/auth/login`: 10 requests / 15 min per IP
- `/api/v1/auth/register`: 5 requests / hour per IP
- `/api/v1/auth/password-reset`: 5 requests / hour per email
- General API: 300 requests / min per authenticated user
- Sync endpoints: 60 requests / min per device

### Input validation

- All request bodies validated with Zod schemas before handler execution
- Unknown fields are stripped (Zod `.strict()` or `.strip()`)
- Monetary amounts validated as integers
- Dates validated as ISO 8601 strings
- IDs validated as valid ObjectId strings

### Headers

Via `@fastify/helmet`:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 0` (modern browsers use CSP instead)
- `Strict-Transport-Security` (production only)
- `Content-Security-Policy` (configured per app)
- `Referrer-Policy: strict-origin-when-cross-origin`

### CORS

- Explicitly configured allowed origins (not `*`)
- Credentials allowed only for same-site or explicitly trusted origins
- Preflight responses cached appropriately

---

## Secrets Management

### Rules

1. All secrets in environment variables only
2. `.env` files never committed to Git
3. No secrets in application bundles (frontend, desktop, mobile)
4. No secrets in logs
5. No secrets in error messages returned to clients
6. API keys for external services (M-Pesa, Gemini) held on backend only
7. Frontend communicates with backend; backend communicates with external APIs

### Required secrets (see `.env.example`)

- `JWT_SECRET` / `JWT_PRIVATE_KEY`
- `REFRESH_TOKEN_SECRET`
- `MONGODB_URI`
- `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_PASSKEY`
- `GEMINI_API_KEY`
- `EMAIL_*` provider credentials
- `SESSION_ENCRYPTION_KEY`

---

## Authorization

### Role permissions matrix (summary)

| Action | Owner | Admin | Manager | Accountant | Inv.Mgr | Cashier | Salesperson | Auditor |
|--------|-------|-------|---------|-----------|---------|---------|-------------|---------|
| View sales | ✅ | ✅ | ✅ | ✅ | ✅ | Own | Own | ✅ |
| Create sale | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ |
| Void sale | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Issue refund | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage products | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Adjust inventory | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| View reports | ✅ | ✅ | Branch | ✅ | ❌ | ❌ | ❌ | ✅ |
| Manage users | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Manage settings | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| View audit log | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ |
| Close shift | ✅ | ✅ | ✅ | ❌ | ❌ | Own | ❌ | ❌ |

### Permission checks

Authorization happens at the service layer, not just the route level:

```typescript
if (!can(req.userRole, 'sale:void')) {
  throw new ForbiddenError('You do not have permission to void sales');
}
```

---

## Data Privacy

- PII (names, phone numbers, emails) stored only where required
- Customer data access restricted to authenticated, authorized users
- Data export enforces tenant scope
- Personal data deletion handled per privacy policy
- Immutable ledger events should not contain unnecessary PII — use references to mutable profile records instead

---

## Audit Logging

Logged events (in `auditLogs` collection):
- Authentication events (login, logout, failed login, password reset)
- User management (creation, role change, deactivation)
- Financial mutations (sale void, refund, expense approval)
- Configuration changes (settings, integrations, subscription changes)
- Platform admin actions

Audit logs include: actorId, action, entityType, entityId, ipAddress, correlationId, timestamp.

Audit logs are read-only after creation. No UPDATE or DELETE permitted.

---

## Tauri Desktop Security

- Minimal `capabilities` configuration — only APIs actually used
- No `shell:execute` or `fs:write-all` unless justified
- No access to arbitrary file system paths
- Backend API key never bundled in Tauri app
- All external API calls go through the backend

## Mobile Security

- No secrets in app bundle or `capacitor.config.ts`
- Certificate pinning considered for production builds
- Camera and storage permissions requested only when needed
- Biometric auth considered for future implementation
