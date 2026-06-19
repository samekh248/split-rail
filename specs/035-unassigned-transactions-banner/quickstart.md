# Quickstart & Validation: Unassigned Transactions Banner

**Feature**: `035-unassigned-transactions-banner` | **Date**: 2026-06-19

Manual and automated validation for the dashboard unassigned-transactions banner and inline mapping drawer. See [contracts/unassigned-transactions-banner-ui.md](./contracts/unassigned-transactions-banner-ui.md) and [data-model.md](./data-model.md).

## Prerequisites

- Node 20+, .NET 8 SDK
- **034 merged**: `actionCenter` on `DashboardResponse` in `generated-api.ts`
- **032 merged**: `useDashboard` / overview wiring
- **003 merged**: QBO unmapped list + inline mapping endpoints

```bash
cd apps/api && dotnet build
cd apps/web && npm install
```

## Automated gate (Constitution III)

```bash
cd apps/web
npm run test -- tests/api/dashboard.test.ts
npm run test -- tests/components/dashboard/UnassignedTransactionsBanner.test.tsx
npm run test -- tests/pages/DashboardOverviewPage.test.tsx
```

**Expected**: All tests pass; ≥80% line/branch coverage on touched files.

## Scenario A — Banner visibility (User Story 1, FR-001/002)

1. Seed a venue with unmapped QBO transactions on at least one event (integration fixtures or manual sync with unmapped account).
2. Sign in and open dashboard overview (`/`) with that venue active.

**Expected**: Banner visible with correct total count (e.g., "4 unassigned transactions detected").

3. Map all unassigned transactions (via drawer or event workspace).

**Expected**: Banner absent on next dashboard load / after invalidation.

## Scenario B — Drawer event list (User Story 2)

1. With multiple events having unmapped transactions, click the banner.

**Expected**: Inline drawer opens without page navigation; lists events with title, date, per-event count; highest count first.

2. Dismiss drawer (close button or Escape).

**Expected**: Overview visible; drawer closed.

## Scenario C — Accordion mapping (User Story 3)

1. Open drawer; expand an event row.

**Expected**: Transaction list shows account name, amount, date.

2. Select a ledger row and confirm mapping.

**Expected**: Transaction removed from list; banner and row counts decrease without manual page reload.

## Scenario D — Zero-state success (Clarification 2026-06-19)

1. Open drawer with one remaining unmapped transaction.
2. Map the final transaction.

**Expected**: Banner hides immediately; drawer remains open with success message; operator dismisses manually.

## Scenario E — Workspace deep link (User Story 4)

1. Open drawer; click workspace link on an event row.

**Expected**: Navigates to event workspace with sync focus active (`?focus=sync`).

## Scenario F — All-venues view (Clarification 2026-06-19)

1. Select "All venues" in venue switcher with unmapped transactions at multiple venues.

**Expected**: Banner shows combined total; drawer rows include venue name prefix.

## Scenario G — Loading guard (User Story 1 scenario 4)

1. Throttle network; reload overview.

**Expected**: Banner does not appear with stale/zero count before dashboard data loads.

## Coverage report

```bash
cd apps/web
npm run test:coverage -- tests/components/dashboard/UnassignedTransactionsBanner.test.tsx
```

**Expected**: ≥80% line/branch on new/modified component files.
