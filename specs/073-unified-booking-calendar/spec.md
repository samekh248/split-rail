# Feature Specification: Unified Booking Calendar Engine

**Feature Branch**: `074-unified-booking-calendar`

**Created**: 2026-06-25

**Status**: Draft

**Input**: User description: "Implement the full Unified Booking Calendar Engine as a new Booking Calendar global module: introduce Region entities, extend Events with real booking placement statuses and schedule metadata, add org-scoped calendar data with conflict validation, and build multi-venue matrix/daily-agenda/mobile UX with inline create/edit panels—replacing today's placeholder nav item and hash-based booking badges."

**Depends on**: Organization and venue foundation (spec 001), venue management UI (spec 014), event workspace and CRUD (specs 015, 002), global navigation shell (spec 022), dashboard mini-calendar patterns (spec 038), event card booking preview placeholder (spec 025)

## Clarifications

### Session 2026-06-25

- Q: Should holds and confirmed bookings share the same underlying show record, or exist as separate record types? → A: Same show record with a booking placement status distinguishing holds from confirmed bookings; promotion updates status rather than creating a duplicate record.
- Q: When a confirmed booking is cancelled, is the record removed or retained? → A: Retained with a Cancelled booking status (hidden by default via toggle); holds are removed when released.
- Q: How should existing shows without booking data behave after launch? → A: Treated as Confirmed bookings so historical schedule data remains visible and accurate.
- Q: When one hold is promoted to Confirmed while the other hold tier still exists on the same venue date, what happens to the remaining hold? → A: Promotion is allowed; the other hold remains active (Hold 1 or Hold 2) alongside the new Confirmed booking.
- Q: Can operators open the financial workspace for a hold before it is promoted to Confirmed? → A: No—workspace access is blocked for holds; operators manage holds from the calendar control panel only until promotion.
- Q: Do Cancelled placements block new Confirmed bookings or holds on the same venue date? → A: No—Cancelled placements are treated as open slots; new Confirmed bookings and holds are allowed on the same venue date.
- Q: Which calendar view loads when an operator opens Booking Calendar for the first time in a session? → A: Global view for the current month.
- Q: Do creating holds and creating Confirmed bookings require different permissions? → A: No—same permission; any user who can access the calendar can create both holds and Confirmed bookings.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Open the Booking Calendar from global navigation (Priority: P1)

As an independent venue owner or regional promoter, I need the Booking Calendar item in global navigation to open a dedicated multi-venue planning screen instead of a "Coming soon" placeholder, so I can manage holds and confirmed dates from a first-class application area.

**Why this priority**: The navigation entry is the primary entry point. Without a real destination, no other booking calendar capability is reachable.

**Independent Test**: Sign in as an authorized user, activate Booking Calendar in the left rail, and confirm navigation lands on the booking calendar screen with the item highlighted. Confirm the item no longer shows "Coming soon" or blocks interaction.

**Acceptance Scenarios**:

1. **Given** an authenticated user with permission to view financial/show data for their organization, **When** they activate Booking Calendar in global navigation, **Then** they are taken to the unified booking calendar screen.
2. **Given** a user is on the booking calendar screen, **When** the page renders, **Then** the Booking Calendar navigation item is highlighted and other global items are not incorrectly highlighted.
3. **Given** a user lacks permission to view show data, **When** they attempt to reach the booking calendar, **Then** access is denied consistent with other financial pages in the product.
4. **Given** Booking Calendar was previously a disabled placeholder (spec 037), **When** this feature ships, **Then** the placeholder behavior is fully replaced by the live module.

---

### User Story 2 - Organize venues under regions (Priority: P1)

As an operator managing multiple properties across geographic territories, I need to create regions and assign each venue to a region, so consolidated calendar views can group rooms by operational territory.

**Why this priority**: Region → Venue → Show is the data hierarchy that enables global and regional calendar layouts described in the product requirements.

**Independent Test**: Create a region with a name and optional notes, assign two venues to it, and confirm both venues appear under that region when filtering the calendar. Confirm venues without a region appear in an "Unassigned" grouping until mapped.

**Acceptance Scenarios**:

1. **Given** a user with venue-management permission, **When** they create a region with a unique name and optional notes, **Then** the region is saved and available for venue assignment and calendar filtering.
2. **Given** at least one region exists, **When** a user creates or edits a venue profile, **Then** they must select a region from a dropdown of established regions.
3. **Given** regions and venue assignments exist, **When** the booking calendar renders a global view, **Then** venue columns or rows are grouped dynamically under their assigned region.
4. **Given** a region has venues still assigned, **When** a user attempts to delete that region, **Then** deletion is blocked with a clear message to reassign venues first.
5. **Given** legacy venues existed before regions were introduced, **When** the calendar loads, **Then** unassigned venues appear in a distinct "Unassigned" group until an administrator maps them.

---

### User Story 3 - View organizational capacity at global, regional, and single-venue levels (Priority: P1)

As a lead talent buyer or executive, I need to pivot the calendar among a company-wide matrix, a single-region slice, and one room's calendar, so I can scan capacity at the altitude that matches my current planning task.

**Why this priority**: Multi-level visualization is the core value proposition—unifying fragmented multi-venue logistics into one screen.

**Independent Test**: Seed shows and holds across three regions and five venues. Switch among Global, Regional (select one region), and Single-venue views and confirm only the appropriate venues and placements appear in each mode without a full page reload.

**Acceptance Scenarios**:

1. **Given** multiple regions and venues with scheduled placements, **When** Global view is selected, **Then** all regions and all assigned venues display concurrently in one consolidated layout.
2. **Given** Global view is active, **When** the user selects a specific region filter, **Then** the layout shows only venues belonging to that region (Regional view).
3. **Given** Regional or Global view is active, **When** the user selects a single venue, **Then** the layout isolates to that venue's calendar only (Single-venue view).
4. **Given** the user changes region or venue filters, **When** the selection updates, **Then** the calendar refreshes instantly on the client without requiring a browser page reload.
5. **Given** the user navigates to a different month, **When** month controls are used, **Then** placements for the selected month load and display for the active view/filter combination.
6. **Given** an operator opens Booking Calendar for the first time in a browser session, **When** the page loads, **Then** Global view is shown for the current calendar month.

---

### User Story 4 - Distinguish holds, confirmed bookings, and cancelled placements visually (Priority: P1)

As a booking agent, I need holds and confirmed dates to look unmistakably different on the calendar, and cancelled items to be hideable, so I do not double-book critical dates or confuse tentative holds with locked commitments.

**Why this priority**: Visual lifecycle distinction is a safety requirement for scheduling; without it the calendar creates operational risk.

**Independent Test**: Place one Hold 1, one Hold 2, one Confirmed booking, and one Cancelled booking on the same venue in one month. Confirm each status has a distinct visual treatment and that cancelled items are hidden by default but visible when the cancelled toggle is on.

**Acceptance Scenarios**:

1. **Given** a placement with Hold 1 or Hold 2 status, **When** it appears on the calendar grid, **Then** it uses a tentative visual style (e.g., dashed border or lighter desaturated tint) distinct from confirmed bookings.
2. **Given** a placement with Confirmed status, **When** it appears on the calendar grid, **Then** it displays as a solid, high-contrast block indicating a locked commitment ready for downstream financial tracking.
3. **Given** a placement with Cancelled status, **When** the default calendar loads, **Then** it is hidden from the grid.
4. **Given** cancelled placements exist, **When** the user enables "Show cancelled", **Then** cancelled items appear struck-through or faded to denote released availability.
5. **Given** dashboard event cards currently show a placeholder booking badge (spec 025), **When** this feature ships, **Then** cards display the real booking placement status from live data.

---

### User Story 5 - Create a confirmed booking from the calendar (Priority: P1)

As a booking agent, I need to create a confirmed show directly from the calendar header or by quick-adding on a date cell, so I can lock a date without navigating away to a separate deep form.

**Why this priority**: Frictionless confirmed booking creation is the primary scheduling action that initializes downstream deal and ledger work.

**Independent Test**: From the calendar, open Create Event, enter venue, date, title, and optional schedule details, save, and confirm a Confirmed block appears on the grid and the show is available for financial workspace access.

**Acceptance Scenarios**:

1. **Given** the booking calendar is open, **When** the user activates "+ Create Event" in the header, **Then** a modal overlay prompts for target venue, date, event title, and initial confirmed booking parameters.
2. **Given** the user hovers over or activates quick-add on a specific date cell, **When** they choose to create an event, **Then** the modal opens with that date (and venue when applicable) pre-filled.
3. **Given** valid required fields are submitted, **When** the user saves, **Then** a Confirmed placement appears on the calendar and the underlying show record is created ready for deal-builder and ledger work.
4. **Given** a Confirmed placement already exists on a venue date, **When** the user attempts to create another Confirmed booking on the same venue and date, **Then** the system rejects the action with a clear conflict message.
5. **Given** a new confirmed booking is saved, **When** the calendar re-renders, **Then** the update appears without a full web page reload.

---

### User Story 6 - Create and tier holds from the calendar (Priority: P1)

As a booking agent evaluating talent, I need to place Hold 1 or Hold 2 blocks from the calendar without initializing financial schemas, so tentative dates remain flexible until formally promoted.

**Why this priority**: Holds are the operational counterweight to confirmed bookings and must coexist on the same calendar with clear tier rules.

**Independent Test**: Create a Hold 1 on an open date, then create a second hold on the same venue date and confirm it becomes Hold 2. Attempt a third hold and confirm rejection. Confirm holds use tentative styling and do not block financial workspace until promoted.

**Acceptance Scenarios**:

1. **Given** the booking calendar is open, **When** the user activates "+ Create Hold", **Then** a streamlined modal prompts for target venue, date, artist/act name, and hold tier (defaulting to Hold 1).
2. **Given** no existing hold or confirmed booking occupies a venue date, **When** the user saves a hold, **Then** it is recorded as Hold 1.
3. **Given** Hold 1 already exists on a venue date and no Confirmed booking is present, **When** the user saves another hold, **Then** it is recorded as Hold 2 (or the user may explicitly select Hold 2 when appropriate).
4. **Given** Hold 1 and Hold 2 already exist on a venue date, **When** the user attempts another hold, **Then** the action is rejected with a clear conflict message.
5. **Given** a Confirmed booking exists on a venue date, **When** the user creates a hold, **Then** only Hold 2 is permitted (or the action is rejected if Hold 2 already exists), per conflict rules.
6. **Given** a hold is saved, **When** it appears on the calendar, **Then** it does not initialize or lock downstream financial structures until promoted to Confirmed.
7. **Given** a placement has Hold 1 or Hold 2 status, **When** the user attempts to open the financial workspace, **Then** access is blocked and the operator remains in calendar context (control panel only).

---

### User Story 7 - Drill into a daily agenda for high-density dates (Priority: P2)

As a promoter reviewing a busy night across multiple rooms, I need to click a calendar date and see every show and hold that night in chronological order, so I can resolve overlaps without squinting at a crowded grid cell.

**Why this priority**: Daily agenda is essential when global or regional matrix views stack multiple venues on the same date square.

**Independent Test**: Seed three venues with multiple placements on one date. Click the date and confirm a chronological list shows venue name, scheduled time, act name, and status badge for each item.

**Acceptance Scenarios**:

1. **Given** one or more placements exist on a date within the filtered venue set, **When** the user activates the date number or cell background, **Then** a daily agenda view opens listing every placement for that date.
2. **Given** the daily agenda is open, **When** items are listed, **Then** each entry shows venue room name, scheduled time (when set), act name, and current status badge (e.g., Confirmed, Hold 1).
3. **Given** multiple placements share a date, **When** the agenda renders, **Then** items are ordered chronologically by scheduled time, then by venue name when times are equal or unset.
4. **Given** the user activates an item in the daily agenda, **When** the selection is processed, **Then** the event control panel opens for that placement (see User Story 8).

---

### User Story 8 - View, edit, and release placements from an event control panel (Priority: P2)

As a booking agent, I need to open a sliding panel from the grid or daily agenda to inspect details, edit fields, or release a hold/delete a booking, so I can manage schedules without leaving the calendar context.

**Why this priority**: Detail and mutation workflows complete the calendar as an operational tool rather than a read-only display.

**Independent Test**: Open a confirmed booking from the grid, verify metadata display, edit the date with conflict checking, save, and confirm the grid updates. Release a hold via delete confirmation and confirm the slot opens. Cancel a confirmed booking and confirm soft cancellation with accounting warning when financial data exists.

**Acceptance Scenarios**:

1. **Given** the user activates a placement on the grid or in the daily agenda, **When** the panel opens, **Then** it shows act name, support lineup (when set), region and venue, load-in/doors/curfew times (when set), booking status, financial lifecycle status, and QuickBooks project tag reference (when confirmed and mapped).
2. **Given** the panel is in edit mode, **When** the user changes date or venue, **Then** a conflict check runs before save and blocks promotion of a hold over an existing Confirmed date on the same stage.
3. **Given** valid edits are submitted, **When** the user saves, **Then** changes persist and the calendar re-renders without a full page reload.
4. **Given** the user chooses to release a hold, **When** they confirm deletion, **Then** the hold is removed and the date slot becomes available for new holds.
5. **Given** the user chooses to cancel a confirmed booking, **When** they confirm, **Then** the placement status becomes Cancelled (not hard-deleted) and a warning appears if accounting structures are already mapped downstream.
6. **Given** a show is settled or reconciled in the financial lifecycle, **When** the user attempts destructive changes, **Then** the same immutability rules that protect financial records elsewhere in the product apply.

---

### User Story 9 - Use the calendar on mobile devices (Priority: P2)

As a promoter on site, I need the booking calendar to remain usable on screens narrower than 768px, so I can check holds and confirmed dates from a phone without horizontal scrolling a wide matrix.

**Why this priority**: Responsive behavior is an explicit product requirement for operators who plan from the road.

**Independent Test**: Resize the viewport below 768px width (or use a mobile device). Confirm the multi-venue column matrix is replaced by a vertical stream grouped by date with time and venue badges.

**Acceptance Scenarios**:

1. **Given** a viewport width of 768px or wider, **When** the calendar renders, **Then** venues display side-by-side as distinct column matrices (or equivalent multi-resource grid).
2. **Given** a viewport width below 768px, **When** the calendar renders, **Then** the side-by-side column layout is hidden and replaced by a stacked vertical stream categorized by date with time and venue badges.
3. **Given** mobile layout is active, **When** the user creates, views, or edits placements, **Then** the same create modals and control panel workflows remain accessible.

---

### User Story 10 - Promote a hold to a confirmed booking (Priority: P2)

As a booking agent, I need to promote an active hold to Confirmed when a deal is finalized, so the date transitions from tentative to a locked commitment without re-entering data.

**Why this priority**: Promotion closes the loop between hold workflow and confirmed booking workflow described in the product requirements.

**Independent Test**: Create Hold 1 on an open date, open the control panel, promote to Confirmed, and confirm visual style changes and conflict rules prevent promotion when another Confirmed booking exists.

**Acceptance Scenarios**:

1. **Given** a Hold 1 or Hold 2 placement with no Confirmed conflict on the same venue date, **When** the user promotes it to Confirmed, **Then** the booking status updates and the calendar shows the confirmed visual style.
2. **Given** a Confirmed booking already exists on the venue date, **When** the user attempts to promote a hold, **Then** the action is rejected with a clear conflict message.
3. **Given** a hold is promoted, **When** the user opens the financial workspace for that show, **Then** the show is available for deal-builder and ledger work consistent with other confirmed bookings.
4. **Given** both Hold 1 and Hold 2 exist on a venue date, **When** the user promotes either hold to Confirmed, **Then** the promotion succeeds and the non-promoted hold remains active on the calendar alongside the new Confirmed booking.

---

### Edge Cases

- What happens when an organization has zero venues? The calendar shows the same no-venue guidance pattern used on the dashboard rather than an empty broken grid.
- What happens when an organization has venues but zero regions? Venue creation does not require a region until at least one region exists; the calendar global view lists venues under "Unassigned."
- What happens when a user has restricted venue scope (subset of org venues)? The calendar only shows placements for venues they can access, consistent with venue scoping elsewhere.
- What happens when two holds and one confirmed booking exist and the user toggles "Show cancelled"? Only Cancelled status items receive cancelled styling; active holds remain tentative.
- What happens when scheduled times are not set? Daily agenda and mobile stream sort by venue name; detail panel shows times as unset rather than defaulting to midnight silently.
- What happens when month navigation crosses a year boundary? The calendar loads and displays the selected month correctly including year transitions.
- What happens when calendar data is loading or fails? Loading and error states follow existing application patterns; no partial grid from stale data.
- What happens near midnight in the user's local timezone? Date grouping for the calendar aligns with the user's local calendar date on the next load or refresh.
- What happens when a hold is promoted while a sibling hold remains on the same date? The promoted show becomes Confirmed; the sibling hold stays active and visible with tentative styling—no automatic release.
- What happens when a user tries to open the financial workspace for a hold? Navigation is blocked; the operator manages the hold exclusively through the calendar control panel until promotion to Confirmed.
- What happens when a Cancelled placement exists on a venue date and the user creates a new booking or hold? The Cancelled record does not block the action; the date is treated as open availability (Cancelled record may remain visible when "Show cancelled" is enabled).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Booking Calendar global navigation item MUST be enabled and navigate to a dedicated booking calendar screen; the "Coming soon" placeholder behavior from spec 037 MUST be retired.
- **FR-002**: Users with show/financial view permission MUST access the booking calendar and MUST be able to create both holds and Confirmed bookings; users without permission MUST be denied consistent with other financial surfaces.
- **FR-003**: The system MUST support a three-tier hierarchy: Region (organizational territory), Venue (physical property or room), and Show/Hold placement (calendar entry on a venue date).
- **FR-004**: Users with venue-management permission MUST be able to create regions with a unique name per organization and optional notes, accessible from the calendar control area or venue settings context.
- **FR-005**: Venue create and edit flows MUST require selection of an established region once at least one region exists in the organization.
- **FR-006**: The booking calendar MUST support three view modes—Global (all regions and venues), Regional (filtered to one region), and Single-venue (one room)—switchable without a full page reload.
- **FR-007**: Region and venue filter controls MUST apply instantly on the client to filter displayed placements without requiring a separate browser page refresh.
- **FR-008**: The calendar MUST support month navigation with placements loaded for the visible month and active filter set; on first open in a browser session, the calendar MUST default to Global view for the current month.
- **FR-009**: Each placement MUST carry a booking placement status of Hold 1, Hold 2, Confirmed, or Cancelled, visually distinct on the calendar grid.
- **FR-010**: Hold 1 and Hold 2 placements MUST render with a tentative visual style; Confirmed placements MUST render with a solid, high-contrast style; Cancelled placements MUST be hidden by default and shown struck-through or faded when a "Show cancelled" toggle is active.
- **FR-011**: Users MUST be able to create a Confirmed booking from the calendar via a header control or inline quick-add on a date cell, supplying at minimum target venue, date, and event title.
- **FR-012**: Users MUST be able to create a Hold from the calendar via a header control or inline quick-add, supplying at minimum target venue, date, artist/act name, and hold tier (default Hold 1).
- **FR-013**: The system MUST enforce per-venue-per-date conflict rules among active placements: at most one Confirmed booking; at most one Hold 1 and one Hold 2; no additional holds when both hold tiers are occupied; new holds on a Confirmed date limited to Hold 2 only when no Hold 2 exists. Cancelled placements MUST NOT count toward conflicts—the date slot is treated as open for new Confirmed bookings and holds.
- **FR-014**: Conflict violations MUST return a clear, user-facing error identifying the conflict; the UI MUST surface these errors in create and edit flows without a full page reload.
- **FR-015**: Creating a Confirmed booking MUST create a show record ready for deal-builder and ledger initialization; creating a Hold MUST NOT lock downstream financial schemas until promotion, and holds MUST NOT be openable in the financial workspace until promoted to Confirmed.
- **FR-016**: Activating a calendar date MUST open a daily agenda listing all placements that date across the filtered venue set, showing venue name, scheduled time (when set), act name, and status badge in chronological order.
- **FR-017**: Activating a placement on the grid or in the daily agenda MUST open an event control panel (drawer or modal) with detail, edit, and delete/release actions.
- **FR-018**: The detail view MUST display act name, support lineup (when set), region, venue, load-in/doors/curfew (when set), booking status, financial lifecycle status, and QuickBooks project tag (when confirmed and mapped).
- **FR-019**: Edit mode MUST re-validate conflicts when date or venue changes before save; successful saves MUST refresh the calendar without a full page reload.
- **FR-020**: Releasing a hold MUST require destructive confirmation and permanently remove the hold record, opening the slot for new holds.
- **FR-021**: Cancelling a confirmed booking MUST require confirmation, set status to Cancelled (soft cancel), and warn the user when accounting structures are already mapped.
- **FR-022**: Financial immutability rules for settled or reconciled shows MUST apply to calendar edit and delete actions consistent with the rest of the platform.
- **FR-023**: Users MUST be able to promote Hold 1 or Hold 2 to Confirmed when no Confirmed conflict exists on the same venue date; promotion MUST NOT auto-release sibling holds—a remaining Hold 1 or Hold 2 stays active alongside the new Confirmed booking.
- **FR-024**: On viewports 768px wide and above, the calendar MUST display a multi-venue column matrix; below 768px, it MUST display a stacked vertical stream grouped by date with time and venue badges.
- **FR-025**: Dashboard event cards MUST display real booking placement status, replacing the deterministic placeholder badge from spec 025.
- **FR-026**: Existing show records without explicit booking data MUST be treated as Confirmed after migration.
- **FR-027**: Calendar queries MUST be scoped to the authenticated user's organization and respect per-user venue access boundaries.
- **FR-028**: System MUST achieve ≥80% line/branch coverage across backend and frontend for this feature (CI-enforced; Constitution III).

### Key Entities

- **Region**: A user-defined geographic or operational territory within an organization; has a unique name per organization and optional notes; groups one or more venues.
- **Venue**: A physical property or room; belongs to an organization and, once regions exist, to exactly one region; has independent calendar capacity.
- **Show / Hold Placement**: A calendar entry attached to a venue and date; has booking placement status (Hold 1, Hold 2, Confirmed, Cancelled), act/title, optional schedule times (load-in, doors, curfew), optional support lineup, and optional QuickBooks project tag when confirmed; links to the financial lifecycle (planning, settled, reconciled) orthogonally to booking status.
- **Calendar View Context**: The operator's active combination of view mode (Global, Regional, Single-venue), selected region and/or venue, visible month, and cancelled visibility toggle.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Authorized users reach the live booking calendar from global navigation in under 3 seconds on first activation.
- **SC-002**: Users can switch among Global, Regional, and Single-venue views and change month without a full page reload, with filter changes reflected in under 1 second in user acceptance testing.
- **SC-003**: In acceptance testing with seeded data across at least three regions and five venues, 100% of placements appear on the correct venue column and calendar date in each view mode.
- **SC-004**: Booking agents correctly distinguish Hold 1, Hold 2, and Confirmed placements by visual style alone in 100% of moderated usability sessions (minimum 5 participants).
- **SC-005**: Attempting to create a second Confirmed booking on the same venue date is blocked with a clear message in 100% of tested conflict scenarios.
- **SC-006**: Creating a hold, promoting it to Confirmed, and opening the financial workspace completes successfully on the first attempt in 100% of tested happy-path flows.
- **SC-007**: Daily agenda for a date with five or more placements across three venues lists all items in correct chronological order in 100% of tested cases.
- **SC-008**: On a 375px-wide viewport, the calendar presents the stacked mobile layout with no horizontal matrix scroll required in 100% of tested screens.
- **SC-009**: Dashboard event cards show real booking status matching the calendar record in 100% of tested events after launch.
- **SC-010**: ≥80% line/branch coverage achieved across backend and frontend code for this feature (CI-enforced; Constitution III).

## Assumptions

- Booking placement status (hold tiers, confirmed, cancelled) is separate from the financial show lifecycle (planning, settled, reconciled); both may be displayed together but obey different mutation rules.
- Holds and confirmed bookings share one show record per calendar entry; promotion is a status change, not a duplicate record.
- Ledger and deal-builder structures initialize lazily when operators enter the financial workspace; confirmed calendar creation makes the show available but does not pre-populate line items.
- Region management permission aligns with existing venue-management permission (`ManagePermissions`).
- Calendar view and placement creation permission align with existing financial view permission used for event lists and workspaces; holds and Confirmed bookings share the same creation permission.
- Existing venues without a region appear under "Unassigned" until mapped; region assignment is not retroactively forced for unmigrated venues until an administrator edits them after the first region is created.
- Month-by-month navigation is sufficient for v1; continuous scroll across multiple months is out of scope.
- Drag-and-drop rescheduling on the grid, external calendar sync (Google/iCal), and automated hold expiry timers are out of scope.
- QuickBooks integration remains read-only per platform constitution; calendar displays project tag references but does not mutate QBO data.
- The dashboard mini-calendar (spec 038) remains a compact upcoming-events widget; the booking calendar is the full scheduling product.

## Dependencies

- Organization, venue, and event foundation (spec 001).
- Venue creation and management UI (spec 014).
- Event workspace, metadata edit rules, and delete guards (specs 015, 002, 004).
- Global navigation shell with Booking Calendar slot (spec 022).
- Prior placeholder behavior for Booking Calendar nav (spec 037) — superseded by this feature.
- Dashboard event card booking preview placeholder (spec 025) — replaced by real status.
- Dashboard mini-calendar date-grouping patterns (spec 038) — reference UX only; booking calendar is a separate full-page module.
- Unassigned-transactions drawer interaction patterns (spec 035) — reference for sliding panel accessibility.

## Out of Scope

- Drag-and-drop rescheduling on the calendar grid.
- External calendar synchronization (Google Calendar, iCal feeds).
- Automated hold expiry or hold approval workflows.
- Changes to QuickBooks Online write boundaries.
- Replacing or removing the dashboard mini-calendar upcoming-events widget.
