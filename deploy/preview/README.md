# Ephemeral Preview Environment

Per-PR Cloud Run preview for E2E testing. See `specs/005-e2e-lifecycle-leak-testing/contracts/preview-environment.md` and `specs/053-cloud-sql-ef-migrations/contracts/preview-database-deploy.md`.

## Required environment variables

| Variable | Description |
|----------|-------------|
| `GCP_PROJECT` | GCP project id (e.g. `split-rail`) |
| `GCP_REGION` | Region (e.g. `us-central1`) |
| `RUN_ID` | Unique per pipeline run (e.g. `${GITHUB_RUN_ID}`) |

## Deploy flow (`deploy-preview.sh`)

1. Build and push API + web images to Artifact Registry
2. Provision ephemeral Cloud SQL (`db-f1-micro`, PostgreSQL 16) per `RUN_ID`
3. Build EF migration bundle and apply migrations **before** Cloud Run deploy
4. Deploy API to Cloud Run with Cloud SQL connector and preview env flags
5. Seed deterministic test data and emit `PREVIEW_BASE_URL`

```bash
export GCP_PROJECT=split-rail
export GCP_REGION=us-central1
export RUN_ID="${GITHUB_RUN_ID:-local-$(date +%s)}"

./deploy/preview/deploy-preview.sh
```

## Teardown (`teardown-preview.sh`)

Deletes the preview Cloud Run service and Cloud SQL instance for the run. Idempotent — safe with `if: always()` in CI.

```bash
./deploy/preview/teardown-preview.sh
```

## Local migration smoke (no GCP)

Validates EF migration bundle against Docker Postgres:

```bash
./deploy/preview/smoke-migrate-bundle.sh
```

Requires Docker and .NET SDK (`dotnet-ef`).

## Web frontend container (`Dockerfile.web`)

The preview pipeline builds a self-contained web image from the **repository root**:

```bash
docker build -t splitrail-web:local -f deploy/preview/Dockerfile.web .
```

Local smoke validation (requires Docker):

```bash
./deploy/preview/smoke-web-image.sh
```

**Note**: `deploy-preview.sh` pushes the web image but deploys **API only** to Cloud Run. Wiring the web image into Cloud Run is future work (spec 051 Out of Scope).

## Branch protection (required checks)

Configure `main` to require these status checks:

- `coverage-gate`
- `e2e-gate`

```bash
gh api repos/:owner/:repo/branches/main/protection \
  --method PUT \
  --field required_status_checks[strict]=true \
  --field required_status_checks[contexts][]=coverage-gate \
  --field required_status_checks[contexts][]=e2e-gate \
  --field enforce_admins=true \
  --field required_pull_request_reviews[required_approving_review_count]=1
```

Adjust review requirements to match your repo policy.

## Production API deploy

See `deploy/production/deploy-api.sh` and `specs/053-cloud-sql-ef-migrations/contracts/production-api-deploy.md`.

```bash
export GCP_PROJECT=split-rail
export GCP_REGION=us-central1
export IMAGE=us-central1-docker.pkg.dev/split-rail/split-rail/api:tag
export DB_PASSWORD="$(gcloud secrets versions access latest --secret=db-password)"
./deploy/production/deploy-api.sh
```
