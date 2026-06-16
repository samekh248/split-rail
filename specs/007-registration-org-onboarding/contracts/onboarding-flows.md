# Contract: Onboarding Client Flows

Client-side orchestration against **existing** endpoints. No backend changes; all payload types from `generated-api.ts`. Pseudocode is illustrative, not implementation.

## Flow A — Application bootstrap (on load) — FR-008, FR-008a, FR-011

```text
phase = 'resolving'
token = getAccessToken()
if (!token):
    phase = 'unauthenticated'; return
try:
    profile = GET /users/me            # 200
catch 401:
    refreshToken = getRefreshToken()
    if (!refreshToken): clearTokens(); phase = 'unauthenticated'; return
    try:
        auth = POST /auth/refresh { refreshToken }   # rotates tokens
        setTokens(auth.accessToken, auth.refreshToken)
        profile = GET /users/me        # retry once
    catch:
        clearTokens(); phase = 'unauthenticated'; return
route(profile)   # see Flow E
```

- Exactly one refresh attempt and one `/me` retry (no loops).
- The neutral `resolving` UI is shown until a terminal phase is reached (no flash of login/dashboard).

## Flow B — New-user onboarding — FR-001..FR-004, FR-012, FR-013, FR-014

```text
guard: if pending return            # prevents duplicate submit (FR-012)
pending = true
try:
    POST /auth/register { email, password }          # 201; 409 → "email already in use" (FR-014)
    auth = POST /auth/login { email, password }       # 200; setTokens(...)
    try:
        POST /organizations { name: organizationName } # 201; seeds Admin mapping
    catch (orgError):
        # account exists + authenticated, but org missing
        profile = GET /users/me        # organization == null
        phase = 'needs-organization'; error = "Account created, but organization setup didn't finish. Retry."
        return                          # retryable without password (Flow D)
    auth = POST /auth/refresh { refreshToken } OR re-login   # re-issue token carrying org_id (FR-016)
    setTokens(...)
    profile = GET /users/me            # organization != null, role == Admin
    justOnboarded = true
    phase = 'authenticated'
finally:
    pending = false
```

- No duplicate account on `409` (registration is rejected server-side; nothing else runs).
- On org-create failure, **no** organization is partially created twice; retry (Flow D) only creates one.

## Flow C — Returning-user login — FR-006, FR-006a, FR-015

```text
guard: if pending return
pending = true
try:
    auth = POST /auth/login { email, password }   # 401 → "Invalid email or password." (inline)
    setTokens(...)
    profile = GET /users/me
    route(profile)        # org present → authenticated; org null → needs-organization (FR-006a)
finally:
    pending = false
```

## Flow D — Organization-creation step (org-less recovery) — FR-006a, FR-013

```text
# user already authenticated (token present), organization == null
guard: if pending return
pending = true
try:
    POST /organizations { name }       # 201; maps user as Admin
    auth = POST /auth/refresh { refreshToken } OR re-login   # re-issue token with org_id
    setTokens(...)
    profile = GET /users/me            # organization != null
    justOnboarded = true               # show welcome on first dashboard landing
    phase = 'authenticated'
finally:
    pending = false
```

- Password is **not** required here (FR-013). No duplicate org: this runs only while `organization == null`.

## Flow E — `route(profile)` helper

```text
if profile.organization != null: phase = 'authenticated'
else:                            phase = 'needs-organization'
```

## Flow F — Sign-out — FR-009

```text
try: POST /auth/logout            # 204; best-effort server revocation
finally:
    clearTokens()
    queryClient.clear()           # drop cached profile/venues
    profile = null; justOnboarded = false; authView = 'login'
    phase = 'unauthenticated'
```

## Flow G — Already-authenticated visits entry screen — FR-010

```text
if phase in ('authenticated','needs-organization') and user opens login/register:
    render dashboard/org-step (do not show entry forms)
```

## Error mapping (reuse 006 `mapAuthError`) — Constitution VIII, FR-011

| Condition | Inline message |
|-----------|----------------|
| `401` on login | "Invalid email or password." |
| `409` on register | "An account with this email already exists." |
| org-create failure (any) | "Account created, but we couldn't set up your organization. Please retry." |
| network/`Failed to fetch` | "Unable to reach the server. Check your connection and try again." |
| `500` | Generic server message (no internals leaked). |

No message discloses whether an email exists beyond the standard 409 already surfaced by the existing contract; no token/PII is logged.

## Status-code expectations (from existing controllers)

| Call | Success | Notable failures |
|------|---------|------------------|
| `POST /auth/register` | `201` | `409` email exists; `400` validation |
| `POST /auth/login` | `200` | `401` invalid credentials |
| `POST /auth/refresh` | `200` | `401` invalid/expired refresh token |
| `POST /organizations` | `201` | `400` empty name; `401` unauth |
| `GET /users/me` | `200` (org may be null) | `401` unauth |
| `GET /venues` | `200` (may be `[]`) | `401` unauth |
| `POST /auth/logout` | `204` | (best-effort; ignored on failure) |
