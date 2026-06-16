# Implementation Plan: Vitest Coverage for Auth Layouts & Venue Selector

**Branch**: `010-vitest-tests-auth` | **Date**: 2026-06-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/010-vitest-tests-auth/spec.md`

## Summary

Deliver (and consolidate) Vitest + React Testing Library coverage for the authentication layouts (login/registration forms and pages, auth layout shell, validation) and the venue selector (switcher component plus the dashboard shell that hosts it), including the already-existing role/permission-conditional controls (QBO sync trigger, settlement signing). The work extends existing `apps/web/tests/` suites rather than authoring parallel ones, covers both component and page/container levels, and ensures the frontend portion of the CI-enforced ≥80% line/branch coverage gate is met. No product/source code behavior changes are introduced; this feature adds and tightens automated verification only.

## Technical Context

**Language/Version**: TypeScript 5.x, React 18 (frontend only)

**Primary Dependencies**: Vitest (v8 coverage), @testing-library/react, @testing-library/user-event, @testing-library/jest-dom, @tanstack/react-query (test wrappers), jsdom

**Storage**: N/A — tests stub `fetch` and use the jsdom `sessionStorage`/`localStorage` mocks from `apps/web/setupTests.ts`

**Testing**: Vitest + React Testing Library (jsdom env, globals on) per Constitution III; v8 coverage with reporters `text` + `lcov`; thresholds already set to 80% for lines/functions/branches/statements in `apps/web/vite.config.ts`. Frontend ≥80.0% line/branch coverage gate enforced in CI (missing/unparseable coverage reports treated as failing).

**Target Platform**: Browser UI exercised under jsdom

**Project Type**: Web application (monorepo) — this feature touches only the `apps/web` frontend test layer

**Performance Goals**: Full auth + venue suite executes in under ~2 minutes locally; tests must be deterministic (no flake) across consecutive CI runs

**Constraints**:
- ≥80.0% line/branch coverage on the frontend independently (CI-enforced; missing/unparseable coverage reports treated as failing)
- All data contracts used by tests MUST be imported from `apps/web/src/types/generated-api.ts` (Constitution VI) — no hand-written payload interfaces in tests
- No new product source code; tests must execute real source under test (no trivial stub-only assertions) so coverage is genuinely attributed
- Venue scope is enforced server-side; tests supply scope-correct accessible-venues lists and assert verbatim client rendering (no client-side scope filtering)

**Scale/Scope**: Auth surfaces (`LoginForm`, `RegisterForm`, `FormField`, `AuthLayout`, `LoginPage`, `RegisterPage`, `validation`, `AuthContext`/`AuthGate` as needed) + venue surfaces (`VenueSwitcher`, `VenueContext`, `activeVenueStorage`, `DashboardHome` shell) + permission-gated controls (`SyncNowButton` via `canTriggerQboSync`, `FinalizeSettlementPanel`/settlement signing via `canSignSettlement`).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Relevance | Status |
|-----------|-----------|--------|
| I. Core Mathematical Axioms (no float for money) | Test fixtures that include monetary values MUST use string/decimal-safe representations from generated types; no numeric money math in tests | PASS (design rule) |
| II. Multi-Tenant/Venue Isolation | Tests assert the client renders the server-provided (scope-enforced) venue list verbatim and never client-filters; no DB access in frontend tests | PASS |
| III. Engineering Rigor & Quality Gates | This feature *is* the Vitest + RTL coverage; raises/maintains frontend ≥80% gate | PASS (primary driver) |
| IV. QBO Read-Only | Permission-gating tests for the sync trigger MUST treat sync as a read-only pull; no test simulates QBO POST/PUT/DELETE | PASS |
| V. Ledger Immutability | N/A — no ledger state mutations in auth/venue scope | PASS (N/A) |
| VI. Polyglot Contract Serialization | Tests import `UserProfileResponse`, `VenueResponse`, `RoleDetailDto`, `LoginRequest`, etc. from `generated-api.ts` | PASS (design rule) |
| VII. EF Core Axioms | N/A — backend persistence not touched | PASS (N/A) |
| VIII. Exception Governance & Logging Privacy | Tests assert no PII/token leakage in surfaced error messaging; form-level errors are generic | PASS |

No violations. No entries required in Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/010-vitest-tests-auth/
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
│   ├── components/
│   │   ├── auth/                 # LoginForm, RegisterForm, FormField, AuthLayout (under test)
│   │   ├── venue/                # VenueSwitcher (under test)
│   │   ├── qbo/                  # SyncNowButton (permission-gated, under test)
│   │   └── settlement/          # FinalizeSettlementPanel (permission-gated, under test)
│   ├── pages/                    # LoginPage, RegisterPage, DashboardHome (under test)
│   ├── auth/                     # AuthContext, AuthGate, validation, authApi, authBootstrap (under test)
│   ├── venue/                    # VenueContext, useActiveVenue, activeVenueStorage (under test)
│   └── types/generated-api.ts    # Contract source of truth (imported by tests; never hand-mirrored)
├── tests/
│   ├── auth/                     # Extend/consolidate: LoginForm, RegisterForm, FormField,
│   │                             #   AuthLayout, LoginPage, RegisterPage, validation, AuthContext, AuthGate
│   ├── venue/                    # Extend/consolidate: VenueSwitcher, VenueContext, activeVenueStorage
│   ├── pages/                    # DashboardHome (venue switcher host + empty/error/loading states)
│   ├── qbo/                      # SyncNowButton permission gating
│   └── settlement/              # FinalizeSettlementPanel permission gating
├── setupTests.ts                 # jest-dom + storage mocks (existing)
└── vite.config.ts                # Vitest + coverage thresholds (existing)
```

**Structure Decision**: Frontend-only change within `apps/web`. Tests live under `apps/web/tests/**` (Vitest `include: ['tests/**/*.test.{ts,tsx}']`). Existing auth/venue suites (added by features 006/008/009) are extended and de-duplicated rather than replaced. No backend or `apps/web/src` behavior changes are planned; if a tested behavior is found unverifiable without a trivial, non-behavioral test seam (e.g., a `data-testid`), that is the only category of source touch allowed and must be justified.

## Complexity Tracking

> No constitution violations. Section intentionally empty.
