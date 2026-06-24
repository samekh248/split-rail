# Data Model: Financial Health Widget and Bottleneck Filter

**Feature**: `036-financial-health-bottleneck-filter` | **Date**: 2026-06-19

Frontend-only feature. Documents consumed API shapes and client view state — no new persistence entities.

## Consumed API types (from `generated-api.ts`)

### `FinancialHealthDto`

| Field | Type | UI usage |
|-------|------|----------|
| `weekStart` | `string \| null` (ISO `yyyy-MM-dd`) | Widget week range label (start) |
| `weekEnd` | `string \| null` (ISO `yyyy-MM-dd`) | Widget week range label (end) |
| `projectedNetGross` | `string` | Widget "Projected" row via `formatMoney` |
| `actualQboDeposits` | `string` | Widget "Actual" row via `formatMoney` |
| `variance` | `string` | Widget "Variance" row via `formatMoney` (signed) |

**Visibility**: Render widget when `!isAllVenuesView && financialHealth != null && !dashboardLoading`.

**Zero values**: Block always present from server (034 FR-013); widget still renders with `$0.00` amounts.

### `EventCardDto` (recent partition — filter input)

Existing fields used for bottleneck derivation (unchanged):

| Field | Filter relevance |
|-------|------------------|
| `status` | Fallback bottleneck rules (signature, sync, variance review) |
| `unmappedCount` | UNMAPPED_QBO alert |
| `hasVarianceConcern` | VARIANCE_REVIEW alert + variance badge |
| `lastSyncedAt` | SETTLED_NOT_SYNCED alert (summary path) |
| `isBudgetLocked`, `settlementPdfAvailable` | MISSING_SIGNATURE fallback |
| `qboTagName` | SETTLED_NOT_SYNCED fallback |

## Client helpers

### `eventHasBottleneckAlerts(event: EventCardDto): boolean`

```typescript
mergeBottleneckAlerts(
  deriveBottleneckAlertsFromSummary(event),
  deriveBottleneckAlerts(event),
).length > 0
```

**Location**: `apps/web/src/lib/eventCardSummary.ts` (extend) or `apps/web/src/lib/bottleneckFilter.ts` (new).

### `filterRecentEventsByBottleneck(events: EventCardDto[], active: boolean): EventCardDto[]`

| `active` | Result |
|----------|--------|
| `false` | Original `events` reference/order preserved |
| `true` | `events.filter(eventHasBottleneckAlerts)` |

## View state

### `DashboardOverviewPage`

| State | Type | Initial | Transitions |
|-------|------|---------|-------------|
| `bottleneckFilterActive` | `boolean` | `false` | Toggled by `BottleneckFilter`; reset `false` on `venueScopeKey` change |

### `BottleneckFilter`

| Prop | Type | Description |
|------|------|-------------|
| `active` | `boolean` | Filter on/off |
| `onToggle` | `() => void` | Parent state update |
| `alertedCount` | `number` | Optional badge: count of recent events with alerts (UX enhancement) |

### Derived: filtered recent events

```typescript
const displayedRecent = bottleneckFilterActive
  ? recentEvents.filter(eventHasBottleneckAlerts)
  : recentEvents;
```

Passed to `RecentEventsSection` as `events` prop.

## Empty-state messages (Recent zone)

| Condition | Message |
|-----------|---------|
| `recentEvents.length === 0` | `"No recent events"` (unchanged) |
| Filter active && `displayedRecent.length === 0` && `recentEvents.length > 0` | `"No events need attention"` |
| Filter inactive && empty partition | `"No recent events"` |

## Validation rules

| Rule | Source |
|------|--------|
| Widget hidden in all-venues view | FR-004 |
| Widget hidden while dashboard loading | User Story 1 scenario 5 |
| Widget hidden when `financialHealth` absent | Edge case |
| Filter affects recent zone only | FR-010 |
| Filter resets on venue context change | FR-009 |
| Variance badge iff `hasVarianceConcern === true` | FR-011/FR-012 |
| Monetary display via `formatMoney` | FR-003, Constitution I |

## Cache keys

No new queries. Reads existing `['dashboard', venueId]` cache from `useDashboard`.
