# Feature Specification: Header Venue Dropdown Region Filter

**Feature Branch**: `080-header-venue-region-filter`

**Created**: 2026-08-11

**Status**: Draft

**Input**: User description: "For the venue dropdown filter in the header, allow filter by venue or region"

**Depends on**: Header venue switcher (spec 009), region entities and venue–region assignment (spec 073), venue/region grouping and filter patterns (spec 075, spec 079)

## Clarifications

### Session 2026-08-11

- Q: When a user selects a region in the header venue dropdown, what should happen? → A: The region narrows/groups the venue list shown in the dropdown; the user still must pick a single venue to set as active. Selecting a region does not itself change the active scope — the existing single-venue (or "All Venues") scoping model from spec 009 is unchanged.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Narrow the header venue list to one region (Priority: P1)

An authenticated user who has access to venues spread across several regions opens the header venue dropdown and filters it down to a single region, so they can quickly find and select the venue they're looking for without scrolling through the full organization list.

**Why this priority**: This is the core capability requested — as organizations grow past a handful of venues, the flat list becomes hard to scan. Region filtering is the minimum viable slice that delivers value on its own.

**Independent Test**: Sign in as a user with access to venues in at least two regions, open the header venue dropdown, apply a region filter, and confirm only venues in that region (plus the "All Venues" option) are shown. Select a venue and confirm it becomes the active venue, exactly as it does today without filtering.

**Acceptance Scenarios**:

1. **Given** a signed-in user with access to venues across multiple regions, **When** they open the header venue dropdown, **Then** a region filter control is available within the dropdown.
2. **Given** the region filter is set to "All regions" (default), **When** the dropdown is open, **Then** every venue the user can access is listed, matching current behavior.
3. **Given** the user selects a specific region in the filter, **When** the list updates, **Then** only venues assigned to that region are shown as selectable options.
4. **Given** a region filter is active, **When** the user selects a venue from the filtered list, **Then** that venue becomes the active venue and downstream views reload for it, exactly as when no filter is applied.
5. **Given** a region filter is active, **When** the user clears it or selects "All regions", **Then** the full accessible venue list is restored.

---

### User Story 2 - Browse venues grouped by region (Priority: P2)

A user opens the header venue dropdown without applying any filter and sees venues organized under region headings, so they can visually locate a venue by its region even before filtering.

**Why this priority**: Grouping improves scanability for users who don't know exactly which region they want but recognize venue-to-region relationships. It complements filtering but isn't required for the core value delivered by User Story 1.

**Independent Test**: Sign in as a user with venues in two or more regions and at least one unassigned venue, open the header dropdown with no filter applied, and confirm venues appear under region section headings (with an "Unassigned" section for venues without a region).

**Acceptance Scenarios**:

1. **Given** the region filter is "All regions", **When** the dropdown opens, **Then** venues are grouped under their region's name as a section heading, ordered consistently (e.g., alphabetically by region name).
2. **Given** at least one accessible venue has no region assigned, **When** the dropdown opens ungrouped or filtered to "All regions", **Then** an "Unassigned" section lists those venues.
3. **Given** no accessible venue lacks a region, **When** the dropdown opens, **Then** no "Unassigned" section is shown.
4. **Given** the "All Venues" scope option, **When** the dropdown renders grouped or filtered, **Then** "All Venues" remains visible at the top of the list, outside any region grouping.

---

### User Story 3 - Region filter behaves sensibly with no regions or empty results (Priority: P3)

A user in an organization that hasn't set up regions yet, or one whose region filter matches no venues, still gets a clear, non-broken dropdown experience.

**Why this priority**: Edge-case handling protects the experience for organizations early in adoption or users who filter into a dead end, but it doesn't block the core filtering value delivered by P1/P2.

**Independent Test**: For an organization with zero regions, open the header dropdown and confirm the region filter is hidden. For an organization with regions, filter to a region with no assigned venues in the user's scope and confirm a clear empty message appears instead of a blank or broken list.

**Acceptance Scenarios**:

1. **Given** the organization has no regions defined, **When** the user opens the header venue dropdown, **Then** the region filter control is hidden and the dropdown behaves as it does today (flat, ungrouped list).
2. **Given** a region filter is active and no accessible venues match it, **When** the list renders, **Then** an inline empty-state message explains that no venues match the selected region, rather than showing a blank dropdown.

---

### Edge Cases

- What happens if the user's active venue falls outside the region they just filtered to? The active venue selection is unaffected by filtering alone — filtering only changes what's browsable/selectable in the dropdown until the user explicitly picks a different venue.
- What happens if a venue's region is deleted or reassigned while the dropdown is open? The next time the dropdown data is loaded, the venue reflects its current region (or moves to "Unassigned"); no stale region grouping should persist.
- What happens on a very small venue list (e.g., 2 venues, 1 region)? The region filter control still renders per the same rules (hidden only when zero regions exist), but grouping/filtering has minimal visible effect.
- How does the region filter interact with the existing "All Venues" scope option? "All Venues" is always shown, unaffected by the region filter, since it represents a scope broader than any single region.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The header venue dropdown MUST provide a control to filter the visible venue options by region, in addition to the existing flat venue list behavior.
- **FR-002**: The region filter options MUST be limited to regions that have at least one venue within the current user's venue access scope.
- **FR-003**: When a region filter is applied, the dropdown MUST show only venues assigned to that region (plus the "All Venues" scope option, unaffected by the filter).
- **FR-004**: When no region filter is applied ("All regions"), the dropdown MUST group venues under region section headings, ordered alphabetically by region name.
- **FR-005**: The dropdown MUST include an "Unassigned" grouping/filter option that shows only venues without a region, and only when at least one accessible venue has no region assigned.
- **FR-006**: Selecting a venue from a filtered or grouped list MUST set that venue as the active venue using the same mechanism as the existing (unfiltered) header dropdown — the region filter does not alter what "active venue" means or how downstream views scope to it.
- **FR-007**: If the organization has zero regions, the region filter control MUST be hidden and the dropdown MUST behave exactly as it does today (flat, ungrouped venue list).
- **FR-008**: If a region filter is active and no accessible venues match it, the dropdown MUST display an inline empty-state message rather than an empty or broken list.
- **FR-009**: The dropdown's search/typeahead (if present) MUST continue to work across the currently filtered/grouped set of venues.
- **FR-010**: The header dropdown's region filter selection MUST be evaluated fresh each time the dropdown data loads, so venues reflect their current region assignment (no stale grouping after a region reassignment).
- **FR-011**: System MUST achieve ≥80% line/branch coverage across backend and frontend for this feature (CI-enforced; Constitution III)

### Key Entities

- **Venue**: An existing entity representing a bookable location; already carries an optional region assignment. No new attributes required by this feature.
- **Region**: An existing entity representing a named grouping of venues. No new attributes required by this feature.
- **Region Filter Selection**: A transient UI state representing which region (or "All regions" / "Unassigned") is currently narrowing the header dropdown's venue list. Not a persisted business entity — see Assumptions for persistence behavior.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users in organizations with 3 or more regions can locate and select a specific venue in the header dropdown in under 10 seconds, without scrolling through unrelated regions.
- **SC-002**: 100% of venues shown in the header dropdown are grouped under the correct region heading (or "Unassigned") when no filter is applied.
- **SC-003**: Selecting a venue via a region-filtered dropdown produces the identical active-venue outcome (data scoping, downstream reload) as selecting the same venue from the unfiltered list, in 100% of cases.
- **SC-004**: Organizations with no regions configured see no behavior change or added UI clutter in the header dropdown.
- **SC-005**: ≥80% line/branch coverage achieved across backend and frontend code for this feature (CI-enforced; Constitution III)

## Assumptions

- The header dropdown's region filter is a browsing/narrowing aid only; it does not introduce a new "active region" scope. The active-venue model from spec 009 (single venue, or "All Venues") is unchanged.
- Region filter selection is expected to reset to "All regions" each time the dropdown is freshly opened in a new session, consistent with the existing per-tab, session-scoped persistence of the active venue (spec 009); it is not persisted across browser sessions like the Venues admin page's region filter (spec 075).
- Region and venue data available to the header dropdown come from the same access-scoped `venues` and `regions` endpoints already used elsewhere in the app; no new API surface is required.
- The visual presentation reuses the existing region-grouping and filtering logic already built for the Venues admin page (spec 075/079) where applicable, adapted to the header dropdown's compact popover layout.
- "Manage regions" administration (create/edit/delete) is out of scope for this feature — it already exists on the Venues admin page (spec 075).
