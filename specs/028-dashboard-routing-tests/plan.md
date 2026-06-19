# Implementation Plan: Dashboard Routing Test & E2E Alignment

**Branch**: `028-dashboard-routing-tests` | **Date**: 2026-06-18 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/028-dashboard-routing-tests/spec.md` (Linear SPLR-68)

## Summary

Align automated verification with the **dashboard routing split**: priority-zone **overview at `/`**, **event workspace at `/venues/:venueId/events/:eventId`**, and optional **`?focus=`** quick-link navigation (features 023, 026, 027). Most Vitest page coverage already exists on the integration branch (`DashboardOverviewPage.test.tsx`, `EventWorkspacePage.test.tsx`, `appRoute.test.ts`, `eventWorkspaceRoute.test.ts`, `GlobalNav.test.tsx`); this feature **closes remaining gaps**, **updates Playwright E2E** for the overview → workspace journey, **extends route-helper tests** where thin, **verifies legacy `DashboardHome` removal**, and **confirms ≥80% frontend coverage** on touched files. **Frontend-only**; no backend changes.

## Technical Context

**Language/Version**: TypeScript 5.7 + React 18 (`apps/web` + `tests/e2e` only)

**Primary Dependencies**: Vitest + React Testing Library + `@testing-library/user-event` (page/unit); Playwright (E2E); existing helpers — `mockWorkspaceFetch`, `buildEventWorkspacePath`, `navigateToEventWorkspace`, `eventWorkspaceRoute`, `dashboardRoute` re-exports from `appRoute`

**Storage**: N/A — tests stub `fetch` and use jsdom `localStorage`/`sessionStorage`; E2E uses seeded DB + token bootstrap

**Testing**: Vitest + RTL under `apps/web/tests/**`; Playwright under `tests/e2e/specs/venue/`; v8 coverage thresholds ≥80% in `apps/web/vite.config.ts` (Constitution III); missing/unparseable coverage reports treated as failing

**Target Platform**: Vite SPA — overview `/`, workspace `/venues/{venueId}/events/{eventId}`, optional `?focus=`

**Project Type**: Web application monorepo — this feature touches only frontend test layers and E2E specs (no product behavior changes unless a justified non-behavioral test seam is required)

**Performance Goals**: Dashboard routing test subset runs in under ~3 minutes locally; E2E venue specs remain deterministic across consecutive CI runs

**Constraints**: Constitution III — Vitest + RTL for frontend, Playwright for multi-user routing flows; ≥80.0% line/branch coverage on touched frontend files; Constitution VI — fixtures from `@/types/generated-api` only; extend/consolidate existing suites (no parallel test directory); event combobox edit/delete out of scope (feature 015); full focus-scroll E2E for all five targets deferred to 027 if not already present — overview quick-link navigation with focus MUST be covered at page-test level (FR-004)

**Scale/Scope**: ~6–8 test files touched (extend or fix), ~2 E2E spec files updated, 0 new source pages; legacy `DashboardHome` already removed — verify zero references remain

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Relevance | Status |
|-----------|-----------|--------|
| I. Core Mathematical Axioms | No monetary math in routing tests. | N/A |
| II. Multi-Tenant Isolation | Tests stub scope-correct venue/event lists; E2E uses tenant-scoped seed users. | PASS |
| III. Engineering Rigor | Primary deliverable is Vitest + RTL + Playwright alignment; ≥80% on touched files. | PASS (primary driver) |
| IV. QBO Integration | No QBO API interaction in routing tests. | N/A |
| V. Ledger State Machine | Workspace tests mock `EventLedgerPage`; no settled-event mutation paths. | PASS (N/A) |
| VI. Polyglot Contract | Fixtures use `EventResponse`, `VenueResponse`, etc. from `generated-api.ts`. | PASS |
| VII. EF Core Axioms | No backend changes. | N/A |
| VIII. Exception Governance | Tests assert user-facing error/retry copy only. | PASS |
| IX. UI Iconography | No new icons. | N/A |

**Post-design re-check (Phase 1)**: Design artifacts reinforce Constitution II scope fidelity, Constitution VI generated types, and Constitution III coverage attribution. Gates remain PASS. No Complexity Tracking entries required.

## Project Structure

### Documentation (this feature)

```text
specs/028-dashboard-routing-tests/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── test-coverage.md # FR → test-case mapping
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
apps/web/tests/
├── pages/
│   ├── DashboardOverviewPage.test.tsx   # EXTEND — overview landing, zones, card/quick-link nav (mostly complete)
│   └── EventWorkspacePage.test.tsx      # EXTEND — URL sync, combobox, create-event, focus strip (mostly complete)
├── lib/
│   ├── appRoute.test.ts                 # EXTEND — workspace path round-trip, hooks (mostly complete)
│   ├── dashboardRoute.test.ts           # EXTEND — re-export smoke, navigateToEventWorkspace via barrel
│   └── eventWorkspaceRoute.test.ts      # EXTEND — focus union values, storage side effects
├── shell/
│   └── GlobalNav.test.tsx               # EXISTING — dashboard highlight on `/` and workspace routes
└── App.test.tsx                         # AUDIT — route table includes overview + workspace (GAP if missing)

tests/e2e/specs/venue/
├── event-selection.spec.ts              # UPDATE — broken E1 (create on overview); add overview→workspace journey
└── venue-switching.spec.ts              # AUDIT — E3 ledger assertion may need workspace context after overview landing
```

**Structure Decision**: Frontend test-only vertical slice. Consolidate into existing files per feature 017 pattern. E2E updates live beside existing venue specs. No new directories.

## Implementation Phases

### Phase A — Baseline audit (blocking)

1. Confirm prerequisites **023**, **026**, **027** merged on branch.
2. Map any remaining `DashboardHome` references (source, tests, docs, quickstarts in *other* specs) — production code should have zero imports.
3. Run targeted Vitest suites (see [quickstart.md](./quickstart.md)) and record **GAP** rows in [contracts/test-coverage.md](./contracts/test-coverage.md).

### Phase B — Vitest gap closure (P1–P3)

1. **Overview page** (`DashboardOverviewPage.test.tsx`): confirm FR-001–FR-004 scenarios pass; add missing rows only (e.g., ledger absent assertion if not explicit).
2. **Workspace page** (`EventWorkspacePage.test.tsx`): confirm FR-005–FR-008; ensure focus strip on combobox/venue switch (027 alignment).
3. **Route helpers**: extend `dashboardRoute.test.ts` to assert `navigateToEventWorkspace` re-export; align `eventWorkspaceRoute.test.ts` focus examples with `WorkspaceFocus` union (`deal`, `settlement`, etc.).
4. **App routing** (`App.test.tsx`): add smoke tests that `/` renders overview shell and workspace path renders workspace if GAP.

### Phase C — Playwright E2E (P4)

1. **Fix `event-selection.spec.ts` E1**: seed with zero events → navigate to workspace route (or use workspace empty-state path) before create-event flow — overview no longer exposes `empty-state-create-event` (026 rule).
2. **Add primary journey**: login → `/` overview visible (`dashboard-overview`) → click event card → URL matches `/venues/.../events/...` → `event-ledger-page` visible.
3. **Audit `venue-switching.spec.ts`**: ensure venue switch assertions valid on overview (no ledger on `/`) or switch scenario starts from workspace when ledger/API capture is required.

### Phase D — Legacy cleanup verification (P5)

1. Confirm `DashboardHome.tsx` and `DashboardHome.test.tsx` deleted; no imports in `App.tsx` or test harness.
2. Update any in-repo quickstart references that still cite `DashboardHome.test.tsx` only when touched by this PR (optional doc hygiene).

### Phase E — Coverage gate

```bash
cd apps/web && npx vitest run --coverage
```

Verify ≥80% thresholds and that touched page/lib files show measurable coverage contribution.

## Complexity Tracking

> No constitution violations requiring justification.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |

## Phase 0 & Phase 1 Artifacts

| Artifact | Path | Status |
|----------|------|--------|
| Research | [research.md](./research.md) | Complete |
| Data model | [data-model.md](./data-model.md) | Complete |
| Test contract | [contracts/test-coverage.md](./contracts/test-coverage.md) | Complete |
| Quickstart | [quickstart.md](./quickstart.md) | Complete |

**Next command**: `/speckit-tasks` to generate dependency-ordered `tasks.md`.
