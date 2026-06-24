# Implementation Plan: JWT Persistence, Refresh Rotation & 401 Handling in API Client

**Branch**: `008-jwt-refresh-401-handling` | **Date**: 2026-06-16 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/008-jwt-refresh-401-handling/spec.md`

## Summary

Close the **mid-session resilience gap** in the frontend's shared API request layer (`apps/web/src/api/client.ts`). Today `apiFetch` reads the access token directly from `localStorage`, attaches a Bearer header, and `throw`s on any non-OK response. It has **no 401 recovery**: when a short-lived access token expires while the user is working, the next request fails hard and the calling component shows an error — even though the user is still legitimately authenticated via a valid refresh token.

The decisive grounding finding: **feature 007 already delivered the building blocks** this feature needs, so **no backend change and no new runtime dependency is required**:

- **`tokenStorage.ts`** already persists `accessToken`/`refreshToken` in `localStorage` (survives reload + browser restart — FR-002, FR-003).
- **`authApi.refreshSession()`** already calls `POST /api/auth/refresh` (`RefreshRequest` → `AuthResponse`) and writes the rotated tokens via `setTokens` (FR-004, FR-011).
- **`authBootstrap.ts`** already performs refresh-on-load; this feature must stay consistent with it and not double-handle the on-load path.
- **`AuthContext`** already owns the `resolving → unauthenticated | needs-organization | authenticated` phase machine and an explicit `logout()`; the API layer needs a way to drive it to `unauthenticated` when a session becomes unrecoverable.

The feature therefore **refactors `apiFetch` into a self-healing request layer**: on a `401`, it performs a **single-flight** refresh (deduplicated across concurrent requests), **replays the original request once** on success (for any HTTP method — FR-014), and on an **authentication-level** refresh failure it **clears credentials and drives a global sign-out** to the login screen (FR-007, FR-012). A **transient network failure** during refresh is surfaced as a connectivity error and **retains** credentials (FR-015). To stay router-less and avoid an import cycle with React, the client exposes a tiny **registration seam** (`configureApiClient({ onRefresh, onSessionExpired })`) that `AuthContext` wires on mount. Automatic sign-out makes a **best-effort server logout call** then clears locally (FR-016) and surfaces a **"session expired" notice** on the login screen (FR-017). All work ships with Vitest + RTL coverage at the repo's ≥80% gate plus a Playwright E2E spec for the intercepted expired-token flow (Constitution III). All payloads are consumed from `generated-api.ts`; no DTOs change (Constitution VI).

## Technical Context

**Language/Version**: TypeScript 5.7 + React 18.3 (frontend `apps/web`), built with Vite 6. **No backend (C# .NET 8) code changes.**

**Primary Dependencies**: React 18, `@tanstack/react-query` v5 (already the data-fetching standard), native `fetch` via the existing `apiFetch` helper (`src/api/client.ts`). Testing: Vitest 2 + `@testing-library/react` + `@testing-library/user-event` + jsdom (all present); Playwright in the existing `tests/e2e` workspace. **No new runtime dependencies; no router library** (routing remains an auth-phase view switch in `App.tsx`, consistent with 006/007).

**Storage**: Browser `localStorage` for `accessToken`/`refreshToken` via the existing `src/auth/tokenStorage.ts` (unchanged; already survives reload/restart). No server-side storage and no schema changes.

**Testing**: Vitest + React Testing Library unit/component tests under `apps/web/tests/**` for: the API-client recovery path (401 → refresh → retry-once success; non-401 passes through untouched; auth-failed refresh → session-ended signal; network-failed refresh → credentials retained; single-flight dedup; retry-once cap; refresh endpoint excluded from recovery), the `AuthContext` automatic-sign-out handler (best-effort logout, clear, phase → unauthenticated, session-expired flag), and the login-screen session-expired notice. Coverage enforced at ≥80% lines/functions/branches/statements via the existing `vite.config.ts` v8 thresholds (missing/unparseable reports treated as failing). A Playwright E2E spec in `tests/e2e/specs/auth/` exercises an intercepted expired-access-token → transparent refresh → continued session, plus an unrecoverable-session → login-with-notice flow (Constitution III multi-state auth interception).

**Target Platform**: Modern evergreen browsers, desktop and mobile, served by the Vite SPA build.

**Project Type**: Web application — frontend slice only (`apps/web`); backend consumed as-is.

**Performance Goals**: Recovery adds at most one refresh round-trip per expiry event; single-flight guarantees exactly one refresh for a concurrent burst (SC-004). Mid-session expiry resolves with no visible error and no manual re-login (SC-002); no full-page reload.

**Constraints**: Constitution III — automated tests accompany all new code; **≥80.0% line/branch coverage enforced independently for backend and frontend** in CI (missing/unparseable coverage reports treated as failing). Constitution VI — all auth payloads (`AuthResponse`, `RefreshRequest`, `LoginRequest`) imported from `generated-api.ts`; no hand-authored payload interfaces, no DTO change, no swagger regeneration. Constitution VIII — no access/refresh token or PII written to logs/console anywhere in the persistence, refresh, retry, or sign-out paths; the best-effort logout catch is scoped to auth (not a financial path) and never swallows silently into a generic state. Constitution II — recovery preserves org scoping: the rotated access token re-carries `org_id`; no unscoped query is introduced and an ended session yields no authenticated data access.

**Scale/Scope**: Refactor of one module (`apiFetch` in `client.ts`) + a small registration seam; minor extensions to `AuthContext` (session-expired state + handler wiring + logout reason) and `LoginPage` (notice); `authApi.refreshSession` gains a recursion-guard flag. ~5 changed source files + ~3 new/updated test files + 1 E2E spec.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Applicable? | Status | Notes |
|---|-----------|-------------|--------|-------|
| I | Core Mathematical Axioms | No | PASS (N/A) | The API client performs no monetary computation; no `double`/`float`/`number` money math is introduced. |
| II | Multi-Tenant Isolation | **Yes (indirect)** | PASS | Recovery re-issues an access token that re-carries the `org_id` claim before the request is replayed, so org scoping is preserved. No unscoped query is introduced. An unrecoverable session drives a global sign-out, leaving no authenticated data reachable. |
| III | Engineering Rigor & Quality Gates | **Yes — primary** | PASS | Every new/changed path (client recovery, single-flight, sign-out handler, notice) ships with Vitest + RTL tests; ≥80% coverage gate enforced by `vite.config.ts`. The intercepted expired-token auth flow is covered by a Playwright E2E spec in `tests/e2e/specs/auth/`. |
| IV | QBO Integration | No | PASS (N/A) | No QuickBooks calls of any kind. |
| V | Ledger State Machine & Immutability | No | PASS (N/A) | No `events`/`event_artists`/`financial_line_items` mutation; the client is transport-only and replays the caller's original request unchanged. |
| VI | Polyglot Contract Serialization | **Yes** | PASS | `AuthResponse`, `RefreshRequest`, and `LoginRequest` are imported from `generated-api.ts`. No payload interface is hand-authored; **no DTO change**, so no swagger regeneration. |
| VII | EF Core Axioms | No | PASS (N/A) | No Entity Framework / query code; frontend-only. |
| VIII | Exception Governance & Logging Privacy | **Yes** | PASS | No access/refresh token is written to logs or console in any path. The automatic-sign-out best-effort logout catch is narrowly scoped to the logout transport (an auth path, not a financial processing path) and resolves into an explicit ended-session state rather than being swallowed. Inline error messaging reuses the sanitized `mapAuthError`. |

**Gate result**: All gates PASS. No violations. Complexity Tracking not required.

## Project Structure

### Documentation (this feature)

```text
specs/008-jwt-refresh-401-handling/
├── plan.md              # This file
├── research.md          # Phase 0 output — decisions (recovery seam, single-flight, recursion guard, network-vs-auth, sign-out signal, notice)
├── data-model.md        # Phase 1 output — client-layer state + auth-phase/session-expiry view model mapped to generated types
├── quickstart.md        # Phase 1 output — manual + automated validation guide
├── contracts/           # Phase 1 output
│   ├── api-client-recovery.md   # Behavioral contract: apiFetch recovery, single-flight, registration seam, refresh recursion guard
│   └── ui-components.md          # Contracts: AuthContext session-expiry surface + login-screen notice
├── checklists/
│   └── requirements.md  # Spec quality checklist (from /speckit-specify)
└── tasks.md             # Phase 2 output (created by /speckit-tasks)
```

### Source Code (repository root)

```text
apps/web/
├── src/
│   ├── api/
│   │   └── client.ts                         # REFACTOR — read token via tokenStorage; on 401 single-flight refresh + retry-once; registration seam (configureApiClient); SessionExpiredError; recursion guard for /auth/refresh; non-401 pass-through
│   ├── auth/
│   │   ├── authApi.ts                         # EXTEND — refreshSession() passes a skip-recovery flag on the /auth/refresh call (no recursion); logout() unchanged
│   │   ├── AuthContext.tsx                    # EXTEND — sessionExpired state; on mount wire configureApiClient({ onRefresh: refreshSession, onSessionExpired }); handleAutomaticSignOut (best-effort logout → clear → phase=unauthenticated → sessionExpired=true); explicit logout()/login() reset sessionExpired
│   │   ├── tokenStorage.ts                    # EXISTING — unchanged (single source of truth for credentials)
│   │   ├── authBootstrap.ts                   # EXISTING — on-load path; verified consistent, not modified
│   │   └── useAuth.ts                         # EXISTING — context hook (unchanged; sessionExpired exposed via context value)
│   ├── pages/
│   │   └── LoginPage.tsx                      # EXTEND — render a session-expired notice (from useAuth().sessionExpired) above the login form
│   ├── components/auth/
│   │   └── AuthLayout.tsx                     # OPTIONAL — accept an optional notice/banner slot (or render notice inline in LoginPage)
│   └── index.css                             # EXTEND — session-expired notice styling
└── tests/
    ├── api/
    │   ├── client.test.ts                    # EXISTING — keep passing after tokenStorage refactor (bearer attach, error mapping, 204)
    │   └── client.refresh.test.ts            # NEW — 401→refresh→retry once; non-401 pass-through; auth-fail→SessionExpired+onSessionExpired; network-fail→retain creds; single-flight; retry-once cap; refresh endpoint excluded
    └── auth/
        ├── AuthContext.sessionExpiry.test.tsx # NEW — onSessionExpired handler: best-effort logout, clear, phase→unauthenticated, sessionExpired flag; explicit logout clears flag
        └── LoginPage.test.tsx                # EXISTING (extend) — notice shown when sessionExpired, hidden otherwise

tests/e2e/
└── specs/auth/
    └── session-refresh.spec.ts               # NEW — Playwright: intercepted expired access token → transparent refresh → session continues; unrecoverable → login screen with session-expired notice
```

**Structure Decision**: Follow the established `apps/web` conventions (002–007): transport/effect logic in `src/api/` and `src/auth/`, route-level screens in `src/pages/`, presentational pieces in `src/components/<domain>/`. Reuse 007's `tokenStorage`, `authApi.refreshSession`, and `AuthContext` phase machine rather than duplicating them. Keep the app **router-less**: "redirect to login" remains an auth-phase transition. The client stays React-free and avoids an import cycle by using a **registration seam** (`configureApiClient`) wired once by `AuthContext`, which also keeps the recovery logic trivially unit-testable with injected fakes. All API contracts are imported from `generated-api.ts`; no new DTOs, so no `swagger.json`/type regeneration step is needed. E2E specs live under the existing `tests/e2e/specs/<area>/` layout.

## Complexity Tracking

No constitution violations to justify. The inherent complexity is **concurrency coordination**: multiple in-flight requests can each receive a `401` at the same instant. This is handled by a module-level **single-flight refresh promise** so exactly one refresh occurs and all waiters replay once against the rotated token (FR-010, SC-004). The second notable point is the **React/transport boundary**: the client must drive a React state transition (sign-out) without importing React or `AuthContext` (which would create an import cycle and break unit isolation). This is solved with a small registration seam rather than a heavier event-bus or a direct dependency; the rejected alternative (importing `AuthContext` into `client.ts`) is documented in research.md.

## Post-Design Constitution Re-Check

*Re-evaluated after Phase 1 design artifacts (research.md, data-model.md, contracts/, quickstart.md).*

| # | Principle | Re-Check | Notes |
|---|-----------|----------|-------|
| I | Core Mathematical Axioms | PASS (N/A) | No monetary math in the transport layer. |
| II | Multi-Tenant Isolation | PASS | Rotated access token re-carries `org_id`; replayed request is org-scoped; ended session yields no authenticated access. |
| III | Engineering Rigor | PASS | Contracts enumerate Vitest + RTL suites for recovery, single-flight, sign-out handler, and notice, plus a Playwright auth E2E; ≥80% gate enforced in `vite.config.ts`. |
| IV | QBO Integration | PASS (N/A) | No Intuit interaction. |
| V | Ledger State Machine | PASS (N/A) | Client replays the caller's request unchanged; no ledger/settlement mutation. |
| VI | Polyglot Contracts | PASS | Artifacts consume only `generated-api.ts` types (`AuthResponse`, `RefreshRequest`, `LoginRequest`); no DTO change, no swagger regeneration. |
| VII | EF Core Axioms | PASS (N/A) | Frontend-only; no EF queries. |
| VIII | Exception Governance & Logging Privacy | PASS | No token/PII logged; best-effort logout catch is auth-scoped and resolves into an explicit ended-session state; sanitized inline errors via `mapAuthError`. |

**Re-check result**: All gates PASS post-design. Ready for `/speckit-tasks`.
