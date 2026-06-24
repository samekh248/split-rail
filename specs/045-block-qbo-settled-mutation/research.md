# Phase 0 Research: Block QBO Sync from Mutating Frozen Settlement Data

This document resolves technical decisions for SPLR-33 — closing the audit immutability bypass where `QboSyncService.RecomputeActualsForEventAsync` mutates `financial_line_items` on frozen events without lifecycle-aware validation.

## 1. Current gap (audit baseline)

- **Decision**: `QboSyncService.ProcessTransactionsAsync` line 305–307 calls `RecomputeActualsForEventAsync` unconditionally with comment "Constitution V exception: QBO actuals aggregate may update on SETTLED/RECONCILED events." The method loads all line items and sets `QboActualValue` + `UpdatedAt` with no event status check. The EF interceptor (`FrozenEventImmutabilityInterceptor.IsOnlyQboActualsUpdate`) permits these writes on **both** `SETTLED` and `RECONCILED`.
- **Rationale**: SPLR-33 identifies this as a constitution §V violation — every mutation path must prepend state validation. Prior spec 040 tasks documented intentional bypass; SPLR-33/045 **narrows** the exception to `RECONCILED` only.
- **Alternatives considered**:
  - **Rely on interceptor only** — rejected; service-layer guard required by Constitution V; interceptor is defense-in-depth.
  - **Route through `FrozenEventMutationAuditor` blanket reject on frozen** — rejected; breaks sanctioned actuals refresh on `RECONCILED`.

## 2. SETTLED vs RECONCILED write matrix

- **Decision**:

| Event status | QBO ledger ingest (`qbo_sync_ledgers`) | Line-item recompute (`QboActualValue`) | Settlement snapshot fields |
|--------------|----------------------------------------|------------------------------------------|----------------------------|
| `PRE_SHOW` | Allowed | Allowed | Allowed (normal editing) |
| `SETTLED` | Allowed (append-only cache) | **Rejected** (400 + audit) | **Immutable** |
| `RECONCILED` | Allowed | **Allowed** (actuals only) | **Immutable** |

- **Rationale**: Spec FR-002/FR-003 and assumptions — actuals population is a reconciliation-stage concern; `SETTLED` means signed snapshot frozen but QBO reconciliation not yet complete. Ledger cache ingest does not touch settlement snapshot entities guarded by Constitution V.
- **Alternatives considered**:
  - **Block entire sync on SETTLED** (including ledger ingest) — rejected; loses append-only QBO transaction cache before reconcile; spec scopes to financial line item mutations.
  - **Allow actuals on SETTLED** (spec 044 research decision) — **superseded** by SPLR-33/045 spec; reconcile transition is the sanctioned actuals window.

## 3. Recompute guard placement

- **Decision**: Add state check at start of `RecomputeActualsForEventAsync`:
  1. Load event `Status` (tracked or `.AsNoTracking()` lookup by `eventId`).
  2. If `SETTLED` → call `_frozenEventAuditor.RejectIfFrozen` with operation `qbo_sync_recompute` **before** modifying any line item.
  3. If `RECONCILED` → proceed; only assign `QboActualValue` and `UpdatedAt` (existing behavior).
  4. If `PRE_SHOW` → proceed unchanged.
- **Rationale**: Constitution V mandates explicit prepend block; matches `LedgerService` pattern. Inject `FrozenEventMutationAuditor` + use venue id from event.
- **Alternatives considered**:
  - **Skip recompute silently on SETTLED** — rejected; spec FR-007 requires explicit client-visible error on API-triggered sync when mutation would occur; silent skip hides compliance violations when new transactions arrive.
  - **No-op when no value change** — partial mitigation only; still need guard when new QBO data would change actuals.

## 4. Zero-transaction sync on SETTLED

- **Decision**: If sync ingests zero new transactions, skip `RecomputeActualsForEventAsync` entirely when event is `SETTLED` (no line-item dirty state). If new transactions were ingested on `SETTLED`, recompute would change values → reject with 400 + audit before SaveChanges.
- **Rationale**: Spec edge case "zero-transaction sync must not mutate financial fields"; avoids false-positive rejection when recompute would be a no-op.
- **Alternatives considered**:
  - **Always call recompute and reject** — rejected; unnecessary 400 on no-op syncs.

## 5. Interceptor alignment

- **Decision**: Change `IsOnlyQboActualsUpdate` to require parent event status `RECONCILED` (pass `EventSnapshot.Status` into check). `SETTLED` line-item modifications including QBO actuals → reject via persistence path with audit.
- **Rationale**: Defense-in-depth; prevents bypass if future code calls SaveChanges without service guard. Aligns with narrowed constitution exception.
- **Alternatives considered**:
  - **Leave interceptor unchanged** — rejected; inconsistent with service guard; SETTLED actuals would still pass persistence on direct SaveChanges.

## 6. Operation label for audit contract

- **Decision**: Add `FrozenEventMutationOperation.QboSyncRecompute = "qbo_sync_recompute"`. Extend spec 039 audit contract table.
- **Rationale**: Distinguishes sync recompute rejections from generic `persistence_update_line_item` in compliance review.
- **Alternatives considered**:
  - **Reuse `persistence_update_line_item`** — rejected; loses operation-class traceability required by spec FR-006.

## 7. Venue batch sync failure isolation

- **Decision**: No change to `SyncVenueEventsAsync` — existing per-event try/catch returns per-event failure in `VenueSyncEventResultDto`. SETTLED event with new transactions → that event fails; others succeed.
- **Rationale**: Spec edge case "mixed states in batch"; existing pattern satisfies FR.
- **Alternatives considered**: Fail entire venue batch — rejected; regresses current resilient behavior.

## 8. Test strategy

- **Decision**:
  - **Unit**: Extend `QboSyncServiceTests` with in-memory DB + interceptor registered (or test recompute in isolation with mocked auditor):
    - `SETTLED` + new txn → `LedgerStateException`, snapshot fields unchanged, audit emitted
    - `RECONCILED` + new txn → actuals updated, `SettlementValue`/`ProformaValue` unchanged
    - `SETTLED` + no new txn → success, line items unchanged
  - **Integration**: New `QboSyncFrozenEventTests` using `SeedFinalizedEventAsync` → POST sync → assert 400 on SETTLED with new data; reconcile → POST sync → 200 with actuals-only change + PDF bytes stable
- **Rationale**: Covers FR-008/FR-009; reuses spec 044 seeding infrastructure.
- **Alternatives considered**:
  - **Unit tests only** — rejected; HTTP 400 contract and PDF stability need integration proof.

## 9. Relationship to spec 044 (SPLR-39)

- **Decision**: Spec 044 User Story 4 assumed blanket sync rejection on frozen events; spec 045 **implements the product guard** that 044 may have tested incompletely. After 045 ships, spec 044 tests should align: SETTLED sync with new data → reject; RECONCILED sync → actuals-only success. No blocking dependency — 045 can ship first.
- **Rationale**: SPLR-33 is implementation; SPLR-39 is verification coverage. Guard must exist before rejection tests are meaningful.
- **Alternatives considered**: Merge into 044 — rejected; separate Linear issues and concern boundaries (fix vs coverage).
