# Implementation Plan: Vitest Coverage for Workspace Navigation & Tenant Management UX

**Branch**: `017-vitest-workspace-navigation` | **Date**: 2026-06-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/017-vitest-workspace-navigation/spec.md`

## Summary

Deliver (and consolidate) Vitest + React Testing Library coverage for workspace navigation and tenant-management surfaces delivered by features 014–016: venue creation and empty states (`DashboardHome`, `CreateVenuePage`), event list/selection and inline create (`DashboardHome`, `EventCombobox`, `EventFormPanel`), settings hub navigation and permission gating (`SettingsLandingPage`, `PlaceholderSettingsPage`, `SettingsNav`, `App` routing), and full team-management components plus page integration (`TeamSettingsPage`, `InviteMemberForm`, `InvitationList`, `MemberList`, `MemberEditModal`, `RemoveMemberConfirm`). The work extends existing `apps/web/tests/` suites from sibling features rather than authoring parallel directories, covers both component and page/container levels, and ensures the frontend portion of the CI-enforced ≥80% line/branch coverage gate is met. Event combobox edit/delete and org/venue rename-form tests are explicitly out of scope (owned by features 015 and a future rename UI feature, respectively). No product/source behavior changes are introduced unless a non-behavioral test seam (e.g., `data-testid`) is required and justified.

## Technical Context

**Language/Version**: TypeScript 5.x, React 18 (frontend only)

**Primary Dependencies**: Vitest (v8 coverage), @testing-library/react, @testing-library/user-event, @testing-library/jest-dom, @tanstack/react-query (test wrappers), jsdom

**Storage**: N/A — tests stub `fetch` and use jsdom `sessionStorage`/`localStorage` mocks from `apps/web/setupTests.ts`; venue/event selection uses `activeVenueStorage` and `activeEventStorage`

**Testing**: Vitest + React Testing Library (jsdom env, globals on) per Constitution III; v8 coverage with reporters `text` + `lcov`; thresholds set to 80% for lines/functions/branches/statements in `apps/web/vite.config.ts`. Frontend ≥80.0% line/branch coverage gate enforced in CI (missing/unparseable coverage reports treated as failing).

**Target Platform**: Browser UI exercised under jsdom

**Project Type**: Web application (monorepo) — this feature touches only the `apps/web` frontend test layer

**Performance Goals**: Full workspace/tenant suite executes in under ~3 minutes locally; tests must be deterministic (no flake) across consecutive CI runs

**Constraints**:
- ≥80.0% line/branch coverage on the frontend independently (CI-enforced; missing/unparseable coverage reports treated as failing)
- All data contracts used by tests MUST be imported from `apps/web/src/types/generated-api.ts` (Constitution VI) — no hand-written payload interfaces in tests
- No new product source code except justified non-behavioral test seams; tests must execute real source under test (no trivial stub-only assertions) so coverage is genuinely attributed
- Venue/event scope is enforced server-side; tests supply scope-correct stubbed lists and assert verbatim client rendering (no client-side scope filtering)
- Extend/consolidate existing test files from features 014–016; no parallel `workspace-navigation/` test directory
- Event combobox edit/delete out of scope (feature 015); org/venue rename-form tests deferred until dedicated rename UI ships
- Unauthorized team settings URL access: silent redirect to `/settings` (no error message)

**Scale/Scope**: Workspace surfaces — `DashboardHome`, `CreateVenuePage`, `EventCombobox`, `EventFormPanel`, `SettingsLandingPage`, `PlaceholderSettingsPage`, `SettingsNav`, `TeamSettingsPage`, team components (`InviteMemberForm`, `InvitationList`, `MemberList`, `MemberEditModal`, `RemoveMemberConfirm`), routing (`App`, `appRoute`), permission hooks (`useCanManageVenues`, `useCanManageEvents`, `useCanManageTeam`), and venue/event context storage helpers as needed for edge cases.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Relevance | Status |
|-----------|-----------|--------|
| I. Core Mathematical Axioms (no float for money) | Ledger fixtures in dashboard tests use generated types; no numeric money math in tests | PASS (design rule) |
| II. Multi-Tenant/Venue Isolation | Tests assert client renders server-provided venue/event lists verbatim; no DB access in frontend tests | PASS |
| III. Engineering Rigor & Quality Gates | This feature *is* the Vitest + RTL coverage; raises/maintains frontend ≥80% gate | PASS (primary driver) |
| IV. QBO Read-Only | N/A — workspace navigation scope does not touch QBO mutations | PASS (N/A) |
| V. Ledger Immutability | Dashboard tests mock `EventLedgerPage`; no settled-event mutation paths exercised | PASS (N/A) |
| VI. Polyglot Contract Serialization | Tests import `VenueResponse`, `EventListItem`, `UserListResponse`, `InvitationResponse`, `RoleDetailDto`, etc. from `generated-api.ts` | PASS (design rule) |
| VII. EF Core Axioms | N/A — backend persistence not touched | PASS (N/A) |
| VIII. Exception Governance & Logging Privacy | Tests assert generic, non-PII error messaging on form-level failures | PASS |

No violations. No entries required in Complexity Tracking.

**Post-design re-check (Phase 1)**: Design artifacts (`data-model.md`, `contracts/test-coverage.md`) reinforce Constitution II scope fidelity, Constitution VI generated types, and Constitution III coverage attribution. Gates remain PASS.

## Project Structure

### Documentation (this feature)

```text
specs/017-vitest-workspace-navigation/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── test-coverage.md # FR → test-case mapping (UI/test contract)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created here)
```

### Source Code (repository root)

```text
apps/web/
├── src/
│   ├── pages/
│   │   ├── DashboardHome.tsx          # Venue empty state, event combobox, inline create, ledger host
│   │   ├── CreateVenuePage.tsx        # Dedicated venue creation form
│   │   ├── SettingsLandingPage.tsx    # Settings hub cards + Team gating
│   │   ├── PlaceholderSettingsPage.tsx
│   │   └── TeamSettingsPage.tsx       # Team page integration + silent redirect
│   ├── components/
│   │   ├── event/                     # EventCombobox, EventFormPanel (create only; edit/delete = 015)
│   │   ├── settings/                  # SettingsLayout, SettingsNav
│   │   └── team/                      # InviteMemberForm, InvitationList, MemberList,
│   │                                  #   MemberEditModal, RemoveMemberConfirm
│   ├── hooks/
│   │   ├── useCanManageVenues.ts      # canManagePermissions → venue creation gating
│   │   ├── useCanManageEvents.ts      # canViewFinancials → event create gating
│   │   └── useCanManageTeam.ts        # canManagePermissions → team settings gating
│   ├── venue/                         # VenueContext, activeVenueStorage, activeEventStorage
│   ├── lib/                           # appRoute, dashboardRoute
│   └── types/generated-api.ts         # Contract source of truth
├── tests/
│   ├── pages/
│   │   ├── DashboardHome.test.tsx     # Extend: venue/event workspace scenarios
│   │   ├── CreateVenuePage.test.tsx   # Extend: max-length validation gap
│   │   ├── SettingsLandingPage.test.tsx
│   │   ├── PlaceholderSettingsPage.test.tsx
│   │   └── TeamSettingsPage.test.tsx
│   ├── components/
│   │   ├── event/                     # EventCombobox, EventFormPanel (no edit/delete rows)
│   │   ├── settings/                  # SettingsNav (add if missing)
│   │   └── team/                      # Full component suite (extend/consolidate)
│   ├── hooks/                         # useCanManageVenues/Events/Team
│   ├── lib/                           # appRoute navigation helpers
│   └── App.test.tsx                   # Settings route smoke tests
├── setupTests.ts
└── vite.config.ts
```

**Structure Decision**: Frontend-only change within `apps/web`. Tests live under `apps/web/tests/**` (Vitest `include: ['tests/**/*.test.{ts,tsx}']`). Existing suites from features 014–016 are extended and de-duplicated. Shared fixtures (`tests/fixtures/`) should be consolidated where profiles/venues/events are repeated across page suites. No backend changes planned.

## Complexity Tracking

> No constitution violations. Section intentionally empty.
