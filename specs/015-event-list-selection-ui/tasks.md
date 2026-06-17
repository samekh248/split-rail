---
description: "Task list for Event List & Selection UI feature"
---

# Tasks: Event List & Selection UI

**Input**: Design documents from `/specs/015-event-list-selection-ui/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/event-list-selection-ui.md, quickstart.md

**Tests**: REQUIRED per Constitution III. Every user story phase includes automated test tasks (write first, ensure fail). Final phase includes ≥80.0% coverage gate on backend and frontend independently.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story label ([US1]–[US4])

## Path Conventions

- Backend: `apps/api/`, `apps/api.tests/`
- Frontend: `apps/web/src/`, `apps/web/tests/`
- E2E: `tests/e2e/specs/venue/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm environment and design artifacts before implementation

- [x] T001 Verify feature branch `015-event-list-selection-ui` and review design docs in `specs/015-event-list-selection-ui/`
- [x] T002 [P] Confirm existing `EventResponse`, `CreateEventRequest`, and events routes in `apps/web/src/types/generated-api.ts`; note missing `UpdateEventRequest` and PATCH/DELETE paths per `specs/015-event-list-selection-ui/research.md`
- [x] T003 [P] Review UI contract in `specs/015-event-list-selection-ui/contracts/event-list-selection-ui.md` and hybrid backend scope in `specs/015-event-list-selection-ui/plan.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Backend API extensions, type regeneration, shared frontend selection infrastructure — MUST complete before user story UI work

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Tests for Foundational (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T004 [P] Write failing xUnit tests for PATCH metadata, DELETE unlocked PreShow, reject DELETE budget-locked/settled, and optional QBO tag on create in `apps/api.tests/Integration/EventsControllerTests.cs`
- [x] T005 [P] Write failing Vitest tests for `activeEventStorage` per-venue session map in `apps/web/tests/venue/activeEventStorage.test.ts`
- [x] T006 [P] Write failing Vitest tests for `resolveActiveEventId` in `apps/web/tests/venue/eventSelection.test.ts`
- [x] T007 [P] Write failing Vitest tests for `useCanManageEvents` in `apps/web/tests/hooks/useCanManageEvents.test.ts`
- [x] T008 [P] Write failing Vitest tests for `useEvents` / mutation hooks in `apps/web/tests/api/events.test.tsx`

### Implementation for Foundational

- [x] T009 Add `UpdateEventRequest` record in `apps/api/DTOs/Ledger/LedgerDtos.cs`
- [x] T010 Implement `UpdateEventMetadataAsync`, `DeleteEventAsync`, relax optional `QboTagName` on create, and list tie-break (`OrderByDescending EventDate` then `CreatedAt`) in `apps/api/Services/EventService.cs`
- [x] T011 Add `PATCH` and `DELETE` routes with lifecycle guards in `apps/api/Controllers/EventsController.cs`
- [x] T012 Regenerate OpenAPI and update `apps/web/src/types/generated-api.ts` with `UpdateEventRequest` and new event endpoints (follow repo swagger → TS pipeline)
- [x] T013 Run backend integration tests until T004 passes: `dotnet test apps/api.tests/split-rail-api.tests.csproj --filter "FullyQualifiedName~EventsControllerTests"`
- [x] T014 [P] Implement `activeEventStorage.ts` (`getActiveEventId`, `setActiveEventId`, `clearActiveEventId`) in `apps/web/src/venue/activeEventStorage.ts`
- [x] T015 [P] Implement `resolveActiveEventId` and client-side filter helper in `apps/web/src/venue/eventSelection.ts`
- [x] T016 [P] Implement `useCanManageEvents` hook in `apps/web/src/hooks/useCanManageEvents.ts`
- [x] T017 [P] Add `validateEventForm` (title required, date required, optional qbo tag) in `apps/web/src/auth/validation.ts`
- [x] T018 Implement `useEvents`, `useCreateEvent`, `useUpdateEvent`, and `useDeleteEvent` in `apps/web/src/api/events.ts`
- [x] T019 Run foundational frontend unit tests until T005–T008 pass: `cd apps/web && npm run test -- tests/venue/activeEventStorage.test.ts tests/venue/eventSelection.test.ts tests/hooks/useCanManageEvents.test.ts tests/api/events.test.tsx`

**Checkpoint**: Backend PATCH/DELETE ready; generated types current; selection storage and API hooks ready — user story phases can begin

---

## Phase 3: User Story 1 - Select an event to view its financial ledger (Priority: P1) 🎯 MVP

**Goal**: Searchable event combobox drives `EventLedgerPage` from real selected event; no hardcoded `DEFAULT_EVENT_ID`

**Independent Test**: Sign in with active venue and ≥2 events → filter/select different event → ledger reloads for selected event

### Tests for User Story 1 (REQUIRED) ⚠️

- [x] T020 [P] [US1] Write failing Vitest tests for searchable combobox filter, selection, status badges, and no-results state in `apps/web/tests/components/event/EventCombobox.test.tsx`
- [x] T021 [P] [US1] Write failing Vitest tests for dashboard event selection wiring and removal of `DEFAULT_EVENT_ID` in `apps/web/tests/pages/DashboardHome.test.tsx`

### Implementation for User Story 1

- [x] T022 [US1] Implement `EventCombobox` (filter by title/date, date-desc display, keyboard a11y, select handler) in `apps/web/src/components/event/EventCombobox.tsx`
- [x] T023 [US1] Rewire `DashboardHome.tsx`: integrate `useEvents`, `resolveActiveEventId`, `activeEventStorage`, render combobox when venue active, pass selected id to `EventLedgerPage`, remove `DEFAULT_EVENT_ID` usage in `apps/web/src/pages/DashboardHome.tsx`
- [x] T024 [US1] Add combobox and event workspace styles in `apps/web/src/index.css`
- [x] T025 [US1] Run US1 tests until T020–T021 pass: `cd apps/web && npm run test -- tests/components/event/EventCombobox.test.tsx tests/pages/DashboardHome.test.tsx`

**Checkpoint**: User Story 1 fully functional — real event selection drives ledger (MVP)

---

## Phase 4: User Story 2 - Create the first or additional event from the dashboard (Priority: P2)

**Goal**: Inline create-event panel and zero-events empty state; successful create selects new event and shows ledger

**Independent Test**: Sign in with active venue and zero events → empty-state CTA → inline panel → submit title + date → ledger visible for new event

### Tests for User Story 2 (REQUIRED) ⚠️

- [x] T026 [P] [US2] Write failing Vitest tests for inline `EventFormPanel` create mode (validation, submit, dismiss) in `apps/web/tests/components/event/EventFormPanel.test.tsx`
- [x] T027 [P] [US2] Write failing Vitest tests for zero-events empty state and create CTA in `apps/web/tests/pages/DashboardHome.test.tsx`

### Implementation for User Story 2

- [x] T028 [US2] Implement inline `EventFormPanel` create mode (title, date, optional qbo tag, cancel) in `apps/web/src/components/event/EventFormPanel.tsx`
- [x] T029 [US2] Add zero-events empty state with create CTA and combobox create action (permission-gated) in `apps/web/src/pages/DashboardHome.tsx`
- [x] T030 [US2] Wire panel open/close state, `useCreateEvent` success (select new event, close panel, persist storage) in `apps/web/src/pages/DashboardHome.tsx`
- [x] T031 [US2] Run US2 tests until T026–T027 pass: `cd apps/web && npm run test -- tests/components/event/EventFormPanel.test.tsx tests/pages/DashboardHome.test.tsx`

**Checkpoint**: User Stories 1 and 2 both work independently

---

## Phase 5: User Story 3 - Event selection resets appropriately when the venue changes (Priority: P3)

**Goal**: Venue switch clears prior event; load new venue's events; default-select first item or show empty state

**Independent Test**: Select event in venue A → switch to venue B → event A not active; venue B default or empty state shown

### Tests for User Story 3 (REQUIRED) ⚠️

- [x] T032 [P] [US3] Write failing Vitest tests for venue-switch event reset and per-venue storage isolation in `apps/web/tests/pages/DashboardHome.test.tsx`
- [x] T033 [P] [US3] Write failing Vitest tests for invalid/missing event fallback in `apps/web/tests/venue/eventSelection.test.ts`

### Implementation for User Story 3

- [x] T034 [US3] Replace venue-switch `DEFAULT_EVENT_ID` reset with `resolveActiveEventId` for new `activeVenueId` in `apps/web/src/pages/DashboardHome.tsx`
- [x] T035 [US3] Add recoverable error + fallback when selected event fails to load (FR-012) in `apps/web/src/pages/DashboardHome.tsx`
- [x] T036 [US3] Run US3 tests until T032–T033 pass: `cd apps/web && npm run test -- tests/pages/DashboardHome.test.tsx tests/venue/eventSelection.test.ts`

**Checkpoint**: User Stories 1–3 independently functional; no cross-venue event leakage

---

## Phase 6: User Story 4 - Edit or delete an event from the combobox (Priority: P4)

**Goal**: Inline edit panel for metadata; delete with confirmation; lifecycle gates for locked budget and settled/reconciled

**Independent Test**: Edit unlocked planning event title → combobox updates; delete second unlocked event → fallback selection; locked/settled events block delete/edit

### Tests for User Story 4 (REQUIRED) ⚠️

- [x] T037 [P] [US4] Write failing Vitest tests for edit mode and lifecycle-disabled controls in `apps/web/tests/components/event/EventFormPanel.test.tsx`
- [x] T038 [P] [US4] Write failing Vitest tests for `EventDeleteConfirm` confirm/cancel flow in `apps/web/tests/components/event/EventDeleteConfirm.test.tsx`
- [x] T039 [P] [US4] Write failing Vitest tests for combobox edit/delete affordances and permission gating in `apps/web/tests/components/event/EventCombobox.test.tsx`

### Implementation for User Story 4

- [x] T040 [US4] Extend `EventFormPanel` with edit mode (pre-fill, `useUpdateEvent`) in `apps/web/src/components/event/EventFormPanel.tsx`
- [x] T041 [US4] Implement inline `EventDeleteConfirm` strip with explicit confirm in `apps/web/src/components/event/EventDeleteConfirm.tsx`
- [x] T042 [US4] Add edit/delete/create actions to `EventCombobox` with `isBudgetLocked` and status gates in `apps/web/src/components/event/EventCombobox.tsx`
- [x] T043 [US4] Wire edit/delete panel state and post-delete fallback selection in `apps/web/src/pages/DashboardHome.tsx`
- [x] T044 [US4] Run US4 tests until T037–T039 pass: `cd apps/web && npm run test -- tests/components/event/EventFormPanel.test.tsx tests/components/event/EventDeleteConfirm.test.tsx tests/components/event/EventCombobox.test.tsx`

**Checkpoint**: All four user stories independently functional

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Cleanup, E2E path, coverage gate, quickstart validation

- [x] T045 [P] Remove unused `DEFAULT_EVENT_ID` from `apps/web/src/venue/defaults.ts` and update any remaining test imports
- [x] T046 [P] Add optional Playwright spec for venue → create/select event → ledger visible in `tests/e2e/specs/venue/event-selection.spec.ts`
- [x] T047 Verify ≥80.0% line/branch coverage: `dotnet test apps/api.tests/split-rail-api.tests.csproj` (coverlet → cobertura) and `cd apps/web && npm run test:coverage` (Vitest → lcov); missing or unparseable reports FAIL
- [x] T048 Run manual scenarios A–F from `specs/015-event-list-selection-ui/quickstart.md`
- [x] T049 [P] Confirm read-only empty state for users without `can_view_financials` across combobox and zero-events UI in `apps/web/tests/pages/DashboardHome.test.tsx`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS all user stories**
- **User Stories (Phases 3–6)**: Depend on Foundational; implement in priority order P1 → P4 (or parallel after Phase 2 if staffed)
- **Polish (Phase 7)**: Depends on desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: After Foundational — no dependency on other stories (MVP)
- **User Story 2 (P2)**: After Foundational — integrates with US1 combobox/dashboard shell but independently testable via empty-state path
- **User Story 3 (P3)**: After Foundational — extends US1 dashboard wiring; testable via venue-switch scenarios
- **User Story 4 (P4)**: After Foundational — requires backend PATCH/DELETE from Phase 2; extends combobox/panel from US1–US2

### Within Each User Story

- Tests written first and fail before implementation
- Components before dashboard integration
- Story checkpoint before next priority

### Parallel Opportunities

- T002, T003 (Setup)
- T004–T008 (Foundational tests — different files)
- T014–T017 (Foundational frontend modules — different files)
- T020, T021 (US1 tests)
- T026, T027 (US2 tests)
- T032, T033 (US3 tests)
- T037–T039 (US4 tests)
- T045, T046, T049 (Polish — different files)

---

## Parallel Example: User Story 1

```bash
# Launch US1 tests together:
# T020 EventCombobox.test.tsx
# T021 DashboardHome.test.tsx (selection wiring)

# After T022 combobox exists, T023 dashboard integration follows sequentially
```

---

## Parallel Example: Foundational

```bash
# Backend track (sequential within service):
# T004 tests → T009–T011 impl → T012 regen → T013 verify

# Frontend track (parallel after T012):
# T014 activeEventStorage.ts
# T015 eventSelection.ts
# T016 useCanManageEvents.ts
# T017 validation.ts
# then T018 events.ts hooks → T019 verify
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Select events → ledger updates; no `DEFAULT_EVENT_ID`
5. Demo/deploy if ready

### Incremental Delivery

1. Setup + Foundational → API and hooks ready
2. US1 → searchable selection drives ledger (MVP)
3. US2 → create flow + empty state
4. US3 → venue-switch correctness
5. US4 → edit/delete with lifecycle guards
6. Polish → coverage + E2E + quickstart

### Parallel Team Strategy

1. Team completes Setup + Foundational together
2. After Phase 2:
   - Developer A: US1 + US3 (selection + venue switch)
   - Developer B: US2 (create panel + empty state)
   - Developer C: US4 (edit/delete UI; backend done in Phase 2)
3. Merge at Polish phase for coverage gate

---

## Notes

- Map spec "event-management permission" to `can_view_financials` (`useCanManageEvents`)
- Inline panel only — no modal or dedicated route for event CRUD (clarify session)
- Delete blocked when `isBudgetLocked`; edit metadata allowed on locked PreShow
- Query key `['events', venueId]`; events fetch uses normal `X-Active-Venue-Id` header
- Commit after each task or logical group; stop at any checkpoint to validate story independently
