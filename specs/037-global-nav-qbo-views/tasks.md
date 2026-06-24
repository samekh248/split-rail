---
description: "Task list for Wire Global Nav Settlements and Accounting Sync to Venue QBO Views (SPLR-77)"
---

# Tasks: Wire Global Nav Settlements and Accounting Sync to Venue QBO Views

**Input**: Design documents from `/specs/037-global-nav-qbo-views/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/venue-qbo-sync-api.md, contracts/accounting-overview-ui.md, quickstart.md; upstream **035** (banner/drawer), **034** (action center), **032** (`useDashboard`), **031** (dashboard API), **003** (per-event QBO sync)

**Tests**: REQUIRED per Constitution III. Each user story phase adds failing tests first, then implement until green. Final Polish phase enforces ≥80.0% line/branch coverage on **backend** (`dotnet test` + coverlet → cobertura) and **frontend** (`npm run test:coverage` → lcov) for touched files. Missing or unparseable coverage reports FAIL.

**Organization**: Tasks grouped by user story (US1–US4). Vertical slice across `apps/api/`, `apps/api.tests/`, `apps/web/src/`, `apps/web/tests/`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1–US4 (maps to user stories in spec.md)
- All paths are repo-relative

## Path Conventions

- Backend DTOs: `apps/api/DTOs/Qbo/`
- Backend service: `apps/api/Services/QboSyncService.cs`
- Backend controller: `apps/api/Controllers/QboSyncController.cs` (venue-scoped routes on `QboMappingController` route prefix `api/venues/{venueId}`)
- Frontend lib: `apps/web/src/lib/globalNav.ts`, `apps/web/src/lib/appRoute.ts`, `apps/web/src/lib/accountingWorkload.ts`
- Frontend page: `apps/web/src/pages/AccountingOverviewPage.tsx`
- Frontend components: `apps/web/src/components/shell/GlobalNav.tsx`, `apps/web/src/components/accounting/`, `apps/web/src/components/qbo/SyncAllButton.tsx`
- API hooks: `apps/web/src/api/qbo.ts`
- Styles: `apps/web/src/index.css`
- Tests: `apps/api.tests/Integration/`, `apps/web/tests/shell/`, `apps/web/tests/lib/`, `apps/web/tests/pages/`, `apps/web/tests/components/qbo/`
- Contracts: `specs/037-global-nav-qbo-views/contracts/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm branch, upstream dependencies, and contracts before implementation.

- [x] T001 Verify branch `037-global-nav-qbo-views` and design docs in `specs/037-global-nav-qbo-views/` per plan.md
- [x] T002 [P] Review API contract in `specs/037-global-nav-qbo-views/contracts/venue-qbo-sync-api.md` (status + venue sync shapes, permissions, partial failure)
- [x] T003 [P] Review UI contract in `specs/037-global-nav-qbo-views/contracts/accounting-overview-ui.md` (routes, test IDs, permission filter, component props)
- [x] T004 [P] Confirm upstream **035** merged: `UnassignedTransactionsBanner.tsx` and `UnassignedTransactionsDrawer.tsx` exist under `apps/web/src/components/dashboard/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Venue QBO status + venue-wide sync API, regenerated types, and shared test mocks. **Blocks US2 Sync all and status card; US1 can proceed after T010 if backend runs in parallel.**

**⚠️ CRITICAL**: Backend endpoints and `generated-api.ts` types MUST exist before `SyncAllButton` and `useVenueQboStatus` implementation.

- [x] T005 [P] Add failing integration test: `GET /api/venues/{venueId}/qbo/status` returns `qboConnected` and `lastSyncedAt` in `apps/api.tests/Integration/VenueQboSyncTests.cs` per `specs/037-global-nav-qbo-views/contracts/venue-qbo-sync-api.md`
- [x] T006 [P] Add failing integration test: `POST /api/venues/{venueId}/sync` returns `VenueSyncResultDto` with per-event results in `apps/api.tests/Integration/VenueQboSyncTests.cs`
- [x] T007 [P] Add failing integration tests: out-of-scope venue `404`, missing `TriggerQboSync` → `403` on POST sync in `apps/api.tests/Integration/VenueQboSyncTests.cs`
- [x] T008 Create `VenueQboStatusDto.cs`, `VenueSyncEventResultDto.cs`, `VenueSyncResultDto.cs` in `apps/api/DTOs/Qbo/` per `specs/037-global-nav-qbo-views/data-model.md`
- [x] T009 Implement `GetVenueQboStatusAsync` and `SyncVenueEventsAsync` in `apps/api/Services/QboSyncService.cs` (`.AsNoTracking()`, per-event try/catch, sanitized errors)
- [x] T010 Expose `GET .../qbo/status` and `POST .../sync` on venue controller in `apps/api/Controllers/QboSyncController.cs` with `[RequirePermission]` attributes per contract
- [x] T011 Regenerate OpenAPI and `apps/web/src/types/generated-api.ts` after `dotnet build` in `apps/api/`
- [x] T012 Run foundational backend tests until green: `cd apps/api.tests && dotnet test --filter "FullyQualifiedName~VenueQboSync"`
- [x] T013 [P] Extend `apps/web/tests/utils/mockWorkspaceFetch.ts` with handlers for `GET /venues/{id}/qbo/status` and `POST /venues/{id}/sync`
- [x] T014 [P] Add BEM CSS scaffold for `.accounting-overview`, `.venue-qbo-status-card`, `.accounting-workload-list` in `apps/web/src/index.css`

**Checkpoint**: Venue sync/status API green; types in `generated-api.ts`; mocks and styles ready

---

## Phase 3: User Story 1 — Reach Venue Accounting Overview from Global Navigation (Priority: P1) 🎯 MVP

**Goal**: Financial users click **Settlements / Accounting Sync** → `/accounting` overview; accounting nav highlighted; dashboard highlight unchanged on `/` and workspace routes; all-venues exits to single venue; no-venue empty state.

**Independent Test**: `cd apps/web && npm run test -- tests/shell/GlobalNav.test.tsx tests/lib/globalNav.test.ts tests/pages/AccountingOverviewPage.test.tsx --testNamePattern="accounting|active|all-venues|empty"` — nav routes to `/accounting`, active states correct (quickstart §5–6, §9).

### Tests for User Story 1 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T015 [P] [US1] Add failing test: `resolveActiveGlobalNavId('/accounting') === 'accounting'` in `apps/web/tests/lib/globalNav.test.ts`
- [x] T016 [P] [US1] Add failing test: dashboard/workspace routes still resolve `dashboard` active id in `apps/web/tests/lib/globalNav.test.ts`
- [x] T017 [P] [US1] Add failing test: accounting nav click navigates to `/accounting` in `apps/web/tests/shell/GlobalNav.test.tsx`
- [x] T018 [P] [US1] Add failing test: accounting item active on `/accounting`, dashboard not active in `apps/web/tests/shell/GlobalNav.test.tsx`
- [x] T019 [P] [US1] Add failing test: `navigateToAccounting` exits all-venues via `activateVenueId` in `apps/web/tests/lib/globalNav.test.ts` (mock `VenueContext`)
- [x] T020 [P] [US1] Add failing test: `AccountingOverviewPage` renders no-venue empty state when no active venue in `apps/web/tests/pages/AccountingOverviewPage.test.tsx`

### Implementation for User Story 1

- [x] T021 [US1] Extend `AppPath`, `getAppPath`, `navigateToAccounting`, and `pushPath('/accounting')` in `apps/web/src/lib/appRoute.ts` per contract
- [x] T022 [US1] Enable accounting item (`navigate`, `matchPaths: ['/accounting']`, remove `disabled`) in `apps/web/src/lib/globalNav.ts`
- [x] T023 [US1] Wire `appPath === '/accounting'` → `AccountingOverviewPage` in `apps/web/src/App.tsx`
- [x] T024 [US1] Create minimal `AccountingOverviewPage.tsx` shell with title and dashboard no-venue empty-state reuse in `apps/web/src/pages/AccountingOverviewPage.tsx`
- [x] T025 [US1] Run US1 tests until green: `cd apps/web && npm run test -- tests/lib/globalNav.test.ts tests/shell/GlobalNav.test.tsx tests/pages/AccountingOverviewPage.test.tsx`

**Checkpoint**: MVP — operators with financial permission reach `/accounting` from global nav; SC-001 satisfied

---

## Phase 4: User Story 2 — Review Venue-Wide QBO Sync and Settlement Workload (Priority: P1)

**Goal**: Accounting overview shows QBO status card, unassigned banner/drawer (035 reuse), workload list, workspace deep links, and venue-wide **Sync all** for sync-trigger users.

**Independent Test**: `cd apps/web && npm run test -- tests/pages/AccountingOverviewPage.test.tsx tests/lib/accountingWorkload.test.ts tests/components/qbo/SyncAllButton.test.tsx` — status card, banner, workload rows, sync all visibility and partial failure (quickstart §7–8).

### Tests for User Story 2 (REQUIRED) ⚠️

- [x] T026 [P] [US2] Add failing unit tests for `deriveAccountingWorkloadEvents` (dedupe, sort, alert inclusion) in `apps/web/tests/lib/accountingWorkload.test.ts`
- [x] T027 [P] [US2] Add failing test: overview shows `VenueQboStatusCard` when venue selected in `apps/web/tests/pages/AccountingOverviewPage.test.tsx`
- [x] T028 [P] [US2] Add failing test: `UnassignedTransactionsBanner` renders from dashboard `actionCenter` on accounting page in `apps/web/tests/pages/AccountingOverviewPage.test.tsx`
- [x] T029 [P] [US2] Add failing test: workload list rows link to event workspace with `focus=sync` in `apps/web/tests/pages/AccountingOverviewPage.test.tsx`
- [x] T030 [P] [US2] Add failing test: `SyncAllButton` hidden without `canTriggerQboSync` in `apps/web/tests/components/qbo/SyncAllButton.test.tsx`
- [x] T031 [P] [US2] Add failing test: `SyncAllButton` shows partial-failure summary when `VenueSyncResultDto` has failed events in `apps/web/tests/components/qbo/SyncAllButton.test.tsx`

### Implementation for User Story 2

- [x] T032 [P] [US2] Implement `deriveAccountingWorkloadEvents` in `apps/web/src/lib/accountingWorkload.ts` using `eventCardSummary` bottleneck helpers
- [x] T033 [P] [US2] Add `useVenueQboStatus` and `useVenueSync` hooks in `apps/web/src/api/qbo.ts` per contract
- [x] T034 [US2] Create `VenueQboStatusCard.tsx` (connected badge, `lastSyncedAt`, disconnected guidance) in `apps/web/src/components/accounting/VenueQboStatusCard.tsx`
- [x] T035 [US2] Create `AccountingWorkloadList.tsx` with event rows and workspace links in `apps/web/src/components/accounting/AccountingWorkloadList.tsx`
- [x] T036 [US2] Create `SyncAllButton.tsx` with permission gate and dashboard/qbo invalidation in `apps/web/src/components/qbo/SyncAllButton.tsx`
- [x] T037 [US2] Compose full `AccountingOverviewPage.tsx` — `useDashboard`, banner/drawer (`isAllVenuesView={false}`), status card, workload list, sync all, venue-switch refresh in `apps/web/src/pages/AccountingOverviewPage.tsx`
- [x] T038 [US2] Run US2 tests until green: `cd apps/web && npm run test -- tests/lib/accountingWorkload.test.ts tests/pages/AccountingOverviewPage.test.tsx tests/components/qbo/SyncAllButton.test.tsx`

**Checkpoint**: Accounting overview delivers full triage + sync value; SC-004, SC-005, SC-008 satisfied

---

## Phase 5: User Story 3 — Global Navigation Respects Financial Permissions (Priority: P1)

**Goal**: Accounting nav hidden without `canViewFinancials`; enabled without "Coming soon" with permission; direct URL to `/accounting` denied for unauthorized users.

**Independent Test**: `cd apps/web && npm run test -- tests/shell/GlobalNav.test.tsx tests/pages/AccountingOverviewPage.test.tsx --testNamePattern="permission|financial|unauthorized"` — three role fixtures (quickstart §4).

### Tests for User Story 3 (REQUIRED) ⚠️

- [x] T039 [P] [US3] Add failing test: accounting nav item absent when `canViewFinancials === false` in `apps/web/tests/shell/GlobalNav.test.tsx`
- [x] T040 [P] [US3] Add failing test: accounting item has no "Coming soon" label when financial permission granted in `apps/web/tests/shell/GlobalNav.test.tsx`
- [x] T041 [P] [US3] Add failing test: unauthorized user navigating to `/accounting` sees access denial (match existing financial page pattern) in `apps/web/tests/pages/AccountingOverviewPage.test.tsx`

### Implementation for User Story 3

- [x] T042 [US3] Filter `GLOBAL_NAV_ITEMS` in `GlobalNav.tsx` — omit `accounting` when `useCanManageEvents()` false; add FA icons (`faGauge`, `faCalendarDays`, `faArrowsRotate`) per Constitution IX in `apps/web/src/components/shell/GlobalNav.tsx`
- [x] T043 [US3] Add financial permission guard on `AccountingOverviewPage` (redirect or empty denial consistent with `EventLedgerPage` pattern) in `apps/web/src/pages/AccountingOverviewPage.tsx`
- [x] T044 [US3] Run US3 tests until green: `cd apps/web && npm run test -- tests/shell/GlobalNav.test.tsx tests/pages/AccountingOverviewPage.test.tsx`

**Checkpoint**: Permission matrix passes; SC-003 satisfied

---

## Phase 6: User Story 4 — Booking Calendar Remains a Placeholder (Priority: P3)

**Goal**: Booking Calendar stays disabled with "Coming soon"; clicks do not navigate.

**Independent Test**: `cd apps/web && npm run test -- tests/shell/GlobalNav.test.tsx --testNamePattern="booking|Coming soon"` — unchanged placeholder behavior (quickstart implicit; SC-006).

### Tests for User Story 4 (REQUIRED) ⚠️

- [x] T045 [P] [US4] Add failing regression test: booking item still disabled with "Coming soon" after accounting enabled in `apps/web/tests/shell/GlobalNav.test.tsx`
- [x] T046 [P] [US4] Add failing regression test: booking click does not change `getAppPath()` in `apps/web/tests/shell/GlobalNav.test.tsx`

### Implementation for User Story 4

- [x] T047 [US4] Verify `booking` item remains `disabled: true` with no `navigate` in `apps/web/src/lib/globalNav.ts`; run US4 tests until green

**Checkpoint**: SC-006 satisfied; partial module rollout preserved

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Mobile drawer parity, coverage gate, quickstart validation.

- [x] T048 [P] Extend `apps/web/tests/shell/MobileNavDrawer.test.tsx` — accounting nav reachable and permission-filtered in mobile drawer
- [x] T049 [P] Verify venue switch on `/accounting` refreshes dashboard + status queries (integration assertion in `AccountingOverviewPage.test.tsx`)
- [x] T050 Run quickstart manual scenarios in `specs/037-global-nav-qbo-views/quickstart.md` §4–9 and document any deviations in PR notes
- [x] T051 Run frontend coverage gate: `cd apps/web && npm run test:coverage` — verify ≥80.0% line/branch on touched files under `components/shell/`, `components/accounting/`, `components/qbo/SyncAllButton.tsx`, `pages/AccountingOverviewPage.tsx`, `lib/globalNav.ts`, `lib/accountingWorkload.ts`
- [x] T052 Run backend coverage gate: `cd apps/api.tests && dotnet test /p:CollectCoverage=true --filter "FullyQualifiedName~VenueQboSync"` — verify ≥80.0% line/branch on `QboSyncService` venue methods and new controller actions

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **blocks US2** sync/status UI; US1 routing can start after T014 if backend team parallelizes
- **US1 (Phase 3)**: Depends on Setup; minimal page shell does not require Phase 2
- **US2 (Phase 4)**: Depends on Phase 2 complete (API + types)
- **US3 (Phase 5)**: Depends on US1 (`GlobalNav` + page exist); can overlap US2 implementation
- **US4 (Phase 6)**: Depends on US1 (`globalNav.ts` touched)
- **Polish (Phase 7)**: Depends on US1–US4 complete

### User Story Dependencies

| Story | Depends on | Independently testable via |
|-------|------------|----------------------------|
| US1 | Setup | `globalNav.test.ts`, `GlobalNav.test.tsx`, page shell tests |
| US2 | Phase 2, US1 page shell | `accountingWorkload.test.ts`, `AccountingOverviewPage.test.tsx`, `SyncAllButton.test.tsx` |
| US3 | US1 | Permission tests on `GlobalNav` + page guard |
| US4 | US1 | Booking placeholder regression in `GlobalNav.test.tsx` |

### Parallel Opportunities

- **Phase 1**: T002 ∥ T003 ∥ T004
- **Phase 2**: T005 ∥ T006 ∥ T007 (tests); T013 ∥ T014 while backend T008–T012 sequential
- **Phase 3 tests**: T015 ∥ T016 ∥ T017 ∥ T018 ∥ T019 ∥ T020
- **Phase 4 tests**: T026 ∥ T027 ∥ T028 ∥ T029 ∥ T030 ∥ T031
- **Phase 4 impl**: T032 ∥ T033 parallel; then T034 ∥ T035 ∥ T036 parallel; T037 integrates
- **Phase 5 tests**: T039 ∥ T040 ∥ T041
- **Phase 7**: T048 ∥ T049 ∥ T050; T051 ∥ T052

---

## Parallel Example: User Story 2

```bash
# Launch all US2 test scaffolding together:
Task T026: deriveAccountingWorkloadEvents tests in apps/web/tests/lib/accountingWorkload.test.ts
Task T027: status card test in apps/web/tests/pages/AccountingOverviewPage.test.tsx
Task T030: SyncAllButton permission test in apps/web/tests/components/qbo/SyncAllButton.test.tsx

# Launch parallel components after hooks:
Task T034: VenueQboStatusCard.tsx
Task T035: AccountingWorkloadList.tsx
Task T036: SyncAllButton.tsx
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 3: US1 (routing + page shell — skip Phase 2 if deferring Sync all)
3. **STOP and VALIDATE**: Nav reaches `/accounting`; active states correct
4. Demo MVP navigation wiring

### Incremental Delivery

1. Setup + Foundational → API ready
2. US1 → Nav + empty overview (MVP!)
3. US2 → Full accounting triage + sync
4. US3 → Permission hardening
5. US4 → Booking placeholder regression
6. Polish → Coverage + quickstart

### Suggested MVP Scope

**User Story 1 only** (Phase 1 + Phase 3): Delivers global nav wiring and `/accounting` destination — satisfies SC-001 and SC-002. US2 adds operational value (SC-004, SC-008).

---

## Notes

- `[P]` tasks = different files, no ordering dependency within the same phase
- `[USn]` label maps to `spec.md` user stories
- Verify tests **fail** before implementing (TDD per Constitution III)
- Commit after each checkpoint or story phase
- **SPLR-76 / 036**: Workload list uses existing `eventCardSummary` helpers; 036 UI widgets not required for this feature
