# Implementation Plan: Venue Creation UI with Empty-State CTA

**Branch**: `014-venue-creation-ui` | **Date**: 2026-06-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/014-venue-creation-ui/spec.md` (Linear SPLR-57)

## Summary

Close the post-onboarding dead end by wiring venue creation into the dashboard: empty-state CTA, persistent header **Add venue** action, and a dedicated `/venues/new` page with validated name entry. On success, upsert the venue into TanStack Query cache, auto-select it as the active venue, and return to the workspace. Permission-gated via `canManagePermissions` (silent redirect for unauthorized direct URL access). **Frontend-only** — `POST /api/venues` already exists with integration tests.

## Technical Context

**Language/Version**: C# / .NET 8 (backend unchanged); TypeScript 5.7 + React 18 (`apps/web`)

**Primary Dependencies**: TanStack Query; existing `apiFetch` client; `AuthLayout` + `FormField` (006); Vitest + React Testing Library

**Storage**: PostgreSQL via existing `venues` table — no schema changes

**Testing**: Vitest + RTL for all new/changed UI; existing xUnit `VenuesControllerTests` covers API; ≥80.0% line/branch coverage enforced on `apps/web` via `vite.config.ts` thresholds

**Target Platform**: Linux containerized API + Vite SPA (desktop-first dashboard)

**Project Type**: Web application (existing `apps/api` + `apps/web` layout)

**Performance Goals**: First-venue flow completable in &lt;1 minute (SC-003); create POST is single round-trip; venue list refetch async after cache upsert

**Constraints**: No new hand-written API types (Constitution VI); no backend mutations beyond existing venue create; permission aligns with `can_manage_permissions`; ≥80.0% frontend coverage; silent redirect for unauthorized create URL

**Scale/Scope**: ~8 new/modified frontend files; 0 backend files; 4 test files extended/added; 2 routes (`/`, `/venues/new`)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Relevance | Status |
|-----------|-----------|--------|
| I. Core Mathematical Axioms | No monetary fields in this feature. | N/A |
| II. Multi-Tenant Isolation | Create uses server org context; no new queries. | N/A |
| III. Engineering Rigor & Quality Gates | Vitest coverage for CTA, page, hooks, permission guard; existing API integration tests. | PASS (with tests) |
| IV. QBO Integration Boundaries | No QBO interaction. | N/A |
| V. Ledger State Machine | No ledger mutations. | N/A |
| VI. Polyglot Contract & Serialization | `CreateVenueRequest` / `VenueResponse` from `generated-api.ts` only. | PASS |
| VII. EF Core Axioms | No new EF code. | N/A |
| VIII. Exception Governance & Logging | Mutation maps API errors to inline/banner messages; no swallowed failures. | PASS |

**Post-design re-check**: PASS. No violations; Complexity Tracking not required.

## Project Structure

### Documentation (this feature)

```text
specs/014-venue-creation-ui/
├── plan.md              # This file
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/
│   └── venue-creation-ui.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
apps/web/src/
├── api/
│   └── venues.ts                           # MODIFIED: useCreateVenue()
├── auth/
│   └── validation.ts                       # MODIFIED: validateVenueName()
├── hooks/
│   └── useCanManageVenues.ts               # NEW
├── lib/
│   └── dashboardRoute.ts                   # NEW: path + History API
├── venue/
│   └── VenueContext.tsx                    # MODIFIED: activateVenueId()
├── pages/
│   ├── DashboardHome.tsx                   # MODIFIED: CTA + header action
│   └── CreateVenuePage.tsx                 # NEW
└── App.tsx                                 # MODIFIED: route branch

apps/web/tests/
├── api/
│   └── venues.test.tsx                     # NEW: useCreateVenue
├── hooks/
│   └── useCanManageVenues.test.ts          # NEW
├── pages/
│   ├── DashboardHome.test.tsx              # MODIFIED: CTA, header, permissions
│   └── CreateVenuePage.test.tsx            # NEW
└── lib/
    └── dashboardRoute.test.ts              # NEW (optional, if helpers non-trivial)
```

**Structure Decision**: Vertical slice through existing web app. No new packages. Backend untouched.

## Implementation Phases

### Phase A — Routing & permission hook

1. `dashboardRoute.ts` — path detection, `navigateToCreateVenue`, `navigateToDashboard`, `useDashboardRoute`.
2. `useCanManageVenues()` — thin wrapper on profile permissions.
3. `App.tsx` — branch authenticated render on path (`/` vs `/venues/new`).

### Phase B — API hook & venue context

1. `useCreateVenue()` in `venues.ts` — POST with `skipVenueContext: true`; cache upsert + invalidate on success.
2. `VenueContext.activateVenueId(id)` — set state + sessionStorage without membership check (used post-create).
3. `validateVenueName()` — required + 200 char max.

### Phase C — UI surfaces

1. `CreateVenuePage` — form, cancel, permission guard redirect, error states.
2. `DashboardHome` — empty-state CTA (`canManage` only); header **Add venue** link (`canManage`, always when permitted).
3. Styles: reuse `auth-form`, `dashboard-empty__*` patterns; minimal new CSS for header action if needed.

### Phase D — Tests

1. `CreateVenuePage.test.tsx` — validation, success navigation, permission redirect, pending disable.
2. `DashboardHome.test.tsx` — CTA visibility, header action, read-only empty state.
3. `useCanManageVenues.test.ts`, `venues.test.tsx` — hook behavior.
4. Run `npm run test:coverage` — must meet ≥80% thresholds.

## Complexity Tracking

> No constitution violations requiring justification.

## Artifacts Generated

| Artifact | Path |
|----------|------|
| Research | [research.md](./research.md) |
| Data model | [data-model.md](./data-model.md) |
| UI contract | [contracts/venue-creation-ui.md](./contracts/venue-creation-ui.md) |
| Quickstart | [quickstart.md](./quickstart.md) |

**Next**: `/speckit-tasks` to generate `tasks.md`.
