---
description: "Task list for Dashboard Unassigned Transactions Banner (SPLR-75)"
---

# Tasks: Dashboard Unassigned Transactions Banner

**Input**: Design documents from `/specs/035-unassigned-transactions-banner/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/unassigned-transactions-banner-ui.md, quickstart.md; upstream **034** (`actionCenter` on `DashboardResponse`), **032** (`useDashboard` / overview wire), **003** (QBO unmapped + inline mapping)

**Tests**: REQUIRED per Constitution III. Each user story phase adds failing Vitest + RTL tests first in `apps/web/tests/`, then implement until green. Final Polish phase enforces ≥80.0% line/branch coverage on **frontend** touched files via `npm run test:coverage` (Vitest → lcov). No backend file changes — backend coverage gate N/A (document in Polish task). Missing or unparseable coverage reports FAIL.

**Organization**: Tasks grouped by user story (US1–US4). Frontend-only through `apps/web/src/` and `apps/web/tests/`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1–US4 (maps to user stories in spec.md)
- All paths are repo-relative

## Path Conventions

- API hooks: `apps/web/src/api/dashboard.ts`
- Components: `apps/web/src/components/dashboard/`, `apps/web/src/components/qbo/InlineMappingDropdown.tsx`
- Page: `apps/web/src/pages/DashboardOverviewPage.tsx`
- Styles: `apps/web/src/index.css`
- Tests: `apps/web/tests/api/`, `apps/web/tests/components/dashboard/`, `apps/web/tests/pages/`
- Contract: `specs/035-unassigned-transactions-banner/contracts/unassigned-transactions-banner-ui.md`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm branch, upstream dependencies, and UI contract before implementation.

- [x] T001 Verify branch `035-unassigned-transactions-banner` and design docs in `specs/035-unassigned-transactions-banner/` per plan.md
- [x] T002 [P] Review UI contract matrix in `specs/035-unassigned-transactions-banner/contracts/unassigned-transactions-banner-ui.md` (test IDs, props, invalidation rules)
- [x] T003 [P] Confirm upstream **034** complete: `ActionCenterDto` / `UnmappedEventSummaryDto` present in `apps/web/src/types/generated-api.ts` and `actionCenter` on `DashboardResponse`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Dashboard hook merge for all-venues action center, shared styles, and test scaffolding. **Blocks all user stories.**

**⚠️ CRITICAL**: No user story implementation begins until `mergeActionCenter` is tested and `useAllVenuesDashboard` exposes `actionCenter`.

- [x] T004 [P] Add failing unit tests for `mergeActionCenter` (sum totals, concat events, re-sort count desc / date asc) in `apps/web/tests/api/dashboard.test.ts` per `specs/035-unassigned-transactions-banner/data-model.md`
- [x] T005 Implement `mergeActionCenter` and extend `useAllVenuesDashboard` return with `actionCenter` in `apps/web/src/api/dashboard.ts` per `specs/035-unassigned-transactions-banner/research.md` §1
- [x] T006 Run foundational hook tests until green: `cd apps/web && npm run test -- tests/api/dashboard.test.ts`
- [x] T007 [P] Add BEM CSS scaffold for `.unassigned-transactions-banner`, `.unassigned-drawer`, accordion rows in `apps/web/src/index.css` per contract
- [x] T008 [P] Extend dashboard/overview test mocks with sample `actionCenter` payloads in `apps/web/tests/pages/DashboardOverviewPage.test.tsx` (helpers only; no story assertions yet)

**Checkpoint**: `mergeActionCenter` green; styles scaffolded; mocks ready — user story work can begin

---

## Phase 3: User Story 1 — See Venue-Wide Unassigned Transaction Alert (Priority: P1) 🎯 MVP

**Goal**: Prominent banner on dashboard overview when `actionCenter.totalUnmappedCount > 0`; hidden when zero or dashboard loading; works in single-venue and all-venues views.

**Independent Test**: `cd apps/web && npm run test -- tests/components/dashboard/UnassignedTransactionsBanner.test.tsx --testNamePattern="visibility|loading"` — banner shows correct count when > 0, absent when 0 or loading (quickstart Scenario A, G).

### Tests for User Story 1 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T009 [P] [US1] Add failing test: banner hidden when `totalUnmappedCount === 0` in `apps/web/tests/components/dashboard/UnassignedTransactionsBanner.test.tsx`
- [x] T010 [P] [US1] Add failing test: banner hidden while `isLoading === true` (no flash) in `apps/web/tests/components/dashboard/UnassignedTransactionsBanner.test.tsx`
- [x] T011 [P] [US1] Add failing test: banner shows `"{n} unassigned transaction(s) detected"` when count > 0 in `apps/web/tests/components/dashboard/UnassignedTransactionsBanner.test.tsx`
- [x] T012 [P] [US1] Add failing overview integration test: banner renders when dashboard `actionCenter.totalUnmappedCount > 0` in `apps/web/tests/pages/DashboardOverviewPage.test.tsx`

### Implementation for User Story 1

- [x] T013 [US1] Create `UnassignedTransactionsBanner.tsx` with visibility rules, `role="alert"`, `data-testid="unassigned-transactions-banner"`, and FA alert icon in `apps/web/src/components/dashboard/UnassignedTransactionsBanner.tsx`
- [x] T014 [US1] Wire banner into `DashboardOverviewPage.tsx` above `dashboard-overview__zones` — pass `actionCenter` from single-venue `useDashboard` or merged `useAllVenuesDashboard` in `apps/web/src/pages/DashboardOverviewPage.tsx`
- [x] T015 [US1] Run US1 tests until green: `cd apps/web && npm run test -- tests/components/dashboard/UnassignedTransactionsBanner.test.tsx tests/pages/DashboardOverviewPage.test.tsx`

**Checkpoint**: MVP — operators see venue-wide unassigned alert on overview; SC-001 satisfied

---

## Phase 4: User Story 2 — Review Per-Event Workload in Inline Drawer (Priority: P1)

**Goal**: Clicking banner opens inline drawer listing events with unmapped counts (sorted), venue names in all-venues mode, dismissible without navigation.

**Independent Test**: `cd apps/web && npm run test -- tests/components/dashboard/UnassignedTransactionsBanner.test.tsx --testNamePattern="drawer|venue"` — drawer opens/closes, lists events with title/date/count, venue prefix in all-venues mode (quickstart Scenario B, F).

### Tests for User Story 2 (REQUIRED) ⚠️

- [x] T016 [P] [US2] Add failing test: banner toggle opens drawer (`data-testid="unassigned-drawer"`) without route change in `apps/web/tests/components/dashboard/UnassignedTransactionsBanner.test.tsx`
- [x] T017 [P] [US2] Add failing test: drawer lists event rows with title, date, per-event count in `apps/web/tests/components/dashboard/UnassignedTransactionsBanner.test.tsx`
- [x] T018 [P] [US2] Add failing test: all-venues mode shows venue name on each row in `apps/web/tests/components/dashboard/UnassignedTransactionsBanner.test.tsx`
- [x] T019 [P] [US2] Add failing test: drawer dismisses on close button and Escape in `apps/web/tests/components/dashboard/UnassignedTransactionsBanner.test.tsx`

### Implementation for User Story 2

- [x] T020 [US2] Create `UnassignedTransactionsDrawer.tsx` with backdrop, panel, focus trap (pattern from `MobileNavDrawer`), and event row headers in `apps/web/src/components/dashboard/UnassignedTransactionsDrawer.tsx`
- [x] T021 [US2] Wire drawer open/close state in `UnassignedTransactionsBanner.tsx` — banner toggle opens drawer; pass `eventsWithUnmapped`, `venues`, `isAllVenuesView` props
- [x] T022 [US2] Resolve venue display name from `venues` by `venueId` when `isAllVenuesView` in `apps/web/src/components/dashboard/UnassignedTransactionsDrawer.tsx`
- [x] T023 [US2] Close drawer on venue switch via `key` or `useEffect` on `activeVenueId` / `isAllVenuesSelected` in `apps/web/src/components/dashboard/UnassignedTransactionsBanner.tsx`
- [x] T024 [US2] Run US2 tests until green: `cd apps/web && npm run test -- tests/components/dashboard/UnassignedTransactionsBanner.test.tsx`

**Checkpoint**: Drawer triage list works; SC-002 satisfied

---

## Phase 5: User Story 3 — Map Transactions Inline from Drawer (Priority: P1)

**Goal**: Accordion expand per event reveals transaction list with `InlineMappingDropdown`; mapping refreshes counts; final mapping shows success message while drawer stays open.

**Independent Test**: `cd apps/web && npm run test -- tests/components/dashboard/UnassignedTransactionsBanner.test.tsx --testNamePattern="accordion|mapping|success"` — expand shows transactions, mapping removes row, zero-count success state (quickstart Scenarios C, D).

### Tests for User Story 3 (REQUIRED) ⚠️

- [x] T025 [P] [US3] Add failing test: accordion expand shows transaction list (`data-testid="unassigned-event-list-{eventId}"`) in `apps/web/tests/components/dashboard/UnassignedTransactionsBanner.test.tsx`
- [x] T026 [P] [US3] Add failing test: collapse hides transaction list while drawer remains open in `apps/web/tests/components/dashboard/UnassignedTransactionsBanner.test.tsx`
- [x] T027 [P] [US3] Add failing test: successful mapping triggers dashboard query invalidation (mock `queryClient.invalidateQueries` with `dashboardQueryKey`) in `apps/web/tests/components/dashboard/UnassignedTransactionsBanner.test.tsx`
- [x] T028 [P] [US3] Add failing test: when count reaches zero, banner hidden and `data-testid="unassigned-drawer-success"` shown in `apps/web/tests/components/dashboard/UnassignedTransactionsBanner.test.tsx`

### Implementation for User Story 3

- [x] T029 [US3] Add accordion `expandedEventIds` state and lazy `useUnmappedTransactions` + `useLedger` per expanded row in `apps/web/src/components/dashboard/UnassignedTransactionsDrawer.tsx`
- [x] T030 [US3] Render `InlineMappingDropdown` per transaction row (same fields as `UnmappedBanner`) in `apps/web/src/components/dashboard/UnassignedTransactionsDrawer.tsx`
- [x] T031 [US3] Extend `InlineMappingDropdown.tsx` to `invalidateQueries({ queryKey: dashboardQueryKey(venueId) })` on successful mapping in `apps/web/src/components/qbo/InlineMappingDropdown.tsx`
- [x] T032 [US3] Implement zero-count success alert in drawer when `totalUnmappedCount === 0` while open in `apps/web/src/components/dashboard/UnassignedTransactionsDrawer.tsx`
- [x] T033 [US3] Run US3 tests until green: `cd apps/web && npm run test -- tests/components/dashboard/UnassignedTransactionsBanner.test.tsx`

**Checkpoint**: Inline mapping from overview works; SC-003 satisfied

---

## Phase 6: User Story 4 — Jump to Event Sync Workspace (Priority: P2)

**Goal**: Each drawer event row links to event workspace with `?focus=sync` for deeper cleanup.

**Independent Test**: `cd apps/web && npm run test -- tests/components/dashboard/UnassignedTransactionsBanner.test.tsx --testNamePattern="workspace"` — link calls `navigateToEventWorkspace(venueId, eventId, 'sync')` (quickstart Scenario E).

### Tests for User Story 4 (REQUIRED) ⚠️

- [x] T034 [P] [US4] Add failing test: workspace link (`data-testid="unassigned-event-workspace-link-{eventId}"`) navigates with sync focus in `apps/web/tests/components/dashboard/UnassignedTransactionsBanner.test.tsx`

### Implementation for User Story 4

- [x] T035 [US4] Add workspace link per event row calling `navigateToEventWorkspace(venueId, eventId, 'sync')` with `stopPropagation` on row header in `apps/web/src/components/dashboard/UnassignedTransactionsDrawer.tsx`
- [x] T036 [US4] Run US4 tests until green: `cd apps/web && npm run test -- tests/components/dashboard/UnassignedTransactionsBanner.test.tsx`

**Checkpoint**: Deep-link triage path complete; FR-010 satisfied

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Edge cases, contract sign-off, coverage gate, quickstart validation.

- [x] T037 Add recoverable empty/error state when `eventsWithUnmapped` empty but `totalUnmappedCount > 0` with retry in `apps/web/src/components/dashboard/UnassignedTransactionsDrawer.tsx` per spec edge cases
- [x] T038 [P] Add test: scrollable drawer body for large event lists (CSS `overflow-y: auto` on panel body) in `apps/web/tests/components/dashboard/UnassignedTransactionsBanner.test.tsx`
- [x] T039 [P] Mark implemented test IDs complete in `specs/035-unassigned-transactions-banner/contracts/unassigned-transactions-banner-ui.md`
- [x] T040 Verify ≥80.0% line/branch coverage on touched frontend files via `cd apps/web && npm run test:coverage -- tests/components/dashboard/UnassignedTransactionsBanner.test.tsx tests/api/dashboard.test.ts tests/pages/DashboardOverviewPage.test.tsx`; missing or unparseable lcov FAIL (Constitution III; backend N/A)
- [x] T041 Run quickstart.md validation scenarios A–G in `specs/035-unassigned-transactions-banner/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS all user stories**
- **User Story 1 (Phase 3)**: Depends on Foundational — MVP banner
- **User Story 2 (Phase 4)**: Depends on US1 banner shell (drawer wired to banner toggle)
- **User Story 3 (Phase 5)**: Depends on US2 drawer event rows
- **User Story 4 (Phase 6)**: Depends on US2 drawer rows (link on row header)
- **Polish (Phase 7)**: Depends on US1–US4 complete

### User Story Dependencies

| Story | Depends on | Independently testable via |
|-------|------------|---------------------------|
| US1 | Foundational | Banner visibility tests only |
| US2 | US1 (banner toggle) | Drawer open/list tests |
| US3 | US2 (drawer rows) | Accordion + mapping tests |
| US4 | US2 (drawer rows) | Workspace link test |

### Parallel Opportunities

- **Phase 1**: T002 ∥ T003
- **Phase 2**: T004 ∥ T007 ∥ T008 (after T004 written); T005 after T004 tests exist
- **US1 tests**: T009 ∥ T010 ∥ T011 ∥ T012
- **US2 tests**: T016 ∥ T017 ∥ T018 ∥ T019
- **US3 tests**: T025 ∥ T026 ∥ T027 ∥ T028
- **Polish**: T038 ∥ T039 while T037 in progress

---

## Parallel Example: User Story 1

```bash
# Launch all US1 tests together (must fail first):
npm run test -- tests/components/dashboard/UnassignedTransactionsBanner.test.tsx -t "hidden|loading|detected"
npm run test -- tests/pages/DashboardOverviewPage.test.tsx -t "banner"

# Then implement T013–T014 sequentially (same feature slice)
```

---

## Parallel Example: User Story 3

```bash
# Launch all US3 tests together:
npm run test -- tests/components/dashboard/UnassignedTransactionsBanner.test.tsx -t "accordion|mapping|success"

# Parallel implementation after tests red:
# T029 (drawer accordion) → T030 (inline dropdown) → T031 (invalidation in separate file [P] with T029)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (`mergeActionCenter`)
3. Complete Phase 3: User Story 1 (banner visibility)
4. **STOP and VALIDATE**: Banner appears/hides correctly on overview
5. Demo venue-wide alert without drawer if needed

### Incremental Delivery

1. Setup + Foundational → hook merge ready
2. US1 → banner alert (MVP)
3. US2 → drawer triage list
4. US3 → inline mapping + success state
5. US4 → workspace deep links
6. Polish → edge cases + coverage gate

### Suggested MVP Scope

**User Story 1 only** (Phases 1–3): venue-wide unassigned transaction banner on overview — delivers SC-001 discovery value before drawer/mapping work.

---

## Notes

- Frontend-only: no `apps/api` changes; Constitution VI types from `generated-api.ts` only
- Reuse `UnmappedBanner` / `InlineMappingDropdown` patterns — do not duplicate mapping logic
- FA icons per Constitution IX: `faTriangleExclamation`, `faXmark`, `faArrowUpRightFromSquare`
- Commit after each task or logical group
- Total tasks: **41** (T001–T041)
