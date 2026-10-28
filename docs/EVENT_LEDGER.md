# Tally.io — Event Ledger Architecture

## Purpose

The event ledger records important financial, inventory, and operational business events in an append-only manner. It is the source of audit truth. Materialized projections are derived from ledger events and can be rebuilt at any time.

---

## Ledger Event Envelope

Every ledger event shares this base structure:

```typescript
interface LedgerEvent {
  // Identity
  _id: string;                    // MongoDB ObjectId
  eventId: string;                // UUID v4, client-generated
  idempotencyKey: string;         // UUID v4, unique per business operation
  correlationId: string;          // links related events in one flow
  causationId?: string;           // eventId that caused this event

  // Scope
  organizationId: string;         // tenant ID - REQUIRED
  branchId?: string;              // branch scope where relevant
  deviceId: string;               // originating device

  // Event metadata
  eventType: LedgerEventType;     // enum (see below)
  schemaVersion: number;          // for migration
  entityType: string;             // sale, payment, inventory, etc.
  entityId: string;               // ID of the primary entity

  // Actor
  actorId: string;                // userId or system actor ID
  actorType: 'user' | 'system' | 'integration';

  // Timestamps
  clientTimestamp: string;        // ISO 8601, device clock
  serverTimestamp: string;        // ISO 8601, server acceptance time (authoritative)

  // Payload (event-specific, see below)
  payload: Record<string, unknown>;

  // Sync metadata
  syncBatchId?: string;           // if submitted via offline sync
  offlineCreated: boolean;        // true if created while offline
}
```

## Event Types

```typescript
enum LedgerEventType {
  // Sales
  SALE_CREATED = 'SALE_CREATED',
  SALE_HELD = 'SALE_HELD',
  SALE_COMPLETED = 'SALE_COMPLETED',
  SALE_VOIDED = 'SALE_VOIDED',

  // Payments
  PAYMENT_INITIATED = 'PAYMENT_INITIATED',
  PAYMENT_CONFIRMED = 'PAYMENT_CONFIRMED',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  PAYMENT_CANCELLED = 'PAYMENT_CANCELLED',

  // Refunds
  REFUND_REQUESTED = 'REFUND_REQUESTED',
  REFUND_APPROVED = 'REFUND_APPROVED',
  REFUND_COMPLETED = 'REFUND_COMPLETED',
  REFUND_DENIED = 'REFUND_DENIED',

  // Inventory
  INVENTORY_RECEIVED = 'INVENTORY_RECEIVED',
  INVENTORY_SOLD = 'INVENTORY_SOLD',
  INVENTORY_ADJUSTED = 'INVENTORY_ADJUSTED',
  INVENTORY_TRANSFERRED = 'INVENTORY_TRANSFERRED',
  INVENTORY_RETURNED_TO_STOCK = 'INVENTORY_RETURNED_TO_STOCK',
  INVENTORY_RETURNED_TO_SUPPLIER = 'INVENTORY_RETURNED_TO_SUPPLIER',
  STOCKTAKE_COMPLETED = 'STOCKTAKE_COMPLETED',
  STOCK_DAMAGED = 'STOCK_DAMAGED',
  STOCK_EXPIRED = 'STOCK_EXPIRED',

  // Cash & Shifts
  SHIFT_OPENED = 'SHIFT_OPENED',
  SHIFT_CLOSED = 'SHIFT_CLOSED',
  CASH_IN = 'CASH_IN',
  CASH_OUT = 'CASH_OUT',

  // Expenses
  EXPENSE_RECORDED = 'EXPENSE_RECORDED',
  EXPENSE_APPROVED = 'EXPENSE_APPROVED',
  EXPENSE_REJECTED = 'EXPENSE_REJECTED',

  // Purchasing
  PURCHASE_ORDER_CREATED = 'PURCHASE_ORDER_CREATED',
  GOODS_RECEIVED = 'GOODS_RECEIVED',

  // Customers (credit, if enabled)
  CUSTOMER_CREDIT_ISSUED = 'CUSTOMER_CREDIT_ISSUED',
  CUSTOMER_CREDIT_REPAID = 'CUSTOMER_CREDIT_REPAID',
}
```

---

## Event Payload Schemas

### SALE_COMPLETED

```typescript
{
  receiptNumber: string;
  branchId: string;
  registerId: string;
  shiftId: string;
  cashierId: string;
  customerId?: string;
  lineItems: Array<{
    productId: string;
    variantId?: string;
    productName: string;
    sku: string;
    quantity: number;        // integer, base units
    unitPrice: number;       // integer, cents
    costPrice: number;       // integer, cents
    discountAmount: number;  // integer, cents
    taxAmount: number;       // integer, cents
    lineTotal: number;       // integer, cents
  }>;
  subtotal: number;          // cents
  discountAmount: number;    // cents
  taxAmount: number;         // cents
  total: number;             // cents
  currency: string;          // ISO 4217
  paymentMethods: Array<{
    method: string;
    amount: number;          // cents
    reference?: string;
  }>;
  offlineCreated: boolean;
}
```

### PAYMENT_CONFIRMED

```typescript
{
  saleId: string;
  paymentAttemptId: string;
  method: string;
  amount: number;             // cents
  currency: string;
  reference: string;          // provider transaction reference
  confirmedAt: string;        // ISO 8601 (provider timestamp)
  providerCode?: string;      // e.g. M-Pesa result code
}
```

### INVENTORY_RECEIVED

```typescript
{
  purchaseOrderId?: string;
  goodsReceiptId: string;
  supplierId: string;
  items: Array<{
    productId: string;
    variantId?: string;
    quantity: number;
    unitCost: number;       // cents
    batchNumber?: string;
    expiryDate?: string;
  }>;
}
```

### SHIFT_CLOSED

```typescript
{
  registerId: string;
  cashierId: string;
  openingFloat: number;       // cents
  expectedCash: number;       // cents (calculated)
  closingCount: number;       // cents (physically counted)
  variance: number;           // cents (closingCount - expectedCash)
  totalSales: number;         // cents, during shift
  totalCashSales: number;     // cents
  cashIn: number;             // cents
  cashOut: number;            // cents
  notes?: string;
}
```

---

## Ledger Rules

1. **Append-only**: No UPDATE or DELETE on accepted `ledgerEvents` documents
2. **Idempotency**: `idempotencyKey` has a unique sparse index. Duplicate submissions return the original accepted event without side-effects
3. **Compensating events**: Corrections use `REFUND_*`, `INVENTORY_ADJUSTED`, etc. Never edit the original event
4. **Tenant validation**: `organizationId` in the event payload must match the authenticated session's organization
5. **Server timestamps**: `serverTimestamp` is set by the server, never trusted from the client
6. **Atomic writes**: Financial events are written in MongoDB transactions alongside their associated document changes
7. **Validation**: Every event payload is validated against its schema version before acceptance
8. **State transitions**: Legal state transitions are enforced in the service layer before the ledger event is written

---

## Projection Strategy

### Stock Projections

Updated synchronously within the same MongoDB transaction as `INVENTORY_*` events:

```
INVENTORY_RECEIVED → stockProjection.quantityOnHand += received quantity
INVENTORY_SOLD     → stockProjection.quantityOnHand -= sold quantity
INVENTORY_ADJUSTED → stockProjection.quantityOnHand = adjusted value
```

### Sales Projections (async)

Updated via background job after `SALE_COMPLETED`:

- Daily sales totals per branch
- Product performance aggregates
- Cashier performance per shift

### Rebuilding Projections

```bash
# Rebuild stock projections from inventoryEvents
pnpm --filter ./apps/backend rebuild:stock-projections

# Rebuild sales projections from ledgerEvents
pnpm --filter ./apps/backend rebuild:sales-projections

# Validate projections against events
pnpm --filter ./apps/backend validate:projections
```

---

## Audit Trail Access

Authorized users (roles: owner, admin, accountant, auditor) can query:
- `GET /api/v1/ledger/events?entityType=sale&entityId=:id`
- `GET /api/v1/ledger/events?type=PAYMENT_CONFIRMED&from=:date&to=:date`
- `GET /api/v1/audit-logs?action=sale.voided`

Responses are paginated and always filtered by `organizationId` from the session token.

---

## Offline Ledger Events

Events created offline:
1. Stored in RxDB outbox with `offlineCreated: true`
2. Assigned a client-generated `eventId` and `idempotencyKey`
3. Submitted to `/api/v1/sync/push` when online
4. Server validates, checks idempotency, sets `serverTimestamp`
5. Server returns accepted/rejected status per event
6. Client updates outbox record with sync result

---

## Retention

- `ledgerEvents`: retain indefinitely (financial audit requirement)
- `auditLogs`: retain minimum 7 years (Kenyan regulatory default)
- `inventoryEvents`: retain minimum 5 years
- Personal data in events: reviewed per privacy requirements; avoid storing unnecessary PII in immutable records
