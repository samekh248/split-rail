# Feature Specification: Itinerary Block Interactive Scheduling

**Feature Branch**: `085-itinerary-block-dnd`

**Created**: 2026-08-18

**Status**: Draft

**Input**: User description: "The itinerary interface needs to have better interactive UX. Blocks need to be click and draggable. Clicking on a time should pop up the block form starting at that time on that stage/zone. Clicking and dragging the top or bottom to other times should expand the time for that block. If it overlaps a block that already exists, dont allow it. Blocks should also be able to be drag n drop between stages/zones."

**Depends on**: Multi-day festival itinerary and programming blocks (spec 082), venue visual cleanup of itinerary surfaces (spec 084)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create a block by clicking an empty time on a stage (Priority: P1)

As an operations scheduler building a festival day, I need to click an empty time on a stage or zone and have the programming-block form open already set to that stage and start time, so I can add an act without hunting through day/stage/time fields.

**Why this priority**: Empty-slot creation is the fastest way to populate a timeline and is the gap most felt when the itinerary is still sparse. It delivers value even if move and resize ship later.

**Independent Test**: Open a festival itinerary with at least two stages. Click an empty slot (for example, Main Stage at 14:00). Confirm the block form opens with that stage and start time filled, and that saving creates a block in that position.

**Acceptance Scenarios**:

1. **Given** a festival itinerary in timeline view with an empty slot on a stage at a visible time, **When** a user with schedule-edit permission clicks that slot, **Then** the programming-block form opens with that stage/zone, the current itinerary day, and that start time pre-filled.
2. **Given** the form opened from an empty slot, **When** it appears, **Then** the proposed end time defaults to one timeline interval after the clicked start (30 minutes) so the new block occupies a single visible slot until the user changes it.
3. **Given** the form opened from an empty slot, **When** the user completes required fields and saves a non-overlapping block, **Then** the new block appears on that stage at the chosen times and the form closes.
4. **Given** a user without schedule-edit permission, or a read-only / public itinerary view, **When** they click an empty slot, **Then** no create form opens and the timeline remains unchanged.
5. **Given** a slot already occupied by an active block, **When** the user clicks, **Then** the existing block is selected (its form opens) rather than a create form for a second overlapping block.

---

### User Story 2 - Move a block by dragging it, including across stages (Priority: P1)

As a scheduler rearranging a dense day, I need to grab a programming block and drop it onto another time or another stage/zone so placement feels direct. A click without a drag still opens the block so I can edit details.

**Why this priority**: Moving existing acts is the core interactive loop of itinerary work. Cross-stage moves are required so the timeline is a true multi-track board, not a per-column list.

**Independent Test**: Seed two stages with one movable block. Click the block (no drag) and confirm its form opens. Drag the same block to a later empty time on the same stage and to an empty time on the other stage; both saves succeed and the block’s duration is preserved.

**Acceptance Scenarios**:

1. **Given** an active programming block on the timeline and a user with schedule-edit permission, **When** they click the block without dragging, **Then** the existing block form opens for that block.
2. **Given** the same block, **When** they press and drag the block body (not only a small handle) onto another empty time on the same stage, **Then** the block moves to that start time, keeps its duration, and the previous slot is freed.
3. **Given** the same block, **When** they drop it onto an empty time on a different stage/zone, **Then** the block is reassigned to that stage/zone at the drop start time with duration unchanged.
4. **Given** a drag in progress, **When** the pointer hovers a valid empty target, **Then** the timeline shows a clear valid-drop preview at the prospective start and end.
5. **Given** a user without schedule-edit permission, **When** they try to drag a block, **Then** the block does not move.
6. **Given** a canceled block, **When** a scheduler views the timeline, **Then** it is not treated as a movable active placement (it does not occupy the board for drop targeting the way an active block does).

---

### User Story 3 - Resize a block by dragging its start or end (Priority: P2)

As a scheduler tuning a set length, I need to drag the top or bottom edge of a block to a new time so duration changes in place, without opening the form for a simple time tweak.

**Why this priority**: Resize is the remaining direct-manipulation gap after create and move. Duration can already be edited in the form, so this is a speed improvement rather than a new capability.

**Independent Test**: Seed a 60-minute block with empty time before and after it. Drag the end later by one interval and the start earlier by one interval; confirm times update and no other block is affected. Attempt a resize that would overlap a neighbor and confirm it is refused.

**Acceptance Scenarios**:

1. **Given** an active block with empty time after it, **When** a scheduler drags the end (bottom) edge to a later slot, **Then** the end time updates to that slot, the start time stays the same, and the block grows on the timeline.
2. **Given** an active block with empty time before it, **When** they drag the start (top) edge to an earlier slot, **Then** the start time updates, the end time stays the same, and the block grows upward.
3. **Given** a resize in progress, **When** they drag an edge earlier or later within the same stage, **Then** a live preview shows the prospective duration before they release.
4. **Given** a resize that would make duration shorter than one timeline interval, **When** they release, **Then** the change is not applied and the block stays at its previous times.
5. **Given** a resize that would push start or end outside the visible timeline day bounds, **When** they release, **Then** the change is not applied.
6. **Given** a click on the block body versus a drag on an edge, **When** the pointer is on the edge handle, **Then** the interaction resizes rather than opening the form or moving the whole block.

---

### User Story 4 - Refuse overlapping placements on the same stage (Priority: P1)

As a scheduler, I need the timeline to refuse any create, move, or resize that would overlap another active block on the same stage/zone, so two acts never share the same stage at the same time.

**Why this priority**: Overlap protection is what makes drag-and-drop safe. Without it, faster interaction would create invalid schedules.

**Independent Test**: Place two active blocks on the same stage with a gap between them. Drag the first onto the second’s time, resize the first into the second, and try to create from a slot that would overlap; all three are refused with the conflicting block identified. Drop the first onto a different stage at the same clock time and confirm that concurrent placement is allowed.

**Acceptance Scenarios**:

1. **Given** two active blocks on the same stage/zone and day, **When** a move, resize, or create would cause their scheduled times to overlap, **Then** the change is not saved, the conflicting block is identified, and the original times remain.
2. **Given** such an invalid drag or resize in progress, **When** the pointer is over the conflicting region, **Then** the timeline shows an invalid/conflict preview and does not treat that drop as allowed.
3. **Given** two active blocks on **different** stages at overlapping clock times, **When** a scheduler moves or resizes either, **Then** the concurrent times remain allowed — only same-stage overlap is refused.
4. **Given** a canceled block occupying a former time, **When** an active block is moved or resized into that time on the same stage, **Then** the placement is allowed.
5. **Given** a refused overlap, **When** the scheduler dismisses the conflict, **Then** they can immediately try a different time or stage without the refused change having been stored.

---

### Edge Cases

- A drop that lands on the same stage and start time as the block already has is a no-op (no save, no conflict).
- Dragging across the day switcher does not change the festival day in this feature; moves and resizes stay on the currently selected day.
- If a save fails because another user booked the slot first, the timeline restores the previous placement and shows the conflict rather than leaving a half-moved block.
- Blocks that are pending a save (in flight) cannot be dragged or resized again until the previous save completes.
- Frozen, settled, or otherwise immutable events do not allow create, move, or resize from the timeline.
- Narrow viewports must still allow create-from-slot and open-on-click; drag and resize remain available where pointer input exists, with the block form as the fallback for time/stage edits.
- Filters that hide a stage also hide that stage as a drop target; a block cannot be dropped onto a stage that is not currently shown.
- Touch/pointer: a short press is a click (open form); a press-and-move is a drag. Edge handles remain large enough to grab without accidentally opening the form.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Users with schedule-edit permission MUST be able to click an empty timeline slot on a stage/zone and open the programming-block create form pre-filled with that itinerary day, that stage/zone, and that slot’s start time.
- **FR-002**: A create form opened from an empty slot MUST default the end time to one timeline interval (30 minutes) after the clicked start. The user MAY change start and end in the form before saving.
- **FR-003**: Clicking an existing active block (without dragging) MUST open that block’s existing edit form. Clicking must remain distinguishable from a drag.
- **FR-004**: Users with schedule-edit permission MUST be able to drag a block by its body to a new start time on the same stage or onto a different stage/zone. Duration MUST be preserved on move unless the user is resizing.
- **FR-005**: Users with schedule-edit permission MUST be able to drag the start (top) or end (bottom) edge of a block to a new time on the same stage, updating only the dragged bound and leaving the other bound unchanged.
- **FR-006**: Moves and resizes MUST snap to the timeline’s time intervals. Duration after resize MUST be at least one interval. Times MUST remain within the visible timeline day bounds.
- **FR-007**: Any delete, remove, or irreversible cancel action MUST use the Constitution §XI confirmation modal pattern (see `.specify/memory/delete-confirmation.md`) before mutating server state. This feature does not add a new delete flow; existing block cancel/remove continues to follow that rule.
- **FR-008**: The system MUST refuse to save a create, move, or resize whose active scheduled time overlaps another active block on the same stage/zone and day. The UI MUST show an invalid preview during the pointer gesture, identify the conflicting block if a save is attempted, and leave prior times unchanged. Canceled blocks MUST NOT participate in overlap checks.
- **FR-009**: Overlapping clock times on **different** stages/zones MUST remain allowed (concurrent programming). Same-artist overlap warnings from spec 082 remain warnings, not hard blocks.
- **FR-010**: Users without schedule-edit permission, and anyone viewing the public itinerary, MUST NOT be able to open create-from-slot, move, or resize. Clicking a visible block MAY still open a read-only detail where that already exists.
- **FR-011**: Create, move, and resize from the timeline MUST respect existing festival immutability: they MUST NOT apply on frozen or settled events, and they MUST record schedule-change history for successful reschedules as already required by spec 082.
- **FR-012**: During a valid drag or resize, the timeline MUST preview the prospective placement. During an invalid same-stage overlap, it MUST preview a conflict state and MUST NOT complete the drop as a successful save.
- **FR-013**: A successful move or resize MUST update the on-timeline position immediately after save and MUST free the previous stage/time occupancy.
- **FR-014**: The feature MUST achieve ≥80% line/branch coverage across backend and frontend for this feature (CI-enforced; Constitution III).

### Key Entities

- **Programming Block**: A scheduled act, vendor, exhibition, or experience on a festival day, assigned to one stage/zone with a start time, end time, and schedule status. Active blocks occupy the timeline; canceled blocks do not block new placements.
- **Stage/Zone**: A concurrent track on the itinerary. Blocks may move between stages; two active blocks may share a clock time only if they are on different stages.
- **Timeline Slot**: A visible time interval on a stage column (30-minute grid from the existing itinerary). Empty slots are create targets; occupied slots belong to an active block.
- **Schedule Conflict**: A same-stage, same-day overlap between two active blocks. Create, move, and resize must not persist a conflict.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A scheduler can add a new block to a chosen stage and start time from the timeline in one click into the form plus completing required fields — without first picking day, stage, or start time from dropdowns — in under 30 seconds in moderated testing.
- **SC-002**: A scheduler can move an existing block to another empty time or another stage in a single drag, with the new placement visible immediately after release, in under 5 seconds for an unconflicted drop.
- **SC-003**: A scheduler can lengthen or shorten a block by one timeline interval using only an edge drag, without opening the form, in under 5 seconds when neighboring time is empty.
- **SC-004**: In 100% of same-stage overlap attempts during acceptance testing (move, resize, and create), the conflicting change is refused and the original schedule is unchanged.
- **SC-005**: At least 90% of first-time schedulers in usability testing correctly distinguish click-to-edit from drag-to-move on the first try after a 30-second orientation.
- **SC-006**: ≥80% line/branch coverage achieved across backend and frontend code for this feature (CI-enforced; Constitution III).

## Assumptions

- This feature refines the existing festival itinerary timeline (spec 082). It does not introduce a new itinerary product or change financial settlement behavior.
- “Does not allow overlap” means **same stage/zone and day**, matching spec 082. Concurrent programs on different stages remain valid.
- Timeline interval remains 30 minutes; visible day bounds remain the existing itinerary window (08:00–24:00).
- Default duration for a block created from an empty slot is one interval. Users who need a longer set change end time in the form or resize after save.
- Moves and resizes apply to the **currently selected festival day** only. Dragging a block onto another day is out of scope.
- The existing programming-block form is reused for create-from-slot and click-to-edit; this feature does not invent a second editor.
- Schedule-edit permission is the same authority already used to create and move blocks on the itinerary. Public and read-only viewers cannot mutate.
- Existing same-stage conflict handling (identify the conflicting block; offer reschedule / edit existing / cancel-or-move) remains the recovery path when a save is refused.
- Pointer-first interactions (drag, edge resize) are the v1 direct-manipulation path. Keyboard users continue to change time and stage through the block form.
- History view, public publishing, and stage filter behavior stay as specified in 082/084 except that hidden stages are not drop targets.
- No new irreversible delete flow is introduced; Constitution §XI applies only if an existing cancel/remove is triggered from the block form.
- Standard (non-festival) events are unchanged.
