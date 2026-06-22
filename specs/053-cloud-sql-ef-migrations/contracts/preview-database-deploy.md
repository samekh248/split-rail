# Contract: Preview Database Provisioning and Migration

Extends `specs/005-e2e-lifecycle-leak-testing/contracts/preview-environment.md` with the database and migration steps currently missing from `deploy/preview/deploy-preview.sh`.

## Inputs (env)

| Variable | Required | Description |
|----------|----------|-------------|
| `GCP_PROJECT` | yes | GCP project id |
| `GCP_REGION` | yes | Region for Cloud SQL and Cloud Run |
| `RUN_ID` | yes | Unique per pipeline run; drives resource names |

Derived names:

| Resource | Pattern |
|----------|---------|
| Cloud SQL instance | `splitrail-preview-${RUN_ID}` (sanitized) |
| Connection name | `${GCP_PROJECT}:${GCP_REGION}:splitrail-preview-${RUN_ID}` |
| Cloud Run service | `splitrail-preview-${RUN_ID}` |
| Database name | `split-rail-db` |

## Deploy step order (`deploy-preview.sh`)

After existing image build/push steps, the script MUST execute in this order:

1. **Provision Cloud SQL** — create instance (`db-f1-micro`, PostgreSQL 16) if not exists; create database `split-rail-db`; set postgres password (generated, not logged).
2. **Wait for instance ready** — poll until Cloud SQL reports `RUNNABLE` (timeout with clear error).
3. **Build migration bundle** — `dotnet ef migrations bundle` from `apps/api/split-rail-api.csproj`.
4. **Run migrations** — via `deploy/lib/migrate-bundle.sh`: Cloud SQL Auth Proxy to localhost → execute bundle → non-zero exit fails deploy.
5. **Deploy Cloud Run API** — MUST include:
   - `--add-cloudsql-instances="${CONNECTION_NAME}"`
   - `--set-env-vars` including `ASPNETCORE_ENVIRONMENT=Preview`, `Preview__UseFakeQboConnector=true`, `Preview__EnableTestSeeding=true`
   - `ConnectionStrings__DefaultConnection` with socket host `/cloudsql/${CONNECTION_NAME}`
   - `DB_PASSWORD` (preview credential, not committed)
6. **Seed** — `POST ${PREVIEW_BASE_URL}/api/test-seed/reset` (existing).
7. **Emit** — `PREVIEW_BASE_URL`, write `preview-url.txt`.

**Failure handling**: Any step 1–5 failure MUST exit non-zero. Step 6 seed failure SHOULD fail deploy (schema must be present). Teardown still runs (`if: always()`).

## Teardown contract (`teardown-preview.sh`)

MUST delete (idempotent, ignore not-found):

1. Cloud Run service `splitrail-preview-${RUN_ID}`
2. Cloud SQL instance `splitrail-preview-${RUN_ID}`

MUST NOT delete:

- Production instance `split-rail-db-prod`
- Any instance not matching the run's preview name

## Migration-before-traffic invariant

- `gcloud run deploy` for the API MUST NOT succeed as the final migration application step — migrations MUST complete in step 4 before step 5 begins.
- Contract tests MUST assert script text order: migration bundle execution appears before `gcloud run deploy` for the API service.

## Security

- No cleartext `DB_PASSWORD` in committed files or echoed deploy logs.
- Preview passwords are disposable; production path uses Secret Manager (see `production-api-deploy.md`).

## Verification (CI / local)

- Vitest contract tests in `apps/web/tests/deploy/` assert step order and required `gcloud` flags.
- Full GCP validation optional when credentials available (quickstart Scenario 3).
