# Feature Specification: Top-Level Tenant Foundation & Granular RBAC

**Feature Branch**: `001-tenant-rbac-foundation`

**Created**: 2026-06-13

**Status**: Draft

**Input**: User description: "SPLR-16 — Establish the security perimeter, top-level tenant boundaries, and multi-user collaboration layer for the MVP. Delivers foundational identity, organization, venue, and RBAC infrastructure that all downstream features depend on."

**Linear Issue**: [SPLR-16](https://linear.app/audiodex/issue/SPLR-16/splr-16-top-level-tenant-foundation-and-granular-rbac)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Organization Creation & Onboarding (Priority: P1)

A new user registers for the platform and creates their first Organization. During onboarding, the system automatically provisions four default roles with pre-configured permissions matching the standard role matrix. The user who created the Organization is automatically assigned the Admin role.

**Why this priority**: Organizations are the fundamental tenant boundary. Nothing else works — venues, roles, invitations — without an Organization existing first. This is the absolute foundation.

**Independent Test**: Can be fully tested by registering a new user, creating an Organization, and verifying the creator has Admin access and four default roles exist. Delivers the ability to onboard new customers.

**Acceptance Scenarios**:

1. **Given** a visitor on the registration page, **When** they complete registration and create an Organization, **Then** their account is created, the Organization is provisioned with four default roles, and they are assigned the Admin role.
2. **Given** a registered user with no Organization, **When** they attempt to access any protected feature, **Then** they are redirected to the Organization creation flow.
3. **Given** an Organization is created, **When** the default roles are inspected, **Then** all four roles (Admin, Venue Manager/GM, Promoter/Booker, External Bookkeeper) exist with permissions matching the standard role matrix.

---

### User Story 2 - Cross-Tenant Data Isolation (Priority: P1)

Users from one Organization must never see, access, or retrieve any data belonging to another Organization. This is a zero-tolerance security boundary — all data queries are scoped to the authenticated user's Organization.

**Why this priority**: Equal to P1 because cross-tenant contamination is an absolute release blocker. The platform cannot launch without this guarantee.

**Independent Test**: Can be fully tested by creating two Organizations with users, then attempting to access Organization A's data while authenticated as a user from Organization B. Every attempt must be denied.

**Acceptance Scenarios**:

1. **Given** two Organizations exist (Org A and Org B), **When** a user from Org A requests data, **Then** only Org A's data is returned — never Org B's.
2. **Given** a user from Org A, **When** they attempt to directly access an Org B resource by manipulating identifiers, **Then** the system returns a denial and no data is leaked.
3. **Given** a user authenticated to Org A, **When** any data listing endpoint is called, **Then** the results contain exclusively Org A data regardless of how many other Organizations exist.

---

### User Story 3 - User Authentication & Session Management (Priority: P1)

Users log in with their email and password. The system issues a stateless token that is attached to all subsequent requests. Unauthenticated requests to protected endpoints are rejected before any business logic executes.

**Why this priority**: Authentication is the gateway to every other feature. Without verified identity, no RBAC, no tenant isolation, no collaboration.

**Independent Test**: Can be fully tested by logging in with valid credentials, verifying access to protected endpoints, and confirming that requests without valid credentials are rejected.

**Acceptance Scenarios**:

1. **Given** a registered user, **When** they submit valid login credentials, **Then** they receive an authentication token and can access protected resources.
2. **Given** an unauthenticated visitor, **When** they attempt to access any protected endpoint, **Then** the request is rejected before reaching business logic.
3. **Given** a user with an expired access token but a valid refresh token, **When** they make a request, **Then** the system issues a new access token transparently without requiring re-login.
4. **Given** a user with both an expired access token and an expired refresh token, **When** they make a request, **Then** the system rejects the request and prompts full re-authentication.

---

### User Story 4 - Role-Based Permission Enforcement (Priority: P2)

Each user within an Organization is assigned a role that determines which features they can access. The system enforces permission checks on every protected action. Admins have full access; other roles have progressively restricted permissions per the default role matrix.

**Why this priority**: Once users can authenticate and Organizations exist, the system must enforce what each user is allowed to do. Critical for multi-user collaboration.

**Independent Test**: Can be fully tested by assigning different roles to users and verifying that each role can only perform the actions their permission flags allow.

**Acceptance Scenarios**:

1. **Given** a user with the Admin role, **When** they attempt any action in the system, **Then** the action is permitted.
2. **Given** a user with the Promoter/Booker role, **When** they attempt to manage organization permissions, **Then** the action is denied.
3. **Given** a user with the External Bookkeeper role, **When** they attempt to edit settlement cells, **Then** the action is denied.
4. **Given** an Admin, **When** they toggle a specific permission on or off for a role, **Then** that role's effective permissions are updated for all users holding that role within the Organization.

---

### User Story 5 - Venue Management & Venue-Scoped Access (Priority: P2)

Organizations can create and manage multiple Venues. Users can be scoped to specific Venues within their Organization. Users with no explicit venue scope have access to all Venues in their Organization. Users with explicit venue scopes can only access data for those specific Venues.

**Why this priority**: Venue-level scoping is essential for organizations that operate multiple locations and need to restrict visibility per user. Builds directly on top of tenant isolation.

**Independent Test**: Can be fully tested by creating multiple Venues under an Organization, scoping a user to one specific Venue, and verifying they can only see that Venue's data.

**Acceptance Scenarios**:

1. **Given** an Organization with three Venues, **When** a user with no venue scope logs in, **Then** they can see and interact with all three Venues.
2. **Given** a user scoped to Venue A only, **When** they attempt to access Venue B data, **Then** the system denies access.
3. **Given** an Admin, **When** they create a new Venue under their Organization, **Then** the Venue appears in the workspace and is immediately accessible to users with organization-wide venue access.

---

### User Story 6 - Team Invitation & Role Assignment (Priority: P2)

Organization Admins can invite new users to join their Organization by email. When an invited user accepts, they are assigned a role and optionally scoped to specific Venues.

**Why this priority**: Multi-user collaboration is a core requirement. Organizations need to bring team members on board with the right access levels.

**Independent Test**: Can be fully tested by sending an invitation, accepting it as a new user, and verifying the new user has the assigned role and venue scope.

**Acceptance Scenarios**:

1. **Given** an Admin of Org A, **When** they invite a user by email with the "Venue Manager" role, **Then** the invited user receives an invitation and can accept it.
2. **Given** an invitation is accepted, **When** the new user logs in, **Then** they are part of Org A with the Venue Manager role and the specified venue scope.
3. **Given** a non-Admin user, **When** they attempt to invite another user, **Then** the invitation is denied.

---

### User Story 7 - Workspace Context Switching (Priority: P3)

Users who belong to an Organization with multiple Venues can switch their active Venue context from the workspace interface. The context switch updates the user's view to show data relevant to the selected Venue. Users only see Venues they are authorized to access.

**Why this priority**: Improves usability for multi-venue users but is not blocking for basic functionality. Core data access works without a context switcher.

**Independent Test**: Can be fully tested by logging in as a user with access to multiple Venues, switching context, and verifying the displayed data updates accordingly.

**Acceptance Scenarios**:

1. **Given** a user with access to three Venues, **When** they open the context switcher, **Then** exactly three Venues are listed.
2. **Given** a user scoped to one Venue, **When** they open the context switcher, **Then** only their scoped Venue is shown.
3. **Given** a user switches from Venue A to Venue B, **When** the switch completes, **Then** all displayed data reflects Venue B's context.

---

### Edge Cases

- What happens when the last Admin of an Organization is removed or deactivated? The system must prevent orphaning an Organization without an Admin.
- What happens when a user is invited to an Organization but already has an account in a different Organization? They should be able to belong to multiple Organizations.
- What happens when an Admin customizes a role's permissions and then a new default feature permission is added in a future release? Customized roles should be preserved while new permissions adopt safe defaults.
- How does the system behave when a Venue is deleted but users are still scoped to it? Users should lose access to the deleted Venue gracefully, and their scope should be updated.
- What happens if a user's authentication token contains a reference to an Organization they've been removed from? The system must reject the request and force re-authentication.
- What happens when an invitation link is clicked after the 7-day expiration window? The system must display an expiration notice and prompt the user to contact the Admin for a new invitation.

## Clarifications

### Session 2026-06-13

- Q: What is the authentication token lifetime strategy? → A: 1-hour access token with a 7-day refresh token.
- Q: What are the password policy requirements? → A: 8+ characters, requires at least one uppercase letter, one lowercase letter, and one digit.
- Q: Do invitations expire? → A: Yes, invitations expire after 7 days. Admins can re-send expired invitations.
- Q: How does the "Restricted" financial view for Promoters work? → A: A simple boolean flag per expense line item, toggled by Admins, hides flagged items from Promoter roles.
- Q: How do multi-org users switch between Organizations? → A: Deferred to post-MVP. Multi-org users are rare at launch; Organization switching will be addressed in a future feature.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST support creating Organizations as the top-level tenant boundary for all data.
- **FR-002**: System MUST support creating and managing multiple Venues under an Organization.
- **FR-003**: System MUST allow user registration with email and password. Passwords must be at least 8 characters and contain at least one uppercase letter, one lowercase letter, and one digit.
- **FR-004**: System MUST issue a short-lived access token (1-hour expiration) and a long-lived refresh token (7-day expiration) upon successful login. Access tokens authorize API requests; refresh tokens allow obtaining new access tokens without re-entering credentials.
- **FR-005**: System MUST reject all unauthenticated requests to protected endpoints before executing business logic.
- **FR-006**: System MUST enforce row-level data isolation — all data queries scoped to the authenticated user's Organization.
- **FR-007**: System MUST provision four default roles (Admin, Venue Manager/GM, Promoter/Booker, External Bookkeeper) with pre-configured permissions when an Organization is created.
- **FR-008**: System MUST enforce permission checks on every protected action based on the user's assigned role.
- **FR-009**: System MUST allow Organization Admins to toggle individual permission flags on any role, creating custom permission configurations per Organization.
- **FR-010**: System MUST support scoping users to specific Venues within their Organization; users with no explicit venue scope have access to all Venues.
- **FR-011**: System MUST allow Admins to invite users by email, assigning a role and optional venue scope upon acceptance. Invitations expire after 7 days; Admins can re-send expired invitations.
- **FR-012**: System MUST provide a workspace context switcher that shows only the Venues the user is authorized to access.
- **FR-013**: System MUST prevent the last Admin from being removed from an Organization.
- **FR-014**: System MUST ensure that deleting a Venue gracefully removes venue-scoped access for affected users.
- **FR-015**: System MUST never log cleartext personal information, tokens, or secrets in application logs.

### Default System Roles Matrix

| Feature / Action                  | Admin | Venue Manager / GM | Promoter / Booker  | External Bookkeeper |
| --------------------------------- | ----- | ------------------ | ------------------ | ------------------- |
| Manage Orgs & Permissions         | Yes   | No                 | No                 | No                  |
| Lock Budgets / Proformas          | Yes   | Yes                | Yes                | No                  |
| Edit Settlement Cells             | Yes   | Yes                | No                 | No                  |
| Apply Night-of Touch Signature    | Yes   | Yes                | No                 | No                  |
| Trigger Manual QBO Sync           | Yes   | Yes                | No                 | Yes                 |
| Map New QBO Account Rows          | Yes   | No                 | No                 | Yes                 |
| View Financial Dashboard Grid     | Yes   | Yes                | Yes (Restricted)*  | Yes                 |

*Organizations can flag specific expense line items as hidden from Promoter roles via a per-item boolean flag (`is_hidden_from_promoters`), toggled by Admins, to protect sensitive internal margins.*

### Key Entities

- **Organization**: The top-level tenant boundary. All data belongs to exactly one Organization. Contains a name and creation timestamp. Owns Venues and Roles.
- **Venue**: A physical or logical location operated by an Organization. Belongs to exactly one Organization. Users can be scoped to specific Venues.
- **User**: An individual account identified by a unique email address. Can belong to one or more Organizations with a specific role in each.
- **Organization Role**: A named permission profile scoped to a single Organization. Contains boolean permission flags for each protected action. Four defaults are seeded on Organization creation; Admins can customize flags.
- **User-Organization Mapping**: Links a User to an Organization with a specific Role. A user has exactly one role per Organization.
- **User-Venue Scope**: Optionally restricts a User's access to specific Venues within their Organization. No scope entries means access to all Venues.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero cross-tenant data leakage — users from Organization A must never retrieve data belonging to Organization B under any circumstance.
- **SC-002**: New users can complete registration and Organization creation in under 3 minutes.
- **SC-003**: Invited users can accept an invitation and access their assigned workspace within 2 minutes of clicking the invitation link.
- **SC-004**: Permission-denied responses are returned within 500 milliseconds for unauthorized actions, with no partial data exposure.
- **SC-005**: The system supports at least 100 concurrent authenticated users across multiple Organizations without degradation in response times.
- **SC-006**: 95% of users can successfully switch venue context and see updated data within 2 seconds.
- **SC-007**: All four default roles are correctly provisioned with accurate permission flags on 100% of Organization creations.
- **SC-008**: Test coverage reaches at least 80% line/branch coverage for both the authentication/authorization layer and the front-end user flows.

## Assumptions

- Users have stable internet connectivity (this is a web-based SaaS application).
- Email delivery infrastructure for user invitations is available and reliable.
- The existing project infrastructure (cloud database, hosting) is available and configured per the project's infrastructure blueprint.
- Mobile-native support is out of scope for this feature — web browser only.
- Events, financial line items, QBO sync logic, deal math, and PDF generation are out of scope and deferred to future features.
- End-to-end browser automation tests (e.g., Playwright) are deferred to a future issue; this feature covers unit and integration tests only.
- A single user can belong to multiple Organizations (each with an independent role assignment). Organization-level context switching UI is deferred to post-MVP; multi-org users will initially access their primary Organization.
- Password policy: minimum 8 characters, must contain at least one uppercase letter, one lowercase letter, and one digit. No special character requirement.
