# Implementation Plan: Login & Registration Layout Components (Responsive)

**Branch**: `006-login-registration-layout` | **Date**: 2026-06-15 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/006-login-registration-layout/spec.md`

## Summary

Deliver the user-facing **authentication entry experience** for the web app: a responsive `LoginPage`, `RegisterPage`, and a shared `AuthLayout`, with inline field validation, inline error display for failed attempts, password masking, progress/disabled state during submission, and WCAG 2.1 AA accessibility. On success the user lands in the existing dashboard (`EventLedgerPage`); on registration the user is **auto-authenticated** with a new organization (no separate sign-in step).

The decisive finding from grounding the spec against the codebase: **no backend change is required.** The existing endpoints fully support the clarified behavior, so this stays a pure frontend feature that is Constitution VI-compliant (all contracts consumed from `apps/web/src/types/generated-api.ts`, no hand-authored interfaces, no DTO edits):

- **Login** → `POST /api/auth/login` (`LoginRequest` → `AuthResponse { accessToken, refreshToken, expiresIn }`).
- **Registration** is a three-call client orchestration against existing endpoints, because the registration form collects an organization name that `RegisterRequest` (email + password only) does not carry, and `RegisterResponse` returns no tokens:
  1. `POST /api/auth/register` (`RegisterRequest`) → creates the user.
  2. `POST /api/auth/login` (`LoginRequest`) → obtains tokens (auto-login).
  3. `POST /api/organizations` (`CreateOrganizationRequest { name }`, authenticated) → creates the organization, seeds default roles, and maps the new user as **Admin** (`OrganizationService.CreateOrganizationAsync`).

  This leaves the user authenticated **and** a member of an organization (satisfying tenant isolation), then routes into the dashboard.

The app currently has **no router** (`App.tsx` parses query params and renders only `EventLedgerPage`). Rather than introduce a routing dependency, this feature adds a lightweight `AuthContext` (token-presence + current org/profile) and an **auth gate** in `App.tsx`: unauthenticated users see the login/registration screens (toggled by an in-app view state), authenticated users see the existing dashboard. Token persistence reuses the established `localStorage` convention already read by `apps/web/src/api/client.ts` (`accessToken`, plus `refreshToken`).

Inline validation mirrors the backend rules exactly so 100% of invalid input is caught client-side before any request (SC-002): email format, and password ≥8 chars with at least one uppercase, one lowercase, and one digit (`PasswordValidator`). All work ships with Vitest + React Testing Library coverage at the repo's ≥80% gate.

## Technical Context

**Language/Version**: TypeScript 5.7 + React 18.3 (frontend `apps/web`), built with Vite 6. No backend code changes.

**Primary Dependencies**: React 18, `@tanstack/react-query` v5 (mutations/queries, already the data-fetching standard), native `fetch` via the existing `apiFetch` helper (`src/api/client.ts`). Testing: Vitest 2 + `@testing-library/react` + `@testing-library/user-event` + jsdom (all already present). No new runtime dependencies; **no router library is added** (consistent with the current no-router app).

**Storage**: Browser `localStorage` for `accessToken` and `refreshToken`, matching the existing convention consumed by `client.ts`. No server-side storage and no schema changes.

**Testing**: Vitest + React Testing Library component/unit tests under `apps/web/tests/auth/**` (form rendering, inline validation, masking, submit-in-progress disabling, error display, accessibility associations, registration orchestration, auth-gate routing). Coverage enforced at ≥80% lines/functions/branches/statements via the existing `vite.config.ts` v8 thresholds. The cross-browser Playwright login interception E2E lives in the established `tests/e2e` workspace (feature 005) and is out of scope for this feature's deliverables.

**Target Platform**: Modern evergreen browsers, desktop and mobile, served by the Vite SPA build.

**Project Type**: Web application — frontend slice only (`apps/web`).

**Performance Goals**: Sign-in reaches the dashboard within a single screen with no full-page reload to surface errors (SC-001); inline validation is synchronous/instant; auth state resolves on load without a flash of the wrong view (non-flickering neutral state).

**Constraints**: Constitution VI — all API types imported from `generated-api.ts`; no hand-authored payload interfaces and no DTO changes. WCAG 2.1 AA (labels programmatically associated, full keyboard operability, visible focus, error messages associated with fields and announced). No PII/token logging (Constitution VIII). Responsive and fully usable at ≈375px and ≈1280px (SC-003). Registration is a non-atomic 3-call sequence; partial failure must be surfaced and safely retryable.

**Scale/Scope**: Two screens (login, register), one shared layout, a reusable accessible form-field primitive, an auth context/provider, an auth API module (3 mutations: login, register-orchestration, logout), and an auth gate wired into `App.tsx`. ~7–9 new source files plus their tests.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Applicable? | Status | Notes |
|---|-----------|-------------|--------|-------|
| I | Core Mathematical Axioms | No | PASS (N/A) | Authentication screens perform no monetary computation; no `double`/`float`/`number` money math is introduced. |
| II | Multi-Tenant Isolation | **Yes (indirect)** | PASS | The registration orchestration ends with the user mapped to a new organization (Admin) via the existing `OrganizationService`, so the authenticated session always carries an `organization_id`. The frontend issues no unscoped data queries; it only calls existing auth/organization endpoints that enforce scoping server-side. |
| III | Engineering Rigor & Quality Gates | **Yes — primary** | PASS | Every new component, hook, and page ships with Vitest + React Testing Library tests; ≥80% coverage gate enforced by existing `vite.config.ts`. The multi-user login interception E2E requirement is satisfied by the existing `tests/e2e` Playwright platform (feature 005), not duplicated here. |
| IV | QBO Integration | No | PASS (N/A) | No QuickBooks calls of any kind. |
| V | Ledger State Machine & Immutability | No | PASS (N/A) | No `events`/`event_artists`/`financial_line_items` access; no settlement state interaction. |
| VI | Polyglot Contract Serialization | **Yes — primary** | PASS | All payloads (`LoginRequest`, `AuthResponse`, `RegisterRequest`, `RegisterResponse`, `CreateOrganizationRequest`, `OrganizationResponse`, `UserProfileResponse`) are imported from `generated-api.ts`. No TypeScript interface mirroring a payload is hand-authored; **no DTO change is required**, so no swagger regeneration is needed. |
| VII | EF Core Axioms | No | PASS (N/A) | No Entity Framework / query code; frontend-only. |
| VIII | Exception Governance & Logging Privacy | **Yes** | PASS | No password, token, or PII is ever written to logs or the console. Error/validation messaging is sanitized and does not disclose whether an email exists beyond what is needed (FR-011). Failures surface as user-facing inline messages, never swallowed silently. |

**Gate result**: All gates PASS. No violations. Complexity Tracking not required.

## Project Structure

### Documentation (this feature)

```text
specs/006-login-registration-layout/
├── plan.md              # This file
├── research.md          # Phase 0 output — decisions (registration orchestration, routing, validation, token storage)
├── data-model.md        # Phase 1 output — frontend form/view/auth-state models mapped to generated types
├── quickstart.md        # Phase 1 output — manual + automated validation guide
├── contracts/           # Phase 1 output
│   ├── auth-flows.md            # Client orchestration against existing endpoints (login, register, logout, gate)
│   └── ui-components.md         # Component contracts: props, states, a11y, responsive behavior
├── checklists/
│   └── requirements.md  # Spec quality checklist (from /speckit-specify)
└── tasks.md             # Phase 2 output (created by /speckit-tasks)
```

### Source Code (repository root)

```text
apps/web/
├── src/
│   ├── auth/                                  # NEW — auth state + client orchestration (no UI)
│   │   ├── AuthContext.tsx                    # NEW — provider: token presence, current profile/org, login/register/logout actions
│   │   ├── useAuth.ts                         # NEW — context hook
│   │   ├── authApi.ts                         # NEW — TanStack Query mutations consuming generated types (login, register-orchestration, logout)
│   │   ├── tokenStorage.ts                    # NEW — localStorage accessToken/refreshToken get/set/clear (aligns with client.ts)
│   │   └── validation.ts                      # NEW — email/password/required validators mirroring backend PasswordValidator rules
│   ├── components/
│   │   └── auth/                              # NEW — presentational auth UI
│   │       ├── AuthLayout.tsx                 # NEW — responsive centered card + branding shell for both screens
│   │       ├── FormField.tsx                  # NEW — reusable label+input+inline-error, programmatically associated (a11y)
│   │       ├── LoginForm.tsx                  # NEW — email + password, inline validation, error banner, submit state
│   │       └── RegisterForm.tsx               # NEW — email + password + organization name (exactly three fields)
│   ├── pages/
│   │   ├── LoginPage.tsx                      # NEW — composes AuthLayout + LoginForm, link to register
│   │   ├── RegisterPage.tsx                   # NEW — composes AuthLayout + RegisterForm, link to login
│   │   └── EventLedgerPage.tsx                # EXISTING — the dashboard (unchanged)
│   ├── api/
│   │   └── client.ts                          # EXISTING — reused; already reads localStorage accessToken (unchanged)
│   ├── App.tsx                                # EXTEND — wrap in AuthProvider; auth gate: unauth → Login/Register, auth → dashboard
│   ├── main.tsx                               # EXTEND (minimal) — ensure AuthProvider sits within QueryClientProvider
│   └── index.css                             # EXTEND — responsive auth layout styles (mobile ≈375px, desktop ≈1280px), focus-visible
└── tests/
    └── auth/                                  # NEW — Vitest + RTL
        ├── LoginForm.test.tsx                 # validation, masking, error display, submit-disabled, a11y associations
        ├── RegisterForm.test.tsx              # three-field validation, error display, a11y
        ├── AuthLayout.test.tsx                # renders children; responsive landmarks
        ├── validation.test.ts                 # email + password rule parity with backend
        ├── authApi.test.tsx                   # login mutation; register 3-call orchestration incl. partial-failure path
        └── AuthGate.test.tsx                  # unauth shows login; authenticated shows dashboard; toggle login↔register
```

**Structure Decision**: Follow the established `apps/web` conventions (002–005): presentational components under `src/components/<domain>/`, route-level screens under `src/pages/`, and data/effect logic under a dedicated `src/auth/` module mirroring the existing `src/api/` pattern. Reuse the existing `apiFetch` client and `localStorage` token convention rather than introducing a parallel HTTP layer. Deliberately **avoid adding a router dependency**: the app has none today, and a context-driven auth gate with an in-app login/register view toggle fully satisfies FR-006 (route to dashboard) and FR-007 (move between login and registration) with less surface area. All API contracts are imported from `generated-api.ts`; no new DTOs, so no `swagger.json`/type regeneration step is needed.

## Complexity Tracking

No constitution violations to justify. The only notable complexity is that **registration is a non-atomic three-call sequence** (register → login → create-organization) because the existing contracts split user creation from organization creation. This is intentionally handled in `authApi.ts` with explicit partial-failure semantics (see research.md): each step's failure produces a specific inline message, and because the user is already authenticated after step 2, a failed step 3 is safely retryable without re-registering. The alternative—extending `RegisterRequest`/`RegisterResponse` C#-first to accept an organization name and return tokens—was rejected to keep this feature frontend-only and avoid backend/contract churn for a layout-focused issue (SPLR-21).

## Post-Design Constitution Re-Check

*Re-evaluated after Phase 1 design artifacts (research.md, data-model.md, contracts/, quickstart.md).*

| # | Principle | Re-Check | Notes |
|---|-----------|----------|-------|
| I | Core Mathematical Axioms | PASS (N/A) | No monetary math anywhere in the auth surface. |
| II | Multi-Tenant Isolation | PASS | Registration orchestration ends in an Admin `UserOrganizationMapping` via the existing `OrganizationService`; every authenticated session is org-scoped. Frontend issues no unscoped queries. |
| III | Engineering Rigor | PASS | Design enumerates Vitest + RTL suites for every component/hook/page including the register partial-failure path and the auth gate; ≥80% coverage gate already enforced in `vite.config.ts`. |
| IV | QBO Integration | PASS (N/A) | No Intuit interaction. |
| V | Ledger State Machine | PASS (N/A) | No ledger/settlement state touched. |
| VI | Polyglot Contracts | PASS | data-model.md and contracts/ consume only `generated-api.ts` types (`LoginRequest`, `AuthResponse`, `RegisterRequest`/`RegisterResponse`, `CreateOrganizationRequest`, `OrganizationResponse`, `UserProfileResponse`); the organization name is routed to `CreateOrganizationRequest`, not a hand-authored register type. No DTO change, no swagger regeneration. |
| VII | EF Core Axioms | PASS (N/A) | Frontend-only; no EF queries introduced. |
| VIII | Exception Governance & Logging Privacy | PASS | Sanitized inline error mapping (contracts/auth-flows.md) discloses nothing sensitive; passwords/tokens never logged. |

**Re-check result**: All gates PASS post-design. Ready for `/speckit-tasks`.
