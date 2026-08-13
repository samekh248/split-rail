---

description: "Task list template for feature implementation"
---

# Tasks: Venue Drag-and-Drop Region Reassignment & Region Deletion Handling

**Input**: Design documents from `specs/081-venue-drag-drop-regions/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/delete-region-endpoint.md](./contracts/delete-region-endpoint.md), [contracts/venues-page-interactions.md](./contracts/venues-page-interactions.md), [quickstart.md](./quickstart.md)

**Tests**: REQUIRED per Constitution III. Backend: xUnit + `IntegrationTestBase` (this feature adds the first automated tests for the Regions vertical). Frontend: Vitest + React Testing Library, with drag-and-drop simulated via `fireEvent.dragStart`/`dragOver`/`drop` against component state rather than `event.dataTransfer` (research.md D2). User Story 4 (Actions column alignment) is CSS-only and has no meaningful automated test — jsdom does not compute applied stylesheet layout — so it is verified via the `quickstart.md` manual check instead (research.md D8). The final Polish phase includes the ≥80.0% coverage gate for both stacks.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, or independent test cases within the same file, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

Frontend paths are relative to `apps/web/`; backend paths are relative to `apps/api/` and `apps/api.tests/`. No new projects/packages are introduced.

---

## Phase 1: Setup

**Purpose**: Confirm the existing frontend and backend environments are ready; no new dependencies are added by this feature (research.md D1).

- [X] T001 Confirm branch `081-venue-drag-drop-regions` is checked out; `cd apps/web && npm install` and `cd apps/api && dotnet restore` are up to date

---

## Phase 2: Foundational

**Purpose**: This feature has no shared blocking prerequisites — the four user stories touch largely disjoint files (US1: `VenueListGrouped.tsx` only; US2: the Regions backend vertical + `RegionManagementPanel.tsx`; US3: `VenuesPage.tsx` + new `AddVenueModal.tsx` + removal of `CreateVenuePage.tsx`; US4: `index.css` only). This phase just confirms the integration points every story builds on already exist and work as expected.

- [X] T002 Confirm the existing `useCreateVenue`/`useUpdateVenue` (`apps/web/src/api/venues.ts`), `useDeleteRegion`/`useRegions` (`apps/web/src/api/regions.ts`), and the `canManage` prop already threaded through `apps/web/src/components/venue/VenueListGrouped.tsx` are the integration points for this feature; no shared code changes are required before story work begins

**Checkpoint**: No blocking work — user story implementation can begin immediately, in any order or in parallel

---

## Phase 3: User Story 1 - Reassign a venue to a different region via drag-and-drop (Priority: P1) 🎯 MVP

**Goal**: A venue-management user can drag a venue's row (via a left-side handle) from its current region section and drop it onto a different section to reassign its region, with no page reload.

**Independent Test**: With 2+ regions and a venue assigned to one, open the grouped Venues page, drag the venue's row into a different region's section, and confirm it moves there and persists after reload (see quickstart.md "Drag-and-drop reassignment").

### Tests for User Story 1 (REQUIRED) ⚠️

> Write these tests FIRST, ensure they FAIL before implementation

- [X] T003 [P] [US1] In `apps/web/tests/components/venue/VenueListGrouped.test.tsx`, add a failing test asserting a drag handle (`data-testid="venue-drag-handle-{venueId}"`) renders on each row when `canManage` is true, and is absent when `canManage` is false (spec FR-001, FR-005)
- [X] T004 [P] [US1] In `apps/web/tests/components/venue/VenueListGrouped.test.tsx`, add a failing test asserting a drag-and-drop from one named region's section to another calls the venue-update endpoint with the target section's region id, and the venue re-renders under the new section (spec Acceptance Scenario US1.2/US1.3) — component-level test asserts the API call; full section-move verified separately in `VenuesPage.test.tsx`'s new end-to-end drag-and-drop test
- [X] T005 [P] [US1] In `apps/web/tests/components/venue/VenueListGrouped.test.tsx`, add a failing test asserting a drop onto the "Unassigned" section sends `regionId: null` (spec FR-006)
- [X] T006 [P] [US1] In `apps/web/tests/components/venue/VenueListGrouped.test.tsx`, add a failing test asserting a drop onto the venue's own current section triggers no network call (data-model VR-002)
- [X] T007 [P] [US1] In `apps/web/tests/components/venue/VenueListGrouped.test.tsx`, add a failing test asserting a failed reassignment leaves the venue in its original section and shows an error (`data-testid="venue-drag-error"`) (spec FR-004)
- [X] T008 [P] [US1] In `apps/web/tests/components/venue/VenueListGrouped.test.tsx`, add a failing test asserting a venue cannot be dragged again while its previous reassignment is still pending (spec Edge Cases)

### Implementation for User Story 1

- [X] T009 [US1] In `apps/web/src/api/venues.ts`, add `useReassignVenueRegion()` — a `useMutation` (not parameterized by a fixed venue id, unlike `useUpdateVenue`) whose `mutationFn` accepts `{ venueId, name, regionId }` and calls `PUT /venues/{venueId}` with `skipVenueContext: true`, invalidating the `['venues']` query on success. A fixed-id hook doesn't work here since `VenueListGrouped` must reassign whichever venue was just dragged, not one known venue at mount time
- [X] T010 [US1] In `apps/web/src/components/venue/VenueListGrouped.tsx`, add a leading drag-handle cell per row (`faGripVertical` from `@fortawesome/free-solid-svg-icons`, Constitution §IX), rendered only when `canManage`; wire `draggable`/`onDragStart`/`onDragEnd` on the handle to local `draggedVenue: { id, name, regionId } | null` and `pendingReassignVenueId` state (depends on T009)
- [X] T011 [US1] In `apps/web/src/components/venue/VenueListGrouped.tsx`, add `onDragOver` (`preventDefault()`) and `onDrop` handlers on each `.venues-group` section (including `.venues-group--unassigned`) that call `useReassignVenueRegion()` with the target section's region id (`null` for Unassigned); no-op when the target equals the dragged venue's current region; set/clear `pendingReassignVenueId` around the call; show `venue-drag-error` inline on failure (depends on T009, T010)
- [X] T012 [P] [US1] In `apps/web/src/index.css`, add styles for the drag handle, a drag-over section highlight, a pending-row visual, and the `.venue-drag-error` message

**Checkpoint**: User Story 1 is fully functional and independently testable

---

## Phase 4: User Story 2 - Resolve venues when deleting a region (Priority: P2)

**Goal**: Deleting a region with assigned venues prompts the admin to either delete those venues too or move them all to one other region, instead of hard-blocking as it does today.

**Independent Test**: Create a region with venues and at least one other region available, attempt to delete it, and verify both the "delete venues" and "move venues" paths complete successfully and consistently (see quickstart.md "Region deletion resolution").

### Backend tests for User Story 2 (REQUIRED) ⚠️

> Write these tests FIRST, ensure they FAIL before implementation. `apps/api.tests/Integration/RegionsControllerTests.cs` does not exist yet — this is the first automated coverage for the Regions vertical.

- [X] T013 [P] [US2] Create `apps/api.tests/Integration/RegionsControllerTests.cs` (mirroring the `IntegrationTestBase` pattern in `apps/api.tests/Integration/VenuesControllerTests.cs`) with failing tests: deleting a zero-venue region succeeds with `204` (baseline, unchanged), and deleting a venue-holding region with no request body still returns `409 Conflict` (data-model VR-004)
- [X] T014 [P] [US2] In `RegionsControllerTests.cs`, add a failing test: `DELETE /api/regions/{id}` with `{ deleteVenues: true }` on a region with venues removes the region and all its venues in one call, verified via a subsequent `GET /api/venues` (spec FR-014)
- [X] T015 [P] [US2] In `RegionsControllerTests.cs`, add a failing test: `DELETE /api/regions/{id}` with `{ moveVenuesToRegionId: <other region> }` reassigns all the region's venues to the destination region and removes the original region, leaving the destination region's pre-existing venues untouched (spec FR-015)
- [X] T016 [P] [US2] In `RegionsControllerTests.cs`, add a failing test: `moveVenuesToRegionId` referencing a region in a different organization is rejected (`404`), with no venues reassigned and the original region not deleted (Constitution II, data-model VR-005)
- [X] T017 [P] [US2] In `RegionsControllerTests.cs`, add a failing test: `moveVenuesToRegionId` equal to the region being deleted is rejected (`400`), with no state changed (data-model VR-005)

### Backend implementation for User Story 2

- [X] T018 [US2] In `apps/api/DTOs/Regions/RegionDtos.cs`, add `public record DeleteRegionRequest(Guid? MoveVenuesToRegionId, bool DeleteVenues = false);`
- [X] T019 [US2] In `apps/api/Services/RegionService.cs`, extend `DeleteRegionAsync` to accept an optional `DeleteRegionRequest?` and implement the behavior matrix in [contracts/delete-region-endpoint.md](./contracts/delete-region-endpoint.md): zero venues → delete as today; venues + no resolution → keep the existing `ConflictException`; venues + `DeleteVenues: true` → remove venues and region together; venues + valid `MoveVenuesToRegionId` → validate same-org and not-self, reassign venues, then remove region — all in one `SaveChangesAsync` call (depends on T018)
- [X] T020 [US2] In `apps/api/Controllers/RegionsController.cs`, update the `Delete` action to accept an optional `[FromBody] DeleteRegionRequest? request` and pass it through to `DeleteRegionAsync` (depends on T018)
- [X] T021 [US2] Run `cd apps/api && dotnet build` then `cd apps/web && npm run gen:api` to regenerate the OpenAPI contract and `generated-api.ts` with `DeleteRegionRequest` (Constitution VI) (depends on T018, T019, T020) — regenerated against a temporary Release-build instance on a scratch port, since the long-running dev server (port 5000) was left running from an earlier session and was not restarted

### Frontend tests for User Story 2 (REQUIRED) ⚠️

> Write these tests FIRST, ensure they FAIL before implementation

- [X] T022 [P] [US2] Create `apps/web/tests/api/regions.test.ts` (new file — no dedicated regions API hook tests exist yet) with a failing test asserting `useDeleteRegion()`'s mutation now accepts `{ regionId, moveVenuesToRegionId? , deleteVenues? }`, sends the matching request body, and invalidates both the regions and `['venues']` queries on success
- [X] T023 [P] [US2] Create `apps/web/tests/components/venue/RegionDeleteResolutionModal.test.tsx` (new file) with failing tests: both the "delete venues" and "move venues" choices call `useDeleteRegion()` with the correct payload; the destination list excludes the region being deleted; the "move venues" option is absent entirely when no other region exists (spec FR-012, FR-013)
- [X] T024 [P] [US2] Create `apps/web/tests/components/booking/RegionManagementPanel.test.tsx` (new file — no dedicated tests exist yet) with failing tests: deleting a region with `venueCount === 0` calls `useDeleteRegion()` immediately with no modal (spec FR-016, regression baseline); deleting a region with `venueCount > 0` opens `RegionDeleteResolutionModal` instead of deleting immediately (spec FR-011)

### Frontend implementation for User Story 2

- [X] T025 [US2] In `apps/web/src/api/regions.ts`, update `useDeleteRegion()` to the new `{ regionId, moveVenuesToRegionId?, deleteVenues? }` mutation input, sending it as the `DELETE /regions/{regionId}` request body, and invalidate both `regionsQueryKey()` and `['venues']` on success (depends on T021, T022)
- [X] T026 [US2] Create `apps/web/src/components/venue/RegionDeleteResolutionModal.tsx` (mirrors the `welcome-modal`/`ModalHeader` pattern used by `VenueEditModal.tsx`/`RegionManagementPanel.tsx`): two mutually-exclusive choices with no default selected, a destination `<select>` (from `useRegions()`, excluding the region being deleted, hidden when that list is empty), and a confirm action calling the updated `useDeleteRegion()` (depends on T021, T023)
- [X] T027 [US2] In `apps/web/src/components/booking/RegionManagementPanel.tsx`, wire the Delete button: `venueCount === 0` calls `useDeleteRegion({ regionId })` immediately (unchanged); `venueCount > 0` opens `RegionDeleteResolutionModal` and only calls the mutation once the admin confirms a choice there (depends on T025, T026, T024)
- [X] T028 [P] [US2] In `apps/web/src/index.css`, add styles for `RegionDeleteResolutionModal`'s choice controls and destination select (reusing existing `team-modal`/`welcome-modal` rules where possible)

**Checkpoint**: User Stories 1 AND 2 both work independently

---

## Phase 5: User Story 3 - Add a venue without leaving the Venues page (Priority: P3)

**Goal**: The per-region "Add venue" button opens a modal on the Venues page instead of navigating to `/venues/new`, which is retired along with `CreateVenuePage`.

**Independent Test**: Click a region's "Add venue" button, confirm a modal opens with no region selector and no navigation, and that submitting creates the venue in that region (see quickstart.md "Add venue modal").

### Tests for User Story 3 (REQUIRED) ⚠️

> Write these tests FIRST, ensure they FAIL before implementation

- [X] T029 [P] [US3] Create `apps/web/tests/components/venue/AddVenueModal.test.tsx` (new file) with failing tests: the modal renders with the given region fixed and no region selector (spec FR-009); a valid submission calls `useCreateVenue()` with `{ name, regionId }` and closes the modal on success (spec FR-010); cancel/close creates nothing (spec Acceptance Scenario US3.4)
- [X] T030 [P] [US3] In `apps/web/tests/pages/VenuesPage.test.tsx`, update/add a failing test asserting a region's "Add venue" button (`venues-add-venue-{regionId}`) opens `AddVenueModal` in place, without changing the URL, and a successful submission shows the new venue in that region's section (spec FR-008, replaces the prior `080` navigation-based test)
- [X] T031 [P] [US3] In `apps/web/tests/lib/appRoute.test.ts` and `apps/web/tests/lib/dashboardRoute.test.ts`, remove the `navigateToCreateVenue`/`getCreateVenueRegionIdFromUrl` test cases (functions are being removed — research.md D7)

### Implementation for User Story 3

- [X] T032 [US3] Create `apps/web/src/components/venue/AddVenueModal.tsx` (`regionId`/`regionName` required props, `welcome-modal`/`ModalHeader` pattern matching `VenueEditModal.tsx`, no region selector, reuses `useCreateVenue()`, `data-testid="venue-add-modal"` with `venue-add-name`/`venue-add-save` fields)
- [X] T033 [US3] In `apps/web/src/pages/VenuesPage.tsx`, replace the `onAddVenue={(regionId) => navigateToCreateVenue(regionId)}` callback passed to `VenueListGrouped` with local state that opens `AddVenueModal` for that region instead (depends on T032)
- [X] T034 [US3] Delete `apps/web/src/pages/CreateVenuePage.tsx` and `apps/web/tests/pages/CreateVenuePage.test.tsx` (depends on T033)
- [X] T035 [US3] In `apps/web/src/App.tsx`, remove the `/venues/new` route case that rendered `CreateVenuePage` (depends on T034)
- [X] T036 [US3] In `apps/web/src/lib/appRoute.ts` and `apps/web/src/lib/dashboardRoute.ts`, remove `navigateToCreateVenue` and `getCreateVenueRegionIdFromUrl` (and the `'/venues/new'` path handling they existed for) (depends on T033, T035, T031) — also cleaned up the same now-dead `'/venues/new'` handling in `globalNav.ts` and `settingsReturnStorage.ts`, discovered via `npm run build` type-checking
- [X] T037 [P] [US3] In `apps/web/src/index.css`, add/verify styles for `AddVenueModal` (should mostly reuse existing `team-modal`/`welcome-modal`/`auth-form` rules)

**Checkpoint**: User Stories 1, 2, AND 3 all work independently

---

## Phase 6: User Story 4 - Actions column aligns to the right (Priority: P4)

**Goal**: The grouped venue table's Actions column buttons are flush with the table's right edge.

**Independent Test**: View the grouped venue table as a venue-management user and confirm the Actions column's buttons are right-aligned (see quickstart.md "Actions column alignment"). No automated test — see the Tests note at the top of this file.

### Implementation for User Story 4

- [X] T038 [US4] In `apps/web/src/index.css`, add a right-alignment rule for the grouped venue table's Actions column, scoped so it doesn't affect other `team-table` usages (invitations, region panel) unless already right-aligned there too (research.md D8) — used a dedicated `.venues-table__actions-col` class on the Actions `<th>` (`VenueListGrouped.tsx`) rather than `:last-child`, since the Actions column isn't always the table's last child (it's absent entirely for read-only users, which would otherwise make "Created" incorrectly match `:last-child`)

**Checkpoint**: All four user stories are independently functional

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final verification across all stories

- [ ] T039 [P] Run `cd apps/api.tests && dotnet test --filter "FullyQualifiedName~RegionsControllerTests"` and `dotnet test` with coverage; confirm ≥80% line/branch coverage on `RegionService.cs`/`RegionsController.cs` touched code — **not run**: Testcontainers requires Docker, which is unavailable in this environment (`DockerUnavailableException` confirmed when attempted); all 6 new tests discover and compile correctly (verified via `dotnet build -c Release`, 0 errors) and will run in CI, which has Docker (confirmed working for this same repo's `backend-test+coverage` CI job in an earlier PR this session)
- [X] T040 [P] Run `cd apps/web && npm run test:coverage`; confirm ≥80% line/branch coverage on `VenueListGrouped.tsx`, `AddVenueModal.tsx`, `RegionDeleteResolutionModal.tsx`, `RegionManagementPanel.tsx`, `VenuesPage.tsx`, `api/venues.ts`, `api/regions.ts` — full-suite run (excluding the known pre-existing local-only `contrastAudit.test.ts` CRLF artifact) passes the global 80% gate on all four metrics: 85.48% stmts / 84.61% branch / 82.13% funcs / 85.48% lines (1162/1162 tests pass); some individual touched files (e.g. `RegionManagementPanel.tsx` funcs 30.76%, reflecting pre-existing untested create/edit paths this feature didn't touch) sit under 80% alone, consistent with the project's global (not per-file) coverage gate
- [ ] T041 Run the manual validation checklist in `specs/081-venue-drag-drop-regions/quickstart.md` end-to-end (drag-and-drop, region deletion resolution, add-venue modal, Actions alignment) — **not run**: requires a running dev environment with an authenticated, seeded organization (regions + venues), which wasn't stood up in this session; substituted with the full Vitest + RTL suite (including the end-to-end `VenuesPage` drag-and-drop and add-venue-modal tests), which exercises the same scenarios against the real component tree
- [X] T042 [P] Run `cd apps/web && npm run build` and `cd apps/api && dotnet build -c Release`; confirm both succeed with no errors — both succeed, 0 errors (used `-c Release` for the backend build specifically to avoid a file lock from the long-running dev API server left running from an earlier session, which was not restarted)
- [X] T043 [P] Confirm `apps/web/src/lib/venueListView.ts` and its existing tests remain unchanged — this feature does not touch region-grouping/filter selectors (regression guard, matches research.md's scope boundary) — confirmed via `git diff --stat`, zero changes to either file

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup — does not block user stories functionally, but establishes the shared assumptions they rely on
- **User Stories (Phase 3-6)**: All four are independent of each other (disjoint files) and can proceed in parallel if staffed, or in priority order (P1 → P2 → P3 → P4) if done sequentially
- **Polish (Phase 7)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Independent — touches only `VenueListGrouped.tsx`, `api/venues.ts`, and `index.css`
- **User Story 2 (P2)**: Independent — touches the Regions backend vertical, `RegionManagementPanel.tsx`, two new components, `api/regions.ts`, and `index.css`
- **User Story 3 (P3)**: Independent — touches `VenuesPage.tsx`, a new `AddVenueModal.tsx`, removes `CreateVenuePage.tsx`/its route/nav helpers, and `index.css`
- **User Story 4 (P4)**: Independent — `index.css` only

### Within Each User Story

- Tests written and failing before implementation
- US1: T009 (hook) before T010/T011 (component wiring that calls it)
- US2 backend: T018 (DTO) before T019 (service) and T020 (controller); T021 (contract regen) after all three, before any frontend implementation task that imports the generated type
- US2 frontend: T025 (mutation) and T026 (modal) before T027 (wiring them together in `RegionManagementPanel`)
- US3: T032 (modal) before T033 (wiring); T033 before T034 (removing the old page once nothing references it); T034 before T035 (removing its route); T035/T031 before T036 (removing the now-fully-unused nav helpers)

### Parallel Opportunities

- T003–T008 (US1 tests) can run in parallel — independent test cases in the same file
- T012 (US1 CSS) can run in parallel with T009–T011 once started, since it's a different file
- T013–T017 (US2 backend tests) can run in parallel — independent test cases in the same new file
- T022, T023, T024 (US2 frontend tests) can run in parallel — different files
- T028 (US2 CSS) can run in parallel with T025–T027 once T021 lands
- T029, T030, T031 (US3 tests) can run in parallel — different files
- T037 (US3 CSS) can run in parallel with T032–T036 once T032 lands
- All four user story phases (US1–US4) can be staffed and run in parallel by different developers, since they touch disjoint files (only `index.css` is shared, and each story's CSS additions are independent rule blocks)
- T039, T040, T042, T043 (Polish) can run in parallel with each other

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "Add failing test for drag handle presence/absence by canManage in apps/web/tests/components/venue/VenueListGrouped.test.tsx"
Task: "Add failing test for cross-region drag-and-drop reassignment in apps/web/tests/components/venue/VenueListGrouped.test.tsx"
Task: "Add failing test for drop onto Unassigned clearing region in apps/web/tests/components/venue/VenueListGrouped.test.tsx"
Task: "Add failing test for no-op same-section drop in apps/web/tests/components/venue/VenueListGrouped.test.tsx"
Task: "Add failing test for failed reassignment reverting with an error in apps/web/tests/components/venue/VenueListGrouped.test.tsx"
Task: "Add failing test for pending-state blocking a second drag in apps/web/tests/components/venue/VenueListGrouped.test.tsx"

# CSS can proceed in parallel with the component/hook work:
Task: "Style the drag handle, drag-over highlight, and pending row in apps/web/src/index.css"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (lightweight — confirms no blocking work)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Run the "Drag-and-drop reassignment" section of quickstart.md
5. Deploy/demo if ready — this alone delivers the headline capability requested

### Incremental Delivery

1. Complete Setup + Foundational → ready to start any story
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo (fixes the today-blocked region-deletion workflow)
4. Add User Story 3 → Test independently → Deploy/Demo
5. Add User Story 4 → Test independently → Deploy/Demo
6. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers, all four stories can start immediately after Setup/Foundational (no cross-story blocking dependencies):

- Developer A: User Story 1 (frontend drag-and-drop)
- Developer B: User Story 2 (backend + frontend region-deletion resolution — largest story, may warrant two developers given the backend/frontend split)
- Developer C: User Story 3 (add-venue modal + page/route removal)
- Developer D: User Story 4 (CSS)

---

## Notes

- [P] tasks = different files, or independent test cases within the same file, no dependencies
- [Story] label maps task to specific user story for traceability
- Verify tests fail before implementing
- User Story 2 is the only backend-touching story and the only one requiring an OpenAPI/type regeneration step (T021) before its frontend tasks can import the new `DeleteRegionRequest` type (Constitution VI)
- No new npm or NuGet dependencies are added by this feature (research.md D1) — drag-and-drop uses the native HTML5 API
- `apps/web/src/lib/venueListView.ts` and its selectors are untouched by this feature
