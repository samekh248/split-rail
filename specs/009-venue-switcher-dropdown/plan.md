# Implementation Plan: Dashboard Tenant/Venue Switching Dropdown (Respect Venue Scope)

**Branch**: `009-venue-switcher-dropdown` | **Date**: 2026-06-16 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/009-venue-switcher-dropdown/spec.md`

## Summary

Close the **venue-switching gap** in the frontend dashboard. Today the active venue is a hardcoded placeholder GUID read from URL search params in `DashboardHome` (`parseRouteParams()` defaults to `00000000-0000-0000-0000-000000000001`), and although the backend fully supports per-request venue switching via the `X-Active-Venue-Id` header (`VenueContextMiddleware` validates access and sets `ITenantContext.ActiveVenueId`), **the frontend never sends it** and **no UI consumes `useUserProfile().venueScopes`**.

The decisive grounding findings make this a **frontend-only slice — no backend change and no new runtime dependency**:

- **`GET /api/venues` already returns a server-scoped list** (`VenueService.ListAccessibleVenuesAsync` → `GetAccessibleVenueQuery`): full-access users (no `UserVenueScopes` rows) get all org venues; scoped users get only assigned venues. This satisfies FR-003/FR-004 server-side, so the client renders the returned list as-is and performs **no client-side scope filtering** (Constitution II).
- **`VenueContextMiddleware` already enforces FR-008**: a non-accessible `X-Active-Venue-Id` throws `AuthorizationException` (HTTP 403); a valid one sets the active venue context. The frontend's job is to *send* the header and *respect* the resulting authorization decision.
- **Critical interaction**: `ListAccessibleVenuesAsync` **collapses the list to only the active venue when the header is present** (verified by `VenueContextSwitchingTests.ActiveVenueHeader_FiltersListedVenues`). Therefore the venue-list request that populates the dropdown **must deliberately omit** `X-Active-Venue-Id`, while all other venue-scoped requests include it.
- **`apiFetch` (`src/api/client.ts`) is the single choke point** for outbound requests, so the header is injected there from a session-scoped active-venue holder, with an opt-out flag for the venues-list call.

The feature therefore adds: (1) a **session-scoped active-venue store** (`activeVenueStorage.ts`, `sessionStorage`-backed per the clarification — per-tab, cleared on tab close); (2) a small **`apiFetch` extension** that attaches `X-Active-Venue-Id` by default and supports `skipVenueContext` for the list call; (3) a **`VenueProvider` context** that loads the scoped venue list, resolves/validates the active venue (default = first accessible; fall back if a remembered selection is no longer accessible — FR-010/FR-011), and persists the selection; (4) a **keyboard-accessible `VenueSwitcher` dropdown** in the dashboard header (FR-001, FR-013); and (5) **`DashboardHome` rewiring** to drive the downstream ledger view from the active venue, resetting the open event to the new venue's default on switch (preserve view type, load default content — clarification, FR-006). All work ships with Vitest + RTL coverage at the repo's ≥80% gate plus a Playwright E2E venue-switching/scope spec (Constitution III). All payloads (`VenueResponse`, `VenueScopeDto`, `UserProfileResponse`) are consumed from `generated-api.ts`; no DTOs change (Constitution VI).

## Technical Context

**Language/Version**: TypeScript 5.7 + React 18.3 (frontend `apps/web`), built with Vite 6. **No backend (C# .NET 8) code changes.**

**Primary Dependencies**: React 18, `@tanstack/react-query` v5 (the established data-fetching standard), native `fetch` via the existing `apiFetch` helper (`src/api/client.ts`). Testing: Vitest 2 + `@testing-library/react` + `@testing-library/user-event` + jsdom (all present); Playwright in the existing `tests/e2e` workspace. **No new runtime dependencies; no router library** (navigation remains an auth-phase/view switch consistent with 006–008).

**Storage**: Browser `sessionStorage` for the active venue id via a new `src/venue/activeVenueStorage.ts` (per-tab; cleared on tab/session close — no cross-tab or cross-device persistence, per clarification). Credentials remain in `localStorage` via the existing `tokenStorage.ts` (unchanged). No server-side storage and no schema changes.

**Testing**: Vitest + React Testing Library unit/component tests under `apps/web/tests/**` for: the active-venue store (get/set/clear, absent/invalid values), the `apiFetch` venue-header injection (header attached from store; omitted when `skipVenueContext`; omitted when no active venue), the `VenueProvider` (default selection, remembered-selection restore, fall-back when remembered venue no longer accessible, switch updates context + persists), the `VenueSwitcher` component (renders scoped list, active indicated, keyboard operable, single-venue and empty states, aria labelling), and `DashboardHome` rewiring (ledger reflects active venue; event resets to default on switch; empty/error states preserved). Coverage enforced at ≥80% lines/functions/branches/statements via the existing `apps/web/vite.config.ts` v8 thresholds (missing/unparseable reports treated as failing). A Playwright E2E spec in `tests/e2e/specs/venue/` exercises: scoped user sees only assigned venues, full-access user sees all, selecting a venue updates the ledger and sends the header, and an out-of-scope venue is denied (Constitution III multi-user tenant-isolation interception).

**Target Platform**: Modern evergreen browsers, desktop and mobile, served by the Vite SPA build.

**Project Type**: Web application — frontend slice only (`apps/web`); backend consumed as-is.

**Performance Goals**: Switching the active venue reflects in downstream views within 2 seconds under normal conditions (SC-001); selection is applied optimistically to context state and the ledger refetches via React Query. No full-page reload.

**Constraints**: Constitution III — automated tests accompany all new code; **≥80.0% line/branch coverage enforced independently for backend and frontend** in CI (missing/unparseable coverage reports treated as failing). Constitution II — venue scope is enforced **server-side**; the client renders the server-scoped list verbatim and never constructs an unscoped or client-filtered venue list; out-of-scope activation is rejected by the server and the prior active venue is retained. Constitution VI — `VenueResponse`, `VenueScopeDto`, `UserProfileResponse` imported from `generated-api.ts`; no hand-authored payload interfaces, no DTO change, no swagger regeneration. Constitution VIII — no PII (user email, tokens) written to logs/console in the venue-switch paths.

**Scale/Scope**: One new store module + one new context/provider + one new presentational dropdown + a small `apiFetch` extension + `DashboardHome`/`useVenues` rewiring. ~3 new source files, ~3 modified source files, ~5 new/updated test files, 1 E2E spec. Venue counts per org are small (tens); the dropdown renders the full scoped list without pagination.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Applicable? | Status | Notes |
|---|-----------|-------------|--------|-------|
| I | Core Mathematical Axioms | No | PASS (N/A) | Venue switching performs no monetary computation; no `double`/`float`/`number` money math is introduced. |
| II | Multi-Tenant Multi-Venue Isolation | **Yes — primary** | PASS | The venue list is scoped **server-side** (`GetAccessibleVenueQuery`); the client renders it verbatim and performs no client-side filtering that could leak venue identities. Activation of an out-of-scope venue is rejected by `VenueContextMiddleware` (403) and the prior active venue is retained. The `X-Active-Venue-Id` header narrows the authenticated org/venue scope on every downstream request. |
| III | Engineering Rigor & Quality Gates | **Yes — primary** | PASS | Every new/changed unit (store, header injection, provider, switcher, dashboard rewiring) ships with Vitest + RTL tests; ≥80% coverage gate enforced by `apps/web/vite.config.ts`. Multi-user venue-scope switching is covered by a Playwright E2E spec in `tests/e2e/specs/venue/` with real login interception. |
| IV | QuickBooks Online Integration | No | PASS (N/A) | No Intuit/QBO calls of any kind. |
| V | Ledger State Machine & Immutability | No | PASS (N/A) | No mutation of `events`/`event_artists`/`financial_line_items`; switching venues only changes which venue's data is *read* and re-scopes subsequent requests. |
| VI | Polyglot Contract & Serialization | **Yes** | PASS | `VenueResponse`, `VenueScopeDto`, `UserProfileResponse` are imported from `generated-api.ts`. No payload interface is hand-authored; **no DTO change**, so no swagger regeneration. |
| VII | Database Persistence & EF Core Axioms | No | PASS (N/A) | No Entity Framework / query code added; the existing scoped query (`AsNoTracking`) is reused unchanged. |
| VIII | Exception Governance & Logging Privacy | **Yes** | PASS | No tokens or user PII written to logs/console in the venue-switch paths. The denied-venue path surfaces the server's sanitized authorization error; venue-list load failure reuses the existing error-with-retry surface. |

**Gate result**: All gates PASS. No violations. Complexity Tracking not required.

## Project Structure

### Documentation (this feature)

```text
specs/009-venue-switcher-dropdown/
├── plan.md              # This file
├── research.md          # Phase 0 output — decisions (header-omit on list, sessionStorage holder, context vs URL, default/fallback selection, event reset, header injection seam)
├── data-model.md        # Phase 1 output — active-venue + scoped-venue view models mapped to generated types
├── quickstart.md        # Phase 1 output — manual + automated validation guide
├── contracts/           # Phase 1 output
│   ├── venue-context-client.md   # Behavioral contract: apiFetch X-Active-Venue-Id injection + skipVenueContext, activeVenueStorage, VenueProvider selection/fallback rules
│   └── ui-components.md           # Contracts: VenueSwitcher dropdown + DashboardHome rewiring
├── checklists/
│   └── requirements.md  # Spec quality checklist (from /speckit-specify)
└── tasks.md             # Phase 2 output (created by /speckit-tasks)
```

### Source Code (repository root)

```text
apps/web/
├── src/
│   ├── api/
│   │   ├── client.ts                         # EXTEND — inject X-Active-Venue-Id from activeVenueStorage by default; add ApiFetchInit.skipVenueContext to omit it (used by the venues-list call); no change to auth/401 recovery
│   │   └── venues.ts                          # EXTEND — useVenues() passes skipVenueContext:true so the list is not collapsed to the active venue; add a queryKey stable across switches
│   ├── venue/                                 # NEW directory (venue workspace concern)
│   │   ├── activeVenueStorage.ts             # NEW — sessionStorage get/set/clear for the active venue id (per-tab; cleared on tab close)
│   │   ├── VenueContext.tsx                  # NEW — VenueProvider: load scoped venues, resolve default/remembered/fallback active venue, expose activeVenueId + setActiveVenue + venues + loading/error
│   │   └── useActiveVenue.ts                 # NEW — context hook (throws if used outside VenueProvider)
│   ├── components/venue/
│   │   └── VenueSwitcher.tsx                 # NEW — accessible dropdown in the dashboard header; lists scoped venues, marks active, keyboard operable, single-venue + empty states
│   ├── pages/
│   │   └── DashboardHome.tsx                 # REWIRE — render VenueSwitcher in header; drive ledger venueId from useActiveVenue(); reset open event to the new venue's default on switch; keep existing loading/empty/error states
│   ├── App.tsx                                # EXTEND — wrap authenticated dashboard in <VenueProvider> (only when phase === 'authenticated')
│   ├── main.tsx                              # VERIFY — provider nesting (QueryClient → Auth → Venue); VenueProvider added in App, not main, since it depends on auth
│   └── index.css                             # EXTEND — venue switcher styling
└── tests/
    ├── api/
    │   ├── venues.test.tsx                    # EXISTING (extend) — list request omits X-Active-Venue-Id (skipVenueContext)
    │   └── client.venueHeader.test.ts        # NEW — header attached from store; omitted when skipVenueContext; omitted when no active venue; coexists with 401 recovery
    ├── venue/
    │   ├── activeVenueStorage.test.ts        # NEW — get/set/clear; absent + malformed values
    │   ├── VenueContext.test.tsx             # NEW — default selection; remembered restore; fallback when remembered no longer accessible; switch updates + persists
    │   └── VenueSwitcher.test.tsx            # NEW — scoped list rendered, active indicated, keyboard select, single-venue + empty states, aria labelling
    └── pages/
        └── DashboardHome.test.tsx            # EXISTING (extend) — ledger reflects active venue; switching resets event to default; empty/error preserved

tests/e2e/
└── specs/venue/
    └── venue-switching.spec.ts               # NEW — Playwright: scoped user sees only assigned venues; full-access sees all; selecting a venue updates ledger + sends header; out-of-scope venue denied
```

**Structure Decision**: Follow the established `apps/web` conventions (002–008): transport logic in `src/api/`, cross-cutting workspace state in a dedicated `src/venue/` context (mirroring `src/auth/`), presentational pieces in `src/components/<domain>/`, route-level composition in `src/pages/`. Keep the app **router-less**: the active venue lives in React context + `sessionStorage`, not the URL (replacing the current `?venueId=` placeholder), so the `X-Active-Venue-Id` header can be driven globally from one place. The `VenueProvider` is mounted **inside** the authenticated branch (it depends on a resolved profile/session), consistent with how `AuthContext` gates the tree. All API contracts come from `generated-api.ts`; no new DTOs, so no `swagger.json`/type regeneration step is needed. E2E specs live under the existing `tests/e2e/specs/<area>/` layout alongside the existing `isolation/venue-scope.spec.ts`.

## Complexity Tracking

No constitution violations to justify. The two notable design points are: (1) the **header-omit subtlety** — because `GET /api/venues` collapses to the active venue when `X-Active-Venue-Id` is sent, the list call must opt out via `skipVenueContext`; this is handled with a single explicit flag rather than a second client or a backend change (rejected alternatives documented in research.md). (2) the **active-venue/transport boundary** — `apiFetch` must read the active venue without importing React; it reads from the `sessionStorage`-backed `activeVenueStorage` module (same pattern as `tokenStorage`), keeping the client React-free and unit-testable with no import cycle.

## Post-Design Constitution Re-Check

*Re-evaluated after Phase 1 design artifacts (research.md, data-model.md, contracts/, quickstart.md).*

| # | Principle | Re-Check | Notes |
|---|-----------|----------|-------|
| I | Core Mathematical Axioms | PASS (N/A) | No monetary math in the venue-switch layer. |
| II | Multi-Tenant Isolation | PASS | List scoped server-side and rendered verbatim; out-of-scope activation rejected (403) with prior venue retained; header re-scopes every downstream request. |
| III | Engineering Rigor | PASS | Contracts enumerate Vitest + RTL suites for store, header injection, provider, switcher, and dashboard rewiring, plus a Playwright venue-scope E2E; ≥80% gate enforced in `apps/web/vite.config.ts`. |
| IV | QBO Integration | PASS (N/A) | No Intuit interaction. |
| V | Ledger State Machine | PASS (N/A) | No ledger/settlement mutation; venue switch only changes read scope. |
| VI | Polyglot Contracts | PASS | Artifacts consume only `generated-api.ts` types (`VenueResponse`, `VenueScopeDto`, `UserProfileResponse`); no DTO change, no swagger regeneration. |
| VII | EF Core Axioms | PASS (N/A) | Frontend-only; reuses existing scoped `AsNoTracking` query unchanged. |
| VIII | Exception Governance & Logging Privacy | PASS | No tokens/PII logged; denied-venue surfaces sanitized server error; list-load failure reuses existing retry surface. |

**Re-check result**: All gates PASS post-design. Ready for `/speckit-tasks`.
