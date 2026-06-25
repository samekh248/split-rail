---
description: "Task list for Venue Page Region Controls feature"
---

# Tasks: Venue Page Region Controls

**Input**: Design documents from `/specs/075-venue-region-controls/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/venues-page-ui.md, quickstart.md

**Tests**: REQUIRED per Constitution III. Every user story phase includes automated test tasks (write first, ensure fail). Final phase includes ≥80.0% coverage gate.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story label ([US1]–[US3])

## Path Conventions

- Backend: `apps/api/`, `apps/api.tests/` (no changes expected — regression only)
- Frontend: `apps/web/src/`, `apps/web/tests/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm environment, dependencies, and design artifacts before implementation

- [ ] T001 Verify feature branch `075-venue-region-controls` and review design docs in `specs/075-venue-region-controls/`
- [ ] T002 [P] Confirm `RegionResponse`, `VenueResponse.regionId`, and region hooks exist in `apps/web/src/types/generated-api.ts` and `apps/web/src/api/regions.ts` (spec 073 prerequisite)
- [ ] T003 [P] Review UI contract in `specs/075-venue-region-controls/contracts/venues-page-ui.md` and research decisions in `specs/075-venue-region-controls/research.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared pure lib and cookie persistence — MUST complete before User Stories 2 and 3

**⚠️ CRITICAL**: User Story 1 can start after Setup; User Stories 2 and 3 depend on this phase

### Tests for Foundational (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T004 [P] Write failing Vitest tests for `buildRegionFilterOptions`, `filterVenuesByRegion`, `sortVenuesByName`, and `buildGroupedSections` in `apps/web/tests/lib/venueListView.test.ts` per `specs/075-venue-region-controls/data-model.md` (scoped venues, empty regions, unassigned rules, A–Z sort)
- [ ] T005 [P] Write failing Vitest tests for cookie read/write defaults in `apps/web/tests/lib/venueListViewStorage.test.ts` mirroring `apps/web/tests/lib/bookingCalendarViewStorage.test.ts`

### Implementation for Foundational

- [ ] T006 Implement `buildRegionFilterOptions`, `filterVenuesByRegion`, `sortVenuesByName`, and `buildGroupedSections` in `apps/web/src/lib/venueListView.ts`
- [ ] T007 Implement `readVenuesPageRegionFilter`, `writeVenuesPageRegionFilter`, `readVenuesPageDisplayMode`, and `writeVenuesPageDisplayMode` in `apps/web/src/lib/venueListViewStorage.ts`
- [ ] T008 Run `apps/web/tests/lib/venueListView.test.ts` and `apps/web/tests/lib/venueListViewStorage.test.ts` until green

**Checkpoint**: Pure lib and storage ready — filter/group/sort logic independently testable

---

## Phase 3: User Story 1 — Manage regions from the Venues page (Priority: P1) 🎯 MVP

**Goal**: Relocate region CRUD entry point from Booking Calendar to Venues page; remove calendar manage-regions control (FR-001, FR-002)

**Independent Test**: Admin opens `/venues`, clicks **Manage regions**, creates/edits a region; Booking Calendar has no **Manage regions** button (quickstart Scenario A)

### Tests for User Story 1 (REQUIRED) ⚠️

- [ ] T009 [P] [US1] Extend failing Vitest tests in `apps/web/tests/pages/VenuesPage.test.tsx` — `venues-manage-regions` visible when `canManageVenues`, opens `booking-region-panel`, hidden without permission
- [ ] T010 [P] [US1] Extend failing Vitest tests in `apps/web/tests/pages/BookingCalendarPage.test.tsx` — assert `booking-manage-regions` is absent from `booking-calendar-controls`

### Implementation for User Story 1

- [ ] T011 [US1] Wire `RegionManagementPanel` and **Manage regions** button on `apps/web/src/pages/VenuesPage.tsx` with `data-testid="venues-manage-regions"` gated by `useCanManageVenues()`
- [ ] T012 [US1] Remove `onManageRegions` prop and **Manage regions** button from `apps/web/src/components/booking/BookingCalendarControls.tsx`
- [ ] T013 [US1] Remove `regionsOpen` state and `RegionManagementPanel` wiring from `apps/web/src/pages/BookingCalendarPage.tsx`
- [ ] T014 [US1] Run US1 tests in `apps/web/tests/pages/VenuesPage.test.tsx` and `apps/web/tests/pages/BookingCalendarPage.test.tsx` until green

**Checkpoint**: Region administration reachable only from Venues page

---

## Phase 4: User Story 2 — Filter the venue list by region (Priority: P1)

**Goal**: Region filter dropdown on Venues page with correct options, client-side filtering, and distinct empty-filter state (FR-003, FR-004, FR-010)

**Independent Test**: Filter to each region and Unassigned; restore All regions; empty-filter message when no matches (quickstart Scenario B)

### Tests for User Story 2 (REQUIRED) ⚠️

- [ ] T015 [P] [US2] Write failing Vitest tests for `VenuesPageControls` region filter in `apps/web/tests/components/venue/VenuesPageControls.test.tsx` — option visibility, `venues-region-filter` testid, hidden when no regions
- [ ] T016 [P] [US2] Extend failing Vitest tests in `apps/web/tests/pages/VenuesPage.test.tsx` — filter reduces visible rows, Unassigned option only when applicable, empty-filter copy distinct from org-empty

### Implementation for User Story 2

- [ ] T017 [P] [US2] Create `VenuesPageControls` with region `<select>` (`data-testid="venues-region-filter"`) in `apps/web/src/components/venue/VenuesPageControls.tsx` per `contracts/venues-page-ui.md`
- [ ] T018 [US2] Integrate filter state, `buildRegionFilterOptions`, and `filterVenuesByRegion` into `apps/web/src/pages/VenuesPage.tsx`; pass filtered sorted venues to `VenueList`
- [ ] T019 [US2] Add filter-empty and no-regions helper copy in `apps/web/src/pages/VenuesPage.tsx` (FR-010)
- [ ] T020 [P] [US2] Add `venues-page-controls` toolbar styles in `apps/web/src/index.css`
- [ ] T021 [US2] Run US2 tests until green

**Checkpoint**: Region filter fully functional in flat list mode

---

## Phase 5: User Story 3 — Toggle grouped vs flat venue display (Priority: P2)

**Goal**: Display mode toggle, grouped sections with empty-region message, flat A–Z list without region column, cookie persistence (FR-005–FR-008a)

**Independent Test**: Toggle grouped/flat; grouped sections with "No venues"; preferences restored on return visit (quickstart Scenarios C–D)

### Tests for User Story 3 (REQUIRED) ⚠️

- [ ] T022 [P] [US3] Write failing Vitest tests for `VenueListGrouped` in `apps/web/tests/components/venue/VenueListGrouped.test.tsx` — section headings, `venues-region-empty-*`, no region column, edit/delete actions
- [ ] T023 [P] [US3] Extend failing Vitest tests in `apps/web/tests/components/venue/VenuesPageControls.test.tsx` — `venues-display-mode` toggle flat/grouped
- [ ] T024 [P] [US3] Extend failing Vitest tests in `apps/web/tests/pages/VenuesPage.test.tsx` — grouped vs flat render, filter+grouped composition, cookie persistence on remount

### Implementation for User Story 3

- [ ] T025 [P] [US3] Create `VenueListGrouped` component in `apps/web/src/components/venue/VenueListGrouped.tsx` with `data-testid="venues-grouped-list"` and per-section `venues-region-section-*` / `venues-region-empty-*`
- [ ] T026 [US3] Add display mode toggle to `apps/web/src/components/venue/VenuesPageControls.tsx` (`data-testid="venues-display-mode"`)
- [ ] T027 [US3] Wire `displayMode`, `buildGroupedSections`, `sortVenuesByName`, and `venueListViewStorage` read/write on change in `apps/web/src/pages/VenuesPage.tsx`; swap `VenueList` vs `VenueListGrouped`
- [ ] T028 [US3] Ensure flat mode passes pre-sorted venues only (no region column) via `apps/web/src/components/venue/VenueList.tsx` if caller contract adjustments needed
- [ ] T029 [P] [US3] Add grouped section styles (`venues-page__region-group`) in `apps/web/src/index.css`
- [ ] T030 [US3] Run US3 tests until green

**Checkpoint**: Full filter + grouped/flat + persistence complete

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Regression, coverage gate, and manual validation

- [ ] T031 [P] Run full `apps/web` test suite and fix regressions in `apps/web/tests/components/venue/VenueList.test.tsx` if sort/filter integration affected existing cases
- [ ] T032 Verify ≥80.0% line/branch coverage for changed frontend code via `cd apps/web && npm run test:coverage`; add targeted tests in `apps/web/tests/lib/venueListView.test.ts` or page tests if thresholds fail
- [ ] T033 Confirm no backend file changes; if accidental edits, revert — otherwise note zero backend delta for CI backend gate
- [ ] T034 Run quickstart scenarios A–F from `specs/075-venue-region-controls/quickstart.md` and record pass/fail

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **blocks US2 and US3**
- **User Story 1 (Phase 3)**: Depends on Setup only — **MVP** (can run parallel with Phase 2 after T001–T003)
- **User Story 2 (Phase 4)**: Depends on Foundational + US1 toolbar shell optional (US1 may add manage button before `VenuesPageControls`; US2 creates full toolbar)
- **User Story 3 (Phase 5)**: Depends on Foundational + US2 filter integration on `VenuesPage`
- **Polish (Phase 6)**: Depends on US1–US3 complete

### User Story Dependencies

- **US1 (P1)**: Independent after Setup — relocate manage regions
- **US2 (P1)**: Requires Foundational lib — adds region filter
- **US3 (P2)**: Requires Foundational lib + US2 page wiring — adds grouped view and persistence

### Within Each User Story

- Tests written and failing before implementation
- Lib before page integration
- Components before page wiring
- Story tests green before next story

### Parallel Opportunities

- T002 and T003 (Setup)
- T004 and T005 (Foundational tests)
- T009 and T010 (US1 tests)
- T015 and T016 (US2 tests)
- T022, T023, and T024 (US3 tests)
- T017 and T020 (US2 component + CSS)
- T025 and T029 (US3 component + CSS)

---

## Parallel Example: User Story 1

```bash
# Launch US1 tests together:
# apps/web/tests/pages/VenuesPage.test.tsx (manage regions cases)
# apps/web/tests/pages/BookingCalendarPage.test.tsx (no manage-regions)

# Then implementation T011–T013 in sequence (calendar cleanup after Venues wiring)
```

---

## Parallel Example: Foundational

```bash
# Launch lib tests together (fail first):
npm run test -- apps/web/tests/lib/venueListView.test.ts apps/web/tests/lib/venueListViewStorage.test.ts

# Then implement T006 and T007 in parallel (different files)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 3: User Story 1
3. **STOP and VALIDATE**: quickstart Scenario A
4. Demo region management on Venues page

### Incremental Delivery

1. Setup + Foundational → lib ready
2. US1 → region admin relocated (MVP)
3. US2 → region filter on flat list
4. US3 → grouped view + persistence
5. Polish → coverage + quickstart

### Parallel Team Strategy

1. Developer A: US1 (after Setup)
2. Developer B: Foundational lib (after Setup)
3. Once Foundational done: Developer B → US2, Developer C → US3 (after US2 page wiring)

---

## Notes

- Reuse `RegionManagementPanel` from `apps/web/src/components/booking/RegionManagementPanel.tsx` — do not duplicate CRUD UI
- Cookie keys: `venuesPageRegionFilter`, `venuesPageDisplayMode` (see `research.md` R2)
- No hand-written API types — `generated-api.ts` only (Constitution VI)
- Total tasks: **34** (Setup 3, Foundational 5, US1 6, US2 7, US3 9, Polish 4)
