# Data Model: Explicit Offset Entry Semantics for QBO Actuals Corrections

**Feature**: 040-qbo-offset-entry-semantics  
**Date**: 2026-06-19

## Modified Entity: QboSyncLedger

Append-only audit trail extended with typed entries. Multiple rows may share the same `qbo_transaction_id` when offset corrections exist.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK, default `gen_random_uuid()` | Unchanged |
| event_id | UUID | FK → events.id, NOT NULL | Unchanged |
| qbo_transaction_id | VARCHAR(100) | NOT NULL | Intuit transaction ID — shared across original + offsets |
| qbo_account_id | VARCHAR(100) | NOT NULL | Unchanged |
| amount | NUMERIC(12,2) | NOT NULL | Original ingest amount or net-to-target offset delta |
| transaction_date | DATE | NOT NULL | From upstream txn (offsets inherit corrected txn date) |
| mapped_line_item_id | UUID | FK → financial_line_items.id, NULL | Unchanged |
| sync_batch_id | UUID | NOT NULL | Unchanged |
| synced_at | TIMESTAMPTZ | NOT NULL, default `NOW()` | Unchanged |
| **entry_type** | VARCHAR(20) | NOT NULL, default `'Original'` | `Original` \| `OffsetCorrection` |
| **correction_type** | VARCHAR(20) | NULL | `AmountChange` \| `VoidRemoval`; NULL when `Original` |
| **target_state_absent** | BOOLEAN | NULL | `true` for void/removal idempotency; NULL for amount-change |
| **target_state_amount** | NUMERIC(12,2) | NULL | Target upstream amount for amount-change idempotency |
| **corrected_ledger_entry_id** | UUID | FK → qbo_sync_ledger.id, NULL | Original row this offset corrects |

**Relationships**: Unchanged event/line-item FKs. Self-referential FK `corrected_ledger_entry_id → qbo_sync_ledger.id` (optional, SET NULL on delete prohibited — append-only, no deletes).

**Indexes** (migration replaces `IX_qbo_sync_ledger_event_txn`):

| Index | Columns | Filter | Purpose |
|-------|---------|--------|---------|
| `IX_qbo_sync_ledger_event_txn_original` | `(event_id, qbo_transaction_id)` | `entry_type = 'Original'` | One original ingest per txn (idempotent insert) |
| `IX_qbo_sync_ledger_offset_idempotency` | `(event_id, qbo_transaction_id, correction_type, target_state_absent, target_state_amount)` | `entry_type = 'OffsetCorrection'` | FR-007 idempotency |
| `IX_qbo_sync_ledger_mapped_line_item_id` | `mapped_line_item_id` | — | Unchanged — SUM aggregation |
| `IX_qbo_sync_ledger_entry_type` | `(event_id, entry_type)` | — | Correction badge query |

**Immutability**: INSERT-only in production paths. No UPDATE or DELETE (Constitution IV; FR-001).

**Query filter**: Unchanged — `OrganizationId == null || Event.Venue.OrganizationId == OrganizationId`.

## Enums

### QboSyncLedgerEntryType

| Value | Description |
|-------|-------------|
| `Original` | First-time ingestion of an upstream transaction |
| `OffsetCorrection` | Append-only balancing entry correcting upstream drift |

### QboSyncCorrectionType

| Value | Description |
|-------|-------------|
| `AmountChange` | Upstream amount differs from current net ledger sum |
| `VoidRemoval` | Upstream transaction absent from fetch; net brought to zero |

## Consumed Entities (unchanged schema)

### FinancialLineItem

| Field | Usage |
|-------|-------|
| `qbo_actual_value` | Recomputed as `SUM(qbo_sync_ledger.amount)` where `mapped_line_item_id = id` (includes offsets). Updated on all event statuses including SETTLED/RECONCILED during sync. |

### LineItemDto (API projection — extended)

| Field | Type | Source |
|-------|------|--------|
| `hasQboCorrection` | bool | `EXISTS` offset entries mapped to line item |

## Validation Rules

- **entry_type**: required; must be valid enum value.
- **correction_type**: required when `entry_type = OffsetCorrection`; must be NULL when `Original`.
- **target_state_absent**: required (`true`) for `VoidRemoval`; NULL for `AmountChange`.
- **target_state_amount**: required for `AmountChange`; NULL for `VoidRemoval`.
- **amount (offset)**: `target_upstream_amount - net_sum(existing rows for txn)` for amount changes; `0 - net_sum` for void/removal.
- **corrected_ledger_entry_id**: SHOULD reference the `Original` row for the same `qbo_transaction_id` when available.
- **amount**: all values `decimal`; rounding `MidpointRounding.AwayFromZero` at persistence boundaries.

## Sync Flow (Updated State Machine)

```
[Fetch upstream transactions by event tag]
      │
      ▼
[Advisory lock event]
      │
      ▼
[Phase 1: Ingest NEW transaction IDs] ──► INSERT Original rows (unchanged logic)
      │
      ▼
[Phase 2: Amount drift pass]
  For each fetched txn ID already in ledger:
    netSum = SUM(amount) for txn
    if netSum != upstreamAmount:
      if no offset for idempotency key → INSERT OffsetCorrection (AmountChange)
      │
      ▼
[Phase 3: Void/removal pass]
  For each ledger txn ID absent from fetch:
    netSum = SUM(amount) for txn
    if netSum != 0:
      if no offset for idempotency key → INSERT OffsetCorrection (VoidRemoval)
      │
      ▼
[RecomputeActualsForEventAsync] ──► UPDATE financial_line_items.qbo_actual_value only
      │
      ▼
[Commit]
```

## Migration Backfill

1. Add nullable columns with defaults.
2. `UPDATE qbo_sync_ledger SET entry_type = 'Original' WHERE entry_type IS NULL`.
3. Set columns NOT NULL where required.
4. Drop `IX_qbo_sync_ledger_event_txn`.
5. Create partial unique indexes.
