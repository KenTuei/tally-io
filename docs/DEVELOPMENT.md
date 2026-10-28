# Tally.io — Local Development Guide

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | >= 20.x | https://nodejs.org or nvm |
| pnpm | >= 9.x | `npm install -g pnpm` |
| Git | >= 2.x | system package manager |
| Docker | >= 20.x | https://docs.docker.com |
| Rust | >= 1.75 | https://rustup.rs (for Tauri) |
| Java JDK | >= 17 | system package manager (for Android) |

## Initial Setup

```bash
# 1. Clone the repository
git clone https://github.com/KenTuei/tally-io.git
cd tally-io

# 2. Install all workspace dependencies
pnpm install

# 3. Set up environment files
cp .env.example .env
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env

# 4. Edit environment files with your values
#    Minimum required: MONGODB_URI in apps/backend/.env
nano apps/backend/.env
```

## Starting Development Servers

```bash
# Start frontend + backend concurrently
pnpm dev

# Or start individually
pnpm dev:web     # Frontend at http://localhost:5173
pnpm dev:api     # Backend at http://localhost:3000

# View API health check
curl http://localhost:3000/api/v1/health
```

## Development Commands Reference

```bash
# TypeScript type checking (all packages)
pnpm typecheck

# Lint (all packages)
pnpm lint

# Auto-fix lint issues
pnpm lint:fix

# Format code
pnpm format

# Run all tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Build all packages and apps
pnpm build

# Clean all build outputs
pnpm clean
```

## Frontend Only Commands

```bash
cd apps/frontend

pnpm dev          # Vite dev server
pnpm build        # Production build
pnpm preview      # Preview production build
pnpm typecheck    # TypeScript check
pnpm lint         # ESLint
pnpm test         # Vitest
```

## Backend Only Commands

```bash
cd apps/backend

pnpm dev          # ts-node-dev / nodemon dev server
pnpm build        # TypeScript compile
pnpm start        # Run compiled output
pnpm typecheck    # TypeScript check
pnpm lint         # ESLint
pnpm test         # Vitest / Jest

# Database utilities
pnpm db:migrate   # Run pending migrations
pnpm db:seed      # Seed development data (dev only)
pnpm rebuild:stock-projections
pnpm rebuild:sales-projections
pnpm validate:projections
```

## Tauri Desktop Commands

```bash
cd apps/desktop

pnpm tauri dev          # Start desktop dev mode
pnpm tauri build        # Build installer

# Prerequisites: Rust toolchain, platform build dependencies
# Linux: sudo apt install libwebkit2gtk-4.1-dev build-essential
# Windows: Visual Studio Build Tools, WebView2
```

## Capacitor Mobile Commands

```bash
cd apps/mobile

pnpm cap:sync     # Sync web build to native projects
pnpm cap:android  # Open Android Studio
pnpm cap:build:android  # Build Android APK

# Prerequisites: Android SDK, ANDROID_HOME env var
# android/local.properties must point to SDK
```

## Docker Services

```bash
# Start local Redis (for BullMQ queue in development)
docker compose up redis -d

# Start full local stack (if preferred over Atlas)
docker compose up -d

# View logs
docker compose logs -f

# Stop services
docker compose down
```

## MongoDB Atlas Setup

1. Create a free M0 cluster at https://cloud.mongodb.com
2. Create a database user with read/write permissions
3. Add your IP to the network access list (or `0.0.0.0/0` for development)
4. Get the connection string from "Connect" → "Drivers"
5. Set `MONGODB_URI` in `apps/backend/.env`

## Environment Variables

See `apps/backend/.env.example` and `apps/frontend/.env.example` for all required variables.

The backend startup will check for required variables and exit with a clear error if any are missing.

## Branch Workflow

```bash
# Start a new feature
git checkout -b feat/frontend-auth

# Backend work
git checkout -b feat/backend-products

# Bug fix
git checkout -b fix/cart-tax-calculation

# Sync with main
git fetch origin
git rebase origin/main
```

## Commit Message Convention

Format: `type(scope): description`

Types: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `ci`, `perf`

Examples:
```
feat(auth): add refresh token rotation
fix(pos): correct tax calculation for tax-inclusive prices
docs(sync): document conflict resolution rules
test(ledger): add idempotency tests for sale completion
chore(deps): update rxdb to 15.x
```

## Troubleshooting

### pnpm install fails

```bash
# Clear pnpm cache
pnpm store prune
rm -rf node_modules
pnpm install
```

### TypeScript errors after dependency update

```bash
pnpm clean
pnpm install
pnpm typecheck
```

### MongoDB connection refused

- Verify `MONGODB_URI` in `apps/backend/.env`
- Check Atlas network access whitelist includes your IP
- Try connecting with MongoDB Compass to validate the URI

### Tauri build fails on Linux

```bash
# Install system dependencies
sudo apt install libwebkit2gtk-4.1-dev \
  build-essential \
  curl \
  wget \
  file \
  libssl-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev
```

### Port already in use

```bash
# Find and kill process using port 3000
fuser -k 3000/tcp
# Or port 5173
fuser -k 5173/tcp
```
