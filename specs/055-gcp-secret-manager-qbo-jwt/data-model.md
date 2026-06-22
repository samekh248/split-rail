# Data Model: Centralized Secret Management for Production Credentials

**Feature**: 055-gcp-secret-manager-qbo-jwt (SPLR-48) | **Date**: 2026-06-22

This feature is **infrastructure and configuration-only** — no new EF entities or database tables. The model describes **managed secrets**, **deploy bindings**, and **application configuration resolution** at startup.

## Entities

### ManagedSecret

| Field | Type | Description |
|-------|------|-------------|
| `secretId` | string | GCP Secret Manager secret ID (e.g. `jwt-signing-key`) |
| `purpose` | enum | `database_password` \| `jwt_signing` \| `qbo_client_id` \| `qbo_client_secret` \| `qbo_internal_trigger` |
| `rotationPolicy` | string | Operator-managed; Cloud Run references `:latest` or pinned version |
| `lifecycle` | enum | `persistent` (production) |

**Validation**:
- Secret values MUST NOT appear in committed repository files or deploy script literals (FR-002, FR-003, FR-004, SC-002).
- Production secrets MUST exist in project `split-rail` Secret Manager before Cloud Run deploy.

**Relationships**: One `ManagedSecret` maps to one `SecretBinding` per production `ApplicationService` deployment.

---

### SecretBinding

| Field | Type | Description |
|-------|------|-------------|
| `secretId` | string | Secret Manager secret ID |
| `envVar` | string | Container environment variable name at runtime |
| `version` | string | `latest` or numeric version alias |
| `injector` | enum | `cloud_run_set_secrets` |

**Canonical production bindings**:

| secretId | envVar | Application resolution |
|----------|--------|------------------------|
| `db-password` | `DB_PASSWORD` | Appended to `ConnectionStrings:DefaultConnection` in `Program.cs` |
| `jwt-signing-key` | `Jwt__Secret` | `Jwt:Secret` configuration section |
| `qbo-client-id` | `QBO_CLIENT_ID` | `QboSyncOptions.ClientId` env override |
| `qbo-client-secret` | `QBO_CLIENT_SECRET` | `QboSyncOptions.ClientSecret` env override |
| `qbo-internal-trigger-key` | `QBO_INTERNAL_TRIGGER_KEY` | `QboSyncOptions.InternalTriggerKey` env override |

**Validation**:
- Production deploy script MUST include all five bindings in `--set-secrets` (FR-001).
- Cleartext values MUST NOT be passed via `--set-env-vars` for these keys (FR-006).

---

### ApplicationSecretConfiguration

| Field | Type | Description |
|-------|------|-------------|
| `environment` | enum | `Development` \| `Preview` \| `Production` |
| `jwtSecret` | string | Signing key for access/refresh tokens |
| `qboClientId` | string | Intuit OAuth application ID |
| `qboClientSecret` | string | Intuit OAuth application secret |
| `dbPassword` | string | PostgreSQL password (production via `DB_PASSWORD` only) |
| `qboInternalTriggerKey` | string | Shared key for internal sync trigger authentication |

**State at startup (production)**:

```text
[container start] → env vars injected by Cloud Run → config binding → validation
  → valid: service ready
  → invalid/missing: fail fast (non-zero exit / unhealthy)
```

**Validation**:
- Production: `jwtSecret`, `qboClientId`, `qboClientSecret` MUST be non-empty after resolution (FR-005).
- Production: MUST NOT accept known placeholder values from committed `appsettings.json`.
- Development/Preview: MAY use `appsettings.Development.json`, test overrides, or ephemeral preview credentials (FR-007).

---

### ProductionApplicationService

| Field | Type | Description |
|-------|------|-------------|
| `serviceName` | string | Default `split-rail-api` |
| `gcpProject` | string | `split-rail` |
| `gcpRegion` | string | `us-central1` |
| `secretBindings` | SecretBinding[] | All required production bindings |
| `nonSecretEnv` | map | `ASPNETCORE_ENVIRONMENT=Production`, settlement archive vars, etc. |

**Relationships**: Deployed by `deploy/production/deploy-api.sh` after migration step (spec 053 ordering preserved).

---

### DeployPipeline (secret-aware)

| Step | Secret interaction |
|------|-------------------|
| 1. Build migration bundle | None |
| 2. Run migrations | Deploy runner exports `DB_PASSWORD` from `gcloud secrets versions access` (not in script) |
| 3. `gcloud run deploy` | `--set-secrets` binds all five managed secrets |
| 4. Service startup | Application validates resolved configuration |

**Validation**:
- Step 2 MUST NOT log connection strings with passwords (Constitution VIII).
- Step 3 MUST NOT embed secret values in `--set-env-vars`.

## Infrastructure dependencies (not EF entities)

| Resource | Purpose |
|----------|---------|
| GCP Secret Manager | Stores credential values |
| Cloud Run `--set-secrets` | Injects values as env vars at boot |
| Cloud Run service account | `secretAccessor` on managed secrets |
| `deploy/infra/provision-app-secrets.sh` | Idempotent secret resource creation (no values) |

## Orthogonal systems (out of scope)

| Resource | Purpose |
|----------|---------|
| GCS + KMS (spec 047) | Data Protection key ring XML — not application boot secrets |
| QBO per-venue OAuth tokens | Encrypted in database — not Secret Manager boot secrets |
| Preview ephemeral DB passwords | Generated per preview run — not production secrets |

## Files touched (reference for tasks phase)

- `deploy/production/deploy-api.sh` — EXTEND `--set-secrets`
- `deploy/infra/provision-app-secrets.sh` — NEW
- `apps/api/appsettings.json` — REMOVE production JWT placeholder; clear QBO secret defaults
- `apps/api/appsettings.Development.json` — MAY add `QboSync` dev defaults moved from base
- `apps/api/Program.cs` — EXTEND production secret validation
- `apps/web/src/deploy/assertProductionSecretsContract.ts` — NEW
- `apps/web/tests/deploy/deployProductionApi.test.ts` — EXTEND
- `apps/api.tests/Integration/ProductionSecretConfigurationTests.cs` — NEW
