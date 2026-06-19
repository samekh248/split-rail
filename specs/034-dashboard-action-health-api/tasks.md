---
description: "Task list for Dashboard Action Center and Financial Health Aggregates (SPLR-74)"
---

# Tasks: Dashboard Action Center and Financial Health Aggregates

**Input**: Design documents from `/specs/034-dashboard-action-health-api/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/dashboard-api.md, quickstart.md; upstream spec 031 (`DashboardService`, `GET /dashboard`) merged

**Tests**: REQUIRED per Constitution III. Each user story phase adds failing xUnit tests first (integration in `apps/api.tests/Integration/DashboardControllerTests.cs`; unit in `apps/api.tests/Unit/DashboardFinancialHealthHelperTests.cs`), then implement until green. Final Polish phase enforces ≥80.0% line/branch coverage on **backend** touched files via `dotnet test --collect:"XPlat Code Coverage"` (coverlet → cobertura). Regenerate `apps/web/src/types/generated-api.ts` via `npm run gen:api` (Constitution VI); no new frontend Vitest files — frontend coverage gate satisfied by type regen only.

**Organization**: Tasks grouped by user story (US1–US4). Backend extension through `apps/api/DTOs/Dashboard/`, `apps/api/Services/`, and `apps/api.tests/`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1–US4 (maps to user stories in spec.md)
- All paths are repo-relative

## Path Conventions

- DTOs: `apps/api/DTOs/Dashboard/DashboardDtos.cs`
- Service: `apps/api/Services/DashboardService.cs`
- Helper: `apps/api/Services/DashboardFinancialHealthHelper.cs`
- Controller: `apps/api/Controllers/DashboardController.cs` (unchanged route)
- Integration tests: `apps/api.tests/Integration/DashboardControllerTests.cs`
- Unit tests: `apps/api.tests/Unit/DashboardFinancialHealthHelperTests.cs`
- Contract matrix: `specs/034-dashboard-action-health-api/contracts/dashboard-api.md`
- Generated types: `apps/web/src/types/generated-api.ts`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm branch, upstream dashboard API, and contract matrix before implementation.

- [x] T001 Verify branch `034-dashboard-action-health-api` and design docs in `specs/034-dashboard-action-health-api/` per plan.md
- [x] T002 [P] Review API contract matrix in `specs/034-dashboard-action-health-api/contracts/dashboard-api.md` (rows C1–C14)
- [x] T003 [P] Confirm upstream spec 031 complete: `apps/api/Services/DashboardService.cs`, `apps/api/Controllers/DashboardController.cs`, and `apps/api.tests/Integration/DashboardControllerTests.cs` exist with partition tests passing

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: DTO extensions and test scaffolds. **Blocks all user stories.**

**⚠️ CRITICAL**: No user story implementation begins until DTOs compile and test scaffolds exist.

- [x] T004 Add `UnmappedEventSummaryDto`, `ActionCenterDto`, and `FinancialHealthDto` records and extend `DashboardResponse` with `ActionCenter` and `FinancialHealth` in `apps/api/DTOs/Dashboard/DashboardDtos.cs` per `specs/034-dashboard-action-health-api/data-model.md` (money fields use `DecimalStringJsonConverter`)
- [x] T005 Create `DashboardFinancialHealthHelper.cs` static class scaffold with method signatures in `apps/api/Services/DashboardFinancialHealthHelper.cs` per `specs/034-dashboard-action-health-api/research.md` §7
- [x] T006 Create `DashboardFinancialHealthHelperTests.cs` scaffold in `apps/api.tests/Unit/DashboardFinancialHealthHelperTests.cs`
- [x] T007 Extend `DashboardControllerTests.cs` with seed helpers for in-week events, line items (proforma/settlement/QBO actual), and settled-status transitions in `apps/api.tests/Integration/DashboardControllerTests.cs`

**Checkpoint**: Project builds; extended `DashboardResponse` compiles; test files compile (new tests may fail until story phases)

---

## Phase 3: User Story 1 — See Venue-Wide Unmapped Transaction Workload (Priority: P1) 🎯 MVP

**Goal**: Dashboard response includes `actionCenter` with venue-wide unmapped total and sorted per-event list (count > 0 only); total matches sum of event card `unmappedCount` values.

**Independent Test**: `cd apps/api.tests && dotnet test --filter "FullyQualifiedName~DashboardControllerTests.GetDashboard_ActionCenter"` — action center rollup tests pass (quickstart Scenario 1).

### Tests for User Story 1 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T008 [P] [US1] Add failing test `GetDashboard_ActionCenter_TotalMatchesSumOfCardCounts` in `apps/api.tests/Integration/DashboardControllerTests.cs` (contract C1, C11)
- [x] T009 [P] [US1] Add failing test `GetDashboard_ActionCenter_ListsOnlyEventsWithUnmappedSorted` in `apps/api.tests/Integration/DashboardControllerTests.cs` (contract C2, C3; verify count desc, date asc tiebreaker)
- [x] T010 [P] [US1] Add failing test `GetDashboard_ActionCenter_ZeroUnmapped_ReturnsEmptyListAndZeroTotal` in `apps/api.tests/Integration/DashboardControllerTests.cs` (contract C9 partial)

### Implementation for User Story 1

- [x] T011 [US1] Implement action center aggregation in `GetDashboardAsync` in `apps/api/Services/DashboardService.cs` — sum `UnmappedCount` from event cards, build sorted `EventsWithUnmapped` from loaded events per `specs/034-dashboard-action-health-api/research.md` §2
- [x] T012 [US1] Update `DashboardResponse` construction in `apps/api/Services/DashboardService.cs` to include `ActionCenter` block (always present)
- [x] T013 [US1] Run US1 tests until green: `cd apps/api.tests && dotnet test --filter "FullyQualifiedName~DashboardControllerTests.GetDashboard_ActionCenter"`
- [x] T014 [US1] Mark rows C1–C3 and C11 complete in `specs/034-dashboard-action-health-api/contracts/dashboard-api.md`

**Checkpoint**: MVP — action center block populated correctly; SC-006 consistency verified

---

## Phase 4: User Story 2 — Assess Current-Week Financial Health at a Glance (Priority: P1)

**Goal**: Dashboard response includes `financialHealth` with Mon–Sun week range (UTC), projected net gross (status-based column), revenue-block QBO actuals, and variance for in-week events only.

**Independent Test**: `cd apps/api.tests && dotnet test --filter "FullyQualifiedName~DashboardFinancialHealth"` — unit + integration financial health tests pass (quickstart Scenarios 2–4).

### Tests for User Story 2 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T015 [P] [US2] Add failing unit test `GetCalendarWeek_ReturnsMondayThroughSunday` in `apps/api.tests/Unit/DashboardFinancialHealthHelperTests.cs` (contract C12)
- [x] T016 [P] [US2] Add failing unit test `ComputeProjectedNetShowRevenue_StatusBasedColumnSelection` in `apps/api.tests/Unit/DashboardFinancialHealthHelperTests.cs` (PRE_SHOW proforma; SETTLED/RECONCILED settlement; budget-locked PRE_SHOW still proforma)
- [x] T017 [P] [US2] Add failing unit test `ComputeRevenueQboActualTotal_ExcludesExpenseBlock` in `apps/api.tests/Unit/DashboardFinancialHealthHelperTests.cs` (contract C7)
- [x] T018 [P] [US2] Add failing integration test `GetDashboard_FinancialHealth_WeekFilterAndTotals` in `apps/api.tests/Integration/DashboardControllerTests.cs` (contract C4, C5, C8; in-week vs out-of-week events)
- [x] T019 [P] [US2] Add failing integration test `GetDashboard_FinancialHealth_BudgetLockedPreShowUsesProforma` in `apps/api.tests/Integration/DashboardControllerTests.cs` (contract C6)
- [x] T020 [P] [US2] Add failing integration test `GetDashboard_FinancialHealth_NoInWeekEvents_ReturnsZeroTotals` in `apps/api.tests/Integration/DashboardControllerTests.cs` (contract C9 partial)

### Implementation for User Story 2

- [x] T021 [US2] Implement `GetCalendarWeek`, `ComputeProjectedNetShowRevenue`, `ComputeRevenueQboActualTotal`, and `BuildFinancialHealthDto` in `apps/api/Services/DashboardFinancialHealthHelper.cs` per `specs/034-dashboard-action-health-api/research.md` §3–§5
- [x] T022 [US2] Wire `FinancialHealth` block in `GetDashboardAsync` via helper in `apps/api/Services/DashboardService.cs`
- [x] T023 [US2] Run US2 tests until green: `cd apps/api.tests && dotnet test --filter "FullyQualifiedName~DashboardFinancialHealth"`
- [x] T024 [US2] Mark rows C4–C9 and C12 complete in `specs/034-dashboard-action-health-api/contracts/dashboard-api.md`

**Checkpoint**: Financial health block correct for week boundaries, column selection, and QBO scope

---

## Phase 5: User Story 3 — Receive Action Center and Financial Health in Existing Dashboard Response (Priority: P2)

**Goal**: Single `GET /dashboard` response returns existing four partitions unchanged plus populated `actionCenter` and `financialHealth` blocks with money fields as decimal strings.

**Independent Test**: Extended response shape tests pass alongside spec 031 partition regression (quickstart Scenarios 5–6).

### Tests for User Story 3 (REQUIRED) ⚠️

- [x] T025 [P] [US3] Add failing test `GetDashboard_ResponseIncludesActionCenterAndFinancialHealthBlocks` in `apps/api.tests/Integration/DashboardControllerTests.cs` (contract C1, C4; both blocks non-null on 200)
- [x] T026 [P] [US3] Add failing test `GetDashboard_FinancialHealth_MoneyFieldsAreJsonStrings` in `apps/api.tests/Integration/DashboardControllerTests.cs` (FR-009; raw JSON parse asserts string types for projected/actual/variance)

### Implementation for User Story 3

- [x] T027 [US3] Verify `DashboardController.cs` requires no route changes and returns extended `DashboardResponse` from `apps/api/Services/DashboardService.cs`
- [x] T028 [US3] Run full dashboard regression: `cd apps/api.tests && dotnet test --filter "FullyQualifiedName~DashboardControllerTests"` (contract C10 — all spec 031 tests still pass)
- [x] T029 [US3] Mark row C10 complete in `specs/034-dashboard-action-health-api/contracts/dashboard-api.md`

**Checkpoint**: Extended response backward-compatible; partitions unchanged

---

## Phase 6: User Story 4 — Dashboard Aggregates Respect Tenant and Permission Boundaries (Priority: P1)

**Goal**: Unauthorized, cross-org, and out-of-scope venue requests are denied; no action center or financial health data exposed on denial paths.

**Independent Test**: Existing auth/isolation tests pass without regression; denial responses contain no aggregate financial data.

### Tests for User Story 4 (REQUIRED) ⚠️

- [x] T030 [P] [US4] Verify existing tests `GetDashboard_WithoutViewFinancials_Returns403`, `GetDashboard_CrossOrg_Returns404`, and `GetDashboard_OutOfScopeVenue_Returns404` in `apps/api.tests/Integration/DashboardControllerTests.cs` still pass after DTO extension (no response body with aggregates on error paths)

### Implementation for User Story 4

- [x] T031 [US4] Confirm `GetDashboardAsync` in `apps/api/Services/DashboardService.cs` performs venue access check before aggregate computation (no change expected if spec 031 guard intact)
- [x] T032 [US4] Run US4 regression: `cd apps/api.tests && dotnet test --filter "FullyQualifiedName~DashboardControllerTests.GetDashboard_WithoutViewFinancials|GetDashboard_CrossOrg|GetDashboard_OutOfScopeVenue"`

**Checkpoint**: Security gates unchanged; aggregates never leak on denied requests

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: OpenAPI regen, coverage gate, contract sign-off, quickstart validation.

- [x] T033 [P] Regenerate frontend types: `cd apps/api && dotnet build` then `cd apps/web && npm run gen:api` — verify `ActionCenterDto`, `UnmappedEventSummaryDto`, `FinancialHealthDto` in `apps/web/src/types/generated-api.ts` (contract C14; Constitution VI)
- [x] T034 Verify ≥80.0% line/branch coverage on touched backend files via `cd apps/api.tests && dotnet test --filter "FullyQualifiedName~Dashboard" --collect:"XPlat Code Coverage"` (contract C13; Constitution III)
- [x] T035 Run quickstart validation scenarios in `specs/034-dashboard-action-health-api/quickstart.md` (Scenarios 1–7)
- [x] T036 Mark all rows C1–C14 complete in `specs/034-dashboard-action-health-api/contracts/dashboard-api.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS all user stories**
- **User Story 1 (Phase 3)**: Depends on Foundational — MVP increment (action center only)
- **User Story 2 (Phase 4)**: Depends on Foundational — can run parallel with US1 after T004 (different helper file vs action center logic in service) but `DashboardResponse` constructor updated in US1 first; **recommended sequential US1 → US2**
- **User Story 3 (Phase 5)**: Depends on US1 + US2 (both blocks must exist)
- **User Story 4 (Phase 6)**: Depends on Foundational — regression tests can run anytime after T004; full sign-off after US3
- **Polish (Phase 7)**: Depends on US1–US4 complete

### User Story Dependencies

| Story | Priority | Depends on | Delivers |
|-------|----------|------------|----------|
| US1 | P1 | Phase 2 | Action center block |
| US2 | P1 | Phase 2 (US1 recommended first for `DashboardResponse` wiring) | Financial health block |
| US3 | P2 | US1 + US2 | Combined extended response + regression |
| US4 | P1 | Phase 2 | Auth/isolation regression |

### Parallel Opportunities

- **Phase 1**: T002 ∥ T003
- **Phase 2**: T005 ∥ T006 ∥ T007 (after T004)
- **Phase 3 tests**: T008 ∥ T009 ∥ T010
- **Phase 4 unit tests**: T015 ∥ T016 ∥ T017
- **Phase 4 integration tests**: T018 ∥ T019 ∥ T020 (after unit tests scaffolded)
- **Phase 5 tests**: T025 ∥ T026
- **Phase 7**: T033 can run after US3 green

### Parallel Example: User Story 2 Unit Tests

```bash
# Launch all US2 unit tests together (after T006 scaffold):
Task T015: GetCalendarWeek_ReturnsMondayThroughSunday in apps/api.tests/Unit/DashboardFinancialHealthHelperTests.cs
Task T016: ComputeProjectedNetShowRevenue_StatusBasedColumnSelection in apps/api.tests/Unit/DashboardFinancialHealthHelperTests.cs
Task T017: ComputeRevenueQboActualTotal_ExcludesExpenseBlock in apps/api.tests/Unit/DashboardFinancialHealthHelperTests.cs
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1 (action center)
4. **STOP and VALIDATE**: `dotnet test --filter "GetDashboard_ActionCenter"`
5. Demo action center data in dashboard JSON (UI wiring is SPLR-75)

### Incremental Delivery

1. Setup + Foundational → DTOs and scaffolds ready
2. US1 → Action center block → Test → Partial MVP
3. US2 → Financial health block → Test
4. US3 → Full extended response + partition regression
5. US4 → Security regression sign-off
6. Polish → Coverage + OpenAPI + quickstart

### Suggested MVP Scope

**User Story 1 (Phase 3)** — action center rollup delivers immediate value for SPLR-75 banner and validates aggregate pattern before financial health math.

---

## Notes

- Status-based projected column in financial health **differs** from `LedgerService.ComputeSummary` (budget-lock rule) — do not reuse without `DashboardFinancialHealthHelper` (see research.md §3)
- Week boundaries use UTC Mon–Sun until venue timezone field exists
- No migrations or controller route changes in this feature
- Stop at any checkpoint to validate story independently
