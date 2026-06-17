# Feature Specification: Event List & Selection UI

**Feature Branch**: `015-event-list-selection-ui`

**Created**: 2026-06-17

**Status**: Draft

**Input**: User description: "Build event list & selection UI (replace hardcoded event ID)" (Linear SPLR-58)

## Clarifications

### Session 2026-06-17

- Q: How should the create-event form be presented? → A: Inline panel or expand within the dashboard shell (user stays on the dashboard).
- Q: Is editing or deleting events in scope for this feature? → A: Include both edit event details and delete event from the selector.
- Q: What UI pattern should the event selector use? → A: Searchable combobox (type-to-filter within the dropdown).
- Q: In what order should events appear in the combobox list? → A: Event date descending (most recent / nearest upcoming first).
- Q: Can users edit or delete an event whose budget is locked but not yet settled? → A: Allow edit of title, date, and tag only; block delete when budget is locked.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Select an event to view its financial ledger (Priority: P1)

An authenticated user with an active venue opens the dashboard and sees which events exist for that venue. They choose an event from a searchable combobox in the dashboard shell — typing to filter by title or date — and the financial ledger below refreshes to show data for the selected event instead of a fixed placeholder.

**Why this priority**: The ledger is the core product surface, but it is meaningless without a real event context. Replacing the hardcoded event with user-driven selection is the minimum viable slice that makes the ledger usable for real venues.

**Independent Test**: Sign in as a user with an active venue that has at least two events, open the event combobox, filter if needed, choose a different event, and confirm the ledger reloads with data for the newly selected event.

**Acceptance Scenarios**:

1. **Given** a signed-in user with an active venue that has one or more events, **When** the dashboard loads, **Then** a searchable event combobox shows the events for that venue with each event's title, date, and status clearly visible.
2. **Given** multiple events exist for the active venue, **When** the user types in the combobox to filter and selects a matching event, **Then** the selected event becomes active and the ledger view reloads to show that event's financial data.
3. **Given** a user has selected an event, **When** they navigate within the dashboard during the same session, **Then** the selected event remains active until they change it or switch venues.
4. **Given** exactly one event exists for the active venue, **When** the dashboard loads, **Then** that event is automatically selected and the ledger is shown without requiring manual selection.

---

### User Story 2 - Create the first or additional event from the dashboard (Priority: P2)

A user with permission to manage events who is working in a venue with no events (or who wants to add another show) opens an inline create-event panel within the dashboard shell — without leaving the dashboard. They enter an event title and date, optionally add an accounting reference tag, submit the form, and land on the ledger for the newly created event.

**Why this priority**: Many venues will start with zero events after venue creation. Without a creation path, users hit a dead end even when the ledger itself works. This story unblocks the post-venue onboarding journey identified in SPLR-57/SPLR-58.

**Independent Test**: Sign in as a permitted user with an active venue and no events, follow the empty-state call-to-action to create an event with a valid title and date, and confirm the new event is selected and the ledger is visible.

**Acceptance Scenarios**:

1. **Given** an authenticated user with event-management permission and an active venue with zero events, **When** the dashboard loads, **Then** an actionable empty state is shown explaining that no events exist yet and offering a primary create-event call-to-action.
2. **Given** the user activates a create-event call-to-action, **When** the inline panel opens, **Then** the user remains on the dashboard (no navigation to a separate page or modal overlay).
3. **Given** the inline create-event panel is open, **When** the user enters a valid title and event date and submits, **Then** a new event is created for the active venue, the panel closes, the new event is automatically selected, and the ledger view is shown.
4. **Given** the user has at least one event, **When** they open the event combobox, **Then** a create-event action is available that opens the same inline panel (for users with permission).
5. **Given** the inline create-event panel is shown, **When** the user optionally enters an accounting reference tag, **Then** the tag is saved with the event; leaving it blank still allows successful creation.
6. **Given** a user without event-management permission and an active venue with zero events, **When** the dashboard loads, **Then** the empty state is shown without any create-event control.

---

### User Story 3 - Event selection resets appropriately when the venue changes (Priority: P3)

When a user switches to a different venue using the venue selector, the previously selected event (which belongs to the prior venue) must not carry over. The dashboard loads events for the new venue, selects a sensible default when events exist, or shows the no-events empty state when the new venue has none.

**Why this priority**: Correct venue/event scoping is essential for multi-venue trust and aligns with the venue-switching behavior defined in SPLR-24/009. It builds on P1 selection but prevents cross-venue data leakage.

**Independent Test**: Select event A in venue 1, switch to venue 2 that has its own events, and confirm event A is not shown as active and the ledger reflects venue 2's default or selected event.

**Acceptance Scenarios**:

1. **Given** a user has selected an event in venue A, **When** they switch the active venue to venue B, **Then** the prior event selection is cleared and events for venue B are loaded.
2. **Given** venue B has one or more events after a venue switch, **When** the event list loads, **Then** the most recent event by event date (ties broken by most recently created) is automatically selected and the ledger reloads.
3. **Given** venue B has zero events after a venue switch, **When** the dashboard finishes loading, **Then** the no-events empty state is shown with a create call-to-action for permitted users.
4. **Given** a user switches venues, **When** downstream views reload, **Then** all event-scoped actions apply only to the newly active venue's events.

---

### User Story 4 - Edit or delete an event from the combobox (Priority: P4)

A user with permission to manage events opens the event combobox, chooses to edit or delete an event in planning state, and completes the action without leaving the dashboard. Editing reuses the inline panel pre-filled with the event's current title, date, and optional accounting tag — permitted even when the event's budget is locked, but limited to those metadata fields. Deleting is permitted only for planning events whose budget is not yet locked. Deleting removes the event after explicit confirmation and updates the workspace to a remaining event or the empty state.

**Why this priority**: Edit and delete complete the event lifecycle management surfaced in the combobox. They are sequenced after list/select/create because the core ledger-unblocking path does not require them, but they prevent users from being stuck with incorrect or obsolete events.

**Independent Test**: Sign in as a permitted user with at least two unlocked planning-state events, edit one event's title via the inline panel and confirm the combobox reflects the change; delete another unlocked planning-state event with confirmation and confirm the combobox updates and the ledger loads a remaining event.

**Acceptance Scenarios**:

1. **Given** a user with event-management permission and a selected event in planning state (budget locked or unlocked), **When** they choose edit from the event combobox, **Then** the inline panel opens pre-filled with the event's current title, date, and accounting tag (if any).
2. **Given** the edit panel is open with valid changes to title, date, or accounting tag, **When** the user submits, **Then** the event metadata is updated, the panel closes, the event remains selected, and the combobox and ledger reflect the new values.
3. **Given** a user with event-management permission and an event in planning state with an unlocked budget, **When** they choose delete from the event combobox and confirm, **Then** the event is removed from the venue, the combobox updates, and the ledger loads another accessible event or the empty state if none remain.
4. **Given** an event in planning state with a locked budget, **When** a user views it in the combobox, **Then** delete is not offered (or is disabled with a clear explanation that the budget is locked).
5. **Given** an event in settled or reconciled lifecycle state, **When** a user views it in the combobox, **Then** edit and delete actions are not offered (or are disabled with a clear explanation that the event is locked).
6. **Given** a user without event-management permission, **When** they open the event combobox, **Then** edit and delete actions are not available.

---

### Edge Cases

- **No events for active venue**: User sees a clear empty state with explanation and, if permitted, a create-event call-to-action — not a blank or broken ledger area.
- **Event list fails to load**: User sees a recoverable error with retry; the workspace does not show a silent blank screen.
- **Selected event no longer exists or is inaccessible**: If a remembered or requested event cannot be loaded (deleted, invalid, or out of scope), the user sees a recoverable error and the system falls back to another accessible event for the venue or the empty state if none remain.
- **Create validation failure**: Missing title or date shows inline validation within the panel; the user can correct and resubmit without losing other entered values.
- **Cancel create-event panel**: User can dismiss the inline panel without creating an event; the dashboard returns to its prior state (empty state or previously selected event).
- **Create permission denied**: Users without event-management permission never see create controls; if they reach a create path indirectly, the action is rejected without exposing sensitive details.
- **Single event venue**: The lone event is auto-selected; the combobox still communicates which event is active.
- **Venue switch during ledger viewing**: The ledger view type is preserved but reloads for the new venue's event context; figures from the prior venue's event are not shown.
- **Edit settled or reconciled event**: Edit and delete controls are unavailable; the user sees that the event is locked due to its lifecycle state.
- **Delete event with locked budget**: Delete is unavailable for planning events whose budget is locked; the user sees a clear explanation. Edit of title, date, and accounting tag remains available.
- **Edit event with locked budget**: Only metadata fields (title, date, accounting tag) are editable; the edit panel does not expose ledger or budget controls.
- **Delete currently selected event**: After confirmed deletion, the system selects another accessible event for the venue or shows the empty state if it was the last event.
- **Delete last event**: Confirmed deletion leaves the venue with zero events and shows the no-events empty state with create call-to-action for permitted users.
- **Delete confirmation**: Deleting an event requires an explicit confirmation step to prevent accidental removal.
- **Edit validation failure**: Same inline validation as create; unsaved edits are retained in the panel until corrected or dismissed.
- **Search filter with no matches**: When the user's filter text matches no events, the combobox shows a clear "no results" state without clearing the current selection or breaking the ledger view.
- **Search filter cleared**: Clearing the filter restores the full event list in the combobox.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display a searchable event combobox in the dashboard shell whenever a venue is active, listing all events the signed-in user can access for that venue and allowing the user to type-to-filter by event title or date.
- **FR-002**: Each event in the combobox MUST show at minimum the event title, event date, and current lifecycle status in a human-readable form; filtering MUST match against title and date; the list MUST be ordered by event date descending (most recent or nearest upcoming first), with ties broken by most recently created.
- **FR-003**: System MUST drive the financial ledger view from the user's currently selected event for the active venue, not from a fixed default event identifier.
- **FR-004**: When the user selects a different event, the ledger MUST reload to reflect the newly selected event's data.
- **FR-005**: When exactly one event exists for the active venue, the system MUST automatically select it on load.
- **FR-006**: When multiple events exist and no valid prior selection applies, the system MUST default to the most recent event by event date (ties broken by most recently created).
- **FR-007**: System MUST remember the selected event for the duration of the browser session within the same tab; the selection MUST reset when the user switches venues.
- **FR-008**: When the active venue has zero events, the system MUST show an actionable empty state explaining that no events exist and, for users with event-management permission, offering a primary create-event call-to-action.
- **FR-009**: Users with event-management permission MUST be able to create a new event for the active venue via an inline panel within the dashboard shell (no navigation to a separate page and no modal overlay), by providing a required title and event date, with an optional accounting reference tag.
- **FR-010**: After successful event creation, the system MUST close the inline panel, add the event to the combobox, select it automatically, and display the ledger for that event.
- **FR-017**: Users MUST be able to dismiss the inline create-event panel without submitting, returning the dashboard to its prior state.
- **FR-011**: Users without event-management permission MUST NOT be offered create, edit, or delete controls in empty states or the event combobox.
- **FR-012**: When an event cannot be loaded (missing, invalid, or inaccessible), the system MUST show a recoverable error state — not a blank screen — and attempt to fall back to another accessible event or the empty state.
- **FR-013**: When the event list fails to load, the system MUST show a recoverable error with retry capability.
- **FR-014**: When the user switches venues, the system MUST clear the prior venue's event selection and load events scoped exclusively to the newly active venue.
- **FR-015**: All event listing, creation, edit, and delete actions MUST respect the user's organization and venue access scope; events outside scope MUST NOT appear or be actionable.
- **FR-016**: System MUST achieve ≥80% line/branch coverage across backend and frontend for this feature (CI-enforced; Constitution III).
- **FR-018**: Users with event-management permission MUST be able to edit metadata (title, event date, optional accounting reference tag) for any event in planning state — including events with a locked budget — via the same inline panel used for creation, pre-filled with current values.
- **FR-019**: After successful event metadata edit, the system MUST close the inline panel, update the combobox entry, keep the event selected, and refresh the ledger if it is the active event.
- **FR-020**: Users with event-management permission MUST be able to delete an event in planning state with an unlocked budget from the event combobox after explicit confirmation.
- **FR-021**: After successful event deletion, the system MUST remove the event from the combobox and load the ledger for another accessible event or show the empty state if no events remain.
- **FR-022**: Events in settled or reconciled lifecycle state MUST NOT be editable or deletable from the combobox; the UI MUST communicate that these events are locked.
- **FR-025**: Events in planning state with a locked budget MUST NOT be deletable from the combobox; the UI MUST communicate that deletion is blocked because the budget is locked. Metadata edit (title, date, accounting tag) MUST remain available.
- **FR-023**: When a filter query matches no events, the combobox MUST show a clear empty-results state without disrupting the currently selected event or ledger view.
- **FR-024**: Filtered results MUST retain the same event date descending sort order as the unfiltered list.

### Key Entities *(include if feature involves data)*

- **Event**: A show or booking instance belonging to a venue; identified by title, scheduled date, lifecycle status, and optional accounting reference tag; drives the financial ledger context.
- **Active Event Selection**: The user's current event choice within the active venue for the session; resets on venue change and does not persist across browser sessions.
- **Venue**: The parent workspace context; determines which events are listed and which ledger data is shown.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users with an active venue and at least one event can switch between events and see the ledger update for the selected event within 3 seconds under normal conditions.
- **SC-002**: Users with event-management permission and zero events can create their first event and reach the ledger in under 2 minutes without leaving the dashboard workflow.
- **SC-003**: 95% of users with multiple events successfully select a different event on first attempt without encountering a blank or unrecoverable screen.
- **SC-004**: After switching venues, 100% of test scenarios confirm the prior venue's event selection is not retained and no cross-venue ledger data is displayed.
- **SC-005**: Invalid or missing event conditions produce a visible, recoverable error in 100% of tested failure scenarios (no silent blank states).
- **SC-006**: ≥80% line/branch coverage achieved across backend and frontend code for this feature (CI-enforced; Constitution III).
- **SC-007**: Users with event-management permission can edit a planning-state event's details and see the update reflected in the combobox within 3 seconds under normal conditions.
- **SC-008**: 100% of delete attempts on settled, reconciled, or budget-locked planning events are blocked in testing; 100% of confirmed deletes on unlocked planning events remove the event and restore a valid workspace state.
- **SC-009**: 100% of edit attempts on settled or reconciled events are blocked; metadata edits on budget-locked planning events succeed without altering locked budget data.

## Assumptions

- Event listing, creation, edit, and delete capabilities already exist on the server for venues the user can access (or will be extended as part of this feature); the dashboard user experience consumes those capabilities.
- A venue must already be selected as active (via venue switcher or post-creation default) before event selection applies; venue creation UI (SPLR-57) is a sibling dependency.
- Event selection persistence follows the same session-scoped, per-tab model as venue selection (SPLR-24/009): remembered within the session but cleared on venue change and not shared across tabs or devices.
- The optional accounting reference tag is a free-text label used for downstream accounting alignment; it is not required to create an event.
- Event lifecycle status values are already defined by the platform (e.g., planning, locked, settled); the combobox displays them as readable badges without redefining status rules.
- Permission to create, edit, and delete events is determined by the existing role matrix; this feature surfaces or hides affordances accordingly rather than defining new roles.
- Events in settled or reconciled lifecycle state are immutable per platform ledger rules (SPLR-17/002); edit and delete are not permitted.
- Events in planning state with a locked budget permit metadata edit (title, date, accounting tag) only; delete is blocked to preserve financial integrity. Delete is permitted only for planning events with an unlocked budget.
- The financial ledger grid (SPLR-17/002) remains the downstream view; this feature only establishes which event feeds that grid.
- Create-event uses an inline panel within the dashboard shell (not a dedicated page or modal), distinct from the dedicated-page pattern chosen for venue creation (SPLR-57/014).
- The event selector is a searchable combobox (type-to-filter), distinct from the venue switcher's plain dropdown (SPLR-24/009), to support venues with larger event histories.
