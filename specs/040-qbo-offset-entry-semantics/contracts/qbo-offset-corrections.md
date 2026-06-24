# Contract: QBO Offset Correction Semantics

**Feature**: 040-qbo-offset-entry-semantics  
**Date**: 2026-06-19  
**Scope**: Sync pipeline behavior (no new HTTP routes)

## Invariants

| ID | Invariant | Verification |
|----|-----------|--------------|
| C1 | Production code NEVER issues UPDATE or DELETE against `qbo_sync_ledger` rows | Integration + append-only guard tests |
| C2 | Exactly one `Original` row per `(event_id, qbo_transaction_id)` | Partial unique index + ingest idempotency |
| C3 | At most one offset per idempotency key `(event, txnId, correctionType, targetState)` | Partial unique index + re-sync test |
| C4 | `financial_line_items.qbo_actual_value = SUM(qbo_sync_ledger.amount)` per mapped line item after every sync | Unit + integration |
| C5 | QBO HTTP client remains GET-only | Existing `RecordingQboHandler` tests |
| C6 | Sync updates `qbo_actual_value` on SETTLED/RECONCILED events without altering proforma/settlement | Integration on settled fixture |

## Correction Scenarios

### S1: Upstream amount change

**Pre**: Original row `{ txnId: TXN-1, entryType: Original, amount: 100 }`  
**Fetch**: `{ txnId: TXN-1, amount: 150 }`  
**Post**:
- Original row unchanged (`amount: 100`)
- New offset `{ entryType: OffsetCorrection, correctionType: AmountChange, amount: +50, targetStateAmount: 150 }`
- Line item `qboActualValue: 150`
- Line item `hasQboCorrection: true`

### S2: Upstream void/removal

**Pre**: Original row `{ txnId: TXN-1, amount: 100 }`  
**Fetch**: TXN-1 absent  
**Post**:
- Original row unchanged
- New offset `{ correctionType: VoidRemoval, amount: -100, targetStateAbsent: true }`
- Line item `qboActualValue: 0`
- Line item `hasQboCorrection: true`

### S3: Idempotent re-sync (unchanged upstream)

**Pre**: State after S1  
**Fetch**: `{ txnId: TXN-1, amount: 150 }` (unchanged)  
**Post**: Ledger row count unchanged; no new offset rows

### S4: Sequential corrections

**Pre**: State after S1 (`net: 150`)  
**Fetch**: `{ txnId: TXN-1, amount: 120 }`  
**Post**:
- New offset `{ amount: -30, targetStateAmount: 120 }`
- Line item `qboActualValue: 120`
- Original row still `amount: 100`

### S5: Replacement transaction after void

**Pre**: Original TXN-1 voided (net 0 via offset)  
**Fetch**: `{ txnId: TXN-2, amount: 100 }` (new ID)  
**Post**:
- New original `{ txnId: TXN-2, amount: 100 }`
- TXN-1 history preserved (original + void offset)
- Line item `qboActualValue: 100`

## SyncResultDto (unchanged shape)

Existing `POST /api/venues/{venueId}/events/{eventId}/sync` response fields unchanged. Correction counts are implicit in ledger growth; optional future extension `offsetsCreated` is out of scope for v1.

## Logging

Correction sync completion log SHOULD include `{EventId}, {OffsetsCreated}, {SyncBatchId}`. MUST NOT log QBO tokens or full transaction payloads.

## Supersedes

Spec 003 quickstart Scenario 2 expected behavior (stale actuals on upstream edit) is **superseded** by S1 above.
