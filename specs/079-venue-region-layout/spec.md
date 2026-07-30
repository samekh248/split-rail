# Feature Specification: Venues Page Region/Venue Visual Organization

**Feature Branch**: `079-venue-region-layout`

**Created**: 2026-07-29

**Status**: Draft

**Input**: User description: "the Venues page doesn't have good visual organization of regions vs venues, especially when there are no regions. It looks disjointed."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Coherent Venues page when no regions exist (Priority: P1)

A user in an organization that has never created any regions opens the Venues page. Today they see a mix of controls (a "By region"/"List" toggle, a "Manage regions" button, and a helper message about creating regions) alongside a venue list, and switching to "By region" produces a single section labeled "Unassigned" — which reads as broken or half-finished rather than intentional. This user should instead see a clean, single, coherent venue list with no dangling region-grouping affordances or empty/meaningless "Unassigned" grouping, and a clear, well-integrated prompt (for users who can manage venues) that they can organize venues into regions if they choose to.

**Why this priority**: This is the specific pain point raised — the "no regions" state currently looks disjointed and is the most common state for smaller or newly-onboarded organizations, so it is the highest-value fix.

**Independent Test**: Load the Venues page for an organization with one or more venues and zero regions. Verify the page presents a single unified list (no region filter, no "By region" toggle, no bare "Unassigned" heading) and that any prompt to create regions reads as an integrated part of the page rather than a floating, disconnected line of text.

**Acceptance Scenarios**:

1. **Given** an organization with venues and zero regions, **When** the user opens the Venues page, **Then** the page shows a single venue list without a region filter control, without a "By region" display toggle, and without any "Unassigned" section heading.
2. **Given** an organization with venues and zero regions, **When** a user who can manage venues opens the Venues page, **Then** they see one clearly-placed prompt/action to create regions, visually grouped with the page's other management controls rather than appearing as a disconnected helper line.
3. **Given** an organization with venues and zero regions, **When** a user who cannot manage venues opens the Venues page, **Then** they see only the venue list with no region-management prompts, filters, or toggles.

---

### User Story 2 - Clear visual hierarchy between regions and their venues (Priority: P2)

A user in an organization that has defined regions switches the Venues page to the grouped ("By region") view. Each region should read as a distinct, clearly-titled group containing its venues, with unassigned venues (if any) presented as their own clearly-labeled group — so that at a glance, the user can tell which venues belong to which region without the sections blending together.

**Why this priority**: Once regions exist, the grouped view is the primary way users make sense of a multi-region venue portfolio; poor visual separation here undermines the whole point of grouping.

**Independent Test**: Load the Venues page for an organization with two or more regions (with venues distributed across regions and some left unassigned) in "By region" mode. Verify each region group and the "Unassigned" group are visually distinct (clear heading, consistent spacing/boundaries) and that empty regions are handled the same, predictable way every time.

**Acceptance Scenarios**:

1. **Given** an organization with multiple regions and venues assigned across them, **When** the user views the grouped display, **Then** each region appears as its own visually distinct group with a clear heading, and the boundary between one region's venues and the next region's venues is unambiguous.
2. **Given** an organization with at least one region that currently has no venues assigned to it, **When** the user views the grouped display, **Then** that region's empty state is presented consistently with how emptiness is communicated elsewhere on the page (not a jarring blank gap).
3. **Given** an organization with regions and at least one unassigned venue, **When** the user views the grouped display, **Then** the "Unassigned" group is visually distinguishable from named regions (e.g., so it doesn't read as "just another region").

---

### User Story 3 - Consistent experience switching between list and grouped views (Priority: P3)

A user who can see both display modes (flat list and grouped-by-region) toggles between them. The transition should feel like two views of the same coherent page, not two unrelated layouts bolted together — consistent header, controls, spacing, and empty-state treatment in both modes.

**Why this priority**: This polish reinforces the fix from User Story 1 and 2 but is lower priority since it only affects orgs actively toggling between modes, which requires regions to exist in the first place.

**Independent Test**: With an organization that has regions defined, toggle between "List" and "By region" repeatedly and confirm the surrounding page chrome (header, filter/toggle controls, spacing) remains stable and only the venue-listing area changes.

**Acceptance Scenarios**:

1. **Given** an organization with regions defined, **When** the user switches the display mode from "List" to "By region" and back, **Then** the page header, filter controls, and overall spacing remain visually consistent across both modes.

---

### Edge Cases

- What happens when an organization has regions defined but every venue is unassigned (no venue has a region)? The grouped view would show only an "Unassigned" group and every named region as empty — this must still read as intentional, not broken.
- What happens when an organization has exactly one region and all venues belong to it? Grouping by a single region should not look sparser or more awkward than showing no groups at all.
- What happens when a user without venue-management permission views the page for an organization with zero regions? They must not see any region-management prompt, since they cannot act on it.
- What happens while regions or venues are still loading? The page must not flash the "no regions" layout and then immediately swap to the "has regions" layout once data arrives.
- What happens when the region filter is applied and then all regions are subsequently deleted (or the last venue in a region is removed) while the user is on the page? The page must fall back to the no-regions/no-groups presentation without requiring a manual refresh.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST NOT display a region filter control or a "By region"/"List" display toggle on the Venues page when the organization has zero regions defined.
- **FR-002**: System MUST render venues as a single unified list (no grouping headings, including no "Unassigned" heading) when the organization has zero regions defined, regardless of any previously-saved display mode preference.
- **FR-003**: System MUST present, for users who can manage venues, exactly one clearly-integrated prompt to create regions when the organization has zero regions defined, styled as part of the page's controls rather than as an isolated line of helper text.
- **FR-004**: System MUST NOT show any region-related prompt, filter, or toggle to users who cannot manage venues when the organization has zero regions defined.
- **FR-005**: System MUST visually distinguish each region group from adjacent region groups in the grouped display (e.g., through consistent heading style and spacing) when the organization has one or more regions defined.
- **FR-006**: System MUST visually distinguish the "Unassigned" group from named-region groups in the grouped display, so unassigned venues are not mistaken for a named region.
- **FR-007**: System MUST present empty regions (regions with no currently-visible venues) in the grouped display using a consistent, clearly-labeled empty indicator rather than an unlabeled blank area.
- **FR-008**: System MUST keep the Venues page header, filter/toggle controls, and overall layout structure visually consistent whether the venue-listing area is in flat-list or grouped-by-region mode.
- **FR-009**: System MUST NOT display a transitional or incorrect layout (e.g., briefly showing region controls before data loads) while region and venue data are still being fetched.
- **FR-010**: System MUST re-evaluate and, if necessary, switch the page presentation (e.g., from grouped to unified list) when the organization's region count changes to zero while the page is open, without requiring a manual page refresh.
- **FR-011**: System MUST achieve ≥80% line/branch coverage across backend and frontend for this feature (CI-enforced; Constitution III).

### Key Entities

- **Venue**: A place an organization manages events at; may optionally belong to one Region.
- **Region**: An organization-defined grouping label used to organize venues geographically or administratively; an organization may have zero or more Regions.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users in organizations with zero regions no longer see any region-grouping control (filter, display toggle, or "Unassigned" heading) on the Venues page.
- **SC-002**: In a usability comparison, at least 90% of users can correctly identify which venues belong to which region within 5 seconds of viewing the grouped display for an organization with multiple regions.
- **SC-003**: Support/feedback reports describing the Venues page layout as "confusing," "broken," or "disjointed" drop to zero after release.
- **SC-004**: The Venues page displays the correct layout (unified list vs. grouped) on first paint for the organization's current region count, with no visible layout shift once data finishes loading.
- **SC-005**: ≥80% line/branch coverage achieved across backend and frontend code for this feature (CI-enforced; Constitution III).

## Assumptions

- The underlying Region and Venue data models and their assignment relationship (a Venue optionally belongs to one Region) are unchanged by this feature; this is a presentation/organization fix, not a data-model change.
- "Users who can manage venues" refers to the existing venue-management permission already used elsewhere on this page (e.g., to show/hide the "Add venue" and "Manage regions" actions); no new permission is introduced.
- The previously-saved display-mode preference (flat vs. grouped) is only meaningful once an organization has at least one region; when an organization has zero regions, the page always shows the unified list regardless of the saved preference, and the saved preference is honored again once regions exist.
- No new region-creation workflow is introduced by this feature; the existing "Manage regions" panel is reused, only its presentation/placement on the Venues page changes.
- Visual hierarchy improvements (spacing, headings, empty-state treatment) apply consistently across desktop and mobile layouts already supported by the page.
