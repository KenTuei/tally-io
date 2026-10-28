---
inclusion: always
---

# Tally.io — Project Steering

## Product Identity

Tally.io is an offline-first, multi-tenant Point of Sale and business management SaaS platform targeting the Kenyan market. It serves retail shops, supermarkets, wholesalers, restaurants, hardware stores, agrovets, pharmacies, salons, and service businesses.

**GitHub:** `KenTuei/tally-io`  
**Local path:** `~/Tally.io`  
**Workspace:** pnpm workspaces (monorepo)

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript strict, Vite, Tailwind CSS, shadcn/ui |
| State | Zustand, TanStack Query, React Hook Form, Zod |
| Backend | Node.js 20, TypeScript strict, Fastify, Mongoose, Zod |
| Database | MongoDB Atlas (cloud), RxDB + IndexedDB/SQLite (local) |
| Desktop | Tauri 2 |
| Mobile | Capacitor 6 (Android first) |
| Queue | BullMQ + Redis |
| Auth | Custom JWT + refresh token rotation |
| Payments | M-Pesa Daraja |
| AI | Google Gemini (function calling) |
| Package manager | pnpm 9 workspaces |

## Core Architecture Rules

1. **Event ledger is append-only.** Financial and inventory events are NEVER updated or deleted after acceptance. Corrections use compensating events.
2. **Tenant isolation is non-negotiable.** `organizationId` is ALWAYS derived from the verified JWT token, NEVER from the request body. Every query must filter by `organizationId`.
3. **No fake payments.** A payment is not confirmed until verified through the trusted provider backend callback. Never trust client-side payment success.
4. **Offline sales are local first.** UI must not confirm a sale until it's durably written to RxDB. Sync happens separately via the outbox protocol.
5. **No secrets in client code.** M-Pesa keys, Gemini API key, and all provider credentials live on the backend only.
6. **Money as integers.** All monetary values are stored and calculated as integers in the smallest currency unit (KES cents = smallest denomination). No floating-point money.
7. **TypeScript strict.** No `any` without explicit, isolated justification. Use proper types.
8. **Test before marking complete.** A feature is not done when files are created — it's done when the relevant tests pass.

## Module Structure

```
apps/
  frontend/     # React + Vite web app
  backend/      # Fastify + TypeScript API
  desktop/      # Tauri wrapper
  mobile/       # Capacitor wrapper
packages/
  shared-types/       # Shared TypeScript interfaces
  shared-validation/  # Shared Zod schemas
  api-client/         # Type-safe fetch client
  business-rules/     # Central business logic
  ui/                 # Shared component library
  sync-protocol/      # Sync protocol types and constants
```

## Current Phase

Phase 0 (Environment) → Phase 1 (Foundation) → Phase 2 (Products) → ...

See `docs/IMPLEMENTATION_ROADMAP.md` for full status.
