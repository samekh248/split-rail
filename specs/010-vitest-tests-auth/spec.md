# Feature Specification: Vitest Coverage for Auth Layouts & Venue Selector

**Feature Branch**: `010-vitest-tests-auth`

**Created**: 2026-06-16

**Status**: Draft

**Input**: User description: "Vitest tests for auth layouts and venue selector" (Linear SPLR-25)

## Clarifications

### Session 2026-06-16

- Q: Which "permission-gated UI elements" should the tests cover in the auth/venue surfaces? → A: Only role/permission-conditional controls that already exist (e.g., venue-switcher rendering by scope and any role-conditional dashboard control already present); do not invent new gating.
- Q: How should this feature treat the auth/venue test files that already exist under `apps/web/tests/` (from features 006/008/009)? → A: Extend/consolidate the existing files to fill coverage gaps and avoid duplication.
- Q: Which layer should the auth/venue tests target? → A: Both component level (LoginForm/RegisterForm/VenueSwitcher) and page/container level (LoginPage/RegisterPage/Dashboard shell).

## User Scenarios & Testing *(mandatory)*

<!--
  This feature delivers automated verification (component-level tests) for the
  authentication layouts and the venue selector. The "users" of this feature are
  the engineering team and CI: the value is confidence that auth and venue UI
  behaviors are correct and protected against regression, and that the frontend
  meets the project-mandated coverage gate. Each user story below is an
  independently demonstrable slice of verified behavior.
-->

### User Story 1 - Auth forms render and validate (Priority: P1)

As a maintainer of the authentication experience, I need automated verification that the login and registration screens render their required fields and surface validation errors, so that a regression in the sign-in or sign-up entry point is caught before release.

**Why this priority**: The login and registration screens are the single gateway to the platform. Verifying that they render correctly and block invalid input is the highest-value, lowest-dependency slice and is explicitly called out as the primary gap. It can be demonstrated entirely on its own.

**Independent Test**: Run the auth-layout test suite in isolation and confirm it asserts that (a) each form renders its required, labeled fields and submit action, and (b) submitting an empty or invalid form surfaces inline validation messages and prevents a submission/callback. The suite passes without any other story being implemented.

**Acceptance Scenarios**:

1. **Given** the login screen is rendered in a test, **When** the suite inspects it, **Then** it verifies an email field, a password field, and a submit action are present and labeled.
2. **Given** the registration screen is rendered in a test, **When** the suite inspects it, **Then** it verifies exactly the email, password, and organization-name fields and a submit action are present and labeled.
3. **Given** a rendered auth form, **When** the suite submits it with empty fields, **Then** it asserts that inline validation messages appear for the affected fields and the submit handler is not invoked.
4. **Given** a rendered auth form, **When** the suite submits a malformed email or a password failing the strength rules, **Then** it asserts the corresponding inline validation message is shown.

---

### User Story 2 - Venue selector respects user scope (Priority: P2)

As a maintainer of the multi-tenant workspace, I need automated verification that the venue selector renders only the venues provided for the current (scoped) user and lets the user switch between them, so that a regression that leaks out-of-scope venues or breaks switching is caught automatically.

**Why this priority**: Correct venue scoping is essential to tenant trust, but verifying it builds on the rendering patterns proven in Story 1. It is the second independent slice and is separately demonstrable.

**Independent Test**: Run the venue-selector test suite with a stubbed accessible-venues list for a restricted user and confirm it asserts that only those venues appear, that selecting one updates the active venue, and that the single-venue / empty cases behave correctly. The suite passes independently of Story 1 and Story 3.

**Acceptance Scenarios**:

1. **Given** a stubbed accessible-venues list for a restricted user, **When** the selector is rendered, **Then** the suite asserts only the provided (scoped) venues are listed and none outside that list appear.
2. **Given** a rendered selector with multiple venues, **When** the suite activates a non-active venue, **Then** it asserts the active venue updates to the chosen venue.
3. **Given** the active venue, **When** the selector is rendered, **Then** the suite asserts the active venue is clearly indicated.
4. **Given** a single accessible venue (or none), **When** the selector is rendered, **Then** the suite asserts the appropriate single-venue display (or absence of a switchable control) is shown.

---

### User Story 3 - Permission-gated UI elements are hidden (Priority: P3)

As a maintainer of role-based access, I need automated verification that UI elements gated by permission are hidden for roles that lack access, so that a regression that exposes restricted controls is caught automatically. This story covers only role/permission-conditional controls that already exist in the in-scope auth and venue surfaces (e.g., venue-switcher rendering driven by venue scope and any role-conditional dashboard control already present); it does not introduce new gating.

**Why this priority**: Role-gating is important for least-privilege behavior, but it is the narrowest slice and depends on the rendering and scope patterns established in Stories 1–2. It can still be demonstrated on its own.

**Independent Test**: Render an existing role/permission-conditional control in the auth/venue surfaces with a role lacking access and confirm the suite asserts the gated element is absent, then render with an authorized role and confirm it asserts the element is present. The suite passes independently.

**Acceptance Scenarios**:

1. **Given** a user whose role lacks access to a permission-gated element, **When** the UI is rendered in a test, **Then** the suite asserts the gated element is not present.
2. **Given** a user whose role has access, **When** the UI is rendered in a test, **Then** the suite asserts the gated element is present and usable.

---

### Edge Cases

- **Submission already in progress**: The suite verifies that a form in a pending state disables its submit action so duplicate submissions are not triggered.
- **Server-side failure vs. validation failure**: The suite distinguishes inline field-validation messages from a form-level error message surfaced when an authentication/registration request is rejected.
- **Remembered venue no longer accessible**: The suite verifies the selector falls back to a default accessible venue rather than showing an out-of-scope or broken selection.
- **No accessible venues**: The suite verifies a clear empty/neutral state instead of a broken or empty control.
- **Keyboard operability**: The suite verifies the venue selector can be opened and a venue chosen via keyboard interaction.
- **Coverage attribution**: New tests must execute the targeted auth/venue source so they contribute measurable coverage rather than asserting against trivial stubs.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The test suite MUST verify the login screen renders its required, labeled fields (email, password) and a submit action.
- **FR-002**: The test suite MUST verify the registration screen renders exactly its required, labeled fields (email, password, organization name) and a submit action.
- **FR-003**: The test suite MUST verify that submitting an auth form with empty required fields produces inline validation messages for the affected fields and prevents the submit callback from firing.
- **FR-004**: The test suite MUST verify that invalid input (malformed email, password not meeting strength rules) produces the corresponding inline validation message.
- **FR-005**: The test suite MUST verify that a form-level error (e.g., rejected credentials or duplicate account) is rendered distinctly from field-level validation and is announced to assistive technology.
- **FR-006**: The test suite MUST verify that the venue selector renders only the accessible-venues list provided for the current user and never displays venues outside that provided list.
- **FR-007**: The test suite MUST verify that selecting a venue updates the active venue and that the currently active venue is clearly indicated.
- **FR-008**: The test suite MUST verify the single-accessible-venue and no-accessible-venue presentations of the venue selector.
- **FR-009**: The test suite MUST verify that the venue selector is operable via keyboard (open and select).
- **FR-010**: The test suite MUST verify that existing role/permission-conditional UI elements within the in-scope auth/venue surfaces are absent for roles lacking access and present for roles with access. The feature does not introduce new gating; tests cover only controls whose conditional rendering already exists.
- **FR-010a**: Coverage MUST span both the component level (e.g., the login form, registration form, and venue switcher) and the page/container level (e.g., the login page, registration page, and dashboard shell that hosts the selector).
- **FR-011**: The test suite MUST verify that a pending/in-progress submission state disables the submit action to prevent duplicate submissions.
- **FR-012**: The tests MUST run as part of the standard automated verification command and pass in CI.
- **FR-013**: System MUST achieve ≥80% line/branch coverage across backend and frontend for this feature, with the new tests measurably contributing to the frontend portion of that gate (CI-enforced; Constitution III).

### Key Entities *(include if feature involves data)*

- **Auth Form Under Test**: The login or registration screen, characterized by its set of labeled input fields, submit action, validation messages, and form-level error message.
- **Accessible-Venues List**: The scope-correct set of venues supplied to the selector for the current user; the basis for asserting that only in-scope venues render.
- **Active Venue Selection**: The currently selected venue indicated in the selector and changed when the user picks a different venue.
- **Role/Permission Context**: The current user's role used to drive whether permission-gated UI elements should render.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of the in-scope behaviors (auth form rendering, auth validation, venue scope/rendering, venue switching, permission gating) are covered by at least one passing automated test.
- **SC-002**: The auth and venue test suites pass reliably (no flakiness) across consecutive CI runs.
- **SC-003**: A reviewer can run the verification command and see the auth and venue suites execute and report results in under 2 minutes locally.
- **SC-004**: An intentionally introduced regression in any in-scope behavior (e.g., removing a required field, leaking an out-of-scope venue, or exposing a gated control) causes at least one test to fail.
- **SC-005**: ≥80% line/branch coverage achieved across backend and frontend code for this feature, with the new auth/venue tests measurably raising frontend coverage toward the gate (CI-enforced; Constitution III).

## Assumptions

- The auth layout components (login/registration screens, form fields, validation) and the venue selector already exist; this feature adds and/or completes their automated verification rather than building new product UI.
- Partial auth/venue test files already exist under `apps/web/tests/` (from features 006/008/009); this feature extends and consolidates those files to fill coverage gaps and avoid duplication rather than authoring fully independent parallel suites.
- Tests target both the component level (login form, registration form, venue switcher) and the page/container level (login page, registration page, dashboard shell hosting the selector).
- Frontend component behavior is verified with the project's standard component-testing approach (Vitest + React Testing Library, per Constitution III), driven by stubbed inputs/contracts rather than live backend calls.
- Venue scope is enforced server-side; tests supply a scope-correct accessible-venues list as the stubbed input and assert the client renders it faithfully without relying on client-side scope filtering.
- Data contracts used by the tests come from the generated API types (`apps/web/src/types/generated-api.ts`) rather than hand-written interfaces, per contract-governance rules.
- "Permission-gated UI elements" refers to controls whose visibility already depends on the current user's role/permissions within the auth and venue surfaces in scope here; this feature does not introduce new gating, and broader RBAC behaviors are validated by their own features (e.g., tenant RBAC) and E2E isolation specs.
- The coverage gate is global; this feature's contribution is the frontend auth/venue portion, and backend coverage for the same gate is satisfied by its corresponding backend tests where applicable.
