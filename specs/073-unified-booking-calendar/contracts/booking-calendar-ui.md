# UI Contract: Booking Calendar Page

**Feature**: `073-unified-booking-calendar` | **Date**: 2026-06-25  
**Route**: `/booking`  
**See also**: [data-model.md](../data-model.md), [calendar-placements-api.md](./calendar-placements-api.md)

## Page regions

| Region | `data-testid` | Description |
|--------|---------------|-------------|
| Header controls | `booking-calendar-controls` | View mode, filters, month nav, create buttons, cancelled toggle, manage regions |
| Desktop matrix | `booking-calendar-matrix` | Visible ≥768px |
| Mobile stream | `booking-calendar-mobile` | Visible <768px |
| Daily agenda drawer | `booking-daily-agenda` | Date drill-down |
| Event control drawer | `booking-event-drawer` | Detail / edit / delete |
| Region panel | `booking-region-panel` | Modal or slide-over for region CRUD |

## Header controls

| Control | `data-testid` | Behavior |
|---------|---------------|----------|
| View mode | `booking-view-mode` | `global` \| `regional` \| `venue` |
| Region filter | `booking-region-filter` | Visible in regional mode |
| Venue filter | `booking-venue-filter` | Visible in venue mode |
| Month prev/next | `booking-month-prev`, `booking-month-next` | Updates `month` query param |
| Create Event | `booking-create-event` | Opens modal |
| Create Hold | `booking-create-hold` | Opens modal |
| Show cancelled | `booking-show-cancelled` | Toggles cancelled visibility |
| Manage regions | `booking-manage-regions` | Opens region panel |

**Session default**: Global view, current month (FR-008).

## Placement chip styling (CSS modifiers)

| Status | Class | Visual |
|--------|-------|--------|
| HOLD_1, HOLD_2 | `booking-placement--hold` | Dashed border, desaturated tint |
| CONFIRMED | `booking-placement--confirmed` | Solid brand fill |
| CANCELLED | `booking-placement--cancelled` | Struck-through, faded (only when toggle on) |

## Matrix cell behavior

| Interaction | Result |
|-------------|--------|
| Click placement chip | Open `booking-event-drawer` |
| Click date label / cell background | Open `booking-daily-agenda` |
| Hover empty cell quick-add | Open create modal with date (+ venue column) prefilled |
| >3 placements in cell | Show 3 chips + `booking-cell-more-{dateKey}` |

## Daily agenda row

| Field | Source |
|-------|--------|
| Venue badge | `venueName` |
| Time | `doorsTime` or "Time TBD" |
| Act | `title` |
| Status badge | `bookingPlacementStatus` label |

Sort: `doorsTime` asc (nulls last), then `venueName` asc.

## Event control drawer modes

| Mode | Entry | Actions |
|------|-------|---------|
| Detail | Chip/agenda click | View metadata; "Edit", "Promote" (holds), "Open workspace" (confirmed only) |
| Edit | Edit button | Save with conflict errors inline |
| Delete/Release | Delete button | Hold → confirm hard delete; Confirmed → confirm soft cancel with accounting warning |

**Workspace link**: Rendered only when `workspaceAllowed === true`.

## Create Event modal

**testid**: `booking-create-event-modal`

Required: venue, date, title.  
Optional: doors time, QBO tag.  
On save: `bookingPlacementStatus: CONFIRMED`.

## Create Hold modal

**testid**: `booking-create-hold-modal`

Required: venue, date, act name.  
Optional: tier (default auto).  
On save: `HOLD_1` or `HOLD_2`.

## Mobile layout (<768px)

- Hide `booking-calendar-matrix`.
- Show `booking-calendar-mobile` — date groups with stacked rows (time, title, venue badge, status).

## Global navigation

| Item | Change |
|------|--------|
| Booking Calendar | `disabled: false`, `matchPaths: ['/booking']`, no "Coming soon" suffix |

## Dashboard event card badge

Replace `getBookingPreviewLabel(eventId)` hash with API `bookingPlacementStatus` label map:

| API value | Badge label |
|-----------|-------------|
| HOLD_1 | Hold 1 |
| HOLD_2 | Hold 2 |
| CONFIRMED | Confirmed |
| CANCELLED | Cancelled |

## Accessibility

- Drawers: focus trap, backdrop click/Escape close, `aria-modal`, labelled title — mirror `UnassignedTransactionsDrawer`.
- Matrix: `role="grid"` with labelled rows/columns where practical.
- Status not conveyed by color alone — include text badge on chips.

## Icons (Font Awesome Free)

| Action | Icon |
|--------|------|
| Nav Booking Calendar | `faCalendarDays` |
| Create Event | `faPlus` |
| Create Hold | `faBookmark` |
| Month prev/next | `faChevronLeft`, `faChevronRight` |
| Close drawer | `faXmark` |
