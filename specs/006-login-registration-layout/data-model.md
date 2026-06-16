# Phase 1 Data Model: Login & Registration Layout Components

This feature introduces **no persisted entities, tables, or migrations**. The "data" here is client-side form state, auth session state, and the mapping of those onto the **existing** generated API contracts. All wire types are imported from `apps/web/src/types/generated-api.ts` — none are redefined here (Constitution VI).

## Existing API contracts consumed (from `generated-api.ts`)

| Type | Shape (as generated) | Used by |
|------|----------------------|---------|
| `LoginRequest` | `{ email?: string \| null; password?: string \| null }` | login, register step 2 |
| `AuthResponse` | `{ accessToken?; refreshToken?; expiresIn? }` | login result → token persistence |
| `RegisterRequest` | `{ email?: string \| null; password?: string \| null }` | register step 1 |
| `RegisterResponse` | `{ id?; email?; createdAt? }` | register step 1 result (no tokens) |
| `CreateOrganizationRequest` | `{ name?: string \| null }` | register step 3 |
| `OrganizationResponse` | `{ id?; name?; createdAt? }` | register step 3 result |
| `UserProfileResponse` | (existing) `{ ...role?: { permissions? } }` | current-user/org context (via existing `/users/me`) |

> The form-level fields (organization name on registration) are **not** part of `RegisterRequest`; they are routed to `CreateOrganizationRequest` in step 3. See contracts/auth-flows.md.

## Client-side view models (new, frontend-only)

These are local UI/state shapes, not API payloads. They are plain TypeScript types in the `auth` module.

### LoginFormState
| Field | Type | Notes |
|-------|------|-------|
| `email` | `string` | bound to email input |
| `password` | `string` | bound to masked input |
| `errors` | `{ email?: string; password?: string; form?: string }` | per-field + form-level (e.g., invalid credentials) |
| `status` | `'idle' \| 'validating' \| 'submitting' \| 'error'` | drives submit-disabled + progress |

### RegisterFormState
| Field | Type | Notes |
|-------|------|-------|
| `email` | `string` | |
| `password` | `string` | masked |
| `organizationName` | `string` | routed to `CreateOrganizationRequest.name` |
| `errors` | `{ email?; password?; organizationName?; form? }` | per-field + form-level |
| `status` | `'idle' \| 'validating' \| 'submitting' \| 'error'` | |
| `step` | `'register' \| 'login' \| 'create-org' \| 'done'` | tracks orchestration progress for retry semantics (D2) |

### AuthState (context)
| Field | Type | Notes |
|-------|------|-------|
| `phase` | `'resolving' \| 'unauthenticated' \| 'authenticated'` | `resolving` prevents flash-of-wrong-view on load |
| `accessToken` | `string \| null` | derived from `tokenStorage`; presence implies authenticated |
| `refreshToken` | `string \| null` | stored for future refresh wiring (out of scope) |
| `profile` | `UserProfileResponse \| undefined` | optional, loaded via existing `/users/me` |

### Auth actions (context API)
| Action | Input | Effect |
|--------|-------|--------|
| `login` | `LoginRequest` | call login → persist tokens → `phase = authenticated` |
| `register` | `{ email; password; organizationName }` | 3-call orchestration (D1/D2) → persist tokens → create org → `phase = authenticated` |
| `logout` | — | call `/api/auth/logout` (best-effort) → clear tokens → `phase = unauthenticated` |

## Validation rules (mirror of backend `PasswordValidator`)

| Field | Rule | Message (example) |
|-------|------|-------------------|
| email | non-empty, ≤255, matches `^[^@\s]+@[^@\s]+\.[^@\s]+$` | "Enter a valid email address." |
| password | length ≥ 8 | "Password must be at least 8 characters." |
| password | ≥1 uppercase | "Password must contain an uppercase letter." |
| password | ≥1 lowercase | "Password must contain a lowercase letter." |
| password | ≥1 digit | "Password must contain a digit." |
| organizationName (register) | non-empty after trim | "Organization name is required." |

Validation runs on blur and on submit; submission is blocked while any field error exists (SC-002).

## State transitions

### Login
```
idle → (submit) → validating → [invalid] → error (per-field) → idle
                              → [valid] → submitting → [200] → authenticated → dashboard
                                                     → [401] → error (form: invalid credentials)
                                                     → [5xx/network] → error (form: generic, retryable)
```

### Registration (non-atomic orchestration)
```
idle → validating → [valid] → submitting:register → [409] → error(form: email in use)
                                                   → [201] → submitting:login → [tokens] → submitting:create-org
                                                                                          → [201] → authenticated → dashboard
                                                                                          → [fail] → error(form: org step, retry create-org only)
```

### Auth gate (App.tsx)
```
resolving → [token present] → authenticated → render dashboard
          → [no token]      → unauthenticated → render Login (toggle ↔ Register)
authenticated → (logout) → unauthenticated
```

## Relationships

- A successful **registration** produces, server-side: one `User`, one `Organization`, its four default `OrganizationRole`s, and one `UserOrganizationMapping` (User↔Organization as Admin). The frontend does not model these; it only consumes `RegisterResponse` and `OrganizationResponse` and relies on the resulting authenticated, org-scoped session.
- The persisted `accessToken` is the single source of truth for the `authenticated` phase and is consumed transparently by the existing `apiFetch` client for all downstream requests.
