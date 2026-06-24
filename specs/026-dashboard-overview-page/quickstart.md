# Quickstart & Validation: Dashboard Overview Page

**Feature**: `026-dashboard-overview-page` | **Date**: 2026-06-18

Manual and automated validation for the dashboard overview. See [contracts/dashboard-overview-ui.md](./contracts/dashboard-overview-ui.md) and [data-model.md](./data-model.md).

## Prerequisites

- Node 20+
- **023 merged**: workspace routes + `navigateToEventWorkspace`
- **025 merged**: `EventCard`, `pinnedEventStorage`
- **SPLR-64 merged**: `eventLifecycle.ts` date/phase helpers

```bash
cd apps/web
npm install
```

## Automated tests

```bash
cd apps/web
npm run test -- tests/lib/partitionOverviewZones.test.ts
npm run test -- tests/pages/DashboardOverviewPage.test.tsx
```

**Expected**: Partition matrix zero misclassifications (SC-003); page scenarios pass; ≥80% line/branch coverage on touched files.

## Scenario A — Overview landing (User Story 1, P1)

1. Sign in with a venue that has ≥2 events.
2. Navigate to `/`.

**Expected**: `data-testid="dashboard-overview"` visible; **no** redirect to `/venues/.../events/...`; ledger grid not shown.

3. Confirm `dashboard-workspace-bar` contains `VenueSwitcher`.

## Scenario B — Tonight hero (User Story 2, P2)

1. Seed an event with `eventDate` = today (local).
2. Reload `/`.

**Expected**: `dashboard-zone-tonight` visible with event card(s).

3. Remove today-dated events (or use fixture dates).

**Expected**: `dashboard-zone-tonight` **absent** from DOM.

4. Seed two events dated today.

**Expected**: Both cards in hero zone.

## Scenario C — Zone partitioning (User Story 3, P3)

Use fixed `now` in partition unit tests plus page fixtures:

| Fixture event | Date offset | Pinned? | Expected zones |
|---------------|-------------|---------|----------------|
| Today | 0 | no | tonight only |
| Yesterday | −1d | no | recent |
| 7 days ago | −7d | no | recent |
| 8 days ago | −8d | no | none |
| Tomorrow | +1d | no | upcoming |
| 30 days ahead | +30d | no | upcoming |
| 31 days ahead | +31d | no | none |
| Tomorrow | +1d | yes | pinned + upcoming |

**Expected**: Zone order on page: pinned → tonight → upcoming → recent.

**Expected**: Empty zones show heading + message (e.g. “No pinned events”) not blank gaps.

## Scenario D — Pin toggle (User Story 3)

1. Pin an event from overview card.
2. Reload page.

**Expected**: Event in pinned zone; pin icon active (`pinnedEventStorage`).

3. Unpin.

**Expected**: Removed from pinned zone; may remain in date zone if applicable.

## Scenario E — Navigation (User Story 4, P4)

1. Click quick link on a Pre-Show card.

**Expected**: URL `/venues/{venueId}/events/{eventId}?focus=deal` (focus scroll may be no-op until SPLR-67).

2. Return to `/`; click card body.

**Expected**: Workspace URL without focus query; ledger visible.

## Scenario F — No-events empty state (clarification)

1. Use venue with zero events; navigate to `/`.

**Expected**: `dashboard-no-events` visible; **no** `empty-state-create-event` button.

2. Create event from `EventWorkspacePage` empty state (separate flow).

**Expected**: Create works from workspace only.

## Scenario G — No auto-redirect regression

1. With events present, visit `/`.

**Expected**: Stays on overview (FR-001); bookmarking workspace URL and returning to `/` still shows overview.

## Coverage gate

```bash
cd apps/web
npm run test:coverage -- tests/pages/DashboardOverviewPage.test.tsx tests/lib/partitionOverviewZones.test.ts
```

**Expected**: Touched files ≥80% lines and branches per Constitution III.
