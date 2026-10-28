# Tally.io — Database Design

## Overview

MongoDB Atlas is the primary cloud database. All collections enforce tenant isolation via `organizationId`. Transactions are used for multi-document financial writes.

---

## Naming Conventions

- Collections: camelCase plural (`saleItems`, `ledgerEvents`)
- Fields: camelCase (`createdAt`, `organizationId`)
- IDs: MongoDB ObjectId stored as string in application layer
- Monetary amounts: stored as integers in the **smallest currency unit** (e.g. Kenya Shillings cents × 100). Never floats.
- Timestamps: ISO 8601 UTC strings

---

## Collections

### `users`

Stores authentication identities. NOT organization-scoped — a user can belong to multiple organizations.

| Field | Type | Notes |
|-------|------|-------|
| `_id` | ObjectId | |
| `email` | string | unique, indexed, lowercase |
| `passwordHash` | string | bcrypt, never returned to client |
| `firstName` | string | |
| `lastName` | string | |
| `phone` | string | optional |
| `emailVerified` | boolean | |
| `emailVerificationToken` | string | nullable, hashed |
| `passwordResetToken` | string | nullable, hashed |
| `passwordResetExpiry` | Date | nullable |
| `isActive` | boolean | |
| `lastLoginAt` | Date | nullable |
| `createdAt` | Date | |
| `updatedAt` | Date | |

Indexes: `email` (unique), `emailVerificationToken`, `passwordResetToken`

### `organizations`

Top-level tenant entity.

| Field | Type | Notes |
|-------|------|-------|
| `_id` | ObjectId | |
| `name` | string | business name |
| `slug` | string | unique URL-safe identifier |
| `businessType` | enum | retail, wholesale, restaurant, hardware, agrovet, pharmacy, salon, service |
| `currency` | string | ISO 4217 e.g. KES |
| `country` | string | ISO 3166-1 alpha-2 |
| `timezone` | string | IANA timezone |
| `contactEmail` | string | |
| `contactPhone` | string | |
| `address` | object | street, city, county, country |
| `logo` | string | URL |
| `taxNumber` | string | KRA PIN |
| `vatRegistered` | boolean | |
| `subscriptionId` | ObjectId | ref: subscriptions |
| `isActive` | boolean | |
| `createdAt` | Date | |
| `updatedAt` | Date | |

Indexes: `slug` (unique)

### `memberships`

Links users to organizations with roles.

| Field | Type | Notes |
|-------|------|-------|
| `_id` | ObjectId | |
| `organizationId` | ObjectId | ref: organizations |
| `userId` | ObjectId | ref: users |
| `role` | enum | owner, admin, manager, accountant, inventory_manager, cashier, salesperson, auditor |
| `branchIds` | ObjectId[] | branches this user can access (empty = all) |
| `isActive` | boolean | |
| `invitedBy` | ObjectId | ref: users |
| `invitedAt` | Date | |
| `acceptedAt` | Date | nullable |
| `createdAt` | Date | |
| `updatedAt` | Date | |

Indexes: `{ organizationId, userId }` (unique compound), `userId`

### `branches`

Physical or logical business locations.

| Field | Type | Notes |
|-------|------|-------|
| `_id` | ObjectId | |
| `organizationId` | ObjectId | tenant scope |
| `name` | string | |
| `code` | string | short identifier |
| `address` | object | |
| `phone` | string | |
| `email` | string | |
| `isMainBranch` | boolean | |
| `isActive` | boolean | |
| `createdAt` | Date | |
| `updatedAt` | Date | |

Indexes: `organizationId`, `{ organizationId, code }` (unique)

### `registers`

POS terminals/cash registers within a branch.

| Field | Type | Notes |
|-------|------|-------|
| `_id` | ObjectId | |
| `organizationId` | ObjectId | |
| `branchId` | ObjectId | |
| `name` | string | |
| `deviceId` | string | physical device identifier |
| `isActive` | boolean | |
| `currentShiftId` | ObjectId | nullable, ref: shifts |
| `createdAt` | Date | |
| `updatedAt` | Date | |

### `products`

Product catalog. Inventory stock is tracked separately via `inventoryEvents`.

| Field | Type | Notes |
|-------|------|-------|
| `_id` | ObjectId | |
| `organizationId` | ObjectId | |
| `name` | string | |
| `description` | string | |
| `sku` | string | |
| `barcode` | string | EAN-13, QR, etc. |
| `categoryId` | ObjectId | ref: categories |
| `brandId` | ObjectId | ref: brands (optional) |
| `unitOfMeasure` | string | piece, kg, litre, etc. |
| `hasVariants` | boolean | |
| `costPrice` | integer | cents |
| `sellingPrice` | integer | cents |
| `wholesalePrice` | integer | nullable, cents |
| `taxRateId` | ObjectId | ref: taxRates |
| `taxInclusive` | boolean | |
| `supplierId` | ObjectId | optional ref |
| `images` | string[] | URLs |
| `isActive` | boolean | |
| `isService` | boolean | non-stock item |
| `lowStockThreshold` | integer | units |
| `trackInventory` | boolean | |
| `allowNegativeStock` | boolean | |
| `batchTracking` | boolean | |
| `expiryTracking` | boolean | |
| `importedAt` | Date | nullable |
| `createdAt` | Date | |
| `updatedAt` | Date | |

Indexes: `organizationId`, `{ organizationId, sku }` (unique), `{ organizationId, barcode }`, text index on `name`

### `productVariants`

Size, color, and other variant combinations.

| Field | Type | Notes |
|-------|------|-------|
| `_id` | ObjectId | |
| `organizationId` | ObjectId | |
| `productId` | ObjectId | |
| `name` | string | e.g. "Red / Large" |
| `sku` | string | |
| `barcode` | string | |
| `attributes` | object | { color: "Red", size: "L" } |
| `costPrice` | integer | nullable, overrides parent |
| `sellingPrice` | integer | nullable, overrides parent |
| `isActive` | boolean | |
| `createdAt` | Date | |
| `updatedAt` | Date | |

### `categories`

Hierarchical product categories.

| Field | Type | Notes |
|-------|------|-------|
| `_id` | ObjectId | |
| `organizationId` | ObjectId | |
| `name` | string | |
| `parentId` | ObjectId | nullable, for sub-categories |
| `sortOrder` | integer | |
| `isActive` | boolean | |
| `createdAt` | Date | |

### `sales`

Sale header records.

| Field | Type | Notes |
|-------|------|-------|
| `_id` | ObjectId | |
| `organizationId` | ObjectId | |
| `branchId` | ObjectId | |
| `registerId` | ObjectId | |
| `shiftId` | ObjectId | |
| `receiptNumber` | string | formatted, indexed |
| `status` | enum | draft, held, pending_payment, completed, partially_refunded, refunded, voided |
| `customerId` | ObjectId | nullable |
| `cashierId` | ObjectId | ref: users |
| `subtotal` | integer | cents before discount |
| `discountAmount` | integer | cents |
| `taxAmount` | integer | cents |
| `total` | integer | cents after disc + tax |
| `amountPaid` | integer | cents |
| `change` | integer | cents |
| `notes` | string | |
| `deviceId` | string | originating device |
| `offlineId` | string | nullable, client-generated idempotency key |
| `syncStatus` | enum | local, synced, conflict |
| `completedAt` | Date | nullable |
| `voidedAt` | Date | nullable |
| `voidedBy` | ObjectId | nullable |
| `voidReason` | string | |
| `createdAt` | Date | |
| `updatedAt` | Date | |

Indexes: `organizationId`, `{ organizationId, receiptNumber }` (unique), `{ organizationId, branchId, completedAt }`, `offlineId` (sparse unique), `customerId`

### `saleItems`

Line items for each sale.

| Field | Type | Notes |
|-------|------|-------|
| `_id` | ObjectId | |
| `organizationId` | ObjectId | |
| `saleId` | ObjectId | |
| `productId` | ObjectId | |
| `variantId` | ObjectId | nullable |
| `productName` | string | snapshot at time of sale |
| `sku` | string | snapshot |
| `barcode` | string | snapshot |
| `quantity` | integer | in base units × 1000 for fractional |
| `unitPrice` | integer | cents |
| `costPrice` | integer | cents at time of sale |
| `discountAmount` | integer | cents |
| `taxAmount` | integer | cents |
| `lineTotal` | integer | cents |
| `createdAt` | Date | |

Indexes: `saleId`, `{ organizationId, productId }`

### `paymentAttempts`

All payment attempts, successful or not.

| Field | Type | Notes |
|-------|------|-------|
| `_id` | ObjectId | |
| `organizationId` | ObjectId | |
| `saleId` | ObjectId | |
| `method` | enum | cash, mpesa, card, bank_transfer, other |
| `amount` | integer | cents |
| `currency` | string | ISO 4217 |
| `status` | enum | pending, confirmed, failed, cancelled, refunded |
| `reference` | string | provider transaction ID |
| `providerResponse` | object | raw provider callback (no secrets) |
| `idempotencyKey` | string | unique per attempt |
| `initiatedAt` | Date | |
| `confirmedAt` | Date | nullable |
| `failedAt` | Date | nullable |
| `createdAt` | Date | |

Indexes: `saleId`, `{ organizationId, reference }` (sparse), `idempotencyKey` (unique)

### `inventoryEvents`

Append-only inventory movement ledger.

| Field | Type | Notes |
|-------|------|-------|
| `_id` | ObjectId | |
| `organizationId` | ObjectId | |
| `branchId` | ObjectId | |
| `productId` | ObjectId | |
| `variantId` | ObjectId | nullable |
| `type` | enum | received, sold, adjusted, transferred_in, transferred_out, returned_to_stock, returned_to_supplier, stocktake, damaged, expired |
| `quantity` | integer | signed delta |
| `unitCost` | integer | nullable, cents |
| `referenceType` | enum | sale, purchase_order, adjustment, transfer, stocktake |
| `referenceId` | ObjectId | link to source document |
| `reason` | string | |
| `actorId` | ObjectId | ref: users |
| `deviceId` | string | |
| `idempotencyKey` | string | |
| `batchNumber` | string | nullable |
| `expiryDate` | Date | nullable |
| `createdAt` | Date | |

Indexes: `{ organizationId, productId, branchId }`, `{ organizationId, branchId, type, createdAt }`, `idempotencyKey` (unique)

### `ledgerEvents`

Append-only financial event ledger.

See [EVENT_LEDGER.md](EVENT_LEDGER.md) for full schema.

### `stockProjections`

Materialized stock-on-hand per product/branch.

| Field | Type | Notes |
|-------|------|-------|
| `_id` | ObjectId | |
| `organizationId` | ObjectId | |
| `branchId` | ObjectId | |
| `productId` | ObjectId | |
| `variantId` | ObjectId | nullable |
| `quantityOnHand` | integer | |
| `lastInventoryEventId` | ObjectId | cursor |
| `updatedAt` | Date | |

Indexes: `{ organizationId, branchId, productId, variantId }` (unique)

### `shifts`

Cashier shift records.

| Field | Type | Notes |
|-------|------|-------|
| `_id` | ObjectId | |
| `organizationId` | ObjectId | |
| `branchId` | ObjectId | |
| `registerId` | ObjectId | |
| `cashierId` | ObjectId | |
| `status` | enum | open, closed |
| `openingFloat` | integer | cents |
| `expectedCash` | integer | computed cents |
| `closingCount` | integer | nullable, actual cash counted |
| `variance` | integer | nullable, cents |
| `openedAt` | Date | |
| `closedAt` | Date | nullable |
| `closedBy` | ObjectId | nullable |
| `notes` | string | |
| `createdAt` | Date | |

### `expenses`

| Field | Type | Notes |
|-------|------|-------|
| `_id` | ObjectId | |
| `organizationId` | ObjectId | |
| `branchId` | ObjectId | |
| `categoryId` | ObjectId | ref: expenseCategories |
| `amount` | integer | cents |
| `currency` | string | |
| `paymentMethod` | enum | cash, mpesa, card, bank_transfer |
| `supplierId` | ObjectId | nullable |
| `payeeName` | string | |
| `reference` | string | |
| `notes` | string | |
| `attachments` | string[] | URLs |
| `date` | Date | |
| `approvedBy` | ObjectId | nullable |
| `status` | enum | pending, approved, rejected |
| `recordedBy` | ObjectId | |
| `createdAt` | Date | |
| `updatedAt` | Date | |

### `customers`

| Field | Type | Notes |
|-------|------|-------|
| `_id` | ObjectId | |
| `organizationId` | ObjectId | |
| `name` | string | |
| `phone` | string | |
| `email` | string | nullable |
| `address` | object | nullable |
| `notes` | string | |
| `creditAllowed` | boolean | |
| `creditLimit` | integer | nullable, cents |
| `isActive` | boolean | |
| `createdAt` | Date | |
| `updatedAt` | Date | |

Indexes: `{ organizationId, phone }`, text index on `name`

### `suppliers`

| Field | Type | Notes |
|-------|------|-------|
| `_id` | ObjectId | |
| `organizationId` | ObjectId | |
| `name` | string | |
| `contactPerson` | string | |
| `phone` | string | |
| `email` | string | |
| `address` | object | |
| `notes` | string | |
| `isActive` | boolean | |
| `createdAt` | Date | |
| `updatedAt` | Date | |

### `purchaseOrders`

| Field | Type | Notes |
|-------|------|-------|
| `_id` | ObjectId | |
| `organizationId` | ObjectId | |
| `branchId` | ObjectId | |
| `supplierId` | ObjectId | |
| `orderNumber` | string | |
| `status` | enum | draft, submitted, partially_received, received, cancelled |
| `items` | array | productId, quantity, unitCost |
| `subtotal` | integer | cents |
| `total` | integer | cents |
| `expectedDelivery` | Date | nullable |
| `notes` | string | |
| `createdBy` | ObjectId | |
| `createdAt` | Date | |
| `updatedAt` | Date | |

### `goodsReceipts`

| Field | Type | Notes |
|-------|------|-------|
| `_id` | ObjectId | |
| `organizationId` | ObjectId | |
| `branchId` | ObjectId | |
| `purchaseOrderId` | ObjectId | nullable |
| `supplierId` | ObjectId | |
| `receiptNumber` | string | |
| `items` | array | productId, quantityOrdered, quantityReceived, unitCost |
| `notes` | string | |
| `receivedBy` | ObjectId | |
| `receivedAt` | Date | |
| `createdAt` | Date | |

### `subscriptions`

| Field | Type | Notes |
|-------|------|-------|
| `_id` | ObjectId | |
| `organizationId` | ObjectId | |
| `plan` | enum | trial, starter, professional, enterprise |
| `status` | enum | trialing, active, past_due, cancelled, expired |
| `trialEndsAt` | Date | nullable |
| `currentPeriodStart` | Date | |
| `currentPeriodEnd` | Date | |
| `limits` | object | maxBranches, maxUsers, maxRegisters, features[] |
| `billingProvider` | string | |
| `billingReference` | string | |
| `createdAt` | Date | |
| `updatedAt` | Date | |

### `auditLogs`

| Field | Type | Notes |
|-------|------|-------|
| `_id` | ObjectId | |
| `organizationId` | ObjectId | nullable (platform events have no org) |
| `actorId` | ObjectId | ref: users |
| `actorType` | enum | user, system, integration |
| `action` | string | e.g. sale.voided, user.created |
| `entityType` | string | |
| `entityId` | ObjectId | |
| `changes` | object | before/after snapshot (no secrets) |
| `ipAddress` | string | |
| `userAgent` | string | |
| `correlationId` | string | |
| `createdAt` | Date | |

Indexes: `{ organizationId, createdAt }`, `{ actorId, createdAt }`, `{ entityType, entityId }`

### `synchronizationCursors`

Tracks per-device sync state.

| Field | Type | Notes |
|-------|------|-------|
| `_id` | ObjectId | |
| `organizationId` | ObjectId | |
| `deviceId` | string | |
| `lastPullCursor` | string | opaque cursor for incremental pull |
| `lastPushAck` | string | last acknowledged push batch ID |
| `updatedAt` | Date | |

Indexes: `{ organizationId, deviceId }` (unique)

### `deviceRegistrations`

| Field | Type | Notes |
|-------|------|-------|
| `_id` | ObjectId | |
| `organizationId` | ObjectId | |
| `branchId` | ObjectId | |
| `deviceId` | string | stable client-generated UUID |
| `deviceType` | enum | web, desktop, mobile |
| `platform` | string | linux, windows, android, ios |
| `appVersion` | string | |
| `registeredBy` | ObjectId | |
| `lastSeenAt` | Date | |
| `isActive` | boolean | |
| `createdAt` | Date | |

---

## Projection Rebuild Strategy

All projections (stockProjections, salesProjections) can be rebuilt from source events:

1. Truncate the projection collection
2. Replay events in chronological order from `inventoryEvents` or `ledgerEvents`
3. Apply each event to the projection
4. Validate totals against known checkpoints
5. Restore the last processed event cursor

This is a manual admin operation. Provide a documented script in `infrastructure/scripts/rebuild-projections.ts`.

---

## Transaction Usage

MongoDB transactions are required for:

- Sale completion (sale + saleItems + paymentAttempt + ledgerEvent + stockProjection update)
- Refund processing (ledgerEvent + stockProjection update + paymentAttempt)
- Goods receipt (goodsReceipt + inventoryEvents + stockProjection updates)
- Cash shift close (shift update + ledgerEvent)

All transactions operate on the same tenant's documents. Cross-tenant transactions are never permitted.
