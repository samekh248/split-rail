# Phase 1 Data Model: JWT Persistence, Refresh Rotation & 401 Handling in API Client

**Feature**: `008-jwt-refresh-401-handling` | **Date**: 2026-06-16

This feature introduces **no persisted domain entities and no API payloads**. The "data model" here is the **client-side transport state**, the **auth-phase/session view model**, and the generated payload types it consumes. All payload types are imported from `apps/web/src/types/generated-api.ts` (Constitution VI); none are hand-authored.

## Consumed generated types (no changes)

| Type | Source | Used for |
|------|--------|----------|
| `AuthResponse` | `generated-api.ts` (`components['schemas']['AuthResponse']`) | Result of `POST /api/auth/refresh`; carries rotated `accessToken`/`refreshToken`. |
| `RefreshRequest` | `generated-api.ts` | Body of the refresh call (`{ refreshToken }`). |
| `LoginRequest` | `generated-api.ts` | Existing login form payload (unchanged). |
| `UserProfileResponse` | `generated-api.ts` | Existing; consumed by bootstrap/profile, not changed by this feature. |

> If any of these shapes ever change, the change is made in the C# DTO first and regenerated into `generated-api.ts` — out of scope here.

## Client transport state (`src/api/client.ts`)

Module-scoped, non-persisted state owned by the request layer.

| Element | Type | Description | Lifecycle |
|---------|------|-------------|-----------|
| `refreshInFlight` | `Promise<void> \| null` | Single-flight guard. Non-null while a refresh is running; concurrent `401`s await it. | Set when the first `401` triggers refresh; cleared in `finally`. |
| `onRefresh` | `(() => Promise<void>) \| null` | Injected refresh function (wired to `authApi.refreshSession`). Resolves on rotated tokens, rejects on failure. | Registered once via `configureApiClient`; null until wired. |
| `onSessionExpired` | `(() => void) \| null` | Injected callback invoked on an unrecoverable auth failure to drive global sign-out. | Registered once via `configureApiClient`; null until wired. |

### Request-scoped flags (internal `RequestInit` extension)

| Flag | Meaning | Enforces |
|------|---------|----------|
| `skipAuthRecovery` | The request must not enter the 401-recovery path (used for the `/auth/refresh` call). | FR-009 (no recursive refresh). |
| `isRetry` | The request is the single post-refresh replay. | FR-006 (retry-once cap). |

> These are internal-only options on the request; they are never serialized or sent to the server.

### `SessionExpiredError`

A typed error thrown to all waiting callers when the session is unrecoverable (no refresh token, or refresh rejected on auth grounds). Distinct from a generic transport error so callers/tests can assert it. Carries no token material (Constitution VIII).

## Recovery state transitions (per request hitting a 401)

```text
authenticated request
   │
   ├─ response.ok ───────────────────────────────► return parsed result
   │
   └─ 401 (and not skipAuthRecovery, not isRetry)
        │
        ├─ no refresh token ──────────────► onSessionExpired() ; throw SessionExpiredError
        │
        └─ refresh token present
             │  await single-flight onRefresh()
             │
             ├─ refresh OK ───────────────► replay original once (isRetry)
             │        │
             │        ├─ retry ok ─────────► return result            (FR-005 success)
             │        └─ retry 401 ────────► onSessionExpired() ; throw SessionExpiredError (FR-006)
             │
             ├─ refresh AUTH-fail (401) ──► onSessionExpired() ; throw SessionExpiredError (FR-007)
             │
             └─ refresh NETWORK-fail ─────► retain credentials ; throw connectivity error (FR-015)
```

Non-401 responses (validation/authorization/server errors) bypass recovery entirely and throw unchanged (FR-008).

## Auth-phase & session view model (`src/auth/AuthContext.tsx`)

Extends the existing phase machine; **no new phase** is added — sign-out reuses the existing `unauthenticated` phase, distinguished only by the `sessionExpired` flag for messaging.

| Field | Type | New? | Description |
|-------|------|------|-------------|
| `phase` | `'resolving' \| 'unauthenticated' \| 'needs-organization' \| 'authenticated'` | existing | Drives `App.tsx` routing; `unauthenticated` renders `LoginPage`. |
| `sessionExpired` | `boolean` | **new** | `true` only after an automatic sign-out; controls the login-screen notice. Reset on explicit `logout()` and successful `login()`. |
| `profile` | `UserProfileResponse \| null` | existing | Cleared on any sign-out. |

### Session-state transitions

| Trigger | `phase` → | `sessionExpired` → | Server logout call? |
|---------|-----------|--------------------|--------------------|
| Successful `login()` | `authenticated` / `needs-organization` | `false` | — |
| Explicit user `logout()` | `unauthenticated` | `false` | best-effort (existing) |
| Automatic sign-out (`onSessionExpired`) | `unauthenticated` | `true` | best-effort (FR-016) |
| Network failure during refresh | *unchanged* (stays current phase) | *unchanged* | none (FR-015) |

## Validation & invariants

- **At most one refresh per expiry burst** (`refreshInFlight` single-flight) — FR-010 / SC-004.
- **At most one retry per request** (`isRetry`) — FR-006 / SC-003.
- **Refresh endpoint never self-recovers** (`skipAuthRecovery`) — FR-009.
- **Credentials retained on network failure**, cleared only on auth-failure sign-out — FR-015 / FR-007.
- **No token/PII in logs** across all paths — FR-013 (Constitution VIII).
- **Rotated token re-carries `org_id`** before replay, preserving tenant scope — Constitution II.
- **`sessionExpired` is true only for automatic sign-out**, never for explicit logout — FR-017.
