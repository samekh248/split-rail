---
description: "Task list for Dashboard Overview Page with priority zones"
---

# Tasks: Dashboard Overview Page with Priority Zones

**Input**: Design documents from `/specs/026-dashboard-overview-page/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/dashboard-overview-ui.md, quickstart.md

**Tests**: REQUIRED per Constitution III. Each user story phase includes Vitest + RTL tasks (write tests first, ensure they fail before implementation). Final Polish phase enforces ≥80.0% line/branch coverage on touched frontend files via `npm run test:coverage` (Vitest → lcov). No backend changes; backend coverage gate N/A.

**Organization**: Tasks grouped by user story (US1–US4). Frontend-only vertical slice through `apps/web/`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1–US4 (maps to user stories in spec.md)
- All paths are repo-relative

## Path Conventions

- Page: `apps/web/src/pages/DashboardOverviewPage.tsx`
- Zone components: `apps/web/src/components/dashboard/{TonightHeroBanner,PinnedEventsSection,RecentEventsSection,UpcomingEventsSection}.tsx`
- Partition lib: `apps/web/src/lib/partitionOverviewZones.ts`
- Route: `apps/web/src/App.tsx`
- Styles: `apps/web/src/index.css`
- Tests: `apps/web/tests/pages/DashboardOverviewPage.test.tsx`, `apps/web/tests/lib/partitionOverviewZones.test.ts`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm prerequisites and align on UI contracts before code changes.

- [x] T001 Verify branch `026-dashboard-overview-page` and design docs in `specs/026-dashboard-overview-page/` per plan.md
- [x] T002 [P] Review UI contract in `specs/026-dashboard-overview-page/contracts/dashboard-overview-ui.md` and partition model in `specs/026-dashboard-overview-page/data-model.md`
- [x] T003 [P] Confirm prerequisites merged: `023-split-dashboard-routes` (`navigateToEventWorkspace`), `025-event-card` (`EventCard`, `pinnedEventStorage`), SPLR-64 (`eventLifecycle.ts`) on branch

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Client-side zone partition library with full boundary test matrix. **Blocks all user stories.**

**⚠️ CRITICAL**: No user story work begins until this phase completes.

### Tests for Foundational (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T004 [P] Write failing today/recent/upcoming boundary matrix tests in `apps/web/tests/lib/partitionOverviewZones.test.ts` per quickstart Scenario C and data-model.md partition rules
- [x] T005 [P] Write failing pin-overlap and today-exclusivity tests in `apps/web/tests/lib/partitionOverviewZones.test.ts` per clarifications in `specs/026-dashboard-overview-page/spec.md`
- [x] T006 [P] Write failing sort-order tests (recent desc, upcoming asc, tonight phase priority) in `apps/web/tests/lib/partitionOverviewZones.test.ts`

### Implementation for Foundational

- [x] T007 Implement `filterTonightEvents`, `partitionRecentEvents`, `partitionUpcomingEvents`, `getPinnedEvents`, and `partitionOverviewZones` in `apps/web/src/lib/partitionOverviewZones.ts` per `specs/026-dashboard-overview-page/contracts/dashboard-overview-ui.md`
- [x] T008 Reuse local calendar `startOfDay` / date-parse logic consistent with `apps/web/src/lib/eventLifecycle.ts` inside `apps/web/src/lib/partitionOverviewZones.ts`
- [x] T009 Run `npm run test -- tests/lib/partitionOverviewZones.test.ts` until green in `apps/web`

**Checkpoint**: Partition library tested — SC-003 matrix passes with zero misclassifications

---

## Phase 3: User Story 1 — Land on an operational overview at the dashboard entry (Priority: P1) 🎯 MVP

**Goal**: Root `/` renders dashboard overview (not ledger redirect) with venue context, loading/error/empty states, and zone section shell in correct order.

**Independent Test**: Sign in with active venue and events; navigate to `/`; assert `dashboard-overview` visible, no workspace redirect, workspace bar with `VenueSwitcher`, no create-event CTA on no-events state.

### Tests for User Story 1 (REQUIRED) ⚠️

- [x] T010 [P] [US1] Write failing overview-landing and no-redirect tests in `apps/web/tests/pages/DashboardOverviewPage.test.tsx` per quickstart Scenario A
- [x] T011 [P] [US1] Write failing no-venue, no-events, and events-error empty-state tests in `apps/web/tests/pages/DashboardOverviewPage.test.tsx` per quickstart Scenarios A and F

### Implementation for User Story 1

- [x] T012 [US1] Create `DashboardOverviewPage` shell with `useActiveVenue`, `useEvents`, and `useUserProfile` in `apps/web/src/pages/DashboardOverviewPage.tsx`
- [x] T013 [US1] Wire `useShellWorkspaceBar` with `VenueSwitcher` and optional Add venue button in `apps/web/src/pages/DashboardOverviewPage.tsx` per contracts/dashboard-overview-ui.md
- [x] T014 [US1] Implement loading, no-venue, no-events (informational only, no create CTA), and events-error empty states reusing `dashboard-empty` classes in `apps/web/src/pages/DashboardOverviewPage.tsx`
- [x] T015 [US1] Render zone section placeholders in order pinned → tonight → upcoming → recent with `data-testid` hooks in `apps/web/src/pages/DashboardOverviewPage.tsx`
- [x] T016 [US1] Swap `/` route from `DashboardHome` to `DashboardOverviewPage` in `apps/web/src/App.tsx`
- [x] T017 [P] [US1] Add `.dashboard-overview` layout styles in `apps/web/src/index.css`
- [x] T018 [US1] Confirm US1 tests pass in `apps/web/tests/pages/DashboardOverviewPage.test.tsx`

**Checkpoint**: MVP — `/` shows overview shell; no auto-redirect to workspace

---

## Phase 4: User Story 2 — See tonight's show highlighted in a hero zone (Priority: P2)

**Goal**: Tonight hero zone displays all today-dated events; hidden when none exist.

**Independent Test**: Fixture with today-dated event(s); assert `dashboard-zone-tonight` present with cards; absent when no today events.

### Tests for User Story 2 (REQUIRED) ⚠️

- [x] T019 [P] [US2] Write failing tonight hero visibility and multi-event tests in `apps/web/tests/pages/DashboardOverviewPage.test.tsx` per quickstart Scenario B
- [x] T020 [P] [US2] Write failing tonight hero component tests in `apps/web/tests/components/dashboard/TonightHeroBanner.test.tsx` (optional if fully covered in page test)

### Implementation for User Story 2

- [x] T021 [P] [US2] Create `TonightHeroBanner` rendering `EventCard` list when `events.length > 0` in `apps/web/src/components/dashboard/TonightHeroBanner.tsx`
- [x] T022 [US2] Integrate `partition.tonight` into page; render `TonightHeroBanner` only when tonight events exist in `apps/web/src/pages/DashboardOverviewPage.tsx`
- [x] T023 [P] [US2] Add `.dashboard-zone--tonight` hero emphasis styles in `apps/web/src/index.css`
- [x] T024 [US2] Confirm US2 tests pass in `apps/web/tests/pages/DashboardOverviewPage.test.tsx`

**Checkpoint**: Tonight hero surfaces today's shows; excluded from recent/upcoming

---

## Phase 5: User Story 3 — Review pinned, recent, and upcoming events in dedicated zones (Priority: P3)

**Goal**: Pinned, upcoming, and recent zones partition correctly with sorts, pin persistence, overlap rules, and empty-zone messages.

**Independent Test**: Seed events across date/pin matrix; assert zone contents, order on page, empty messages, and pin toggle updates pinned zone.

### Tests for User Story 3 (REQUIRED) ⚠️

- [x] T025 [P] [US3] Write failing zone content and display-order tests in `apps/web/tests/pages/DashboardOverviewPage.test.tsx` per quickstart Scenario C
- [x] T026 [P] [US3] Write failing empty-zone heading/message tests for pinned, upcoming, and recent in `apps/web/tests/pages/DashboardOverviewPage.test.tsx`
- [x] T027 [P] [US3] Write failing pin toggle and persistence tests in `apps/web/tests/pages/DashboardOverviewPage.test.tsx` per quickstart Scenario D

### Implementation for User Story 3

- [x] T028 [P] [US3] Create `PinnedEventsSection` with heading, empty message, and `EventCard` list in `apps/web/src/components/dashboard/PinnedEventsSection.tsx`
- [x] T029 [P] [US3] Create `UpcomingEventsSection` with heading, empty message, and `EventCard` list in `apps/web/src/components/dashboard/UpcomingEventsSection.tsx`
- [x] T030 [P] [US3] Create `RecentEventsSection` with heading, empty message, and `EventCard` list in `apps/web/src/components/dashboard/RecentEventsSection.tsx`
- [x] T031 [US3] Wire `partitionOverviewZones` via `useMemo` and render all three sections in `apps/web/src/pages/DashboardOverviewPage.tsx`
- [x] T032 [US3] Implement pin state (`pinnedRevision` + `toggleEventPinned` / `isEventPinned`) and pass pin props to every `EventCard` in `apps/web/src/pages/DashboardOverviewPage.tsx`
- [x] T033 [US3] Pass `permissions` from `useUserProfile` to each `EventCard` in zone components
- [x] T034 [US3] Confirm US3 tests pass in `apps/web/tests/pages/DashboardOverviewPage.test.tsx`

**Checkpoint**: All four zones partition and display per clarified rules

---

## Phase 6: User Story 4 — Open the correct event workspace from overview cards (Priority: P4)

**Goal**: Card body and quick links navigate to correct workspace URL with optional focus; venue switch repartitions and uses new venue id.

**Independent Test**: Click quick link and card body; assert `navigateToEventWorkspace` called with correct args; switch venue and assert zones update.

### Tests for User Story 4 (REQUIRED) ⚠️

- [x] T035 [P] [US4] Write failing quick-link and card-body navigation tests in `apps/web/tests/pages/DashboardOverviewPage.test.tsx` per quickstart Scenario E
- [x] T036 [P] [US4] Write failing venue-switch repartition test in `apps/web/tests/pages/DashboardOverviewPage.test.tsx`
- [x] T037 [P] [US4] Write failing no-auto-redirect regression test in `apps/web/tests/pages/DashboardOverviewPage.test.tsx` per quickstart Scenario G

### Implementation for User Story 4

- [x] T038 [US4] Implement `handleQuickLink` → `navigateToEventWorkspace(venueId, eventId, focus)` in `apps/web/src/pages/DashboardOverviewPage.tsx`
- [x] T039 [US4] Implement card body activate → `navigateToEventWorkspace(activeVenueId, eventId)` on zone `EventCard` instances in `apps/web/src/components/dashboard/*.tsx` or page wrapper
- [x] T040 [US4] Ensure venue switch triggers event refetch and zone re-partition without full reload in `apps/web/src/pages/DashboardOverviewPage.tsx`
- [x] T041 [US4] Confirm US4 tests pass in `apps/web/tests/pages/DashboardOverviewPage.test.tsx`

**Checkpoint**: Overview acts as launch pad into event workspace

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Retire interim dashboard, migrate tests, enforce coverage, validate quickstart.

- [x] T042 Remove `DashboardHome` redirect logic by deleting `apps/web/src/pages/DashboardHome.tsx` after `DashboardOverviewPage` is complete
- [x] T043 Migrate or remove obsolete cases in `apps/web/tests/pages/DashboardHome.test.tsx`; ensure no references to auto-redirect remain
- [x] T044 [P] Update `apps/web/tests/fixtures/events.ts` fixture comments if dashboard workflow IDs changed
- [x] T045 Run full Vitest suite for overview: `npm run test -- tests/pages/DashboardOverviewPage.test.tsx tests/lib/partitionOverviewZones.test.ts` in `apps/web`
- [x] T046 Verify ≥80.0% line/branch coverage on touched frontend files via `npm run test:coverage` in `apps/web`; missing or unparseable lcov reports FAIL (Constitution III)
- [x] T047 Run manual validation scenarios in `specs/026-dashboard-overview-page/quickstart.md` and fix gaps

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS all user stories**
- **US1 (Phase 3)**: Depends on Foundational — MVP landing page
- **US2 (Phase 4)**: Depends on US1 page shell — hero zone
- **US3 (Phase 5)**: Depends on Foundational partition + US1 page — zone sections and pins
- **US4 (Phase 6)**: Depends on US3 EventCard wiring in zones — navigation
- **Polish (Phase 7)**: Depends on US1–US4 complete

### User Story Dependencies

- **US1 (P1)**: After Foundational — no dependency on US2–US4
- **US2 (P2)**: After US1 — hero integrates into page shell
- **US3 (P3)**: After Foundational + US1 — zone sections need page and partition
- **US4 (P4)**: After US3 — navigation requires cards in zones

### Within Each User Story

- Tests written and failing before implementation
- Lib/helpers before page integration
- Components before page wiring
- Story tests green before next priority

### Parallel Opportunities

- T002, T003 (Setup docs review)
- T004, T005, T006 (partition tests)
- T010, T011 (US1 page tests)
- T017 (CSS) parallel with T016 after page exists
- T019, T020 (US2 tests)
- T021, T023 (US2 component + CSS)
- T025, T026, T027 (US3 tests)
- T028, T029, T030 (three zone components)
- T035, T036, T037 (US4 tests)
- T044 (fixture comments) during Polish

---

## Parallel Example: User Story 3

```bash
# Launch zone component implementations together (different files):
Task: "Create PinnedEventsSection in apps/web/src/components/dashboard/PinnedEventsSection.tsx"
Task: "Create UpcomingEventsSection in apps/web/src/components/dashboard/UpcomingEventsSection.tsx"
Task: "Create RecentEventsSection in apps/web/src/components/dashboard/RecentEventsSection.tsx"

# Launch US3 tests together before implementation:
Task: "Zone content tests in apps/web/tests/pages/DashboardOverviewPage.test.tsx"
Task: "Empty-zone message tests in apps/web/tests/pages/DashboardOverviewPage.test.tsx"
Task: "Pin toggle tests in apps/web/tests/pages/DashboardOverviewPage.test.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (partition lib)
3. Complete Phase 3: User Story 1 (overview landing, no redirect)
4. **STOP and VALIDATE**: quickstart Scenarios A and F
5. Demo overview entry without ledger redirect

### Incremental Delivery

1. Setup + Foundational → partition lib ready
2. US1 → overview shell at `/` (MVP)
3. US2 → tonight hero
4. US3 → full zone partitioning + pins
5. US4 → workspace navigation closure
6. Polish → retire DashboardHome, coverage gate

### Parallel Team Strategy

1. Team completes Setup + Foundational together
2. Developer A: US1 page shell + route
3. Developer B: US2 TonightHeroBanner (after US1 shell merged)
4. Developer C: US3 zone sections (after partition lib)
5. US4 navigation after US3 cards wired

---

## Notes

- `EventCard` does not navigate directly — page owns `onQuickLink` (025 FR-009)
- Omit `lineItems` on overview cards — variance badge suppressed (research.md §8)
- Create-event remains on `EventWorkspacePage` only (clarification Q5)
- Zone order: **Pinned → Tonight hero → Upcoming → Recent**
- Pin storage: existing `pinnedEventStorage.ts` (localStorage)
