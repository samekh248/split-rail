# Contract: CI Pipeline & Quality Gates

GitHub Actions workflow (`.github/workflows/ci.yml`) triggered on `pull_request` targeting `main` and on `push` to `main`. Defines the merge-blocking quality gates (FR-013/014/015/015a/016/016a/017).

## Stage graph

```
            ┌──────────────────────┐
            │ backend-test+coverage│ (xUnit + Testcontainers, coverlet → cobertura)
            └──────────┬───────────┘
            ┌──────────┴───────────┐
            │frontend-test+coverage│ (Vitest + RTL, @vitest/coverage-v8 → lcov)
            └──────────┬───────────┘
            ┌──────────┴───────────┐
            │ contract-type-drift  │ (build API → swagger.json → gen:api → git diff)
            └──────────┬───────────┘
                       ▼
            ┌──────────────────────┐
            │ coverage-gate        │  REQUIRED CHECK (≥80.0% both sides; missing ⇒ fail)
            └──────────┬───────────┘
                       ▼
            ┌──────────────────────┐
            │ deploy-preview       │ (build images → Artifact Registry → Cloud Run → migrate+seed → emit URL)
            └──────────┬───────────┘
                       ▼
            ┌──────────────────────┐
            │ e2e-matrix           │  {project: chromium|firefox|webkit|mobile} × {shard: 1..N}
            │  (Playwright, retries=2, headless, against preview URL)
            └──────────┬───────────┘
                       ▼
            ┌──────────────────────┐
            │ e2e-gate             │  REQUIRED CHECK (all shards/projects green)
            └──────────┬───────────┘
                       ▼
            ┌──────────────────────┐
            │ teardown-preview     │  if: always()  (delete service + DB + bucket)
            └──────────────────────┘
```

## Gate rules

| Gate | Condition to PASS | On FAIL |
|------|-------------------|---------|
| `coverage-gate` (required) | `backendCoveragePct ≥ 80.0` AND `frontendCoveragePct ≥ 80.0` AND both reports present & parseable | block merge |
| `e2e-gate` (required) | every E2E scenario passes within retry budget (≤2) across all projects×shards | block merge; upload artifacts |
| `contract-type-drift` | `git diff --exit-code` on `apps/web/src/types/generated-api.ts` is clean AND `vite build` succeeds | block merge |

## Behavioral requirements

- **Independence (FR-013)**: backend and frontend coverage are evaluated separately; either `< 80.0%` fails the gate.
- **Missing coverage (edge case)**: if a coverage report is absent or unparseable for either side, `coverage-gate` FAILS (never treated as pass).
- **Retry budget (FR-014a)**: `e2e-matrix` jobs run Playwright with `retries: 2`; a scenario passing within budget is green; persistent failure fails the shard → fails `e2e-gate`.
- **Artifacts on failure only (FR-016a/SC-010)**: each `e2e-matrix` shard uploads `playwright-report/` + `test-results/` (trace, screenshot, video) as a build artifact **only** when that shard fails (`if: failure()`).
- **Teardown always (FR-016/SC-006)**: `teardown-preview` runs with `if: always()` and is depended on by job ordering so no environment is left running on pass, fail, cancel, or timeout. A scheduled reaper (optional) sweeps orphaned preview services older than N hours as a safety net for the "preview failed to start" edge case.
- **Time budget (FR-015a/SC-009)**: jobs that can run concurrently do; the E2E matrix is sharded so total wall-clock targets ≈30 min. CI sets a job-level timeout to fail-fast on hangs (edge case: hanging scenario) and still trigger teardown.
- **Required checks on main (FR-017/SC-008)**: branch protection on `main` lists `coverage-gate` and `e2e-gate` as required status checks. Documented as a one-time `gh api` / settings step in `deploy/preview` README or repo settings.

## Demonstrable enforcement (SC-008)

- A change that drops coverage below 80% on either side ⇒ `coverage-gate` red ⇒ merge blocked.
- A change that breaks an isolation/lifecycle/calculation scenario ⇒ `e2e-gate` red, preview torn down, merge blocked.
- A passing change ⇒ all gates green ⇒ merge allowed.
