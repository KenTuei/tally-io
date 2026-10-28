# Tally.io — Implementation Roadmap

## Status Legend

- ✅ Complete — acceptance criteria met and verified
- 🔄 In Progress — actively being implemented
- ⏳ Pending — not yet started
- ❌ Blocked — requires external input or credential
- 🔬 Research — requires investigation before implementation

---

## Phase 0 — Environment and Repository

**Goal:** Verified foundation. Clean repo. Working dev workflow.

| Task | Status | Notes |
|------|--------|-------|
| Inspect machine, tools, runtime versions | ✅ | Node 20, Rust 1.91, Docker 29, Java 25 |
| Verify GitHub CLI or auth method | ❌ | gh CLI requires sudo to install; use token auth |
| Create GitHub repo `KenTuei/tally-io` | 🔄 | Requires PAT or manual creation |
| Initialize monorepo with pnpm workspaces | ✅ | pnpm 9.15.4 installed |
| Create `.gitignore`, `.env.example`, prettier, nvmrc | ✅ | Done |
| Create monorepo directory structure | ✅ | Done |
| Create documentation files | ✅ | ARCHITECTURE, DB_DESIGN, LEDGER, SYNC, SECURITY |
| Create Kiro steering files | 🔄 | In progress |
| Create GitHub Actions CI | ⏳ | |
| Initial commit and push | ⏳ | Waiting for GitHub repo |

**Acceptance criteria:** Repository and local project verified, development workflow documented, initial checks pass.

---

## Phase 1 — Application Foundation

**Goal:** Working frontend + backend + auth + tenant isolation.

| Task | Status | Notes |
|------|--------|-------|
| Frontend: React + Vite + TypeScript + Tailwind | ⏳ | |
| Frontend: shadcn/ui setup | ⏳ | |
| Frontend: Design system (colors, typography, spacing) | ⏳ | |
| Frontend: Application shell (sidebar, topbar, layout) | ⏳ | |
| Frontend: React Router setup | ⏳ | |
| Frontend: Zustand stores | ⏳ | |
| Frontend: TanStack Query setup | ⏳ | |
| Frontend: Auth pages (login, register, forgot password) | ⏳ | |
| Backend: Fastify + TypeScript setup | ⏳ | |
| Backend: MongoDB Atlas connection | ⏳ | |
| Backend: Health endpoint | ⏳ | |
| Backend: Auth module (register, login, refresh, logout) | ⏳ | |
| Backend: JWT + refresh token rotation | ⏳ | |
| Backend: Tenant middleware | ⏳ | |
| Backend: Role-based authorization | ⏳ | |
| Shared types package | ⏳ | |
| Shared validation schemas | ⏳ | |
| Initial auth tests | ⏳ | |
| Tenant isolation tests | ⏳ | |

**Acceptance criteria:** Frontend and backend run locally, authentication works, tenant isolation tested.

---

## Phase 2 — Products and Inventory

**Goal:** Authorized product and inventory management with auditable stock.

| Task | Status | Notes |
|------|--------|-------|
| Product CRUD API | ⏳ | |
| Product catalog UI | ⏳ | |
| Categories | ⏳ | |
| Product variants | ⏳ | |
| Barcode lookup | ⏳ | |
| Product import/export | ⏳ | |
| Inventory events (received, adjusted, etc.) | ⏳ | |
| Stock projections | ⏳ | |
| Low-stock alerts | ⏳ | |
| Inventory movement history | ⏳ | |
| Stock tests | ⏳ | |

**Acceptance criteria:** Authorized users can manage products and inventory with tested stock calculations and audit records.

---

## Phase 3 — Sales and Checkout

**Goal:** Complete cash sale end-to-end with ledger events.

| Task | Status | Notes |
|------|--------|-------|
| POS screen UI | ⏳ | |
| Product search and barcode in POS | ⏳ | |
| Cart management | ⏳ | |
| Discount and tax calculation | ⏳ | |
| Cash payment processing | ⏳ | |
| Sale completion and ledger event | ⏳ | |
| Receipt generation | ⏳ | |
| Held sales | ⏳ | |
| Sales history view | ⏳ | |
| Refund workflow | ⏳ | |
| Cash registers and shifts | ⏳ | |
| Sale and refund tests | ⏳ | |

**Acceptance criteria:** Complete cash sale and permitted refund work end-to-end with correct totals, stock changes, ledger events, and reports.

---

## Phase 4 — Event Ledger and Reporting

**Goal:** Auditable financial events and fast reports.

| Task | Status | Notes |
|------|--------|-------|
| Formal ledger event schemas | ⏳ | |
| Append-only ledger storage | ⏳ | |
| Idempotency enforcement | ⏳ | |
| Compensating events | ⏳ | |
| Sales projections | ⏳ | |
| Report endpoints | ⏳ | |
| Report UI (daily, weekly, monthly) | ⏳ | |
| Projection rebuild scripts | ⏳ | |
| Ledger integrity tests | ⏳ | |

---

## Phase 5 — Offline-First Sync

**Goal:** Offline sale survives restart, syncs once safely.

| Task | Status | Notes |
|------|--------|-------|
| RxDB setup and collections | ⏳ | |
| Local sale recording | ⏳ | |
| Outbox pattern | ⏳ | |
| Sync pull endpoint | ⏳ | |
| Sync push endpoint | ⏳ | |
| Server-side event validation | ⏳ | |
| Conflict detection | ⏳ | |
| Sync status UI | ⏳ | |
| Offline checkout tests | ⏳ | |
| Retry and idempotency tests | ⏳ | |

---

## Phase 6 — Desktop and Mobile

**Goal:** Tauri desktop and Capacitor Android builds.

| Task | Status | Notes |
|------|--------|-------|
| Tauri app setup | ⏳ | Rust available |
| Tauri app identity and icons | ⏳ | |
| Linux build instructions | ⏳ | |
| Windows build instructions | ⏳ | |
| Capacitor setup | ⏳ | Java 25 available |
| Android project generation | ⏳ | |
| Mobile-responsive layouts | ⏳ | |
| Camera barcode scanning | ⏳ | |
| Mobile offline persistence | ⏳ | |
| Android build instructions | ⏳ | |

---

## Phase 7 — Business Management

**Goal:** Customers, suppliers, purchasing, expenses, staff.

| Task | Status | Notes |
|------|--------|-------|
| Customer management | ⏳ | |
| Supplier management | ⏳ | |
| Purchase orders | ⏳ | |
| Goods receipts | ⏳ | |
| Expenses | ⏳ | |
| Staff and permissions UI | ⏳ | |
| Branch management | ⏳ | |
| Notification center | ⏳ | |

---

## Phase 8 — Integrations

**Goal:** M-Pesa, eTIMS pathway, email notifications.

| Task | Status | Notes |
|------|--------|-------|
| M-Pesa STK Push | ❌ | Needs sandbox credentials |
| M-Pesa callback handler | ❌ | Needs sandbox credentials |
| M-Pesa reconciliation | ❌ | |
| M-Pesa mock adapter | ⏳ | Can build without credentials |
| KRA eTIMS research | 🔬 | Research official docs |
| eTIMS integration boundary | ⏳ | |
| Email notifications | ❌ | Needs email provider credentials |
| Google Chat integration | ❌ | Needs credentials |

---

## Phase 9 — AI Assistant

**Goal:** Secure, tool-calling AI business assistant.

| Task | Status | Notes |
|------|--------|-------|
| Chat UI | ⏳ | |
| Gemini backend integration | ❌ | Needs GEMINI_API_KEY |
| Tool/function definitions | ⏳ | |
| Sales summary tool | ⏳ | |
| Stock alert tool | ⏳ | |
| Permission enforcement | ⏳ | |
| Offline fallback | ⏳ | |

---

## Phase 10 — SaaS and Production Readiness

| Task | Status | Notes |
|------|--------|-------|
| Subscription plans | ⏳ | |
| Entitlement service | ⏳ | |
| Platform admin area | ⏳ | |
| Security review | ⏳ | |
| Performance review | ⏳ | |
| Backup and restore docs | ⏳ | |
| Full CI pipeline | ⏳ | |
| Production deployment guide | ⏳ | |

---

## Required Credentials / External Input

| Item | Status | How to obtain |
|------|--------|--------------|
| GitHub PAT or SSH key for push | ❌ | Settings → Developer Settings → Personal Access Tokens |
| MongoDB Atlas URI | ❌ | Create free cluster at cloud.mongodb.com |
| M-Pesa Daraja sandbox credentials | ❌ | Register at developer.safaricom.co.ke |
| Google Gemini API key | ❌ | ai.google.dev / Google AI Studio |
| Email provider credentials | ❌ | SendGrid, Postmark, or SES account |
| KRA eTIMS developer access | 🔬 | KRA developer portal (research required) |

---

## Known Limitations

- GitHub CLI could not be installed without sudo; GitHub repo must be created manually or via PAT
- iOS build requires macOS — not available on this Linux machine; documented as future step
- M-Pesa, eTIMS, Gemini integrations awaiting credentials before full implementation

---

## Next Actions

1. **GitHub repo**: Create `KenTuei/tally-io` on GitHub (manual or via PAT). Confirm visibility (private recommended).
2. **MongoDB Atlas**: Create free M0 cluster, get URI, update `apps/backend/.env`
3. **Implement Phase 1**: Frontend and backend foundation, auth, tenant isolation
4. Continue through roadmap phases in order

_Last updated: 2026-10-29_
