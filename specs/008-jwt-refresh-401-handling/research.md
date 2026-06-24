# Phase 0 Research: JWT Persistence, Refresh Rotation & 401 Handling in API Client

**Feature**: `008-jwt-refresh-401-handling` | **Date**: 2026-06-16

This document records the design decisions that resolve the planning unknowns. There were no open `NEEDS CLARIFICATION` markers from the spec (the four clarifications were resolved in `/speckit-clarify`); the items below are the architectural decisions needed to implement those requirements against the existing codebase.

## Grounding summary (what already exists)

- `src/api/client.ts` — `apiFetch<T>` attaches a Bearer header by reading `localStorage.getItem('accessToken')` directly and `throw`s `"<status>: <detail>"` on any non-OK response. **No 401 handling.**
- `src/auth/tokenStorage.ts` — `getAccessToken`, `getRefreshToken`, `setTokens`, `clearTokens` over `localStorage` keys `accessToken`/`refreshToken`. ✅ persistence + rotation storage already done.
- `src/auth/authApi.ts` — `login`/`onboard` write tokens via `setTokens`; `refreshSession()` calls `POST /api/auth/refresh` (`RefreshRequest` → `AuthResponse`) and writes rotated tokens; `logout()` best-effort calls `POST /api/auth/logout` then clears tokens; `mapAuthError` sanitizes errors.
- `src/auth/authBootstrap.ts` — on load, loads `/users/me`, and on `401` attempts `refreshSession()` once, else clears + `unauthenticated`. ✅ on-load refresh already done.
- `src/auth/AuthContext.tsx` — phase machine `resolving → unauthenticated | needs-organization | authenticated`; `logout()` clears query cache, tokens, sets `unauthenticated`.
- `src/App.tsx` — renders `LoginPage` when `phase === 'unauthenticated'`. "Redirect to login" == this phase transition.
- `vite.config.ts` — v8 coverage thresholds at 80% lines/functions/branches/statements.

**Conclusion**: the only missing piece is **mid-session 401 recovery inside the shared request layer**, plus the wiring to drive a global sign-out and a login-screen notice. No backend or contract change is needed.

## Decision 1 — Where the 401 recovery lives

**Decision**: Implement transparent refresh-and-retry **inside `apiFetch` (`client.ts`)**, so every authenticated call site benefits with zero changes (FR-001, FR-004, FR-005, FR-014).

**Rationale**: All data access already routes through `apiFetch` (`user.ts`, `venues.ts`, ledger, etc.). Centralizing recovery there is the single highest-leverage change and guarantees uniform behavior across reads and writes. Per-call-site or per-hook handling would be error-prone and miss the mutation paths.

**Alternatives considered**:
- *React Query `retry`/error-link middleware*: rejected — not all calls go through React Query mutations, and retry alone cannot re-mint a token or coordinate a single-flight refresh.
- *Per-hook 401 handling*: rejected — duplicative, easy to forget, and cannot enforce the single-flight guarantee.

## Decision 2 — Driving sign-out without an import cycle (registration seam)

**Decision**: `client.ts` exposes `configureApiClient({ onRefresh, onSessionExpired })`. `AuthContext` calls it once on mount, passing `onRefresh = refreshSession` and `onSessionExpired = handleAutomaticSignOut`. The client never imports React or `AuthContext`.

**Rationale**: The transport layer must trigger a React phase transition (route to login) and perform the refresh, but importing `AuthContext`/`authApi` into `client.ts` creates a cycle (`authApi` already imports `apiFetch` from `client`) and couples transport to React, hurting unit-test isolation. A tiny dependency-injection seam keeps `client.ts` framework-free and trivially testable with injected fakes (FR-007, FR-012, FR-016).

**Alternatives considered**:
- *Direct import of `authApi.refreshSession` into `client.ts`*: rejected — import cycle and harder isolation; only marginally less code than the seam.
- *Global `window` event / `EventTarget` bus*: rejected — heavier, implicit, and harder to assert deterministically in tests than an injected callback.

## Decision 3 — Single-flight refresh coordination

**Decision**: A module-level `refreshInFlight: Promise<void> | null` in `client.ts`. The first `401` starts the refresh and stores the promise; concurrent `401`s `await` the same promise; the slot is cleared in `finally`. Each waiter then replays its own original request **once** with the rotated token (FR-010, SC-004).

**Rationale**: Real screens fire parallel requests (profile + venues + ledger). Without coordination, each would independently refresh, racing token rotation and possibly producing one recovery + one spurious sign-out. Single-flight makes Stories 1–3 deterministic.

**Alternatives considered**: a request queue that replays everything after refresh — rejected as more machinery than needed; awaiting a shared promise and replaying per-request is sufficient and simpler.

## Decision 4 — Recursion guard (refresh must not self-recover)

**Decision**: The `/auth/refresh` call is issued with an internal flag (e.g. `apiFetch('/auth/refresh', { /* skipAuthRecovery */ })`) so a `401` from refresh is **not** itself routed into the recovery path. Likewise the retried request is marked as a retry so it cannot trigger a second refresh (FR-006, FR-009).

**Rationale**: Prevents infinite recursion and the "refresh-the-refresh" loop. A `401` on the refresh endpoint means the refresh token is invalid ⇒ unrecoverable session.

**Alternatives considered**: path-string matching on `/auth/refresh` — workable but brittle; an explicit option flag is clearer and also covers the retry-once cap.

## Decision 5 — Distinguishing authentication failure from network failure

**Decision**: Within recovery, classify the refresh outcome:
- **Authentication failure** (refresh resolves with `401` / `SessionExpiredError`): unrecoverable ⇒ invoke `onSessionExpired` and throw a typed `SessionExpiredError` to all waiters (FR-007).
- **Network/connectivity failure** (refresh `fetch` rejects, e.g. `Failed to fetch`/`NetworkError`): **retain** credentials, do **not** sign out, and surface a connectivity error so the original action can be retried (FR-015, SC-007).

**Rationale**: A transient blip is not proof the session ended; signing users out on a momentary outage is a false logout. Only an auth-level rejection ends the session. `mapAuthError` already recognizes `Failed to fetch`/`NetworkError`, giving a reliable classifier.

**Alternatives considered**: treat any failed refresh as session-ended (simpler but produces false logouts — rejected, matches clarification); retry network errors N times before giving up — deferred as unnecessary for v1 (the original action is simply retryable).

## Decision 6 — Automatic sign-out orchestration (best-effort server logout)

**Decision**: `onSessionExpired` (in `AuthContext`) runs `handleAutomaticSignOut`: best-effort `authApi.logout()` (which itself swallows transport failure and clears tokens), then `queryClient.clear()`, set `profile=null`, `authView='login'`, `phase='unauthenticated'`, and `sessionExpired=true` (FR-016). The client signals; `AuthContext` owns the state change.

**Rationale**: Centralizes session lifecycle in `AuthContext` (consistent with the existing explicit `logout()`), keeps token-clearing in one place, and satisfies the clarified "best-effort server logout, then clear regardless" decision.

**Alternatives considered**: have `client.ts` clear tokens and call logout directly — rejected; it would split session-lifecycle ownership across two layers and re-introduce coupling the seam was meant to avoid.

## Decision 7 — Session-expired notice on the login screen

**Decision**: `AuthContext` exposes `sessionExpired: boolean`. `LoginPage` reads it from `useAuth()` and renders a brief, dismissible "Your session expired — please sign in again" notice (`role="status"`) above the form. `sessionExpired` is set `true` only by `handleAutomaticSignOut`, and reset to `false` on explicit `logout()` and on successful `login()` (FR-017).

**Rationale**: Tells the user *why* they're back at login without conflating it with explicit sign-out. Reuses the existing `LoginPage`/`AuthLayout` rather than adding a route.

**Alternatives considered**: a global toast system — rejected; none exists yet and the login screen is the natural, testable place for the message.

## Decision 8 — Testing & coverage strategy

**Decision**: Unit-test `client.ts` recovery in isolation by injecting fake `onRefresh`/`onSessionExpired` via `configureApiClient` and stubbing `fetch` (matching the existing `client.test.ts` style). Component-test `AuthContext` sign-out handler and the `LoginPage` notice with RTL. Add one Playwright E2E in `tests/e2e/specs/auth/` that intercepts an expired-access-token → refresh → continued session and an unrecoverable → login-with-notice flow. Enforce ≥80% via existing v8 thresholds (Constitution III).

**Rationale**: Mirrors the established test layout (`tests/api/*`, `tests/auth/*`, `tests/e2e/specs/*`), maximizes determinism, and satisfies the multi-state auth-interception E2E expectation.

## Resolved unknowns

| Unknown | Resolution |
|---------|------------|
| Where recovery lives | Inside `apiFetch` (Decision 1) |
| How transport drives sign-out without a cycle | `configureApiClient` registration seam (Decision 2) |
| Concurrent 401 handling | Module-level single-flight promise (Decision 3) |
| Preventing refresh recursion / retry loops | Skip-recovery flag on refresh + retry marker (Decision 4) |
| Network vs auth refresh failure | Classify via fetch-reject vs 401 (Decision 5) |
| Server logout on auto sign-out | Best-effort in `AuthContext` handler (Decision 6) |
| User-facing reason at login | `sessionExpired` flag → login notice (Decision 7) |
| Coverage approach | Injected fakes + stubbed fetch + RTL + Playwright (Decision 8) |

**No open NEEDS CLARIFICATION remain.** Ready for Phase 1.
