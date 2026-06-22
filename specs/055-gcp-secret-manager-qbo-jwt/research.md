# Research: Centralized Secret Management for Production Credentials

**Feature**: 055-gcp-secret-manager-qbo-jwt (SPLR-48) | **Date**: 2026-06-22

## 1. Secret Injection Mechanism for Cloud Run

**Decision**: Bind all production-sensitive credentials via Cloud Run **`--set-secrets`** at deploy time. Secrets are exposed to the container as environment variables; the application reads them using existing ASP.NET Core configuration and explicit `Environment.GetEnvironmentVariable` overrides — **no runtime Secret Manager SDK** in the API process.

**Rationale**:
- Matches the established `DB_PASSWORD=db-password:latest` pattern from spec 053 (`deploy/production/deploy-api.sh`).
- Cloud Run resolves Secret Manager versions at container startup (TDD §7); rotation is a redeploy/revision update referencing `:latest` or a pinned version.
- Avoids adding `Google.Cloud.SecretManager.V1` to the hot path; fewer IAM surfaces inside application code.
- QBO credentials already override from `QBO_CLIENT_ID` / `QBO_CLIENT_SECRET` env vars in `Program.cs`.

**Alternatives considered**:
- **Application pulls secrets at startup via Secret Manager client**: More flexible but duplicates Cloud Run's native binding, adds SDK dependency and secret-name configuration in app code; rejected for boot secrets already supported by `--set-secrets`.
- **Mounted secret files (`--set-secrets` as volumes)**: Valid for file-shaped secrets; rejected — all current consumers expect env vars (`DB_PASSWORD`, `QBO_*`, JWT config section).
- **Terraform-only secret wiring**: Out of scope; project uses bash deploy scripts (spec 053/054 pattern).

## 2. Project-Standard Secret Names and Env Var Mapping

**Decision**: Use the following Secret Manager secret IDs and container env var bindings:

| Secret Manager ID | Container env var | Application consumer |
|-------------------|-------------------|----------------------|
| `db-password` | `DB_PASSWORD` | `Program.cs` connection string append (existing) |
| `jwt-signing-key` | `Jwt__Secret` | ASP.NET `Jwt:Secret` config + JWT bearer signing |
| `qbo-client-id` | `QBO_CLIENT_ID` | `QboSyncOptions.ClientId` override (existing) |
| `qbo-client-secret` | `qbo-client-secret` → `QBO_CLIENT_SECRET` | `QboSyncOptions.ClientSecret` override (existing) |
| `qbo-internal-trigger-key` | `QBO_INTERNAL_TRIGGER_KEY` | `QboSyncOptions.InternalTriggerKey` (production scheduled sync auth) |

Non-secret QBO config (`RedirectUri`, API base URLs) remains in `appsettings.json` or ordinary `--set-env-vars`.

**Rationale**:
- `db-password` already provisioned and bound; zero migration risk for DB path.
- `Jwt__Secret` follows ASP.NET Core environment variable naming (`Section__Key` → `Jwt:Secret`) and is compatible with Cloud Run secret-to-env mapping without code changes beyond validation.
- `QBO_*` env names already implemented in `Program.cs` lines 38–41.
- Internal trigger key is sensitive (authenticates Cloud Scheduler / internal sync trigger); include in managed secrets per spec assumptions.

**Alternatives considered**:
- **`JWT_SECRET` flat env name**: Works with explicit override code but diverges from ASP.NET conventions; `Jwt__Secret` preferred for config binding consistency.
- **Single JSON blob secret for all credentials**: Rejected — harder to rotate individually, violates least-privilege IAM per secret.

## 3. Production Configuration and Placeholder Removal

**Decision**:
- Set `Jwt:Secret` to **empty string** in committed `appsettings.json` (production base config).
- Keep dev secrets only in `appsettings.Development.json` (unchanged pattern).
- Move `QboSync:InternalTriggerKey` dev default out of base `appsettings.json` into Development config or `.env` example.
- Add **production startup validation** in `Program.cs` (or `IStartupFilter` / options validator): when `IsProduction()`, fail fast if `Jwt:Secret`, `QboSync:ClientId`, or `QboSync:ClientSecret` is null/empty or matches known placeholder strings.

**Rationale**:
- FR-002/FR-003/FR-005 require no usable production literals in committed config and fail-fast when secrets missing.
- Current `appsettings.json` contains `replace-with-production-secret-at-least-32-chars` — a footgun if Secret Manager binding is misconfigured.
- Development and test factories continue using `appsettings.Development.json` or test `WithWebHostBuilder` overrides (FR-007).

**Alternatives considered**:
- **Separate `appsettings.Production.json`**: Adds file; empty-secret base config is sufficient when env injection is mandatory.
- **Silent fallback to config file in production**: Rejected — violates FR-005.

## 4. Production Deploy Script Extension

**Decision**: Extend `deploy/production/deploy-api.sh` `gcloud run deploy` with a comma-separated `--set-secrets` binding all five secrets (extending existing `DB_PASSWORD` entry). Migration step continues to require `DB_PASSWORD` in the **deploy runner environment** (fetched via `gcloud secrets versions access` before script — documented in quickstart; not embedded in script).

**Example binding** (illustrative):

```bash
--set-secrets="DB_PASSWORD=db-password:latest,Jwt__Secret=jwt-signing-key:latest,QBO_CLIENT_ID=qbo-client-id:latest,QBO_CLIENT_SECRET=qbo-client-secret:latest,QBO_INTERNAL_TRIGGER_KEY=qbo-internal-trigger-key:latest"
```

**Rationale**:
- Single deploy surface; FR-001 satisfied in one `gcloud run deploy`.
- Comma-joined `--set-secrets` is gcloud-documented for multiple bindings.
- Migration-before-deploy ordering unchanged from spec 053.

**Alternatives considered**:
- **Separate deploy step per secret**: No operational benefit.
- **Preview deploy binding production secrets**: Rejected — preview uses fake QBO and ephemeral DB passwords (FR-007).

## 5. Secret Provisioning (Infrastructure)

**Decision**: Add **`deploy/infra/provision-app-secrets.sh`** — idempotent operator script that creates Secret Manager secrets (if absent) and documents how to add initial versions. Does **not** commit secret values. Optional companion **`deploy/infra/README.md`** snippet or comments in script for `gcloud secrets versions add`.

**Rationale**:
- SPLR-48 scope includes storing secrets in Secret Manager; secrets must exist before deploy.
- Follows `deploy/infra/provision-settlement-buckets.sh` pattern from spec 054.
- Secret *values* are created by operators via `gcloud` or console, never checked into git.

**Alternatives considered**:
- **Terraform module**: Out of scope for this repo's deploy style.
- **No provision script (docs only)**: Weaker DX; script with `gcloud secrets describe || gcloud secrets create` is low cost.

## 6. Automated Verification

**Decision**:
- **Vitest** — extend `apps/web/src/deploy/` with `assertProductionSecretsContract.ts` asserting all required `--set-secrets` bindings, no JWT/QBO literals in `deploy/production/deploy-api.sh`, and empty/placeholder-free production `appsettings.json` JWT/QBO secret fields.
- **xUnit** — `ProductionSecretConfigurationTests` using `WebApplicationFactory<Program>` with `ASPNETCORE_ENVIRONMENT=Production` and missing secrets → startup failure; with injected env secrets → auth token round-trip succeeds.
- Reuse `assertNoHardcodedDbPassword` from spec 053; add `assertNoHardcodedJwtOrQboSecrets` for deploy scripts and base appsettings audit.

**Rationale**:
- FR-008/SC-002 require CI-enforced contract tests (spec 053 precedent).
- Constitution III — ≥80% coverage on new assertion helpers and startup validation code.

**Alternatives considered**:
- **Secret scanning only (gitleaks)**: Complements but does not verify deploy bindings.
- **E2E Playwright for secret wiring**: Overkill; deploy contract + integration startup tests sufficient.

## 7. JWT Rotation Semantics

**Decision**: Document **immediate cutover** on JWT signing key rotation — new key takes effect on cold start; existing access tokens signed with the prior key become invalid after rotation (users re-authenticate). No multi-key validation window in v1.

**Rationale**:
- Symmetric single-key JWT is current architecture (`TokenService` + `SymmetricSecurityKey`).
- SC-005 satisfied by Secret Manager version update + service roll without code change.
- Dual-key validation adds complexity beyond SPLR-48 scope.

**Alternatives considered**:
- **Overlapping signing keys**: Better UX during rotation; deferred — operator can rotate during low-traffic window.

## 8. IAM and Workload Identity

**Decision**: Cloud Run API service account MUST have `roles/secretmanager.secretAccessor` on the five secrets (or project-level if already granted). No service account key files. Provisioning script documents required IAM bindings; validation via deploy + startup success.

**Rationale**:
- Consistent with Workload Identity pattern (spec 047, 054).
- Constitution VIII — no key files in repo.

**Alternatives considered**:
- **Per-secret IAM via script**: Preferred for least privilege; document in quickstart.
