# Contract: Upcoming Events Mini-Calendar UI

**Feature**: `038-mini-calendar-events` | **Extends**: [026-dashboard-overview-ui.md](../../026-dashboard-overview-page/contracts/dashboard-overview-ui.md), [025-event-card-ui.md](../../025-event-card/contracts/event-card-ui.md)  
**Date**: 2026-06-19

Types from `generated-api.ts` only (Constitution VI). **No REST changes.**

## Component: `UpcomingEventsSection` (modified)

**Path**: `apps/web/src/components/dashboard/DashboardZoneSections.tsx`

### Responsibilities

- Own `UpcomingViewMode` state initialized from `readUpcomingViewMode()` (sessionStorage).
- Render `DashboardZoneEvents` when mode is `list` (current behavior).
- Render `UpcomingEventsMiniCalendar` when mode is `calendar`.
- Pass `filterSlot={<UpcomingEventsViewToggle ... />}` to zone header in both modes (when events exist OR toggle shown per loading rules).

### Props

Unchanged `ZoneProps` (`events`, `permissions`, `onQuickLink`, `onPinToggle`, `onCardActivate`).

Calendar mode uses `onCardActivate` only (no quick links / pin on calendar cells in v1).

## Component: `UpcomingEventsViewToggle`

**Path**: `apps/web/src/components/dashboard/UpcomingEventsViewToggle.tsx`

```text
<button data-testid="upcoming-view-list" aria-pressed={mode === 'list'}>
  <FontAwesomeIcon icon={faList} /> List
</button>
<button data-testid="upcoming-view-calendar" aria-pressed={mode === 'calendar'}>
  <FontAwesomeIcon icon={faCalendarDays} /> Calendar
</button>
```

**Behavior**:
- Segmented control in `.dashboard-zone__header` (class `upcoming-view-toggle`)
- `onChange(mode: 'list' | 'calendar')` → parent updates state + `writeUpcomingViewMode(mode)`

## Component: `UpcomingEventsMiniCalendar`

**Path**: `apps/web/src/components/dashboard/UpcomingEventsMiniCalendar.tsx`

### DOM structure

```text
<div class="upcoming-mini-calendar" data-testid="upcoming-mini-calendar">
  <div class="upcoming-mini-calendar__weekdays" aria-hidden>S M T W T F S</div>
  {weeks.map(week =>
    <div class="upcoming-mini-calendar__week" role="row">
      {week.days.map(day =>
        <div
          class="upcoming-mini-calendar__day"
          data-testid={`calendar-day-${day.dateKey}`}
          data-in-window={day.inWindow}
          data-adjacent-month={day.isAdjacentMonth}
          role="gridcell"
        >
          <span class="upcoming-mini-calendar__day-number">{dayOfMonth}</span>
          {day.events.slice(0,3).map(event =>
            <button
              type="button"
              class="upcoming-mini-calendar__event"
              data-testid={`calendar-event-${event.eventId}`}
              onClick={() => onEventActivate(event.venueId, event.eventId)}
            >
              {truncatedTitle(event.title)}
            </button>
          )}
          {day.events.length > 3 &&
            <button
              type="button"
              class="upcoming-mini-calendar__more"
              data-testid={`calendar-more-${day.dateKey}`}
            >
              +{day.events.length - 3} more
            </button>
          }
        </div>
      )}
    </div>
  )}
</div>
```

### Navigation contract

```typescript
onEventActivate: (venueId: string, eventId: string) => void;
// Wired to same handler as EventCard onActivate → navigateToEventWorkspace
```

### Empty state

When `events.length === 0`, parent `DashboardZoneEvents` empty message path applies; mini-calendar component is not mounted.

## Library: `upcomingEventsCalendar.ts`

**Path**: `apps/web/src/lib/upcomingEventsCalendar.ts`

| Export | Signature | Purpose |
|--------|-----------|---------|
| `getUpcomingWindowBounds` | `(now?: Date) => { start: Date; end: Date }` | Window for emphasis rules |
| `groupEventsByLocalDate` | `(events: EventCardDto[]) => Map<string, EventCardDto[]>` | Date key grouping |
| `buildMiniCalendarWeeks` | `(anchorMonth: Date, now?: Date) => CalendarWeekRow[]` | Month grid with adjacent days |
| `truncateEventTitle` | `(title: string \| null, maxLen?: number) => string` | Cell label helper |

## Library: `upcomingEventsViewStorage.ts`

**Path**: `apps/web/src/lib/upcomingEventsViewStorage.ts`

| Export | Behavior |
|--------|----------|
| `readUpcomingViewMode()` | `'list' \| 'calendar'`, default `'list'` |
| `writeUpcomingViewMode(mode)` | Persists to sessionStorage |

**Storage key**: `split-rail:upcoming-events-view`

## CSS hooks (`apps/web/src/index.css`)

| Class | Purpose |
|-------|---------|
| `.upcoming-view-toggle` | Segmented header control |
| `.upcoming-mini-calendar` | Grid container |
| `.upcoming-mini-calendar__day--muted` | Outside window or adjacent month |
| `.upcoming-mini-calendar__day--today` | Optional today marker (non-interactive; no events) |
| `.upcoming-mini-calendar__event` | Clickable truncated title |
| `.upcoming-mini-calendar__more` | +N more expand trigger |
| `.upcoming-mini-calendar__popover` | Expanded remaining events list |

Reuse existing `--dashboard-*` / zone spacing tokens where present; no new CSS framework.

## Page wiring (unchanged props)

`DashboardOverviewPage` continues:

```typescript
<UpcomingEventsSection events={partitions.upcomingEvents} {...zoneProps} />
```

No new page-level state required.

## Test IDs (RTL)

| testid | Assertion |
|--------|-----------|
| `dashboard-zone-upcoming` | Section wrapper (existing) |
| `upcoming-view-list` | List mode toggle |
| `upcoming-view-calendar` | Calendar mode toggle |
| `upcoming-mini-calendar` | Grid visible in calendar mode |
| `calendar-day-YYYY-MM-DD` | Cell for date |
| `calendar-event-{eventId}` | Activatable event chip |
| `calendar-more-YYYY-MM-DD` | +N more control |

## Accessibility

- Toggle buttons: `aria-pressed` per active mode
- Calendar: `role="grid"` on container, `role="row"` / `role="gridcell"` on weeks/days
- Event chips: `<button type="button">` with discernible truncated title text
- `+N more` popover: focus trap optional; Escape closes
