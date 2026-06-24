# Feature Specification: Dashboard Tenant/Venue Switching Dropdown

**Feature Branch**: `009-venue-switcher-dropdown`

**Created**: 2026-06-16

**Status**: Draft

**Input**: User description: "Dashboard tenant/venue switching dropdown (respect venue scope)" (Linear SPLR-24)

## Clarifications

### Session 2026-06-16

- Q: How should the venue selector obtain a scope-correct venue list? → A: The backend returns only the venues the user can access (scope enforced server-side); the client renders the returned list as-is.
- Q: How should the selected active venue persist across reloads within the same session? → A: Browser session-scoped storage that is per-tab and cleared when the tab/session closes (no cross-tab or cross-device persistence).
- Q: When the user switches venues, what happens to the currently open event / downstream sub-selection? → A: Keep the same view type but load the new venue's default/equivalent content (the prior event selection does not carry over).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Switch the active venue from the dashboard (Priority: P1)

An authenticated user who has access to more than one venue opens the dashboard and uses a venue selector in the top of the dashboard shell to change which venue they are working in. After selecting a different venue, the dashboard's downstream views (such as the event ledger) refresh to show data for the newly selected venue.

**Why this priority**: This is the core capability the feature delivers. Without it, users cannot move between venues at all and venue context remains a fixed value. It is the minimum viable slice that provides standalone value.

**Independent Test**: Sign in as a user with access to two or more venues, open the venue selector, choose a different venue, and confirm the active workspace reflects the selected venue and the ledger view reloads with that venue's data.

**Acceptance Scenarios**:

1. **Given** a signed-in user with access to multiple venues, **When** they open the venue selector, **Then** they see a list of the venues they can access, with one venue shown as currently active.
2. **Given** the venue selector is open, **When** the user selects a different venue, **Then** the active venue becomes the selected venue and downstream views (e.g., the ledger) reload to show data for that venue.
3. **Given** a venue is selected, **When** the user performs subsequent actions that read or write data, **Then** those actions are scoped to the selected venue.

---

### User Story 2 - Venue list respects the user's venue scope (Priority: P2)

The set of venues offered in the selector depends on the user's access scope. A user with full organization access can choose from all venues in their organization. A user whose access is restricted to specific venues can only choose from the venues assigned to them.

**Why this priority**: Enforcing scope is essential for correct multi-tenant behavior and trust, but it builds on the switching capability in User Story 1. It is separated so the switching mechanism can be validated first.

**Independent Test**: Sign in as a scoped user and confirm only assigned venues appear in the selector; sign in as a full-access user and confirm all organization venues appear.

**Acceptance Scenarios**:

1. **Given** a user with full organization access, **When** they open the venue selector, **Then** all venues belonging to their organization are listed.
2. **Given** a user whose access is restricted to a subset of venues, **When** they open the venue selector, **Then** only the venues assigned to them are listed.
3. **Given** a user attempts to act on a venue outside their scope, **When** the request is evaluated, **Then** the action is denied and the user is not switched into that venue.

---

### User Story 3 - Selected venue persists across the session (Priority: P3)

Once a user picks a venue, that choice is remembered as they navigate within the dashboard and when they return to the dashboard later in the same session, so they do not have to re-select their venue on every view or reload.

**Why this priority**: Persistence improves usability and reduces repetitive selection, but the feature is still usable without it. It is the lowest priority of the three.

**Independent Test**: Select a non-default venue, navigate between dashboard views and reload the dashboard, and confirm the previously selected venue remains active.

**Acceptance Scenarios**:

1. **Given** a user has selected a venue, **When** they navigate to another dashboard view, **Then** the selected venue remains active.
2. **Given** a user has selected a venue, **When** they reload the dashboard within the same session, **Then** the previously selected venue is restored as active.
3. **Given** a user has not yet made a selection, **When** the dashboard first loads, **Then** a sensible default venue is chosen automatically from the venues they can access.

---

### Edge Cases

- **No accessible venues**: A user whose organization has no venues, or whose scope grants access to none, sees a clear empty state instead of an empty or broken selector.
- **Single accessible venue**: A user with exactly one accessible venue sees that venue as active; the selector clearly communicates there is nothing else to switch to.
- **Previously selected venue no longer accessible**: If a remembered selection points to a venue the user can no longer access (e.g., scope changed), the system falls back to a default accessible venue rather than failing.
- **Selecting a venue outside scope**: Any attempt to activate a venue the user is not permitted to access is rejected and the active venue is unchanged.
- **Venue list fails to load**: If the list of venues cannot be retrieved, the user sees an error state with the ability to retry, and is not left in an ambiguous workspace.
- **In-progress work during switch**: When the user switches venues while viewing venue-specific data, the current view type is preserved but reloads the newly selected venue's default/equivalent content; the previously open event (which belongs to the prior venue) is not carried over.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The dashboard MUST display a venue selector in the dashboard shell (header area) that is visible to authenticated users viewing the dashboard.
- **FR-002**: The venue selector MUST display the accessible-venues list returned by the backend for the authenticated user, with the currently active venue clearly indicated.
- **FR-003**: For users with full organization access, the backend-provided accessible-venues list MUST include all venues in the user's organization.
- **FR-004**: For users with venue-restricted access, the accessible-venues list MUST be scoped server-side to only the venues assigned to that user; the client MUST render the returned list as-is and MUST NOT rely on client-side filtering to hide out-of-scope venues.
- **FR-005**: Selecting a venue MUST set it as the active venue for the user's workspace.
- **FR-006**: After a venue is selected, downstream venue-specific views MUST preserve the current view type but reload to show the newly selected venue's default/equivalent content; selections tied to the prior venue (e.g., a specific event) MUST NOT carry over.
- **FR-007**: All venue-scoped data requests made after a selection MUST be associated with the active venue so the backend resolves data for that venue.
- **FR-008**: The system MUST reject activation of, and data access to, any venue outside the user's permitted scope, leaving the previously active venue unchanged.
- **FR-009**: The active venue selection MUST persist as the user navigates within the dashboard and across reloads within the same authenticated session, using per-tab session-scoped storage that is cleared when the tab/session closes (no cross-tab or cross-device persistence).
- **FR-010**: On first dashboard load with no prior selection, the system MUST automatically choose a default active venue from the user's accessible venues.
- **FR-011**: If a remembered venue selection is no longer accessible to the user, the system MUST fall back to a default accessible venue without error.
- **FR-012**: The system MUST present a clear empty state when the user has no accessible venues, and a clear error-with-retry state when the venue list cannot be loaded.
- **FR-013**: The venue selector MUST be operable via keyboard and expose appropriate accessible labelling/state for assistive technologies.
- **FR-014**: System MUST achieve ≥80% line/branch coverage across backend and frontend for this feature (CI-enforced; Constitution III).

### Key Entities *(include if feature involves data)*

- **Venue**: A location within an organization that scopes events and financial data. Key attributes for this feature: a unique identifier and a human-readable name used for display in the selector.
- **User Venue Scope**: The relationship that determines which venues a user may access — either full organization access (all venues) or a restricted set of assigned venues.
- **Active Venue Context**: The user's currently selected venue that governs which venue's data downstream views and requests operate against. It is held for the current tab/session via per-tab session-scoped storage and is not shared across tabs or devices.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user with access to multiple venues can switch the active venue and see downstream views reflect the new venue within 2 seconds of selection under normal conditions.
- **SC-002**: 100% of users see only venues within their permitted scope in the selector (scoped users never see unassigned venues; full-access users see all organization venues).
- **SC-003**: 100% of attempts to act on a venue outside the user's scope are denied and do not change the active venue.
- **SC-004**: A returning user within the same session retains their previously selected venue on at least 95% of dashboard navigations and reloads without needing to re-select.
- **SC-005**: ≥80% line/branch coverage achieved across backend and frontend code for this feature (CI-enforced; Constitution III).

## Assumptions

- The authenticated user's profile already exposes the user's venue scope information, and an endpoint already exists to list accessible venues already filtered server-side to the user's scope; this feature consumes those rather than defining new scope rules or performing client-side scope filtering.
- The backend already supports operating within a selected venue context and enforcing access to it; the frontend's responsibility is to communicate the active venue and respect the resulting authorization decisions.
- "Tenant/venue switching" in this feature refers to switching the active venue within the user's single organization; switching between multiple organizations is out of scope for this iteration.
- A user belongs to one organization for the purposes of this feature; multi-organization membership is not addressed here.
- Persisting the selected venue via per-tab session-scoped storage is sufficient; cross-tab synchronization and long-term cross-device preference storage are out of scope.
- The default active venue, when none is remembered, is a deterministic choice from the user's accessible venues (e.g., the first available venue).
