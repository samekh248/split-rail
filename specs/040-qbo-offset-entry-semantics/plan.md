# Implementation Plan: Explicit Offset Entry Semantics for QBO Actuals Corrections

**Branch**: `040-qbo-offset-entry-semantics` | **Date**: 2026-06-19 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/040-qbo-offset-entry-semantics/spec.md` (Linear SPLR-37)

## Summary

Close the **append-only correction semantics gap** in the QBO sync pipeline: today `qbo_sync_ledger` is insert-only for new transaction IDs, but upstream amount changes and voids are silently skipped on re-sync. Extend the ledger with typed **Original** and **OffsetCorrection** entries, detect corrections by comparing each sync's upstream fetch to existing ledger state (amount drift + missing IDs), write net-to-target offset rows idempotently, recompute `qbo_actual_value` as `SUM(amount)` (including on `SETTLED`/`RECONCILED` events), expose `hasQboCorrection` on ledger line items for a **correction badge** in the financial grid, and add automated append-only guard tests. Requires an EF migration dropping the `(event_id, qbo_transaction_id)` unique constraint and replacing it with partial uniqueness rules that allow multiple offset rows per transaction.

## Technical Context

**Language/Version**: C# / .NET 8.0 (`apps/api`); TypeScript / React 18 (`apps/web`)

**Primary Dependencies**: ASP.NET Core 8, EF Core 8 + Npgsql, existing `QboSyncService`, `IQboTransactionClient`, `LedgerService`, Font Awesome Free (`@fortawesome/react-fontawesome`)

**Storage**: PostgreSQL — migration extending `qbo_sync_ledger` with entry typing and idempotency columns; no new tables

**Testing**: xUnit unit tests (`QboSyncCorrectionDetector`, offset amount math); xUnit + WebApplicationFactory + Testcontainers integration tests (amount change, void/removal, idempotent re-sync, settled-event actuals update, append-only guard); Vitest + RTL for correction badge on `LedgerRow`; update `QboAppendOnlyTests` expectations; ≥80.0% line/branch coverage on **backend and frontend touched files** (Constitution III)

**Target Platform**: GCP Cloud Run API + Vite SPA

**Project Type**: Web application monorepo — backend sync pipeline + ledger API DTO extension + frontend grid badge

**Performance Goals**: Correction detection adds O(n) pass over fetched transactions + ledger IDs per sync; acceptable within existing sync batch expectations (spec: no manual intervention for large correction volumes)

**Constraints**: Constitution I — all amounts `decimal`, `MidpointRounding.AwayFromZero`; Constitution IV — read-only QBO HTTP, append-only ledger (INSERT-only in production); Constitution V — **documented exception**: `QboSyncService.RecomputeActualsForEventAsync` may update `financial_line_items.qbo_actual_value` on frozen events; all other line-item fields remain guarded; Constitution VI — add `HasQboCorrection` to `LineItemDto` in C# first, regenerate `generated-api.ts`; Constitution IX — correction badge uses Font Awesome (`faRotate` or `faClockRotateLeft`); ≥80.0% coverage on touched backend and frontend files

**Scale/Scope**: 1 EF migration, 1 enum file, extend `QboSyncLedger` model, refactor `QboSyncService.ProcessTransactionsAsync`, optional extracted `QboSyncCorrectionService`, extend `LineItemDto` + `LedgerService.GetLedgerAsync`, `LedgerRow` badge component, ~4 test files (~20 cases), update 1 existing integration test

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Relevance | Status |
|-----------|-----------|--------|
| I. Core Mathematical Axioms | **Yes** — offset amounts computed in `decimal`; net-to-target subtraction uses explicit rounding. | PASS |
| II. Multi-Tenant Isolation | **Yes** — correction reads/writes scoped via existing `QboSyncLedger` query filters and venue-scoped sync entry points. | PASS |
| III. Engineering Rigor | **Yes — primary** | PASS | Unit + integration + Vitest; append-only guard test; ≥80% on touched files. |
| IV. QBO Integration | **Yes — primary** | PASS | Read-only QBO client unchanged; corrections are INSERT-only ledger rows derived from fetch comparison. |
| V. Ledger State Machine | **Yes — exception** | PASS (justified) | Clarified spec exception: only `qbo_actual_value` updates on frozen events via sync recompute; no user mutation paths bypassed. See Complexity Tracking. |
| VI. Polyglot Contract | **Yes** | PASS | `LineItemDto.hasQboCorrection` added in C# DTO; frontend imports from `generated-api.ts`. |
| VII. EF Core Axioms | **Yes** | PASS | Ledger reads use `.AsNoTracking()`; correction detection loads ledger + mappings in explicit queries. |
| VIII. Exception Governance | **Yes (light)** | PASS | Sync failures continue through existing domain exceptions; correction logs include event/txn IDs only. |
| IX. UI Iconography | **Yes** | PASS | Correction badge uses Font Awesome Free icon with `aria-label`. |

**Post-design re-check (Phase 1)**: [research.md](./research.md), [data-model.md](./data-model.md), and [contracts/](./contracts/) confirm migration strategy, partial unique indexes, correction algorithm, DTO extension, and test matrix. Gates remain PASS with one documented Constitution V exception.

## Project Structure

### Documentation (this feature)

```text
specs/040-qbo-offset-entry-semantics/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   ├── qbo-offset-corrections.md       # Correction semantics + sync behavior contract
│   └── ledger-correction-badge.md      # LineItemDto extension contract
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
apps/api/
├── Models/
│   ├── QboSyncLedger.cs                  # MODIFY — entry type, correction metadata
│   └── Enums/
│       └── QboSyncLedgerEntryType.cs     # NEW — Original, OffsetCorrection
├── Data/
│   ├── ApplicationDbContext.cs           # MODIFY — partial unique indexes, new columns
│   └── Migrations/
│       └── *_AddQboSyncLedgerOffsetSemantics.cs  # NEW
├── Services/
│   ├── QboSyncService.cs                 # MODIFY — correction detection phase after ingest
│   └── QboSyncCorrectionService.cs       # NEW (optional extract) — detect + build offset rows
└── DTOs/Ledger/
    └── LedgerDtos.cs                       # MODIFY — LineItemDto.HasQboCorrection

apps/api.tests/
├── Unit/
│   ├── QboSyncServiceTests.cs            # MODIFY — correction amount + idempotency cases
│   └── QboSyncCorrectionServiceTests.cs  # NEW — net-to-target, void, idempotency key
└── Integration/
    ├── QboAppendOnlyTests.cs             # MODIFY — expect offset on upstream change; original row preserved
    ├── QboOffsetCorrectionTests.cs       # NEW — amount change, void, re-sync idempotency, settled event
    └── QboSyncLedgerAppendOnlyGuardTests.cs  # NEW — assert zero UPDATE/DELETE on ledger rows

apps/web/
├── src/components/ledger/
│   ├── LedgerRow.tsx                     # MODIFY — correction badge when hasQboCorrection
│   └── QboCorrectionBadge.tsx            # NEW — Font Awesome badge + aria-label
└── tests/components/ledger/
    └── LedgerRow.test.tsx                # MODIFY/NEW — badge visible/hidden cases
```

**Structure Decision**: Extend the existing QBO sync service rather than a parallel pipeline. Extract correction detection into a testable helper/service if `ProcessTransactionsAsync` grows beyond ~80 lines of correction logic. Frontend change is localized to the QBO actuals column in `LedgerRow`, mirroring the existing deduction badge pattern.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Constitution V — update `financial_line_items.qbo_actual_value` on SETTLED/RECONCILED events | Spec clarification (2026-06-19): QBO is source of truth; accountants must see corrected actuals post-settlement without reopening the event | Blocking sync on frozen events leaves actuals permanently stale when QuickBooks corrections occur after settlement PDF generation |
| Drop `(event_id, qbo_transaction_id)` unique index | Offset corrections require multiple rows per transaction identifier (original + N offsets) | Keeping the index prevents any offset row from being inserted for an already-synced transaction |
