# Quickstart Validation Guide: Cloud SQL Provisioning and EF Migrations in Deploy

**Feature**: 053-cloud-sql-ef-migrations (SPLR-46) | **Date**: 2026-06-21

## Prerequisites

- .NET 8 SDK + `dotnet tool install --global dotnet-ef`
- `gcloud` CLI authenticated to `split-rail` project (for GCP scenarios)
- Docker (for local Postgres / optional smoke)
- Node 22 + `npm ci` in `apps/web` (for contract tests)

See [contracts/preview-database-deploy.md](contracts/preview-database-deploy.md) and [contracts/production-api-deploy.md](contracts/production-api-deploy.md) for script contracts.

---

## Scenario 1 — Contract Tests Pass Locally (no GCP)

**Validates**: FR-009, Constitution III, deploy script structure

```bash
cd apps/web
npm run test -- tests/deploy/deployPreviewDatabase.test.ts
npm run test -- tests/deploy/deployProductionApi.test.ts
```

**Expected**: All tests green; scripts assert migration-before-deploy ordering, `add-cloudsql-instances`, no hardcoded passwords.

---

## Scenario 2 — Migration Bundle Applies Against Local Postgres

**Validates**: FR-003, FR-004 (migration mechanism)

### Setup

```bash
docker run -d --name splitrail-migrate-smoke \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=split-rail-db \
  -p 5432:5432 postgres:16
```

### Build and apply bundle

```bash
dotnet ef migrations bundle \
  --project apps/api/split-rail-api.csproj \
  --configuration Release \
  --output ./artifacts/efbundle \
  --self-contained

export ConnectionStrings__DefaultConnection="Host=127.0.0.1;Port=5432;Database=split-rail-db;Username=postgres"
export DB_PASSWORD=postgres
./artifacts/efbundle
```

**Expected**: Exit code 0; `\dt` in Postgres shows application tables (e.g. `organizations`, `events`).

### Cleanup

```bash
docker rm -f splitrail-migrate-smoke
```

---

## Scenario 3 — Preview Deploy End-to-End (GCP credentials required)

**Validates**: FR-001, FR-003, FR-007, SC-001, US2 acceptance scenarios

```bash
export GCP_PROJECT=split-rail
export GCP_REGION=us-central1
export RUN_ID="local-$(date +%s)"

./deploy/preview/deploy-preview.sh
```

**Expected**:

1. Cloud SQL instance `splitrail-preview-${RUN_ID}` created (or already present).
2. Migration step completes before Cloud Run deploy logs show new revision.
3. `POST ${PREVIEW_BASE_URL}/api/test-seed/reset` succeeds.
4. `preview-url.txt` contains reachable URL.

### Verify persistence

```bash
PREVIEW_BASE_URL=$(cat preview-url.txt)
curl -sf "${PREVIEW_BASE_URL}/swagger/v1/swagger.json" | head -c 200
```

**Expected**: Swagger JSON returned (API healthy against migrated DB).

### Teardown

```bash
./deploy/preview/teardown-preview.sh
```

**Expected**: Cloud Run service and preview Cloud SQL instance deleted; idempotent re-run exits 0.

---

## Scenario 4 — Production API Deploy Dry Validation

**Validates**: FR-002, FR-006, US3 (without full prod deploy if preferred)

### Contract-only (no GCP)

```bash
cd apps/web && npm run test -- tests/deploy/deployProductionApi.test.ts
```

### Full deploy (production credentials required)

```bash
export GCP_PROJECT=split-rail
export GCP_REGION=us-central1
export IMAGE=us-central1-docker.pkg.dev/split-rail/split-rail/api:your-tag

./deploy/production/deploy-api.sh
```

**Expected**:

- Migration bundle runs before `gcloud run deploy`.
- Deploy uses `--add-cloudsql-instances=split-rail:us-central1:split-rail-db-prod`.
- `DB_PASSWORD` bound via Secret Manager (`--set-secrets`), not inline env.
- Authenticated API calls requiring DB succeed after deploy.

---

## Scenario 5 — Failed Migration Blocks Deploy

**Validates**: FR-004, SC-005

1. Point migration bundle at an unreachable database host (invalid `ConnectionStrings__DefaultConnection`).
2. Run `deploy/lib/migrate-bundle.sh` (or preview deploy with broken proxy config).

**Expected**: Non-zero exit; Cloud Run service NOT updated to new revision (or deploy script aborts before deploy step).

---

## CI alignment

When `vars.ENABLE_PR_BROWSER_TESTS == 'true'` and GCP credentials are configured, `.github/workflows/ci.yml` `deploy-preview` job should invoke `deploy/preview/deploy-preview.sh` instead of the current stub URL output. `teardown-preview` runs with `if: always()`.

See [spec 005 ci-pipeline contract](../005-e2e-lifecycle-leak-testing/contracts/ci-pipeline.md).
