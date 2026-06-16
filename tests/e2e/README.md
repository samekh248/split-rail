# Split-Rail E2E Tests

Playwright end-to-end verification for cross-tenant isolation, full lifecycle, and integrity suites.

## Prerequisites

- Node 22+
- Running API with Preview flags (`Preview__UseFakeQboConnector=true`, `Preview__EnableTestSeeding=true`)
- Optional: `WEB_BASE_URL` for UI/touch-signature scenarios

## Setup

```bash
cd tests/e2e
npm ci
npx playwright install --with-deps
```

## Run

```bash
# All suites (API against local preview)
export API_BASE_URL=http://localhost:5000
export PREVIEW_BASE_URL=http://localhost:5000
npm test

# Isolation suite only
npx playwright test specs/isolation

# Lifecycle suite only
npx playwright test specs/lifecycle

# Integrity suite only
npx playwright test specs/integrity

# Sharded (CI)
SHARD_INDEX=1 SHARD_TOTAL=4 npm run test:shard
```

## Environment variables

| Variable | Description |
|----------|-------------|
| `PREVIEW_BASE_URL` | Base URL for Playwright `use.baseURL` |
| `API_BASE_URL` | API origin for seeding/auth fixtures |
| `WEB_BASE_URL` | Frontend origin for UI tests (optional) |
| `SHARD_INDEX` / `SHARD_TOTAL` | Parallel CI sharding |

## CI

See `.github/workflows/ci.yml` and `specs/005-e2e-lifecycle-leak-testing/contracts/ci-pipeline.md`.
