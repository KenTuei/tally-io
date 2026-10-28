# Tally.io — System Architecture

## Overview

Tally.io is an offline-first, multi-tenant SaaS POS and business management platform. The architecture prioritizes local-first operation with reliable synchronization to a cloud backend, strict tenant isolation, and auditable financial records.

---

## Architectural Principles

1. **Local-first** — core POS operations work without internet connectivity
2. **Append-only event ledger** — financial and inventory truth never mutated in place
3. **Strict multi-tenancy** — every record scoped to a tenant; authorization enforced server-side
4. **Projections over scans** — aggregates and dashboards served from materialized read models
5. **Explicit sync** — no magic replication; client-server sync is a designed, versioned protocol
6. **Defense in depth** — auth, validation, rate limiting, audit at every layer
7. **Modular monolith** — feature modules isolated enough to extract later if needed

---

## System Components

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENTS                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  Web Browser │  │Tauri Desktop │  │  Capacitor Android│  │
│  │  React+Vite  │  │ React+Tauri  │  │  React+Capacitor │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘  │
│         │                 │                    │            │
│         └─────────────────┼────────────────────┘            │
│                           │                                 │
│              ┌────────────▼───────────────┐                 │
│              │      RxDB Local Store       │                 │
│              │  (IndexedDB / SQLite)        │                 │
│              └────────────┬───────────────┘                 │
└───────────────────────────┼─────────────────────────────────┘
                            │ HTTPS / REST
                            │ (explicit sync protocol)
┌───────────────────────────▼─────────────────────────────────┐
│                      BACKEND (Fastify)                      │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐  │
│  │   Auth   │  │ Products │  │  Sales   │  │  Ledger    │  │
│  │  Module  │  │  Module  │  │  Module  │  │   Module   │  │
│  └──────────┘  └──────────┘  └──────────┘  └────────────┘  │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐  │
│  │Inventory │  │Customers │  │ Payments │  │   Sync     │  │
│  │  Module  │  │  Module  │  │  Module  │  │   Module   │  │
│  └──────────┘  └──────────┘  └──────────┘  └────────────┘  │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐  │
│  │ Reporting│  │   M-Pesa │  │   eTIMS  │  │  AI Module │  │
│  │  Module  │  │  Module  │  │  Module  │  │  (Gemini)  │  │
│  └──────────┘  └──────────┘  └──────────┘  └────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Background Queue (BullMQ)                │   │
│  └──────────────────────────────────────────────────────┘   │
└───────────────────────────┬─────────────────────────────────┘
                            │
            ┌───────────────┼───────────────┐
            │               │               │
   ┌────────▼──────┐ ┌──────▼──────┐ ┌─────▼──────────┐
   │ MongoDB Atlas │ │    Redis    │ │  External APIs  │
   │  (primary DB) │ │  (sessions  │ │  M-Pesa Daraja  │
   │               │ │   + queue)  │ │  KRA eTIMS      │
   └───────────────┘ └─────────────┘ │  Google Gemini  │
                                     │  Google Chat    │
                                     └─────────────────┘
```

---

## Frontend Architecture

**Framework:** React 18 + TypeScript (strict) + Vite

### Layer structure

```
src/
├── app/              # App bootstrap, providers, router
├── components/       # Global reusable UI components
├── features/         # Domain feature modules
│   ├── auth/
│   ├── pos/
│   ├── products/
│   ├── inventory/
│   ├── sales/
│   ├── customers/
│   ├── reports/
│   └── ...
├── layouts/          # Page layout wrappers
├── hooks/            # Shared React hooks
├── lib/              # Third-party wrappers (rxdb, api-client)
├── routes/           # React Router route definitions
├── services/         # API service functions
├── stores/           # Zustand global stores
├── styles/           # Global CSS and Tailwind config
└── types/            # Frontend-only TypeScript types
```

### State management strategy

| State type | Solution |
|-----------|---------|
| Server state | TanStack Query |
| Global client state | Zustand |
| Local form state | React Hook Form |
| Local offline data | RxDB (accessed via custom hooks) |
| URL state | React Router |

---

## Backend Architecture

**Framework:** Fastify + TypeScript

Chosen over NestJS because:
- Faster boot and lower overhead — important for POS latency
- Less magic/decorator complexity, more explicit control
- Excellent TypeScript and JSON schema support
- Straightforward plugin system fits a modular monolith
- Strong ecosystem (pino logging, ajv validation, openapi plugin)

### Request lifecycle

```
Request → Rate Limiter → CORS → Auth Middleware
        → Tenant Resolver → Route Handler
        → Zod Validation → Module Logic
        → Database → Event Ledger
        → Response → Logging
```

### Module structure (each module contains)

```
modules/sales/
├── sales.routes.ts       # Fastify route definitions
├── sales.service.ts      # Business logic
├── sales.repository.ts   # Data access
├── sales.schemas.ts      # Zod request/response schemas
├── sales.types.ts        # Module types
└── sales.events.ts       # Ledger event definitions
```

---

## Database Architecture

See [DATABASE_DESIGN.md](DATABASE_DESIGN.md) for full collection specifications.

**Primary:** MongoDB Atlas (replica set, transactions supported)
**Local:** RxDB + IndexedDB (browser) / SQLite (desktop/mobile)

### Write path for sales

```
Client → POST /api/v1/sales
       → Auth check → Tenant check → Validation
       → Begin MongoDB transaction
         → Insert sale document
         → Insert sale line items
         → Insert ledger event (SALE_COMPLETED)
         → Update stock projection
       → Commit transaction
       → Queue: notify, update report projections
       → Return sale + receipt
```

---

## Offline-First Architecture

See [OFFLINE_SYNC.md](OFFLINE_SYNC.md) for the full synchronization protocol.

Key principles:
- Client records to RxDB outbox before showing success
- Outbox processor submits to `/api/v1/sync/push`
- Server validates, idempotency-checks, and processes
- Server responds with accepted/rejected/conflict per item
- Client marks outbox items and updates local records

---

## Security Architecture

See [SECURITY.md](SECURITY.md) for full details.

- JWT access tokens (15 min TTL) + refresh tokens (7 days, rotated)
- Tenant isolation enforced in every query via `tenantId` middleware injection
- All financial mutations require `organizationId` from token, never from request body
- Rate limiting at API gateway level
- Zod validation on all inputs
- No secrets in client bundles
- Secure CORS, CSP headers via Fastify Helmet

---

## Event Ledger

See [EVENT_LEDGER.md](EVENT_LEDGER.md) for full specification.

The ledger is append-only. Financial projections are derived from ledger events. Reports read from materialized projections. Projections are rebuildable from the ledger.

---

## Technology Decisions Log

| Decision | Choice | Reason |
|---------|--------|--------|
| Backend framework | Fastify | Performance, explicit plugin model, TypeScript-first |
| DB driver | Mongoose | Schema validation, middleware hooks, easier queries |
| Workspace | pnpm workspaces | Faster installs, strict hoisting, disk efficiency |
| Local DB | RxDB | Offline-first, reactive, cross-platform, schema migration support |
| State | Zustand | Lightweight, TypeScript-friendly, no boilerplate |
| Icons | Lucide | MIT license, consistent style, tree-shakable |
| Charts | Recharts | React-native, composable, TypeScript support |
| Queue | BullMQ + Redis | Reliable, retryable, delayed job support |
| Auth | Custom JWT | Full control over session policy, no vendor lock-in |
