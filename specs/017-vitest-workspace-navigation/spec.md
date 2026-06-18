# Feature Specification: Vitest Coverage for Workspace Navigation & Tenant Management UX

**Feature Branch**: `017-vitest-workspace-navigation`

**Created**: 2026-06-17

**Status**: Draft

**Input**: User description: "Vitest tests for workspace navigation and tenant management UX" (Linear SPLR-61)

## Clarifications

### Session 2026-06-17

- Q: How deep should team-management test coverage go in this feature? → A: Full team component coverage — invite form, invitation list (resend/cancel), member list, edit modal, remove confirm.
- Q: Which unauthorized-access pattern should tests treat as canonical for direct team settings URL access? → A: Silent redirect — send unauthorized users to the settings landing page with no error message.
- Q: Should org/venue rename tests be part of this feature's completion criteria? → A: Explicitly deferred — exclude rename-form tests from this feature's DoD until a dedicated rename UI feature ships.
- Q: How should this feature treat existing test files under `apps/web/tests/`? → A: Extend/consolidate existing files — fill coverage gaps and avoid duplication.
- Q: Should event combobox edit/delete test coverage be in scope for this feature? → A: Out of scope — edit/delete remains owned by feature 015; this feature covers list/select/create/venue-switch reset only.

## User Scenarios & Testing *(mandatory)*

<!--
  This feature delivers automated verification (component- and page-level tests) for
  workspace navigation and tenant-management surfaces: venue creation, event selection,
  settings hub, and team management. The "users" of this feature are the engineering
  team and CI: the value is confidence that multi-tenant workspace flows behave
  correctly, permission gating is enforced in the UI, and the frontend meets the
  project-mandated coverage gate. Each user story below is an independently
  demonstrable slice of verified behavior.
-->

### User Story 1 - Venue workspace and creation flows are verified (Priority: P1)

As a maintainer of the multi-tenant dashboard, I need automated verification that venue empty states, creation affordances, and the create-venue form behave correctly for permitted and restricted roles, so that regressions in the primary workspace onboarding path are caught before release.

**Why this priority**: Venue selection is the gateway to all venue-scoped product value. Without verified empty-state and creation behavior, administrators and restricted users can see misleading affordances or hit dead ends. This is the highest-value slice and maps directly to the blocking gap in SPLR-61.

**Independent Test**: Run the venue-workspace test suite in isolation with stubbed user permissions and venue lists. Confirm it asserts (a) empty-state call-to-action visibility for users with venue-management permission and absence for restricted users, (b) create-venue form validation for empty and over-length names, and (c) successful creation refreshes the venue list and selects the new venue. The suite passes without any other story being implemented.

**Acceptance Scenarios**:

1. **Given** a user with venue-management permission and zero accessible venues, **When** the dashboard is rendered in a test, **Then** the suite asserts an empty-state "Add venue" (or equivalent) call-to-action is present.
2. **Given** a user without venue-management permission and zero accessible venues, **When** the dashboard is rendered, **Then** the suite asserts the empty state appears without any create-venue control.
3. **Given** the create-venue page is rendered, **When** the suite submits an empty or whitespace-only venue name, **Then** it asserts inline validation prevents submission and no create callback fires.
4. **Given** the create-venue page is rendered, **When** the suite submits a venue name exceeding the maximum allowed length, **Then** it asserts an inline validation message is shown and submission is blocked.
5. **Given** a successful venue creation response, **When** the suite completes the create flow, **Then** it asserts the user returns to the dashboard, the venue list includes the new venue, and the new venue becomes the active selection.
6. **Given** a user without venue-management permission, **When** they navigate to the create-venue page in a test, **Then** the suite asserts they are redirected away without seeing the creation form.

---

### User Story 2 - Event picker and selection transitions are verified (Priority: P2)

As a maintainer of the event workspace, I need automated verification that the event combobox lists venue-scoped events, switching events updates the ledger context, and creating an event transitions the user to the ledger for the new event, so that regressions in event navigation are caught automatically.

**Why this priority**: Event selection unblocks the core ledger surface. It builds on venue context from Story 1 but is independently demonstrable with stubbed event data.

**Independent Test**: Run the event-selection test suite with stubbed events for an active venue. Confirm it asserts events appear in the combobox, selecting a different event updates the active event, venue switching clears the prior event selection, and a successful inline create-event flow selects the new event and shows the ledger workspace. Event combobox edit/delete flows are out of scope (owned by feature 015).

**Acceptance Scenarios**:

1. **Given** an active venue with multiple events, **When** the dashboard is rendered, **Then** the suite asserts the event combobox lists only events for that venue with title and date visible.
2. **Given** multiple events in the combobox, **When** the suite selects a different event, **Then** it asserts the active event updates and the ledger area reflects the newly selected event.
3. **Given** a user with event-management permission and zero events for the active venue, **When** the dashboard is rendered, **Then** the suite asserts a no-events empty state with a create-event call-to-action is shown.
4. **Given** a user without event-management permission and zero events, **When** the dashboard is rendered, **Then** the suite asserts the no-events empty state appears without a create control.
5. **Given** the inline create-event panel is open, **When** the suite submits valid title and date, **Then** it asserts the new event is created, selected as active, and the ledger workspace is shown.
6. **Given** a selected event in venue A, **When** the suite switches the active venue to venue B, **Then** it asserts the prior event selection is cleared and events for venue B load.

---

### User Story 3 - Settings hub navigation and permission gating are verified (Priority: P3)

As a maintainer of the settings experience, I need automated verification that the settings landing page exposes the correct navigation cards, routes users to the right sub-pages, and blocks or hides team-management areas for users without permission, so that least-privilege settings access is enforced in the UI.

**Why this priority**: Settings is the entry point for organization and team administration. Permission correctness is essential for multi-user trust but is narrower than the dashboard workspace flows in Stories 1–2.

**Independent Test**: Render the settings landing page and sub-routes with varied permission stubs. Confirm the suite asserts Team navigation is visible only for users with team-management permission, organization and integrations cards are reachable, direct navigation to the team URL silently redirects unauthorized users, and organization/integrations placeholder pages render without broken navigation. Organization and venue rename-form tests are out of scope for this feature until a dedicated rename UI feature ships.

**Acceptance Scenarios**:

1. **Given** any authenticated organization member, **When** the settings landing page is rendered, **Then** the suite asserts a settings hub with navigation to organization and integrations sections is present.
2. **Given** a user with team-management permission, **When** the settings landing page is rendered, **Then** the suite asserts a Team navigation card or link is visible and navigates to the team settings route.
3. **Given** a user without team-management permission, **When** the settings landing page is rendered, **Then** the suite asserts the Team card is absent.
4. **Given** a user without team-management permission, **When** they navigate directly to the team settings URL in a test, **Then** the suite asserts they are silently redirected to the settings landing page without an error message and without exposing invite or member-management controls.
5. **Given** a user navigates to organization or integrations settings, **When** the placeholder sub-page is rendered, **Then** the suite asserts expected placeholder copy and navigation are shown without broken routing.

---

### User Story 4 - Team management components and page integration are verified (Priority: P4)

As a maintainer of team administration, I need automated verification across the full team-management component set — invite form, invitation list (resend/cancel), member list, edit modal, and remove confirmation — plus page-level team settings integration, so that collaboration UI regressions are caught automatically.

**Why this priority**: Team management completes the tenant-administration surface area identified in SPLR-61. Full component coverage matches feature 016 deliverables and is independently runnable against team page and child components.

**Independent Test**: Run the team test suite with stubbed invitations, members, roles, and venues. Confirm it asserts invite form fields and validation, invitation list resend/cancel for pending items (and absent actions for accepted invitations), member list scoped data, edit modal save/cancel and last-admin guard, remove-confirm pattern, and team page integration for permitted users.

**Acceptance Scenarios**:

1. **Given** a user with team-management permission on the team settings page, **When** the page is rendered, **Then** the suite asserts invite form fields for email, role selection, and optional venue scope are present.
2. **Given** the invite form is rendered, **When** the suite submits an empty or malformed email, **Then** it asserts inline validation prevents submission.
3. **Given** stubbed organization members, **When** the member list is rendered, **Then** the suite asserts each row shows email, role name, and venue scope summary matching the stubbed data.
4. **Given** stubbed pending invitations, **When** the invitation list is rendered, **Then** the suite asserts each invitation shows email, role, status, and venue scope summary.
5. **Given** a pending or expired invitation, **When** the invitation list is rendered, **Then** the suite asserts re-send and cancel actions are available and invoke the expected callbacks.
6. **Given** an accepted invitation, **When** the invitation list is rendered, **Then** the suite asserts re-send and cancel actions are absent.
7. **Given** a member row, **When** the edit modal is opened and saved with valid changes, **Then** the suite asserts the modal closes and updated role/scope is persisted via callback.
8. **Given** the edit modal is open, **When** the user cancels or attempts to demote/remove the last administrator, **Then** the suite asserts no change is applied or a clear last-admin error is shown.
9. **Given** a member remove action, **When** the suite simulates the confirmation dialog, **Then** it asserts confirm proceeds and cancel aborts without removal.

---

### Edge Cases

- **Submission already in progress**: The suite verifies create-venue and invite forms disable their submit action while a request is pending.
- **Server-side failure vs. validation failure**: The suite distinguishes inline field-validation messages from form-level or banner errors surfaced when a create/invite request is rejected.
- **Remembered venue no longer accessible**: The suite verifies the dashboard falls back to a default accessible venue rather than showing a broken selection (extends venue-switcher patterns from feature 010).
- **No accessible venues after permission change**: The suite verifies a clear empty/neutral state instead of a broken workspace shell.
- **Events load failure**: The suite verifies an error state with retry is shown when the event list cannot be loaded.
- **Settings placeholder sections**: Until organization rename UI ships, the suite verifies placeholder settings sub-pages render expected copy without broken navigation.
- **Coverage attribution**: New tests must execute the targeted workspace/tenant source files so they contribute measurable coverage rather than asserting against trivial stubs.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The test suite MUST verify that users with venue-management permission see a create-venue call-to-action in the zero-venue empty state and persistent shell action when venues exist.
- **FR-002**: The test suite MUST verify that users without venue-management permission do not see create-venue controls in empty or populated dashboard states.
- **FR-003**: The test suite MUST verify create-venue form inline validation for empty, whitespace-only, and over-maximum-length venue names, blocking submission in each case.
- **FR-004**: The test suite MUST verify that successful venue creation returns to the dashboard, includes the new venue in the list, and selects it as the active venue.
- **FR-005**: The test suite MUST verify that unauthorized users hitting the create-venue route are redirected without access to the form.
- **FR-006**: The test suite MUST verify the event combobox lists only events for the active venue and updates the active event (and ledger context) on selection.
- **FR-007**: The test suite MUST verify no-events empty states show a create call-to-action only for users with event-management permission.
- **FR-008**: The test suite MUST verify that a successful inline create-event flow selects the new event and shows the ledger workspace.
- **FR-009**: The test suite MUST verify event selection resets when the active venue changes.
- **FR-009a**: Event combobox edit and delete flows are explicitly out of scope for this feature and remain owned by feature 015 component tests.
- **FR-010**: The test suite MUST verify the settings landing page is reachable by all authenticated members and exposes organization and integrations navigation.
- **FR-011**: The test suite MUST verify Team settings navigation is available only to users with team-management permission, and that unauthorized direct navigation to the team settings URL silently redirects to the settings landing page without an error message.
- **FR-012**: The test suite MUST verify organization and integrations settings placeholder sub-pages render expected copy and navigation. Organization and venue rename-form tests are explicitly out of scope for this feature and deferred until a dedicated rename UI feature ships.
- **FR-013**: The test suite MUST verify the team invite form renders required fields and blocks invalid email submission.
- **FR-014**: The test suite MUST verify member and invitation lists render scope-correct stubbed data (email, role, venue scope summary, invitation status).
- **FR-015**: The test suite MUST verify invitation list re-send and cancel actions are available for pending/expired invitations and absent for accepted invitations.
- **FR-015a**: The test suite MUST verify the member edit modal saves valid role/scope changes, cancels without applying changes, and blocks demotion/removal of the last administrator.
- **FR-015b**: The test suite MUST verify destructive member removal requires an explicit confirmation step with confirm proceeding and cancel aborting.
- **FR-016**: Coverage MUST span both the component level (e.g., invite form, member list, event combobox, settings navigation) and the page/container level (e.g., dashboard home, create-venue page, settings landing, team settings page).
- **FR-017**: New and extended tests MUST live under `apps/web/tests/` following established patterns from features 006–010 (Vitest + React Testing Library, stubbed API responses, no live backend). This feature extends and consolidates existing test files from sibling features 014–016 to fill coverage gaps and avoid duplication rather than creating parallel dedicated suites.
- **FR-018**: The tests MUST run as part of the standard automated verification command and pass in CI via the existing Vitest job.
- **FR-019**: System MUST achieve ≥80% line/branch coverage across backend and frontend for this feature, with the new workspace/tenant tests measurably contributing to the frontend portion of that gate (CI-enforced; Constitution III).

### Key Entities *(include if feature involves data)*

- **Accessible-Venues List**: Scope-correct venues for the current user; basis for empty-state and switcher assertions.
- **Active Venue / Active Event Selection**: Current workspace context driving dashboard and ledger rendering.
- **Create-Venue Form**: Dedicated page form characterized by venue name field, validation messages, and submit/cancel actions.
- **Event Combobox**: Searchable selector listing venue-scoped events with create/edit affordances for permitted users.
- **Settings Hub**: Landing page with navigation cards to Team, Organization, and Integrations sub-areas.
- **Team Invite Form**: Email, role, and optional venue scope fields with validation and submission states.
- **Member / Invitation Row**: List item showing identity, role, scope summary, and status used for scoped-data rendering assertions.
- **Permission Context**: Current user's role and capabilities driving conditional UI visibility.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of the in-scope behaviors listed in SPLR-61 (venue empty state/creation, event picker/creation, settings navigation/gating, team invite/member list) are covered by at least one passing automated test. Organization and venue rename-form coverage is explicitly excluded until a dedicated rename UI feature ships.
- **SC-002**: The workspace/tenant test suites pass reliably (no flakiness) across consecutive CI runs.
- **SC-003**: A reviewer can run the verification command and see the workspace/tenant suites execute and report results in under 3 minutes locally.
- **SC-004**: An intentionally introduced regression in any in-scope behavior (e.g., exposing create-venue to restricted users, leaking cross-venue events, or showing team controls to non-admins) causes at least one test to fail.
- **SC-005**: ≥80% line/branch coverage achieved across backend and frontend code for this feature, with the new workspace/tenant tests measurably raising frontend coverage toward the gate (CI-enforced; Constitution III).

## Assumptions

- UI surfaces under test are delivered by sibling features in the "Gap: Workspace Navigation & Tenant Management UX" milestone (venue creation UI — SPLR-57/014, event list & selection — SPLR-58/015, team invitation & settings hub — SPLR-60/016). Tests may land incrementally as each UI slice merges; this feature consolidates and completes coverage rather than blocking on a single big-bang UI drop.
- Partial or in-progress test files already exist under `apps/web/tests/` from sibling features 014–016; this feature extends and consolidates those files to fill coverage gaps and avoid duplication, following the same approach as feature 010. No separate parallel test directory is introduced.
- Organization and venue rename-form tests are explicitly deferred to a future dedicated rename UI feature; this feature covers settings hub navigation, team URL gating, and placeholder sub-page rendering only.
- Frontend component behavior is verified with Vitest + React Testing Library (Constitution III), driven by stubbed inputs and fetch responses rather than live backend calls.
- Venue and event scope are enforced server-side; tests supply scope-correct stubbed lists and assert the client renders them faithfully.
- Data contracts used by tests come from generated API types rather than hand-written interfaces, per contract-governance rules.
- Auth and venue-switcher coverage from feature 010 remains in scope for that feature; this feature focuses on workspace navigation and tenant-management surfaces not already covered there, without duplicating auth-layout tests.
- Event combobox edit and delete flows are owned by feature 015; this feature covers event list/select/create and venue-switch reset only.
- The global coverage gate applies to the whole frontend; this feature's primary contribution is measurable coverage of new workspace/tenant components, hooks, and pages.
