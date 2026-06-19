# Data Model: Dashboard Action Center and Financial Health Aggregates

**Feature**: 034-dashboard-action-health-api  
**Date**: 2026-06-18

## Response DTO extensions (modify existing)

All types in `apps/api/DTOs/Dashboard/DashboardDtos.cs`. C# source of truth → OpenAPI → `generated-api.ts`.

### `DashboardResponse` (extended)

| Field | Type | Change |
|-------|------|--------|
| `VenueId` | `Guid` | unchanged |
| `TonightEvents` | `IReadOnlyList<EventCardDto>` | unchanged |
| `PinnedEvents` | `IReadOnlyList<EventCardDto>` | unchanged |
| `RecentEvents` | `IReadOnlyList<EventCardDto>` | unchanged |
| `UpcomingEvents` | `IReadOnlyList<EventCardDto>` | unchanged |
| `ActionCenter` | `ActionCenterDto` | **NEW** — always present |
| `FinancialHealth` | `FinancialHealthDto` | **NEW** — always present |

### `ActionCenterDto` (new)

| Field | Type | Derivation |
|-------|------|------------|
| `TotalUnmappedCount` | `int` | Sum of `UnmappedCount` across all venue events in dashboard load |
| `EventsWithUnmapped` | `IReadOnlyList<UnmappedEventSummaryDto>` | Events with `UnmappedCount > 0`; sorted count desc, date asc |

### `UnmappedEventSummaryDto` (new)

| Field | Type | Source |
|-------|------|--------|
| `EventId` | `Guid` | `Event.Id` |
| `VenueId` | `Guid` | `Event.VenueId` |
| `Title` | `string` | `Event.Title` |
| `EventDate` | `string` | `Event.EventDate` as `yyyy-MM-dd` |
| `UnmappedCount` | `int` | `Event.UnmappedQboTransactions.Count` |

### `FinancialHealthDto` (new)

| Field | Type | Derivation |
|-------|------|------------|
| `WeekStart` | `string` | Monday of current calendar week (ISO `yyyy-MM-dd`, UTC reference) |
| `WeekEnd` | `string` | Sunday of same week (ISO `yyyy-MM-dd`) |
| `ProjectedNetGross` | `decimal` → JSON string | Sum of per-event projected net show revenue for in-week events |
| `ActualQboDeposits` | `decimal` → JSON string | Sum of revenue-block `QboActualValue` for in-week events |
| `Variance` | `decimal` → JSON string | `ProjectedNetGross - ActualQboDeposits` |

Money fields use `[JsonConverter(typeof(DecimalStringJsonConverter))]`.

## Per-event financial health derivations

### Projected net show revenue (in-week events only)

| Event status | Value column |
|--------------|--------------|
| `SETTLED`, `RECONCILED` | `SettlementValue` on line items |
| `PRE_SHOW` (including budget-locked) | `ProformaValue` on line items |

```
grossRevenue = Σ activeColumn where BlockType == REVENUE
totalDeductions = Σ activeColumn where IsArtistDeduction == true
projectedNetShowRevenue = grossRevenue - totalDeductions
```

### Actual QBO deposits (in-week events only)

```
actualQboDeposits = Σ QboActualValue where BlockType == REVENUE
```

Expense-block and deal-math QBO actuals **excluded**.

## Calendar week filter

Reference date: `today = DateOnly.FromDateTime(DateTime.UtcNow)` (UTC until venue timezone exists).

| Rule | Definition |
|------|------------|
| Week start | Monday on or before `today` |
| Week end | `weekStart + 6 days` (Sunday) |
| In-week event | `event.EventDate >= weekStart && event.EventDate <= weekEnd` |

## Existing entities consumed (unchanged)

| Entity | Role |
|--------|------|
| `Event` | Partition dates, status, line items |
| `FinancialLineItem` | Proforma/settlement/QBO actual values, block type, artist deduction flag |
| `UnmappedQboTransaction` | Per-event unmapped count (action center) |

No new tables or migrations.

## Service: `DashboardService` (extended)

| Step | Action |
|------|--------|
| 1–4 | Existing: load events, map cards, partition (spec 031) |
| 5 | Build `ActionCenterDto` from loaded events/cards |
| 6 | Build `FinancialHealthDto` via `DashboardFinancialHealthHelper` |
| 7 | Return extended `DashboardResponse` |

**Query constraints** (unchanged Constitution VII): `.AsNoTracking()`, explicit `.Include()` for line items and unmapped transactions.

## Validation rules

| Rule | Enforcement |
|------|-------------|
| `can_view_financials` | Existing `[RequirePermission]` on dashboard GET |
| Org + venue scope | Existing `VenueService.IsVenueAccessibleAsync` |
| Action center total consistency | `TotalUnmappedCount == Σ EventCardDto.UnmappedCount` |
| Zero-state blocks | Both DTOs always present; zeros and empty list when no data |

## State transitions

Read-only feature — no entity mutations.
