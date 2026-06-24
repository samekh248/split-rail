# Phase 1 Data Model: Upcoming Events Calendar (Client)

**Feature**: `038-mini-calendar-events`  
**Date**: 2026-06-19

No database or API schema changes. All shapes import from `@/types/generated-api` (Constitution VI). The data model covers **client-side view state**, **calendar grid cells**, and **pure-function transforms** over existing `EventCardDto[]`.

## Entity: EventCardDto (existing)

Source: `DashboardResponse.upcomingEvents` via `useDashboard` / merged all-venues dashboard.

| Field | Use in calendar |
|-------|-----------------|
| `eventId` | Navigation target; React key |
| `venueId` | `navigateToEventWorkspace(venueId, eventId)` |
| `title` | Truncated label in date cell; fallback `"Untitled event"` |
| `eventDate` | ISO date or date-time → local calendar day for cell placement |

**Validation**: Events without parseable `eventDate` are omitted from calendar cells but remain in list view (parity with card date display handling).

## Entity: UpcomingViewMode

Session-persisted presentation mode for the Upcoming Events zone.

| Value | Meaning | Default |
|-------|---------|---------|
| `list` | Existing `DashboardZoneEvents` card list | Yes (no storage / new session) |
| `calendar` | `UpcomingEventsMiniCalendar` grid | No |

**Storage**: `sessionStorage['split-rail:upcoming-events-view']`  
**Rules**:
- Invalid or missing → `list`
- Writes on user toggle only
- Independent of venue scope (view mode persists across venue switch; event data refreshes)

## Entity: UpcomingWindowBounds

Local-calendar inclusive range for qualifying upcoming events (mirrors server 031 partition).

| Field | Rule |
|-------|------|
| `start` | Tomorrow (local calendar date) |
| `end` | Today + 30 calendar days (inclusive) |

**Excluded**: Today and dates after `end`.  
**Computed by**: `getUpcomingWindowBounds(now?: Date)`

## Entity: CalendarDayCell

One day in the mini-calendar grid.

| Field | Type | Description |
|-------|------|-------------|
| `date` | `Date` | Local midnight for the cell |
| `dateKey` | `string` | `YYYY-MM-DD` lookup key |
| `inWindow` | `boolean` | Within upcoming window bounds |
| `isAdjacentMonth` | `boolean` | Day belongs to month before/after anchor month |
| `events` | `EventCardDto[]` | Events on this date (0..n) |

**Display rules**:
- `inWindow === false` → muted styling; no event chips (events should not exist outside window from server, but guard anyway)
- `events.length === 0` → day number only
- `events.length === 1..3` → truncated title buttons
- `events.length > 3` → three titles + `+N more` expand affordance

## Entity: CalendarWeekRow

| Field | Type | Description |
|-------|------|-------------|
| `days` | `CalendarDayCell[]` | Length 7 (Sun–Sat) |

**Collection**: `CalendarWeekRow[]` from `buildMiniCalendarWeeks(anchorDate, now?)`

## Entity: ExpandedDateOverlay

Transient UI state when user activates `+N more` on a date.

| Field | Type | Description |
|-------|------|-------------|
| `dateKey` | `string` | Active expansion |
| `events` | `EventCardDto[]` | Remaining events not shown in cell (index 3+) |

**Lifecycle**: Open on `+N more` click; close on outside click, Escape, or second toggle.

## Relationships

```text
DashboardResponse.upcomingEvents: EventCardDto[]
        │
        ├─► list view → DashboardZoneEvents (unchanged card list)
        │
        └─► calendar view
              ├─► groupEventsByLocalDate() → Map<dateKey, EventCardDto[]>
              └─► buildMiniCalendarWeeks() → CalendarWeekRow[]
                        └─► CalendarDayCell.events

UpcomingViewMode ←sessionStorage→ UpcomingEventsViewToggle
```

## State transitions

| Event | UpcomingViewMode | Notes |
|-------|------------------|-------|
| First visit / new session | `list` | No storage key |
| User selects calendar | `calendar` | Persist to sessionStorage |
| User selects list | `list` | Persist |
| Venue switch | unchanged mode | Events prop updates |
| sessionStorage cleared | `list` | On next read |

## Test fixtures

Reuse `tests/fixtures/events.ts` patterns with `offsetDate(localToday, n)` for window placement:

| Fixture intent | Date offset | Expected zone |
|----------------|-------------|---------------|
| In window | +1 to +30 | Calendar cell |
| Today | 0 | Not in upcoming list/calendar |
| Outside window | +31 | Not in upcomingEvents from server |

Multi-event same date: two+ fixtures sharing same `eventDate` key.
