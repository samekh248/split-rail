# Contract: QBO Scheduler Job Provisioning (IaC)

Defines repeatable infrastructure provisioning for the 6-hour Cloud Scheduler job that triggers QBO sync (SPLR-49, TDD §5/§7).

## Inputs (env)

| Variable | Required | Description |
|----------|----------|-------------|
| `GCP_PROJECT` | yes | `split-rail` |
| `GCP_REGION` | yes | `us-central1` |
| `ENV` | yes | `dev` \| `prod` (preview excluded) |
| `CLOUD_RUN_URL` | yes | HTTPS base URL of deployed API (no trailing slash), e.g. `https://split-rail-api-xxxxx-uc.a.run.app` |
| `SERVICE_NAME` | no | Cloud Run service name (default `split-rail-api`); used to resolve URL if `CLOUD_RUN_URL` omitted |

## Name resolution (`deploy/lib/qbo-scheduler-names.sh`)

| `ENV` | Scheduler job name | Service account ID | Service account email |
|-------|-------------------|------------------|----------------------|
| `dev` | `split-rail-qbo-sync-dev` | `split-rail-qbo-scheduler-dev` | `split-rail-qbo-scheduler-dev@{GCP_PROJECT}.iam.gserviceaccount.com` |
| `prod` | `split-rail-qbo-sync-prod` | `split-rail-qbo-scheduler-prod` | `split-rail-qbo-scheduler-prod@{GCP_PROJECT}.iam.gserviceaccount.com` |

Target URI: `{CLOUD_RUN_URL}/api/internal/qbo-sync-trigger`

## Script: `deploy/infra/provision-qbo-scheduler.sh`

### Step order

1. **Resolve names** from `ENV` via `qbo-scheduler-names.sh`.
2. **Resolve `CLOUD_RUN_URL`** from env or `gcloud run services describe`.
3. **Create scheduler service account** (if absent) — `gcloud iam service-accounts create`.
4. **Create or update scheduler job**:
   - Schedule: `0 */6 * * *`
   - Time zone: `UTC`
   - HTTP method: `POST`
   - URI: target URI above
   - OIDC: `--oidc-service-account-email={SA_EMAIL}` `--oidc-token-audience={CLOUD_RUN_URL}`
5. **Validate** — invoke `deploy/lib/validate-qbo-scheduler.sh`; fail on non-zero exit.

### Idempotency contract

- Re-run with unchanged config: SA create no-ops if exists; job updated in place via `gcloud scheduler jobs update http`.
- MUST NOT create duplicate jobs (stable job name per `ENV`).
- MUST NOT generate or print service account keys.

### PowerShell parity

`deploy/infra/provision-qbo-scheduler.ps1` MUST expose identical inputs, step order, and exit codes (Constitution §X).

## Script: `deploy/lib/validate-qbo-scheduler.sh`

### Checks (exit non-zero if any fail)

| Check | Expected |
|-------|----------|
| Job exists | `gcloud scheduler jobs describe {JOB_NAME}` succeeds |
| Schedule | `0 */6 * * *` |
| HTTP method | `POST` |
| URI suffix | `/api/internal/qbo-sync-trigger` |
| URI host | matches `CLOUD_RUN_URL` host |
| OIDC SA email | matches environment scheduler SA |
| OIDC audience | matches `CLOUD_RUN_URL` |

### Outputs

- Structured stdout: `schedule_ok`, `uri_ok`, `oidc_sa_ok`, `oidc_audience_ok`.
- No OIDC tokens or secrets in output (Constitution VIII).

## Deploy integration (`deploy/production/deploy-api.sh`)

### New env vars (production)

| Env var | Source | Example |
|---------|--------|---------|
| `QboSync__SchedulerServiceAccountEmail` | name resolution | `split-rail-qbo-scheduler-prod@split-rail.iam.gserviceaccount.com` |
| `QboSync__SchedulerTokenAudience` | Cloud Run URL | `https://split-rail-api-xxxxx-uc.a.run.app` |

### Removed from production `--set-secrets`

- `QBO_INTERNAL_TRIGGER_KEY` / `qbo-internal-trigger-key` (superseded by OIDC per research §10)

### Pre-deploy validation

- Invoke `validate-qbo-scheduler.sh` with `ENV=prod` before `gcloud run deploy` (or document one-time provision + validate in quickstart).

## Security contract

- Scripts MUST NOT write or print service account key JSON.
- Scripts MUST NOT embed long-lived shared secrets for scheduler auth.
- Scheduler SA receives no broad IAM roles beyond token minting for HTTP target.

## Success criteria mapping

| Requirement | Contract enforcement |
|-------------|---------------------|
| FR-001 | Cron `0 */6 * * *` |
| FR-009 | Version-controlled provision scripts |
| FR-010 | URI targets correct Cloud Run URL |
| FR-011 | OIDC SA email on job |
| FR-012 | Idempotent create/update |
| FR-013 | Validate script checks |
| SC-003, SC-004 | Provision + validate + idempotent re-apply |

## Verification

- Vitest contract tests assert both `.sh` and `.ps1` exist, reference `0 */6`, OIDC flags, and deploy env vars.
- Manual: `gcloud scheduler jobs run {JOB_NAME} --location=us-central1` after provision; check API logs for sync completion.
