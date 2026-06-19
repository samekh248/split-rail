# Quickstart & Validation: Server-Backed Dashboard Overview

**Feature**: `032-overview-dashboard-wire` | **Date**: 2026-06-18

Manual and automated validation for wiring the overview to server dashboard data and pin mutations. See [contracts/dashboard-hooks-ui.md](./contracts/dashboard-hooks-ui.md) and [data-model.md](./data-model.md).

## Prerequisites

- Node 20+, .NET 8 SDK
- **031 merged**: `GET /api/venues/{venueId}/dashboard` + `DashboardResponse` in `generated-api.ts`
- **030 merged**: `PUT`/`DELETE .../pin` endpoints
- **026 merged**: `DashboardOverviewPage` + zone sections

```bash
cd apps/api && dotnet build
cd apps/web && npm install
```

Local stack (API + web) or test-only validation:

```bash
# Automated (primary gate)
cd apps/web
npm run test -- tests/api/dashboard.test.ts
npm run test -- tests/pages/DashboardOverviewPage.test.tsx
npm run test -- tests/components/dashboard/EventCard.test.tsx
```

**Expected**: All tests pass; ≥80% line/branch coverage on touched files (Constitution III).

## Scenario A — Server partitions render (User Story 1, P1)

1. Seed a venue with events in tonight, recent, upcoming, and pinned buckets (via API or integration fixtures).
2. Sign in and navigate to `/` with that venue active.

**Expected**: Zone sections match server partitions — not client-computed from raw event list.

3. Open browser network tab.

**Expected**: `GET /api/venues/{venueId}/dashboard` called; **no** `GET .../events` required for zone layout on single-venue view.

## Scenario B — Tonight hero visibility (FR-003)

1. Use a venue with no events dated today (UTC/server rules).

**Expected**: `dashboard-zone-tonight` absent.

2. Add an event dated today.

**Expected**: Tonight hero visible with card(s).

## Scenario C — Server pin persistence (User Story 2, P1)

1. Pin an event from overview card.
2. Hard refresh the page (`Ctrl+F5`).

**Expected**: Event remains in pinned zone with pinned icon.

3. Open a second browser / incognito, sign in as same user.

**Expected**: Same pin visible (server-backed, not localStorage).

4. Unpin and refresh.

**Expected**: Event removed from pinned zone.

## Scenario D — Optimistic pin UX (User Story 5, P3)

1. Throttle network (DevTools → Slow 3G).
2. Toggle pin on a card.

**Expected**: Pin icon and pinned zone update immediately.

3. Wait for request completion.

**Expected**: State remains consistent after dashboard invalidation/refetch.

4. Simulate failed pin (stop API or mock 500 in tests).

**Expected**: UI reverts; user sees error feedback.

## Scenario E — Venue switch (User Story 4, P2)

1. Pin an event in Venue A.
2. Switch to Venue B via `VenueSwitcher`.

**Expected**: Overview shows Venue B dashboard data; Venue A pins not shown.

3. Switch back to Venue A.

**Expected**: Venue A pins restored from server.

## Scenario F — Event card summaries (User Story 3, P2)

1. Seed an event with `hasVarianceConcern: true` in dashboard response.

**Expected**: Variance badge on card without loading ledger line items.

2. Seed `unmappedCount > 0`.

**Expected**: Unmapped bottleneck chip visible.

## Scenario G — All-venues mode (026 regression)

1. Select "All venues" in switcher (if available).

**Expected**: Overview loads merged partitions from parallel dashboard requests; pin toggle uses each card's `venueId`.

## Scenario H — Permission denial

1. Sign in as user without `can_view_financials`.

**Expected**: Dashboard load denied; no partial financial overview.

## Regression checks

```bash
cd apps/web
npm run test
cd ../api.tests
dotnet test
```

**Expected**: No regressions in 031 dashboard integration tests or 030 pin tests.

## Links

- API contract: [031/contracts/dashboard-api.md](../031-dashboard-aggregate-api/contracts/dashboard-api.md)
- Pin API: [030/contracts/event-pin-api.md](../030-event-pin-endpoints/contracts/event-pin-api.md)
- Phase 1 UI baseline: [026/contracts/dashboard-overview-ui.md](../026-dashboard-overview-page/contracts/dashboard-overview-ui.md)
