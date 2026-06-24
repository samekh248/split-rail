---
description: "Task list for Mini-Calendar View for Upcoming Events (SPLR-78)"
---

# Tasks: Mini-Calendar View for Upcoming Events

**Input**: Design documents from `/specs/038-mini-calendar-events/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/upcoming-events-calendar-ui.md, quickstart.md

**Tests**: REQUIRED per Constitution III. Each user story phase adds Vitest + RTL tests (write failing tests first, then implement until green). Final Polish phase enforces ≥80.0% line/branch coverage on **frontend** touched files via `npm run test:coverage` (Vitest → lcov). **No backend changes** — run `dotnet test` for regression only; no new xUnit coverage required.

**Organization**: Tasks grouped by user story (US1–US4). Frontend-only slice through `apps/web/src/lib/`, `apps/web/src/components/dashboard/`, and `apps/web/tests/`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1–US4 (maps to user stories in spec.md)
- All paths are repo-relative

## Path Conventions

- Lib: `apps/web/src/lib/upcomingEventsCalendar.ts`, `apps/web/src/lib/upcomingEventsViewStorage.ts`
- Components: `apps/web/src/components/dashboard/UpcomingEventsViewToggle.tsx`, `UpcomingEventsMiniCalendar.tsx`, `DashboardZoneSections.tsx`
- Styles: `apps/web/src/index.css`
- Lib tests: `apps/web/tests/lib/upcomingEventsCalendar.test.ts`, `upcomingEventsViewStorage.test.ts`
- Component tests: `apps/web/tests/components/dashboard/UpcomingEventsViewToggle.test.tsx`, `UpcomingEventsMiniCalendar.test.tsx`, `UpcomingEventsSection.test.tsx`
- Page tests: `apps/web/tests/pages/DashboardOverviewPage.test.tsx`
- Types: `apps/web/src/types/generated-api.ts` (import only — no manual edits)
- Contract: `specs/038-mini-calendar-events/contracts/upcoming-events-calendar-ui.md`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm branch, upstream dashboard wiring, and UI contract before implementation.

- [x] T001 Verify branch `038-mini-calendar-events` and design docs in `specs/038-mini-calendar-events/` per plan.md
- [x] T002 [P] Review UI contract in `specs/038-mini-calendar-events/contracts/upcoming-events-calendar-ui.md` (toggle testids, grid structure, storage key)
- [x] T003 [P] Confirm upstream prerequisites: `UpcomingEventsSection` and `DashboardZoneEvents` in `apps/web/src/components/dashboard/DashboardZoneSections.tsx` / `DashboardZoneEvents.tsx`; `partitions.upcomingEvents` wired in `apps/web/src/pages/DashboardOverviewPage.tsx` (specs 026, 031, 032)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Pure calendar math and session storage helpers. **Blocks all user stories.**

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Tests for Foundational (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T004 [P] Write failing unit tests for `getUpcomingWindowBounds`, `groupEventsByLocalDate`, `buildMiniCalendarWeeks`, and `truncateEventTitle` in `apps/web/tests/lib/upcomingEventsCalendar.test.ts` (tomorrow through +30 window, today exclusion, month-boundary weeks, multi-event grouping)
- [x] T005 [P] Write failing unit tests for `readUpcomingViewMode` / `writeUpcomingViewMode` in `apps/web/tests/lib/upcomingEventsViewStorage.test.ts` (default list, invalid key, round-trip, sessionStorage clear)

### Implementation for Foundational

- [x] T006 Implement `apps/web/src/lib/upcomingEventsCalendar.ts` per `specs/038-mini-calendar-events/data-model.md` until T004 tests pass
- [x] T007 Implement `apps/web/src/lib/upcomingEventsViewStorage.ts` with key `split-rail:upcoming-events-view` until T005 tests pass

**Checkpoint**: Lib modules green — user story implementation can begin

---

## Phase 3: User Story 1 — Toggle between list and calendar views (Priority: P1) 🎯 MVP

**Goal**: Upcoming Events section shows list by default and exposes a header toggle to switch to calendar view and back without refetch.

**Independent Test**: Open dashboard overview with upcoming events; confirm list default, click calendar toggle → calendar container visible, click list → cards return; dashboard fetch mock called once (FR-010).

### Tests for User Story 1 (REQUIRED) ⚠️

- [x] T008 [P] [US1] Write failing RTL tests for list/calendar `aria-pressed` states and toggle callbacks in `apps/web/tests/components/dashboard/UpcomingEventsViewToggle.test.tsx`
- [x] T009 [P] [US1] Write failing RTL tests for dual-render path (list vs calendar branch) in `apps/web/tests/components/dashboard/UpcomingEventsSection.test.tsx` (use minimal calendar stub or mock `UpcomingEventsMiniCalendar` until Phase 4)

### Implementation for User Story 1

- [x] T010 [P] [US1] Implement `UpcomingEventsViewToggle` with `faList` / `faCalendarDays` in `apps/web/src/components/dashboard/UpcomingEventsViewToggle.tsx` per contract
- [x] T011 [US1] Add `.upcoming-view-toggle` segmented control styles in `apps/web/src/index.css`
- [x] T012 [US1] Refactor `UpcomingEventsSection` in `apps/web/src/components/dashboard/DashboardZoneSections.tsx` — local `viewMode` state (default `list`), `filterSlot` toggle, conditional list (`DashboardZoneEvents`) vs calendar branch; run T008–T009 until green

**Checkpoint**: Toggle switches views; list remains default on first render

---

## Phase 4: User Story 2 — See upcoming events on scheduled dates (Priority: P1)

**Goal**: Calendar mode plots each `EventCardDto` on its local date within the 30-day window; multi-event dates show three truncated titles + "+N more"; empty zone shows existing empty message.

**Independent Test**: Seed events on +1, +15, +30 days and 4 events same date; calendar cells match dates; "+N more" visible; empty `upcomingEvents` shows "No upcoming events" without grid (SC-002).

### Tests for User Story 2 (REQUIRED) ⚠️

- [x] T013 [P] [US2] Write failing RTL tests for date cell placement, window emphasis, adjacent-month padding days, three-title cap, and "+N more" indicator in `apps/web/tests/components/dashboard/UpcomingEventsMiniCalendar.test.tsx`
- [x] T014 [P] [US2] Extend `apps/web/tests/components/dashboard/UpcomingEventsSection.test.tsx` for empty upcoming events in calendar mode (empty message, no `upcoming-mini-calendar` testid)

### Implementation for User Story 2

- [x] T015 [US2] Implement `UpcomingEventsMiniCalendar` grid in `apps/web/src/components/dashboard/UpcomingEventsMiniCalendar.tsx` using `buildMiniCalendarWeeks` + `groupEventsByLocalDate` from `apps/web/src/lib/upcomingEventsCalendar.ts`
- [x] T016 [US2] Add `.upcoming-mini-calendar` grid, day, event, and muted adjacent-month styles in `apps/web/src/index.css`
- [x] T017 [US2] Replace calendar stub in `UpcomingEventsSection` (`apps/web/src/components/dashboard/DashboardZoneSections.tsx`) with real `UpcomingEventsMiniCalendar`; run T013–T014 until green

**Checkpoint**: Calendar accurately renders upcoming event dates; MVP (US1 + US2) complete

---

## Phase 5: User Story 3 — Open event workspace from calendar (Priority: P2)

**Goal**: Activating an event chip (or expanded "+N more" entry) navigates to the same workspace route as list-view card activation.

**Independent Test**: Calendar mode — click `calendar-event-{id}` mock asserts `onCardActivate(venueId, eventId)`; multi-event date — expand "+N more" and activate each remaining event (SC-003).

### Tests for User Story 3 (REQUIRED) ⚠️

- [x] T018 [P] [US3] Extend failing tests in `apps/web/tests/components/dashboard/UpcomingEventsMiniCalendar.test.tsx` for single-event activation, multi-event title activation, and "+N more" expand listing remaining events with individual `data-testid={`calendar-event-${eventId}`}` buttons

### Implementation for User Story 3

- [x] T019 [US3] Implement `+N more` inline popover/expand and wire `onEventActivate` → parent `onCardActivate` in `apps/web/src/components/dashboard/UpcomingEventsMiniCalendar.tsx`
- [x] T020 [US3] Pass `onCardActivate` from `UpcomingEventsSection` through to mini-calendar in `apps/web/src/components/dashboard/DashboardZoneSections.tsx`; run T018 until green

**Checkpoint**: All calendar events individually navigable to workspace

---

## Phase 6: User Story 4 — Remember view preference for browser session (Priority: P3)

**Goal**: Selected view mode persists in `sessionStorage` when navigating away and back; new session defaults to list.

**Independent Test**: Switch to calendar → navigate away → return → calendar still active; `sessionStorage.clear()` → list default (SC-004, SC-005).

### Tests for User Story 4 (REQUIRED) ⚠️

- [x] T021 [P] [US4] Extend `apps/web/tests/components/dashboard/UpcomingEventsSection.test.tsx` for `readUpcomingViewMode` on mount, `writeUpcomingViewMode` on toggle, and reset after `sessionStorage.clear()`

### Implementation for User Story 4

- [x] T022 [US4] Initialize `UpcomingEventsSection` view mode from `readUpcomingViewMode()` and persist on toggle via `writeUpcomingViewMode()` in `apps/web/src/components/dashboard/DashboardZoneSections.tsx`; run T021 until green

**Checkpoint**: Session preference survives in-tab navigation; resets on new session

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Overview integration smoke, coverage gate, and validation guide

- [x] T023 [P] Extend `apps/web/tests/pages/DashboardOverviewPage.test.tsx` — calendar toggle smoke, no extra dashboard fetch on toggle, venue switch preserves view mode (quickstart Scenarios A–B, H)
- [x] T024 Verify ≥80.0% line/branch coverage on touched frontend files via `cd apps/web && npm run test:coverage -- tests/lib/upcomingEventsCalendar.test.ts tests/lib/upcomingEventsViewStorage.test.ts tests/components/dashboard/UpcomingEventsViewToggle.test.tsx tests/components/dashboard/UpcomingEventsMiniCalendar.test.tsx tests/components/dashboard/UpcomingEventsSection.test.tsx tests/pages/DashboardOverviewPage.test.tsx`; missing or unparseable lcov FAIL
- [x] T025 Run `dotnet test` at repo root for regression (no new backend tests expected)
- [x] T026 Run manual/automated validation scenarios in `specs/038-mini-calendar-events/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS all user stories**
- **User Story 1 (Phase 3)**: Depends on Foundational (T006–T007)
- **User Story 2 (Phase 4)**: Depends on US1 section wiring (T012)
- **User Story 3 (Phase 5)**: Depends on US2 mini-calendar (T015–T017)
- **User Story 4 (Phase 6)**: Depends on US1 toggle (T012); can parallel US3 after T012 if calendar nav not needed for storage tests
- **Polish (Phase 7)**: Depends on US1–US4 complete

### User Story Dependencies

| Story | Priority | Depends on | Independent test |
|-------|----------|------------|------------------|
| US1 | P1 | Foundational | Toggle list ↔ calendar without refetch |
| US2 | P1 | US1 section shell | Events on correct calendar dates |
| US3 | P2 | US2 calendar grid | Chip click → workspace route |
| US4 | P3 | US1 toggle | sessionStorage persist / reset |

### Within Each User Story

- Tests written and failing before implementation
- Lib before components; components before section integration
- Story checkpoint before next priority

### Parallel Opportunities

- **Phase 1**: T002 ∥ T003
- **Phase 2**: T004 ∥ T005; then T006 ∥ T007 after respective tests
- **Phase 3**: T008 ∥ T009; T010 ∥ (after T008) while T011 sequential on CSS
- **Phase 4**: T013 ∥ T014
- **Phase 5**: T018 standalone
- **Phase 6**: T021 standalone
- **Phase 7**: T023 ∥ prep for T024

---

## Parallel Example: User Story 1

```bash
# Launch US1 tests together (different files):
# T008 — apps/web/tests/components/dashboard/UpcomingEventsViewToggle.test.tsx
# T009 — apps/web/tests/components/dashboard/UpcomingEventsSection.test.tsx

# Then implement toggle component (T010) while CSS (T011) can proceed in parallel
# Integrate in DashboardZoneSections.tsx (T012)
```

---

## Parallel Example: Foundational

```bash
# Launch lib tests together:
# T004 — apps/web/tests/lib/upcomingEventsCalendar.test.ts
# T005 — apps/web/tests/lib/upcomingEventsViewStorage.test.ts

# Implement libs in parallel after tests fail:
# T006 — apps/web/src/lib/upcomingEventsCalendar.ts
# T007 — apps/web/src/lib/upcomingEventsViewStorage.ts
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL)
3. Complete Phase 3: US1 — toggle + section dual path
4. Complete Phase 4: US2 — mini-calendar rendering
5. **STOP and VALIDATE**: quickstart Scenarios A–D
6. Demo calendar MVP on dashboard overview

### Incremental Delivery

1. Setup + Foundational → lib helpers ready
2. US1 → toggle works (calendar branch may be empty stub briefly)
3. US2 → full calendar MVP → **Deploy/Demo**
4. US3 → navigation parity with list cards
5. US4 → session persistence polish
6. Polish → coverage gate + overview smoke

### Parallel Team Strategy

1. Team completes Setup + Foundational together
2. Once Foundational done:
   - Developer A: US1 toggle + section (Phase 3)
   - Developer B: can start T013 calendar tests drafting against T006 lib API
3. After T012: Developer A → US4 storage; Developer B → US2 calendar + US3 navigation

---

## Notes

- No `apps/api` or `generated-api.ts` edits expected — reuse existing `EventCardDto` / `DashboardResponse.upcomingEvents`
- Constitution IX: FA icons only on toggle; no hand-drawn SVG nav glyphs
- `DashboardZoneEvents.tsx` stays list-only; do not add calendar logic there
- Pin toggle and quick links remain list-view only in v1 (per contract)
- Avoid third-party calendar packages (research.md decision)
- Commit after each task or logical group; stop at any checkpoint to validate story independently
