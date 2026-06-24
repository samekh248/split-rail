# Quickstart & Validation: Upcoming Events Mini-Calendar

**Feature**: `038-mini-calendar-events` | **Date**: 2026-06-19

Manual and automated validation for the Upcoming Events list/calendar toggle. See [contracts/upcoming-events-calendar-ui.md](./contracts/upcoming-events-calendar-ui.md) and [data-model.md](./data-model.md).

## Prerequisites

- Node 20+
- **SPLR-66 / 031 / 032 merged**: `DashboardOverviewPage` wired to server `upcomingEvents` partition
- Branch `038-mini-calendar-events`

```bash
cd apps/web
npm install
```

## Automated tests

```bash
cd apps/web
npm run test -- tests/lib/upcomingEventsCalendar.test.ts
npm run test -- tests/lib/upcomingEventsViewStorage.test.ts
npm run test -- tests/components/dashboard/UpcomingEventsMiniCalendar.test.tsx
npm run test -- tests/components/dashboard/UpcomingEventsViewToggle.test.tsx
npm run test -- tests/components/dashboard/UpcomingEventsSection.test.tsx
```

Extend existing overview integration:

```bash
npm run test -- tests/pages/DashboardOverviewPage.test.tsx
```

**Expected**: All scenarios pass; ≥80% line/branch coverage on new/modified frontend modules (Constitution III). No backend tests required (no API changes).

## Scenario A — Default list view (User Story 1, P1)

1. Seed dashboard mock with `upcomingEvents` containing at least one future event.
2. Open overview (`/`).

**Expected**: `dashboard-zone-upcoming` visible; list cards rendered; `upcoming-view-list` has `aria-pressed="true"`.

## Scenario B — Toggle to calendar (User Story 1 & 2, P1)

1. Click `upcoming-view-calendar`.

**Expected**: `upcoming-mini-calendar` visible; no card list; same event count represented on correct `calendar-day-*` cells; no additional fetch (mock dashboard called once).

2. Click `upcoming-view-list`.

**Expected**: Card list returns; calendar hidden.

## Scenario C — Date placement (User Story 2, SC-002)

Fixtures with `eventDate` at tomorrow, +15 days, +30 days, and +31 days (server should omit +31 from partition—verify calendar only renders supplied events).

**Expected**: Events on +1, +15, +30 appear on matching cells; today-dated event absent from upcoming section.

## Scenario D — Multi-event date (Clarification Q1)

1. Seed three events same date + one additional same date (4 total).

**Expected**: Three truncated title buttons + `calendar-more-{date}` showing `+1 more`.
2. Activate `+1 more`.

**Expected**: Remaining event activatable; navigation mock receives correct `eventId`.

## Scenario E — Workspace navigation (User Story 3, P2)

1. Calendar mode; click `calendar-event-{id}`.

**Expected**: `navigateToEventWorkspace(venueId, eventId)` — same as list card activate.

## Scenario F — Session preference (User Story 4, P3)

1. Switch to calendar; navigate to event workspace and back to `/`.

**Expected**: Calendar mode still active.

2. `sessionStorage.clear()`; reload overview.

**Expected**: List view default.

## Scenario G — Empty upcoming zone (FR-008)

1. Mock `upcomingEvents: []`.

**Expected**: "No upcoming events" message; calendar grid not mounted.

## Scenario H — Month boundary (Clarification Q2)

1. Mock `Date` or seed events so window spans month end (e.g., Jan 25 → Feb 24).

**Expected**: Single month grid with adjacent-month padding days; events on both months visible.

## Coverage gate

```bash
cd apps/web
npm run test:coverage -- tests/lib/upcomingEventsCalendar.test.ts tests/components/dashboard/UpcomingEventsMiniCalendar.test.tsx
```

**Expected**: Touched files ≥80% lines and branches. Backend coverage gate unchanged (no touched API files).

## Backend

No API or migration steps. Confirm `dotnet test` still passes repo-wide but no new xUnit files required for this feature.
