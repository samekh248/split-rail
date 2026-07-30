---

description: "Task list template for feature implementation"
---

# Tasks: Venues Page Region/Venue Visual Organization

**Input**: Design documents from `specs/079-venue-region-layout/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/venues-page-layout.md](./contracts/venues-page-layout.md), [quickstart.md](./quickstart.md)

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

**Purpose**: Confirm the existing frontend environment is ready; no new dependencies or scaffolding are needed for this presentation-only feature.

- [X] T001 Confirm branch `079-venue-region-layout` is checked out and `cd apps/web && npm install` is up to date (no new dependencies are added by this feature)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared layout-decision logic in `apps/web/src/pages/VenuesPage.tsx` that every user story depends on — the zero-regions vs. has-regions gate, and waiting for regions to finish loading before deciding the layout (research.md D1, D2, D5; data-model.md VR-001, VR-006).

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T002 In `apps/web/src/pages/VenuesPage.tsx`, derive `hasRegions = !regionsLoading && regions.length > 0` and `isUnified = !regionsLoading && regions.length === 0`; change `showDisplayToggle` from `venues.length > 0` to `hasRegions`, and change `showRegionFilter` from `regions.length > 0` to `hasRegions`
- [X] T003 In `apps/web/src/pages/VenuesPage.tsx`, gate rendering of `VenuesPageControls` and the venue-list section on `!regionsLoading` in addition to the existing `!isPending && !isError` check (prevents the region-controls flash described in FR-009), and force the venue list to render via `<VenueList>` whenever `isUnified` is true, regardless of the saved `displayMode` preference (depends on T002)

**Checkpoint**: Foundation ready — `hasRegions`/`isUnified` are available and safe to use; user story implementation can now begin

---

## Phase 3: User Story 1 - Coherent Venues page when no regions exist (Priority: P1) 🎯 MVP

**Goal**: When an organization has zero regions, the Venues page shows a single unified venue list with no region filter, no display-mode toggle, and no "Unassigned" heading — plus exactly one well-integrated create-regions prompt for users who can manage venues, and nothing region-related for users who cannot.

**Independent Test**: Load `/venues` for an org with venues and zero regions; verify no region filter/toggle render, the list has no "Unassigned" heading, exactly one create-regions prompt shows for managers, and nothing region-related shows for non-managers (see quickstart.md "Zero-regions org").

### Tests for User Story 1 (REQUIRED) ⚠️

> Write these tests FIRST, ensure they FAIL before implementation

- [X] T004 [P] [US1] In `apps/web/tests/pages/VenuesPage.test.tsx`, add a failing test asserting that for an org with venues and zero regions, `venues-region-filter` and `venues-display-mode` are absent and the rendered list contains no "Unassigned" heading text
- [X] T005 [P] [US1] In `apps/web/tests/pages/VenuesPage.test.tsx`, add a failing test asserting that when `regions` transitions from non-empty to empty while the component is mounted (re-render with updated query data, simulating the last region being deleted), the page re-renders into the unified list without requiring a remount (VR-006)
- [X] T006 [P] [US1] In `apps/web/tests/components/venue/VenuesPageControls.test.tsx`, add failing tests asserting: (a) with zero regions and `canManageVenues=true`, exactly one `data-testid="venues-manage-regions"` element renders and `data-testid="venues-no-regions-helper"` is absent; (b) with zero regions and `canManageVenues=false`, no region-related element renders at all

### Implementation for User Story 1

- [X] T007 [US1] In `apps/web/src/components/venue/VenuesPageControls.tsx`, replace the separate "Manage regions" button + `noRegionsHelperText` paragraph with a single combined create-regions prompt element (reusing `data-testid="venues-manage-regions"`) rendered only when there are zero regions and `canManageVenues` is true; drop the `data-testid="venues-no-regions-helper"` paragraph in that state; leave the existing plain "Manage regions" button behavior unchanged when regions exist (depends on T002)
- [X] T008 [US1] In `apps/web/src/pages/VenuesPage.tsx`, wire `isUnified`/`hasRegions` (from T002/T003) into the props passed to `VenuesPageControls` so it can distinguish the zero-regions prompt case from the normal "Manage regions" case (depends on T003, T007)
- [X] T009 [P] [US1] In `apps/web/src/index.css`, add/adjust styles for the combined create-regions prompt (`.venues-page-controls__manage-regions` and any new prompt-specific class) so it reads as integrated with the other page controls rather than a floating line of text

**Checkpoint**: User Story 1 is fully functional and independently testable — zero-regions orgs see a clean unified list

---

## Phase 4: User Story 2 - Clear visual hierarchy between regions and their venues (Priority: P2)

**Goal**: In the grouped ("By region") view, each named region reads as a visually distinct group, the "Unassigned" group is visually distinguishable from named regions, and empty regions show a consistent, clearly-labeled empty indicator.

**Independent Test**: Load `/venues` in grouped mode for an org with 2+ regions (including one empty region) and some unassigned venues; verify distinct group boundaries, a visually distinct "Unassigned" group, and a clear empty-region indicator (see quickstart.md "Multi-region org").

### Tests for User Story 2 (REQUIRED) ⚠️

- [X] T010 [P] [US2] In `apps/web/tests/components/venue/VenueListGrouped.test.tsx`, add a failing test asserting the section with `sectionKey === 'unassigned'` renders with a `venues-group--unassigned` class while named-region sections do not, and that a region with zero venues still renders `.venues-group__empty`

### Implementation for User Story 2

- [X] T011 [US2] In `apps/web/src/components/venue/VenueListGrouped.tsx`, apply a `venues-group--unassigned` modifier class to the section `<section>` element when `section.sectionKey === 'unassigned'`
- [X] T012 [P] [US2] In `apps/web/src/index.css`, add CSS for `.venues-group--unassigned` (muted/secondary heading treatment distinguishing it from named regions), a consistent divider/spacing rule between consecutive `.venues-group` sections, and align `.venues-group__empty` visual weight with the existing `.dashboard-empty__text` treatment

**Checkpoint**: User Stories 1 AND 2 both work independently

---

## Phase 5: User Story 3 - Consistent experience switching between list and grouped views (Priority: P3)

**Goal**: For an org with regions, toggling between "List" and "By region" keeps the page header, controls, and spacing stable — only the venue-listing area changes.

**Independent Test**: For an org with regions, toggle display mode repeatedly and confirm header/controls/spacing remain visually consistent (see quickstart.md "Mode switching").

### Tests for User Story 3 (REQUIRED) ⚠️

- [X] T013 [P] [US3] In `apps/web/tests/pages/VenuesPage.test.tsx`, add a failing test asserting that switching `displayMode` between `'flat'` and `'grouped'` for an org with regions leaves the header (`venues-page`), `venues-page-controls`, and `venues-page-body`/grouped-list wrapper elements present and unchanged, with only the inner list content differing

### Implementation for User Story 3

- [X] T014 [US3] In `apps/web/src/index.css`, verify and adjust spacing rules on `.venues-page__body` / `.venues-grouped-list` so vertical spacing and container width match between flat and grouped rendering (depends on T009, T012 for shared spacing tokens)

**Checkpoint**: All three user stories are independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final verification across all stories

- [X] T015 [P] Review `apps/web/src/lib/venueListView.ts` and its tests in `apps/web/tests/lib/venueListView.test.ts`; add/adjust unit tests only if any new pure helper was extracted while implementing T002/T003 (e.g., a `shouldUseGroupedView` predicate) — no changes needed if the gate logic stayed inline in `VenuesPage.tsx`
- [X] T016 Run `cd apps/web && npm run test:coverage` and confirm ≥80% line/branch coverage on all files touched in this feature (`VenuesPage.tsx`, `VenuesPageControls.tsx`, `VenueListGrouped.tsx`); no backend changes are made by this feature, so `apps/api` coverage is unaffected
- [X] T017 Run the manual validation checklist in `specs/079-venue-region-layout/quickstart.md` end-to-end (zero-regions org, multi-region org, mode switching, edge cases)
- [X] T018 [P] Run `cd apps/web && npm run build` to confirm no TypeScript errors were introduced

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories (T002 → T003, both touch `VenuesPage.tsx` sequentially)
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - US1 (Phase 3) and US2 (Phase 4) touch disjoint files (`VenuesPageControls.tsx`/`VenuesPage.tsx` wiring vs. `VenueListGrouped.tsx`) and can proceed in parallel if staffed
  - US3 (Phase 5) only needs regions to exist (already true once Foundational is done) but its CSS task (T014) depends on the spacing rules added in T009 (US1) and T012 (US2), so US3 is best done last
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational — no dependency on other stories
- **User Story 2 (P2)**: Can start after Foundational — independent of US1 (different files)
- **User Story 3 (P3)**: Can start after Foundational, but its implementation task (T014) depends on CSS added in US1/US2

### Within Each User Story

- Tests written and failing before implementation
- `VenuesPageControls` changes before `VenuesPage.tsx` wiring (US1: T007 before T008)
- Component changes before their CSS (US2: T011 before T012)

### Parallel Opportunities

- T004, T005, T006 (US1 tests) can run in parallel — different test files or independent test cases
- T009 (US1 CSS) can run in parallel with T007/T008 once T002 lands, since it's a different file
- T010 (US2 test) and T012 (US2 CSS) can run in parallel with all of Phase 3 (US1) — disjoint files
- T015 and T018 (Polish) can run in parallel with each other

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "Add failing test for absent region filter/toggle/Unassigned heading in apps/web/tests/pages/VenuesPage.test.tsx"
Task: "Add failing test for regions-drop-to-zero fallback in apps/web/tests/pages/VenuesPage.test.tsx"
Task: "Add failing tests for the single create-regions prompt in apps/web/tests/components/venue/VenuesPageControls.test.tsx"

# CSS for the prompt can proceed in parallel with the component/page wiring:
Task: "Style the combined create-regions prompt in apps/web/src/index.css"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Run the "Zero-regions org" section of quickstart.md
5. Deploy/demo if ready — this alone resolves the specific complaint that prompted this feature

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Each story adds value without breaking previous stories

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Verify tests fail before implementing
- No backend, DTO, or `generated-api.ts` changes anywhere in this task list (confirmed in plan.md/data-model.md)
- No new npm dependencies or Font Awesome icons are strictly required; if a new icon is added for the create-regions prompt (T009), it MUST come from `@fortawesome/free-solid-svg-icons` per Constitution IX
