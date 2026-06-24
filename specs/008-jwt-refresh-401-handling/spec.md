# Feature Specification: JWT Persistence, Refresh Rotation & 401 Handling in API Client

**Feature Branch**: `008-jwt-refresh-401-handling`

**Created**: 2026-06-16

**Status**: Draft

**Input**: User description: "JWT persistence, refresh rotation & 401 handling in API client (SPLR-23). Gap: `apps/web/src/api/client.ts` only reads `accessToken` from LocalStorage, has no refresh-token rotation, and `apiFetch()` only throws on non-OK — no 401 handler or redirect to login. Scope: write tokens on login/register, attach Bearer token, on 401 attempt refresh via `/api/auth/refresh` then clear tokens and redirect to login on failure, and provide an auth-gated app shell. Acceptance: authenticated requests carry a valid Bearer token; expired access token transparently refreshes once; repeated failure logs the user out; unauthenticated users are redirected to login."

## Clarifications

### Session 2026-06-16

- The token-persistence and on-load-refresh portions of SPLR-23 were partially delivered by feature 007 (`tokenStorage`, `authBootstrap`, `authApi.refreshSession`). The **remaining gap**, and the focus of this feature, is the **shared API request layer (`apiFetch`)**: it does not transparently recover from an access token that expires *mid-session*, does not coordinate concurrent recovery, and does not drive a global sign-out when recovery is impossible.
- Q: When the refresh request itself fails due to a network/connectivity error (server unreachable) rather than an authentication rejection, what should happen? → A: Keep stored credentials, surface a connectivity error and allow the original action to be retried — do NOT sign the user out.
- Q: When the system signs the user out automatically (driven by a failed 401 recovery), should it notify the server logout endpoint? → A: Best-effort call the server logout endpoint, then clear credentials locally and route to login regardless of that call's outcome.
- Q: Does the transparent refresh-and-retry-once apply to all authenticated requests, or reads only? → A: All authenticated requests, including create/update/delete operations (a 401 means the server did not process the request, so replaying it once after refresh is safe).
- Q: When the user is automatically signed out because the session couldn't be recovered, should the login screen explain why? → A: Yes — show a brief "Your session expired — please sign in again" notice on the login screen.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Stay signed in when an access token expires mid-session (Priority: P1)

A signed-in user has been working in the app long enough that their short-lived access token has expired, but their longer-lived refresh credential is still valid. When they perform their next action (open a venue, load the ledger, save a change), the action succeeds without the user noticing anything: the system silently obtains a fresh access token and completes the original request.

**Why this priority**: This is the core value of the feature. Without it, every user is abruptly kicked out the moment their access token expires — even though they are still legitimately authenticated — turning a routine session into a frustrating, data-losing interruption. It is the single most impactful behavior described in the source issue's acceptance criteria.

**Independent Test**: Sign in, force the access token to be treated as expired while keeping a valid refresh credential, then trigger any authenticated data request. The request resolves successfully, the user remains on the same screen, and no error is shown.

**Acceptance Scenarios**:

1. **Given** a signed-in user whose access token has expired but whose refresh credential is valid, **When** they trigger any authenticated request, **Then** the system obtains a new access token, retries the original request once, and returns the successful result to the user without any visible interruption.
2. **Given** the silent recovery succeeds, **When** the user performs subsequent actions, **Then** those actions use the newly issued access token without requiring another recovery.
3. **Given** an authenticated request that simply fails for a non-authentication reason (e.g., validation or server error), **When** the response is not an authentication failure, **Then** the system does **not** attempt a token refresh and surfaces the original error unchanged.

---

### User Story 2 - Get safely signed out when the session can no longer be recovered (Priority: P1)

A user's session has fully lapsed — both the access token and the refresh credential are expired or invalid. When they next interact with the app, instead of seeing cryptic errors or a broken screen, they are cleanly signed out: stored credentials are removed and they are returned to the login screen so they can sign in again.

**Why this priority**: This is the safety counterpart to Story 1 and is explicitly required by the issue ("repeated failure logs the user out", "unauthenticated users are redirected to login"). Without it, an unrecoverable session leaves stale credentials behind and traps the user in a confusing, half-broken state.

**Independent Test**: Sign in, invalidate both the access token and the refresh credential, then trigger an authenticated request. The system clears stored credentials and the app displays the login screen.

**Acceptance Scenarios**:

1. **Given** a signed-in user whose access token is rejected, **When** the single refresh attempt also fails on authentication grounds, **Then** the system makes a best-effort server logout call, clears all stored credentials, and the app transitions to the logged-out state showing the login screen with a brief "your session expired — please sign in again" notice.
2. **Given** a request fails authentication and there is no refresh credential available at all, **When** recovery is attempted, **Then** the system does not loop, immediately treats the session as ended, clears credentials, and shows the login screen.
3. **Given** the session has ended and the user is on the login screen, **When** they sign in again with valid credentials, **Then** they regain access and authenticated requests carry a valid Bearer token again.

---

### User Story 3 - Concurrent requests during expiry recover without a refresh storm (Priority: P2)

A screen that fires several authenticated requests at once (for example a dashboard loading profile, venues, and ledger data together) happens to do so just as the access token expires. The user should still experience a single, seamless recovery — not multiple competing refresh attempts, duplicated sign-outs, or a flicker of errors.

**Why this priority**: Real screens issue parallel requests. If each request independently tries to refresh, the system can fire redundant refreshes, race the credential rotation, and produce inconsistent outcomes (one request recovers while another spuriously logs the user out). Coordinating recovery makes Stories 1 and 2 reliable under realistic load, but the basic single-request behavior (P1) delivers value on its own.

**Independent Test**: With an expired access token and a valid refresh credential, trigger multiple authenticated requests simultaneously. Exactly one refresh occurs, all original requests ultimately succeed, and the user sees no error.

**Acceptance Scenarios**:

1. **Given** several authenticated requests are in flight when the access token expires, **When** they all receive an authentication failure, **Then** the system performs **at most one** refresh and replays each original request once with the refreshed token.
2. **Given** concurrent requests during an unrecoverable session, **When** the single refresh fails, **Then** the system signs the user out exactly once and surfaces a consistent ended-session outcome to all in-flight requests rather than multiple conflicting results.

---

### Edge Cases

- **Refresh endpoint itself returns an authentication failure**: treated as an unrecoverable session — clear credentials and sign out; never attempt to refresh the refresh attempt (no recursion).
- **A second authentication failure after a successful refresh**: the retried request is attempted only once; if it still fails authentication, the system signs the user out rather than refreshing again (no infinite retry loop).
- **No stored credentials when a request is made**: the request proceeds without a Bearer token; an authentication failure with no refresh credential leads directly to the logged-out state.
- **Network failure during refresh** (server unreachable rather than an auth rejection): surfaced as a connectivity problem; stored credentials are **retained** (never discarded for a transient network error), the user is **not** signed out or falsely told their session ended, and the original action can be retried once connectivity returns. Only an authentication-level rejection of the refresh ends the session.
- **Recovery triggered during initial app load vs. mid-session**: on-load recovery already exists (feature 007); this feature must not double-handle or conflict with it, and the two paths must agree on the resulting signed-in/out state.
- **Credential rotation invalidates the previous refresh credential**: after a successful refresh, the newly issued credentials replace the old ones so a later request never reuses a rotated-out credential.
- **Logout in flight while a refresh is in flight**: an explicit user sign-out takes precedence; queued retries do not resurrect a session the user chose to end.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The shared API request layer MUST attach the stored access credential as a Bearer authorization on every authenticated request when a credential is present.
- **FR-002**: Stored credentials (access and refresh) MUST be the single source of truth read by the API request layer, accessed through the shared credential-storage abstraction rather than ad-hoc direct storage reads.
- **FR-003**: On a successful sign-in or registration-completed sign-in, the system MUST persist the returned access and refresh credentials so they survive page reloads and full browser restarts.
- **FR-004**: When an authenticated request receives an authentication-failure response (HTTP 401), the system MUST attempt to obtain a new access credential exactly once using the stored refresh credential before surfacing any error to the caller.
- **FR-005**: After a successful refresh, the system MUST replay the original failing request once using the newly issued access credential and return its result to the original caller transparently.
- **FR-006**: The system MUST limit recovery to a single refresh-and-retry cycle per request; a request that still fails authentication after one refresh-and-retry MUST NOT trigger further refresh attempts.
- **FR-007**: When refresh is impossible or fails **on authentication grounds** (no refresh credential available, or the refresh attempt is itself rejected as unauthenticated), the system MUST clear all stored credentials and transition the application to the logged-out state, presenting the login screen.
- **FR-008**: The system MUST NOT attempt a refresh in response to non-authentication failures (e.g., validation, authorization-for-resource, or server errors); those errors MUST be surfaced to the caller unchanged.
- **FR-009**: The system MUST NOT attempt to recover an authentication failure originating from the refresh operation itself (no recursive refresh).
- **FR-010**: When multiple authenticated requests fail authentication concurrently, the system MUST coordinate so that at most one refresh occurs, and each waiting request is then replayed once with the refreshed credential.
- **FR-011**: Upon a successful refresh, the system MUST replace the previously stored credentials with the newly issued ones so subsequent requests never reuse a rotated-out credential.
- **FR-012**: The application MUST be unreachable in an authenticated state once the session has ended; reaching the logged-out state MUST consistently route the user to the login screen regardless of which request triggered the sign-out.
- **FR-013**: The system MUST NOT write access credentials, refresh credentials, or other sensitive authentication material to logs or the developer console at any point in the persistence, refresh, or sign-out paths (Constitution VIII).
- **FR-014**: The transparent refresh-and-retry-once recovery MUST apply to **all** authenticated requests regardless of method, including data-changing operations (create/update/delete); because an authentication failure means the server did not process the request, the original request MUST be replayed exactly once after a successful refresh.
- **FR-015**: When the refresh attempt fails due to a connectivity/network error (the refresh could not reach the server) rather than an authentication rejection, the system MUST retain stored credentials, MUST NOT sign the user out, and MUST surface the failure as a connectivity error so the original action can be retried.
- **FR-016**: When the system ends a session **automatically** (driven by an unrecoverable authentication failure rather than an explicit user action), it MUST make a best-effort call to the server logout endpoint and then clear stored credentials and route to the login screen regardless of that call's outcome.
- **FR-017**: When sign-out is automatic (session expiry/unrecoverable authentication failure), the login screen MUST present a brief notice indicating the session expired and the user should sign in again; this notice MUST NOT appear for an explicit user-initiated sign-out.
- **FR-018**: The system MUST achieve ≥80% line/branch coverage across backend and frontend for this feature (CI-enforced; Constitution III).

### Key Entities *(include if feature involves data)*

- **Access Credential**: The short-lived token presented on each authenticated request to prove identity; expires quickly and is silently replaced via refresh.
- **Refresh Credential**: The longer-lived token used solely to obtain a new access credential; rotated (replaced) on each successful refresh and never sent as request authorization.
- **Session State**: The application-level notion of whether the user is resolving, signed in, needs an organization, or signed out — the destination the API layer drives toward when a session ends.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of authenticated requests issued while signed in carry a valid Bearer authorization derived from stored credentials.
- **SC-002**: When an access credential expires mid-session and a valid refresh credential exists, the in-progress user action completes successfully with no visible error and no manual re-login, in 100% of such cases.
- **SC-003**: A single expired-token event triggers at most one refresh and at most one retry per affected request; no request is retried more than once.
- **SC-004**: When a burst of concurrent requests encounters a simultaneously expired access credential, exactly one refresh is performed for the burst.
- **SC-005**: When the session cannot be recovered, stored credentials are fully cleared and the user is returned to the login screen 100% of the time, with no residual access to authenticated views, and a session-expired notice is shown for automatic sign-outs (and not for explicit user sign-outs).
- **SC-006**: After being signed out and signing in again, the user regains authenticated access on the first attempt with valid credentials.
- **SC-007**: A transient network failure during refresh never results in a sign-out: in 100% of network-error-during-refresh cases, stored credentials are retained and the user remains signed in.
- **SC-008**: ≥80% line/branch coverage achieved across backend and frontend code for this feature (CI-enforced; Constitution III).

## Assumptions

- The backend already exposes a working refresh endpoint (`POST /api/auth/refresh`) and authentication-failure responses use HTTP 401; no backend or API-contract change is required for this feature.
- Token persistence uses browser-local storage (already in place from feature 007), so sessions survive reloads and browser restarts; introducing a different storage mechanism is out of scope.
- Authentication payloads consumed by the client are taken from the generated API type definitions; no payload shapes are hand-authored (Constitution VI).
- "Redirect to login" means transitioning the existing in-app authentication state to its logged-out phase (which renders the login screen); the app remains router-less and no URL-based redirect is introduced.
- A transient network failure during refresh (server unreachable, not an auth rejection) is treated as a recoverable connectivity error: stored credentials are retained, the user stays signed in, and only an authentication-level rejection of the refresh ends the session (confirmed in Clarifications).
- An explicit user-initiated sign-out takes precedence over any in-flight automatic recovery.
- This feature builds on, and must remain consistent with, the on-load session bootstrap delivered in feature 007; it specifically closes the mid-session gap in the shared request layer rather than re-implementing on-load behavior.
