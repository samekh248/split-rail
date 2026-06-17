# Feature Specification: Venue Creation UI with Empty-State CTA

**Feature Branch**: `014-venue-creation-ui`

**Created**: 2026-06-17

**Status**: Draft

**Input**: User description: "Build venue creation UI with empty-state CTA" (Linear SPLR-57)

## Clarifications

### Session 2026-06-17

- Q: Should the venue creation form expand inline within the empty state, or open in a modal/overlay dialog? → A: Dedicated page — navigate to a separate create-venue screen, then return to the dashboard.
- Q: Where should permitted users be able to start venue creation? → A: Anywhere in dashboard — empty-state CTA plus a persistent header/shell action for permitted users regardless of venue count.
- Q: What should the user experience be when a non-permitted user hits the create-venue page? → A: Silent redirect — send the user back to the dashboard with no message.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Admin creates their first venue from the dashboard empty state (Priority: P1)

A newly onboarded organization administrator lands on the dashboard and sees that no venues exist yet. A clear call-to-action navigates them to a dedicated create-venue page where they enter a venue name. After successful creation, they return to the dashboard where the new venue becomes their active workspace and they can begin managing events and ledgers without using external tools.

**Why this priority**: This closes the dead-end after onboarding identified in SPLR-57. Without it, administrators who complete registration cannot reach any venue-scoped product value despite the organization being set up. It is the minimum viable slice that unblocks the primary admin journey.

**Independent Test**: Sign in as an organization administrator with zero venues, follow the empty-state call-to-action to the create-venue page, submit a valid name, and confirm the user is returned to the dashboard with the new venue's event/ledger area active.

**Acceptance Scenarios**:

1. **Given** an authenticated user with venue-management permission and an organization with zero venues, **When** the dashboard loads, **Then** an empty state is shown with a primary "Add venue" (or equivalent) call-to-action.
2. **Given** the empty-state call-to-action is visible, **When** the user activates it, **Then** they are navigated to a dedicated create-venue page with a field for the venue name.
3. **Given** the user is on the create-venue page and enters a valid venue name, **When** creation succeeds, **Then** they are returned to the dashboard, the venue list reflects the new venue, the new venue is automatically selected as active, and the event/ledger workspace is shown.
4. **Given** the user has just created their first venue, **When** they navigate within the dashboard, **Then** the newly created venue remains the active venue for the session.

---

### User Story 2 - Admin adds another venue from the dashboard shell (Priority: P2)

An organization administrator who already has one or more venues uses a persistent "Add venue" action in the dashboard header/shell to open the same dedicated create-venue page, add another location, and return to the workspace with the new venue selected.

**Why this priority**: Multi-venue organizations need a discoverable creation path beyond the first-venue empty state. Shipping only the empty-state CTA would force admins back into a dead-end workaround once the first venue exists.

**Independent Test**: Sign in as a permitted user with at least one existing venue, activate the persistent shell "Add venue" action, create a second venue, and confirm return to the dashboard with the new venue active and visible in the venue switcher.

**Acceptance Scenarios**:

1. **Given** an authenticated user with venue-management permission and at least one accessible venue, **When** the dashboard loads, **Then** a persistent "Add venue" (or equivalent) action is visible in the dashboard header/shell.
2. **Given** the persistent shell action is visible, **When** the user activates it, **Then** they are navigated to the same dedicated create-venue page used by the empty-state CTA.
3. **Given** the user creates an additional venue successfully, **When** they return to the dashboard, **Then** the venue list includes the new venue, the new venue is automatically selected as active, and the workspace reloads for that venue.

---

### User Story 3 - Users without venue-management permission see a read-only empty state (Priority: P3)

A user who belongs to an organization but lacks permission to manage venues may encounter an organization with no venues (for example, before an administrator has added one). They should understand why the workspace is empty without being offered actions they cannot perform.

**Why this priority**: Permission correctness is essential for multi-user trust and aligns with the existing role matrix. It is sequenced after the primary creation flow because the admin path is the blocking gap, but gating must ship with the feature to avoid misleading affordances.

**Independent Test**: Sign in as a user without venue-management permission in an organization with zero venues and confirm the empty state appears without any create-venue control; sign in as a permitted user with existing venues and confirm the persistent shell action is visible; sign in as a non-permitted user with existing venues and confirm the shell action is absent.

**Acceptance Scenarios**:

1. **Given** an authenticated user who lacks venue-management permission, **When** the dashboard loads and the organization has zero venues, **Then** the empty state is shown without a create-venue button or link.
2. **Given** an authenticated user who lacks venue-management permission, **When** they view the empty state, **Then** explanatory copy indicates that a venue must be added (by someone with appropriate access) before work can begin.
3. **Given** an authenticated user who lacks venue-management permission, **When** the dashboard loads and the organization has one or more venues, **Then** no persistent shell "Add venue" action is shown.
4. **Given** an authenticated user with venue-management permission, **When** the organization has zero venues, **Then** both the empty-state call-to-action and the persistent shell action navigate to the create-venue page.

---

### User Story 4 - Venue name validation and creation errors are handled clearly (Priority: P4)

When creating a venue on the dedicated create-venue page, the user receives immediate feedback for invalid input and for failures during submission, using the same interaction patterns as other account and organization forms in the product so the experience feels consistent and recoverable.

**Why this priority**: Validation and error handling prevent bad data and reduce support burden, but the happy path in Story 1 delivers core value on its own. This story hardens the feature for real-world use.

**Independent Test**: Attempt to submit empty, whitespace-only, and over-length venue names and confirm inline validation messages; simulate a failed creation and confirm a user-visible error without losing entered data where appropriate.

**Acceptance Scenarios**:

1. **Given** the user is on the create-venue page, **When** they submit an empty or whitespace-only name, **Then** an inline validation message is shown and no creation request is sent.
2. **Given** the user is on the create-venue page, **When** they enter a name longer than the maximum allowed length (200 characters after trimming), **Then** validation prevents submission or shows an error before submission.
3. **Given** the user submits a valid name, **When** the creation request is in flight, **Then** the submit control is disabled (or otherwise prevented from duplicate submission) until the request completes.
4. **Given** the user submits a valid name from the create-venue page, **When** creation fails due to a server or network error, **Then** a clear error message is displayed on the page and the user can correct and retry without losing their entered name.

---

### Edge Cases

- What happens when creation succeeds but refreshing the venue list fails? The user sees an error with a retry option; if the new venue is known, the system should attempt to select it once the list loads successfully.
- What happens when the user leaves the create-venue page without submitting (cancel control or back navigation)? They return to the dashboard without creating a venue; if venues already existed, the previously active venue remains selected.
- What happens when a user without venue-management permission navigates directly to the create-venue page URL? They are silently redirected to the dashboard with no message and no venue is created.
- What happens when the user double-clicks or rapidly activates submit? Only one creation request is sent while a request is in flight.
- What happens when an organization already has venues but the user lacks access to any of them? This feature does not change scoped-empty behavior; the existing venue switcher and scope rules continue to apply (out of scope for the zero-venue empty state).
- What happens when a duplicate venue name is submitted? The system accepts or rejects according to existing backend rules; if rejected, the user sees the server-provided or generic validation error without a silent failure.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display a dedicated empty state on the dashboard when the authenticated user's organization has zero accessible venues.
- **FR-002**: System MUST provide a primary call-to-action on the zero-venue empty state that navigates users with venue-management permission to a dedicated create-venue page.
- **FR-002a**: System MUST provide a persistent "Add venue" action in the dashboard header/shell for users with venue-management permission, visible regardless of whether the organization already has venues, navigating to the same dedicated create-venue page.
- **FR-002b**: System MUST provide a dedicated create-venue page reachable from both the empty-state CTA and the persistent shell action, with cancel/back navigation returning the user to the dashboard without creating a venue.
- **FR-002c**: System MUST deny access to the create-venue page for users who lack venue-management permission by silently redirecting them to the dashboard (no error or explanation message), even when the URL is entered directly.
- **FR-003**: System MUST collect a venue display name in the creation flow and require a non-empty value after trimming leading and trailing whitespace.
- **FR-004**: System MUST enforce a maximum venue name length of 200 characters (after trimming), consistent with organization and venue naming rules elsewhere in the product.
- **FR-005**: System MUST create the venue under the user's current organization when a permitted user submits a valid name.
- **FR-006**: System MUST refresh the user's venue list after successful creation and automatically set the new venue as the active workspace venue.
- **FR-007**: System MUST return the user to the dashboard after successful creation; when the organization had zero venues, transition from the empty state to the event/ledger workspace; when venues already existed, reload the workspace for the newly created active venue.
- **FR-008**: System MUST hide or disable all create-venue affordances (empty-state CTA and persistent shell action) for users who lack venue-management permission.
- **FR-009**: System MUST prevent duplicate submission while a create request is in progress.
- **FR-010**: System MUST show inline validation errors for invalid venue names before or at submit time, and show user-visible errors when creation fails.
- **FR-011**: System MUST present validation and error feedback using the same visual and interaction patterns as existing authentication and onboarding forms.
- **FR-012**: System MUST achieve ≥80% line/branch coverage across backend and frontend for this feature (CI-enforced; Constitution III).

### Key Entities

- **Venue**: A location operated by an organization; has a display name and belongs to exactly one organization. Created venues become selectable in the workspace venue context.
- **Organization**: The tenant boundary; venue creation always occurs within the user's active organization.
- **Venue-management permission**: The authorization capability (aligned with the Admin role's permission to manage permissions in the standard role matrix) that gates who may create venues from the UI.
- **Active venue**: The venue currently selected in the workspace; after first creation, the new venue becomes active so downstream views load in the correct scope.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of organization administrators with zero venues can create their first venue entirely through the dashboard UI without external tools or support intervention.
- **SC-002**: 100% of users without venue-management permission never see an actionable create-venue control (empty-state CTA or persistent shell action).
- **SC-003**: Users with permission can complete venue creation (from either entry point through active workspace) in under 1 minute when network conditions are normal.
- **SC-004**: Invalid name submissions (empty, whitespace-only, over-length) are blocked with visible feedback in 100% of tested cases without creating a venue record.
- **SC-005**: Duplicate rapid submissions during an in-flight create request do not result in duplicate venue creation attempts from the UI.
- **SC-006**: ≥80% line/branch coverage achieved across backend and frontend code for this feature (CI-enforced; Constitution III).

## Assumptions

- Venue creation is already supported by the backend for permitted users; this feature adds user-facing creation paths on the dashboard (empty-state CTA and persistent shell action) via a dedicated create-venue page.
- Venue name validation rules (required, trimmed, maximum 200 characters) match those established for venue updates in the organization and venue management feature set.
- "Venue-management permission" corresponds to users who can manage permissions in the standard role matrix (typically organization Administrators); other roles never see create-venue affordances in the shell or empty state.
- The dashboard empty state for zero venues already exists from onboarding work; this feature adds the interactive call-to-action and a dedicated create-venue page rather than redesigning onboarding.
- After creation, the existing venue context and session persistence behavior (active venue remembered for the tab session) applies to the newly created venue.
- Event list and selection improvements (SPLR-58) are a separate follow-on; this feature only needs to land the user in the workspace with the new venue active, using whatever default event context the dashboard currently provides.

## Dependencies

- Organization registration and onboarding flow that lands new users on the dashboard with a valid zero-venue empty state (007-registration-org-onboarding).
- Multi-venue workspace context and venue switcher (009-venue-switcher-dropdown).
- Backend venue creation and permission gating (001-tenant-rbac-foundation, 011-complete-organization-and).
- Established form validation and error-display patterns from login and registration flows (006-login-registration-layout).
