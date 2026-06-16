# Implementation Plan: Registration & Organization Onboarding Flow

**Branch**: `007-registration-org-onboarding` | **Date**: 2026-06-16 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/007-registration-org-onboarding/spec.md`

## Summary

Wire the **end-to-end onboarding flow** on top of the auth layout components delivered by feature 006 (SPLR-21): a new user registers → an organization is created with them as **Admin** → they land in the (empty) dashboard with a one-time **welcome modal**; a returning user uses a **login-only** path into their existing organization; and an authenticated **session persists** across reloads and full browser restart, self-healing via a silent token refresh on load.

The decisive finding from grounding the spec against the codebase: **no backend change is required.** Every endpoint this flow needs already exists, and the profile contract exposes exactly the signal needed to drive routing:

- **`GET /api/users/me`** → `UserProfileResponse { organization?, role?, venueScopes }` where `organization` and `role` are **nullable**. A present `organization` ⇒ route to dashboard; a `null` `organization` ⇒ the account exists but has no tenant ⇒ route into the **organization-creation step** (FR-006a). `role` carries the **Admin** assignment (FR-002, SC-002).
- **`POST /api/auth/refresh`** (`RefreshRequest` → `AuthResponse`) backs the silent refresh-on-load (FR-008a).
- **`POST /api/organizations`** (`CreateOrganizationRequest { name }`, authenticated) creates the org, seeds default roles, and maps the creator as **Admin** (`OrganizationService.CreateOrganizationAsync`). The access token only carries an `org_id` claim **after** a mapping exists, so the flow must re-issue a token (re-login or refresh) after org creation so subsequent calls are org-scoped (FR-016).
- **`GET /api/venues`** → `VenueResponse[]` lets the dashboard detect a brand-new org (empty list) and render a non-erroring empty state instead of the hardcoded-id `EventLedgerPage` that would 404 (FR-005).

This feature therefore **refactors the 006 `AuthContext`** from a naive "token present ⇒ authenticated" check into a profile-driven state machine (`resolving → unauthenticated | needs-organization | authenticated`), adds a one-time **welcome modal**, and adds a **dashboard empty state**. It stays Constitution VI-compliant: all payloads are consumed from `apps/web/src/types/generated-api.ts` (notably the existing `useUserProfile()` hook in `src/api/user.ts`); no DTOs change, so no swagger regeneration is needed. All work ships with Vitest + React Testing Library coverage at the repo's ≥80% gate, plus a Playwright E2E spec for the multi-step tenant-creating onboarding flow (Constitution III).

## Technical Context

**Language/Version**: TypeScript 5.7 + React 18.3 (frontend `apps/web`), built with Vite 6. **No backend (C# .NET 8) code changes.**

**Primary Dependencies**: React 18, `@tanstack/react-query` v5 (queries/mutations, already the data-fetching standard), native `fetch` via the existing `apiFetch` helper (`src/api/client.ts`). Testing: Vitest 2 + `@testing-library/react` + `@testing-library/user-event` + jsdom (all present); Playwright in the existing `tests/e2e` workspace for the onboarding E2E. **No new runtime dependencies; no router library** (the app remains router-less; routing is an in-app auth-phase view switch consistent with 006).

**Storage**: Browser `localStorage` for `accessToken` and `refreshToken` via the existing `src/auth/tokenStorage.ts` (already `localStorage`-backed, so the session already survives a full browser close/restart — FR-007). No server-side storage and no schema changes.

**Testing**: Vitest + React Testing Library unit/component tests under `apps/web/tests/**` for: the auth bootstrap (refresh-on-load success/failure, non-flickering resolving state), profile-driven routing (org present → dashboard, org null → org-creation step), the register orchestration incl. partial-failure recovery, the welcome modal (shows once after onboarding, never on returning login), and the dashboard empty state. Coverage enforced at ≥80% lines/functions/branches/statements via the existing `vite.config.ts` v8 thresholds. A Playwright E2E spec in `tests/e2e` exercises the full new-user onboarding → Admin → dashboard flow with intercepted auth state (Constitution III multi-user/tenant validation).

**Target Platform**: Modern evergreen browsers, desktop and mobile, served by the Vite SPA build.

**Project Type**: Web application — frontend slice only (`apps/web`); backend consumed as-is.

**Performance Goals**: Onboarding completes in a single uninterrupted flow (SC-001, under 2 min); auth state resolves on load without a flash of the wrong view (FR-011); errors surface inline with no full-page reload (SC-003).

**Constraints**: Constitution III — automated tests accompany all new code; **≥80.0% line/branch coverage enforced independently for backend and frontend** in CI (missing/unparseable coverage reports treated as failing). Constitution VI — all API types imported from `generated-api.ts`; no hand-authored payload interfaces and no DTO changes. Constitution VIII — no password/token/PII written to logs or console; sanitized inline error mapping that does not disclose whether an email exists beyond what is needed. Org creation is a non-atomic multi-call sequence; partial failure must be surfaced and safely retryable without duplicating an organization (FR-012, FR-013).

**Scale/Scope**: Refactor of one context (`AuthContext`) + a small auth bootstrap module; ~3 new components (welcome modal, dashboard home/empty-state, organization-creation step view) reusing 006's `RegisterForm`/`AuthLayout`; profile-driven routing in `App.tsx`; plus their tests and one E2E spec. ~6–9 changed/new source files plus tests.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Applicable? | Status | Notes |
|---|-----------|-------------|--------|-------|
| I | Core Mathematical Axioms | No | PASS (N/A) | Onboarding performs no monetary computation; no `double`/`float`/`number` money math is introduced. |
| II | Multi-Tenant Isolation | **Yes (indirect)** | PASS | Onboarding ends with the user mapped as Admin to a new organization via the existing `OrganizationService`; routing is driven by the server-provided `organization` on `/users/me`. An org-less profile is treated as "not yet provisioned" and sent to org creation rather than issuing any unscoped query. The frontend calls only existing org-scoped endpoints; the access token re-issued after org creation carries `org_id`. |
| III | Engineering Rigor & Quality Gates | **Yes — primary** | PASS | Every new/changed component, hook, and the context state machine ship with Vitest + RTL tests; ≥80% coverage gate enforced by `vite.config.ts`. The multi-step, tenant-creating onboarding is covered by a Playwright E2E spec in `tests/e2e` with intercepted login/refresh states. |
| IV | QBO Integration | No | PASS (N/A) | No QuickBooks calls of any kind. |
| V | Ledger State Machine & Immutability | No | PASS (N/A) | No `events`/`event_artists`/`financial_line_items` mutation; the dashboard empty state only *reads* `/venues` (and existing ledger reads when data exists). |
| VI | Polyglot Contract Serialization | **Yes — primary** | PASS | All payloads (`RegisterRequest`/`RegisterResponse`, `LoginRequest`/`AuthResponse`, `RefreshRequest`, `CreateOrganizationRequest`/`OrganizationResponse`, `UserProfileResponse`, `VenueResponse`) are imported from `generated-api.ts`. No payload interface is hand-authored; **no DTO change**, so no swagger regeneration. |
| VII | EF Core Axioms | No | PASS (N/A) | No Entity Framework / query code; frontend-only. |
| VIII | Exception Governance & Logging Privacy | **Yes** | PASS | No password, token, or PII is written to logs/console. Error/validation messaging is sanitized (reuses 006's `mapAuthError`) and does not disclose whether an email exists beyond what is needed. Failures surface as inline messages; the org-creation partial-failure path is explicit and retryable, never swallowed. |

**Gate result**: All gates PASS. No violations. Complexity Tracking not required.

## Project Structure

### Documentation (this feature)

```text
specs/007-registration-org-onboarding/
├── plan.md              # This file
├── research.md          # Phase 0 output — decisions (bootstrap/refresh, org-less routing, welcome modal, empty state)
├── data-model.md        # Phase 1 output — frontend auth-phase state + view models mapped to generated types
├── quickstart.md        # Phase 1 output — manual + automated validation guide
├── contracts/           # Phase 1 output
│   ├── onboarding-flows.md      # Client orchestration against existing endpoints (bootstrap, onboarding, login, refresh, sign-out)
│   └── ui-components.md         # Component contracts: welcome modal, dashboard empty state, org-creation step, auth gate
├── checklists/
│   └── requirements.md  # Spec quality checklist (from /speckit-specify)
└── tasks.md             # Phase 2 output (created by /speckit-tasks)
```

### Source Code (repository root)

```text
apps/web/
├── src/
│   ├── auth/
│   │   ├── AuthContext.tsx                    # EXTEND — profile-driven phase machine: resolving → unauthenticated | needs-organization | authenticated; justOnboarded flag
│   │   ├── authBootstrap.ts                   # NEW — on-load: load /users/me; on 401 attempt refresh then retry; on failure clear + unauthenticated
│   │   ├── authApi.ts                         # EXTEND — add refreshSession(); keep login/register orchestration; route org-less to org-creation
│   │   ├── tokenStorage.ts                    # EXISTING — localStorage accessToken/refreshToken (unchanged; already survives restart)
│   │   ├── useAuth.ts                         # EXISTING — context hook (unchanged)
│   │   └── validation.ts                      # EXISTING — reused (org name / email / password)
│   ├── api/
│   │   ├── user.ts                            # EXISTING — useUserProfile() (/users/me); reused for org/role detection
│   │   ├── venues.ts                          # NEW — useVenues() (GET /api/venues) for dashboard empty-state detection
│   │   └── client.ts                          # EXISTING — reused (unchanged)
│   ├── components/
│   │   ├── auth/                              # EXISTING (006) — AuthLayout, FormField, LoginForm, RegisterForm (reused)
│   │   └── onboarding/                        # NEW
│   │       ├── WelcomeModal.tsx               # NEW — one-time post-onboarding welcome, dismissable, focus-trapped (a11y)
│   │       └── OrganizationCreateStep.tsx     # NEW — org-only step for authenticated-but-org-less users (reuses RegisterForm org field path)
│   ├── pages/
│   │   ├── DashboardHome.tsx                  # NEW — landing: empty state for new org (no venues) vs existing ledger workspace
│   │   ├── EventLedgerPage.tsx                # EXISTING — unchanged (rendered when a venue/event exists)
│   │   ├── LoginPage.tsx / RegisterPage.tsx   # EXISTING (006) — reused
│   ├── App.tsx                                # EXTEND — gate by auth phase incl. needs-organization → OrganizationCreateStep; mount WelcomeModal on first authenticated render after onboarding
│   └── index.css                             # EXTEND — welcome modal + empty-state styles
└── tests/
    ├── auth/
    │   ├── authBootstrap.test.ts             # NEW — refresh-on-load success/failure, clears on failure, resolving state
    │   ├── AuthContext.onboarding.test.tsx   # NEW — org present → authenticated; org null → needs-organization; justOnboarded toggling
    │   └── authApi.refresh.test.tsx          # NEW — refreshSession mutation + org-less routing
    ├── onboarding/
    │   ├── WelcomeModal.test.tsx             # NEW — shows once after onboarding, dismiss, not shown on returning login, a11y
    │   └── OrganizationCreateStep.test.tsx   # NEW — org-less user completes org creation → Admin → dashboard
    └── pages/
        └── DashboardHome.test.tsx            # NEW — empty state for new org; ledger path when venues exist

tests/e2e/
└── onboarding.spec.ts                        # NEW — Playwright: register → org → Admin → dashboard; returning login-only; reload persistence
```

**Structure Decision**: Follow the established `apps/web` conventions (002–006): presentational components under `src/components/<domain>/`, route-level screens under `src/pages/`, and data/effect logic under `src/auth/` and `src/api/`. Reuse 006's `AuthLayout`/`RegisterForm`/`validation` and the existing `useUserProfile()` hook rather than duplicating them. Keep the app **router-less**: routing remains an auth-phase-driven view switch in `App.tsx`, now with an added `needs-organization` phase. All API contracts are imported from `generated-api.ts`; no new DTOs, so no `swagger.json`/type regeneration step is needed.

## Complexity Tracking

No constitution violations to justify. The notable complexity is inherent and pre-existing: **onboarding is a non-atomic multi-call sequence** (register → login → create-organization → re-issue token) because the existing contracts split user creation from organization creation, and the JWT only carries `org_id` after the mapping exists. This is handled explicitly in `authApi.ts`/`AuthContext.tsx` with profile-driven recovery: a failed org-creation leaves the user authenticated-but-org-less, which the state machine routes to the organization-creation step (retryable without re-entering the password and without creating duplicate orgs). The rejected alternative — a backend "register-with-organization" transactional endpoint returning tokens — was set aside to keep this feature frontend-only and avoid DTO/swagger churn; it is noted in research.md as a future backend simplification.

## Post-Design Constitution Re-Check

*Re-evaluated after Phase 1 design artifacts (research.md, data-model.md, contracts/, quickstart.md).*

| # | Principle | Re-Check | Notes |
|---|-----------|----------|-------|
| I | Core Mathematical Axioms | PASS (N/A) | No monetary math in the onboarding surface. |
| II | Multi-Tenant Isolation | PASS | Routing is driven by the server-provided `organization` on `/users/me`; org-less profiles are sent to org creation, never to unscoped data. The post-org token re-issue guarantees `org_id` scoping before any workspace query. |
| III | Engineering Rigor | PASS | data-model/contracts enumerate Vitest + RTL suites for bootstrap, phase machine, orchestration recovery, welcome modal, and empty state, plus a Playwright onboarding E2E; ≥80% gate enforced in `vite.config.ts`. |
| IV | QBO Integration | PASS (N/A) | No Intuit interaction. |
| V | Ledger State Machine | PASS (N/A) | Dashboard empty state only reads `/venues`; no ledger/settlement mutation. |
| VI | Polyglot Contracts | PASS | All artifacts consume only `generated-api.ts` types (`UserProfileResponse`, `AuthResponse`, `RefreshRequest`, `CreateOrganizationRequest`, `VenueResponse`, etc.); no DTO change, no swagger regeneration. |
| VII | EF Core Axioms | PASS (N/A) | Frontend-only; no EF queries introduced. |
| VIII | Exception Governance & Logging Privacy | PASS | Sanitized inline error mapping (reuses `mapAuthError`); passwords/tokens never logged; org-create partial failure is explicit and retryable. |

**Re-check result**: All gates PASS post-design. Ready for `/speckit-tasks`.
