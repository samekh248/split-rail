# Feature Specification: Venue Drag-and-Drop Region Reassignment & Region Deletion Handling

**Feature Branch**: `081-venue-drag-drop-regions`

**Created**: 2026-08-13

**Status**: Draft

**Input**: User description: "the venues on the venue management page should be drag and drop between regions, with a handle visual on the left side of the row. The actions column needs to align to the right. The add venue button needs to pop the form up in a modal, not a new page. When removing a region with venues in it, add a prompt to either allow the deletion of the venues too, or give the user the ability to move the venues to another region. Don't allow them to move them to multiple regions."

**Depends on**: Region entities and venue–region assignment (spec 073), Venues page region layout and per-region Add venue action (spec 075, spec 079, spec 081-prior "per-region Add venue buttons" work)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Reassign a venue to a different region via drag-and-drop (Priority: P1)

As an admin managing many venues across regions, I want to drag a venue from one region's section to another and drop it there, so I can quickly reorganize venues without opening an edit form for each one.

**Why this priority**: This is the headline capability requested and the most direct way to reduce the friction of managing venue-to-region assignments at scale.

**Independent Test**: With at least two regions and a venue assigned to one, open the Venues page grouped view, drag the venue's row (via its handle) into a different region's section, and confirm the venue now appears under the new region and the change persists after a page reload.

**Acceptance Scenarios**:

1. **Given** a venue-management user viewing the grouped Venues page, **When** they view a venue row, **Then** a drag handle is visible on the left side of that row.
2. **Given** the grouped view with at least two region sections, **When** the user drags a venue's row from its current section and drops it onto a different region's section, **Then** the venue moves to that section and its region assignment is updated.
3. **Given** a successful drag-and-drop reassignment, **When** the page is reloaded, **Then** the venue still appears under its new region.
4. **Given** a drag-and-drop reassignment that fails to save, **When** the failure occurs, **Then** the venue returns to its original region section and an error message is shown.
5. **Given** a user without venue-management permission, **When** they view the grouped Venues page, **Then** no drag handles are shown and venues cannot be reassigned by dragging.
6. **Given** the grouped view with an "Unassigned" section, **When** the user drags a venue onto the "Unassigned" section, **Then** the venue's region assignment is cleared.

---

### User Story 2 - Resolve venues when deleting a region (Priority: P2)

As an admin cleaning up regions, I want to be prompted to either delete a region's venues along with it or move them to another region, so I no longer hit a dead end when trying to delete a region that still has venues assigned.

**Why this priority**: This directly fixes an existing blocked workflow — today, region deletion is refused outright whenever venues are assigned, with no path forward offered in the UI.

**Independent Test**: Create a region with at least one assigned venue and at least one other region available, attempt to delete the venue-holding region, and confirm a choice is presented; verify both the "delete venues" and "move venues" paths complete successfully and leave the system in a consistent state.

**Acceptance Scenarios**:

1. **Given** a region with zero assigned venues, **When** an admin deletes it, **Then** it is removed immediately with no additional prompt (unchanged from today).
2. **Given** a region with one or more assigned venues and at least one other region available, **When** an admin attempts to delete it, **Then** they are prompted to choose between deleting the venues along with the region or moving the venues to another region.
3. **Given** the deletion prompt, **When** the admin chooses to delete the venues too, **Then** the region and all of its venues are permanently removed.
4. **Given** the deletion prompt, **When** the admin chooses to move the venues and selects a single destination region, **Then** all of the region's venues are reassigned to that destination region and the original region is removed.
5. **Given** the deletion prompt, **When** the admin is choosing a destination region, **Then** they can only select one region as the destination — there is no way to split the venues across multiple regions.
6. **Given** a region with assigned venues and no other region exists in the organization, **When** an admin attempts to delete it, **Then** only the "delete the venues too" option is available.

---

### User Story 3 - Add a venue without leaving the Venues page (Priority: P3)

As an admin adding a venue to a specific region, I want the "Add venue" action to open directly on the Venues page instead of navigating to a separate page, so I can stay in context while managing my regions and venues.

**Why this priority**: This is a workflow refinement to the existing region-scoped add-venue action; valuable but not blocking compared to the reassignment and deletion capabilities above.

**Independent Test**: From a region's "Add venue" button, confirm a modal opens on the current page (no navigation), the region is already fixed with no selector shown, and submitting successfully creates the venue in that region and closes the modal.

**Acceptance Scenarios**:

1. **Given** a region section's "Add venue" button, **When** an admin clicks it, **Then** a modal opens on the same page without navigating away.
2. **Given** the add-venue modal, **When** it opens, **Then** no region selector is shown — the region is fixed to the section the button belongs to.
3. **Given** the add-venue modal with a valid name entered, **When** the admin submits, **Then** the venue is created in the fixed region, the modal closes, and the new venue appears in that region's section.
4. **Given** the add-venue modal, **When** the admin cancels or closes it, **Then** no venue is created and the modal closes without navigating away from the Venues page.

---

### User Story 4 - Actions column aligns to the right (Priority: P4)

As an admin scanning the venue table, I want the row action buttons to line up along the right edge of the table, so the table reads cleanly regardless of column widths.

**Why this priority**: A small visual polish item, independent of the other behavioral changes in this feature.

**Independent Test**: View the grouped venue table as a venue-management user and confirm the Actions column's content is aligned to the right edge of the table.

**Acceptance Scenarios**:

1. **Given** a venue-management user viewing the grouped venue table, **When** the table renders, **Then** the Actions column's buttons are aligned to the right edge of the table.

---

### Edge Cases

- What happens when a venue is dragged and dropped onto the region section it already belongs to? No change occurs.
- What happens if a drag-and-drop reassignment is attempted while the region filter is narrowed to a single visible region section? Dragging remains available on that section's rows, but there is no other section visible to drop onto until the filter is reset (see Assumptions).
- What happens if a venue is dragged while a previous reassignment for that same venue is still saving? The system must not allow a second drag to start until the in-flight save resolves, to avoid conflicting updates.
- What happens if the region selected as the "move venues" destination is deleted by someone else between opening the deletion prompt and confirming it? The action must re-validate the destination region exists at confirmation time and show an error instead of silently succeeding against a stale target.
- What happens when deleting a region whose venues include ones with in-progress or historical events? Deleting those venues (via the "delete venues too" choice) follows the same permanent-removal behavior as deleting a single venue today, which already removes its events and ledger data.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The grouped venue list MUST display a drag handle on the left side of each venue row for users with venue-management permission.
- **FR-002**: Users with venue-management permission MUST be able to drag a venue row from its current region section and drop it onto a different region section to reassign that venue's region.
- **FR-003**: A drag-and-drop reassignment MUST update the venue's region and move it to the target section without a full page reload.
- **FR-004**: If a drag-and-drop reassignment fails to save, the system MUST return the venue to its original region section and display an error message.
- **FR-005**: Users without venue-management permission MUST NOT see drag handles or be able to reassign venues via drag-and-drop.
- **FR-006**: Dragging a venue onto the "Unassigned" section MUST clear its region assignment.
- **FR-007**: The Actions column in the grouped venue table MUST be right-aligned so its buttons are flush with the right edge of the table.
- **FR-008**: The "Add venue" action MUST open a modal dialog scoped to the region whose button was clicked, without navigating away from the Venues page.
- **FR-009**: The add-venue modal MUST NOT include a region selector; the region is fixed to the section the action was triggered from.
- **FR-010**: Successfully creating a venue via the modal MUST close the modal, show the venue in the correct region section, and set it as the active venue — consistent with today's creation behavior.
- **FR-011**: When an admin attempts to delete a region that has one or more assigned venues, the system MUST present a choice before proceeding: delete the region along with its venues, or move its venues to a single other existing region and then delete the region.
- **FR-012**: If no other region exists to receive venues, the system MUST offer only the "delete the venues along with the region" option.
- **FR-013**: The system MUST NOT allow a region's venues to be split across multiple destination regions in a single deletion action — all reassigned venues MUST move to the one region the admin selects.
- **FR-014**: Deleting a region with the "delete venues too" choice MUST permanently remove the region and all of its assigned venues.
- **FR-015**: Deleting a region with the "move venues" choice MUST reassign all of its venues to the selected destination region before removing the region, with no venue data lost.
- **FR-016**: Deleting a region with zero assigned venues MUST continue to work exactly as it does today, with no additional prompt.
- **FR-017**: System MUST achieve ≥80% line/branch coverage across backend and frontend for this feature (CI-enforced; Constitution III)

### Key Entities

- **Venue**: Existing entity; the subject of drag-and-drop reassignment and of the region-scoped add-venue modal. Its region assignment (optional, single region) changes as a result of both capabilities in this feature.
- **Region**: Existing entity; the drag-and-drop target and the entity whose deletion now triggers a resolution choice when it still has assigned venues.
- **Region Deletion Resolution**: A transient, in-the-moment choice (not a persisted entity) made by the admin when deleting a region with assigned venues — either "delete the venues too" or "move the venues to region X" — that determines how the deletion proceeds.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can reassign a venue to a different region in a single drag-and-drop action, without opening a separate edit form, in under 5 seconds.
- **SC-002**: 100% of venue reassignments via drag-and-drop are reflected correctly in the target region's section immediately after the action completes, and persist across a page reload.
- **SC-003**: Users can add a venue to a specific region without ever leaving the Venues page.
- **SC-004**: 100% of region deletion attempts involving assigned venues present the admin with a clear choice and complete without leaving any venue in an inconsistent (orphaned or split-region) state.
- **SC-005**: ≥80% line/branch coverage achieved across backend and frontend code for this feature (CI-enforced; Constitution III)

## Assumptions

- Drag-and-drop is a desktop/mouse-oriented interaction for this feature; equivalent keyboard-only or touch-based reordering is not required beyond the accessibility affordances already established elsewhere in the app.
- Drag-and-drop reassignment is primarily exercised in the "All regions" grouped view where multiple region sections are visible at once; when a region filter narrows the view to a single section, there is simply no other section visible to drop onto until the filter is reset — this is existing filter behavior, not a new restriction.
- The existing single-venue update capability (already used by the venue edit flow to change a venue's region) is reused as the underlying mechanism for the drag-and-drop reassignment action; no new venue data fields are introduced.
- "Delete the venues too" during region deletion follows the same permanent-deletion behavior (including associated events and ledger data) as the existing single-venue delete confirmation — this feature does not introduce new destructive-action safeguards beyond what already exists for deleting a single venue.
- The add-venue modal replaces the page-navigation flow used by the per-region "Add venue" buttons; the region is always pre-determined by which region's control was used, consistent with the no-selector behavior already in place.
- Region deletion, and the new venue-resolution choice that accompanies it, remain gated behind the same permission that already governs region management today; no new permission tier is introduced.
