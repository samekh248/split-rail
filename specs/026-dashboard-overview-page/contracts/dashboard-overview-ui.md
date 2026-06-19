# Contract: Dashboard Overview UI (Frontend)

**Feature**: `026-dashboard-overview-page` | **Extends**: [025-event-card/contracts/event-card-ui.md](../../025-event-card/contracts/event-card-ui.md), [023-split-dashboard-routes/contracts/event-workspace-routing.md](../../023-split-dashboard-routes/contracts/event-workspace-routing.md)  
**Date**: 2026-06-18

Types from `generated-api.ts` only (Constitution VI). No REST changes.

## Route

| Path | Component | Replaces |
|------|-----------|----------|
| `/` | `DashboardOverviewPage` | `DashboardHome` (auto-redirect removed) |

`App.tsx` renders `DashboardOverviewPage` when `appPath === '/'` and not a workspace route.

## Page: `DashboardOverviewPage`

**Path**: `apps/web/src/pages/DashboardOverviewPage.tsx`

### Workspace bar (FR-003)

Uses `useShellWorkspaceBar` with:

```text
<div class="dashboard-workspace-bar" data-testid="dashboard-workspace-bar">
  {canManageVenues && <button data-testid="header-add-venue">Add venue</button>}
  <VenueSwitcher />
</div>
```

No `EventCombobox` on overview.

### Main content structure

```text
<div class="dashboard-overview" data-testid="dashboard-overview">
  {loading | empty | error states — existing dashboard-empty patterns}

  {has events &&
    <PinnedEventsSection ... />
    {tonight.length > 0 && <TonightHeroBanner ... />}
    <UpcomingEventsSection ... />
    <RecentEventsSection ... />
  }
</div>
```

**Zone order** (top → bottom): Pinned → Tonight hero → Upcoming → Recent.

### Navigation wiring (FR-011, FR-012)

```typescript
const handleQuickLink = (venueId: string, eventId: string, focus?: WorkspaceFocus) => {
  navigateToEventWorkspace(venueId, eventId, focus);
};

const handleCardActivate = (eventId: string) => {
  if (activeVenueId) navigateToEventWorkspace(activeVenueId, eventId);
};
```

### Pin wiring

```typescript
const handlePinToggle = (eventId: string) => {
  if (!activeVenueId) return;
  toggleEventPinned(activeVenueId, eventId);
  setPinnedRevision((n) => n + 1);
};
```

Pass `isPinned={isEventPinned(venueId, eventId)}` and `onPinToggle` to every `EventCard`.

## Library: `partitionOverviewZones.ts`

**Path**: `apps/web/src/lib/partitionOverviewZones.ts`

```text
partitionOverviewZones(
  events: EventResponse[],
  venueId: string,
  now?: Date,
): OverviewZonePartition

filterTonightEvents(events, now?): EventResponse[]
partitionRecentEvents(events, now?): EventResponse[]
partitionUpcomingEvents(events, now?): EventResponse[]
getPinnedEvents(events, venueId): EventResponse[]
```

Date comparisons use local calendar `startOfDay` (same helpers as `eventLifecycle.ts` — share `parseEventDate` / `startOfDay` or import internally).

### Partition worked example (2026-06-18 = today)

| Event | eventDate | Pinned? | Zones |
|-------|-----------|---------|-------|
| A | 2026-06-18 | no | tonight |
| B | 2026-06-17 | yes | pinned, recent |
| C | 2026-06-25 | no | upcoming |
| D | 2026-06-01 | no | *(none)* |
| E | 2026-06-20 | yes | pinned, upcoming |

## Zone components

### `TonightHeroBanner`

| Prop | Notes |
|------|-------|
| `events` | All today-dated events |
| Renders | Only when `events.length > 0` |
| `data-testid` | `dashboard-zone-tonight` |

### `PinnedEventsSection` / `RecentEventsSection` / `UpcomingEventsSection`

| Behavior | Value |
|----------|-------|
| Always visible | yes (heading always shown) |
| Empty | Render `emptyMessage` text, no cards |
| `data-testid` | `dashboard-zone-pinned`, `dashboard-zone-upcoming`, `dashboard-zone-recent` |

### Shared empty messages (defaults)

| Zone | Empty message |
|------|---------------|
| Pinned | No pinned events |
| Upcoming | No upcoming events |
| Recent | No recent events |

## No-events empty state (FR-013)

```text
<section class="dashboard-empty" data-testid="dashboard-no-events">
  <h2>No events yet</h2>
  <p>Informational text — create events from the event management workspace.</p>
  <!-- NO create-event button -->
</section>
```

## EventCard usage

Each zone maps events to:

```typescript
<EventCard
  key={event.eventId}
  event={event}
  permissions={permissions}
  onQuickLink={handleQuickLink}
  isPinned={isEventPinned(venueId, event.eventId)}
  onPinToggle={() => handlePinToggle(event.eventId)}
/>
```

Optional: wrap card in clickable region for `handleCardActivate` on main body (or extend EventCard with `onActivate` in implementation tasks).

`lineItems` omitted — variance badge suppressed per 025.

## Test IDs (Vitest)

| testId | Assert |
|--------|--------|
| `dashboard-overview` | Page root when events exist |
| `dashboard-workspace-bar` | Venue switcher present |
| `dashboard-zone-pinned` | Pinned section |
| `dashboard-zone-tonight` | Present only when today events exist |
| `dashboard-zone-upcoming` | Upcoming section |
| `dashboard-zone-recent` | Recent section |
| `dashboard-no-events` | Zero events; no create CTA |
| `event-card-{eventId}` | From EventCard (025) |

## Permission matrix (overview empty states)

| Condition | CTA |
|-----------|-----|
| No venues + `canManageVenues` | Add venue button |
| No venues + read-only | Text only |
| No events | Text only — **no** create event |
| Events error | Retry |

## Out of scope (explicit)

- Create-event on overview (EventWorkspacePage only)
- Per-event ledger fetch for variance badges
- Server-side pin API
- `?focus=` scroll behavior (SPLR-67)
- Venue-timezone date interpretation
- Playwright E2E (deferred)
