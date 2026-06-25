# Feature Specification: Venue Page Region Controls

**Feature Branch**: `075-venue-region-controls`

**Created**: 2026-06-25

**Status**: Draft

**Input**: User description: "Move the manage regions button to the venues page. Allow filtering by region on the venue page and on the same page, show a toggle that will group by region or keep them all together."

**Depends on**: Organization and venue foundation (spec 001), venue management UI (spec 014), region entities and venue–region assignment (spec 073)

## Clarifications

### Session 2026-06-25

- Q: In flat list mode, should each venue show its assigned region? → A: Never show region in flat mode — region is visible only in grouped mode.
- Q: How should venues be sorted in flat list mode? → A: Alphabetical by venue name.
- Q: Should the region filter and grouped/flat toggle be remembered across browser sessions? → A: Persist in browser storage across sessions (per user, per browser).
- Q: When should "Unassigned" appear in the region filter dropdown? → A: Only when at least one visible venue has no region assigned.
- Q: In grouped mode, how should regions with zero venues in the current view be handled? → A: Show the region heading with an inline "No venues" empty message.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Manage regions from the Venues page (Priority: P1)

As an organization administrator, I need to create, edit, and delete regions from the Venues page instead of the Booking Calendar, so venue and territory administration live together in one logical place.

**Why this priority**: Relocating region management is the explicit user request and removes a misplaced control from the calendar workflow. Administrators expect venue-related configuration on the Venues page.

**Independent Test**: Sign in as a user with venue-management permission, open the Venues page, activate "Manage regions," create a region, edit its name or notes, and confirm the region is available for venue assignment. Confirm the same control no longer appears on the Booking Calendar.

**Acceptance Scenarios**:

1. **Given** a user with permission to manage venues and regions, **When** they open the Venues page, **Then** a "Manage regions" control is visible in the page header alongside existing venue actions.
2. **Given** the user activates "Manage regions" on the Venues page, **When** the region management panel opens, **Then** they can create, edit, and delete regions with the same capabilities that existed when the control lived on the Booking Calendar.
3. **Given** a user without venue-management permission, **When** they open the Venues page, **Then** the "Manage regions" control is not shown.
4. **Given** this feature has shipped, **When** a user opens the Booking Calendar, **Then** the "Manage regions" control is no longer present in the calendar header or controls.
5. **Given** a region still has venues assigned, **When** the user attempts to delete that region from the Venues page panel, **Then** deletion is blocked with a clear message to reassign venues first (consistent with spec 073).

---

### User Story 2 - Filter the venue list by region (Priority: P1)

As an operator overseeing many properties, I need to filter the venue list to one region (or all regions), so I can focus on venues in a specific territory without scanning the full organization list.

**Why this priority**: Region filtering is a core part of the request and makes the venue list actionable for multi-region organizations.

**Independent Test**: Seed venues across two regions and one unassigned group. Select each region in the filter and confirm only matching venues appear. Select "All regions" and confirm the full accessible list returns.

**Acceptance Scenarios**:

1. **Given** multiple regions and venues with region assignments, **When** the Venues page loads, **Then** a region filter control is available above or beside the venue list with an "All regions" default that shows every accessible venue.
2. **Given** the venue list is showing all regions, **When** the user selects a specific region, **Then** only venues assigned to that region are listed.
3. **Given** at least one visible venue has no region assignment, **When** the user opens the region filter, **Then** an "Unassigned" option is available and lists only venues with no region.
4. **Given** all visible venues are assigned to a region, **When** the user opens the region filter, **Then** no "Unassigned" option is shown.
5. **Given** a region filter is active, **When** the user switches back to "All regions," **Then** the full accessible venue list is restored.
6. **Given** a region filter is active and no venues match, **When** the list renders, **Then** an empty-state message explains that no venues match the selected region (not a loading or error state).
7. **Given** the organization has no regions yet, **When** the Venues page loads, **Then** the region filter is hidden or disabled with copy indicating regions can be created via "Manage regions."

---

### User Story 3 - Toggle grouped vs flat venue display (Priority: P2)

As an operator reviewing venue inventory, I need to switch between a flat alphabetical list and a list grouped under region headings, so I can scan venues either as one roster or by territory.

**Why this priority**: Grouping improves scanability for multi-region orgs but is secondary to filtering and relocating region management.

**Independent Test**: With venues in at least two regions plus unassigned venues, toggle grouping on and confirm region section headings with nested venues; toggle off and confirm a single flat table/list without section breaks.

**Acceptance Scenarios**:

1. **Given** the Venues page is displaying venues, **When** the page loads, **Then** a display toggle is available with two modes: flat list (default) and grouped by region.
2. **Given** grouped mode is selected, **When** venues render, **Then** they appear under section headings for each region name, with unassigned venues under a distinct "Unassigned" heading; venues within each section are sorted alphabetically by name; region sections with no venues in the current view show the heading with an inline "No venues" message.
3. **Given** flat mode is selected, **When** venues render, **Then** they appear in one continuous list without region section headings and without a region column or inline region label.
4. **Given** a region filter is active, **When** grouped mode is on, **Then** only the filtered region's section (or unassigned section) is shown—grouping does not override the active filter.
5. **Given** the user changes the display toggle, **When** the selection updates, **Then** the list re-renders immediately without a full page reload.
6. **Given** the user changes the display toggle or region filter, **When** they leave and later return to the Venues page in the same browser, **Then** their last filter and display mode selections are restored.

---

### Edge Cases

- What happens when the user has venue scope restrictions and can only see a subset of venues? Filtering and grouping apply only to venues the user is permitted to see; region filter options include only regions that contain at least one visible venue (plus "All regions" and "Unassigned" when applicable).
- What happens when a venue's region is changed while the Venues page is open? After a successful edit elsewere on the page, the list refreshes and the venue appears under the correct filter and group on the next render.
- What happens when a region exists but has no venues in the current view (e.g., newly created region or all venues filtered out)? In grouped mode, the region section heading is shown with an inline "No venues" message; in flat mode with an active region filter, the standard empty-filter state applies.
- What happens when the last venue in a filtered region is deleted? The list shows the empty filter state; the region remains selectable in the filter if other venues could be assigned later.
- What happens on small viewports? Filter, grouping toggle, and "Manage regions" remain reachable without horizontal scrolling breaking primary actions; controls may stack vertically.
- What happens when regions are loading or fail to load? Venue list still renders from venue data; region filter and grouping degrade gracefully (filter hidden or disabled with retry) without blocking venue viewing.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Venues page MUST expose a "Manage regions" entry point for users with venue-management permission that opens the existing region management workflow (create, edit, delete regions with name and optional notes).
- **FR-002**: The Booking Calendar MUST NOT expose a "Manage regions" entry point after this feature ships; region administration is solely initiated from the Venues page.
- **FR-003**: The Venues page MUST provide a region filter with at least: "All regions" (default), one option per organization region that contains at least one visible venue, and "Unassigned" only when at least one visible venue has no region assigned.
- **FR-004**: When a specific region or "Unassigned" is selected in the region filter, the venue list MUST include only venues matching that selection among venues the user is permitted to access.
- **FR-005**: The Venues page MUST provide a display toggle with two states: flat list (default) and grouped by region.
- **FR-006**: In grouped mode, venues MUST be organized under headings labeled with region names, with venues lacking a region under an "Unassigned" heading; region sections SHOULD be ordered consistently (e.g., alphabetically by region name, with "Unassigned" last); venues within each section MUST be sorted alphabetically by name; region sections with zero venues in the current filtered view MUST still render the heading with an inline "No venues" message.
- **FR-007**: In flat mode, venues MUST appear in a single list sorted alphabetically by venue name, without region section headings, region column, or inline region label; region assignment is conveyed only in grouped mode.
- **FR-008**: Region filter and display toggle MUST compose correctly: an active region filter limits both flat and grouped views to matching venues only.
- **FR-008a**: The active region filter and display toggle (flat vs grouped) MUST be persisted in browser storage per browser so they are restored on subsequent visits; first-time visitors default to "All regions" and flat list.
- **FR-009**: Users without venue-management permission MUST NOT see "Manage regions" but MAY use region filter and display toggle when viewing the venue list.
- **FR-010**: Empty states MUST distinguish "no venues in organization," "no venues match filter," and load/error conditions with clear, distinct messaging.
- **FR-011**: Region management panel behavior for blocked deletion (venues still assigned) MUST remain consistent with spec 073 requirements.
- **FR-012**: The feature MUST achieve ≥80% line/branch coverage across backend and frontend for changed code (CI-enforced; Constitution III).

### Key Entities

- **Region**: A named geographic or operational territory within an organization; has optional notes; venues may be assigned to exactly one region or remain unassigned.
- **Venue**: A bookable property belonging to an organization; may reference an optional region assignment (introduced in spec 073).
- **Venue list view preferences**: Browser-persisted UI state for the active region filter and grouped-vs-flat display mode on the Venues page; restored on return visits within the same browser.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of users with venue-management permission can reach region create/edit/delete flows from the Venues page without visiting the Booking Calendar.
- **SC-002**: Users can filter a 50-venue organization to a single region and see only matching venues within one interaction (select filter → list updates).
- **SC-003**: Users can switch between flat and grouped display modes and see the list update within one second on typical hardware without a full page reload.
- **SC-004**: In moderated task completion, 90% of test participants correctly locate region management on the Venues page on the first attempt (validates relocation discoverability).
- **SC-005**: Zero regression in existing venue list capabilities (view, edit, delete, add venue) when no filter is applied and flat mode is active.
- **SC-006**: ≥80% line/branch coverage achieved across backend and frontend code for this feature (CI-enforced; Constitution III).

## Assumptions

- Region entities, venue `regionId` assignment, and the region management panel introduced in spec 073 are available; this feature relocates and extends UI only—no new region data model is required unless filter/grouping needs minor API enrichment (e.g., region name on venue list responses already present).
- Default region filter is "All regions"; default display mode is flat list for first-time visitors with no stored preferences.
- Filter and display toggle preferences are persisted in browser storage across sessions (per browser), consistent with other module view preferences in the product; users return to their last selections on subsequent visits.
- "Manage regions" permission aligns with existing venue-management permission (`ManagePermissions` / `useCanManageVenues`) used for add/edit/delete venue actions.
- Booking Calendar retains region-based *view* filtering for calendar layouts (spec 073); only the *administration* entry point moves to Venues.
- Venue list continues to respect per-user venue scope rules from spec 001; filter options derive from visible venues only.
