# Contract: Auth Flows (client orchestration over existing endpoints)

This feature adds **no new endpoints**. It composes existing, already-generated API operations. All request/response types are imported from `apps/web/src/types/generated-api.ts`. Endpoints below are documented as the frontend's consumption contract.

## Endpoints consumed

| Method | Path | Request | Success | Failure (mapped) |
|--------|------|---------|---------|------------------|
| POST | `/api/auth/login` | `LoginRequest` | `200` `AuthResponse` | `401` invalid credentials |
| POST | `/api/auth/register` | `RegisterRequest` | `201` `RegisterResponse` (no tokens) | `409` email already registered; `400` validation |
| POST | `/api/organizations` | `CreateOrganizationRequest` (auth required) | `201` `OrganizationResponse` | `400` name required; `401` unauthenticated |
| POST | `/api/auth/logout` | — (auth required) | `204` | best-effort; ignore failures |
| GET | `/api/users/me` | — (auth required) | `200` `UserProfileResponse` | `401` |

All requests go through the existing `apiFetch` helper (`src/api/client.ts`), which attaches `Authorization: Bearer <accessToken>` from `localStorage` and throws `Error("<status>: <detail>")` on non-2xx using the API `ErrorResponse` shape.

## Flow 1 — Login (FR-001, FR-004, FR-006)

```
validate(email, password)            # client-side, must pass (SC-002)
→ POST /api/auth/login {email, password}
   200 → persist AuthResponse.accessToken + refreshToken (tokenStorage)
       → AuthContext.phase = 'authenticated'
       → render dashboard (EventLedgerPage)
   401 → form error: "Invalid email or password." (no field disclosure)
   5xx/network → form error: "Something went wrong. Please try again." (retryable)
```

**Guarantees**: no page reload to show errors (SC-001/SC-004); submit disabled while in flight (FR-009); password never logged (Constitution VIII).

## Flow 2 — Registration (FR-002, FR-005, auto-login clarification)

Non-atomic three-step orchestration. The `step` marker enables correct retry behavior.

```
validate(email, password, organizationName)   # all three required, client-side
→ step=register: POST /api/auth/register {email, password}
   409 → form error: "An account with this email already exists." ; STOP (stay on register)
   400 → map validation detail to field/form error ; STOP
   201 → step=login: POST /api/auth/login {email, password}
          200 → persist tokens
              → step=create-org: POST /api/organizations {name: organizationName}
                 201 → AuthContext.phase = 'authenticated' → dashboard
                 4xx/5xx → form error: "Account created, but we couldn't set up your organization. Retry." 
                            (RETRY repeats ONLY create-org; user already authenticated)
          fail → form error generic ; account exists, user may use the login screen
```

**Guarantees**:
- On full success the user is authenticated **and** an Admin member of a new organization (tenant-scoped session) — no separate sign-in.
- Entered email/organization name are preserved on failure; password is cleared (FR-005, FR-011).
- The organization name is delivered via `CreateOrganizationRequest.name`, never via a hand-authored register payload (Constitution VI).

## Flow 3 — Navigation between screens (FR-007)

```
LoginPage  --"Create an account"-->  RegisterPage
RegisterPage  --"Sign in"-->  LoginPage
```
Implemented as an in-app view toggle in the unauthenticated branch of the auth gate (no router). Switching screens clears transient form errors.

## Flow 4 — Auth gate & session resolution (edge cases)

```
on load: AuthContext.phase = 'resolving'
  read tokenStorage.accessToken
    present → phase = 'authenticated' (optionally fetch /users/me for profile/org)
    absent  → phase = 'unauthenticated'
'resolving' renders a neutral, non-flickering placeholder (no flash of login form)
already authenticated + navigates to auth screen → redirected to dashboard
logout → clear tokens → phase = 'unauthenticated' → login screen
```

## Error message mapping (sanitized — FR-011)

| Source | User-facing message |
|--------|---------------------|
| login `401` | "Invalid email or password." |
| register `409` | "An account with this email already exists." |
| register/login/org `400` | the specific field validation message (mapped to field where possible) |
| any `5xx` / network | "Something went wrong. Please try again." |

No message reveals token contents, stack traces, or whether an email exists beyond the registration conflict that the user must be told about.
