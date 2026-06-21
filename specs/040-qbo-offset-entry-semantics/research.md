# Research: Explicit Offset Entry Semantics for QBO Actuals Corrections

**Feature**: 040-qbo-offset-entry-semantics  
**Date**: 2026-06-19

## 1. Unique Index Conflict with Offset Rows

**Decision**: Drop the existing unique index `IX_qbo_sync_ledger_event_txn` on `(event_id, qbo_transaction_id)`. Replace with two partial unique indexes:

1. **One original per transaction**: `(event_id, qbo_transaction_id)` UNIQUE WHERE `entry_type = 'Original'`
2. **Idempotent offsets**: `(event_id, qbo_transaction_id, correction_type, target_state_absent, target_state_amount)` UNIQUE WHERE `entry_type = 'OffsetCorrection'`

**Rationale**: The current index (from spec 003) enforces at most one row per transaction, which directly blocks offset correction rows. Partial indexes preserve original-ingest idempotency while allowing multiple offset rows over time and enforcing FR-007 idempotency keys.

**Alternatives considered**:
- Separate `qbo_sync_corrections` table (rejected — splits audit trail, duplicates FK relationships, violates spec assumption of single canonical ledger store).
- Store corrections only as JSON on the original row (rejected — mutates/overwrites representation, fails append-only audit requirement).

## 2. Correction Detection Algorithm

**Decision**: After the existing new-transaction ingest loop, run a two-pass correction phase inside the same advisory-locked transaction:

**Pass A — Amount drift** (for each transaction in upstream fetch whose ID exists in ledger):
1. Compute `netSum = SUM(amount)` for all ledger rows with that `qbo_transaction_id` and `event_id`.
2. If `netSum != upstreamAmount`, compute `offsetAmount = upstreamAmount - netSum`.
3. If no offset row exists for idempotency key `(event, txnId, AmountChange, targetState=upstreamAmount)`, INSERT `OffsetCorrection` row with that amount.

**Pass B — Void/removal** (for each distinct `qbo_transaction_id` in ledger whose ID is absent from upstream fetch):
1. Compute `netSum` for that identifier.
2. If `netSum != 0`, compute `offsetAmount = 0 - netSum`.
3. If no offset row exists for idempotency key `(event, txnId, VoidRemoval, targetStateAbsent=true)`, INSERT `OffsetCorrection` row.

Then call existing `RecomputeActualsForEventAsync`.

**Rationale**: Matches all five clarify-session decisions. Reuses fetch data already retrieved; void detection does not depend on QBO void metadata. Net-to-target formula handles sequential corrections and re-ingestion after void.

**Alternatives considered**:
- Skip re-processing known IDs entirely (current behavior — rejected; this is the gap SPLR-37 addresses).
- Delta from last upstream amount stored on original row (rejected; requires UPDATE on original row or separate cache, violating immutability).

## 3. Entry Typing and Metadata Columns

**Decision**: Add to `qbo_sync_ledger`:

| Column | Type | Notes |
|--------|------|-------|
| `entry_type` | enum string | `Original` (default for backfill) \| `OffsetCorrection` |
| `correction_type` | enum string nullable | `AmountChange` \| `VoidRemoval`; null for Original |
| `target_state_absent` | bool nullable | true for void/removal idempotency; null for amount-change offsets |
| `target_state_amount` | numeric(12,2) nullable | upstream target amount for amount-change idempotency |
| `corrected_ledger_entry_id` | uuid nullable FK | references original ledger row id |

Backfill migration: set `entry_type = 'Original'` on all existing rows.

**Rationale**: Explicit typing satisfies FR-002/FR-003. Idempotency columns map directly to FR-007 without a separate dedup table. FK to original row supports SC-003 audit reconstruction.

**Alternatives considered**:
- Encode type in `qbo_transaction_id` suffix (rejected — corrupts upstream identity, breaks fetch comparison).
- Single `correction_reason` JSON blob (rejected — harder to index for idempotency).

## 4. Settlement Freeze Exception for Actuals Recompute

**Decision**: `QboSyncService.RecomputeActualsForEventAsync` continues to update `financial_line_items.qbo_actual_value` without invoking `FrozenEventMutationAuditor`. No other fields on line items are touched during sync.

**Rationale**: Spec clarification explicitly permits actuals updates on SETTLED/RECONCILED events. The frozen-event auditor (spec 039) guards user-initiated mutations, not read-only QBO sync aggregation. Document as justified Constitution V exception in plan Complexity Tracking.

**Alternatives considered**:
- Block sync on frozen events (rejected — contradicts clarify answer A).
- Store corrected actuals only in a shadow column (rejected — duplicates source of truth, breaks variance grid).

## 5. Correction Badge API Surface

**Decision**: Add `hasQboCorrection: bool` to `LineItemDto`. Computed in `LedgerService.GetLedgerAsync` via a single grouped query:

```sql
SELECT mapped_line_item_id, COUNT(*) > 0 AS has_correction
FROM qbo_sync_ledger
WHERE event_id = @eventId
  AND entry_type = 'OffsetCorrection'
  AND mapped_line_item_id IS NOT NULL
GROUP BY mapped_line_item_id
```

**Rationale**: Minimal DTO change (Constitution VI). Avoids N+1 queries. Frontend badge logic stays a simple boolean check, matching SC-007.

**Alternatives considered**:
- Separate `GET /ledger/corrections` endpoint (rejected — extra round trip for data always shown on grid).
- Infer corrections client-side from actuals delta (rejected — unreliable, not auditable).

## 6. Append-Only Guard Strategy

**Decision**: Two-layer verification:

1. **Integration tests** (`QboOffsetCorrectionTests`, updated `QboAppendOnlyTests`): capture ledger row IDs and field values before sync; after correction sync assert row count increased, original row `Amount`/`EntryType` unchanged, EF `EntityState` of original rows never `Modified`.
2. **Unit guard** (`QboSyncLedgerAppendOnlyGuardTests`): scan `QboSyncService` / correction service source paths to assert no `_db.QboSyncLedgers.Update/Remove` calls; optional `SaveChangesInterceptor` in tests throws if any `QboSyncLedger` entry state is `Modified` or `Deleted` during sync.

**Rationale**: Satisfies FR-010/SC-004. Test seeding cleanup (`TestSeedingService.RemoveRange`) remains excluded per spec assumptions.

**Alternatives considered**:
- DB trigger blocking UPDATE/DELETE (rejected — over-engineering; breaks test seeding unless role-gated).
- Roslyn analyzer (deferred — integration guard sufficient for MVP).

## 7. Superseded Behavior from Spec 003

**Decision**: Spec 003 quickstart Scenario 2 ("actuals remain unchanged on upstream edit") is **superseded** by this feature. The new expected behavior: original ledger row preserved, offset row appended, actuals updated to upstream net.

**Rationale**: SPLR-37 and Constitution IV require explicit offset semantics; preserving stale actuals was an interim gap, not a permanent requirement.

**Alternatives considered**: None — this is the explicit product direction.
