# Data Model: Managed Database Provisioning and Schema Migration in Deploy

**Feature**: 053-cloud-sql-ef-migrations (SPLR-46) | **Date**: 2026-06-21

This feature is **infrastructure-only** — no new application domain tables or EF entity changes. The model describes **deploy-time resources**, **connection configuration**, and **migration lifecycle** artifacts.

## Entities

### DeployRun

| Field | Type | Description |
|-------|------|-------------|
| `runId` | string | Preview: `RUN_ID` env (e.g. GitHub Actions run id). Production: release tag or timestamp identifier. |
| `gcpProject` | string | GCP project (`split-rail`) |
| `gcpRegion` | string | Region (`us-central1`) |
| `environment` | enum | `preview` \| `production` |
| `apiImageTag` | string | Artifact Registry API image URI |

**Validation**:
- `runId`, `gcpProject`, `gcpRegion` MUST be non-empty for preview deploy.
- Preview `runId` MUST be sanitized for Cloud SQL instance names (lowercase, hyphens, max length).

**Relationships**: One DeployRun owns zero or one ephemeral `ManagedDatabaseInstance` (preview) and one `ApplicationService` deployment.

---

### ManagedDatabaseInstance

| Field | Type | Description |
|-------|------|-------------|
| `instanceName` | string | Preview: `splitrail-preview-{runId}`. Production: `split-rail-db-prod` (pre-existing). |
| `connectionName` | string | `{project}:{region}:{instanceName}` |
| `databaseName` | string | `split-rail-db` |
| `tier` | string | Preview/production MVP: `db-f1-micro` (TDD §7) |
| `engineVersion` | string | PostgreSQL 16 |
| `lifecycle` | enum | `ephemeral` (preview) \| `persistent` (production) |

**State transitions (preview)**:

```text
[absent] → provisioning → ready → migrated → in_use → [deleted via teardown]
```

**State transitions (production)**:

```text
ready (pre-existing) → migrated → in_use
```

**Validation**:
- Instance MUST reach `ready` before migration bundle executes.
- Teardown MUST delete only instances matching `splitrail-preview-*` pattern for the run's `runId`.

---

### DatabaseCredentialSecret

| Field | Type | Description |
|-------|------|-------------|
| `secretName` | string | Production: Secret Manager secret (e.g. `db-password`) |
| `envVar` | string | `DB_PASSWORD` — read by `Program.cs` at startup |
| `storage` | enum | `secret_manager` (production) \| `deploy_generated` (preview ephemeral) |

**Validation**:
- Cleartext password MUST NOT appear in committed scripts, `appsettings*.json`, or routine deploy logs (FR-006, SC-004).
- Preview generated passwords are disposable test credentials (Constitution VIII).

---

### CloudRunConnectionBinding

| Field | Type | Description |
|-------|------|-------------|
| `serviceName` | string | Preview: `splitrail-preview-{runId}`. Production: project-standard API service name. |
| `cloudSqlInstances` | string[] | Instance connection names passed to `--add-cloudsql-instances` |
| `connectionString` | string | Socket host `/cloudsql/{connectionName}` for Cloud Run runtime |
| `additionalEnv` | map | Preview flags: `ASPNETCORE_ENVIRONMENT=Preview`, fake QBO, seeding |

**Validation**:
- `cloudSqlInstances` MUST include the target instance connection name before service accepts traffic.
- Connection string MUST use socket path on Cloud Run, not public IP.

---

### SchemaMigrationBundle

| Field | Type | Description |
|-------|------|-------------|
| `bundlePath` | path | e.g. `artifacts/efbundle` (self-contained executable) |
| `sourceProject` | path | `apps/api/split-rail-api.csproj` |
| `pendingMigrations` | string[] | Derived from EF migration history at build time |

**State transitions**:

```text
[not_built] → built → executing → applied | failed
```

**Validation**:
- MUST exit non-zero on failure (FR-004).
- MUST complete before `ApplicationService` deployment step begins (FR-003).
- On failure, deploy pipeline MUST abort; service MUST NOT be updated to new revision serving traffic.

---

### ApplicationService

| Field | Type | Description |
|-------|------|-------------|
| `serviceName` | string | Cloud Run service identifier |
| `image` | string | API container image URI |
| `revision` | string | Cloud Run revision created by deploy |
| `url` | string | `PREVIEW_BASE_URL` output for preview |

**State transitions**:

```text
[missing|previous_revision] → deploying → ready → [deleted via teardown for preview]
```

**Validation**:
- `ready` state only after successful migration step and successful `gcloud run deploy`.
- Seeding (`POST /api/test-seed/reset`) only after service is reachable (spec 005).

---

## Entity Relationships

```text
DeployRun 1──1 ManagedDatabaseInstance (preview ephemeral)
DeployRun 1──1 ApplicationService
DeployRun 1──1 SchemaMigrationBundle (built per deploy)
ManagedDatabaseInstance 1──1 CloudRunConnectionBinding (via connectionName)
DatabaseCredentialSecret 1──1 CloudRunConnectionBinding (via DB_PASSWORD)
SchemaMigrationBundle ──applies_to──> ManagedDatabaseInstance (before ApplicationService ready)
```

## Out of Scope (no model changes)

- `ApplicationDbContext` entity models and existing `apps/api/Data/Migrations/*` files remain source of truth for schema; this feature only automates applying them at deploy time.
