# Contract: API Client Recovery (`apiFetch`)

**Feature**: `008-jwt-refresh-401-handling`

This is a **behavioral contract** for the refactored shared request layer in `apps/web/src/api/client.ts`. It is not an HTTP API contract — no backend endpoint or DTO changes. It defines the observable behavior the implementation and its tests must satisfy. All endpoint calls use existing routes and `generated-api.ts` types.

## Existing endpoints consumed (unchanged)

| Endpoint | Type in/out | Role in this feature |
|----------|-------------|----------------------|
| `POST /api/auth/refresh` | `RefreshRequest` → `AuthResponse` | Re-mint access token during recovery (via `authApi.refreshSession`). Called with recovery disabled. |
| `POST /api/auth/logout` | — → 204 | Best-effort revoke on automatic sign-out (via `authApi.logout`). |
| (any authenticated route) | — | Subject of transparent recovery + replay. |

## Public surface

### `apiFetch<T>(path, init?): Promise<T>`

Behavior (additive to the current implementation):

1. Attaches `Authorization: Bearer <accessToken>` when a token is present, **read via `tokenStorage.getAccessToken()`** (not direct `localStorage`). — FR-001, FR-002
2. On `response.ok`: returns parsed JSON (or `undefined` for `204`). *(unchanged)*
3. On a non-OK, **non-401** response: throws `"<status>: <detail>"` exactly as today (no refresh attempted). — FR-008
4. On a **401**, when the request is **not** `skipAuthRecovery` and **not** `isRetry`: enters the recovery path (below).
5. A request flagged `skipAuthRecovery` (the refresh call) or `isRetry` (the single replay) **never** enters recovery on its own 401. — FR-006, FR-009

### `configureApiClient({ onRefresh, onSessionExpired }): void`

Registers the injected dependencies. Called once by `AuthContext` on mount.

- `onRefresh: () => Promise<void>` — performs a single refresh (rotated tokens persisted by the callee); rejects on failure.
- `onSessionExpired: () => void` — invoked exactly once when a session becomes unrecoverable; drives global sign-out.

### `SessionExpiredError extends Error`

Thrown to callers when recovery is impossible. Contains no token material.

## Recovery algorithm (normative)

```text
on 401 (recoverable request):
  if no refresh token in storage:
      onSessionExpired(); throw SessionExpiredError
  await single-flight refresh:
      if refreshInFlight is null: refreshInFlight = onRefresh().finally(() => refreshInFlight = null)
      await refreshInFlight
  on refresh success:
      result = apiFetch(path, { ...init, isRetry: true })   // replay once
      return result            // if this replay 401s → SessionExpiredError + onSessionExpired()
  on refresh rejection:
      if rejection is auth (401 / SessionExpiredError):
          onSessionExpired(); throw SessionExpiredError
      else (network/connectivity):
          throw original connectivity error   // credentials retained, no sign-out
```

## Behavioral guarantees → tests

| # | Guarantee | Requirement | Test (in `tests/api/client.refresh.test.ts` unless noted) |
|---|-----------|-------------|------------------------------------------------------------|
| 1 | Bearer attached from `tokenStorage` | FR-001, FR-002 | existing `client.test.ts` "attaches bearer" stays green after refactor |
| 2 | Non-401 error passes through, no refresh | FR-008 | stub 404/500 → `onRefresh` not called; original error thrown |
| 3 | 401 → refresh → replay once → success | FR-004, FR-005, FR-014 | first fetch 401, refresh resolves, replay 200 → resolves; `onRefresh` called once; original request attempted twice |
| 4 | Replay works for write methods (POST/PUT/DELETE) | FR-014 | same as #3 with `method: 'POST'` and a body; body preserved on replay |
| 5 | Refresh auth-failure → `SessionExpiredError` + `onSessionExpired` | FR-007 | refresh rejects with 401 → `onSessionExpired` called once; `SessionExpiredError` thrown |
| 6 | No refresh token → immediate session-ended | FR-007 | no refresh token in storage → `onSessionExpired` called; no `onRefresh` call |
| 7 | Refresh network-failure → credentials retained, no sign-out | FR-015, SC-007 | refresh rejects with `Failed to fetch` → tokens still in storage; `onSessionExpired` NOT called; connectivity error thrown |
| 8 | Single-flight: concurrent 401s → one refresh | FR-010, SC-004 | fire 3 `apiFetch` concurrently, all 401 then 200 → `onRefresh` called exactly once; all three resolve |
| 9 | Retry-once cap: replay still 401 → sign-out, no 2nd refresh | FR-006 | first 401, refresh ok, replay 401 → `SessionExpiredError`; `onRefresh` called once |
| 10 | Refresh endpoint excluded from recovery (no recursion) | FR-009 | `apiFetch('/auth/refresh', { skipAuthRecovery:true })` 401 → no `onRefresh`, throws plainly |
| 11 | No token written to logs/console | FR-013 | spy on `console.*` across recovery paths → never called with token strings |
