# Implementation Plan: Enforce State Guard on Ledger Recalculate

**Branch**: `046-ledger-recalculate-state-guard` | **Date**: 2026-06-20 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/046-ledger-recalculate-state-guard/spec.md` (Linear SPLR-34)

## Summary

Close the **SPLR-34 audit immutability bypass** on `LedgerService.RecalculateAsync`: the recalculate path recomputes deal math and persists `EventArtist.CalculatedNetPayout` — a prohibited mutation on frozen events. The service-layer guard (`AssertNotSettledOrReconciled` + `FrozenEventMutationOperation.Recalculate`) was introduced in spec 044; this feature **confirms the guard is present and complete** and closes remaining **verification gaps**: `RECONCILED` recalculate rejection, payout-value stability assertions, and deal-type matrix (guarantee, `door_split`, custom formula). **Backend-only**; no API DTO, route, or frontend changes.

## Technical Context

**Language/Version**: C# / .NET 8.0 (`apps/api`, `apps/api.tests`)

**Primary Dependencies**: Existing `LedgerService`, `FrozenEventMutationAuditor`, `FrozenEventMutationOperation`, `DealMathEngine`, `LedgerStateException`, `ExceptionHandlerMiddleware`

**Storage**: No schema migrations. Touches `event_artists.calculated_net_payout` write path only on non-frozen events.

**Testing**: xUnit integration tests extending `SettlementPostFinalizeImmutabilityTests` + optional `[Theory]` deal-type cases; reuse `SeedFinalizedEventAsync` / `SeedFinalizedThenReconciledAsync`; ≥80.0% line/branch coverage on touched backend files (Constitution III); no frontend changes

**Target Platform**: Linux CI (QuestPDF finalize); Windows AMD64 local; ARM Windows skips PDF tests via `IsQuestPdfSupported()`

**Project Type**: Web application monorepo — **backend guard verification + test completion** for this feature

**Performance Goals**: Negligible — one in-memory status check before recalculate; no additional DB round trips beyond existing `LoadEventForMutationAsync`

**Constraints**: Constitution V state-validation before mutation on `events` / `event_artists` / `financial_line_items`; guard must precede `RecalculateAndPersistAsync`; rejections throw `LedgerStateException` → HTTP 400 + structured audit log (spec 039); real finalize seeding mandatory; PDF byte stability on rejected recalculate; editable-state recalculate must not regress; ≥80.0% backend coverage on touched files; missing/unparseable coverage reports fail CI

**Scale/Scope**: 0–2 lines product change (verify guard only if gap found), ~1 extended integration test file, ~1 seed helper overload, ~4–6 new test cases, 0 migrations, 0 API routes, 0 frontend files

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Relevance | Status |
|-----------|-----------|--------|
| I. Core Mathematical Axioms | No formula changes; existing `decimal` deal math unchanged. | N/A |
| II. Multi-Tenant Isolation | Recalculate loads event via existing venue-scoped mutation loader. | PASS |
| III. Engineering Rigor | **Primary** — integration tests for SETTLED/RECONCILED + deal-type matrix; ≥80% on touched files. | PASS |
| IV. QBO Integration | No QBO changes. | N/A |
| V. Ledger State Machine | **Primary** — explicit prepend guard on recalculate entry path; blocks payout persistence on frozen events. | PASS |
| VI. Polyglot Contract | No DTO/OpenAPI changes. | N/A |
| VII. EF Core Axioms | No new queries; existing eager-load in `RecalculateAndPersistAsync` unchanged. | N/A |
| VIII. Exception Governance | `LedgerStateException` → HTTP 400; audit via `FrozenEventMutationAuditor`. | PASS |
| IX. UI Iconography | No UI changes. | N/A |

**Post-design re-check (Phase 1)**: [research.md](./research.md), [data-model.md](./data-model.md), and [contracts/ledger-recalculate-frozen-guard.md](./contracts/ledger-recalculate-frozen-guard.md) confirm guard placement, deal-type test matrix, and payout invariants. Gates remain PASS. No Complexity Tracking entries required.

## Project Structure

### Documentation (this feature)

```text
specs/046-ledger-recalculate-state-guard/
├── plan.md              # This file
├── research.md          # Phase 0 — gap analysis, guard vs test coverage
├── data-model.md        # Phase 1 — payout field, deal types, test fixtures
├── quickstart.md        # Phase 1 — validation scenarios
├── contracts/
│   └── ledger-recalculate-frozen-guard.md  # Phase 1 — recalculate guard contract
├── checklists/
│   └── requirements.md  # From /speckit-specify
└── tasks.md             # Phase 2 (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
apps/api/
├── Services/
│   ├── LedgerService.cs                   # VERIFY/MODIFY — AssertNotSettledOrReconciled before RecalculateAndPersistAsync
│   └── FrozenEventMutationOperation.cs    # VERIFY — Recalculate constant (added in 044)

apps/api.tests/
├── Integration/
│   ├── IntegrationTestBase.cs             # EXTEND — SeedFinalizedEventWithDealTypeAsync (optional overload)
│   └── SettlementPostFinalizeImmutabilityTests.cs  # EXTEND — RECONCILED recalculate + deal-type matrix + payout assertions
```

**Structure Decision**: Guard belongs in `LedgerService.RecalculateAsync` (Constitution V service-layer prepend). Persistence interceptor (spec 041) remains defense-in-depth but is not the primary HTTP 400 + audit contract. Tests extend existing SPLR-39 integration suite rather than a new file — same seeding, audit, and PDF assertion patterns.

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
| Contract | [contracts/ledger-recalculate-frozen-guard.md](./contracts/ledger-recalculate-frozen-guard.md) | Complete |
| Quickstart | [quickstart.md](./quickstart.md) | Complete |

**Next**: Run `/speckit-tasks` to generate dependency-ordered `tasks.md`.
