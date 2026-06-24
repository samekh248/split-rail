# Feature Specification: Team Invitation & User Management UI

**Feature Branch**: `016-team-invitation-ui`

**Created**: 2026-06-17

**Status**: Draft

**Input**: User description: "Build team invitation & user management UI" (Linear SPLR-60)

## Clarifications

### Session 2026-06-17

- Q: How should administrators discover and reach the Team area? → A: Nested under a Settings area — Team is a settings sub-page.
- Q: How much Settings infrastructure should this feature introduce? → A: Full Settings hub scaffold — Settings landing page plus Team and placeholder sections for future settings.
- Q: Should users without team-management permission see the Settings area? → A: Settings visible to all org members; Team link hidden and Team URL blocked, but Settings landing and placeholders are accessible.
- Q: How should administrators edit a member's role and venue scopes? → A: Modal dialog — click Edit on a member row to open a modal with role and venue scope fields.
- Q: Should removing a member from the organization require confirmation? → A: Confirmation dialog — explicit confirm/cancel step before removal.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Administrator invites a teammate (Priority: P1)

An organization administrator opens Settings and navigates to the Team sub-page, enters a colleague's email address, selects a role, and optionally limits which venues the invitee may access. After sending the invitation, the invite appears in the pending-invitations list so the administrator can confirm it was created.

**Why this priority**: Inviting teammates is the headline gap called out in SPLR-60. Backend support exists but administrators currently have no in-product way to grow their organization. This is the smallest slice that closes the collaboration dead-end.

**Independent Test**: Sign in as an administrator, open Settings → Team, submit an invitation with a valid email, a non-administrator role, and a single-venue scope; confirm the invitation appears as pending with the correct role and scope summary.

**Acceptance Scenarios**:

1. **Given** an authenticated user with permission to manage team membership, **When** they open Settings, **Then** they see a Settings landing page with navigation to Team and placeholder sections for future settings.
2. **Given** the administrator navigates to Team under Settings, **When** the Team page loads, **Then** they see a form to invite a new member by email with role selection and optional venue scope selection.
3. **Given** the administrator enters a valid email, selects the Venue Manager role, and scopes the invitation to one venue, **When** they send the invitation, **Then** a pending invitation is created and shown in the pending-invitations list with the correct email, role, and scope summary.
4. **Given** the administrator leaves venue scope empty or selects "all venues", **When** they send the invitation, **Then** the invitation is created with organization-wide venue access upon acceptance.
5. **Given** the administrator submits an invalid or empty email address, **When** they attempt to send, **Then** inline validation prevents submission and no invitation is created.
6. **Given** the administrator attempts to invite an email that already belongs to a member of the organization, **When** they submit, **Then** a clear error is shown and no duplicate invitation is created.

---

### User Story 2 - Administrator views and manages pending invitations (Priority: P2)

An administrator reviews outstanding invitations, sees each invitation's status and expiration, and can re-send or cancel invitations that have not yet been accepted.

**Why this priority**: Sending invitations without visibility into their state leaves administrators blind to onboarding progress. Managing pending invitations is tightly coupled to the invite flow but delivers standalone value once invitations exist.

**Independent Test**: Create pending and expired invitations (via the UI or seeded data), confirm they appear with status and expiry, re-send an expired invitation and confirm it returns to pending with a renewed expiration window, and cancel a pending invitation and confirm it disappears from the active list.

**Acceptance Scenarios**:

1. **Given** an administrator on the Team settings page, **When** the organization has pending invitations, **Then** each invitation is listed with email, assigned role, status, and expiration date.
2. **Given** a pending or expired invitation, **When** the administrator chooses to re-send it, **Then** the invitation returns to pending status with a renewed seven-day expiration and confirmation feedback is shown.
3. **Given** a pending invitation, **When** the administrator cancels it, **Then** it is removed from the active pending list and cannot be accepted.
4. **Given** an already-accepted invitation, **When** the administrator views it, **Then** re-send and cancel actions are unavailable.

---

### User Story 3 - Administrator manages existing members (Priority: P3)

An administrator views all current organization members with their email, role, and venue access. They can open an edit modal for a member to change role and venue scopes, or remove a member from the organization when permitted.

**Why this priority**: Team management is incomplete without the ability to adjust access after onboarding. This story builds on the member list surfaced in Story 1 and completes day-two administration needs.

**Independent Test**: Sign in as an administrator, open the edit modal for a member, change their role and venue scopes, confirm the list reflects changes after save, then remove a non-administrator member and confirm they no longer appear; attempt to demote or remove the last administrator and confirm the action is blocked with a clear message in the modal or inline error.

**Acceptance Scenarios**:

1. **Given** an administrator on the Team settings page, **When** the page loads, **Then** all organization members are listed with email, role name, and venue scope summary (specific venues or "all venues").
2. **Given** an administrator clicks Edit on a member row, **When** the edit modal opens, **Then** it displays the member's current role and venue scopes in editable fields with Save and Cancel actions.
3. **Given** an administrator changes a member's role in the edit modal and saves, **When** the save succeeds, **Then** the modal closes and the member list reflects the updated role.
4. **Given** an administrator replaces venue scopes with a subset of venues in the edit modal and saves, **When** the save succeeds, **Then** the member's access is limited to those venues and the list reflects the change.
5. **Given** an administrator clears a member's venue scope restriction in the edit modal and saves, **When** the save succeeds, **Then** the member regains access to all organization venues.
6. **Given** an administrator cancels the edit modal without saving, **When** they dismiss it, **Then** no changes are applied and the member list is unchanged.
7. **Given** an administrator initiates removal of a member who is not the last administrator, **When** the confirmation dialog appears and they confirm, **Then** the member is removed, disappears from the list, and can no longer access the organization.
8. **Given** an administrator initiates member removal, **When** they cancel the confirmation dialog, **Then** the member remains in the organization and the list is unchanged.
9. **Given** only one administrator remains, **When** an administrator attempts to demote or remove that last administrator via the edit modal or remove action, **Then** the action is blocked with a clear explanation and the administrator remains.

---

### User Story 4 - Invited user accepts and joins the organization (Priority: P4)

A person who receives an invitation link opens it, completes account setup if they do not yet have an account (or signs in if they do), accepts the invitation, and lands in the dashboard with the role and venue scope assigned by the administrator.

**Why this priority**: The invite flow is only valuable if invitees can join through the product. No accept-invitation experience currently exists in the frontend despite backend support.

**Independent Test**: Follow an invitation link with a valid token as a new user (register + accept) and as an existing user (login + accept); confirm both land in the dashboard with the assigned role and venue scope; follow an expired or invalid link and confirm a clear expiration or error message.

**Acceptance Scenarios**:

1. **Given** a valid invitation link and no existing account for the invited email, **When** the invitee completes registration and accepts, **Then** they are signed in and land in the dashboard as a member of the inviting organization with the assigned role and venue scope.
2. **Given** a valid invitation link and an existing account for the invited email, **When** the invitee signs in and accepts, **Then** they are added to the organization with the assigned role and venue scope and land in the dashboard.
3. **Given** an invitation link that is expired or invalid, **When** the invitee opens it, **Then** they see a clear message that the invitation is no longer valid and guidance to contact their administrator for a new invitation.
4. **Given** an invitee who accepts successfully, **When** they reach the dashboard, **Then** their venue switcher and accessible data reflect the assigned venue scope (single venue, subset, or all venues).

---

### User Story 5 - Non-administrators cannot manage team membership (Priority: P5)

Users who lack permission to manage team membership must not see invite, role-change, scope-change, or removal controls. They may access the Settings landing page and placeholder sections, but the Team sub-page is hidden from navigation and blocked on direct URL access.

**Why this priority**: Permission correctness is essential for multi-user trust and aligns with the existing role matrix. It must ship with the feature to avoid misleading or unauthorized management affordances.

**Independent Test**: Sign in as a non-administrator role (for example, Promoter or Venue Manager), confirm Settings is reachable and shows placeholder sections but no Team link, and attempt to reach the Team URL directly; confirm redirect or denial without management actions.

**Acceptance Scenarios**:

1. **Given** an authenticated user who lacks team-management permission, **When** they open Settings, **Then** they see the Settings landing page and placeholder sections but no Team navigation link and no invite-member, role-change, scope-change, or remove-member controls.
2. **Given** a user without team-management permission, **When** they navigate directly to the Team settings URL, **Then** they are redirected to the Settings landing page or shown an access-denied state without management actions or member data.
3. **Given** a user with team-management permission, **When** they open Settings and navigate to Team, **Then** all management capabilities described in Stories 1–3 are available.
4. **Given** a user with team-management permission on the Settings landing page, **When** they view placeholder settings sections, **Then** those sections are marked as unavailable or coming soon and offer no actionable controls.

---

### Edge Cases

- What happens when the venue list is empty at invite time? The administrator can still send an invitation with organization-wide scope; venue-scoped selection is unavailable or empty until venues exist, with explanatory copy.
- What happens when an administrator selects venues that are later deleted? Existing members lose access to deleted venues gracefully per backend rules; the UI reflects current venue names on next load.
- What happens when two administrators invite the same email simultaneously? The second attempt shows a conflict or duplicate error without creating a second active invitation.
- What happens when an invitation is re-sent while the original link is still valid? The prior link is invalidated and only the latest token works (consistent with backend re-send behavior).
- What happens when a member's role change would leave the organization without an administrator? The change is blocked with the same last-administrator protection used for removal.
- What happens when an administrator cancels a member removal confirmation? The member remains in the organization and no removal request is sent.
- What happens when network or server errors occur during invite, update, or removal? The user sees a recoverable error message and can retry without losing entered form data where appropriate.
- What happens when the invitee's password does not meet policy during acceptance registration? Inline validation prevents submission with the same password rules used elsewhere in the product (minimum eight characters with uppercase, lowercase, and digit).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a Settings area reachable from the authenticated workspace for all organization members, including a Settings landing page with navigation to sub-pages.
- **FR-001a**: System MUST include a functional Team sub-page under Settings for users with team-management permission, delivering all member and invitation management capabilities described in this spec.
- **FR-001b**: System MUST include placeholder sub-pages (or sections) on the Settings hub for future settings capabilities beyond Team; placeholders MUST be visibly marked as unavailable or coming soon and MUST NOT expose incomplete management actions.
- **FR-002**: System MUST list all current organization members showing email, role name, and venue scope summary.
- **FR-003**: System MUST allow users with team-management permission to invite a new member by email with a required role selection and optional venue scope selection.
- **FR-004**: System MUST validate invitation email addresses before submission and reject empty, malformed, or duplicate-member addresses with clear feedback.
- **FR-005**: System MUST list pending invitations with email, assigned role, status, and expiration date for users with team-management permission.
- **FR-006**: System MUST allow users with team-management permission to re-send pending or expired invitations, renewing the seven-day expiration window.
- **FR-007**: System MUST allow users with team-management permission to cancel pending invitations that have not been accepted.
- **FR-008**: System MUST allow users with team-management permission to change an existing member's role via an edit modal opened from the member list.
- **FR-009**: System MUST allow users with team-management permission to replace a member's venue scopes via the same edit modal, including clearing scopes to grant organization-wide venue access.
- **FR-009a**: System MUST discard unsaved changes when the edit modal is cancelled or dismissed without saving.
- **FR-010**: System MUST allow users with team-management permission to remove a member from the organization without deleting the member's global account, after the administrator confirms removal in an explicit confirmation dialog.
- **FR-010a**: System MUST cancel member removal with no changes when the administrator dismisses or cancels the confirmation dialog.
- **FR-011**: System MUST prevent demotion or removal of the last administrator in the organization and display a clear error when such an action is attempted.
- **FR-012**: System MUST show Settings navigation to all authenticated organization members; users without team-management permission MUST NOT see a Team sub-page link and MUST NOT access Team management actions, including on direct URL access to the Team settings page (redirect to Settings landing or access-denied without exposing member data).
- **FR-013**: System MUST provide an accept-invitation experience reachable from an invitation link that supports both new-user registration and existing-user sign-in before acceptance.
- **FR-014**: System MUST reject expired or invalid invitation tokens with a user-visible message and guidance to request a new invitation.
- **FR-015**: System MUST land successfully accepting invitees in the dashboard with the assigned role and venue scope reflected in their workspace access.
- **FR-016**: System MUST prevent duplicate submission while invite, update, or removal requests are in progress.
- **FR-017**: System MUST present validation and error feedback using the same visual and interaction patterns as existing authentication, onboarding, and venue-creation forms.
- **FR-018**: System MUST achieve ≥80% line/branch coverage across backend and frontend for this feature (CI-enforced; Constitution III), including automated tests for invite form validation and permission-gated rendering of management controls.

### Key Entities

- **Organization Member**: A user linked to an organization with an assigned role and optional venue scope. Displayed in the member list; subject to role, scope, and removal management.
- **Invitation**: A pending, accepted, or expired request for a person to join the organization. Carries invited email, assigned role, optional venue scopes, status, and expiration (seven days from creation or last re-send).
- **Role**: A named permission profile within the organization (Admin, Venue Manager, Promoter, External Bookkeeper, or custom). Selected when inviting or reassigning members.
- **Venue Scope**: The set of venues a member or invitee may access; empty or unrestricted means all organization venues.
- **Team-management permission**: The authorization capability (aligned with the Admin role's manage-permissions flag in the standard role matrix) that gates who may view and use team-management controls.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of administrators with team-management permission can invite a new member entirely through the product UI without external tools or API calls.
- **SC-002**: 100% of valid invitation acceptance attempts (new and existing users) result in dashboard access with the administrator-assigned role and venue scope.
- **SC-003**: 100% of users without team-management permission never see a Team sub-page link or actionable invite, role-change, scope-change, or removal controls; they may access the Settings landing and placeholder sections only.
- **SC-004**: 100% of attempts to demote or remove the last administrator are blocked with a user-visible explanation.
- **SC-005**: Invalid invitation submissions (empty email, malformed email, duplicate member) are rejected with visible feedback in 100% of tested cases without creating spurious records.
- **SC-006**: Expired or invalid invitation links show a clear, actionable message in 100% of tested cases rather than a generic failure.
- **SC-007**: Administrators can complete a single-member invite (email, role, optional scope) in under two minutes under normal network conditions.
- **SC-008**: ≥80% line/branch coverage achieved across backend and frontend code for this feature (CI-enforced; Constitution III).

## Assumptions

- Backend team invitation, member listing, role assignment, venue scope management, and invitation acceptance are already implemented (001-tenant-rbac-foundation User Story 6 and User Story 5); this feature adds user-facing UI only with no new server endpoints required unless gaps are discovered during planning.
- The Settings hub is accessible to all authenticated organization members; only users with team-management permission see and can access the Team sub-page.
- "Team-management permission" corresponds to users who can manage permissions in the standard role matrix (typically organization Administrators).
- The Team management UI lives as a sub-page under a Settings hub that includes a landing page, Team (fully functional for permitted users), and placeholder sections for future settings; placeholder sections are out of scope for implementation beyond visible navigation stubs.
- Role permission flag editing (customizing what each role can do) is out of scope; administrators assign existing roles to members but do not edit role permission matrices in this feature.
- Invitations expire after seven days; re-send resets the expiration window, consistent with established tenant RBAC behavior.
- Venue scope selection lists only venues in the current organization that the administrator can see.
- Accept-invitation links carry a token parameter; email delivery mechanism is already handled by the backend and is not part of this UI scope.
- Multi-organization switching for users who belong to more than one organization remains deferred; acceptance adds the user to the inviting organization and lands them in that organization's dashboard context.
- Password policy for new invitees matches existing registration rules (minimum eight characters with uppercase, lowercase, and digit).
- Frontend data contracts for member, invitation, role, and venue payloads are consumed from generated API types rather than hand-written interfaces, per contract-governance rules.

## Dependencies

- Tenant RBAC foundation with invitation and user-management backend (001-tenant-rbac-foundation).
- Authentication, registration, and form validation patterns (006-login-registration-layout, 007-registration-org-onboarding).
- Venue listing for scope multi-select (009-venue-switcher-dropdown, 014-venue-creation-ui).
- Permission-gated UI patterns established for venue management (014-venue-creation-ui).
