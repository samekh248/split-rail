# Feature Specification: Split Dashboard Routes and Event Workspace

**Feature Branch**: `023-split-dashboard-routes`

**Created**: 2026-06-18

**Status**: Draft

**Input**: User description: "Split dashboard routes and extract EventWorkspacePage (Linear SPLR-63)"

## Clarifications

_None — all requirements resolved via informed defaults documented in Assumptions._

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Open a specific event workspace from its URL (Priority: P1)

As an authenticated organization member, I need to open a direct link to a venue's event financial workspace (for example, after bookmarking or receiving a shared link), so I land immediately on the correct venue, event, and ledger view without manually re-selecting context.

**Why this priority**: URL-addressable workspaces are the foundation of the dashboard routing split. Without a dedicated event workspace route, users cannot reliably return to or share a specific show's ledger.

**Independent Test**: Sign in, navigate to a workspace URL that identifies a venue and event the user can access, and confirm the venue switcher, event selector, and ledger all reflect that event without further manual selection.

**Acceptance Scenarios**:

1. **Given** a signed-in user with access to venue A and event X, **When** they open a workspace URL for venue A and event X, **Then** the event workspace loads with venue A active, event X selected, and the financial ledger shown for event X.
2. **Given** a signed-in user opens a workspace URL for an event they cannot access, **When** the page resolves, **Then** the user sees a clear, non-destructive error or redirect outcome (not a broken or misleading ledger).
3. **Given** a signed-in user opens a workspace URL with an unknown or malformed venue or event identifier, **When** the page resolves, **Then** the user is guided to a safe fallback (such as the dashboard entry point or default workspace) with an understandable message.
4. **Given** a user refreshes the browser while on a valid workspace URL, **When** the page reloads, **Then** the same venue and event context is restored from the URL.

---

### User Story 2 - Event and venue changes update the address bar (Priority: P2)

As a user working in the event workspace, I need the browser address to update whenever I switch events or venues, so my current context is reflected in the URL, supports browser back/forward, and can be copied or bookmarked.

**Why this priority**: Deep-linking only delivers value if in-app navigation keeps the URL in sync. This story converts the existing combobox-driven workspace into a route-driven experience.

**Independent Test**: Open a workspace, switch to a different event via the event combobox, and confirm the URL changes to the new event while the ledger reloads. Switch venues and confirm the URL and selection reset appropriately for the new venue.

**Acceptance Scenarios**:

1. **Given** a user is on a workspace for event X, **When** they select event Y from the event combobox, **Then** the URL updates to identify event Y and the ledger reloads for event Y.
2. **Given** a user creates a new event from the workspace, **When** creation succeeds, **Then** the URL updates to the new event and the ledger is shown.
3. **Given** a user deletes the active event and another event remains, **When** deletion completes, **Then** the URL updates to a remaining event and the ledger reloads.
4. **Given** a user switches from venue A to venue B, **When** the venue change completes, **Then** the prior event does not carry over, the URL updates to venue B's default or selected event, and the ledger reflects venue B.
5. **Given** a user uses the browser back button after switching events, **When** navigation completes, **Then** the prior event context is restored from the URL history.

---

### User Story 3 - Global navigation highlights Dashboard on workspace routes (Priority: P3)

As a user deep in an event ledger workspace, I need the global left-rail Dashboard item to remain visually active, so I understand I am still inside the Dashboard area of the application.

**Why this priority**: The vertical navigation overhaul separated global and contextual controls; workspace URLs must not break wayfinding by leaving no active global destination.

**Independent Test**: Navigate to any event workspace URL and confirm the Dashboard item in the global left rail shows an active/highlighted state.

**Acceptance Scenarios**:

1. **Given** a user on an event workspace URL, **When** the page renders, **Then** the Dashboard global navigation item is highlighted.
2. **Given** a user on the create-venue flow, **When** the page renders, **Then** the Dashboard global navigation item remains highlighted (unchanged from current behavior).
3. **Given** a user on a Settings page, **When** the page renders, **Then** no global navigation item is highlighted (unchanged from current behavior).

---

### User Story 4 - Dashboard entry point remains usable during transition (Priority: P4)

As a user who navigates to the root dashboard entry (`/`), I need a predictable interim experience while the multi-zone overview page is still being built, so I am not blocked from reaching my event workspace.

**Why this priority**: The full dashboard overview is a follow-on feature; this routing split must ship without stranding users who still land on `/`.

**Independent Test**: Sign in and navigate to `/`. Confirm the user reaches a usable dashboard outcome (workspace or appropriate empty state) without errors.

**Acceptance Scenarios**:

1. **Given** a signed-in user with an active venue and at least one event, **When** they navigate to `/`, **Then** they are taken to a usable workspace for their default or last-selected event (via redirect or equivalent interim behavior).
2. **Given** a signed-in user with an active venue and zero events, **When** they navigate to `/`, **Then** they see the existing no-events empty state with create-event guidance when permitted.
3. **Given** a signed-in user with no venues, **When** they navigate to `/`, **Then** they see the existing no-venue guidance unchanged in behavior.

---

### Edge Cases

- What happens when the workspace URL references a venue the user belongs to but an event that was deleted? The workspace falls back to the venue's default event or the no-events empty state; the URL updates to match the resolved state.
- What happens when the workspace URL references a venue the user cannot access? Access is denied with a clear message and a safe redirect to an allowed entry point.
- What happens when venue and event identifiers in the URL are valid UUIDs but do not match each other (event belongs to a different venue)? The system resolves to a consistent venue/event pair or shows an error with fallback — never a cross-venue ledger mismatch.
- What happens when the user opens a workspace URL while session storage holds a different last-selected event? The URL takes precedence on initial load; subsequent in-app changes update both URL and persisted selection.
- What happens when the user navigates to `/` with no prior session context? The system applies the same defaulting rules used today for venue and event selection after redirect.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The application MUST expose a dedicated event workspace route that identifies both the active venue and the active event in the URL.
- **FR-002**: Loading a valid event workspace route MUST render the same event workspace capabilities available today on the root dashboard: venue switcher, searchable event combobox, inline create/edit/delete event flows, and the financial ledger for the selected event.
- **FR-003**: Selecting a different event in the workspace MUST update the URL to the newly selected event without a full page reload.
- **FR-004**: Switching venues in the workspace MUST clear the prior venue's event from the URL, load events for the new venue, and update the URL to the resolved event for that venue.
- **FR-005**: Creating, editing, or deleting events from the workspace MUST preserve existing permission and state rules (including budget-lock constraints) and MUST update the URL when the active event changes as a result.
- **FR-006**: The global Dashboard navigation item MUST remain highlighted when the user is on any event workspace route or the create-venue route.
- **FR-007**: Navigating to the root dashboard entry (`/`) MUST provide an interim path to a usable workspace or appropriate empty state until the multi-zone overview page is delivered in a follow-on feature.
- **FR-008**: Browser back and forward navigation MUST restore prior workspace context consistent with URL history.
- **FR-009**: Invalid, inaccessible, or mismatched venue/event combinations in the URL MUST NOT render misleading ledger data; the system MUST fall back or deny access with clear user feedback.
- **FR-010**: Automated tests covering the extracted event workspace MUST pass, including updates to existing dashboard workspace tests split or migrated as appropriate.
- **FR-011**: The feature MUST achieve ≥80% line/branch coverage across backend and frontend for changed code (CI-enforced; Constitution III). _No backend changes are anticipated; frontend coverage applies to new and migrated workspace routing logic._

### Key Entities

- **Event Workspace Route**: A user-facing address that uniquely identifies an organization's venue and event context for ledger work; becomes the canonical location for single-event financial operations.
- **Dashboard Entry Route**: The root dashboard address (`/`) that temporarily bridges users to a workspace or empty state until the multi-zone overview ships.
- **Workspace Navigation Helpers**: Shared navigation actions for moving between the dashboard entry and a specific event workspace (including optional focus targeting deferred to a follow-on feature).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of acceptance scenarios in User Stories 1–4 pass in automated frontend tests.
- **SC-002**: Users can open a bookmarked event workspace URL and see the correct ledger within 3 seconds under normal network conditions (same performance expectation as today's dashboard load).
- **SC-003**: Switching events via the combobox updates the URL and reloads the ledger in a single user action with no additional confirmation steps.
- **SC-004**: Zero regressions in existing event selection, venue switching, create/edit/delete event, and ledger display behaviors compared to the pre-split dashboard workspace.
- **SC-005**: Global Dashboard navigation highlighting is correct on 100% of workspace and create-venue routes in manual and automated checks.
- **SC-006**: ≥80% line/branch coverage achieved across backend and frontend code for this feature (CI-enforced; Constitution III).

## Assumptions

- Event list and selection UI (SPLR-58) and vertical navigation shell (SPLR-62) are complete and provide the venue switcher, event combobox, and shell layout this feature builds on.
- The multi-zone dashboard overview page (SPLR-66) is explicitly out of scope; root `/` uses interim redirect-or-equivalent behavior until that feature lands.
- Workspace focus/scroll targeting via URL parameters (SPLR-67) is out of scope for this feature; navigation helpers may accept an optional focus argument structurally but need not implement scroll behavior yet.
- E2E test updates for the full overview → workspace flow (SPLR-68) are deferred to the follow-on issue that ships the overview page.
- Workspace routes use venue and event identifiers already used throughout the product; no new data model or API endpoints are required.
- Interim behavior at `/` redirects authenticated users with events to their resolved default workspace URL; users without events or venues see the same empty-state experiences as today.

## Dependencies

- **SPLR-58** (Event list & selection UI): Provides combobox, create/edit/delete panels, and event defaulting logic to extract into the workspace page.
- **SPLR-62** (Vertical navigation): Provides the AppShell, global nav, and contextual top bar into which the workspace mounts.
- **Downstream**: SPLR-66 (Dashboard overview), SPLR-67 (workspace focus params), SPLR-68 (routing E2E updates) depend on this routing split.
