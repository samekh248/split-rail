# Quickstart: Validate Dashboard Routing Test & E2E Alignment

**Feature**: 028-dashboard-routing-tests  
**Date**: 2026-06-18

Run/validation guide for dashboard routing test alignment. Test-case mapping: [`contracts/test-coverage.md`](./contracts/test-coverage.md). Fixtures: [`data-model.md`](./data-model.md).

## Prerequisites

- Node + workspace package manager installed
- Dependencies installed at repo root
- Prerequisite features **023**, **026**, **027** available on branch
- Working directory for Vitest: `apps/web`
- E2E: `WEB_BASE_URL` or `PREVIEW_BASE_URL` + running API seed stack

## Run targeted Vitest suites

```bash
# from apps/web

# Overview landing + zones + card navigation
npx vitest run tests/pages/DashboardOverviewPage.test.tsx

# Workspace URL sync, combobox, create-event, focus wiring
npx vitest run tests/pages/EventWorkspacePage.test.tsx

# Route helpers
npx vitest run tests/lib/appRoute.test.ts tests/lib/dashboardRoute.test.ts tests/lib/eventWorkspaceRoute.test.ts

# Global nav highlight on dashboard routes
npx vitest run tests/shell/GlobalNav.test.tsx
```

**Expected**: all targeted suites pass with no flake on repeated runs.

## Run full frontend suite with coverage (the gate)

```bash
# from apps/web
npx vitest run --coverage
```

**Expected**:

- All tests pass.
- Coverage thresholds in `vite.config.ts` (lines/functions/branches/statements ≥ 80) met.
- `lcov` report produced for CI.

## Verify legacy cleanup

```bash
# from repo root — expect no matches in apps/web/src or apps/web/tests
git grep DashboardHome -- apps/web
```

**Expected**: no production or test references to `DashboardHome`.

## Run Playwright E2E (venue routing)

```bash
# from repo root — requires WEB_BASE_URL and API
npx playwright test tests/e2e/specs/venue/event-selection.spec.ts
npx playwright test tests/e2e/specs/venue/venue-switching.spec.ts
```

**Expected**:

| Scenario | How to confirm |
|----------|----------------|
| Overview → workspace journey (R21) | Login → `/` shows overview → card click → workspace URL → `event-ledger-page` |
| Create first event (R22) | Zero-event seed → workspace empty state → create → ledger on workspace route |
| Venue switcher scope (R23) | Existing E1/E2 pass |
| Venue switch header (R24) | E3 captures `X-Active-Venue-Id` without invalid ledger assertion on overview |

## Close known gaps (baseline audit)

Before marking feature complete, verify these rows in [`contracts/test-coverage.md`](./contracts/test-coverage.md):

- **R19** — `dashboardRoute.test.ts` barrel `navigateToEventWorkspace` smoke
- **R21** — Playwright overview → card → ledger journey
- **R22** — Fix E1 create flow (workspace route, not overview `/`)
- **R24** — Audit venue-switching E3 for overview context

## Regression check (prove tests bite)

Temporarily break overview card navigation (e.g., no-op click handler) or E2E URL assertion. Re-run targeted Vitest + Playwright — at least one test must fail.

## Next step

Run `/speckit-tasks` to generate dependency-ordered implementation tasks.
