# Data Model: Dashboard Overview Page with Priority Zones

**Feature**: `026-dashboard-overview-page` | **Date**: 2026-06-18

No database schema or API changes. Describes page state, zone partition view model, component contracts, and validation rules.

## API entities (existing, read-only)

### `EventResponse`

Consumed via `useEvents(activeVenueId)`. Fields used:

| Field | Overview use |
|-------|----------------|
| `eventId`, `venueId` | Card identity; navigation targets |
| `title`, `eventDate` | Card display; zone date partitioning |
| `status`, `isBudgetLocked`, `settledAt`, `settlementPdfAvailable`, `qboTagName` | EventCard lifecycle, bottlenecks, quick links |

Types from `generated-api.ts` only (Constitution VI).

### `PermissionsDto`

From `useUserProfile().data?.role?.permissions` — passed to each `EventCard` for quick-link gating.

## Client type: `OverviewZonePartition`

```typescript
interface OverviewZonePartition {
  tonight: EventResponse[];   // today-dated only; empty → hero hidden
  pinned: EventResponse[];  // pinned for venue; may overlap date zones
  upcoming: EventResponse[]; // tomorrow..+30d asc; excludes today
  recent: EventResponse[];  // yesterday..-7d desc; excludes today
}
```

Produced by `partitionOverviewZones(events, venueId, now?)`.

## Partition rules (validation)

| Rule | Enforcement |
|------|-------------|
| Today exclusivity | Events with `eventDate === localToday` appear in `tonight` only (not `recent`/`upcoming`) |
| Recent window | `eventDate` in [today−7d, today−1d] inclusive, calendar days |
| Upcoming window | `eventDate` in [today+1d, today+30d] inclusive |
| Pinned | `isEventPinned(venueId, eventId)` → included in `pinned` |
| Pinned overlap | Pinned events also appear in `recent`/`upcoming` when dates match |
| Invalid/missing date | Excluded from date zones; included in `pinned` if pinned |
| Sort `recent` | `eventDate` descending |
| Sort `upcoming` | `eventDate` ascending |
| Sort `tonight` | Phase priority then `eventDate` ascending |
| Sort `pinned` | Pin order undefined v1; stable sort by `eventDate` desc acceptable |

## Client type: `DashboardZoneSectionProps`

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `title` | string | yes | Visible section heading |
| `emptyMessage` | string | yes | Shown when `events.length === 0` |
| `events` | `EventResponse[]` | yes | Cards to render |
| `permissions` | `PermissionsDto` | yes | Forwarded to EventCard |
| `venueId` | string | yes | Navigation + pin key |
| `pinnedEventIds` | `Set<string>` | yes | Pin visual state |
| `onQuickLink` | callback | yes | `(venueId, eventId, focus?) => void` |
| `onPinToggle` | callback | yes | `(eventId) => void` |
| `onCardActivate` | callback | yes | `(eventId) => void` — main card navigation |

## Page state: `DashboardOverviewPage`

| State | Source | Notes |
|-------|--------|-------|
| `venues`, `activeVenueId` | `useActiveVenue()` | Venue switch repartitions |
| `events` | `useEvents(activeVenueId)` | Single fetch |
| `permissions` | `useUserProfile()` | Card gating |
| `pinnedRevision` | `useState(number)` | Bump on pin toggle to re-read storage |
| `partition` | `useMemo` | `partitionOverviewZones(events, activeVenueId, now)` |

No server mutations from overview page.

## Empty / error view models

| Condition | UI | Create event? |
|-----------|-----|---------------|
| Venues loading | `dashboard-empty` loading | No |
| Venues error | Error + retry | No |
| No venues | No-venue guidance + Add venue CTA (if permitted) | No |
| Events loading | Loading status | No |
| Events error | Error + retry | No |
| Zero events | No-events informational text | **No** (clarification) |
| Has events | Zone sections | No |

## Storage: pinned events

Reuses `pinnedEventStorage` (025):

| Key | Value | Storage |
|-----|-------|---------|
| `pinnedEvents` | `Record<"${venueId}:${eventId}", true>` | `localStorage` |

Overview reads on render; `toggleEventPinned` on card pin click.

## Navigation contracts

| Action | Target |
|--------|--------|
| Card body / Open workspace | `navigateToEventWorkspace(venueId, eventId)` |
| Quick link | `navigateToEventWorkspace(venueId, eventId, focus)` |
| Add venue (empty) | `navigateToCreateVenue()` |

## State transitions

```
/ (dashboard entry)
  → load venues → load events
  → partition zones
  → render overview (never auto-redirect to workspace when events exist)

venue switch
  → refetch events for new activeVenueId
  → re-partition
  → pin state scoped per venueId

pin toggle
  → toggleEventPinned
  → bump pinnedRevision
  → re-partition pinned zone
```
