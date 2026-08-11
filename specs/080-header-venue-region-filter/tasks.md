---

description: "Task list template for feature implementation"
---

# Tasks: Header Venue Dropdown Region Filter

**Input**: Design documents from `specs/080-header-venue-region-filter/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/venue-switcher-region-filter.md](./contracts/venue-switcher-region-filter.md), [quickstart.md](./quickstart.md)

**Tests**: REQUIRED per Constitution III. This is a frontend-only feature (no backend/API changes — see plan.md Summary), so automated coverage is Vitest + React Testing Library only; the final Polish phase includes the ≥80.0% frontend line/branch coverage gate.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

All paths are relative to the repository root, under the existing `apps/web` frontend project (no new projects/paths introduced).

---

## Phase 1: Setup

**Purpose**: Confirm the existing frontend environment is ready; no new dependencies are needed for this presentation-only feature.

- [ ] T001 Confirm branch `080-header-venue-region-filter` is checked out and `cd apps/web && npm install` is up to date (no new dependencies are added by this feature)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared data-fetching and derived state in `apps/web/src/components/venue/VenueSwitcher.tsx` that every user story depends on — pulling in region data and the region-filter gate (research.md D1, D5; data-model.md VR-001).

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T002 In `apps/web/src/components/venue/VenueSwitcher.tsx`, import and call `useRegions()` (from `@/api/regions`) and `filterVenuesByRegion`/`buildRegionFilterOptions` (from `@/lib/venueListView`); add local `regionFilter` state (`useState<VenueRegionFilter>('all')`, default `'all'`, no storage read/write per research.md D5); compute `showRegionFilter = !regionsLoading && regions.length > 0` and `filterOptions = buildRegionFilterOptions(venues, regions)`

**Checkpoint**: Foundation ready — region data, filter state, and the visibility gate are available; user story implementation can now begin

---

## Phase 3: User Story 1 - Narrow the header venue list to one region (Priority: P1) 🎯 MVP

**Goal**: Users with venues across regions can filter the header dropdown to a single region and still select any venue from that narrowed list exactly as they would from the unfiltered list.

**Independent Test**: Sign in as a user with venues across 2+ regions, open the header venue dropdown, filter to one region, confirm only that region's venues (plus "All Venues") are selectable, select one, and confirm it becomes the active venue (see quickstart.md "Multi-region org — filter").

### Tests for User Story 1 (REQUIRED) ⚠️

> Write these tests FIRST, ensure they FAIL before implementation

- [ ] T003 [P] [US1] In `apps/web/tests/venue/VenueSwitcher.test.tsx`, add a failing test asserting `data-testid="venue-switcher-region-filter"` renders when `regions` is non-empty, and selecting a specific region narrows the rendered `venue-option-{id}` entries to that region's venues plus `venue-option-all`
- [ ] T004 [P] [US1] In `apps/web/tests/venue/VenueSwitcher.test.tsx`, add a failing test asserting that clicking/selecting a `venue-option-{id}` entry from a filtered list calls the same `setActiveVenue` path (mock `useActiveVenue`) with that venue's id as when no filter is applied
- [ ] T005 [P] [US1] In `apps/web/tests/venue/VenueSwitcher.test.tsx`, add a failing test asserting that resetting the filter to "All regions" restores every accessible venue to the option list

### Implementation for User Story 1

- [ ] T006 [US1] In `apps/web/src/components/venue/VenueSwitcher.tsx`, render the region filter control (`<select data-testid="venue-switcher-region-filter">` using `filterOptions` from T002) inside the open dropdown menu, above the venue options, gated on `showRegionFilter`; `onChange` updates local `regionFilter` state only (depends on T002)
- [ ] T007 [US1] In `apps/web/src/components/venue/VenueSwitcher.tsx`, compute `filteredVenues = filterVenuesByRegion(venues, regionFilter)` and build the `kind: 'venue'` options from `filteredVenues` instead of the raw `venues` array; leave the `kind: 'all'` option (`ALL_VENUES_LABEL`) unaffected by `regionFilter` (depends on T002, T006)
- [ ] T008 [P] [US1] In `apps/web/src/index.css`, add `.venue-switcher__region-filter` styles sized/spaced to fit inside the existing `.venue-switcher__menu` popover

**Checkpoint**: User Story 1 is fully functional and independently testable — filtering narrows the flat list and selection works identically to today

---

## Phase 4: User Story 2 - Browse venues grouped by region (Priority: P2)

**Goal**: With no filter applied, venues in the header dropdown are grouped under region headings (plus "Unassigned" where applicable), while "All Venues" stays visible and unaffected, and section headings are visible but not selectable.

**Independent Test**: Sign in as a user with venues in 2+ regions and at least one unassigned venue, open the header dropdown with no filter, and confirm venues appear under region section headings, with headers skipped by keyboard navigation (see quickstart.md "Multi-region org — grouping").

### Tests for User Story 2 (REQUIRED) ⚠️

- [ ] T009 [P] [US2] In `apps/web/tests/venue/VenueSwitcher.test.tsx`, add a failing test asserting that with `regionFilter === 'all'` and regions present, venues render under `data-testid="venue-switcher-section-{sectionKey}"` heading rows in alphabetical region-name order, each followed by its venues
- [ ] T010 [P] [US2] In `apps/web/tests/venue/VenueSwitcher.test.tsx`, add a failing test asserting an "Unassigned" section (`venue-switcher-section-unassigned`) renders only when at least one accessible venue has no `regionId`, and is absent otherwise
- [ ] T011 [P] [US2] In `apps/web/tests/venue/VenueSwitcher.test.tsx`, add a failing test asserting `venue-option-all` always renders first, before any section heading, regardless of `regionFilter`
- [ ] T012 [P] [US2] In `apps/web/tests/venue/VenueSwitcher.test.tsx`, add a failing test asserting `ArrowDown`/`ArrowUp` traversal and `Enter` selection skip over `kind: 'header'` entries entirely (never highlighted, never selectable)

### Implementation for User Story 2

- [ ] T013 [US2] In `apps/web/src/components/venue/VenueSwitcher.tsx`, extend the `VenueOption` union with a non-selectable `{ kind: 'header'; label: string }` variant; update the `ArrowDown`/`ArrowUp` highlight-index logic and `Enter`/click handling to skip `kind: 'header'` entries (research.md D4)
- [ ] T014 [US2] In `apps/web/src/components/venue/VenueSwitcher.tsx`, when `showRegionFilter && regionFilter === 'all'`, replace the flat `filteredVenues`-based option list (from T007) with sections built via `buildGroupedSections(venues, regions, 'all')`, filtered to drop sections with zero venues (research.md D3), flattened into alternating `kind: 'header'` + `kind: 'venue'` entries; leave the specific-region-filter path (`regionFilter !== 'all'`) on the flat list from US1 (depends on T007, T013)
- [ ] T015 [P] [US2] In `apps/web/src/index.css`, add `.venue-switcher__section-heading` styles (non-interactive row) plus a muted modifier for the "Unassigned" heading, distinguishing it from named-region headings

**Checkpoint**: User Stories 1 AND 2 both work independently

---

## Phase 5: User Story 3 - Region filter behaves sensibly with no regions or empty results (Priority: P3)

**Goal**: Organizations with zero regions see the dropdown exactly as it behaves today (no filter control), and a region filter that matches no venues shows a clear inline message instead of a blank list.

**Independent Test**: For a zero-region org, confirm the filter control is absent; for a multi-region org, filter to a region with no accessible venues and confirm an empty-state message renders (see quickstart.md "No-regions / empty-result edge cases").

### Tests for User Story 3 (REQUIRED) ⚠️

- [ ] T016 [P] [US3] In `apps/web/tests/venue/VenueSwitcher.test.tsx`, add a failing test asserting that with `regions = []`, `venue-switcher-region-filter` is absent and the dropdown renders the same flat, ungrouped option list as before this feature
- [ ] T017 [P] [US3] In `apps/web/tests/venue/VenueSwitcher.test.tsx`, add a failing test asserting that filtering to a specific region (or "Unassigned") with zero matching venues renders `data-testid="venue-switcher-empty"` with an explanatory message, and no stray `venue-option-*` entries

### Implementation for User Story 3

- [ ] T018 [US3] In `apps/web/src/components/venue/VenueSwitcher.tsx`, when `regionFilter !== 'all'` and the resulting `filteredVenues`/section is empty, render an inline `data-testid="venue-switcher-empty"` message in place of the (empty) option list (depends on T007, T014)
- [ ] T019 [P] [US3] In `apps/web/src/index.css`, add `.venue-switcher__empty` styling consistent with existing empty-state treatments elsewhere in the app

**Checkpoint**: All three user stories are independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final verification across all stories

- [ ] T020 [P] Run `cd apps/web && npm run test:coverage` and confirm ≥80% line/branch coverage on `VenueSwitcher.tsx`; no backend changes are made by this feature, so `apps/api` coverage is unaffected
- [ ] T021 Run the manual validation checklist in `specs/080-header-venue-region-filter/quickstart.md` end-to-end (zero-regions org, filter, grouping, empty-result edge cases)
- [ ] T022 [P] Run `cd apps/web && npm run build` to confirm no TypeScript errors were introduced
- [ ] T023 [P] Confirm `apps/web/src/lib/venueListView.ts` and `apps/web/tests/lib/venueListView.test.ts` are unchanged — this feature consumes those selectors as-is (research.md D2)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories (T002 is the single entry point every story's implementation task depends on)
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - US1 (Phase 3) delivers the flat-filtered list and is independently shippable as the MVP
  - US2 (Phase 4) builds directly on US1's `filteredVenues`/option-list plumbing (T007, T013) but is its own independently testable increment
  - US3 (Phase 5) builds on both US1's filtering (T007) and US2's grouped sections (T014) to add the empty-state branch, so it's best done last
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational — no dependency on other stories
- **User Story 2 (P2)**: Can start after Foundational, but its implementation (T014) builds on US1's option-list plumbing (T007)
- **User Story 3 (P3)**: Can start after Foundational, but its implementation (T018) builds on both US1 (T007) and US2 (T014)

### Within Each User Story

- Tests written and failing before implementation
- Filter control before consuming its value (US1: T006 before T007)
- `VenueOption` union extension before the grouped-rendering that uses it (US2: T013 before T014)
- Component changes before their CSS (US1: T007 before T008; US2: T014 before T015; US3: T018 before T019)

### Parallel Opportunities

- T003, T004, T005 (US1 tests) can run in parallel — independent test cases in the same file
- T008 (US1 CSS) can run in parallel with T006/T007 once T002 lands, since it's a different file
- T009, T010, T011, T012 (US2 tests) can run in parallel with each other
- T015 (US2 CSS) can run in parallel with T013/T014 once T007 lands
- T016, T017 (US3 tests) can run in parallel with each other
- T019 (US3 CSS) can run in parallel with T018 once T014 lands
- T020, T022, T023 (Polish) can run in parallel with each other

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "Add failing test for region-filter narrowing in apps/web/tests/venue/VenueSwitcher.test.tsx"
Task: "Add failing test for selection-from-filtered-list parity in apps/web/tests/venue/VenueSwitcher.test.tsx"
Task: "Add failing test for resetting the filter to All regions in apps/web/tests/venue/VenueSwitcher.test.tsx"

# CSS for the filter control can proceed in parallel with the component wiring:
Task: "Style the region filter control in apps/web/src/index.css"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Run the "Multi-region org — filter" section of quickstart.md
5. Deploy/demo if ready — this alone resolves the core scanability request

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Each story adds value without breaking previous stories

---

## Notes

- [P] tasks = different files or independent test cases, no dependencies
- [Story] label maps task to specific user story for traceability
- Verify tests fail before implementing
- No backend, DTO, or `generated-api.ts` changes anywhere in this task list (confirmed in plan.md/data-model.md)
- `venueListView.ts` and its selectors are consumed unmodified — no changes to that file or its existing test suite (research.md D2)
- No new npm dependencies or Font Awesome icons are required by this feature
