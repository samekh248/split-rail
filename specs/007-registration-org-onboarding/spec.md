# Feature Specification: Registration & Organization Onboarding Flow

**Feature Branch**: `007-registration-org-onboarding`

**Created**: 2026-06-16

**Status**: Draft

**Input**: User description: "Build registration & organization onboarding flow" (Linear SPLR-22)

## Clarifications

### Session 2026-06-16

- Q: How much of the post-onboarding landing is in scope for this feature? → A: Route into the existing dashboard route and ensure it renders a valid, non-erroring empty state for a brand-new org; additionally, show a dedicated post-onboarding welcome modal that pops up on first landing.
- Q: How long should an authenticated session persist? → A: Persist until explicit sign-out or token expiry — the session survives a full browser close/restart.
- Q: What should happen on load when the persisted access token is missing/expired/invalid? → A: Attempt a silent refresh using the stored refresh token; if that fails, clear the session and show the login screen.
- Q: What should happen when a returning user logs in but belongs to no organization? → A: Route them into the organization-creation step to finish onboarding.

## User Scenarios & Testing *(mandatory)*

<!--
  These user stories are prioritized journeys. Each is independently testable and
  delivers a standalone slice of value. P1 is the minimum viable slice.
-->

### User Story 1 - New user onboards and becomes Admin of a new organization (Priority: P1)

A first-time visitor with no account provides their email, a password, and the name of their organization. On submission, an account is created, an organization is created with that visitor as its Admin, and the visitor is taken directly into the (initially empty) dashboard workspace as an authenticated Admin—without any separate sign-in step.

**Why this priority**: This is the core gap. Today nothing wires account creation to organization creation and a post-registration landing. Without it, a brand-new user cannot reach a usable workspace, so no downstream venue/event/ledger value is reachable. It is the minimum viable slice.

**Independent Test**: Can be fully tested by starting from a signed-out state, completing the onboarding form with valid values, submitting, and confirming the user lands in the dashboard as an authenticated Admin of a newly created organization—then signing out and confirming the account and organization persist.

**Acceptance Scenarios**:

1. **Given** a signed-out visitor on the onboarding/registration screen, **When** they submit a valid email, a valid password, and an organization name, **Then** an account and organization are created, the visitor is assigned the Admin role for that organization, and they are routed into the dashboard workspace as an authenticated user.
2. **Given** a newly onboarded user in the dashboard, **When** the dashboard first renders, **Then** it reflects the empty state of a brand-new organization (no pre-existing venues/events) without errors.
3. **Given** a user who has just completed onboarding, **When** they first land in the dashboard, **Then** a dedicated welcome modal is shown that can be dismissed to reveal the empty dashboard workspace.
4. **Given** a visitor completing onboarding, **When** the account is created successfully but the organization cannot be created, **Then** the user is informed that the account exists but organization setup did not complete, is not left in a broken half-onboarded dashboard, and is offered a way to retry organization setup without re-entering their password.
5. **Given** a visitor submitting the onboarding form, **When** the submitted email already belongs to an existing account, **Then** an inline error explains the email is already in use and no duplicate account or organization is created.

---

### User Story 2 - Returning user signs in without re-onboarding (Priority: P2)

A user who already has an account and organization opens the application, uses the login-only path (email + password), and is taken into their existing organization's dashboard. They are never asked to create another organization.

**Why this priority**: Returning access is essential for ongoing use, but it depends on at least one account/organization existing (P1). It is the second independent slice.

**Independent Test**: Can be fully tested by signing in with credentials for an existing account and confirming the user reaches their existing organization's dashboard with no organization-creation step presented.

**Acceptance Scenarios**:

1. **Given** a returning user on the login screen, **When** they submit valid credentials, **Then** they are routed into the dashboard for their existing organization without being prompted to create an organization.
2. **Given** a returning user on the login screen, **When** they submit credentials that are not accepted, **Then** an inline error is shown and they remain on the login screen.
3. **Given** a signed-out user, **When** they choose to register instead of sign in (or vice versa), **Then** they can move between the login-only path and the new-user onboarding path.
4. **Given** a returning user whose account belongs to no organization (incomplete prior onboarding), **When** they log in with valid credentials, **Then** they are routed into the organization-creation step to finish onboarding and become Admin of the organization they create, rather than landing in a tenant-less dashboard.

---

### User Story 3 - Authenticated session persists across reloads (Priority: P3)

After onboarding or signing in, a user can refresh the page or return to the application in the same browser session and remain authenticated, landing back in their dashboard rather than being forced to sign in again.

**Why this priority**: Session persistence removes friction and prevents accidental loss of context, but the system is still usable for a single session without it (P1/P2). It is the third independent slice.

**Independent Test**: Can be fully tested by onboarding or signing in, reloading the application, and confirming the user remains authenticated and lands in the dashboard; then signing out and confirming a reload returns them to the signed-out entry screen.

**Acceptance Scenarios**:

1. **Given** an authenticated user, **When** they reload the application within the same browser session, **Then** they remain authenticated and are returned to the dashboard without re-entering credentials.
2. **Given** an authenticated user, **When** they sign out, **Then** their persisted session is cleared and a subsequent reload shows the signed-out entry screen.
3. **Given** a user whose persisted access token is expired, **When** the application loads and a stored refresh token is available, **Then** the system silently refreshes the session and returns them to the dashboard; **and given** the refresh fails (or no valid refresh token exists), **then** the persisted session is cleared and they are returned to the signed-out entry screen rather than shown a broken or partially authenticated dashboard.

---

### Edge Cases

- What happens when the account is created but organization creation fails (network/server error)? The user must not be stranded; they are told the account exists, organization setup is incomplete, and can retry organization setup without re-entering their password, and no orphaned/duplicate organization is created on retry.
- What happens when a user who is already authenticated navigates to the registration or login entry screen? They are directed into the dashboard rather than shown the entry forms again.
- What happens when an authenticated user has no organization (a prior onboarding that created the account but not the organization)? They are routed into the organization-creation step to complete onboarding instead of a tenant-less dashboard.
- Does the post-onboarding welcome modal reappear on later visits? It appears only for the first post-onboarding landing and is not shown for ordinary returning-user logins.
- What is shown while authentication state is being determined on initial load? A non-flickering neutral/loading state precedes showing either the dashboard or the entry screen.
- How does the system behave if the user double-submits the onboarding or login form? Duplicate submissions are prevented while a request is in progress, and only one account/organization is created.
- What happens if onboarding succeeds but the dashboard data cannot be loaded yet (brand-new empty organization)? The user still lands in the dashboard and sees a valid empty state, not an error.
- How is the user's Admin role reflected after onboarding? The onboarded user has Admin privileges for the newly created organization for the remainder of the authenticated session.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a new-user onboarding path that collects the information needed to create both a user account and an organization.
- **FR-002**: System MUST, on successful onboarding, create a user account and create an organization for which the onboarding user is assigned the Admin role.
- **FR-003**: System MUST place the onboarding user into an authenticated session as part of a successful onboarding, without requiring a separate manual sign-in step.
- **FR-004**: System MUST redirect the user into the dashboard workspace immediately after successful onboarding.
- **FR-005**: System MUST render the dashboard in a valid empty state for a brand-new organization that has no venues, events, or ledger data.
- **FR-005a**: System MUST display a dedicated post-onboarding welcome modal when a newly onboarded user first lands in the dashboard, and MUST allow the user to dismiss it to reveal the empty dashboard workspace. The welcome modal MUST appear only for the new-onboarding landing and MUST NOT reappear for ordinary returning-user logins.
- **FR-006**: System MUST provide a returning-user login-only path that authenticates an existing account and routes into that account's existing organization dashboard without prompting for organization creation.
- **FR-006a**: System MUST, when an authenticated user belongs to no organization (e.g., a previously incomplete onboarding), route them into the organization-creation step to finish onboarding rather than into a tenant-less dashboard, and assign them the Admin role for the organization created there.
- **FR-007**: System MUST persist the authenticated session so the user remains authenticated across page reloads and full browser close/restart, until the session token expires or the user explicitly signs out.
- **FR-008**: System MUST restore the authenticated state on application load when a valid persisted session exists, routing the user into the dashboard.
- **FR-008a**: System MUST, on application load when the persisted access token is missing or expired, attempt a silent session refresh using the stored refresh token; on a successful refresh it MUST restore the authenticated state and route into the dashboard, and on a failed refresh it MUST clear the persisted session and show the login screen.
- **FR-009**: System MUST clear the persisted session on sign-out so that subsequent loads return the user to the signed-out entry screen.
- **FR-010**: System MUST return an authenticated user who navigates to the login or registration entry screen into the dashboard instead of re-presenting the entry forms.
- **FR-011**: System MUST present a non-flickering neutral/loading state while authentication state is being resolved on initial load.
- **FR-012**: System MUST prevent duplicate account or organization creation caused by repeated or concurrent submissions of the onboarding form.
- **FR-013**: System MUST handle the case where account creation succeeds but organization creation fails by informing the user, avoiding a broken half-onboarded dashboard, and offering a retry of organization setup that does not require re-entering the password and does not create duplicate organizations.
- **FR-014**: System MUST display an inline error, without creating a duplicate account, when onboarding is attempted with an email already associated with an existing account.
- **FR-015**: System MUST allow users to move between the new-user onboarding path and the returning-user login path.
- **FR-016**: System MUST scope the created organization and the user's Admin role to that organization so the user's authenticated context is associated with their own organization only.
- **FR-017**: Frontend data contracts for registration, login, and organization creation MUST be consumed from the generated API types rather than hand-authored payload interfaces.
- **FR-018**: System MUST achieve ≥80% line/branch coverage across backend and frontend for this feature (CI-enforced; Constitution III).

### Key Entities *(include if feature involves data)*

- **User Account**: The identity a person creates and authenticates with (email + password). The starting point of onboarding.
- **Organization**: The tenant workspace created during onboarding. The onboarding user becomes its Admin. All subsequent workspace data is scoped to it.
- **Membership / Role Assignment**: The association between the onboarding user and the new organization, carrying the Admin role granted at creation.
- **Authenticated Session**: The persisted proof of authentication established at onboarding/login that survives reloads and is cleared on sign-out, and that determines whether the user lands in the dashboard or the entry screen.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time user can go from the signed-out entry screen to an authenticated dashboard as Admin of a newly created organization in under 2 minutes and within a single uninterrupted flow.
- **SC-002**: 100% of successful onboardings result in the user holding the Admin role for the newly created organization and landing in that organization's dashboard.
- **SC-003**: A returning user can sign in and reach their existing organization's dashboard with zero organization-creation prompts and no page reload required to see errors.
- **SC-004**: An authenticated user who reloads within the same browser session remains authenticated and returns to the dashboard in 100% of cases where the persisted session is still valid.
- **SC-005**: Every failed onboarding or login attempt (invalid credentials, duplicate email, failed organization setup, or service error) results in a visible inline message and a non-broken recoverable state, with no silent failures and no orphaned or duplicate organizations.
- **SC-006**: ≥80% line/branch coverage achieved across backend and frontend code for this feature (CI-enforced; Constitution III).

## Assumptions

- The backend endpoints for account registration, authentication, and organization creation already exist (including the organization-creation endpoint that seeds the Admin role); this feature wires the user-facing onboarding flow, session persistence, and post-onboarding routing that consume them.
- Onboarding collects the organization name together with the account credentials in a single flow; "register account → create organization" describes the sequence of operations rather than mandating separate screens. The new user becomes Admin of exactly one organization created during onboarding.
- "Dashboard" refers to the existing primary authenticated landing experience (the venue/event ledger workspace), which is expected to render a valid empty state for a brand-new organization.
- The persisted session relies on the platform's existing token storage mechanism and survives a full browser close/restart on the same device until token expiry or explicit sign-out; full cross-device session management is out of scope.
- The login/registration form layout, field-level validation, responsiveness, and accessibility are delivered by the companion login & registration layout feature (SPLR-21 / 006); this feature focuses on the flow, role assignment, session persistence, and routing behavior built on top of those components.
- This feature does not include password reset, social/SSO login, email verification, multi-factor authentication, inviting additional members, switching between multiple organizations, or organization editing/deletion; those are out of scope for this slice.
- Each onboarding creates one new organization; joining an existing organization via invitation is out of scope.
