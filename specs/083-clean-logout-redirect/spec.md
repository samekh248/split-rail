# Feature Specification: Clean Logout Redirect

**Feature Branch**: `083-clean-logout-redirect`

**Created**: 2026-08-15

**Status**: Draft

**Input**: User description: "When the site logs out, the user should return to the sign in page, with no reference to where they came from in the url."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Intentional logout lands on a clean sign-in page (Priority: P1)

An authenticated operator chooses Sign out from the account menu. After logout completes, they see the sign-in page, and the browser address bar shows only the standard sign-in location—with no path, query string, or fragment that points back to the page they were on before signing out.

**Why this priority**: This is the core request. Leaving a prior workspace, venue, or event path in the URL after logout is confusing, can look like a broken deep link, and may expose operational context in a shared or screenshotable address bar.

**Independent Test**: From any authenticated screen, sign out and confirm the visible URL is the canonical sign-in URL with no prior-location reference, and the sign-in form is shown.

**Acceptance Scenarios**:

1. **Given** an authenticated user is viewing any in-app page (for example dashboard, venues, booking calendar, event workspace, settings, or festival itinerary), **When** they sign out, **Then** they are shown the sign-in page and the browser URL is the canonical sign-in URL with no leftover path, query, or hash referring to the previous page.
2. **Given** an authenticated user signs out successfully, **When** they inspect the address bar, **Then** there is no return/redirect/from-style parameter encoding the previous location.
3. **Given** a user has just signed out, **When** they sign in again with valid credentials, **Then** they enter the normal post-login experience (not forced back to the pre-logout page by URL state).

---

### User Story 2 - Logout from nested or sensitive screens still clears location context (Priority: P2)

Operators often sign out from deep screens (event ledgers, settlements, invite acceptance while already signed in). Logout must still replace that location with a clean sign-in URL so residual context is not left behind.

**Why this priority**: Deep routes are where leftover URLs are most misleading; this extends P1 to the highest-risk locations without changing the product’s authenticated navigation model.

**Independent Test**: Open a deep authenticated route, sign out, and verify the URL and page match the clean sign-in outcome from P1.

**Acceptance Scenarios**:

1. **Given** an authenticated user is on a deep route (event workspace, settlement, festival itinerary/ledger/reports, or settings), **When** they sign out, **Then** the URL becomes the canonical sign-in URL with no residual deep-route segments.
2. **Given** an authenticated user is on the accept-invite flow and chooses to sign out, **When** logout finishes, **Then** they land on the clean sign-in URL (invite token handling after re-login remains unchanged and is out of scope for this feature’s URL cleanup requirement).

---

### Edge Cases

- What happens if logout fails to reach the server but local session is cleared anyway? The user still ends on the clean sign-in URL and must authenticate again to continue.
- What happens if the user is already on the sign-in page and triggers logout (or an equivalent session clear)? The URL remains the canonical sign-in URL with no additional prior-location parameters added.
- How does the system handle browser back after logout? Returning to a previously authenticated page must not restore a signed-in experience; the user remains signed out and is directed to sign in again without relying on a pre-logout return URL in the address bar.
- Session-expired messaging may still appear on the sign-in page when appropriate, but must not depend on encoding the previous page in the URL.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: After a successful intentional logout, the system MUST present the sign-in page as the next screen the user sees.
- **FR-002**: After logout, the browser URL MUST be the canonical sign-in location and MUST NOT retain the pre-logout path, query string, or fragment.
- **FR-003**: After logout, the browser URL MUST NOT include any parameter or token whose purpose is to remember or return the user to the pre-logout location.
- **FR-004**: Logout MUST clear the authenticated session such that continuing to use the product requires signing in again.
- **FR-005**: Completing sign-in after a clean logout MUST follow the normal authenticated entry path and MUST NOT require a pre-logout return URL to succeed.
- **FR-006**: The clean sign-in URL behavior MUST apply regardless of which authenticated page the user signed out from.
- **FR-007**: System MUST achieve ≥80% line/branch coverage across backend and frontend for this feature (CI-enforced; Constitution III)

### Key Entities *(include if feature involves data)*

- **Sign-in page**: The unauthenticated entry screen where users enter credentials.
- **Canonical sign-in URL**: The standard address for that sign-in page, with no prior-location reference.
- **Authenticated session**: The signed-in state that logout ends.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In 100% of intentional logout checks from a representative set of authenticated pages (at least five distinct areas), the resulting URL matches the canonical sign-in URL with zero prior-location references.
- **SC-002**: After logout, users can complete sign-in again on the first attempt using valid credentials without needing a remembered return path.
- **SC-003**: Manual or automated spot-checks find no leftover event, venue, settings, or festival path segments in the address bar immediately after logout.
- **SC-004**: ≥80% line/branch coverage achieved across backend and frontend code for this feature (CI-enforced; Constitution III)

## Assumptions

- “Sign in page” means the product’s existing email/password login view (not a new authentication method).
- “No reference to where they came from in the URL” means no path segments and no query/hash parameters that encode the previous page; cosmetic branding on the login screen itself is unchanged.
- Scope is intentional logout and equivalent local session teardown that lands the user on sign-in; redesign of invite acceptance, password reset, or post-login deep-link behavior while authenticated is out of scope.
- Session-expired notice copy on the sign-in page may remain if already part of the product, as long as it does not require storing the previous page in the URL.
- Canonical sign-in URL is whatever the product already treats as the login entry address (for example the root unauthenticated route), normalized so logout always converges there.
