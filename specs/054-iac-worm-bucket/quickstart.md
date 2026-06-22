# Quickstart & Validation Guide: Infrastructure-as-Code for Settlement Archive Storage

This guide validates SPLR-47 bucket provisioning and non-preview deploy wiring. See [data-model.md](data-model.md), [contracts/settlement-buckets-provision.md](contracts/settlement-buckets-provision.md), and [contracts/non-preview-deploy-wiring.md](contracts/non-preview-deploy-wiring.md).

## Prerequisites

- Specs 004, 043, and 050 implemented (stage/promote pipeline + app retention enforcement).
- `gcloud` CLI authenticated to project `split-rail`.
- IAM: permission to create buckets, set retention, bind IAM (operator role).
- .NET 8 SDK for optional finalize smoke test.

## One-time: Provision dev buckets

### Bash (Linux / macOS / Git Bash)

```bash
export GCP_PROJECT=split-rail
export GCP_REGION=us-central1
export ENV=dev

./deploy/infra/provision-settlement-buckets.sh
```

### PowerShell (Windows)

```powershell
$env:GCP_PROJECT = 'split-rail'
$env:GCP_REGION = 'us-central1'
$env:ENV = 'dev'

.\deploy\infra\provision-settlement-buckets.ps1
```

Verify (PowerShell):

```powershell
$env:GCP_PROJECT = 'split-rail'
$env:ENV = 'dev'
.\deploy\lib\validate-settlement-buckets.ps1
```

**Expect**:
- `gs://split-rail-settlements-dev` exists with 2555-day retention (lock optional for dev).
- `gs://split-rail-settlements-staging-dev` exists with **no** retention policy.
- Both buckets deny public access.

Verify:

```bash
ENV=dev ./deploy/lib/validate-settlement-buckets.sh
echo exit=$?
# Expect: exit=0
```

## Scenario A — Archive retention and staging deletable (SC-001, SC-002)

```bash
gcloud storage buckets describe gs://split-rail-settlements-dev \
  --format="json(retentionPolicy,iamConfiguration.publicAccessPrevention)"

gcloud storage buckets describe gs://split-rail-settlements-staging-dev \
  --format="json(retentionPolicy)"
```

**Expect**:
- Archive: `retentionPolicy.retentionPeriod` ≥ `"2555d"` (or equivalent seconds).
- Staging: no effective retention policy (deletable objects).

## Scenario B — Production provision (operator, irreversible lock)

```bash
export GCP_PROJECT=split-rail
export GCP_REGION=us-central1
export ENV=prod
export CONFIRM_BUCKET_LOCK=true

./deploy/infra/provision-settlement-buckets.sh
ENV=prod ./deploy/lib/validate-settlement-buckets.sh
```

**Expect**: Archive `split-rail-settlements-prod` locked at 7 years; staging `split-rail-settlements-staging-prod` without lock.

**Warning**: Bucket Lock cannot be removed; confirm retention duration before locking.

## Scenario C — Contract tests (CI, no GCP creds required)

```bash
cd apps/web
npm test -- tests/deploy/deploySettlementBuckets.test.ts tests/deploy/deployProductionApi.test.ts
```

**Expect**: Tests pass — provision script references retention `2555`, validate script exists, production deploy sets `SettlementArchive__*` env vars, preview deploy omits them.

## Scenario D — Non-preview app uses GCS (SC-003, SC-004)

1. Update local `appsettings.Development.json` staging bucket to `split-rail-settlements-staging-dev` (if not already).
2. Run API locally (not Preview environment):

```bash
cd apps/api
dotnet run
```

**Expect**: Startup succeeds with retention validation log for dev buckets (when `EnforceRetentionValidation=true`).

3. Optional smoke — finalize a test event against dev buckets (requires DB + test data):

```bash
# After finalize succeeds, confirm object in archive bucket
gcloud storage ls gs://split-rail-settlements-dev/settlements/ --recursive | head
```

## Scenario E — Preview unchanged (FR-007)

Run preview deploy (with standard preview env vars):

```bash
# Inspect deploy/preview/deploy-preview.sh output contract via Vitest
npm test -- tests/deploy/deployPreviewDatabase.test.ts
```

**Expect**: Preview sets `Preview__EnableTestSeeding=true` and does **not** set `SettlementArchive__BucketName` — in-memory archive preserved.

## Scenario F — Negative validation (SC-005)

On a test bucket without retention (operator sandbox only):

```bash
# If validate script run against misconfigured bucket
ENV=dev ARCHIVE_BUCKET=noncompliant-bucket ./deploy/lib/validate-settlement-buckets.sh
# Expect: non-zero exit, actionable stderr
```

## Scenario G — Production deploy wiring

Inspect production deploy script:

```bash
grep SettlementArchive deploy/production/deploy-api.sh
```

**Expect**:
- `SettlementArchive__BucketName=split-rail-settlements-prod`
- `SettlementArchive__StagingBucketName=split-rail-settlements-staging-prod`
- `SettlementArchive__EnforceRetentionValidation=true`

Deploy (requires IMAGE, DB_PASSWORD, etc.):

```bash
export GCP_PROJECT=split-rail
export GCP_REGION=us-central1
export IMAGE=...
export DB_PASSWORD=...  # from Secret Manager

ENV=prod ./deploy/lib/validate-settlement-buckets.sh
./deploy/production/deploy-api.sh
```

## Coverage gate

```bash
cd apps/web && npm test -- --coverage tests/deploy/
```

**Expect**: ≥80% line/branch coverage on new/modified deploy assertion files (Constitution III).

Backend changes (if `Program.cs` / validator scope touched):

```bash
cd apps/api
dotnet test ../api.tests --filter "FullyQualifiedName~SettlementArchiveStartup" --collect:"XPlat Code Coverage"
```

## Idempotency check (SC-006)

```bash
ENV=dev ./deploy/infra/provision-settlement-buckets.sh
ENV=dev ./deploy/infra/provision-settlement-buckets.sh
ENV=dev ./deploy/lib/validate-settlement-buckets.sh
```

**Expect**: Second provision succeeds; validation still passes; retention unchanged.

## Regression checks

- Spec 050 immutability tests still pass (`SettlementArchiveImmutabilityTests`).
- Spec 043 atomicity tests unchanged.
- Preview E2E (spec 005) unaffected — in-memory archive in preview.

## Update infrastructure memory

After prod buckets provisioned, confirm `.specify/memory/infrastructure.md` §2 lists:
- Archive: `gs://split-rail-settlements-prod` (7-year lock)
- Staging: `gs://split-rail-settlements-staging-prod`
