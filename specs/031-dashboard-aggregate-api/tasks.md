---
description: "Task list for Dashboard Aggregate API (SPLR-72)"
---

# Tasks: Dashboard Aggregate API

**Input**: Design documents from `/specs/031-dashboard-aggregate-api/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/dashboard-api.md, quickstart.md

**Tests**: REQUIRED per Constitution III. Each user story phase adds xUnit integration tests in `apps/api.tests/Integration/DashboardControllerTests.cs` (write failing tests first, then implement until green). Final Polish phase enforces ≥80.0% line/branch coverage on **backend** touched files via `dotnet test --collect:"XPlat Code Coverage"` (coverlet → cobertura). Regenerate `apps/web/src/types/generated-api.ts` via `npm run gen:api` (Constitution VI); no frontend Vitest files — frontend coverage gate N/A beyond type regen.

**Organization**: Tasks grouped by user story (US1–US4). Backend API slice through `apps/api/Services/`, `apps/api/DTOs/`, `apps/api/Controllers/`, and `apps/api.tests/Integration/`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1–US4 (maps to user stories in spec.md)
- All paths are repo-relative

## Path Conventions

- DTOs: `apps/api/DTOs/Dashboard/DashboardDtos.cs`
- Service: `apps/api/Services/DashboardService.cs`
- Variance helper: `apps/api/Services/LedgerVarianceHelper.cs`
- Controller: `apps/api/Controllers/DashboardController.cs`
- DI registration: `apps/api/Program.cs`
- Integration tests: `apps/api.tests/Integration/DashboardControllerTests.cs`
- Contract matrix: `specs/031-dashboard-aggregate-api/contracts/dashboard-api.md`
- Test base: `apps/api.tests/Integration/IntegrationTestBase.cs`
- Upstream entity: `apps/api/Models/UserEventPin.cs` (spec 029 — no changes expected)
- Generated types: `apps/web/src/types/generated-api.ts`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm branch, prerequisites, and API contract before implementation.

- [x] T001 Verify branch `031-dashboard-aggregate-api` and design docs in `specs/031-dashboard-aggregate-api/` per plan.md
- [x] T002 [P] Review API contract matrix in `specs/031-dashboard-aggregate-api/contracts/dashboard-api.md` (rows B1–B15)
- [x] T003 [P] Confirm upstream prerequisites: `UserEventPin` entity, `ApplicationDbContext.UserEventPins` DbSet, and migration from spec 029 in `apps/api/Models/UserEventPin.cs` and `apps/api/Data/ApplicationDbContext.cs`; confirm spec 030 pin endpoints available for US3 pin tests in `apps/api/Controllers/EventsController.cs`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: DTO definitions and integration test harness scaffold. **Blocks all user stories.**

**⚠️ CRITICAL**: No user story implementation begins until DTOs and test scaffold exist.

- [x] T004 Create `DashboardResponse` and `EventCardDto` records in `apps/api/DTOs/Dashboard/DashboardDtos.cs` per `specs/031-dashboard-aggregate-api/data-model.md`
- [x] T005 Create `apps/api.tests/Integration/DashboardControllerTests.cs` extending `IntegrationTestBase` with helper methods to seed events at relative dates, call `GET /api/venues/{venueId}/dashboard`, and deserialize `DashboardResponse` (pattern from `EventPinControllerTests.cs` in `apps/api.tests/Integration/`)

**Checkpoint**: DTOs compile; test file compiles; story-specific test methods added in Phases 3–6

---

## Phase 3: User Story 1 — Retrieve a Venue Dashboard in One Request (Priority: P1) 🎯 MVP

**Goal**: Authorized users receive a single `GET /api/venues/{venueId}/dashboard` response with four server-partitioned collections (tonight, pinned, recent, upcoming) using UTC calendar boundaries; empty venue returns four empty arrays.

**Independent Test**: `cd apps/api.tests && dotnet test --filter "FullyQualifiedName~DashboardControllerTests"` — partition matrix and empty-venue tests pass (quickstart Scenario 1, Scenario 6).

### Tests for User Story 1 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T006 [P] [US1] Add failing test `GetDashboard_Returns200_FourPartitionsPresent` in `apps/api.tests/Integration/DashboardControllerTests.cs` (contract B1)
- [x] T007 [P] [US1] Add failing test `GetDashboard_PartitionMatrix_DateBoundaries` in `apps/api.tests/Integration/DashboardControllerTests.cs` (contract B2–B4; seed today, yesterday, 7d ago, 8d ago, tomorrow, 30d ahead, 31d ahead)
- [x] T008 [P] [US1] Add failing test `GetDashboard_EmptyVenue_AllPartitionsEmpty` in `apps/api.tests/Integration/DashboardControllerTests.cs` (contract B13)

### Implementation for User Story 1

- [x] T009 [US1] Create `DashboardService` with `GetDashboardAsync(venueId, ct)` in `apps/api/Services/DashboardService.cs` — venue access via `VenueService.IsVenueAccessibleAsync`, single `.AsNoTracking()` query with `.Include(e => e.LineItems)`, `.Include(e => e.UnmappedQboTransactions)`, `.Include(e => e.QboSyncLedgerEntries)`, UTC partition logic per `specs/031-dashboard-aggregate-api/research.md`
- [x] T010 [US1] Register `DashboardService` in `apps/api/Program.cs`
- [x] T011 [US1] Create `DashboardController` with `[HttpGet]` and `[RequirePermission(PermissionNames.ViewFinancials)]` at route `api/venues/{venueId:guid}/dashboard` in `apps/api/Controllers/DashboardController.cs`
- [x] T012 [US1] Run US1 tests until green: `cd apps/api.tests && dotnet test --filter "FullyQualifiedName~DashboardControllerTests"`
- [x] T013 [US1] Mark rows B1–B4, B13 complete in `specs/031-dashboard-aggregate-api/contracts/dashboard-api.md`

**Checkpoint**: MVP — dashboard GET returns partitioned response; empty venue handled

---

## Phase 4: User Story 4 — Dashboard Access Respects Tenant and Venue Boundaries (Priority: P1)

**Goal**: Cross-org, out-of-scope venue, and missing `can_view_financials` requests are denied without data leakage.

**Independent Test**: Authorization and tenant isolation tests pass (quickstart Scenarios 4–5).

### Tests for User Story 4 (REQUIRED) ⚠️

- [x] T014 [P] [US4] Add failing test `GetDashboard_WithoutViewFinancials_Returns403` in `apps/api.tests/Integration/DashboardControllerTests.cs` (contract B10; pattern from `SettlementAuthorizationTests.cs`)
- [x] T015 [P] [US4] Add failing test `GetDashboard_CrossOrg_Returns404` in `apps/api.tests/Integration/DashboardControllerTests.cs` (contract B11; pattern from `TenantIsolationTests.cs`)
- [x] T016 [P] [US4] Add failing test `GetDashboard_OutOfScopeVenue_Returns404` in `apps/api.tests/Integration/DashboardControllerTests.cs` (contract B12; use `CreateScopedVenueUserAsync` from `IntegrationTestBase.cs`)

### Implementation for User Story 4

- [x] T017 [US4] Verify venue access and `NotFoundException` paths in `GetDashboardAsync` in `apps/api/Services/DashboardService.cs` cover all US4 test cases (adjust if tests reveal gaps)
- [x] T018 [US4] Run US4 tests until green: `cd apps/api.tests && dotnet test --filter "FullyQualifiedName~DashboardControllerTests"`
- [x] T019 [US4] Mark rows B10–B12 complete in `specs/031-dashboard-aggregate-api/contracts/dashboard-api.md`

**Checkpoint**: Security gates enforced; no cross-tenant dashboard data

---

## Phase 5: User Story 2 — Event Summaries Include Operational Intelligence (Priority: P2)

**Goal**: Each `EventCardDto` includes `hasVarianceConcern`, `unmappedCount`, and `lastSyncedAt` derived from line items, unmapped QBO transactions, and sync ledger entries.

**Independent Test**: Aggregate correctness tests pass (quickstart Scenario 2).

### Tests for User Story 2 (REQUIRED) ⚠️

- [x] T020 [P] [US2] Add failing test `GetDashboard_VarianceConcern_FlaggedWhenNonZeroVariance` in `apps/api.tests/Integration/DashboardControllerTests.cs` (contract B6; seed line item with `SettlementValue` ≠ `QboActualValue`)
- [x] T021 [P] [US2] Add failing test `GetDashboard_UnmappedCount_MatchesSeededRows` in `apps/api.tests/Integration/DashboardControllerTests.cs` (contract B7; seed `UnmappedQboTransaction` rows)
- [x] T022 [P] [US2] Add failing test `GetDashboard_LastSyncedAt_MatchesMaxLedgerEntry` in `apps/api.tests/Integration/DashboardControllerTests.cs` (contract B8; seed `QboSyncLedger` with known `SyncedAt`)

### Implementation for User Story 2

- [x] T023 [P] [US2] Create `LedgerVarianceHelper` with `HasVarianceConcern(IEnumerable<FinancialLineItem>)` in `apps/api/Services/LedgerVarianceHelper.cs` matching `LedgerService.ToLineItemDto` formula (`Math.Abs(QboActualValue - SettlementValue) > 0`)
- [x] T024 [US2] Add aggregate mapping (`HasVarianceConcern`, `UnmappedCount`, `LastSyncedAt`) to event-to-`EventCardDto` projection in `apps/api/Services/DashboardService.cs`
- [x] T025 [US2] Run US2 tests until green: `cd apps/api.tests && dotnet test --filter "FullyQualifiedName~DashboardControllerTests"`
- [x] T026 [US2] Mark rows B6–B8 complete in `specs/031-dashboard-aggregate-api/contracts/dashboard-api.md`

**Checkpoint**: Event card summaries carry variance, unmapped, and sync aggregates

---

## Phase 6: User Story 3 — Pinned Events Reflect Server-Side User Preferences (Priority: P3)

**Goal**: Dashboard reflects requesting user's pin state via `UserEventPin`; pinned events appear in `pinnedEvents` partition and may overlap date-based partitions.

**Independent Test**: Pin isolation and overlap tests pass (quickstart Scenario 3).

### Tests for User Story 3 (REQUIRED) ⚠️

- [x] T027 [P] [US3] Add failing test `GetDashboard_PinnedEvent_InPinnedPartitionWithIsPinnedTrue` in `apps/api.tests/Integration/DashboardControllerTests.cs` (contract B9; pin via `PUT .../events/{eventId}/pin` from spec 030)
- [x] T028 [P] [US3] Add failing test `GetDashboard_PinnedUpcomingOverlap_InBothPartitions` in `apps/api.tests/Integration/DashboardControllerTests.cs` (contract B5)
- [x] T029 [P] [US3] Add failing test `GetDashboard_PerUserPinIsolation` in `apps/api.tests/Integration/DashboardControllerTests.cs` (contract B9; User A pinned, User B sees `isPinned: false`)

### Implementation for User Story 3

- [x] T030 [US3] Add `UserEventPin` join for authenticated user, set `IsPinned` on `EventCardDto`, and populate `PinnedEvents` partition in `apps/api/Services/DashboardService.cs`
- [x] T031 [US3] Run US3 tests until green: `cd apps/api.tests && dotnet test --filter "FullyQualifiedName~DashboardControllerTests"`
- [x] T032 [US3] Mark rows B5, B9 complete in `specs/031-dashboard-aggregate-api/contracts/dashboard-api.md`

**Checkpoint**: Server-side pins drive pinned partition and per-user `isPinned` flag

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: OpenAPI type regeneration, coverage gate, and quickstart validation.

- [x] T033 [P] Build API and regenerate types: `cd apps/api && dotnet build` then `cd apps/web && npm run gen:api` — verify `DashboardResponse` and `EventCardDto` appear in `apps/web/src/types/generated-api.ts` (contract B15)
- [x] T034 Confirm no hand-written dashboard payload interfaces were added under `apps/web/src/` (Constitution VI)
- [x] T035 Run full integration suite: `cd apps/api.tests && dotnet test` — no regressions
- [x] T036 Verify ≥80.0% line/branch coverage on touched backend files (`DashboardService.cs`, `DashboardController.cs`, `DashboardDtos.cs`, `LedgerVarianceHelper.cs`, `DashboardControllerTests.cs`) via `cd apps/api.tests && dotnet test --collect:"XPlat Code Coverage"` (contract B14)
- [x] T037 Run quickstart validation scenarios in `specs/031-dashboard-aggregate-api/quickstart.md`
- [x] T038 Mark rows B14–B15 complete in `specs/031-dashboard-aggregate-api/contracts/dashboard-api.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS all user stories**
- **User Story 1 (Phase 3)**: Depends on Foundational — **MVP**
- **User Story 4 (Phase 4)**: Depends on US1 controller/service existing — security hardening
- **User Story 2 (Phase 5)**: Depends on US1 service skeleton — adds aggregates to same service
- **User Story 3 (Phase 6)**: Depends on US1 partition logic — adds pin join to same service
- **Polish (Phase 7)**: Depends on all user story phases complete

### User Story Dependencies

- **User Story 1 (P1)**: After Foundational — no dependencies on other stories; delivers MVP endpoint + partitions
- **User Story 4 (P1)**: After US1 — validates security on existing endpoint; independently testable via 403/404 tests
- **User Story 2 (P2)**: After US1 — extends `EventCardDto` mapping in same service; independently testable via aggregate seed tests
- **User Story 3 (P3)**: After US1 — extends pin logic in same service; independently testable via pin API + GET dashboard tests

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- DTOs before service (Foundational)
- Service before controller (US1)
- Story tests green before next story phase
- Contract matrix rows marked complete per story checkpoint

### Parallel Opportunities

- T002 and T003 (Setup review tasks)
- T006, T007, T008 (US1 tests — same file but independent test methods, can be drafted together)
- T014, T015, T016 (US4 tests)
- T020, T021, T022 (US2 tests)
- T027, T028, T029 (US3 tests)
- T023 (LedgerVarianceHelper) parallel with US2 test authoring before T024

---

## Parallel Example: User Story 1

```bash
# Launch all US1 tests together (same file, independent methods):
Task: "Add failing test GetDashboard_Returns200_FourPartitionsPresent in apps/api.tests/Integration/DashboardControllerTests.cs"
Task: "Add failing test GetDashboard_PartitionMatrix_DateBoundaries in apps/api.tests/Integration/DashboardControllerTests.cs"
Task: "Add failing test GetDashboard_EmptyVenue_AllPartitionsEmpty in apps/api.tests/Integration/DashboardControllerTests.cs"
```

---

## Parallel Example: User Story 2

```bash
# Launch US2 tests and helper in parallel:
Task: "Add failing test GetDashboard_VarianceConcern_FlaggedWhenNonZeroVariance in apps/api.tests/Integration/DashboardControllerTests.cs"
Task: "Add failing test GetDashboard_UnmappedCount_MatchesSeededRows in apps/api.tests/Integration/DashboardControllerTests.cs"
Task: "Create LedgerVarianceHelper in apps/api/Services/LedgerVarianceHelper.cs"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (DTOs + test scaffold)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: `dotnet test --filter DashboardControllerTests` — partition + empty venue green
5. Optionally add Phase 4 (US4 security) before aggregates

### Incremental Delivery

1. Setup + Foundational → DTOs and test harness ready
2. User Story 1 → Partitioned dashboard GET (MVP)
3. User Story 4 → Tenant/venue/permission gates
4. User Story 2 → Variance, unmapped, sync summaries
5. User Story 3 → Server-side pin partition
6. Polish → Type regen + coverage gate

### Parallel Team Strategy

With multiple developers after Foundational:

- Developer A: User Story 1 (partitions + endpoint)
- Developer B: User Story 4 tests (can start once T011 lands)
- After US1+US4: Developer A → US2 aggregates; Developer B → US3 pins

---

## Notes

- Single EF round-trip requirement (Constitution VII): all Includes added in US1 T009; pin join added in US3 T030 without extra per-event queries
- No new migrations — consumes existing tables only
- ActionCenter / FinancialHealth blocks explicitly out of scope (SPLR-74)
- Frontend `useDashboard()` wiring deferred to SPLR-71 — this feature only regenerates types
- Partition reference date: UTC (`DateOnly.FromDateTime(DateTime.UtcNow)`) per research.md
- Avoid: N+1 sync status calls via `QboSyncService.GetSyncStatusAsync`; aggregates computed from included navigation properties
