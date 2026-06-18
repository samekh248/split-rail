---
description: "Task list for split dashboard routes and event workspace extraction"
---

# Tasks: Split Dashboard Routes and Event Workspace

**Input**: Design documents from `/specs/023-split-dashboard-routes/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/event-workspace-routing.md, quickstart.md

**Tests**: REQUIRED per Constitution III. Each user story phase includes Vitest + RTL tasks (write tests first, ensure they fail before implementation). Final Polish phase enforces ≥80.0% line/branch coverage on touched frontend files via `npm run test:coverage` (Vitest → lcov). No backend changes expected; backend coverage gate N/A.

**Organization**: Tasks grouped by user story (US1–US4). Frontend-only vertical slice through `apps/web/`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1–US4 (maps to user stories in spec.md)
- All paths are repo-relative

## Path Conventions

- Routing libs: `apps/web/src/lib/appRoute.ts`, `apps/web/src/lib/eventWorkspaceRoute.ts`, `apps/web/src/lib/globalNav.ts`, `apps/web/src/lib/settingsReturnStorage.ts`
- Pages: `apps/web/src/pages/EventWorkspacePage.tsx`, `apps/web/src/pages/DashboardHome.tsx`, `apps/web/src/App.tsx`
- Tests: `apps/web/tests/lib/**`, `apps/web/tests/pages/**`, `apps/web/tests/shell/GlobalNav.test.tsx`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm prerequisites and align on routing contracts before code changes.

- [x] T001 Verify SPLR-58 (event combobox/CRUD) and SPLR-62 (AppShell) are merged on branch `023-split-dashboard-routes` per spec.md Dependencies
- [x] T002 [P] Review routing contracts in `specs/023-split-dashboard-routes/contracts/event-workspace-routing.md` and data-model precedence rules in `specs/023-split-dashboard-routes/data-model.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Workspace path helpers, navigation module, and routing unit tests. **Blocks all user stories.**

**⚠️ CRITICAL**: No user story work begins until this phase completes.

### Tests for Foundational (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T003 [P] Add failing workspace path parse/build/popstate tests in `apps/web/tests/lib/appRoute.test.ts` per contracts/event-workspace-routing.md
- [x] T004 [P] Create failing `navigateToEventWorkspace` and optional `?focus=` query tests in `apps/web/tests/lib/eventWorkspaceRoute.test.ts`

### Implementation for Foundational

- [x] T005 Implement `buildEventWorkspacePath`, `parseEventWorkspacePath`, and `isEventWorkspacePath` in `apps/web/src/lib/appRoute.ts`
- [x] T006 Extend `getAppPath()` and `useAppRoute()` to recognize workspace pathnames in `apps/web/src/lib/appRoute.ts`
- [x] T007 Implement `useEventWorkspaceRoute()` hook returning `{ venueId, eventId, focus } | null` in `apps/web/src/lib/appRoute.ts`
- [x] T008 Create `navigateToEventWorkspace(venueId, eventId, focus?)` in `apps/web/src/lib/eventWorkspaceRoute.ts`
- [x] T009 Update `apps/web/src/lib/dashboardRoute.ts` to re-export workspace navigation helpers from `eventWorkspaceRoute.ts`

**Checkpoint**: Routing helper tests green; workspace URLs parse/build/navigate correctly.

---

## Phase 3: User Story 1 - Open workspace from URL (Priority: P1) 🎯 MVP

**Goal**: `/venues/:venueId/events/:eventId` loads the full ledger workspace with correct venue, event, and ledger context from the URL alone.

**Independent Test**: Sign in, navigate directly to a valid workspace URL, confirm venue switcher, combobox, and ledger match URL params without manual selection. Refresh restores same context. `npx vitest run apps/web/tests/pages/EventWorkspacePage.test.tsx`.

### Tests for User Story 1 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T010 [P] [US1] Create failing deep-link and refresh tests in `apps/web/tests/pages/EventWorkspacePage.test.tsx` (migrate core scenarios from `apps/web/tests/pages/DashboardHome.test.tsx`)
- [x] T011 [P] [US1] Add failing invalid-venue and invalid-event fallback tests in `apps/web/tests/pages/EventWorkspacePage.test.tsx`

### Implementation for User Story 1

- [x] T012 [US1] Create `apps/web/src/pages/EventWorkspacePage.tsx` by extracting workspace body from `apps/web/src/pages/DashboardHome.tsx` per contracts/event-workspace-routing.md
- [x] T013 [US1] Implement URL-driven venue sync via `activateVenueId(urlVenueId)` on mount in `apps/web/src/pages/EventWorkspacePage.tsx`
- [x] T014 [US1] Implement URL-canonical event selection from `useEventWorkspaceRoute()` in `apps/web/src/pages/EventWorkspacePage.tsx`
- [x] T015 [US1] Implement inaccessible-venue fallback (alert + `navigateToDashboard()`) in `apps/web/src/pages/EventWorkspacePage.tsx`
- [x] T016 [US1] Implement unknown-event `resolveActiveEventId` + `replaceState` correction in `apps/web/src/pages/EventWorkspacePage.tsx`
- [x] T017 [US1] Wire `EventWorkspacePage` route branch in `apps/web/src/App.tsx` when `parseEventWorkspacePath(appPath)` matches

**Checkpoint**: Deep links work; US1 tests green; MVP workspace route is live.

---

## Phase 4: User Story 2 - URL sync on event and venue changes (Priority: P2)

**Goal**: Combobox event selection, venue switching, create/delete, and browser back/forward all keep the address bar in sync with workspace context.

**Independent Test**: Switch events and venues; confirm URL updates and ledger reloads. Press Back to restore prior event. `npx vitest run apps/web/tests/pages/EventWorkspacePage.test.tsx`.

### Tests for User Story 2 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T018 [P] [US2] Add failing event-switch URL sync tests in `apps/web/tests/pages/EventWorkspacePage.test.tsx`
- [x] T019 [P] [US2] Add failing venue-switch URL sync and browser history (back) tests in `apps/web/tests/pages/EventWorkspacePage.test.tsx`
- [x] T020 [P] [US2] Add failing create-event and delete-event URL update tests in `apps/web/tests/pages/EventWorkspacePage.test.tsx`

### Implementation for User Story 2

- [x] T021 [US2] Replace combobox `onSelect` with `navigateToEventWorkspace(venueId, eventId)` in `apps/web/src/pages/EventWorkspacePage.tsx`
- [x] T022 [US2] Add venue-switch effect: when `activeVenueId` differs from URL venue, resolve default event and `navigateToEventWorkspace` in `apps/web/src/pages/EventWorkspacePage.tsx`
- [x] T023 [US2] Navigate to new event URL on create success in `apps/web/src/pages/EventWorkspacePage.tsx`
- [x] T024 [US2] Navigate to remaining event URL on delete success in `apps/web/src/pages/EventWorkspacePage.tsx`
- [x] T025 [US2] Persist venue/event to session storage on each `navigateToEventWorkspace` call in `apps/web/src/pages/EventWorkspacePage.tsx`

**Checkpoint**: URL stays canonical during in-app navigation; US2 tests green.

---

## Phase 5: User Story 3 - Dashboard nav active on workspace routes (Priority: P3)

**Goal**: Global left-rail Dashboard item stays highlighted on workspace URLs; settings return path preserves workspace URL.

**Independent Test**: Open workspace URL → Dashboard highlighted. Open settings from workspace → return restores workspace URL. `npx vitest run apps/web/tests/shell/GlobalNav.test.tsx apps/web/tests/lib/settingsReturnStorage.test.ts`.

### Tests for User Story 3 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T026 [P] [US3] Add failing workspace URL active-highlight test in `apps/web/tests/shell/GlobalNav.test.tsx`
- [x] T027 [P] [US3] Add failing workspace return-path capture/restore tests in `apps/web/tests/lib/settingsReturnStorage.test.ts`

### Implementation for User Story 3

- [x] T028 [US3] Implement `matchesDashboardNavPath(pathname)` in `apps/web/src/lib/globalNav.ts` per contracts/event-workspace-routing.md
- [x] T029 [US3] Update `resolveActiveGlobalNavId()` to use pattern matching for workspace paths in `apps/web/src/lib/globalNav.ts`
- [x] T030 [US3] Extend `captureSettingsReturnPath` and `readSettingsReturnPath` for workspace pathnames in `apps/web/src/lib/settingsReturnStorage.ts`

**Checkpoint**: Wayfinding and settings return work on workspace routes; US3 tests green.

---

## Phase 6: User Story 4 - Interim dashboard entry at `/` (Priority: P4)

**Goal**: Root `/` redirects to resolved workspace when events exist; no-venue and no-events empty states remain at `/`.

**Independent Test**: Navigate to `/` with events → redirect to workspace URL. Zero events → empty state at `/`. `npx vitest run apps/web/tests/pages/DashboardHome.test.tsx`.

### Tests for User Story 4 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T031 [P] [US4] Rewrite `apps/web/tests/pages/DashboardHome.test.tsx` for redirect-when-events-exist behavior at `/`
- [x] T032 [P] [US4] Add failing no-venue and no-events empty-state tests at `/` in `apps/web/tests/pages/DashboardHome.test.tsx`

### Implementation for User Story 4

- [x] T033 [US4] Slim `apps/web/src/pages/DashboardHome.tsx` to interim entry only (remove ledger/combobox/workspace bar)
- [x] T034 [US4] Implement redirect to `navigateToEventWorkspace(activeVenueId, resolvedEventId)` when events exist in `apps/web/src/pages/DashboardHome.tsx`
- [x] T035 [US4] Preserve no-venue and no-events empty states at `/` in `apps/web/src/pages/DashboardHome.tsx`
- [x] T036 [US4] Confirm `apps/web/src/App.tsx` routes `/` to slim `DashboardHome` and `/venues/new` unchanged

**Checkpoint**: Interim `/` behavior complete; US4 tests green; SPLR-58 scenarios split between entry and workspace tests.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Full regression, coverage gate, and quickstart validation.

- [x] T037 [P] Run full routing test suite: `npm run test -- tests/lib/appRoute.test.ts tests/lib/eventWorkspaceRoute.test.ts tests/lib/settingsReturnStorage.test.ts` in `apps/web`
- [x] T038 [P] Run workspace and entry page tests: `npm run test -- tests/pages/EventWorkspacePage.test.tsx tests/pages/DashboardHome.test.tsx tests/shell/GlobalNav.test.tsx` in `apps/web`
- [x] T039 Verify no hand-written API types added under `apps/web/src` (Constitution VI)
- [x] T040 Verify ≥80.0% line/branch coverage on touched frontend files via `npm run test:coverage` in `apps/web`; missing or unparseable lcov report FAILS
- [x] T041 Run manual validation scenarios A–H from `specs/023-split-dashboard-routes/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS all user stories**
- **User Story 1 (Phase 3)**: Depends on Foundational — **MVP**
- **User Story 2 (Phase 4)**: Depends on US1 (`EventWorkspacePage` must exist)
- **User Story 3 (Phase 5)**: Depends on Foundational only — can run in parallel with US2 after Phase 2
- **User Story 4 (Phase 6)**: Depends on US1 (workspace route must exist for redirect target)
- **Polish (Phase 7)**: Depends on US1–US4 completion

### User Story Dependencies

| Story | Depends on | Independent test |
|-------|------------|------------------|
| US1 (P1) | Foundational | Deep link + refresh at workspace URL |
| US2 (P2) | US1 | Event/venue switch updates URL + back button |
| US3 (P3) | Foundational | GlobalNav highlight + settings return on workspace URL |
| US4 (P4) | US1 | `/` redirect or empty states |

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Routing libs before pages
- `EventWorkspacePage` extraction before URL sync features
- Slim `DashboardHome` last (after workspace route proven)

### Parallel Opportunities

- **Phase 1**: T002 parallel with T001
- **Phase 2**: T003 ∥ T004 (test files); T005–T007 sequential on `appRoute.ts`
- **Phase 3**: T010 ∥ T011 (test cases); T013–T016 can batch after T012
- **Phase 4**: T018 ∥ T019 ∥ T020 (test cases)
- **Phase 5**: T026 ∥ T027; entire phase parallel with Phase 4 after Foundational
- **Phase 6**: T031 ∥ T032
- **Phase 7**: T037 ∥ T038

---

## Parallel Example: User Story 1

```bash
# Launch all US1 tests together (must fail first):
# Task T010: deep-link tests in apps/web/tests/pages/EventWorkspacePage.test.tsx
# Task T011: invalid URL fallback tests in apps/web/tests/pages/EventWorkspacePage.test.tsx

# After T012 page scaffold, venue/event sync tasks T013–T016 touch same file — run sequentially.
```

---

## Parallel Example: User Story 3 (can run alongside US2)

```bash
# After Foundational phase, developer A continues US2 URL sync while developer B runs US3:
# Task T026: GlobalNav.test.tsx workspace highlight
# Task T027: settingsReturnStorage.test.tsx workspace return
# Task T028–T030: globalNav.ts + settingsReturnStorage.ts implementation
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Deep-link to workspace URL; ledger loads correctly
5. Demo/shareable event URLs

### Incremental Delivery

1. Setup + Foundational → routing primitives ready
2. US1 → deep links work (MVP)
3. US2 → URL sync on navigation (full route-driven workspace)
4. US3 → wayfinding + settings return (polish navigation UX)
5. US4 → interim `/` entry (unblocks overview replacement in SPLR-66)
6. Polish → coverage + quickstart

### Suggested MVP Scope

**Phases 1–3 only** (T001–T017): delivers FR-001, FR-002, FR-009 and User Story 1 — shareable/bookmarkable event workspace URLs.

---

## Notes

- Migrate tests from `DashboardHome.test.tsx` to `EventWorkspacePage.test.tsx`; do not duplicate full SPLR-58 suite in both files
- `?focus=` query param accepted by `navigateToEventWorkspace` but scroll behavior deferred to SPLR-67
- Playwright E2E updates deferred to SPLR-68
- Avoid editing unrelated shell components from SPLR-62 unless routing integration requires it

---

## Task Summary

| Phase | Tasks | Story |
|-------|-------|-------|
| Setup | T001–T002 | — |
| Foundational | T003–T009 | — |
| US1 (P1) | T010–T017 | 8 |
| US2 (P2) | T018–T025 | 8 |
| US3 (P3) | T026–T030 | 5 |
| US4 (P4) | T031–T036 | 6 |
| Polish | T037–T041 | — |
| **Total** | **41** | |
