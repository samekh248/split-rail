# Contract: Financial Health Widget & Bottleneck Filter (Frontend)

**Feature**: `036-financial-health-bottleneck-filter`  
**Extends**: [034-dashboard-action-health-api/contracts/dashboard-api.md](../../034-dashboard-action-health-api/contracts/dashboard-api.md), [032-overview-dashboard-wire/contracts/dashboard-hooks-ui.md](../../032-overview-dashboard-wire/contracts/dashboard-hooks-ui.md), [025-event-card/contracts/event-card-ui.md](../../025-event-card/contracts/event-card-ui.md)  
**Date**: 2026-06-19

Types from `generated-api.ts` only (Constitution VI). Consumes existing dashboard response — no new REST routes.

---

## Module: `apps/web/src/lib/eventCardSummary.ts` (extended) or `bottleneckFilter.ts` (new)

### `eventHasBottleneckAlerts(event: EventCardDto): boolean`

Returns true when merged summary + fallback bottleneck alerts are non-empty (same logic as `EventCard` chip rendering).

### `filterRecentEventsByBottleneck(events: EventCardDto[], filterActive: boolean): EventCardDto[]`

Pure function; unit-tested.

---

## Component: `FinancialHealthWidget`

**Path**: `apps/web/src/components/dashboard/FinancialHealthWidget.tsx`

### Props

| Prop | Type | Description |
|------|------|-------------|
| `financialHealth` | `FinancialHealthDto \| undefined` | From `useDashboard().data.financialHealth` |
| `isLoading` | `boolean` | Suppress widget during dashboard load |

### Visibility

| Condition | Render |
|-----------|--------|
| `isLoading === true` | `null` |
| `financialHealth == null` | `null` |
| Parent `isAllVenuesView === true` | `null` (parent responsibility) |
| Otherwise | Widget section |

### Markup contract

| Element | Attributes | Content |
|---------|------------|---------|
| Root | `data-testid="financial-health-widget"`, `className="financial-health-widget"` | — |
| Week range | `data-testid="financial-health-week-range"` | Formatted `weekStart` – `weekEnd` |
| Projected | `data-testid="financial-health-projected"` | Label + `formatMoney(projectedNetGross)` |
| Actual | `data-testid="financial-health-actual"` | Label + `formatMoney(actualQboDeposits)` |
| Variance | `data-testid="financial-health-variance"` | Label + `formatMoney(variance)` |

### Labels (display copy)

| Field | Label |
|-------|-------|
| Section heading | `Financial health` |
| Projected | `Projected net gross` |
| Actual | `Actual QBO deposits` |
| Variance | `Variance` |

### Icons (Constitution IX)

| Control | Icon |
|---------|------|
| Section heading | `faChartLine` |

---

## Component: `BottleneckFilter`

**Path**: `apps/web/src/components/dashboard/BottleneckFilter.tsx`

### Props

| Prop | Type | Description |
|------|------|-------------|
| `active` | `boolean` | Filter engaged |
| `onToggle` | `() => void` | Toggle handler |
| `alertedCount` | `number` | Count of recent events with alerts (optional `(n)` suffix) |

### Markup contract

| Element | Attributes | Content |
|---------|------------|---------|
| Toggle | `type="button"`, `data-testid="bottleneck-filter-toggle"`, `aria-pressed={active}` | `Needs attention` (+ optional count) |

### Icons (Constitution IX)

| State | Icon |
|-------|------|
| Inactive | `faFilter` |
| Active | `faFilter` with active class OR `faCircleExclamation` accent — implementation choice in CSS |

---

## Component: `RecentEventsSection` (modified)

**Path**: `apps/web/src/components/dashboard/DashboardZoneSections.tsx`

### Extended props (RecentEventsSection only)

| Prop | Type | Description |
|------|------|-------------|
| `filterSlot` | `ReactNode` | Renders in header row beside `"Recent events"` heading |
| `emptyMessage` | `string` | Overridable by parent for filtered empty state |

### Header layout

```text
[ Recent events heading ]     [ BottleneckFilter ]
```

Use flex row (`dashboard-zone__header`) consistent with BEM zone styles.

---

## Component: `DashboardOverviewPage` (modified)

### New wiring

| Concern | Source |
|---------|--------|
| `financialHealth` | `singleVenueDashboard.data?.financialHealth` when `!isAllVenuesSelected` |
| `bottleneckFilterActive` | Local `useState`; reset on `venueScopeKey` change |
| `displayedRecentEvents` | `filterRecentEventsByBottleneck(partitions.recentEvents, bottleneckFilterActive)` |

### Render order (when dashboard loaded, single venue)

```text
UnassignedTransactionsBanner (if count > 0)
FinancialHealthWidget
dashboard-overview__zones
  PinnedEventsSection
  TonightHeroBanner
  UpcomingEventsSection
  RecentEventsSection (filtered recent + BottleneckFilter in header)
```

### Zero-events branch

When `!hasAnyDashboardEvents(partitions)` but dashboard loaded successfully in single-venue mode, still render `FinancialHealthWidget` above the no-events empty state (FR-001).

---

## Component: `EventCard` (verify only)

**Variance badge** (`data-testid="event-card-variance-{eventId}"`):

| Condition | Visible |
|-----------|---------|
| `hasVarianceConcern === true` | Yes (any status including `SETTLED`) |
| `lineItems` prop + negative variance derivation | Yes (legacy path when lineItems supplied) |
| Otherwise | No |

No RECONCILED-only gate. Add/extend tests for `SETTLED` + `hasVarianceConcern`.

---

## Test IDs summary

| ID | Component |
|----|-----------|
| `financial-health-widget` | FinancialHealthWidget root |
| `financial-health-week-range` | Week label |
| `financial-health-projected` | Projected amount |
| `financial-health-actual` | Actual amount |
| `financial-health-variance` | Variance amount |
| `bottleneck-filter-toggle` | BottleneckFilter button |
| `dashboard-zone-recent` | Recent zone (existing) |

---

## Coverage matrix

| ID | Requirement | Verification target | Suite |
|----|-------------|---------------------|-------|
| C1 | FR-001/002 widget fields | FinancialHealthWidget.test.tsx | Week range + 3 money values from fixture |
| C2 | FR-003 formatMoney | same | Matches `formatMoney('1234.50')` output |
| C3 | FR-004 all-venues hidden | DashboardOverviewPage.test.tsx | No widget when all venues selected |
| C4 | FR-005/006 filter on | BottleneckFilter + overview tests | Only alerted recent events shown |
| C5 | FR-007 filter off | same | Full list restored |
| C6 | FR-008 filtered empty | same | "No events need attention" |
| C7 | FR-009 venue reset | overview test | Filter inactive after venue switch |
| C8 | FR-011 SETTLED variance | EventCard.test.tsx | Badge visible with `hasVarianceConcern` |
| C9 | FR-010 other zones | overview test | Pinned count unchanged when filter on |
| C10 | SC-007 coverage | CI | ≥80% on touched files |
