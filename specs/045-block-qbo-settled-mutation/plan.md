# Implementation Plan: Block QuickBooks Sync from Mutating Frozen Settlement Data

**Branch**: `045-block-qbo-settled-mutation` | **Date**: 2026-06-20 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/045-block-qbo-settled-mutation/spec.md` (Linear SPLR-33)

## Summary

Close the **audit immutability bypass** in `QboSyncService.RecomputeActualsForEventAsync`: the sync recompute path currently rewrites `financial_line_items.qbo_actual_value` (and `UpdatedAt`) on frozen events with no lifecycle-aware guard. Add explicit state validation so **`SETTLED` events reject all line-item mutations** from sync recompute (HTTP 400 + audit log), **`RECONCILED` events permit only `QboActualValue`/`UpdatedAt` updates**, and settlement snapshot fields (`ProformaValue`, `SettlementValue`, metadata columns) never change. Align the EF persistence interceptor (`FrozenEventImmutabilityInterceptor`) to match — today it permits QBO actuals updates on both frozen states; narrow to `RECONCILED` only. **Backend-only**; no API DTO or frontend changes unless error surfacing already exists on sync endpoints.

## Technical Context

**Language/Version**: C# / .NET 8.0 (`apps/api`, `apps/api.tests`)

**Primary Dependencies**: Existing `QboSyncService`, `FrozenEventMutationAuditor`, `FrozenEventImmutabilityInterceptor`, `LedgerStateException`, `ExceptionHandlerMiddleware`, EF Core 8

**Storage**: No schema migrations. Field inventory documented in [data-model.md](./data-model.md).

**Testing**: xUnit unit tests (`QboSyncServiceTests`) + integration tests (WebApplicationFactory + Testcontainers) for SETTLED/RECONCILED sync paths with audit log capture; reuse `TestLogCollector` and `SeedFinalizedEventAsync` from spec 044; ≥80.0% line/branch coverage on touched backend files (Constitution III); no frontend changes

**Target Platform**: GCP Cloud Run API + local Docker PostgreSQL

**Project Type**: Web application monorepo — **backend guard implementation** for this feature

**Performance Goals**: Negligible — one event status lookup per sync recompute; no additional round trips beyond loading parent event status

**Constraints**: Constitution V state-validation before mutation; Constitution IV read-only QBO model unchanged; settlement snapshot fields must match `SettlementLineItemSnapshot` inventory; QBO ledger cache ingest (`qbo_sync_ledgers`) may continue on `SETTLED` events but recompute must not touch `financial_line_items`; venue batch sync isolates failures per event; ≥80.0% backend coverage on touched files; missing/unparseable coverage reports fail CI

**Scale/Scope**: ~3 modified service/interceptor files, 1 new operation constant, ~6–8 new unit/integration test cases, 0 migrations, 0 API routes, 0 frontend files

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Relevance | Status |
|-----------|-----------|--------|
| I. Core Mathematical Axioms | No monetary math changes; recompute uses existing `decimal` sums. | N/A |
| II. Multi-Tenant Isolation | Event status loaded scoped to existing sync transaction; venue access checks unchanged. | PASS |
| III. Engineering Rigor | **Primary** — unit + integration tests; ≥80% on touched files. | PASS |
| IV. QBO Integration | Read-only Intuit model preserved; only local ledger field write rules tightened. | PASS |
| V. Ledger State Machine | **Primary** — adds missing state-validation block on sync recompute path; aligns interceptor with SETTLED vs RECONCILED distinction. | PASS |
| VI. Polyglot Contract | No DTO/OpenAPI changes. | N/A |
| VII. EF Core Axioms | Event status lookup uses `.AsNoTracking()`; existing eager-load patterns unchanged. | PASS |
| VIII. Exception Governance | Rejections throw `LedgerStateException` → HTTP 400; audit logs sanitized per spec 039. | PASS |
| IX. UI Iconography | No UI changes. | N/A |

**Post-design re-check (Phase 1)**: [research.md](./research.md), [data-model.md](./data-model.md), and [contracts/qbo-sync-frozen-event-guard.md](./contracts/qbo-sync-frozen-event-guard.md) confirm SETTLED vs RECONCILED write matrix, interceptor alignment, and test matrix. Gates remain PASS. No Complexity Tracking entries required.

## Project Structure

### Documentation (this feature)

```text
specs/045-block-qbo-settled-mutation/
├── plan.md              # This file
├── research.md          # Phase 0 — gap analysis, SETTLED vs RECONCILED decisions
├── data-model.md        # Phase 1 — field inventory, state write matrix
├── quickstart.md        # Phase 1 — validation scenarios
├── contracts/
│   └── qbo-sync-frozen-event-guard.md  # Phase 1 — sync write-path contract
├── checklists/
│   └── requirements.md  # From /speckit-specify
└── tasks.md             # Phase 2 (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
apps/api/
├── Services/
│   ├── QboSyncService.cs                          # MODIFY — state-aware RecomputeActualsForEventAsync; inject auditor
│   └── FrozenEventMutationOperation.cs            # EXTEND — add QboSyncRecompute constant
├── Data/Interceptors/
│   └── FrozenEventImmutabilityInterceptor.cs      # MODIFY — IsOnlyQboActualsUpdate allowed on RECONCILED only

apps/api.tests/
├── Unit/
│   └── QboSyncServiceTests.cs                     # EXTEND — SETTLED reject, RECONCILED actuals-only, snapshot stable
└── Integration/
    └── QboSyncFrozenEventTests.cs                 # NEW — HTTP sync on finalized/reconciled events + audit + PDF bytes
```

**Structure Decision**: Primary fix in `QboSyncService` service-layer guard (Constitution V requires explicit prepend block before mutation). Interceptor change keeps persistence layer consistent as defense-in-depth. Reuse existing auditor rather than new exception type.

## Complexity Tracking

> No constitution violations requiring justification.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |

## Phase 0 & Phase 1 Outputs

| Artifact | Path | Status |
|----------|------|--------|
| Research | [research.md](./research.md) | Complete |
| Data model | [data-model.md](./data-model.md) | Complete |
| Contract | [contracts/qbo-sync-frozen-event-guard.md](./contracts/qbo-sync-frozen-event-guard.md) | Complete |
| Quickstart | [quickstart.md](./quickstart.md) | Complete |

**Next**: Run `/speckit-tasks` to generate dependency-ordered `tasks.md`.
