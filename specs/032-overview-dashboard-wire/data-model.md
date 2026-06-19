# Data Model: Server-Backed Dashboard Overview (Frontend View)

**Feature**: `032-overview-dashboard-wire` | **Date**: 2026-06-18

Frontend consumption model for dashboard overview wiring. Authoritative API shapes defined in [031-dashboard-aggregate-api/contracts/dashboard-api.md](../031-dashboard-aggregate-api/contracts/dashboard-api.md) and [030-event-pin-endpoints/contracts/event-pin-api.md](../030-event-pin-endpoints/contracts/event-pin-api.md). Types imported from `apps/web/src/types/generated-api.ts` only.

## Consumed API entities

### DashboardResponse

Venue-scoped aggregate returned by `GET /api/venues/{venueId}/dashboard`.

| Field | Type | UI use |
|-------|------|--------|
| `venueId` | uuid | Validate active venue match; query key |
| `tonightEvents` | `EventCardDto[]` | `TonightHeroBanner` (hidden when empty) |
| `pinnedEvents` | `EventCardDto[]` | `PinnedEventsSection` |
| `recentEvents` | `EventCardDto[]` | `RecentEventsSection` |
| `upcomingEvents` | `EventCardDto[]` | `UpcomingEventsSection` |

**Invariant**: All four arrays always present (may be empty).

### EventCardDto

Per-event summary rendered inside zone sections.

| Field | Type | UI use |
|-------|------|--------|
| `eventId` | uuid | Keys, navigation, pin target |
| `venueId` | uuid | Workspace navigation (required in all-venues mode) |
| `title` | string | Card heading |
| `eventDate` | ISO date string | Formatted date display |
| `status` | string | Lifecycle fallback, bottleneck rules |
| `isBudgetLocked` | bool | Lifecycle fallback, bottleneck rules |
| `qboTagName` | string | Display (optional) |
| `settledAt` | datetime \| null | Bottleneck / lifecycle fallback |
| `settlementPdfAvailable` | bool | Bottleneck fallback |
| `isPinned` | bool | Pin control state (server truth) |
| `hasVarianceConcern` | bool | Variance badge (server truth) |
| `unmappedCount` | int | Bottleneck chip when > 0 |
| `lastSyncedAt` | datetime \| null | Bottleneck chip (settled-not-synced) |

**Not on DTO (client fallback)**: `lifecyclePhase`, `bottleneckAlerts[]`, `lineItems[]`.

## Client-side view models

### MergedDashboardView (all-venues mode only)

Ephemeral merge of multiple `DashboardResponse` objects — not persisted.

```text
MergedDashboardView {
  tonightEvents: EventCardDto[]   // concat all venues, dedupe by eventId
  pinnedEvents: EventCardDto[]
  recentEvents: EventCardDto[]
  upcomingEvents: EventCardDto[]
}
```

**Dedupe rule**: Within each partition, first occurrence by `eventId` wins (stable order: venue list order, then server sort within venue).

### DashboardQueryState

TanStack Query state bound to `useDashboard(venueId)`.

| State | UI behavior |
|-------|-------------|
| `isLoading` | Show "Loading workspace…" |
| `isError` | Error empty state + retry → `refetch()` |
| `data` | Render zones from partitions |
| `isFetching` | Optional subtle refresh indicator (not required v1) |

### PinMutationState

Optimistic overlay on cached `DashboardResponse` during pin/unpin.

**Optimistic transitions**:

1. Toggle `EventCardDto.isPinned` on matching card in **all partitions** where event appears.
2. If pinning: ensure event exists in `pinnedEvents` (append if missing).
3. If unpinning: remove from `pinnedEvents` only (retain in date-based partitions if server rules allow).

**Rollback**: Restore snapshot from `onMutate` context on mutation error.

**Reconcile**: `invalidateQueries(['dashboard', venueId])` on settled.

## Query keys

| Key | Scope |
|-----|-------|
| `['dashboard', venueId]` | Single-venue dashboard cache |
| Pin mutations | Invalidate dashboard key for mutation `venueId` |

## Validation rules (UI)

| Rule | Source |
|------|--------|
| Dashboard fetch enabled only when `venueId` is non-null (single-venue) or `venueIds.length > 0` (all-venues) | `useActiveVenue` |
| Pin toggle requires resolved `venueId` + `eventId` | Page handler |
| Pin control shown when user has financial view permission (same as 025) | `PermissionsDto` |
| Tonight hero not rendered when `tonightEvents.length === 0` | FR-003 |
| No-events empty state when all four arrays empty | FR + 031 empty venue behavior |

## Relationships

```text
ActiveVenue ──► useDashboard(venueId) ──► DashboardResponse
                    │
                    ├──► Zone sections ──► EventCard (per EventCardDto)
                    │
                    └──► usePinEvent / useUnpinEvent ──► invalidates dashboard cache
```

## Out of scope entities

- ActionCenter, FinancialHealth, UnassignedTransactions (SPLR-74/75/76)
- Raw `EventResponse[]` list on overview page
- `pinnedEventStorage` / localStorage pin keys
