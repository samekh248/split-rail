---
description: "Task list for Financial Health Widget and Bottleneck Filter (SPLR-76)"
---

# Tasks: Financial Health Widget and Recent Events Bottleneck Filter

**Input**: Design documents from `/specs/036-financial-health-bottleneck-filter/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/financial-health-bottleneck-ui.md, quickstart.md; upstream **034** (`financialHealth` on `DashboardResponse`), **032** (`useDashboard` / overview wire), **035** (unassigned-transactions banner placement reference)

**Tests**: REQUIRED per Constitution III. Each user story phase adds failing Vitest + RTL tests first in `apps/web/tests/`, then implement until green. Final Polish phase enforces ≥80.0% line/branch coverage on **frontend** touched files via `npm run test:coverage` (Vitest → lcov). No backend file changes — backend coverage gate N/A (document in Polish task). Missing or unparseable coverage reports FAIL.

**Organization**: Tasks grouped by user story (US1–US4). Frontend-only through `apps/web/src/` and `apps/web/tests/`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1–US4 (maps to user stories in spec.md)
- All paths are repo-relative

## Path Conventions

- Lib helpers: `apps/web/src/lib/eventCardSummary.ts`
- Components: `apps/web/src/components/dashboard/`
- Page: `apps/web/src/pages/DashboardOverviewPage.tsx`
- Styles: `apps/web/src/index.css`
- Tests: `apps/web/tests/lib/`, `apps/web/tests/components/dashboard/`, `apps/web/tests/pages/`
- Contract: `specs/036-financial-health-bottleneck-filter/contracts/financial-health-bottleneck-ui.md`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm branch, upstream dependencies, and UI contract before implementation.

- [x] T001 Verify branch `dustin/splr-76-build-financialhealthwidget-and-bottleneckfilter-for-recent` and design docs in `specs/036-financial-health-bottleneck-filter/` per plan.md
- [x] T002 [P] Review UI contract matrix in `specs/036-financial-health-bottleneck-filter/contracts/financial-health-bottleneck-ui.md` (test IDs, props, visibility rules)
- [x] T003 [P] Confirm upstream **034** complete: `FinancialHealthDto` present in `apps/web/src/types/generated-api.ts` and `financialHealth` on `DashboardResponse`; confirm **032** `useDashboard` wired in `apps/web/src/pages/DashboardOverviewPage.tsx`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared bottleneck filter helpers, CSS scaffold, and test fixtures. **Blocks User Story 2.**

**⚠️ CRITICAL**: No bottleneck filter work begins until `eventHasBottleneckAlerts` is tested and green.

- [x] T004 [P] Add failing unit tests for `eventHasBottleneckAlerts` and `filterRecentEventsByBottleneck` (unmapped, variance concern, no alerts, filter on/off) in `apps/web/tests/lib/eventCardSummary.test.ts` per `specs/036-financial-health-bottleneck-filter/data-model.md`
- [x] T005 Implement `eventHasBottleneckAlerts` and `filterRecentEventsByBottleneck` in `apps/web/src/lib/eventCardSummary.ts` per `specs/036-financial-health-bottleneck-filter/research.md` §6
- [x] T006 Run foundational helper tests until green: `cd apps/web && npm run test -- tests/lib/eventCardSummary.test.ts`
- [x] T007 [P] Add BEM CSS scaffold for `.financial-health-widget`, `.bottleneck-filter`, `.dashboard-zone__header` in `apps/web/src/index.css` per contract
- [x] T008 [P] Extend dashboard/overview test mocks with sample `financialHealth` and mixed recent-event bottleneck fixtures in `apps/web/tests/pages/DashboardOverviewPage.test.tsx` (helpers only; no story assertions yet)

**Checkpoint**: Bottleneck helpers green; styles scaffolded; mocks ready — user story work can begin

---

## Phase 3: User Story 1 — Assess Current-Week Financial Health at a Glance (Priority: P1) 🎯 MVP

**Goal**: Financial health widget on single-venue overview showing week range plus projected net gross, actual QBO deposits, and variance via `formatMoney`; hidden when loading, absent data, or all-venues view.

**Independent Test**: `cd apps/web && npm run test -- tests/components/dashboard/FinancialHealthWidget.test.tsx` — widget renders week range and three formatted money values; null/loading guards pass (quickstart Scenario A).

### Tests for User Story 1 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T009 [P] [US1] Add failing test: widget renders `data-testid="financial-health-week-range"` and three money testids from fixture DTO in `apps/web/tests/components/dashboard/FinancialHealthWidget.test.tsx`
- [x] T010 [P] [US1] Add failing test: widget returns null when `isLoading === true` or `financialHealth` undefined in `apps/web/tests/components/dashboard/FinancialHealthWidget.test.tsx`
- [x] T011 [P] [US1] Add failing test: monetary values use `formatMoney` output (projected, actual, variance) in `apps/web/tests/components/dashboard/FinancialHealthWidget.test.tsx`
- [x] T012 [P] [US1] Add failing overview test: widget hidden in all-venues view in `apps/web/tests/pages/DashboardOverviewPage.test.tsx`

### Implementation for User Story 1

- [x] T013 [US1] Create `FinancialHealthWidget.tsx` with week range label, three money rows, `faChartLine` icon, and contract testids in `apps/web/src/components/dashboard/FinancialHealthWidget.tsx`
- [x] T014 [US1] Wire `financialHealth` from `singleVenueDashboard.data` into `DashboardOverviewPage.tsx` — render widget single-venue only, suppress while loading in `apps/web/src/pages/DashboardOverviewPage.tsx`
- [x] T015 [US1] Run US1 tests until green: `cd apps/web && npm run test -- tests/components/dashboard/FinancialHealthWidget.test.tsx tests/pages/DashboardOverviewPage.test.tsx --testNamePattern="FinancialHealth|financial-health|all-venues"`

**Checkpoint**: MVP — operators see weekly financial health on single-venue overview; SC-001/SC-006 satisfied

---

## Phase 4: User Story 2 — Filter Recent Events to Those Needing Attention (Priority: P1)

**Goal**: "Needs attention" toggle on Recent Events header; client-filters `recentEvents` via shared bottleneck helper; filtered empty state; resets on venue scope change.

**Independent Test**: `cd apps/web && npm run test -- tests/components/dashboard/BottleneckFilter.test.tsx tests/pages/DashboardOverviewPage.test.tsx --testNamePattern="bottleneck|Needs attention"` — filter on/off and empty state (quickstart Scenarios B–E).

### Tests for User Story 2 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T016 [P] [US2] Add failing test: toggle updates `aria-pressed` and calls `onToggle` in `apps/web/tests/components/dashboard/BottleneckFilter.test.tsx`
- [x] T017 [P] [US2] Add failing overview test: activating filter shows only recent events with bottleneck alerts in `apps/web/tests/pages/DashboardOverviewPage.test.tsx`
- [x] T018 [P] [US2] Add failing overview test: deactivating filter restores full recent list order in `apps/web/tests/pages/DashboardOverviewPage.test.tsx`
- [x] T019 [P] [US2] Add failing overview test: filtered empty message `"No events need attention"` when no alerted recent events in `apps/web/tests/pages/DashboardOverviewPage.test.tsx`
- [x] T020 [P] [US2] Add failing overview test: filter resets to inactive on `venueScopeKey` change in `apps/web/tests/pages/DashboardOverviewPage.test.tsx`

### Implementation for User Story 2

- [x] T021 [US2] Create `BottleneckFilter.tsx` with `data-testid="bottleneck-filter-toggle"`, `aria-pressed`, and `faFilter` icon in `apps/web/src/components/dashboard/BottleneckFilter.tsx`
- [x] T022 [US2] Extend `RecentEventsSection` with optional `filterSlot` header row in `apps/web/src/components/dashboard/DashboardZoneSections.tsx`
- [x] T023 [US2] Add `bottleneckFilterActive` state, `filterRecentEventsByBottleneck` wiring, dynamic empty message, and `useEffect` reset on `venueScopeKey` in `apps/web/src/pages/DashboardOverviewPage.tsx`
- [x] T024 [US2] Run US2 tests until green: `cd apps/web && npm run test -- tests/components/dashboard/BottleneckFilter.test.tsx tests/lib/eventCardSummary.test.ts tests/pages/DashboardOverviewPage.test.tsx --testNamePattern="bottleneck|filter|Needs"`

**Checkpoint**: Recent-events bottleneck filter fully functional; SC-002/SC-003 satisfied

---

## Phase 5: User Story 3 — See Variance Warnings on Settled Event Cards (Priority: P2)

**Goal**: Red variance badge on event cards when `hasVarianceConcern === true`, including `SETTLED` status; no false positives without concern.

**Independent Test**: `cd apps/web && npm run test -- tests/components/dashboard/EventCard.test.tsx --testNamePattern="SETTLED|variance"` — badge visibility matches server summary (quickstart Scenario F).

### Tests for User Story 3 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T025 [P] [US3] Add failing test: `SETTLED` + `hasVarianceConcern: true` shows `event-card-variance` badge in `apps/web/tests/components/dashboard/EventCard.test.tsx`
- [x] T026 [P] [US3] Add failing test: `SETTLED` + `hasVarianceConcern: false` hides variance badge in `apps/web/tests/components/dashboard/EventCard.test.tsx`
- [x] T027 [P] [US3] Add failing test: `RECONCILED` + `hasVarianceConcern: true` still shows badge (regression) in `apps/web/tests/components/dashboard/EventCard.test.tsx`

### Implementation for User Story 3

- [x] T028 [US3] Audit `EventCard.tsx` for RECONCILED-only or status gates on variance badge; apply minimal fix only if audit finds blocking logic in `apps/web/src/components/dashboard/EventCard.tsx`
- [x] T029 [US3] Run US3 tests until green: `cd apps/web && npm run test -- tests/components/dashboard/EventCard.test.tsx --testNamePattern="SETTLED|variance|RECONCILED"`

**Checkpoint**: Settled variance badge behavior verified; SC-004 satisfied

---

## Phase 6: User Story 4 — Integrate with Existing Overview Layout (Priority: P2)

**Goal**: Widget below unassigned-transactions banner and above zones; filter in recent header; widget in zero-events branch; other zones unaffected by filter; loading/error conventions aligned.

**Independent Test**: `cd apps/web && npm run test -- tests/pages/DashboardOverviewPage.test.tsx --testNamePattern="layout|zero-events|zones"` — placement and cross-zone behavior (quickstart Scenarios G–H).

### Tests for User Story 4 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T030 [P] [US4] Add failing test: DOM order — banner (if present) → financial health widget → zones in `apps/web/tests/pages/DashboardOverviewPage.test.tsx`
- [x] T031 [P] [US4] Add failing test: financial health widget visible in zero-events single-venue branch when `financialHealth` present in `apps/web/tests/pages/DashboardOverviewPage.test.tsx`
- [x] T032 [P] [US4] Add failing test: pinned/upcoming zone card counts unchanged when bottleneck filter active in `apps/web/tests/pages/DashboardOverviewPage.test.tsx`
- [x] T033 [P] [US4] Add failing test: widget and recent filter absent/hidden during dashboard loading error state per overview conventions in `apps/web/tests/pages/DashboardOverviewPage.test.tsx`

### Implementation for User Story 4

- [x] T034 [US4] Refine `DashboardOverviewPage.tsx` render branches: zero-events widget placement, banner→widget→zones order, loading guards for filter slot in `apps/web/src/pages/DashboardOverviewPage.tsx`
- [x] T035 [US4] Run US4 integration tests until green: `cd apps/web && npm run test -- tests/pages/DashboardOverviewPage.test.tsx`

**Checkpoint**: Full overview layout integration complete; SC-005 satisfied

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final styles, full regression, coverage gate, quickstart validation.

- [x] T036 [P] Finalize BEM styles and responsive layout for `.financial-health-widget` and `.bottleneck-filter` in `apps/web/src/index.css`
- [x] T037 Run full touched test suite per `specs/036-financial-health-bottleneck-filter/quickstart.md`: `cd apps/web && npm run test -- tests/lib/eventCardSummary.test.ts tests/components/dashboard/FinancialHealthWidget.test.tsx tests/components/dashboard/BottleneckFilter.test.tsx tests/components/dashboard/EventCard.test.tsx tests/pages/DashboardOverviewPage.test.tsx`
- [x] T038 Verify ≥80.0% line/branch coverage on touched frontend files via `cd apps/web && npm run test:coverage` (Vitest → lcov); backend N/A — no `apps/api` changes; missing or unparseable reports FAIL
- [x] T039 Execute manual quickstart scenarios A–H in `specs/036-financial-health-bottleneck-filter/quickstart.md` and note results in PR description

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS User Story 2** (bottleneck helpers)
- **User Story 1 (Phase 3)**: Depends on Setup only — can start after Phase 1 (parallel with Phase 2)
- **User Story 2 (Phase 4)**: Depends on Foundational (Phase 2) completion
- **User Story 3 (Phase 5)**: Depends on Setup only — can run parallel with US1/US2 (different files)
- **User Story 4 (Phase 6)**: Depends on US1 + US2 implementation (layout integrates both)
- **Polish (Phase 7)**: Depends on US1–US4 completion

### User Story Dependencies

| Story | Depends on | Independently testable via |
|-------|------------|----------------------------|
| US1 (P1) | Phase 1 | `FinancialHealthWidget.test.tsx` |
| US2 (P1) | Phase 2 | `BottleneckFilter.test.tsx` + overview filter tests |
| US3 (P2) | Phase 1 | `EventCard.test.tsx` SETTLED variance cases |
| US4 (P2) | US1, US2 | `DashboardOverviewPage.test.tsx` layout tests |

### Within Each User Story

- Tests written and failing before implementation
- Component/lib files before page wiring (except US4 refinement)
- Story tests green before next priority

### Parallel Opportunities

- **Phase 1**: T002 ∥ T003
- **Phase 2**: T004 ∥ T007 ∥ T008 (T005 after T004)
- **After Phase 1**: US1 (Phase 3) ∥ US3 (Phase 5) ∥ Phase 2 foundational work
- **Phase 3 tests**: T009 ∥ T010 ∥ T011 ∥ T012
- **Phase 4 tests**: T016–T020 all parallel
- **Phase 5 tests**: T025 ∥ T026 ∥ T027
- **Phase 6 tests**: T030–T033 all parallel

---

## Parallel Example: User Story 1

```bash
# Launch all US1 tests together (must fail before T013):
Task T009: FinancialHealthWidget week range + money testids
Task T010: loading/null guards
Task T011: formatMoney assertions
Task T012: all-venues hidden overview test

# Then implement:
Task T013: FinancialHealthWidget.tsx
Task T014: DashboardOverviewPage wiring
Task T015: run until green
```

---

## Parallel Example: User Story 2

```bash
# After Phase 2 checkpoint:
Task T016: BottleneckFilter toggle tests
Task T017–T020: overview filter integration tests (parallel)

# Then implement:
Task T021: BottleneckFilter.tsx
Task T022: RecentEventsSection filterSlot
Task T023: DashboardOverviewPage filter state
Task T024: run until green
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 3: User Story 1 (skip Phase 2 if bottleneck not needed for MVP)
3. **STOP and VALIDATE**: Financial health widget on single-venue overview
4. Demo weekly cash-flow visibility

### Incremental Delivery

1. Setup → US1 (MVP financial health widget)
2. Foundational → US2 (bottleneck filter on recent events)
3. US3 (settled variance badge verification)
4. US4 (full layout polish + zero-events branch)
5. Polish (coverage gate + quickstart)

### Parallel Team Strategy

1. Team completes Setup together
2. Developer A: Phase 2 + US2 (filter)
3. Developer B: US1 (financial health widget) — starts after Setup
4. Developer C: US3 (EventCard tests) — starts after Setup
5. Developer A or B: US4 integration after US1 + US2 merge
6. Any developer: Polish phase

---

## Notes

- No backend tasks — `FinancialHealthDto` and `hasVarianceConcern` consumed from existing dashboard API (034/031)
- Bottleneck filter uses same derivation as `EventCard` — do not duplicate alert rules in filter component
- `[P]` tasks touch different files; page wiring tasks (T014, T023, T034) are sequential on `DashboardOverviewPage.tsx`
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
