# Quickstart & Validation Guide: E2E Lifecycle & Cross-Tenant Leak Testing

This guide validates that the milestone proves the three release criteria end-to-end and that the quality gates block unsafe merges. It references `contracts/` and `data-model.md` rather than duplicating details.

## Prerequisites

- .NET 8 SDK, Node 22 + npm, Docker (for Testcontainers + local preview), `gh` CLI authenticated, GCP credentials for the preview project.
- Repo bootstrapped: `apps/api`, `apps/web`, and the new `tests/e2e` workspace.

## Setup

```bash
# Backend
dotnet restore && dotnet build apps/api/split-rail-api.csproj

# Frontend
cd apps/web && npm ci && cd ../..

# E2E workspace
cd tests/e2e && npm ci && npx playwright install --with-deps && cd ../..
```

## Local validation (against a local hermetic stack)

1. **Run unit/component loops + coverage** (must each be ≥80.0%):
   ```bash
   dotnet test apps/api.tests/split-rail-api.tests.csproj --collect:"XPlat Code Coverage"   # cobertura
   cd apps/web && npm run test:coverage && cd ../..                                          # lcov, thresholds 80
   ```
   Expected: both suites pass; coverage reports produced; neither below 80.0%.

2. **Verify contract type sync (FR-019 / SC-007)**:
   ```bash
   # start API, then:
   cd apps/web && npm run gen:api && git diff --exit-code src/types/generated-api.ts && npm run build
   ```
   Expected: no drift, frontend build succeeds.

3. **Bring up a hermetic preview locally** (`Preview` env, fake QBO + seeding enabled), then seed:
   ```bash
   curl -X POST "$PREVIEW_BASE_URL/api/test-seed/reset"
   curl -X POST "$PREVIEW_BASE_URL/api/test-seed/lifecycle-event" \
        -H 'content-type: application/json' \
        -d '{"organizationId":"<orgA>","venueId":"<alphaMainHall>"}'
   ```

4. **Run the E2E suites** (see `contracts/e2e-suites.md`):
   ```bash
   cd tests/e2e
   PREVIEW_BASE_URL=$PREVIEW_BASE_URL npx playwright test                 # full matrix
   PREVIEW_BASE_URL=$PREVIEW_BASE_URL npx playwright test specs/isolation # Suite A only (independent)
   ```
   Expected outcomes:
   - **Suite A (isolation)**: 100% of cross-org attempts denied; zero foreign sentinels in any response (SC-001).
   - **Suite B (lifecycle)**: full traversal PreShow → SETTLED read-only → reconciliation; exact base-10 totals; touch-signature finalize; document retrievable (SC-002).
   - **Suite C (integrity)**: settlement document byte-for-byte unchanged after DB mutation (SC-003); zero POST/PUT/DELETE to Intuit recorded (SC-004).

## CI / merge-gate validation (see `contracts/ci-pipeline.md`)

5. **Happy path**: open a PR with a passing change → all gates green → merge allowed (SC-008).
6. **Coverage regression**: open a PR that drops backend *or* frontend coverage below 80.0% → `coverage-gate` red → merge blocked (SC-005/SC-008).
7. **Broken scenario**: open a PR that breaks an isolation/lifecycle/calculation scenario → `e2e-gate` red, preview torn down, merge blocked (SC-008).
8. **Teardown always**: confirm no `splitrail-preview-*` Cloud Run service remains after pass, fail, or cancel runs (SC-006).
9. **Artifacts on failure**: confirm a failed E2E shard uploads trace + screenshot + video; a passing run uploads none (SC-010).
10. **Time budget**: confirm a typical PR pipeline completes in ≈30 min with the E2E matrix sharded in parallel (SC-009).

## Acceptance mapping

| Validation step | Requirements / Success Criteria |
|-----------------|---------------------------------|
| 1 | FR-013, FR-015, SC-005 |
| 2 | FR-018/019/020, SC-007 |
| 3 | FR-021, FR-011a |
| 4 (Suite A) | FR-003/004/005, US1, SC-001 |
| 4 (Suite B) | FR-006/007/008/009/010, US2, SC-002 |
| 4 (Suite C) | FR-011/011a/012, US3, SC-003/SC-004 |
| 5–7 | FR-014/014a/017, US4, SC-008 |
| 8 | FR-016, SC-006 |
| 9 | FR-016a, SC-010 |
| 10 | FR-015a, SC-009 |
