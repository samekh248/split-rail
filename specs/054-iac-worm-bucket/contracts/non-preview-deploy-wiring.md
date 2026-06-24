# Contract: Non-Preview Deploy Wiring for Settlement Archive Storage

Defines how development and production deployments bind the API to provisioned GCS buckets (SPLR-47 acceptance: app writes/read-signs against real bucket).

## Archive store backend selection (`Program.cs`)

| Condition | Backend |
|-----------|---------|
| `ASPNETCORE_ENVIRONMENT=Preview` AND preview seeding enabled | `InMemorySettlementArchiveStore` |
| `SettlementArchive:UseInMemoryStore=true` | `InMemorySettlementArchiveStore` (local/tests only) |
| `Development` or `Production` (default) | `GcsSettlementArchiveStore` |

**Contract**: Deploy scripts MUST NOT set `SettlementArchive__UseInMemoryStore=true`.

Preview deploy (`deploy/preview/deploy-preview.sh`) MUST NOT set `SettlementArchive__*` bucket overrides — in-memory archive remains default (FR-007).

## Production: `deploy/production/deploy-api.sh`

### Additional env vars (Cloud Run `--set-env-vars`)

| Variable | Value |
|----------|-------|
| `SettlementArchive__BucketName` | `split-rail-settlements-prod` |
| `SettlementArchive__StagingBucketName` | `split-rail-settlements-staging-prod` |
| `SettlementArchive__RetentionYears` | `7` |
| `SettlementArchive__EnforceRetentionValidation` | `true` |

### Pre-deploy validation (recommended)

Before `gcloud run deploy`, invoke:

```bash
ENV=prod deploy/lib/validate-settlement-buckets.sh
```

Failure MUST abort deploy (FR-008).

### Runtime identity

- Cloud Run service MUST run as a service account with `roles/storage.objectAdmin` on prod archive and staging buckets (provisioned by IaC script).
- No GCS JSON keys in container env or image.

## Development (local / shared dev stack)

### Configuration (`appsettings.Development.json`)

| Option | Value |
|--------|-------|
| `SettlementArchive:BucketName` | `split-rail-settlements-dev` |
| `SettlementArchive:StagingBucketName` | `split-rail-settlements-staging-dev` |
| `SettlementArchive:EnforceRetentionValidation` | `true` (after dev buckets provisioned) |
| `SettlementArchive:UseInMemoryStore` | `false` |

One-time provision: `ENV=dev ./deploy/infra/provision-settlement-buckets.sh`

## Startup validation (`SettlementArchiveStartupValidator`)

When `EnforceRetentionValidation=true` and `BucketName` is set:

1. Fetch archive + staging bucket metadata.
2. Verify archive retention ≥ `RetentionYears`.
3. Verify staging has no blocking retention lock.
4. Fail startup on misconfiguration (FR-008; extends spec 050 validator to dev when enabled).

**Contract change from spec 050**: Validator runs for any environment where `EnforceRetentionValidation=true`, not only `IsProduction()`.

## Success criteria mapping

| Requirement | Contract enforcement |
|-------------|---------------------|
| FR-006 | Prod deploy env vars + Gcs backend for Development/Production |
| FR-007 | Preview omits bucket env; in-memory backend |
| FR-008 | Startup validator + pre-deploy validate script |
| FR-009 | Workload identity only; no keys in scripts |
| FR-011 | Validate script + deploy env audit tests |
| SC-003, SC-004 | Prod env vars + Gcs backend selection |

## Verification

- Vitest: `deployProductionApi.test.ts` extended to assert `SettlementArchive__BucketName` and staging env vars in production script.
- Vitest: `deployPreviewScript.test.ts` (or equivalent) asserts preview script does **not** set settlement bucket overrides.
- Integration smoke (optional): finalize on dev stack with real buckets; object appears in `split-rail-settlements-dev`.
