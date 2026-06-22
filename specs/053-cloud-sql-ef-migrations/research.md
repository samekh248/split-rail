# Research: Managed Database Provisioning and Schema Migration in Deploy

**Feature**: 053-cloud-sql-ef-migrations (SPLR-46) | **Date**: 2026-06-21

## 1. Migration Execution Mechanism

**Decision**: Produce an **EF Core migration bundle** at build time (`dotnet ef migrations bundle`) and execute the bundle as an explicit deploy step **before** `gcloud run deploy`, using a **Cloud SQL Auth Proxy** TCP connection from the deploy runner (GitHub Actions / Cloud Build / operator shell).

**Rationale**:
- FR-003/FR-004 require migrations to complete before the service serves traffic; running migrations on app startup is rejected (race conditions when Cloud Run scales, partial failure leaves traffic accepted).
- Migration bundles are self-contained (no SDK on deploy runner beyond `dotnet` tool install already used in CI), align with Microsoft guidance for containerized deploys, and fail fast with a clear exit code.
- `dotnet ef database update` from the deploy script is acceptable but requires `dotnet-ef` + full project context; bundles are smaller and faster at deploy time.
- The API `Dockerfile` stays runtime-only (`aspnet:8.0`); bundle is built in CI or a dedicated build step, not baked into the serving container entrypoint.

**Alternatives considered**:
- **Migrations on `Program.cs` startup (`Database.MigrateAsync`)**: Rejected — multiple instances, unclear ordering vs readiness probes, violates explicit pre-traffic step in spec 005 contract.
- **`dotnet ef database update` only (no bundle)**: Works but slower deploy, requires EF tools + project restore on every deploy; bundle is more repeatable for production.
- **Cloud Run Job for migrations only**: Valid for GCP-native orchestration but adds Job definition + IAM surface; defer unless bundle-from-runner proves insufficient — deploy script can invoke bundle synchronously first.

## 2. Preview Ephemeral Database Strategy

**Decision**: Provision a **short-lived Cloud SQL for PostgreSQL instance** per preview run, named `splitrail-preview-${RUN_ID}` (sanitized to GCP naming rules), tier **`db-f1-micro`**, PostgreSQL **16**, region **`GCP_REGION`**, with database `split-rail-db` and a generated password stored only in deploy-time env (not committed).

**Rationale**:
- SPLR-46 and TDD §7 explicitly call for Cloud SQL (not only containerized Postgres).
- Spec 005 preview contract allows Cloud SQL as an alternative to containerized Postgres; Cloud SQL matches production connector/socket semantics (`/cloudsql/CONNECTION_NAME`).
- Per-`RUN_ID` instance guarantees isolation for concurrent PR pipelines (spec 005 edge case).
- `db-f1-micro` satisfies TDD §7 MVP tier and cost constraints in spec assumptions.

**Alternatives considered**:
- **Containerized Postgres sidecar / separate Cloud Run service**: Faster provision but diverges from production connection path; rejected for SPLR-46 Cloud SQL scope.
- **Shared preview instance with per-run logical databases**: Cheaper but weaker isolation; rejected for concurrent PR safety.
- **Reuse production instance for preview**: Catastrophic data risk; explicitly out of scope.

## 3. Production Database Connection

**Decision**: **Connect-only** to existing instance `split-rail:us-central1:split-rail-db-prod` (per `.specify/memory/infrastructure.md`). No new production instance provisioning in this feature — wire deploy to existing topology.

**Rationale**:
- Spec assumptions state production instance already defined; feature wires pipelines rather than redefining infra.
- `appsettings.json` already uses UNIX socket host `/cloudsql/split-rail:us-central1:split-rail-db-prod`.

**Alternatives considered**:
- **Provision new prod instance in deploy script**: Out of scope and risky for live data.

## 4. Cloud Run ↔ Cloud SQL Wiring

**Decision**: Deploy Cloud Run API service with:
- `--add-cloudsql-instances="${INSTANCE_CONNECTION_NAME}"`
- `ConnectionStrings__DefaultConnection` override via env (preview) or default from `appsettings.json` (production socket path)
- `DB_PASSWORD` from **Secret Manager** in production (`--set-secrets=DB_PASSWORD=db-password:latest` or project-standard secret name)
- Preview: password generated at provision time, passed as `--set-env-vars` or ephemeral secret reference for the preview service only

**Rationale**:
- Matches existing `Program.cs` pattern (`DB_PASSWORD` env appended to connection string).
- FR-005/FR-006 satisfied — connector socket, no public IP requirement for app traffic path.
- Constitution VIII — no password in logs; Secret Manager for production.

**Alternatives considered**:
- **Public IP + authorized networks**: Rejected — violates secure connector requirement (FR-005).

## 5. Deploy Script Structure

**Decision**:

| Script | Action |
|--------|--------|
| `deploy/preview/deploy-preview.sh` | EXTEND — after image push: provision preview Cloud SQL → wait ready → run migration bundle via proxy → deploy Cloud Run with cloudsql + DB env → seed |
| `deploy/preview/teardown-preview.sh` | EXTEND — delete Cloud SQL instance `splitrail-preview-${RUN_ID}` (idempotent) |
| `deploy/production/deploy-api.sh` | NEW — run migration bundle against prod via proxy → deploy Cloud Run API with prod cloudsql + secrets |
| `deploy/lib/migrate-bundle.sh` | NEW — shared: start proxy, execute bundle, stop proxy, fail on non-zero |
| `deploy/lib/provision-preview-db.sh` | NEW — create instance + database + user (or use default postgres user) |

**Ordering in preview** (spec 005 contract):

```text
build/push images → provision DB → migrate → deploy Cloud Run → seed → emit URL
```

**Rationale**: Minimal extension of existing scripts; shared lib avoids duplicate proxy/bundle logic. Production script parallels `deploy-web-hosting.sh` (spec 052).

**Alternatives considered**:
- **Single mega-script**: Harder to test and reuse; rejected.
- **Terraform for preview DB**: Out of scope — bash + gcloud matches existing deploy style.

## 6. CI Integration (`deploy-preview` job)

**Decision**: Replace stub in `.github/workflows/ci.yml` `deploy-preview` job with invocation of `deploy/preview/deploy-preview.sh` when GCP credentials are available (`vars.ENABLE_PR_BROWSER_TESTS == 'true'`). Job already has `teardown-preview` with `if: always()`.

**Rationale**: Spec 005 tasks T037/T040 created job skeleton; this feature implements the real deploy path. Until GCP creds configured, keep documented fallback or fail clearly.

**Alternatives considered**:
- **Always run real GCP preview on every PR**: Cost/latency — gated by existing `ENABLE_PR_BROWSER_TESTS` variable.

## 7. Verification and Coverage Strategy

**Decision**:
- **Vitest deploy contract tests** in `apps/web/tests/deploy/` (existing pattern): assert `deploy-preview.sh`, `teardown-preview.sh`, and `deploy/production/deploy-api.sh` contain required steps (`add-cloudsql-instances`, migration bundle invocation before `gcloud run deploy`, no hardcoded passwords).
- **Shared TypeScript helpers** `parseDeployPreviewScript.ts` / `assertCloudSqlDeployContract.ts` for reusable assertions (mirror `parseFirebaseHostingConfig.ts`).
- **Optional smoke script** `deploy/preview/smoke-migrate-bundle.sh` — build bundle locally against Testcontainers Postgres (documented in quickstart).
- **No new domain C# code** expected → backend coverage gate unchanged; ≥80% on new frontend verification files (Constitution III).

**Rationale**: Infrastructure features verified via contract tests on scripts (spec 051/052 precedent). Full GCP integration validated manually or in credentialed CI.

**Alternatives considered**:
- **xUnit tests for bash**: No established pattern; Vitest string contract tests suffice.
- **Skip automated verification**: Violates Constitution III for new testable artifacts.

## 8. Migration Bundle Build Location

**Decision**: Build bundle in **CI / deploy script** before migrate step:

```bash
dotnet ef migrations bundle \
  --project apps/api/split-rail-api.csproj \
  --configuration Release \
  --output ./artifacts/efbundle \
  --self-contained
```

Connection at runtime via env:

```bash
ConnectionStrings__DefaultConnection="Host=127.0.0.1;Port=5432;Database=split-rail-db;Username=postgres;..."
DB_PASSWORD=...
./artifacts/efbundle --connection "$CONNECTION_STRING"
```

**Rationale**: Bundle carries migration assemblies; proxy exposes Cloud SQL on localhost for the bundle executable.

**Alternatives considered**:
- **Bundle inside API Docker image**: Increases image size and blurs migrate vs serve responsibilities; rejected.

## 9. Preview Connection String Override

**Decision**: Set `ConnectionStrings__DefaultConnection` on Cloud Run for preview to socket host `/cloudsql/${INSTANCE_CONNECTION_NAME}` matching production pattern, not localhost.

**Rationale**: App on Cloud Run must use socket connector; localhost is only for migrate step on deploy runner via proxy.

**Alternatives considered**:
- **TCP to instance IP from Cloud Run**: Less secure and not the project axiom in infrastructure.md.
