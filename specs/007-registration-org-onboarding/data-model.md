# Phase 1 Data Model: Registration & Organization Onboarding Flow

This feature adds **no persistent/server data** and **no DTOs**. The model below describes frontend state and how it maps to existing generated API types. All server payloads are imported from `apps/web/src/types/generated-api.ts` (Constitution VI).

## Server contracts consumed (existing — no changes)

| Type (generated-api.ts) | Endpoint | Role in this feature |
|--------------------------|----------|----------------------|
| `RegisterRequest { email, password }` → `RegisterResponse { id, email, createdAt }` | `POST /api/auth/register` | Create the user account (no tokens returned). |
| `LoginRequest { email, password }` → `AuthResponse { accessToken, refreshToken, expiresIn }` | `POST /api/auth/login` | Authenticate; obtain token pair (auto-login during onboarding). |
| `RefreshRequest { refreshToken }` → `AuthResponse` | `POST /api/auth/refresh` | Silent refresh-on-load; token rotation. |
| `CreateOrganizationRequest { name }` → `OrganizationResponse { id, name, createdAt }` | `POST /api/organizations` | Create org, seed roles, map creator as **Admin**. |
| `UserProfileResponse { id, email, organization?, role?, venueScopes }` | `GET /api/users/me` | **Routing source of truth**: `organization` null ⇒ org-less; `role` ⇒ Admin. |
| `OrganizationSummaryDto { id, name }` | (within profile) | Current org identity for the workspace. |
| `RoleDetailDto { id, roleName, permissions }` | (within profile) | Admin role + permission flags. |
| `VenueResponse[] { id, name, organizationId, createdAt }` | `GET /api/venues` | Empty list ⇒ brand-new org ⇒ dashboard empty state. |
| `AuthResponse` (logout `204`) | `POST /api/auth/logout` | Server-side refresh-token revocation on sign-out. |

## Frontend state model

### AuthPhase (state machine)

```text
AuthPhase = 'resolving' | 'unauthenticated' | 'needs-organization' | 'authenticated'
```

| Phase | Meaning | Rendered by `App.tsx` |
|-------|---------|------------------------|
| `resolving` | Bootstrap in progress (loading `/users/me`, possibly refreshing). | Non-flickering neutral/loading state (FR-011). |
| `unauthenticated` | No valid session. | Login / Register screens (006). |
| `needs-organization` | Authenticated but `organization == null` (incomplete onboarding). | `OrganizationCreateStep` (FR-006a). |
| `authenticated` | Authenticated **and** `organization != null`. | `DashboardHome` (+ `WelcomeModal` if `justOnboarded`). |

**Transitions**:

```text
resolving --token + org present--------------------> authenticated
resolving --token + org null-----------------------> needs-organization
resolving --no/invalid token (refresh failed)------> unauthenticated
unauthenticated --login (org present)--------------> authenticated
unauthenticated --login (org null)-----------------> needs-organization
unauthenticated --onboard ok (org created)---------> authenticated (justOnboarded = true)
unauthenticated --onboard, org-create fails--------> needs-organization (error surfaced)
needs-organization --org created-------------------> authenticated (justOnboarded = true)
authenticated --sign out---------------------------> unauthenticated (tokens cleared, caches reset)
authenticated --welcome dismissed------------------> authenticated (justOnboarded = false)
```

### AuthContextValue (extends 006)

| Field | Type | Notes |
|-------|------|-------|
| `phase` | `AuthPhase` | Adds `needs-organization` to the 006 set. |
| `profile` | `UserProfileResponse \| null` | Cached current profile (org + role). Drives routing & Admin display. |
| `justOnboarded` | `boolean` | Transient; true only on first authenticated render after onboarding. |
| `pending` | `boolean` | Request-in-flight (disables forms, prevents duplicate submit — FR-012). |
| `error` | `string \| null` | Sanitized inline error (reuses `mapAuthError`). |
| `authView` | `'login' \| 'register'` | Unauthenticated entry toggle (006). |
| `onboard(values)` | `(RegisterValues) => Promise<void>` | register → login → createOrg → re-issue → load profile. |
| `createOrganization(name)` | `(string) => Promise<void>` | For `needs-organization` recovery; no password needed. |
| `login(credentials)` | `(LoginRequest) => Promise<void>` | Login-only path; routes by profile. |
| `logout()` | `() => Promise<void>` | Revoke + clear + reset caches. |
| `dismissWelcome()` | `() => void` | Clears `justOnboarded`. |

`RegisterValues = { email, password, organizationName }` (existing, from 006).

### Derived view data

| Derived value | Source | Used by |
|---------------|--------|---------|
| `isAdmin` | `profile.role?.roleName === 'Admin'` | Optional UI affordances / assertions (SC-002). |
| `organizationName` | `profile.organization?.name` | Welcome modal + workspace header. |
| `hasVenues` | `useVenues().data.length > 0` | `DashboardHome` empty-state vs ledger branch (FR-005). |

## Validation rules (reused from 006)

- Email format and password policy mirror backend `PasswordValidator` (≥8 chars, upper/lower/digit) via `src/auth/validation.ts`. Organization name required/non-empty via `validateOrganizationName`. No new rules introduced.

## Privacy & integrity constraints

- Passwords and tokens are never logged or placed in query keys/URLs (Constitution VIII).
- `justOnboarded` and `profile` are in-memory only; only `accessToken`/`refreshToken` persist (localStorage), cleared on sign-out (FR-009).
- Org creation is performed at most once per onboarding; retry only occurs when the prior attempt did not succeed (no duplicate organizations — FR-012/FR-013).
