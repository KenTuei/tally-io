# Tally.io — Offline-First Synchronization Protocol

## Design Goals

1. Core POS operations (product search, sales, receipts) work without internet
2. All offline operations durably persist before UI confirms them
3. Sync is explicit, versioned, and idempotent
4. Server is the authority on financial truth
5. Conflicts are detected and surfaced — never silently resolved
6. No cross-tenant data leaks through sync endpoints

---

## RxDB Collections (Local Schema)

```typescript
// Local product cache
rxdb.products         // synced from server, read-only locally
rxdb.categories       // synced from server
rxdb.taxRates         // synced from server
rxdb.branchConfig     // synced from server

// Locally writable
rxdb.localSales       // offline sales
rxdb.localSaleItems   // line items
rxdb.localPayments    // payment attempts
rxdb.localInventoryMoves  // inventory movements
rxdb.customers        // bidirectional

// Infrastructure
rxdb.outbox           // pending operations queue
rxdb.syncMetadata     // cursors, device info, last sync time
rxdb.conflictLog      // detected conflicts awaiting resolution
```

---

## Sync Protocol Overview

```
CLIENT                              SERVER
  │                                   │
  │──── GET /api/v1/sync/pull ──────► │
  │     { cursor, limit, deviceId }   │
  │◄─── { events[], nextCursor, ... } │
  │     Apply pulled events to RxDB   │
  │     Update pull cursor            │
  │                                   │
  │     (user creates offline sale)   │
  │     Persist to rxdb.localSales    │
  │     Write to rxdb.outbox          │
  │                                   │
  │──── POST /api/v1/sync/push ─────► │
  │     { operations[], batchId }     │
  │◄─── { results[]: {               │
  │         operationId,              │
  │         status: accepted|         │
  │                 rejected|         │
  │                 conflict,         │
  │         serverEventId?,           │
  │         reason?,                  │
  │         conflictData?             │
  │       }                           │
  │     }                             │
  │     Update outbox records         │
  │     Handle conflicts              │
```

---

## Pull Protocol

### Request

```
GET /api/v1/sync/pull
Authorization: Bearer <token>
X-Device-Id: <deviceId>

Query params:
  cursor      - opaque string from previous response (omit for initial sync)
  limit       - max events per page (default 100, max 500)
  collections - comma-separated: products,customers,taxRates (omit for all)
```

### Response

```typescript
{
  batchId: string;
  cursor: string;          // pass to next pull request
  nextCursor: string;      // use when hasMore is true
  hasMore: boolean;
  events: Array<{
    collection: string;    // 'products', 'customers', etc.
    operation: 'upsert' | 'delete' | 'archive';
    documentId: string;
    document?: Record<string, unknown>;  // omitted on delete
    serverTimestamp: string;
    checksum: string;      // for integrity verification
  }>;
  serverTime: string;      // server's current UTC time
  schemaVersions: Record<string, number>;  // collection → schema version
}
```

### Cursor design

The cursor is an opaque base64-encoded object containing:
```json
{
  "ts": "2026-10-29T12:00:00.000Z",   // last event timestamp
  "lastId": "507f1f77bcf86cd799439011"  // for tie-breaking
}
```

Never expose cursor internals to the client or allow clients to forge them.

---

## Push Protocol

### Request

```
POST /api/v1/sync/push
Authorization: Bearer <token>
X-Device-Id: <deviceId>

{
  batchId: string;        // UUID, unique per batch submission
  operations: Array<{
    operationId: string;  // UUID, unique per operation
    idempotencyKey: string;
    type: string;         // 'SALE_COMPLETED', 'INVENTORY_ADJUSTMENT', etc.
    payload: Record<string, unknown>;
    clientTimestamp: string;
    schemaVersion: number;
  }>
}
```

### Response

```typescript
{
  batchId: string;
  processedAt: string;
  results: Array<{
    operationId: string;
    idempotencyKey: string;
    status: 'accepted' | 'rejected' | 'conflict' | 'duplicate';
    serverEventId?: string;   // on accepted
    serverTimestamp?: string; // on accepted
    reason?: string;          // on rejected or conflict
    conflictData?: {
      serverVersion: Record<string, unknown>;
      hint: string;
    };
  }>;
}
```

### Server validation steps

For each pushed operation:

1. Authenticate user (token validity, revocation check)
2. Resolve `organizationId` from token — reject if `payload.organizationId` differs
3. Check `idempotencyKey` in MongoDB unique index — if exists, return `duplicate` status with original `serverEventId`
4. Validate payload schema against the declared `schemaVersion`
5. Validate business rules (legal state transitions, non-negative stock, permission check)
6. Execute in MongoDB transaction
7. Write `ledgerEvent` with `serverTimestamp`
8. Return accepted status

---

## Outbox Design

Every locally-initiated operation writes to the outbox before the UI confirms:

```typescript
// RxDB outbox schema
{
  id: string;              // UUID
  operationId: string;     // matches push operation ID
  idempotencyKey: string;
  type: string;
  payload: string;         // JSON-serialized
  status: 'pending' | 'submitted' | 'accepted' | 'rejected' | 'conflict';
  attempts: number;
  lastAttemptAt?: string;
  serverEventId?: string;
  errorMessage?: string;
  createdAt: string;
}
```

Outbox processor:
1. Query all `status: 'pending'` records, sorted by `createdAt`
2. Batch up to 50 records into one push request
3. On response: update each record with status, serverEventId, errorMessage
4. `accepted` items: update local RxDB documents with server-confirmed IDs
5. `rejected` items: log error, notify user, mark for manual review
6. `conflict` items: write to `conflictLog`, notify user
7. Retry with exponential backoff: 5s, 30s, 2m, 10m, 1h

---

## Conflict Handling Rules

| Data type | Strategy |
|-----------|---------|
| Product catalog | Server-authoritative. Client overwrites local on pull. |
| Customer contact info | Last-write-wins with conflict notification if both sides changed in the same sync window. |
| Sales | Never overwrite. Each device's sales are independent. Offline sales sync as new records. |
| Inventory movements | Append-only movements, not balance replacement. Stock conflicts reported after sync. |
| Cash shift | One shift per register at a time; register lock prevents concurrent open shifts. |
| Payments | Never trust client-side payment status. Confirmed only via server-side provider callback. |

### Stock over-sell scenario

Two devices sell the last unit offline:

1. Both sales sync successfully (stock movements are not rejected)
2. Server calculates resulting stock projection: goes to -1
3. Server creates a `STOCK_CONFLICT` notification for the branch manager
4. Branch manager reviews and creates an adjustment or purchase order
5. Both sale records are valid and auditable

This is the correct behavior — reject both sales is worse than managing a brief stockout.

---

## Offline UX Requirements

The sync status indicator must show:

- 🟢 **Online — synced** (all outbox items accepted)
- 🟡 **Online — syncing** (X items pending)
- 🟠 **Online — sync issues** (Y items rejected or in conflict)
- 🔴 **Offline** (no connectivity)

Last sync time always visible. Pending count in notification badge.

---

## Recovery Scenarios

### Application restarted while offline

- RxDB persists in IndexedDB/SQLite across restarts
- Outbox records survive restart
- On next launch, processor resumes from pending outbox records
- User sees "X unsynchronized transactions" on the sync status indicator

### Long offline period (days)

- On reconnect, run a full pull (no cursor) to get all changes since last sync
- Then push pending outbox
- Schema version handshake ensures compatibility

### Incompatible schema

- Client sends `schemaVersion` per collection
- Server returns `409 Conflict` with required migration info
- Client prompts user to update the app
- No data is lost — outbox is preserved

---

## Security

- Pull responses never include another tenant's data (always filtered by `organizationId` from token)
- Push operations always use `organizationId` from token, ignoring any `organizationId` in the payload
- Cursors are opaque and server-validated; forged cursors return a 400 error
- Device registration is required before sync is permitted
- Deregistered devices are denied sync access
