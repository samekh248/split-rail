# Quickstart: Validate Auth & Venue Vitest Coverage

**Feature**: 010-vitest-tests-auth
**Date**: 2026-06-16

This guide shows how to run and validate the auth-layout and venue-selector test coverage. It is a run/validation guide; the concrete test cases live in [`contracts/test-coverage.md`](./contracts/test-coverage.md) and fixtures in [`data-model.md`](./data-model.md).

## Prerequisites

- Node + the workspace package manager installed
- Dependencies installed at the repo root (workspace install), so `apps/web` test deps are available
- Working directory: `apps/web`

## Run the targeted suites

```bash
# from apps/web
# auth layout + form/page suites
npx vitest run tests/auth

# venue selector + context + storage suites
npx vitest run tests/venue tests/pages/DashboardHome.test.tsx

# permission-gated controls (existing gating)
npx vitest run tests/qbo/SyncNowButton.test.tsx tests/settlement/FinalizeSettlementPanel.test.tsx
```

**Expected**: all targeted suites pass with no flake on repeated runs.

## Run the full suite with coverage (the gate)

```bash
# from apps/web
npx vitest run --coverage
```

**Expected**:
- All tests pass.
- Coverage thresholds in `vite.config.ts` (lines/functions/branches/statements ≥ 80) are met; the command exits non-zero if any threshold is missed (CI treats this as failing — Constitution III).
- An `lcov` report is produced for CI consumption.

## Validate the key behaviors (acceptance smoke)

| Behavior | How to confirm |
|----------|----------------|
| Auth forms render required labeled fields | `tests/auth/LoginForm.test.tsx`, `tests/auth/RegisterForm.test.tsx` pass |
| Empty/invalid submit blocked with inline errors | same form suites pass (`onSubmit` not called) |
| Venue list rendered verbatim by scope | `tests/venue/VenueSwitcher.test.tsx` "renders server response verbatim" passes |
| Venue switching updates active venue | `tests/venue/VenueSwitcher.test.tsx` switching + keyboard cases pass |
| Single/empty venue states | switcher + `tests/pages/DashboardHome.test.tsx` pass |
| Permission-gated controls hidden for unauthorized role | `tests/qbo/SyncNowButton.test.tsx`, `tests/settlement/FinalizeSettlementPanel.test.tsx` pass |

## Regression check (prove the tests bite)

Temporarily introduce a defect, confirm a test fails, then revert:

- Remove the password field from `LoginForm` → an auth form test should fail.
- Make `VenueSwitcher` render a hard-coded extra venue not in the provided list → the verbatim-rendering test should fail.
- Force a permission-gated control to always render → its gating test should fail.

Revert all temporary changes after confirming failures.

## Troubleshooting

- **`fetch` is not defined / unexpected real network**: ensure the test stubs `fetch` via `vi.stubGlobal` and resets with `vi.unstubAllGlobals()` in `beforeEach`.
- **State bleeding between tests**: clear `sessionStorage`/`localStorage` in `beforeEach`.
- **Type errors importing payload shapes**: import from `@/types/generated-api` — do not hand-declare contract interfaces (Constitution VI).
- **Coverage below threshold**: identify uncovered branches in the `text` report and add page/container-level cases (often error/empty/loading paths).
