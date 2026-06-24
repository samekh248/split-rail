# Implementation Plan: Dashboard Action Center and Financial Health Aggregates

**Branch**: `034-dashboard-action-health-api` | **Date**: 2026-06-18 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/034-dashboard-action-health-api/spec.md` (Linear SPLR-74)

## Summary

Extend the existing **venue dashboard aggregate** (`GET /api/venues/{venueId}/dashboard`) with two server-computed summary blocks: **ActionCenter** (venue-wide unmapped QBO transaction total + per-event list) and **FinancialHealth** (Mon–Sun week projected net gross vs revenue-block QBO actuals + variance, with explicit week range dates). Add DTOs to `DashboardDtos.cs`, aggregation logic in `DashboardService` plus `DashboardFinancialHealthHelper` (status-based projected column — not budget-lock-based), extend integration tests in `DashboardControllerTests.cs`, add unit tests for week/column math, regenerate `generated-api.ts`. **Backend-only** — UI widgets deferred to SPLR-75/76.

## Technical Context

**Language/Version**: C# / .NET 8.0 (`apps/api`)

**Primary Dependencies**: ASP.NET Core 8, EF Core 8, existing `DashboardService` (spec 031), entities `Event`, `FinancialLineItem`, `UnmappedQboTransaction`, `BlockType`, `EventStatus`, `DecimalStringJsonConverter`, `MoneyFormat`

**Storage**: PostgreSQL 16 — read-only; no migration

**Testing**: xUnit + WebApplicationFactory + Testcontainers (`DashboardControllerTests` extended); new `DashboardFinancialHealthHelperTests` (unit); `npm run gen:api`; ≥80.0% line/branch coverage on **backend** touched files (Constitution III); frontend gate via type regen only

**Target Platform**: GCP Cloud Run API + local Docker PostgreSQL

**Project Type**: Web application monorepo — **backend API extension** (+ generated TS types)

**Performance Goals**: No additional EF round-trip; in-memory aggregation on already-loaded events; SC-005 ≤2s for 50 events unchanged

**Constraints**: Constitution I — decimal money math; II — org/venue scoping unchanged; V N/A (read-only); VI — DTOs first → OpenAPI → `generated-api.ts`; VII — reuse existing `.Include()` + `.AsNoTracking()` query; financial health projected column **status-based** (SETTLED/RECONCILED → settlement; else proforma) per clarifications — **not** `LedgerService.ComputeSummary` budget-lock rule; week boundaries Mon–Sun UTC (no venue timezone field); actual QBO = revenue-block only; ≥80.0% backend coverage; missing/unparseable coverage reports treated as failing

**Scale/Scope**: 1 helper file (new), 1 DTO file (extend), 1 service (extend), 0 controller changes, ~8–10 new integration tests, ~6 unit tests, 0 migrations, 0 frontend components

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Relevance | Status |
|-----------|-----------|--------|
| I. Core Mathematical Axioms | **Yes** — new decimal aggregations for financial health; `MidpointRounding.AwayFromZero` via existing money paths. | PASS |
| II. Multi-Tenant Isolation | **Yes** — unchanged venue access + org filters on existing dashboard query. | PASS |
| III. Engineering Rigor | **Yes** — integration + unit tests; ≥80% on touched backend files. | PASS (primary driver) |
| IV. QBO Integration | Read-only rollup of unmapped rows and revenue QBO actuals; no QBO HTTP mutations. | PASS |
| V. Ledger State Machine | Read-only; no event/line-item mutations. | N/A |
| VI. Polyglot Contract | **Yes** — extend DTOs → swagger → `generated-api.ts`. | PASS |
| VII. EF Core Axioms | **Yes** — no new query; aggregates on existing materialized includes. | PASS |
| VIII. Exception Governance | Reuse existing dashboard exceptions; no empty catch blocks. | PASS |
| IX. UI Iconography | No UI changes. | N/A |

**Post-design re-check (Phase 1)**: [research.md](./research.md), [data-model.md](./data-model.md), and [contracts/dashboard-api.md](./contracts/dashboard-api.md) confirm status-based projected column, revenue-only actuals, Mon–Sun week math, and test matrix C1–C14. Gates remain PASS. No Complexity Tracking entries required.

## Project Structure

### Documentation (this feature)

```text
specs/034-dashboard-action-health-api/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── dashboard-api.md # Phase 1 output (extends 031 contract)
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
apps/api/
├── DTOs/Dashboard/
│   └── DashboardDtos.cs                    # MODIFY — ActionCenterDto, UnmappedEventSummaryDto,
│                                           #           FinancialHealthDto; extend DashboardResponse
├── Services/
│   ├── DashboardService.cs                 # MODIFY — build action center + financial health
│   └── DashboardFinancialHealthHelper.cs   # NEW — week math, projected/actual aggregation
└── Controllers/
    └── DashboardController.cs              # UNCHANGED — same GET route

apps/api.tests/
├── Integration/
│   └── DashboardControllerTests.cs         # MODIFY — C1–C11 cases
└── Unit/
    └── DashboardFinancialHealthHelperTests.cs  # NEW — C12 week/column unit tests

apps/web/src/types/
    └── generated-api.ts                    # REGENERATE via npm run gen:api
```

**Structure Decision**: Extract financial health pure functions to `DashboardFinancialHealthHelper` because status-based column selection diverges from `LedgerService.ComputeSummary` and week-boundary math needs isolated unit tests (SC-003). Action center rollup stays thin in `DashboardService` (sort + map from already-computed card counts).

## Implementation Phases

### Phase A — DTO extensions

1. Add to `DashboardDtos.cs` per [data-model.md](./data-model.md):
   - `UnmappedEventSummaryDto`
   - `ActionCenterDto(TotalUnmappedCount, EventsWithUnmapped)`
   - `FinancialHealthDto(WeekStart, WeekEnd, ProjectedNetGross, ActualQboDeposits, Variance)` with decimal string converters on money fields
2. Extend `DashboardResponse` record with `ActionCenter` and `FinancialHealth` parameters.

### Phase B — Financial health helper

Add `DashboardFinancialHealthHelper.cs`:
- `GetCalendarWeek(DateOnly today) → (DateOnly weekStart, DateOnly weekEnd)` — Mon–Sun
- `ComputeProjectedNetShowRevenue(Event evt)` — status-based column per [research.md](./research.md) §3
- `ComputeRevenueQboActualTotal(Event evt)` — revenue block only
- `BuildFinancialHealthDto(IReadOnlyList<Event> venueEvents, DateOnly today)` — filter in-week, sum, compute variance

### Phase C — DashboardService integration

In `GetDashboardAsync` after partition logic:
1. **ActionCenter**: `TotalUnmappedCount = cards.Sum(c => c.UnmappedCount)`; build sorted `EventsWithUnmapped` from events where count > 0.
2. **FinancialHealth**: `DashboardFinancialHealthHelper.BuildFinancialHealthDto(events, todayUtc)`.
3. Return extended `DashboardResponse`.

### Phase D — Tests (Constitution III)

**Unit** (`DashboardFinancialHealthHelperTests.cs`):
- Monday/Sunday boundary inclusion
- Event before Monday excluded
- PRE_SHOW uses proforma; SETTLED uses settlement
- Budget-locked PRE_SHOW still proforma
- Revenue-only QBO actual sum

**Integration** (`DashboardControllerTests.cs` extensions):
- Action center total + sort + SC-006 consistency
- Financial health totals against seeded fixtures
- Zero-state blocks present
- Regression: existing tests pass

### Phase E — OpenAPI regeneration

```bash
cd apps/api && dotnet build
cd apps/web && npm run gen:api
```

### Phase F — Coverage gate

```bash
cd apps/api.tests
dotnet test --filter "FullyQualifiedName~Dashboard" --collect:"XPlat Code Coverage"
```

## Complexity Tracking

No constitution violations to justify.
