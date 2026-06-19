# Implementation Plan: Mini-Calendar View for Upcoming Events

**Branch**: `038-mini-calendar-events` | **Date**: 2026-06-19 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/038-mini-calendar-events/spec.md` (Linear SPLR-78)

## Summary

Add a **list ↔ calendar toggle** to the dashboard **Upcoming Events** zone. Calendar mode renders a **custom CSS month-grid mini-calendar** plotting server-supplied `upcomingEvents` on local dates within the existing **30-day lookahead** window. Multi-event dates show **up to three truncated titles + "+N more"**; event chips navigate via existing `navigateToEventWorkspace`. View preference persists in **`sessionStorage`** for the browser session. **No backend/API changes**—pure frontend slice with Vitest + RTL ≥80% on touched files.

## Technical Context

**Language/Version**: TypeScript 5.7 / React 18 (`apps/web`) only; C# API unchanged

**Primary Dependencies**: Existing `DashboardZoneEvents`, `UpcomingEventsSection`, `EventCardDto` from `generated-api.ts`; `navigateToEventWorkspace` (`dashboardRoute.ts`); Font Awesome Free `faList`, `faCalendarDays` (Constitution IX)

**Storage**: `sessionStorage` key `split-rail:upcoming-events-view` (`list` | `calendar`); no server persistence

**Testing**: Vitest + React Testing Library for toggle, calendar grid, storage helpers, and `UpcomingEventsSection` integration; extend `DashboardOverviewPage.test.tsx`; pure-function tests for `upcomingEventsCalendar.ts`; ≥80.0% line/branch coverage on new/modified frontend files (Constitution III); no new xUnit tests (no backend changes)

**Target Platform**: Vite SPA dashboard overview (`/`)

**Project Type**: Web application — frontend-only vertical slice in `apps/web`

**Performance Goals**: View toggle <2s without refetch (SC-001); client-side grouping only

**Constraints**: No third-party calendar library; dashboard CSS tokens; Constitution VI (generated types only); FR-010 no extra server request; ≥80.0% frontend coverage on touched modules; backend gate N/A (zero API changes)

**Scale/Scope**: ~2 new components, ~2 lib modules, ~1 section refactor, CSS block, ~5 test files, 0 migrations, 0 DTOs

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Relevance | Status |
|-----------|-----------|--------|
| I. Core Mathematical Axioms | No monetary math. | N/A |
| II. Multi-Tenant Isolation | Reuses venue-scoped dashboard data; navigation uses `event.venueId`. | PASS |
| III. Engineering Rigor | Vitest + RTL on calendar, toggle, storage, section; extend overview tests; ≥80% touched frontend files. | PASS (with tests) |
| IV. QBO Integration | No QBO changes. | N/A |
| V. Ledger State Machine | Read-only calendar; no mutations. | N/A |
| VI. Polyglot Contract | `EventCardDto` from `generated-api.ts`; no hand-written API types. | PASS |
| VII. EF Core Axioms | No database access. | N/A |
| VIII. Exception Governance | No new API paths. | N/A |
| IX. UI Iconography | FA icons on view toggle. | PASS |

**Post-design re-check (Phase 1)**: [research.md](./research.md), [data-model.md](./data-model.md), and [contracts/upcoming-events-calendar-ui.md](./contracts/upcoming-events-calendar-ui.md) confirm frontend-only scope, sessionStorage preference, custom month grid, and no REST changes. Gates remain PASS. No Complexity Tracking entries required.

## Project Structure

### Documentation (this feature)

```text
specs/038-mini-calendar-events/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── upcoming-events-calendar-ui.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
apps/web/src/
├── lib/
│   ├── upcomingEventsCalendar.ts       # NEW — window, grouping, grid weeks
│   └── upcomingEventsViewStorage.ts    # NEW — sessionStorage read/write
├── components/dashboard/
│   ├── DashboardZoneSections.tsx       # MODIFY — UpcomingEventsSection dual view
│   ├── UpcomingEventsViewToggle.tsx    # NEW — list/calendar segmented control
│   └── UpcomingEventsMiniCalendar.tsx  # NEW — month grid + event chips
└── index.css                           # MODIFY — mini-calendar + toggle styles

apps/web/tests/
├── lib/
│   ├── upcomingEventsCalendar.test.ts  # NEW
│   └── upcomingEventsViewStorage.test.ts # NEW
├── components/dashboard/
│   ├── UpcomingEventsViewToggle.test.tsx    # NEW
│   ├── UpcomingEventsMiniCalendar.test.tsx  # NEW
│   └── UpcomingEventsSection.test.tsx       # NEW
└── pages/
    └── DashboardOverviewPage.test.tsx  # MODIFY — calendar toggle smoke
```

**Structure Decision**: Encapsulate calendar logic in `UpcomingEventsSection` (mirrors `RecentEventsSection` owning its filter slot). Pure date/grid functions live in `lib/` for unit test coverage. `DashboardZoneEvents` stays list-only; calendar is sibling render path.

## Implementation Phases

### Phase A — Pure functions & storage (foundation)

1. Implement `upcomingEventsCalendar.ts` (`getUpcomingWindowBounds`, `groupEventsByLocalDate`, `buildMiniCalendarWeeks`, `truncateEventTitle`).
2. Implement `upcomingEventsViewStorage.ts`.
3. Unit tests with window edge cases (month boundary, today exclusion, multi-event grouping).

### Phase B — UI components

1. `UpcomingEventsViewToggle` with FA icons and `aria-pressed`.
2. `UpcomingEventsMiniCalendar` — grid, truncated titles, `+N more` expand popover, `onEventActivate`.
3. CSS in `index.css` aligned with `.dashboard-zone__*` patterns.

### Phase C — Section integration

1. Refactor `UpcomingEventsSection` to manage view mode state + sessionStorage sync.
2. Pass toggle via `filterSlot`; switch between `DashboardZoneEvents` and `UpcomingEventsMiniCalendar`.
3. Preserve empty-state and loading behavior from parent page.

### Phase D — Tests & coverage gate

1. Component RTL tests (toggle, calendar cells, navigation mocks, +N more).
2. Extend `DashboardOverviewPage.test.tsx` for end-to-end toggle persistence smoke.
3. Run `npm run test:coverage` on touched paths; confirm ≥80% lines/branches.

## Complexity Tracking

> No constitution violations requiring justification.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |

## Artifacts Generated (Phase 0–1)

| Artifact | Path |
|----------|------|
| Research | [research.md](./research.md) |
| Data model | [data-model.md](./data-model.md) |
| UI contract | [contracts/upcoming-events-calendar-ui.md](./contracts/upcoming-events-calendar-ui.md) |
| Quickstart | [quickstart.md](./quickstart.md) |

**Next command**: `/speckit-tasks`
