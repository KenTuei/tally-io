---
inclusion: always
---

# Tally.io — Coding Standards

## TypeScript

- Always use `strict: true` — no exceptions
- No `any` type. Use `unknown` and narrow it, or define proper types
- Prefer `interface` for objects, `type` for unions and computed types
- Use `readonly` where data should not be mutated
- Explicit return types on all public functions and API handlers
- Use Zod for runtime validation; derive TypeScript types from Zod schemas with `z.infer<>`

## React

- Functional components only — no class components
- TypeScript props with explicit `interface Props {}` or inline types
- Custom hooks in `hooks/` for reusable stateful logic
- Avoid prop drilling beyond 2 levels — use context or Zustand store
- Use `React.memo` only when profiling shows a real benefit
- Error boundaries around major feature areas
- Loading, empty, error states for every data-fetching component

## File naming

- Components: `PascalCase.tsx` (e.g. `ProductCard.tsx`)
- Hooks: `camelCase.ts` starting with `use` (e.g. `useCartStore.ts`)
- Services: `camelCase.service.ts` (e.g. `sales.service.ts`)
- Routes: `camelCase.routes.ts`
- Schemas: `camelCase.schemas.ts`
- Types: `camelCase.types.ts`

## Backend patterns

- Each module exports: routes, service, repository, schemas, types, events
- Business logic lives in service files — routes are thin wrappers
- Repositories handle all MongoDB queries — no raw queries in services
- Zod schemas define request/response shapes and are the source of TypeScript types
- Use MongoDB transactions for any write touching multiple collections
- Log with `fastify.log` (pino) — structured JSON, no `console.log` in production

## Monetary values

```typescript
// CORRECT — store as integer cents
const price = 15000; // KES 150.00 = 15000 cents

// CORRECT — display
const display = (cents: number) => `KES ${(cents / 100).toFixed(2)}`;

// WRONG — never use floats for money
const price = 150.00; // ❌
```

## Error handling

- Throw typed errors in services, catch in route handlers
- Return consistent error shape: `{ error: { code, message, details? } }`
- Never expose stack traces or internal details to clients in production
- Log full error details server-side with correlation ID

## Imports

- Use absolute imports from workspace root where possible
- Import from packages with `@tally/shared-types`, `@tally/shared-validation`, etc.
- Avoid circular imports between modules

## Security rules (enforced in code review)

1. Never trust `organizationId` from request body — derive from `req.tenantId`
2. Every database query includes `{ organizationId: req.tenantId }`
3. Sensitive fields (passwordHash, tokens) never in response serializers
4. Input validation with Zod before any business logic
5. Destructive actions require explicit confirmation and audit logging
