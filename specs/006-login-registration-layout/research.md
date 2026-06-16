# Phase 0 Research: Login & Registration Layout Components

All Technical Context unknowns are resolved below. Each decision is grounded in the existing codebase (`apps/web`, `apps/api`) and the project constitution.

## D1. Registration that collects an organization name (contract gap)

**Decision**: Implement registration as a **three-call client orchestration** against existing endpoints — `POST /api/auth/register` → `POST /api/auth/login` → `POST /api/organizations` — with no backend or DTO change.

**Rationale**:
- The registration form must collect email, password, and **organization name** (clarified spec, FR-002). The existing `RegisterRequest` contract carries only `{ email, password }` and `RegisterResponse` returns `{ id, email, createdAt }` with **no tokens** (`apps/web/src/types/generated-api.ts`; `apps/api/DTOs/Auth/AuthDtos.cs`).
- `OrganizationService.CreateOrganizationAsync` already creates the organization, seeds the four default roles, and maps the **calling user as Admin** (`apps/api/Services/OrganizationService.cs`). So once the new user is authenticated, a single `POST /api/organizations { name }` completes the "register an organization" journey and leaves the user a scoped member — satisfying tenant isolation (Constitution II).
- This keeps SPLR-21 a **frontend-only** feature and is fully Constitution VI-compliant: every payload type is imported from `generated-api.ts`, nothing is hand-authored, and no `swagger.json` regeneration is triggered.

**Alternatives considered**:
- **Extend `RegisterRequest` with `organizationName` and return tokens (C#-first)**: cleanest single round-trip and atomic, but expands a layout-focused issue into backend/contract changes plus type regeneration. Rejected to avoid backend churn; can be revisited later as a backend optimization without changing the UI.
- **Frontend creates a hand-written "register" payload type**: rejected outright — violates Constitution VI.

## D2. Auto-login on successful registration

**Decision**: After `register`, immediately call `login` with the same credentials to obtain `AuthResponse` tokens, persist them, then create the organization; finally route into the dashboard. No separate user-initiated sign-in step (matches clarification).

**Rationale**: `RegisterResponse` returns no tokens, so authentication must come from the existing `login` endpoint. Chaining login right after register yields a seamless auto-login while reusing the exact same token-issuing path as the login screen.

**Partial-failure semantics** (registration is non-atomic):
- **Step 1 (register) fails** → surface the inline error (e.g., duplicate email → 409 "Email already registered."); nothing persisted; user stays on the register screen with entered values preserved except password (FR-005).
- **Step 2 (login) fails** (unexpected, since credentials were just set) → surface a generic inline error and prompt retry; the account exists, so a retry can proceed via the login screen.
- **Step 3 (create-organization) fails** → the user **is already authenticated**; surface an inline error and allow retry of organization creation only (do not re-register). This avoids orphaning the flow and keeps the action idempotent from the user's perspective.

## D3. Routing / navigation without a router

**Decision**: Add a lightweight `AuthContext` provider plus an **auth gate** in `App.tsx`. Unauthenticated users see an in-app login/register view (toggled by local view state); authenticated users see the existing `EventLedgerPage` dashboard. Do **not** add a router dependency.

**Rationale**: The app currently has no router — `App.tsx` parses query params and renders only `EventLedgerPage`. FR-006 (route to dashboard on success) and FR-007 (move between login and registration) are satisfiable with a small state machine and conditional rendering, avoiding a new dependency and matching the codebase's current minimal-routing posture. Auth state is derived from token presence on load, gated behind a non-flickering "resolving" state to prevent a flash of the wrong screen.

**Alternatives considered**: Adding `react-router`. Rejected for this slice — unjustified surface area for two screens plus a gate; can be introduced later if multi-route navigation grows.

## D4. Token storage convention

**Decision**: Persist `accessToken` and `refreshToken` in `localStorage`; centralize access in `src/auth/tokenStorage.ts`.

**Rationale**: `src/api/client.ts` already reads `localStorage.getItem('accessToken')` to build the `Authorization: Bearer` header. Reusing this exact key means the post-login `POST /api/organizations` call and all subsequent dashboard requests are authenticated with no changes to the HTTP client. `refreshToken` is stored for future refresh wiring (`/api/auth/refresh` exists) though refresh flow itself is out of scope for this feature.

**Security note (Constitution VIII)**: tokens and passwords are never logged. `localStorage` is the pre-existing project convention; hardening token storage (e.g., httpOnly cookies) is a cross-cutting concern outside this layout feature's scope.

## D5. Inline validation rules (client/server parity)

**Decision**: Mirror the backend `PasswordValidator` rules exactly in `src/auth/validation.ts`:
- **Email**: non-empty, ≤255 chars, matches `^[^@\s]+@[^@\s]+\.[^@\s]+$` (same shape as backend regex).
- **Password**: ≥8 chars, ≥1 uppercase, ≥1 lowercase, ≥1 digit.
- **Organization name** (register only): non-empty after trim.

**Rationale**: Client-side parity ensures 100% of invalid submissions are caught before any network call (SC-002) and that the UI never shows a rule the server would not enforce. Mirrors `apps/api/Services/PasswordValidator.cs`. The validators are pure functions, trivially unit-testable, and the password rule list doubles as inline guidance.

**Note**: This is intentional behavioral parity, not type duplication — it does not violate Constitution VI (which concerns payload **types**, all still imported from `generated-api.ts`).

## D6. Error surfacing from the existing HTTP client

**Decision**: Consume the existing `apiFetch` helper, which throws `Error("<status>: <detail>")` parsed from the API's `ErrorResponse` (`{ detail | title }`). Auth mutations map these to user-facing inline messages: invalid credentials (login 401), duplicate email (register 409), and a generic non-leaking message for network/5xx failures, with retry enabled (FR-004, FR-005, FR-011, edge cases).

**Rationale**: Reuses the project's established error contract and avoids a parallel fetch layer. Messages are deliberately non-disclosive (no "email exists" beyond what registration must convey).

## D7. Testing approach

**Decision**: Vitest + React Testing Library + `@testing-library/user-event` for all components, hooks, and the orchestration; assert accessibility associations (label↔input, error↔input via `aria-describedby`, `aria-invalid`) and keyboard operability. Mock `fetch`/`apiFetch` for the auth API tests, including the register partial-failure path. Maintain ≥80% coverage (existing `vite.config.ts` thresholds).

**Rationale**: Satisfies Constitution III for frontend components. The cross-browser Playwright login-interception E2E is already provided by the `tests/e2e` workspace (feature 005) and is not duplicated here.

## Summary of resolved unknowns

| Unknown | Resolution |
|---------|-----------|
| How to collect organization name at registration | 3-call orchestration; existing `POST /api/organizations` maps user as Admin (D1) |
| How auto-login works given tokenless `RegisterResponse` | Chain `login` after `register`, persist tokens, then create org (D2) |
| How to route with no router present | `AuthContext` + auth gate in `App.tsx`, view toggle for login/register (D3) |
| Where to store tokens | `localStorage` `accessToken`/`refreshToken`, reused by existing `client.ts` (D4) |
| Validation rules | Mirror backend `PasswordValidator` exactly (D5) |
| Error display source | Existing `apiFetch` error contract → inline sanitized messages (D6) |
| Test strategy & coverage | Vitest + RTL, ≥80%, a11y assertions; E2E covered by 005 (D7) |
