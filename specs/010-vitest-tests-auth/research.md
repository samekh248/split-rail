# Phase 0 Research: Vitest Coverage for Auth Layouts & Venue Selector

**Feature**: 010-vitest-tests-auth
**Date**: 2026-06-16

All clarifications from `/speckit-clarify` are resolved; no open NEEDS CLARIFICATION remain. This document records the testing-approach decisions that drive Phase 1 design.

## Decision 1 — Testing stack and environment

- **Decision**: Use the existing Vitest + React Testing Library + `@testing-library/user-event` setup with the `jsdom` environment and `apps/web/setupTests.ts` (jest-dom matchers + `localStorage`/`sessionStorage` mocks). Coverage via the v8 provider already configured in `apps/web/vite.config.ts`.
- **Rationale**: Constitution III mandates Vitest + RTL for frontend components. The harness, coverage provider, and 80% thresholds already exist; reusing them keeps CI consistent and avoids configuration drift.
- **Alternatives considered**: Jest (rejected — not the project standard, duplicate config); Cypress component testing (rejected — heavier, overlaps with the Playwright E2E layer that already covers multi-user flows).

## Decision 2 — Extend/consolidate existing suites vs. net-new

- **Decision**: Extend and consolidate the existing `apps/web/tests/auth/**` and `apps/web/tests/venue/**` files (added by features 006/008/009) to fill gaps; remove duplication rather than authoring parallel suites. (Clarification 2026-06-16.)
- **Rationale**: Substantial coverage already exists (e.g., `LoginForm.test.tsx`, `VenueSwitcher.test.tsx`). Net-new parallel suites would duplicate assertions, inflate runtime, and create maintenance hazards. Filling gaps yields the cleanest path to the coverage gate.
- **Alternatives considered**: Greenfield suites ignoring existing tests (rejected — duplication, drift); deleting and rewriting (rejected — discards proven, passing coverage).

## Decision 3 — Test layer: component + page/container

- **Decision**: Cover both the component level (`LoginForm`, `RegisterForm`, `FormField`, `VenueSwitcher`) and the page/container level (`LoginPage`, `RegisterPage`, `DashboardHome` shell). (Clarification 2026-06-16.)
- **Rationale**: Component tests verify field rendering, validation, and interaction in isolation; page/container tests verify wiring (auth context → form, dashboard shell → venue switcher, empty/error/loading states) that component tests cannot reach. Both are needed for meaningful coverage and regression protection.
- **Alternatives considered**: Component-only (rejected — misses container wiring and dashboard states); page-only (rejected — coarse, harder to pinpoint regressions, weaker branch coverage).

## Decision 4 — Backend interaction stubbing

- **Decision**: Stub the network boundary with `vi.stubGlobal('fetch', ...)` (matching the existing `VenueSwitcher` tests) and/or inject props/callbacks (e.g., `onSubmit`) for pure components. Wrap context-dependent units in `QueryClientProvider` + the relevant provider (`VenueProvider`, `AuthProvider`) test wrappers. Reset `sessionStorage`/`localStorage` and unstub globals in `beforeEach`.
- **Rationale**: Keeps tests deterministic and offline, exercises real component/page logic (genuine coverage), and mirrors the venue scope contract (server returns the scoped list; client renders verbatim).
- **Alternatives considered**: MSW (Mock Service Worker) (viable but heavier; not currently used in the suite — defer to avoid introducing a new dependency); hitting a live backend (rejected — non-deterministic, violates unit-test isolation).

## Decision 5 — Permission-gating coverage targets

- **Decision**: Story 3 covers only the role/permission-conditional controls that already exist: the QBO sync trigger gated by `role.permissions.canTriggerQboSync` (`useCanTriggerQboSync` → `SyncNowButton`) and settlement signing gated by `role.permissions.canSignSettlement` (`useCanSignSettlement` → `FinalizeSettlementPanel`). Tests assert the control is absent/disabled for a role lacking the permission and present/enabled for a role that has it. No new gating is introduced. (Clarification 2026-06-16.)
- **Rationale**: The spec explicitly limits scope to existing gating. These two permissions are the concrete role-conditional UI hooks in `apps/web/src/api/user.ts`. The QBO trigger test must keep sync read-only (Constitution IV).
- **Alternatives considered**: Inventing new gated elements (rejected — out of scope, would change product behavior); deferring gating entirely (rejected — explicitly in the issue's acceptance criteria).

## Decision 6 — Coverage attribution and the 80% gate

- **Decision**: Run `vitest run --coverage` and treat the configured 80% line/branch/function/statement thresholds as the gate. New/extended tests must execute the real auth/venue source modules (no trivial stub-only tests). Coverage is measured over `src/**/*.{ts,tsx}` excluding `src/types/**`, `src/main.tsx`, and `src/vite-env.d.ts` (existing config).
- **Rationale**: Constitution III requires ≥80% and treats missing/unparseable reports as failing. Attributing coverage to the real modules ensures the gate reflects genuine verification.
- **Alternatives considered**: Per-file thresholds for only the touched files (rejected — the project enforces a global frontend threshold; per-file gating is not the current CI contract). Lowering thresholds (rejected — violates constitution).

## Decision 7 — Contract type usage

- **Decision**: Import `LoginRequest`, `UserProfileResponse`, `RoleDetailDto`, `VenueResponse`, `VenueScopeDto`, etc. from `@/types/generated-api` in fixtures/tests; never hand-declare payload shapes.
- **Rationale**: Constitution VI prohibits hand-mirrored contracts in `apps/web`. Using generated types keeps fixtures aligned with the backend contract and catches drift at compile time.
- **Alternatives considered**: Local ad-hoc fixture interfaces (rejected — violates Constitution VI).

## Open Risks

- **Existing coverage may already exceed 80%**: If so, this feature's value is gap-closing, de-duplication, and the explicitly-required permission-gating + page-level scenarios rather than net-new percentage. Tasks should verify the current baseline first.
- **Flake sources**: async `waitFor` on fetch-stubbed renders and `user-event` timing. Mitigate with deterministic stubs and awaiting state via `findBy*`/`waitFor`.
