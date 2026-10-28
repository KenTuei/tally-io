# Tally.io

> **Modern, offline-first Point of Sale and Business Management Platform**

Tally.io is a production-grade POS and business management SaaS built for the Kenyan market and designed to scale globally. It supports retail shops, supermarkets, wholesalers, restaurants, hardware stores, agrovets, pharmacies, salons, and service businesses.

---

## Core Features

- **Offline-first POS** — sell even without internet; sync when back online
- **Multi-tenant SaaS** — isolate each business with strict data boundaries
- **Event ledger** — append-only, auditable financial and inventory records
- **React + TypeScript frontend** — modern, accessible, responsive UI
- **Node.js + Fastify backend** — typed, validated, versioned REST API
- **MongoDB Atlas** — cloud-native primary database
- **RxDB** — local-first persistence with explicit sync protocol
- **Tauri desktop app** — Windows and Linux packaging
- **Capacitor mobile app** — Android (iOS-compatible)
- **M-Pesa Daraja** — STK Push, callbacks, reconciliation
- **KRA eTIMS** — fiscalization integration pathway
- **AI Business Assistant** — Gemini-powered, tool-calling, permission-aware
- **Google Chat notifications** — optional integration
- **Subscription management** — multi-plan SaaS entitlements

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| State | Zustand, TanStack Query, React Hook Form, Zod |
| Backend | Node.js 20, TypeScript, Fastify, Zod |
| Database | MongoDB Atlas (cloud), RxDB + IndexedDB/SQLite (local) |
| Desktop | Tauri 2 |
| Mobile | Capacitor 6 |
| Auth | JWT + refresh token rotation |
| Payments | M-Pesa Daraja API |
| AI | Google Gemini (function calling) |
| CI/CD | GitHub Actions |
| Workspace | pnpm workspaces |

---

## Repository Structure

```
Tally.io/
├── apps/
│   ├── frontend/          # React + TypeScript + Vite web app
│   ├── backend/           # Node.js + Fastify + TypeScript API
│   ├── desktop/           # Tauri desktop wrapper
│   └── mobile/            # Capacitor mobile wrapper
├── packages/
│   ├── shared-types/      # Shared TypeScript types and interfaces
│   ├── shared-validation/ # Shared Zod schemas
│   ├── api-client/        # Type-safe API client
│   ├── business-rules/    # Centralized business logic
│   ├── ui/                # Shared UI component library
│   └── sync-protocol/     # RxDB ↔ Backend sync definitions
├── infrastructure/
│   ├── docker/            # Dockerfiles
│   ├── deployment/        # Deployment scripts and configs
│   └── scripts/           # Utility scripts
├── docs/                  # Architecture and design docs
├── .github/workflows/     # GitHub Actions CI
├── .kiro/steering/        # Kiro AI steering files
├── docker-compose.yml
├── package.json           # pnpm workspace root
└── .env.example
```

---

## Quick Start

### Prerequisites

- Node.js >= 20.x
- pnpm >= 9.x (`npm install -g pnpm`)
- Rust >= 1.75 (for Tauri desktop)
- Java 17+ and Android SDK (for Capacitor mobile)
- Docker (optional, for local services)

### Setup

```bash
# Clone and install
git clone https://github.com/KenTuei/tally-io.git
cd tally-io
pnpm install

# Configure environment
cp .env.example .env
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env
# Edit each .env with your values

# Start development
pnpm dev          # starts frontend + backend concurrently
pnpm dev:web      # frontend only (port 5173)
pnpm dev:api      # backend only (port 3000)

# Run checks
pnpm typecheck    # TypeScript across all packages
pnpm lint         # ESLint across all packages
pnpm test         # run all tests
pnpm build        # production build of all apps
```

See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for the full setup guide.

---

## Documentation

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design and decisions |
| [DATABASE_DESIGN.md](docs/DATABASE_DESIGN.md) | MongoDB collections and schemas |
| [EVENT_LEDGER.md](docs/EVENT_LEDGER.md) | Append-only ledger design |
| [OFFLINE_SYNC.md](docs/OFFLINE_SYNC.md) | RxDB ↔ backend sync protocol |
| [SECURITY.md](docs/SECURITY.md) | Auth, tenant isolation, secrets |
| [API.md](docs/API.md) | REST API reference |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | Production deployment guide |
| [TESTING.md](docs/TESTING.md) | Testing strategy and commands |
| [IMPLEMENTATION_ROADMAP.md](docs/IMPLEMENTATION_ROADMAP.md) | Phases, milestones, status |

---

## License

Proprietary — All rights reserved. © 2026 Tally.io / KenTuei.
# tally-io
