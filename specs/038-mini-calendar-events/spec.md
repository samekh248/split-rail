# Feature Specification: Mini-Calendar View for Upcoming Events

**Feature Branch**: `038-mini-calendar-events`

**Created**: 2026-06-19

**Status**: Draft

**Input**: User description: "Add mini-calendar view for Upcoming Events section — Linear [SPLR-78](https://linear.app/audiodex/issue/SPLR-78/add-mini-calendar-view-for-upcoming-events-section)"

**Linear Issue**: [SPLR-78](https://linear.app/audiodex/issue/SPLR-78/add-mini-calendar-view-for-upcoming-events-section)

**Depends on**: Dashboard overview with server-partitioned upcoming events zone (SPLR-66 / specs 026, 031, 032)

## Clarifications

### Session 2026-06-19

- Q: When multiple upcoming events fall on the same calendar date, how should the mini-calendar display them? → A: Show up to 2–3 truncated event titles in the cell; additional events appear as "+N more".
- Q: When the thirty-day upcoming window spans two calendar months, how should the mini-calendar lay out those days? → A: One primary month grid with partial days from adjacent month(s) as needed to cover the window.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Toggle between list and calendar views (Priority: P1)

As a venue operator reviewing upcoming shows, I need to switch the Upcoming Events section between the existing list layout and a compact calendar layout, so I can choose the view that best matches how I scan my schedule.

**Why this priority**: The view toggle is the entry point for the entire feature. Without it, users cannot access the calendar at all.

**Independent Test**: Open the dashboard overview for a venue with upcoming events. Confirm the Upcoming Events section shows a list by default and that a visible control switches to calendar view and back without reloading the page or losing section data.

**Acceptance Scenarios**:

1. **Given** a signed-in user on the dashboard overview with upcoming events, **When** the Upcoming Events section renders, **Then** the list view is shown by default.
2. **Given** the Upcoming Events section is in list view, **When** the user selects the calendar view control, **Then** the section switches to a mini-calendar layout showing the same upcoming events.
3. **Given** the Upcoming Events section is in calendar view, **When** the user selects the list view control, **Then** the section returns to the existing card list layout with the same events.
4. **Given** the user toggles between list and calendar views, **When** each switch completes, **Then** no additional data fetch is required and event membership in the section remains unchanged.

---

### User Story 2 - See upcoming events on their scheduled dates (Priority: P1)

As a venue operator planning the next month, I need upcoming events plotted on the dates they occur within a thirty-day lookahead window, so I can understand show density and timing at a glance instead of reading a chronological list.

**Why this priority**: Date-based visualization is the core value of the calendar view and the reason operators would switch away from the list.

**Independent Test**: Seed upcoming events on distinct dates within the thirty-day window (including multiple events on one date and dates with no events). Open calendar view and confirm each event appears on its correct calendar date and only dates within the upcoming window are emphasized.

**Acceptance Scenarios**:

1. **Given** upcoming events returned for the active venue, **When** calendar view renders, **Then** each event appears on the calendar cell matching its scheduled date.
2. **Given** the upcoming events zone uses a thirty-calendar-day lookahead after today (consistent with the dashboard overview), **When** calendar view renders, **Then** only events within that same window are shown and events dated today are excluded.
3. **Given** multiple upcoming events share the same date, **When** calendar view renders, **Then** the date cell shows up to three truncated event titles and, if more events qualify, a "+N more" indicator without omitting any qualifying event from the section.
4. **Given** no upcoming events qualify for the window, **When** calendar view is selected, **Then** the section heading remains visible with the existing empty message ("No upcoming events") rather than a blank or broken calendar.
5. **Given** upcoming events span more than one calendar month within the thirty-day window, **When** calendar view renders, **Then** a primary month grid is shown with partial leading or trailing days from adjacent month(s) as needed so all qualifying dates within the window are visible in one compact layout.

---

### User Story 3 - Open an event workspace from the calendar (Priority: P2)

As a venue operator viewing the calendar, I need to open an event's financial workspace directly from a calendar date or event indicator, so the calendar is a launch pad—not just a passive schedule display.

**Why this priority**: Navigation parity with list-view event cards ensures the calendar view is actionable and not a dead-end visualization.

**Independent Test**: From calendar view, activate an event on a single-event date and confirm navigation to that event's workspace. Repeat on a multi-event date and confirm each listed event is individually activatable.

**Acceptance Scenarios**:

1. **Given** a calendar date has exactly one upcoming event, **When** the user activates that date or its event indicator, **Then** they navigate to that event's workspace route for the active venue.
2. **Given** a calendar date has multiple upcoming events, **When** the user activates a specific truncated title or the "+N more" indicator for that date, **Then** they can reach and open each event's workspace route (expanded list or equivalent affordance when more than three events share the date).
3. **Given** a user activates an event from calendar view, **When** navigation completes, **Then** the destination matches the same workspace route used when activating the event from list view cards.

---

### User Story 4 - Remember view preference for the current browser session (Priority: P3)

As a venue operator who prefers calendar view while working, I need my Upcoming Events view choice remembered when I navigate away and return within the same browser session, so I do not have to re-select calendar view on every overview visit.

**Why this priority**: Session persistence improves repeat-use ergonomics but is polish relative to rendering and navigation.

**Independent Test**: Switch Upcoming Events to calendar view, navigate to an event workspace and back to the overview, and confirm calendar view is still active. Close the browser tab or start a new session and confirm list view is the default again.

**Acceptance Scenarios**:

1. **Given** a user selects calendar view in Upcoming Events, **When** they navigate elsewhere in the application and return to the dashboard overview in the same browser session, **Then** Upcoming Events opens in calendar view.
2. **Given** a user selects list view after previously choosing calendar view, **When** they return to the overview in the same browser session, **Then** Upcoming Events opens in list view.
3. **Given** a user ends their browser session (new tab/window or cleared session storage), **When** they open the dashboard overview, **Then** Upcoming Events defaults to list view.

---

### Edge Cases

- What happens when the thirty-day window crosses a month or year boundary? The mini-calendar uses one primary month grid and includes partial days from adjacent month(s) as needed so no qualifying event is dropped at month or year edges.
- What happens when two events on the same date belong to the same venue? Both remain visible and individually activatable without duplicate navigation to the wrong event.
- What happens when more than three events share a date? The cell shows three truncated titles plus a "+N more" indicator; activating "+N more" reveals the remaining events so each is individually activatable.
- What happens when dashboard data is loading or fails? The view toggle is unavailable or disabled consistent with existing zone loading and error patterns; no partial calendar is shown from stale data.
- What happens when the user changes the active venue? Upcoming Events refreshes for the new venue and the calendar reflects the new venue's upcoming events while preserving the selected view mode for the session.
- What happens near midnight in the user's local timezone? On the next page load or data refresh, today's exclusion and the thirty-day window align with the updated local calendar date.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Upcoming Events section MUST offer a user-visible control to switch between list view and mini-calendar view.
- **FR-002**: List view MUST remain the default when no session preference exists.
- **FR-003**: Mini-calendar view MUST display the same upcoming events supplied to the Upcoming Events section without requiring a separate data source.
- **FR-004**: Mini-calendar view MUST place each upcoming event on the calendar cell corresponding to its scheduled date.
- **FR-005**: The mini-calendar MUST respect the same thirty-calendar-day upcoming window and today-exclusion rules as the dashboard overview upcoming events zone.
- **FR-005a**: When the upcoming window spans calendar months, the mini-calendar MUST render as one primary month grid with partial adjacent-month days as needed to include every qualifying date within the window.
- **FR-006**: When multiple events share a date, the mini-calendar MUST show up to three truncated event titles in the date cell and a "+N more" indicator when additional qualifying events exist; all qualifying events MUST remain reachable for individual activation.
- **FR-007**: Activating an event from mini-calendar view MUST navigate the user to that event's workspace route, consistent with list-view card activation.
- **FR-008**: When no upcoming events qualify, the section MUST show the existing empty message in either view mode.
- **FR-009**: The user's selected view mode (list or calendar) MUST persist for the duration of the browser session and reset to list view when the session ends.
- **FR-010**: Toggling view mode MUST NOT trigger an additional server request beyond what the overview already loads.
- **FR-011**: Mini-calendar visual presentation MUST align with existing dashboard overview styling so the section feels native to the overview page.
- **FR-012**: System MUST achieve ≥80% line/branch coverage across backend and frontend for this feature (CI-enforced; Constitution III).

### Key Entities

- **Upcoming Event**: A show scheduled within the thirty-day lookahead window after today for the active venue; carries at minimum a scheduled date, venue identity, and event identity for display and navigation.
- **View Preference**: The operator's chosen Upcoming Events presentation (list or calendar), scoped to the current browser session.
- **Calendar Date Cell**: A single day within the mini-calendar layout that may show zero, one, or many upcoming events.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can switch between list and calendar views in under two seconds without a full page reload.
- **SC-002**: In user acceptance testing with seeded events across at least ten distinct dates (including multi-event dates), 100% of events appear on the correct calendar date in calendar view.
- **SC-003**: Activating an event from calendar view reaches the intended event workspace on the first attempt in 100% of tested single-event and multi-event date scenarios.
- **SC-004**: After selecting calendar view, returning to the overview within the same browser session preserves calendar view in 100% of tested navigation flows.
- **SC-005**: After starting a new browser session, Upcoming Events defaults to list view in 100% of tested flows.
- **SC-006**: ≥80% line/branch coverage achieved across backend and frontend code for this feature (CI-enforced; Constitution III).

## Assumptions

- The dashboard overview and server-partitioned upcoming events zone are already available and authoritative for event membership in this section.
- "Mini-calendar" means a compact month-oriented grid suitable for the overview sidebar/zone layout—not a full-page scheduling product. When the thirty-day window crosses a month boundary, adjacent-month days appear only as needed within a single primary month grid rather than as separate stacked month views.
- View preference persistence is session-scoped only; cross-device or account-level preference storage is out of scope for this release.
- Calendar view is read-only for scheduling; creating or rescheduling events from the calendar is out of scope (consistent with overview page boundaries in specs 026 and 032).
- Event activation from the calendar uses the same workspace navigation behavior as existing overview event cards, including venue context from the active venue.
- No new third-party calendar or date-picker product is introduced; the mini-calendar is built with existing dashboard visual language.
- Backend changes are minimal or none; coverage focus is on calendar rendering, toggle behavior, navigation, and session preference logic on the overview.

## Dependencies

- Dashboard overview page with Upcoming Events zone populated from server dashboard aggregate (specs 026, 031, 032).
- Event card data includes scheduled date, event identity, and venue identity sufficient for calendar placement and workspace navigation.
- Linear project milestone: Phase 4 Polish (optional).
