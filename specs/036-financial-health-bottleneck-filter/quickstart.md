# Quickstart & Validation: Financial Health Widget and Bottleneck Filter

**Feature**: `036-financial-health-bottleneck-filter` | **Date**: 2026-06-19

Manual and automated validation for the financial health widget and recent-events bottleneck filter. See [contracts/financial-health-bottleneck-ui.md](./contracts/financial-health-bottleneck-ui.md) and [data-model.md](./data-model.md).

## Prerequisites

- Node 20+, .NET 8 SDK (API running for manual checks)
- **034 merged**: `financialHealth` on `DashboardResponse` in `generated-api.ts`
- **032 merged**: `useDashboard` / overview zone wiring
- **035 merged** (optional): unassigned-transactions banner above widget

```bash
cd apps/api && dotnet build
cd apps/web && npm install
```

## Automated gate (Constitution III)

```bash
cd apps/web
npm run test -- tests/components/dashboard/FinancialHealthWidget.test.tsx
npm run test -- tests/components/dashboard/BottleneckFilter.test.tsx
npm run test -- tests/lib/eventCardSummary.test.ts
npm run test -- tests/components/dashboard/EventCard.test.tsx
npm run test -- tests/pages/DashboardOverviewPage.test.tsx
```

**Expected**: All tests pass; ≥80% line/branch coverage on touched files.

## Scenario A — Financial health widget (User Story 1, FR-001/002/003)

1. Sign in; select a venue with events scheduled in the current calendar week and known ledger/QBO data.
2. Open dashboard overview (`/`).

**Expected**: Financial health widget visible with week date range and three formatted money values (projected, actual, variance) matching server dashboard response.

3. Switch to all-venues view.

**Expected**: Widget hidden (FR-004).

4. Switch back to single venue with zero in-week monetary activity.

**Expected**: Widget still shows week range with `$0.00` values (User Story 1 scenario 3).

## Scenario B — Bottleneck filter on (User Story 2, FR-005/006)

1. Ensure recent events include at least one event with bottleneck alerts (unmapped accounts, not synced, or variance concern) and one without.
2. Click **Needs attention** filter on Recent Events section.

**Expected**: Recent list shows only events with alert chips; other zones unchanged.

## Scenario C — Bottleneck filter off (FR-007)

1. With filter active, click toggle again.

**Expected**: Full recent event list restored in original order.

## Scenario D — Filtered empty state (FR-008)

1. Use a venue where recent events exist but none have bottleneck alerts.
2. Activate filter.

**Expected**: Section heading remains; message reads **No events need attention**.

## Scenario E — Venue context reset (FR-009)

1. Activate filter on Venue A.
2. Switch to Venue B (or all-venues, then back).

**Expected**: Filter inactive; recent list unfiltered for new context.

## Scenario F — SETTLED variance badge (User Story 3, FR-011)

1. Seed or locate a **SETTLED** event with negative ledger variance (`hasVarianceConcern: true` on dashboard card).

**Expected**: Red **Variance** badge on event card in recent (or other) zone.

2. SETTLED event without variance concern.

**Expected**: No variance badge.

## Scenario G — Loading guard (User Story 1 scenario 5)

1. Throttle network; reload overview.

**Expected**: Financial health widget not shown with stale data during dashboard loading.

## Scenario H — Zero-event venue (FR-001)

1. Select a venue with no events but valid dashboard response including `financialHealth`.

**Expected**: Widget visible above "No events yet" empty state.

## Regression checks

- Unassigned transactions banner (035) still renders above financial health widget when unmapped count > 0.
- Pin toggle, zone ordering (pinned → tonight → upcoming → recent), and quick links unchanged.
- No new network requests beyond existing dashboard fetch.

## Troubleshooting

| Symptom | Check |
|---------|-------|
| Widget never appears | Confirm 034 deployed; `financialHealth` in network tab dashboard JSON; not in all-venues view |
| Filter shows all events | Verify `eventHasBottleneckAlerts` matches EventCard chips for same fixture |
| Variance badge missing on SETTLED | Confirm `hasVarianceConcern: true` on `EventCardDto` in dashboard response |
| Money formatting wrong | Ensure values passed as strings to `formatMoney`, not parsed floats |
