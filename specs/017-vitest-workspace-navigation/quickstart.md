# Quickstart: Validate Workspace & Tenant Vitest Coverage

**Feature**: 017-vitest-workspace-navigation
**Date**: 2026-06-17

Run/validation guide for workspace navigation and tenant-management test coverage. Concrete test cases live in [`contracts/test-coverage.md`](./contracts/test-coverage.md); fixtures in [`data-model.md`](./data-model.md).

## Prerequisites

- Node + workspace package manager installed
- Dependencies installed at repo root (workspace install)
- Working directory: `apps/web`

## Run targeted suites

```bash
# from apps/web

# Venue workspace + create flow
npx vitest run tests/pages/DashboardHome.test.tsx tests/pages/CreateVenuePage.test.tsx

# Event selection (create flow page-level; edit/delete = feature 015)
npx vitest run tests/pages/DashboardHome.test.tsx tests/components/event

# Settings hub + placeholders + routing
npx vitest run tests/pages/SettingsLandingPage.test.tsx tests/pages/PlaceholderSettingsPage.test.tsx tests/App.test.tsx tests/lib/appRoute.test.ts

# Team management (full component + page)
npx vitest run tests/pages/TeamSettingsPage.test.tsx tests/components/team

# Permission hooks
npx vitest run tests/hooks/useCanManageVenues.test.ts tests/hooks/useCanManageEvents.test.ts tests/hooks/useCanManageTeam.test.ts
```

**Expected**: all targeted suites pass with no flake on repeated runs.

## Run full suite with coverage (the gate)

```bash
# from apps/web
npx vitest run --coverage
```

**Expected**:
- All tests pass.
- Coverage thresholds in `vite.config.ts` (lines/functions/branches/statements ≥ 80) met; non-zero exit if any threshold missed.
- `lcov` report produced for CI.

## Validate key behaviors (acceptance smoke)

| Behavior | How to confirm |
|----------|----------------|
| Venue empty-state CTA for admin | `DashboardHome.test.tsx` empty-state case passes |
| Create-venue validation + success | `CreateVenuePage.test.tsx` passes |
| Unauthorized create-venue redirect | `CreateVenuePage.test.tsx` silent redirect case passes |
| Event combobox switching | `DashboardHome.test.tsx` combobox case passes |
| No-events CTA gating | `DashboardHome.test.tsx` create CTA show/hide cases pass |
| Team URL silent redirect | `TeamSettingsPage.test.tsx` non-admin redirect passes |
| Team component coverage | `tests/components/team/*.test.tsx` all pass |
| Settings landing Team card gating | `SettingsLandingPage.test.tsx` passes |

## Close known gaps (from baseline audit)

Before marking feature complete, verify these **GAP** rows in [`contracts/test-coverage.md`](./contracts/test-coverage.md) are implemented:

- W2, W3, W4 — venue permission gating on dashboard
- W6 — over-max-length venue name
- W13 — inline create-event → ledger page flow

## Regression check (prove tests bite)

Temporarily introduce a defect, confirm failure, then revert:

- Show `empty-state-add-venue` for `memberProfile` → W3 should fail.
- Allow team page render without `canManagePermissions` → W18 should fail.
- Render an event from a different venue in the combobox → W9 should fail.

## Troubleshooting

- **`fetch` leaks to real network**: stub via `vi.stubGlobal` and `vi.unstubAllGlobals()` in `beforeEach`.
- **State bleed**: clear `localStorage`/`sessionStorage` in `beforeEach`.
- **Permission stub mismatch**: venue/team gates use `canManagePermissions`; event create uses `canViewFinancials` (see `data-model.md`).
- **Type errors**: import fixtures from `@/types/generated-api` only.
- **Coverage below threshold**: add page-level error/empty/loading paths; ensure tests import real source modules.

## Out of scope (do not validate here)

- Event combobox edit/delete — feature 015 suites
- Org/venue rename forms — future rename UI feature
- Auth layouts / venue switcher verbatim rendering — feature 010 suites
