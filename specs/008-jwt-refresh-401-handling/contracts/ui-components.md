# Contract: Auth Session-Expiry UI & Context Surface

**Feature**: `008-jwt-refresh-401-handling`

Defines the `AuthContext` surface change and the login-screen notice. No new routes; the app stays router-less.

## `AuthContext` surface

### Added to `AuthContextValue`

| Member | Type | Contract |
|--------|------|----------|
| `sessionExpired` | `boolean` | `true` only after an **automatic** sign-out (session became unrecoverable). `false` initially, after explicit `logout()`, and after a successful `login()`. |

### Wiring (on mount)

`AuthProvider` calls `configureApiClient` exactly once:

- `onRefresh` → `authApi.refreshSession` (rotates + persists tokens).
- `onSessionExpired` → `handleAutomaticSignOut`.

### `handleAutomaticSignOut()` behavior

| Step | Action | Requirement |
|------|--------|-------------|
| 1 | Best-effort `authApi.logout()` (server logout; failure swallowed by callee) | FR-016 |
| 2 | `queryClient.clear()` | — |
| 3 | `profile = null`, `authView = 'login'` | FR-012 |
| 4 | `phase = 'unauthenticated'` | FR-007, FR-012 |
| 5 | `sessionExpired = true` | FR-017 |

Idempotent: invoking it when already `unauthenticated` does not loop or re-toggle into an authenticated state.

### Behavioral guarantees → tests (`tests/auth/AuthContext.sessionExpiry.test.tsx`)

| # | Guarantee | Requirement | Test |
|---|-----------|-------------|------|
| 1 | Auto sign-out clears credentials & routes to login | FR-007, FR-012 | trigger registered `onSessionExpired` → tokens cleared, `phase==='unauthenticated'` |
| 2 | Auto sign-out makes best-effort server logout | FR-016 | `fetch` to `/auth/logout` observed; sign-out completes even if it rejects |
| 3 | Auto sign-out sets `sessionExpired=true` | FR-017 | flag true after handler |
| 4 | Explicit `logout()` leaves `sessionExpired=false` | FR-017 | user logout → flag false |
| 5 | Successful `login()` resets `sessionExpired` | FR-017 | expire → login → flag false |
| 6 | `configureApiClient` wired once on mount | Decision 2 | provider mount registers non-null handlers |

## Login-screen notice

### `LoginPage`

Reads `sessionExpired` from `useAuth()` and renders a notice above the form when `true`:

- Copy: **"Your session expired — please sign in again."**
- Accessibility: container has `role="status"` (polite); not an `alert` (it is informational, not an error).
- Does **not** render for an explicit user sign-out (`sessionExpired === false`).
- Rendered via `AuthLayout` (inline above `LoginForm`, or through an optional `notice` slot on `AuthLayout`).

### Behavioral guarantees → tests (`tests/auth/LoginPage.test.tsx`, extended)

| # | Guarantee | Requirement | Test |
|---|-----------|-------------|------|
| 1 | Notice shown when `sessionExpired` | FR-017 | render with context `sessionExpired=true` → notice text present, `role="status"` |
| 2 | Notice hidden otherwise | FR-017 | `sessionExpired=false` → notice absent |
| 3 | Existing login behavior intact | FR-003 | existing LoginPage tests stay green |

## End-to-end (`tests/e2e/specs/auth/session-refresh.spec.ts`, Playwright)

| Scenario | Requirement |
|----------|-------------|
| Signed-in user; access token intercepted to 401 once, refresh intercepted to succeed → in-progress action completes, user stays on the same screen, no error | US1, SC-002 |
| Concurrent screen requests 401 simultaneously → exactly one refresh request observed, all data loads | US3, SC-004 |
| Access + refresh both rejected → app shows login screen with the session-expired notice | US2, FR-017, SC-005 |
