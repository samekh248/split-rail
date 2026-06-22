# Contract: Production API Deploy with Cloud SQL and Migrations

Defines the production deploy path for the backend API on Cloud Run with managed PostgreSQL (TDD §7, SPLR-46).

## Inputs (env)

| Variable | Required | Description |
|----------|----------|-------------|
| `GCP_PROJECT` | yes | `split-rail` |
| `GCP_REGION` | yes | `us-central1` |
| `IMAGE` | yes | API container image URI in Artifact Registry |
| `SERVICE_NAME` | optional | Default: project-standard API Cloud Run name (e.g. `split-rail-api`) |

Fixed infrastructure (from `.specify/memory/infrastructure.md`):

| Resource | Value |
|----------|-------|
| Instance connection name | `split-rail:us-central1:split-rail-db-prod` |
| Database | `split-rail-db` |
| Socket path | `/cloudsql/split-rail:us-central1:split-rail-db-prod` |

## Script: `deploy/production/deploy-api.sh`

### Step order

1. **Build migration bundle** — same as preview (`dotnet ef migrations bundle`).
2. **Run migrations** — `deploy/lib/migrate-bundle.sh` against production instance via Cloud SQL Auth Proxy; fail on non-zero exit.
3. **Deploy Cloud Run** — MUST include:
   - `--image="${IMAGE}"`
   - `--add-cloudsql-instances=split-rail:us-central1:split-rail-db-prod`
   - `--set-secrets=DB_PASSWORD=db-password:latest` (or project-standard secret binding)
   - Production env: `ASPNETCORE_ENVIRONMENT=Production`
   - Connection string uses socket host from `appsettings.json` default (override only if required)

### Out of scope for this script

- Provisioning the production Cloud SQL instance (pre-existing).
- Web Firebase Hosting deploy (`deploy/production/deploy-web-hosting.sh`).
- Preview resources.

## Security contract

- `DB_PASSWORD` MUST be sourced from Secret Manager via `--set-secrets`, not `--set-env-vars` with inline values.
- Deploy script MUST NOT contain literal database passwords.
- Migration proxy logs MUST NOT print connection strings with passwords (Constitution VIII).

## Success criteria mapping

| Requirement | Contract enforcement |
|-------------|---------------------|
| FR-002 | Connect to `split-rail-db-prod` via connector |
| FR-003 | Migrations in step 2 before step 3 |
| FR-004 | Bundle non-zero → script exits before deploy |
| FR-006 | Secret Manager binding for `DB_PASSWORD` |
| SC-003 | Ordered steps complete within standard release window |

## Verification

- Vitest contract test asserts `deploy-api.sh` exists, references `add-cloudsql-instances`, `set-secrets`, and migration-before-deploy ordering.
- Manual validation: deploy to staging/prod with creds; `curl` authenticated API endpoint requiring DB (quickstart Scenario 4).
