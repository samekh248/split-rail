# Data Model: Dashboard Aggregate API

**Feature**: 031-dashboard-aggregate-api  
**Date**: 2026-06-18

## Response DTOs (new)

### `EventCardDto`

Per-event dashboard summary for card rendering. C# source of truth → OpenAPI → `generated-api.ts`.

| Field | Type | Source / derivation |
|-------|------|---------------------|
| `EventId` | `Guid` | `Event.Id` |
| `VenueId` | `Guid` | `Event.VenueId` |
| `Title` | `string` | `Event.Title` |
| `EventDate` | `string` | `Event.EventDate` as ISO date (`yyyy-MM-dd`) |
| `Status` | `string` | `Event.Status` enum name |
| `IsBudgetLocked` | `bool` | `Event.IsBudgetLocked` |
| `QboTagName` | `string` | `Event.QboTagName` |
| `SettledAt` | `DateTimeOffset?` | `Event.SettledAt` |
| `SettlementPdfAvailable` | `bool` | `!string.IsNullOrEmpty(Event.SettlementPdfUrl)` |
| `IsPinned` | `bool` | `UserEventPin` exists for `(requestingUserId, EventId)` |
| `HasVarianceConcern` | `bool` | Any `FinancialLineItem` where `Math.Abs(QboActualValue - SettlementValue) > 0` |
| `UnmappedCount` | `int` | Count of `UnmappedQboTransactions` for event |
| `LastSyncedAt` | `DateTimeOffset?` | Max `QboSyncLedger.SyncedAt` for event; null if none |

**Out of scope (SPLR-74)**: ActionCenter blocks, FinancialHealth aggregates, bottleneck alert chips.

### `DashboardResponse`

| Field | Type | Notes |
|-------|------|-------|
| `VenueId` | `Guid` | Echo route param |
| `TonightEvents` | `IReadOnlyList<EventCardDto>` | Events with `EventDate == todayUtc` |
| `PinnedEvents` | `IReadOnlyList<EventCardDto>` | Events pinned by requesting user |
| `RecentEvents` | `IReadOnlyList<EventCardDto>` | `EventDate` in [today-7d, today-1d]; sorted desc |
| `UpcomingEvents` | `IReadOnlyList<EventCardDto>` | `EventDate` in [today+1d, today+30d]; sorted asc |

All four collections are always present (empty array when no matches).

## Existing entities consumed (unchanged)

| Entity | Role in dashboard |
|--------|-------------------|
| `Event` | Core event fields, partition by `EventDate` |
| `FinancialLineItem` | Variance derivation via settlement vs QBO actual |
| `UnmappedQboTransaction` | Per-event unmapped count |
| `QboSyncLedger` | Latest sync timestamp per event |
| `UserEventPin` | Pin flag and pinned partition (spec 029) |
| `Venue` | Access validation via `VenueService` |

**Tenant path**: `Event → Venue → Organization`; pins via `UserEventPin → Event`.

## Partition rules (server)

Reference date: `today = DateOnly.FromDateTime(DateTime.UtcNow)`.

| Partition | Inclusion rule |
|-----------|------------------|
| Tonight | `event.EventDate == today` |
| Pinned | `UserEventPin` row for authenticated user |
| Recent | `event.EventDate >= today.AddDays(-7) && event.EventDate < today` |
| Upcoming | `event.EventDate > today && event.EventDate <= today.AddDays(30)` |

**Overlap**: An event may appear in multiple partitions (e.g., pinned + upcoming). Events outside all date windows and not pinned are omitted from all partitions.

## Service: `DashboardService`

| Method | Input | Output | Side effects |
|--------|-------|--------|--------------|
| `GetDashboardAsync(venueId, ct)` | Venue route param | `DashboardResponse` | Read-only |

**Dependencies**: `ApplicationDbContext`, `ITenantContext`, `VenueService`

**Query constraints** (Constitution VII):
- `.AsNoTracking()` on all reads
- `.Include(e => e.LineItems)`
- `.Include(e => e.UnmappedQboTransactions)`
- `.Include(e => e.QboSyncLedgerEntries)`
- Filtered pin include or post-query join for current user's pins only

## Validation rules (API layer)

| Rule | Source | Enforcement |
|------|--------|-------------|
| Authenticated user | FR-007 | JWT middleware; 401 |
| `can_view_financials` | FR-007 | `[RequirePermission]`; 403 |
| Venue accessible | FR-008 | `VenueService.IsVenueAccessibleAsync`; 404 |
| Org isolation | FR-008 | EF global filters on `Events`, `UserEventPin` |
| No cross-tenant leak | SC-003 | 404 for foreign venue ids |

## State transitions

Read-only feature — no entity mutations. Pin state changes via spec 030 endpoints; dashboard reflects current DB state on each GET.
