# Research: Mini-Calendar View for Upcoming Events

**Feature**: `038-mini-calendar-events` | **Date**: 2026-06-19

## 1. Calendar implementation approach (no third-party library)

**Decision**: Build a custom month-grid mini-calendar with native `Date` APIs and CSS grid; no react-calendar, FullCalendar, or date-picker packages.

**Rationale**: Linear SPLR-78 explicitly requires dashboard-consistent CSS and no new UI library. The 30-day upcoming window and compact zone layout need only a static month grid with event chips—not drag-drop scheduling.

**Alternatives considered**:
- `react-calendar` → rejected; adds dependency and styling override burden for a read-only widget.
- Reuse HTML `<input type="date">` → rejected; not a multi-event month view.

## 2. View toggle placement and control pattern

**Decision**: Segmented list/calendar toggle in `UpcomingEventsSection` header via existing `DashboardZoneEvents` `filterSlot`, mirroring `RecentEventsSection` + `BottleneckFilter`.

**Rationale**: Header slot is established in `DashboardZoneEvents.tsx`; keeps toggle co-located with zone title; no page-level state required beyond optional initial read from session storage.

**Alternatives considered**:
- Toggle inside `DashboardOverviewPage` → rejected; couples page to upcoming-specific UX.
- Tabs below heading → rejected; inconsistent with recent-zone filter control placement.

## 3. Session view preference storage

**Decision**: `sessionStorage` key `split-rail:upcoming-events-view` with values `list` | `calendar`; default `list` when absent or invalid.

**Rationale**: Spec FR-009 and clarifications require session-scoped persistence that resets on new tab/session—distinct from pin storage (`localStorage` in 025/032).

**Alternatives considered**:
- `localStorage` → rejected; would survive browser restart, violating SC-005.
- React context only → rejected; lost on full page reload within same tab session edge cases.

## 4. Primary month grid algorithm

**Decision**: Anchor the grid on the **calendar month containing today**; render a standard Sun–Sat (or locale-consistent) week grid with leading/trailing adjacent-month days to fill complete weeks; visually de-emphasize days outside the inclusive upcoming window (tomorrow through today+30).

**Rationale**: Matches clarification Q2 (one primary month + partial adjacent days). Standard month grids always include adjacent-month padding days; window filtering applies to event placement and cell emphasis, not grid shape.

**Alternatives considered**:
- Two stacked month blocks → rejected in clarification.
- Rolling 30-day strip only → rejected in clarification.

## 5. Multi-event cell rendering (+N more)

**Decision**: Each date cell shows up to **three** truncated event title buttons (max ~24 chars); if more events qualify, show `+N more` control that expands an inline popover/list beneath the cell (or within cell on focus) listing remaining titles—all individually clickable.

**Rationale**: Spec clarification Q1 and FR-006; inline expand avoids navigation dead-end for 4+ events on one date while keeping default cell height bounded.

**Alternatives considered**:
- Count badge only → rejected in clarification.
- Show all titles without truncation → rejected; breaks compact mini-calendar layout.

## 6. Date parsing and grouping

**Decision**: New pure module `apps/web/src/lib/upcomingEventsCalendar.ts` exporting:
- `getUpcomingWindowBounds(now?)` → `{ start, end }` (local calendar dates; start = tomorrow, end = today+30)
- `groupEventsByLocalDate(events)` → `Map<string, EventCardDto[]>` keyed by `YYYY-MM-DD`
- `buildMiniCalendarWeeks(anchorMonth, now?)` → week rows of `{ date, inWindow, isAdjacentMonth }`

Parse `EventCardDto.eventDate` as ISO date-only or date-time; normalize to local calendar day (same approach as overview partition tests using `offsetDate` helpers).

**Rationale**: Pure functions achieve ≥80% coverage independently of RTL component tests; aligns with `partitionOverviewZones.ts` / `eventCardSummary.ts` patterns.

**Alternatives considered**:
- Inline date logic in component → rejected; harder to test window/month edge cases.

## 7. Backend scope

**Decision**: **No backend or API changes.** Reuse `DashboardResponse.upcomingEvents` (`EventCardDto[]`) already returned by `useDashboard` / `useAllVenuesDashboard`.

**Rationale**: Spec assumptions and FR-003/FR-010; server already partitions upcoming events with 30-day rules (031/032).

**Alternatives considered**:
- New calendar-specific endpoint → rejected; redundant data fetch violates FR-010.

## 8. All-venues overview mode

**Decision**: Calendar view works in all-venues mode when `upcomingEvents` is merged across venues; each event chip uses `event.venueId` for `onCardActivate` navigation (same as list cards).

**Rationale**: `DashboardOverviewPage` already passes merged partitions in all-venues mode; calendar must not regress multi-venue navigation.

## 9. Toggle icons (Constitution IX)

**Decision**: Font Awesome Free `faList` (list view) and `faCalendarDays` (calendar view) on segmented toggle buttons with `aria-pressed` state.

**Rationale**: Constitution IX; matches `BottleneckFilter` + `GlobalNav` FA patterns.

**Alternatives considered**:
- Text-only "List | Calendar" → acceptable fallback but less scannable; FA preferred on dashboard.

## 10. Loading and empty states

**Decision**: When `events.length === 0`, both views show existing empty message (no calendar grid). Toggle remains visible but calendar selection shows same empty copy. When parent page is loading, upcoming section follows existing zone visibility (widgets hidden until loaded—no orphan toggle).

**Rationale**: FR-008 and edge-case spec; avoids rendering an empty month grid that implies broken data.
