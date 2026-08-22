# Feature Specification: Event Workflow Visual Cleanup and Show Detail Capture

**Feature Branch**: `086-event-workflow-ux`

**Created**: 2026-08-19

**Status**: Draft

**Input**: User description: "Clean up the visuals on the event workflow. The create modals need the modern UX to align with the rest of the app. Confirmed events need door opening time and concert start time. It also needs the option to add the opening and supporting bands. Also allow a notes/description area. The event details modal needs cleaned up. In the workspace view, move the "convert to festival into the header butttons under a kebob menu. Move the "Add artist" button to the bottom of the section. The concert start time is only for confirmed state. Keep the opening/supporting bands as is, but if there is no UX for it, add it."

**Depends on**: Venue visual cleanup of shared section-header and action patterns (spec 084)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create an event through a form that matches the rest of the app (Priority: P1)

As a talent buyer creating a show, I need the event creation forms to look and behave like every other form in the product, so I am not re-learning a different set of controls, spacing, and button placement each time I book something.

**Why this priority**: Event creation is the entry point of the whole booking workflow and is the surface that diverges most visibly from the modernised patterns adopted elsewhere. It delivers value on its own, before any new fields exist.

**Independent Test**: Open both event creation paths (the booking calendar create modal and the event form panel). Confirm each uses the shared dropdown, field, and action-row patterns used by the rest of the app, with the primary action on the right and the dismiss action on the left.

**Acceptance Scenarios**:

1. **Given** a user with event-create permission on the booking calendar, **When** they open the create-event modal, **Then** every selection control uses the shared dropdown pattern rather than an unstyled native control.
2. **Given** the create modal is open, **When** the user views the action row, **Then** the dismiss action is left-aligned and the primary save action is right-aligned with a leading icon, matching other modals in the product.
3. **Given** the create modal is open, **When** the user views the form body, **Then** spacing between sections is uniform and consistent with other modals, with no cramped or doubled gaps.
4. **Given** a user creating an event from the event form panel, **When** they switch between the standard and festival creation types, **Then** the selected type is visually unmistakable, not conveyed by a single subtle cue.
5. **Given** a validation error on any field, **When** it is displayed, **Then** it appears in the same position and style as validation errors elsewhere in the product.

---

### User Story 2 - Record doors and show start times for a confirmed show (Priority: P1)

As a venue operations manager, I need to record when doors open and when music starts for a confirmed show, so front-of-house, security, and the artist all work from the same published schedule.

**Why this priority**: These two times drive day-of-show staffing and public listings. Doors time already exists in the data but only partially in the interface; show start does not exist at all, and its absence is the gap most felt on confirmed shows.

**Independent Test**: Take an event whose booking placement is confirmed. Set a doors time and a show start time, save, reopen the event, and confirm both persist and display. Repeat on an event that is on hold and confirm the show start time is not offered.

**Acceptance Scenarios**:

1. **Given** an event whose booking placement is **confirmed**, **When** a user with event-edit permission opens its detail view, **Then** both a doors time and a show start time can be entered and saved.
2. **Given** an event whose booking placement is **not confirmed** (a hold or cancelled placement), **When** a user opens its detail view, **Then** the show start time is not offered for entry.
3. **Given** a confirmed event with both times saved, **When** any user views the event detail, **Then** both times are displayed in a single, clearly labelled schedule grouping.
4. **Given** a user entering a show start time earlier than the doors time, **When** they save, **Then** the change is refused with a message identifying the conflict, and the previously saved times are unchanged.
5. **Given** a confirmed event that has a show start time recorded, **When** its placement is later changed away from confirmed, **Then** the recorded show start time is retained rather than discarded, and becomes visible again if the event returns to confirmed.
6. **Given** an event with no times recorded, **When** it is displayed anywhere times are shown, **Then** the absence is communicated in words rather than as a blank space.

---

### User Story 3 - Capture the opening and supporting bands (Priority: P2)

As a talent buyer, I need to record who is opening and supporting on a show, so the running order is visible to everyone working the night without living in a separate document.

**Why this priority**: The supporting lineup is already carried in the event record but has no interface at all, so the information exists in the system yet cannot be entered or read. Exposing it is a contained change that unlocks data already modelled.

**Independent Test**: Open an event, enter an opening and supporting lineup, save, and reopen. Confirm the entry persists and is readable on the event detail without opening an edit form.

**Acceptance Scenarios**:

1. **Given** a user with event-edit permission, **When** they open an event's detail view, **Then** they can record the opening and supporting bands for that show.
2. **Given** a supporting lineup has been recorded, **When** any user views the event detail, **Then** the lineup is displayed as readable text without needing to enter an edit mode.
3. **Given** an event with no supporting lineup recorded, **When** it is viewed, **Then** the section either communicates its absence plainly or is omitted, rather than showing an empty control.
4. **Given** a user records a supporting lineup, **When** they save, **Then** the existing headline-artist relationship on the event is unaffected.

---

### User Story 4 - Record free-form notes on an event (Priority: P2)

As anyone working a show, I need a free-text notes area on the event, so context that does not fit a structured field (parking, hospitality quirks, promoter instructions) travels with the booking.

**Why this priority**: Notes are the catch-all that keeps operational context out of email threads. Valuable but not blocking the schedule-critical times in User Story 2.

**Independent Test**: Add notes to an event, save, reopen, and confirm the text persists with its line breaks intact and is readable without entering an edit form.

**Acceptance Scenarios**:

1. **Given** a user with event-edit permission, **When** they open an event's detail view, **Then** they can enter multi-line notes about the event.
2. **Given** notes containing line breaks, **When** they are saved and re-displayed, **Then** the line breaks are preserved.
3. **Given** an event with no notes, **When** it is viewed, **Then** no empty notes block occupies space in the layout.
4. **Given** a user enters notes beyond the accepted length, **When** they attempt to save, **Then** they are told the limit before the save is attempted.

---

### User Story 5 - Reach secondary workspace actions without them crowding the page (Priority: P2)

As an event manager working in the event workspace, I need the occasional actions tucked out of the way and the frequent action where I finish reading, so the page leads with the work rather than the controls.

**Why this priority**: Purely organisational, but it is what makes the workspace legible once the detail views above grow. Independent of every other story.

**Independent Test**: Open the event workspace for a standard event. Confirm *Convert to festival* is reachable only from an overflow menu among the header actions, and that *Add artist* sits at the foot of the artist section rather than in its header.

**Acceptance Scenarios**:

1. **Given** a standard event workspace and a user permitted to convert it, **When** they view the header actions, **Then** *Convert to festival* is not a top-level button but is reachable from an overflow menu alongside the other header actions.
2. **Given** the overflow menu is open, **When** the user selects *Convert to festival*, **Then** the same conversion flow runs as before this change.
3. **Given** a user who is not permitted to convert the event, **When** they view the header, **Then** the conversion entry is absent, and no empty overflow menu is left behind.
4. **Given** the artist section of the workspace, **When** a user with artist-manage permission views it, **Then** the *Add artist* action appears at the end of the section, after the existing artists.
5. **Given** a user without artist-manage permission, **When** they view the artist section, **Then** no add action appears in either position.
6. **Given** the overflow menu is open, **When** the user presses Escape or clicks away, **Then** the menu closes without performing any action.

---

### User Story 6 - Read an event's details without visual clutter (Priority: P3)

As anyone opening an event, I need its detail view organised into clear groupings, so I can find the date, schedule, lineup, and notes at a glance instead of scanning an undifferentiated list.

**Why this priority**: The cleanup is what keeps the detail view usable once the new times, lineup, and notes are added to it. It depends on those stories landing to be fully meaningful.

**Independent Test**: Open the event detail for a fully populated confirmed event. Confirm related information is visually grouped and that actions are separated from content.

**Acceptance Scenarios**:

1. **Given** a fully populated event, **When** a user opens its detail view, **Then** related fields are grouped under clear headings rather than presented as one flat list.
2. **Given** the detail view, **When** a user looks for its actions, **Then** they are grouped in a consistent location and separated from the content they act on.
3. **Given** an event missing several optional details, **When** it is viewed, **Then** the layout does not leave gaps where the absent information would have been.

---

### Edge Cases

- An event that is confirmed, has a show start time, and is then converted to a festival keeps its recorded times; festival programming blocks carry their own times and are unaffected.
- Doors time is available regardless of placement status; only show start time is gated on the confirmed placement.
- Times that fall after midnight (a show starting at 00:30) must be recordable and must not be mistaken for a time earlier the same day.
- Settled or reconciled events do not permit editing the new fields, matching existing immutability on those events.
- A user without event-edit permission can read the new fields but cannot change them.
- Notes and supporting lineup are plain text; markup entered into them is displayed as literal text, never rendered.
- Narrow viewports must keep the overflow menu reachable and the create modals usable without horizontal scrolling.
- Concurrent edits to the same event follow the product's existing conflict behaviour; this feature introduces no new merge semantics.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Both event creation surfaces (the booking-calendar create modal and the event form panel) MUST use the product's shared form-control, spacing, and action-row patterns, including the shared dropdown control in place of unstyled native selection controls.
- **FR-002**: Event creation and detail modals MUST place the dismiss action on the left and the primary action on the right of the action row, with the primary action carrying a leading icon, consistent with other modals in the product.
- **FR-003**: Users with event-edit permission MUST be able to record a **doors time** on an event regardless of its booking placement status.
- **FR-004**: Users with event-edit permission MUST be able to record a **show start time** on an event **only while its booking placement is confirmed**. The field MUST NOT be offered for entry on non-confirmed placements.
- **FR-005**: A show start time earlier than the same event's doors time MUST be refused, identifying the conflict and leaving previously saved times unchanged.
- **FR-006**: A recorded show start time MUST be retained if the event's placement later changes away from confirmed, and MUST become visible again if the placement returns to confirmed.
- **FR-007**: Users with event-edit permission MUST be able to record the opening and supporting bands for an event. This MUST reuse the event's existing supporting-lineup information rather than introducing a parallel record of the same thing, and MUST NOT alter the event's existing headline-artist relationship.
- **FR-008**: Users with event-edit permission MUST be able to record multi-line free-text notes on an event, preserving line breaks when redisplayed.
- **FR-009**: Doors time, show start time, supporting lineup, and notes MUST be readable on the event detail view without entering an edit mode, and MUST communicate their absence in words rather than as blank space or empty controls.
- **FR-010**: Notes and supporting lineup MUST be treated as plain text and MUST NOT render any markup they contain.
- **FR-011**: The event detail view MUST organise its content into labelled groupings, with actions grouped consistently and separated from the content they act upon.
- **FR-012**: In the event workspace header, *Convert to festival* MUST be relocated from a top-level button into an overflow (kebab) menu alongside the other header actions, reusing the product's existing overflow-menu pattern. The conversion flow it triggers MUST be unchanged.
- **FR-013**: The overflow menu MUST be omitted entirely when it would contain no actions the current user is permitted to take, and MUST close on Escape or outside click without performing an action.
- **FR-014**: The *Add artist* action MUST be relocated to the end of the artist section, after the existing artists, and MUST remain gated on the same permission as before.
- **FR-015**: The new fields MUST NOT be editable on events whose status is settled or reconciled, matching existing immutability rules for those events.
- **FR-016**: Any delete, remove, or irreversible cancel action reached from these surfaces MUST continue to use the Constitution §XI confirmation modal pattern (see `.specify/memory/delete-confirmation.md`). This feature introduces no new destructive flow.
- **FR-017**: The feature MUST achieve ≥80% line/branch coverage across backend and frontend for this feature (CI-enforced; Constitution III).

### Key Entities

- **Event**: A booked show at a venue. Already carries a date, title, booking placement status, doors time, and a supporting lineup. This feature adds a show start time and a free-text notes field, and surfaces the doors time and supporting lineup that already exist but are not fully reachable in the interface.
- **Booking Placement Status**: The commitment level of the booking — a hold, confirmed, or cancelled. Gates whether the show start time is offered.
- **Event Artist**: The existing relationship between an event and its booked headline artist(s), including deal terms. Untouched by this feature.
- **Supporting Lineup**: The opening and supporting bands recorded against the event as text, distinct from the deal-bearing headline artist relationship.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In design review, both event creation surfaces are judged consistent with the product's established form patterns on control style, spacing, and action placement, with zero remaining unstyled native selection controls.
- **SC-002**: An operations manager can record both doors and show start times on a confirmed event, from opening the event to saving, in under 30 seconds.
- **SC-003**: In 100% of attempts during acceptance testing, a show start time earlier than doors time is refused and the previously saved times are left unchanged.
- **SC-004**: In 100% of attempts during acceptance testing, the show start time is unavailable for entry on non-confirmed placements and available on confirmed ones.
- **SC-005**: A talent buyer can record the opening and supporting bands and see them on the event detail without entering an edit mode.
- **SC-006**: At least 90% of participants in usability testing locate *Convert to festival* in the workspace within 15 seconds of being asked, without prior instruction.
- **SC-007**: Notes containing line breaks survive a save-and-reopen cycle with their formatting intact in 100% of attempts.
- **SC-008**: ≥80% line/branch coverage achieved across backend and frontend code for this feature (CI-enforced; Constitution III).

## Assumptions

- **"Confirmed" refers to booking placement, not event status.** The event status values are pre-show, settled, and reconciled — there is no "confirmed" status. The confirmed state in this feature is the event's booking placement status, per the user's clarification that show start time is confirmed-state only.
- **Doors time already exists** on the event record and is captured in the booking create modal; this feature surfaces it consistently on the event detail rather than introducing it.
- **The supporting lineup already exists** on the event record but currently has no interface anywhere. Per the user's direction to keep it as is and add the missing interface, this feature adds the interface over the existing information and does not restructure how it is stored.
- **Show start time and notes are new** information on the event and do not exist today in any form.
- Show start time is a time-of-day on the event's own date; a start time earlier in the clock than doors is treated as invalid rather than as the following day. Late-night shows are recorded against the calendar day the operator selects.
- Notes are plain text with a bounded length appropriate to operational context; they are not a rich-text or attachment surface.
- The overflow menu reuses the product's existing kebab-menu pattern rather than introducing a new interaction.
- Only *Convert to festival* moves into the workspace overflow menu in this feature; other header actions keep their current placement unless they conflict with the shared action-row pattern.
- Festival programming blocks keep their own independent times; the event-level doors and show start times describe the event as a whole and are not propagated into blocks.
- Permission boundaries for viewing and editing events are unchanged; this feature adds no new roles or permissions.
- No new irreversible delete flow is introduced, so Constitution §XI applies only to existing delete/cancel actions reached from these surfaces.

## Out of Scope

- Publishing doors or show start times to any public-facing listing or feed.
- Notifying artists, staff, or ticketing systems when times change.
- Structuring the supporting lineup into individual artist records with their own deal terms; the headline-artist relationship remains the only deal-bearing one.
- Changing settlement, ledger, or QuickBooks behaviour in any way.
- Reworking the festival itinerary or its programming blocks.
- Changing which users may view or edit events.
