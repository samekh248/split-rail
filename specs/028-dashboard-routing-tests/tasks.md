---
description: "Task list for Dashboard Routing Test & E2E Alignment (SPLR-68)"
---

# Tasks: Dashboard Routing Test & E2E Alignment

**Input**: Design documents from `/specs/028-dashboard-routing-tests/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/test-coverage.md, quickstart.md

**Tests**: REQUIRED per Constitution III. This feature *is* test alignment—each user story phase extends Vitest + RTL and/or Playwright specs (write/extend tests first, ensure GAP rows fail before fixes). Final Polish phase enforces ≥80.0% line/branch coverage on frontend via `npm run test:coverage` (Vitest → lcov). No backend changes; backend coverage gate N/A.

**Organization**: Tasks grouped by user story (US1–US5). Frontend test-only slice through `apps/web/tests/**` and `tests/e2e/specs/venue/**`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1–US5 (maps to user stories in spec.md)
- All paths are repo-relative

## Path Conventions

- Overview tests: `apps/web/tests/pages/DashboardOverviewPage.test.tsx`
- Workspace tests: `apps/web/tests/pages/EventWorkspacePage.test.tsx`
- Route tests: `apps/web/tests/lib/appRoute.test.ts`, `dashboardRoute.test.ts`, `eventWorkspaceRoute.test.ts`
- Shell tests: `apps/web/tests/shell/GlobalNav.test.tsx`
- App routing: `apps/web/tests/App.test.tsx`
- E2E: `tests/e2e/specs/venue/event-selection.spec.ts`, `venue-switching.spec.ts`
- Contract matrix: `specs/028-dashboard-routing-tests/contracts/test-coverage.md`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm branch, prerequisites, and coverage contract before test work.

- [x] T001 Verify branch `028-dashboard-routing-tests` and design docs in `specs/028-dashboard-routing-tests/` per plan.md
- [x] T002 [P] Review test coverage contract in `specs/028-dashboard-routing-tests/contracts/test-coverage.md` and map GAP/AUDIT rows (R19, R21, R22, R24)
- [x] T003 [P] Confirm prerequisites merged on branch: `023-split-dashboard-routes`, `026-dashboard-overview-page`, `027-workspace-focus-scroll` (overview at `/`, workspace routes, focus query)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Baseline audit and targeted suite run. **Blocks all user stories.**

**⚠️ CRITICAL**: No user story work begins until baseline gaps are recorded.

- [x] T004 Run overview Vitest baseline: `cd apps/web && npx vitest run tests/pages/DashboardOverviewPage.test.tsx` and record pass/fail vs contract rows R1–R7, R26 in `specs/028-dashboard-routing-tests/contracts/test-coverage.md`
- [x] T005 [P] Run workspace Vitest baseline: `cd apps/web && npx vitest run tests/pages/EventWorkspacePage.test.tsx` and record pass/fail vs rows R8–R13, R27–R28
- [x] T006 [P] Run route-helper Vitest baseline: `cd apps/web && npx vitest run tests/lib/appRoute.test.ts tests/lib/dashboardRoute.test.ts tests/lib/eventWorkspaceRoute.test.ts tests/shell/GlobalNav.test.tsx` and record pass/fail vs rows R14–R19
- [x] T007 [P] Run E2E baseline: `npx playwright test tests/e2e/specs/venue/event-selection.spec.ts tests/e2e/specs/venue/venue-switching.spec.ts` (with `WEB_BASE_URL` set) and document failures for R21, R22, R24
- [x] T008 Verify zero `DashboardHome` references in production/tests: `git grep DashboardHome -- apps/web` (expect no matches per R25)

**Checkpoint**: GAP/AUDIT rows documented; foundational audit complete

---

## Phase 3: User Story 1 — Overview page behavior verified in isolation (Priority: P1) 🎯 MVP

**Goal**: Vitest suite confirms dashboard entry shows priority-zone overview (not ledger), empty/error states, and card/quick-link navigation to workspace.

**Independent Test**: `cd apps/web && npx vitest run tests/pages/DashboardOverviewPage.test.tsx` — all R1–R7, R26 rows pass (quickstart §Run targeted Vitest suites).

### Tests for User Story 1 (REQUIRED) ⚠️

> **NOTE: Extend failing/missing cases FIRST per contract GAP audit**

- [x] T009 [P] [US1] Add explicit assertion that `event-ledger-page` and `mock-ledger-page` are absent when overview renders in `apps/web/tests/pages/DashboardOverviewPage.test.tsx` (R1)
- [x] T010 [P] [US1] Audit rows R2–R5 in `apps/web/tests/pages/DashboardOverviewPage.test.tsx`; add missing cases for no auto-redirect, permission-gated no-venue CTA, no-events without create CTA, and events error retry if baseline audit found gaps
- [x] T011 [P] [US1] Audit rows R6–R7 in `apps/web/tests/pages/DashboardOverviewPage.test.tsx`; ensure card body and quick-link tests assert `navigateToEventWorkspace` with optional focus per `apps/web/src/lib/eventWorkspaceRoute.ts`

### Implementation for User Story 1

- [x] T012 [US1] Fix any failing overview tests in `apps/web/tests/pages/DashboardOverviewPage.test.tsx` using `mockWorkspaceFetch` and fixtures from `apps/web/tests/fixtures/events.ts` and `venues.ts` (Constitution VI)
- [x] T013 [US1] Run `cd apps/web && npx vitest run tests/pages/DashboardOverviewPage.test.tsx` until all US1 contract rows (R1–R7, R26) pass
- [x] T014 [US1] Mark rows R1–R7, R26 complete in `specs/028-dashboard-routing-tests/contracts/test-coverage.md`

**Checkpoint**: MVP — overview routing tests green independently

---

## Phase 4: User Story 2 — Event workspace page behavior verified in isolation (Priority: P2)

**Goal**: Vitest suite confirms workspace URL-driven context, combobox/venue URL sync, create-event flow, focus wiring, and global nav highlight.

**Independent Test**: `cd apps/web && npx vitest run tests/pages/EventWorkspacePage.test.tsx tests/shell/GlobalNav.test.tsx` — rows R8–R15, R27–R28 pass.

### Tests for User Story 2 (REQUIRED) ⚠️

- [x] T015 [P] [US2] Audit rows R8–R13 in `apps/web/tests/pages/EventWorkspacePage.test.tsx`; add missing deep-link, invalid URL fallback, combobox URL update, venue-switch reset, and workspace-only create CTA cases if baseline found gaps
- [x] T016 [P] [US2] Audit rows R27–R28 in `apps/web/tests/pages/EventWorkspacePage.test.tsx`; confirm focus strip on combobox/venue switch and browser-back restoration after event switch
- [x] T017 [P] [US2] Confirm rows R14–R15 covered in `apps/web/tests/shell/GlobalNav.test.tsx` (dashboard active on workspace path and `/`)

### Implementation for User Story 2

- [x] T018 [US2] Fix any failing workspace tests in `apps/web/tests/pages/EventWorkspacePage.test.tsx` (mock `EventLedgerPage` pattern; real page under test)
- [x] T019 [US2] Run `cd apps/web && npx vitest run tests/pages/EventWorkspacePage.test.tsx tests/shell/GlobalNav.test.tsx` until all US2 contract rows pass
- [x] T020 [US2] Mark rows R8–R15, R27–R28 complete in `specs/028-dashboard-routing-tests/contracts/test-coverage.md`

**Checkpoint**: Workspace page + global nav tests green independently

---

## Phase 5: User Story 3 — Route helper and navigation utilities verified (Priority: P3)

**Goal**: Unit tests cover path build/parse, dashboard entry helpers, `navigateToEventWorkspace` side effects, and App-level route wiring for overview vs workspace.

**Independent Test**: `cd apps/web && npx vitest run tests/lib/appRoute.test.ts tests/lib/dashboardRoute.test.ts tests/lib/eventWorkspaceRoute.test.ts tests/App.test.tsx` — rows R16–R19 pass.

### Tests for User Story 3 (REQUIRED) ⚠️

- [x] T021 [P] [US3] Add failing barrel re-export smoke test: import `navigateToEventWorkspace` from `@/lib/dashboardRoute` and assert navigation updates path in `apps/web/tests/lib/dashboardRoute.test.ts` (R19 GAP)
- [x] T022 [P] [US3] Extend `apps/web/tests/lib/eventWorkspaceRoute.test.ts` with `WorkspaceFocus` union examples (`deal`, `settlement`, `sync`) instead of legacy `artists` value per `apps/web/src/lib/eventCardQuickLinks.ts` (R17)
- [x] T023 [P] [US3] Add failing App routing smoke tests: authenticated `/` renders `dashboard-overview`; workspace path renders workspace shell in `apps/web/tests/App.test.tsx` (replace legacy `/?venueId=&eventId=` query pattern)

### Implementation for User Story 3

- [x] T024 [US3] Implement R19 test in `apps/web/tests/lib/dashboardRoute.test.ts` until green (no product change unless export missing from `apps/web/src/lib/dashboardRoute.ts`)
- [x] T025 [US3] Update focus examples in `apps/web/tests/lib/eventWorkspaceRoute.test.ts` until green
- [x] T026 [US3] Update `apps/web/tests/App.test.tsx` authenticated route cases for split routes (`/`, `/venues/{id}/events/{id}`) using `mockWorkspaceFetch` or equivalent fetch stubs
- [x] T027 [US3] Run `cd apps/web && npx vitest run tests/lib/appRoute.test.ts tests/lib/dashboardRoute.test.ts tests/lib/eventWorkspaceRoute.test.ts tests/App.test.tsx` until all US3 rows pass
- [x] T028 [US3] Mark rows R16–R19 complete in `specs/028-dashboard-routing-tests/contracts/test-coverage.md`

**Checkpoint**: Route helper + App routing tests green independently

---

## Phase 6: User Story 4 — End-to-end overview-to-workspace journey verified (Priority: P4)

**Goal**: Playwright specs cover login → overview → event card → ledger on workspace URL; create-first-event from workspace route; venue switcher without invalid ledger assertions on overview.

**Independent Test**: `npx playwright test tests/e2e/specs/venue/event-selection.spec.ts tests/e2e/specs/venue/venue-switching.spec.ts` with `WEB_BASE_URL` — rows R21–R24 pass (quickstart §Run Playwright E2E).

### Tests for User Story 4 (REQUIRED) ⚠️

- [x] T029 [P] [US4] Add failing Playwright test `admin opens event from overview and sees ledger on workspace route` in `tests/e2e/specs/venue/event-selection.spec.ts`: login → `/` → assert `dashboard-overview` → click event card → assert URL matches `/venues/.+/events/.+` → assert `event-ledger-page` visible (R21 GAP)
- [x] T030 [P] [US4] Rewrite failing E1 in `tests/e2e/specs/venue/event-selection.spec.ts`: zero-event seed → navigate to workspace route (or deep link) before `empty-state-create-event` → create event → assert ledger on workspace URL, not overview `/` (R22 GAP)
- [x] T031 [P] [US4] Audit E3 in `tests/e2e/specs/venue/venue-switching.spec.ts`: remove or replace ledger-specific assertions when landing on overview `/`; retain `X-Active-Venue-Id` header capture (R24 AUDIT)

### Implementation for User Story 4

- [x] T032 [US4] Implement R21 overview→workspace journey in `tests/e2e/specs/venue/event-selection.spec.ts` using existing `bootstrapDashboard` helper and seeded `alpha-admin@e2e.test` persona
- [x] T033 [US4] Fix R22 create-first-event flow in `tests/e2e/specs/venue/event-selection.spec.ts` per research.md Decision 3
- [x] T034 [US4] Fix R24 venue-switch E3 assertions in `tests/e2e/specs/venue/venue-switching.spec.ts` per research.md Decision 4
- [x] T035 [US4] Run `npx playwright test tests/e2e/specs/venue/event-selection.spec.ts tests/e2e/specs/venue/venue-switching.spec.ts` until R21–R24 pass
- [x] T036 [US4] Mark rows R21–R24 complete in `specs/028-dashboard-routing-tests/contracts/test-coverage.md`

**Checkpoint**: Primary E2E routing journeys green

---

## Phase 7: User Story 5 — Legacy dashboard page artifacts retired safely (Priority: P5)

**Goal**: Confirm `DashboardHome` module and test file removed; migrated assertions live in split page suites; no stale references.

**Independent Test**: `git grep DashboardHome -- apps/web` returns empty; full dashboard Vitest subset passes without `DashboardHome.test.tsx`.

### Tests for User Story 5 (REQUIRED) ⚠️

- [x] T037 [P] [US5] Verify `apps/web/src/pages/DashboardHome.tsx` and `apps/web/tests/pages/DashboardHome.test.tsx` do not exist; if present, map remaining assertions to overview/workspace suites per R20 before deletion
- [x] T038 [P] [US5] Verify `apps/web/src/App.tsx` routes `/` to `DashboardOverviewPage` and workspace path to `EventWorkspacePage` (not `DashboardHome`)

### Implementation for User Story 5

- [x] T039 [US5] Delete `apps/web/src/pages/DashboardHome.tsx` and `apps/web/tests/pages/DashboardHome.test.tsx` if still present; remove any imports in `apps/web/src/App.tsx` or test harness
- [x] T040 [US5] Run `git grep DashboardHome -- apps/web` and confirm zero matches; mark R20, R25 complete in `specs/028-dashboard-routing-tests/contracts/test-coverage.md`

**Checkpoint**: Legacy combined dashboard fully retired

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Coverage gate, regression proof, quickstart validation, contract sign-off.

- [x] T041 [P] Run full frontend coverage gate: `cd apps/web && npm run test:coverage` (or `npx vitest run --coverage`); confirm lines/functions/branches/statements ≥80% per `apps/web/vite.config.ts` (R29)
- [x] T042 Run quickstart validation scenarios in `specs/028-dashboard-routing-tests/quickstart.md` (targeted Vitest, E2E, legacy grep)
- [x] T043 [P] Regression check: temporarily break overview card navigation in `apps/web/src/pages/DashboardOverviewPage.tsx` (local only); confirm at least one test in `apps/web/tests/pages/DashboardOverviewPage.test.tsx` fails; revert change (SC-005)
- [x] T044 Update all R1–R29 rows to complete in `specs/028-dashboard-routing-tests/contracts/test-coverage.md` with no remaining GAP/AUDIT markers
- [x] T045 [P] Search repo docs for stale `DashboardHome.test.tsx` run commands in feature quickstarts touched by this PR; update only if changed files reference obsolete paths

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS all user stories**
- **User Stories (Phase 3–7)**: Depend on Foundational baseline
  - US1 (overview Vitest) can start immediately after Phase 2
  - US2 (workspace Vitest) can parallel US1 (different files)
  - US3 (route helpers + App.test) can parallel US1/US2
  - US4 (Playwright) logically after US1–US3 Vitest green (validates same flows E2E)
  - US5 (legacy cleanup) after US1–US4 confirm migrated coverage (FR-010)
- **Polish (Phase 8)**: Depends on US1–US5 complete

### User Story Dependencies

| Story | Depends on | Independent test command |
|-------|------------|---------------------------|
| US1 (P1) | Phase 2 | `npx vitest run tests/pages/DashboardOverviewPage.test.tsx` |
| US2 (P2) | Phase 2 | `npx vitest run tests/pages/EventWorkspacePage.test.tsx tests/shell/GlobalNav.test.tsx` |
| US3 (P3) | Phase 2 | `npx vitest run tests/lib/appRoute.test.ts tests/lib/dashboardRoute.test.ts tests/lib/eventWorkspaceRoute.test.ts tests/App.test.tsx` |
| US4 (P4) | US1–US3 recommended | `npx playwright test tests/e2e/specs/venue/event-selection.spec.ts tests/e2e/specs/venue/venue-switching.spec.ts` |
| US5 (P5) | US1–US4 | `git grep DashboardHome -- apps/web` |

### Parallel Opportunities

- **Phase 1**: T002 ∥ T003
- **Phase 2**: T005 ∥ T006 ∥ T007 ∥ T008 (after T004 or all parallel if independent)
- **US1**: T009 ∥ T010 ∥ T011
- **US2**: T015 ∥ T016 ∥ T017
- **US3**: T021 ∥ T022 ∥ T023
- **US4**: T029 ∥ T030 ∥ T031
- **US5**: T037 ∥ T038
- **Polish**: T041 ∥ T043 ∥ T045

---

## Parallel Example: User Story 1

```bash
# Launch all US1 test extensions together (different assertions, same file — sequence if conflicting):
# Prefer T009 first, then T010/T011 in same PR

cd apps/web
npx vitest run tests/pages/DashboardOverviewPage.test.tsx
```

---

## Parallel Example: User Story 4

```bash
# E2E files can be edited in parallel by different authors:
# T029 → tests/e2e/specs/venue/event-selection.spec.ts (new journey)
# T031 → tests/e2e/specs/venue/venue-switching.spec.ts (E3 audit)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational baseline audit
3. Complete Phase 3: User Story 1 (overview Vitest)
4. **STOP and VALIDATE**: `npx vitest run tests/pages/DashboardOverviewPage.test.tsx`
5. Proceed to US2–US5 incrementally

### Incremental Delivery

1. Setup + Foundational → baseline documented
2. US1 → overview Vitest green (MVP)
3. US2 → workspace Vitest green
4. US3 → route helpers + App.test green
5. US4 → Playwright overview→workspace + fixed create flow
6. US5 → legacy cleanup verified
7. Polish → coverage gate + quickstart

### Parallel Team Strategy

1. Team completes Setup + Foundational together
2. Once baseline done:
   - Developer A: US1 (overview tests)
   - Developer B: US2 + US3 (workspace + route tests)
   - Developer C: US4 (Playwright) after Vitest subset stable
3. US5 + Polish sequentially after test migration confirmed

---

## Notes

- This feature introduces **no product behavior changes** unless a justified `data-testid` seam is required for E2E stability
- Event combobox edit/delete remains feature 015 scope
- Full focus-scroll Playwright depth remains feature 027 scope; US1 page tests cover quick-link navigation with focus (FR-004)
- Use `@/types/generated-api` for all fixtures (Constitution VI)
- Mark tasks `[x]` in this file as each completes during `/speckit-implement`

**Next command**: `/speckit-implement` to execute tasks in order
