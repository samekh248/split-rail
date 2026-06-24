# Quickstart & Validation Guide: Scheduled QBO Sync Trigger

This guide validates SPLR-49 scheduler provisioning and internal trigger OIDC auth. See [data-model.md](data-model.md), [contracts/qbo-scheduler-provision.md](contracts/qbo-scheduler-provision.md), and [contracts/internal-sync-trigger-auth.md](contracts/internal-sync-trigger-auth.md).

## Prerequisites

- Specs 003 (QBO sync service + internal trigger) and 055 (Secret Manager) implemented.
- `gcloud` CLI authenticated to project `split-rail`.
- IAM: `cloudscheduler.admin`, `iam.serviceAccounts.create`, `run.services.get` (or equivalent operator role).
- Deployed dev or prod Cloud Run API service with QBO credentials configured.
- .NET 8 SDK for running API tests.

## Automated contract verification (CI)

From repository root:

```bash
task web:test -- apps/web/tests/deploy/deployQboScheduler.test.ts
```

Or via npm in `apps/web`:

```bash
npm test -- tests/deploy/deployQboScheduler.test.ts
```

**Expect**: all contract tests pass (provision/validate scripts exist for both platforms, cron schedule, OIDC flags, deploy env vars).

Run API integration tests:

```bash
task api:test -- --filter "FullyQualifiedName~QboInternalSync"
```

**Expect**: OIDC auth accept/reject matrix passes; production startup validation passes.

## Scenario A — Provision dev scheduler job

### Bash

```bash
export GCP_PROJECT=split-rail
export GCP_REGION=us-central1
export ENV=dev
export CLOUD_RUN_URL="https://YOUR-DEV-CLOUD-RUN-URL"

./deploy/infra/provision-qbo-scheduler.sh
```

### PowerShell

```powershell
$env:GCP_PROJECT = 'split-rail'
$env:GCP_REGION = 'us-central1'
$env:ENV = 'dev'
$env:CLOUD_RUN_URL = 'https://YOUR-DEV-CLOUD-RUN-URL'

.\deploy\infra\provision-qbo-scheduler.ps1
```

**Expect**:
- Service account `split-rail-qbo-scheduler-dev@split-rail.iam.gserviceaccount.com` exists.
- Job `split-rail-qbo-sync-dev` exists in `us-central1`.
- Job schedule is `0 */6 * * *` (UTC).
- Job HTTP target is `POST` to `{CLOUD_RUN_URL}/api/internal/qbo-sync-trigger`.
- OIDC configured with scheduler SA email and audience = `CLOUD_RUN_URL`.

Validate:

```bash
ENV=dev CLOUD_RUN_URL="$CLOUD_RUN_URL" ./deploy/lib/validate-qbo-scheduler.sh
echo exit=$?
# Expect: exit=0
```

## Scenario B — Manual trigger (dev)

After API is deployed with scheduler OIDC config env vars:

```bash
gcloud scheduler jobs run split-rail-qbo-sync-dev \
  --location=us-central1 \
  --project=split-rail
```

**Expect**:
- Cloud Run logs show structured sync completion (`eventsSynced` count, `triggerSource=scheduler`).
- No `401`/`403` on the internal trigger.
- If no QBO venues connected: `eventsSynced: 0` without error.

## Scenario C — Unauthorized trigger rejected (SC-002)

Without a valid OIDC token:

```bash
curl -s -o /dev/null -w "%{http_code}" -X POST \
  "${CLOUD_RUN_URL}/api/internal/qbo-sync-trigger"
# Expect: 401

curl -s -o /dev/null -w "%{http_code}" -X POST \
  -H "X-Internal-Sync-Key: wrong-key" \
  "${CLOUD_RUN_URL}/api/internal/qbo-sync-trigger"
# Expect: 401 (production — shared key no longer accepted)
```

**Expect**: no QBO API activity in logs following rejected requests.

## Scenario D — Production provision and deploy wiring

One-time provision:

```bash
export GCP_PROJECT=split-rail
export GCP_REGION=us-central1
export ENV=prod
export CLOUD_RUN_URL="https://YOUR-PROD-CLOUD-RUN-URL"

./deploy/infra/provision-qbo-scheduler.sh
ENV=prod CLOUD_RUN_URL="$CLOUD_RUN_URL" ./deploy/lib/validate-qbo-scheduler.sh
```

Before production deploy, confirm `deploy/production/deploy-api.sh` sets:

- `QboSync__SchedulerServiceAccountEmail=split-rail-qbo-scheduler-prod@split-rail.iam.gserviceaccount.com`
- `QboSync__SchedulerTokenAudience={CLOUD_RUN_URL}`

And does **not** bind `QBO_INTERNAL_TRIGGER_KEY` in `--set-secrets`.

**Expect**: Vitest `deployProductionApi.test.ts` assertions pass for scheduler env vars.

## Scenario E — Idempotent re-provision (SC-004)

```bash
./deploy/infra/provision-qbo-scheduler.sh
./deploy/infra/provision-qbo-scheduler.sh
gcloud scheduler jobs list --location=us-central1 --project=split-rail \
  --filter="name:split-rail-qbo-sync-dev" --format="value(name)"
```

**Expect**: exactly one job name; schedule and OIDC settings unchanged.

## Scenario F — Local development unchanged (FR-003)

```bash
cd apps/api
dotnet run
```

With `appsettings.Development.json` (`EnableInProcessTimer: true`):

**Expect**:
- Log line: `QBO sync timer started with interval 6h`.
- No Cloud Scheduler required locally.
- Scheduled sync runs via in-process timer.

## Scenario G — Coverage gate (Constitution III)

```bash
task api:test-coverage
task web:test-coverage
```

**Expect**: ≥80% line/branch coverage on backend and frontend independently; new scheduler auth and deploy contract modules included.

## Troubleshooting

| Symptom | Check |
|---------|-------|
| `401` on scheduler run | `QboSync__SchedulerServiceAccountEmail` and `SchedulerTokenAudience` match job OIDC config |
| `403` with valid token | `email` claim mismatch vs configured SA email |
| Job missing | Re-run provision script; check `ENV` and `GCP_PROJECT` |
| Duplicate sync batches | Confirm `SemaphoreSlim` guard active; check for overlapping manual + scheduled triggers |
| Cold-start timeout | Cloud Scheduler retries; check Run min instances if persistent |

## Out of scope for quickstart

- Preview ephemeral deploy scheduler provisioning (intentionally omitted).
- Live 6-hour wait validation — use manual `gcloud scheduler jobs run` instead.
