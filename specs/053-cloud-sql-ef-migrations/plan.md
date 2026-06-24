# Implementation Plan: Managed Database Provisioning and Schema Migration in Deploy

**Branch**: `053-cloud-sql-ef-migrations` | **Date**: 2026-06-21 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/053-cloud-sql-ef-migrations/spec.md`

## Summary

**SPLR-46** closes the database gap blocking spec 005 preview environments and TDD §7 production requirements: deploy scripts currently publish Cloud Run with env vars only — no Cloud SQL provisioning, no Cloud SQL connector wiring, and no schema migration step before traffic.

Current state: `deploy/preview/deploy-preview.sh` builds/pushes images and deploys API to Cloud Run without database connectivity. `deploy/preview/teardown-preview.sh` deletes only the Cloud Run service. `appsettings.json` already targets production socket `/cloudsql/split-rail:us-central1:split-rail-db-prod` and `Program.cs` reads `DB_PASSWORD` from the environment. EF migrations exist under `apps/api/Data/Migrations/` but are only applied manually or in CI E2E setup.

The technical approach:

1. **Shared migration lib** — `deploy/lib/migrate-bundle.sh` builds/runs EF migration bundle via Cloud SQL Auth Proxy; fails fast on non-zero exit.
2. **Preview provision** — `deploy/lib/provision-preview-db.sh` creates ephemeral `db-f1-micro` Cloud SQL instance per `RUN_ID`; extend `deploy-preview.sh` with provision → migrate → deploy ordering (spec 005 contract).
3. **Cloud Run wiring** — `--add-cloudsql-instances`, socket connection string, preview `DB_PASSWORD`; production `--set-secrets` from Secret Manager.
4. **Teardown** — extend `teardown-preview.sh` to delete preview Cloud SQL instance (idempotent).
5. **Production script** — `deploy/production/deploy-api.sh` migrate-then-deploy against `split-rail-db-prod`.
6. **CI** — replace `deploy-preview` job stub with real script when GCP creds available.
7. **Verify** — Vitest deploy contract tests in `apps/web/tests/deploy/`; ≥80% coverage on new verification files (Constitution III). No domain C# changes expected.

## Technical Context

**Language/Version**: Bash deploy scripts; C# / .NET 8 (`apps/api`); EF Core 8 + `dotnet-ef` CLI; TypeScript 5.7 + Vitest (`apps/web/tests/deploy/`).

**Primary Dependencies**: GCP Cloud SQL (PostgreSQL 16), Cloud Run, Secret Manager, Cloud SQL Auth Proxy; `Npgsql.EntityFrameworkCore.PostgreSQL`; existing EF migrations in `apps/api/Data/Migrations/`; `gcloud` CLI.

**Storage**: PostgreSQL 16 on Cloud SQL — preview ephemeral instance per `RUN_ID`; production `split-rail:us-central1:split-rail-db-prod` / database `split-rail-db` (pre-existing).

**Testing**: Vitest contract tests for deploy script ordering and required `gcloud` flags (`apps/web/tests/deploy/`); optional local migration bundle smoke against Docker Postgres (quickstart Scenario 2); full GCP validation optional with credentials. ≥80.0% line/branch coverage on **new/modified frontend verification files** (Constitution III); no backend domain code changes → backend coverage gate unchanged.

**Target Platform**: GCP Cloud Run (API) + Cloud SQL `us-central1`; deploy runners: GitHub Actions / operator shell with `gcloud`.

**Project Type**: Monorepo — `deploy/preview/`, `deploy/production/`, `deploy/lib/` scripts + `apps/web` Vitest verification.

**Performance Goals**: Preview DB provision + migrate + deploy within preview pipeline budget (spec 005 ≈30 min total PR pipeline); production DB step + rollout under 10 minutes (SC-003).

**Constraints**: Migrations MUST complete before Cloud Run deploy (FR-003/FR-004); secure connector only (FR-005); Secret Manager for production credentials (FR-006); preview teardown deletes only run-scoped resources (FR-008); no cleartext passwords in repo/logs (SC-004, Constitution VIII); ≥80.0% coverage on new verification code; missing/unparseable coverage reports fail CI.

**Scale/Scope**: ~5 new bash scripts/libs, ~2 script extensions, ~1 CI job update, ~3–4 new Vitest files. Unblocks spec 005 real preview deploy and TDD §7 production API path.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Applicable? | Status | Notes |
|---|-----------|-------------|--------|-------|
| I | Core Mathematical Axioms | No | N/A | No monetary computation. |
| II | Multi-Tenant Isolation | No | N/A | No new queries or API paths; existing EF filters unchanged. |
| III | Engineering Rigor & Quality Gates | **Yes** | PASS | Vitest deploy contract tests; optional local bundle smoke; ≥80% on new verification files. |
| IV | QBO Integration | No | N/A | No QBO code paths. |
| V | Ledger State Machine | No | N/A | No ledger mutations in deploy layer. |
| VI | Polyglot Contract Serialization | No | N/A | No API/DTO changes. |
| VII | EF Core Axioms | **Yes (light)** | PASS | Uses existing migrations; no new lazy-loading queries. Migration bundle applies authored migrations only. |
| VIII | Exception Governance & Logging Privacy | **Yes** | PASS | No passwords in logs/scripts; Secret Manager for prod; sanitize proxy/bundle output. |
| IX | UI Iconography | No | N/A | No UI changes. |

**Gate result**: All applicable gates PASS. No violations. Complexity Tracking not required.

## Project Structure

### Documentation (this feature)

```text
specs/053-cloud-sql-ef-migrations/
├── plan.md              # This file
├── research.md          # Phase 0 — migration bundle, Cloud SQL preview, secrets
├── data-model.md        # Phase 1 — deploy/infrastructure entities
├── quickstart.md        # Phase 1 — validation scenarios
├── contracts/
│   ├── preview-database-deploy.md
│   └── production-api-deploy.md
├── checklists/
│   └── requirements.md  # From /speckit-specify
└── tasks.md             # Phase 2 (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
deploy/
├── lib/
│   ├── migrate-bundle.sh           # NEW — proxy + EF bundle execution
│   └── provision-preview-db.sh     # NEW — ephemeral Cloud SQL create/wait
├── preview/
│   ├── deploy-preview.sh           # EXTEND — provision → migrate → deploy w/ cloudsql
│   └── teardown-preview.sh         # EXTEND — delete preview Cloud SQL instance
└── production/
    └── deploy-api.sh               # NEW — prod migrate + Cloud Run deploy

apps/web/
├── src/deploy/
│   └── assertCloudSqlDeployContract.ts   # NEW — shared script assertions
└── tests/deploy/
    ├── deployPreviewDatabase.test.ts     # NEW — preview script contract
    └── deployProductionApi.test.ts       # NEW — production script contract

.github/workflows/
    ci.yml                            # EXTEND — real deploy-preview when creds ready
```

**Structure Decision**: Continue monorepo deploy conventions (`deploy/preview/`, `deploy/production/`, shared `deploy/lib/`). Verification in `apps/web/tests/deploy/` following spec 051/052 Vitest contract test pattern. No `apps/api` domain source changes unless bundle build requires a design-time connection shim (prefer env-only).

## Complexity Tracking

No constitution violations to justify.

## Post-Design Constitution Re-Check

*Re-evaluated after Phase 1 design artifacts (research.md, data-model.md, contracts/, quickstart.md).*

| # | Principle | Re-Check | Notes |
|---|-----------|----------|-------|
| III | Engineering Rigor | PASS | Contract tests + quickstart scenarios defined; coverage on new Vitest/parser files. |
| VII | EF Core | PASS | Migration bundle applies existing migrations; no new DbContext query patterns. |
| VIII | Logging Privacy | PASS | Contracts mandate Secret Manager + no cleartext passwords in scripts/logs. |

**Gate result**: PASS — ready for `/speckit-tasks`.

## Phase Summary

| Phase | Artifact | Status |
|-------|----------|--------|
| 0 | [research.md](research.md) | Complete — migration bundle, preview Cloud SQL, secrets, ordering resolved |
| 1 | [data-model.md](data-model.md) | Complete |
| 1 | [contracts/preview-database-deploy.md](contracts/preview-database-deploy.md) | Complete |
| 1 | [contracts/production-api-deploy.md](contracts/production-api-deploy.md) | Complete |
| 1 | [quickstart.md](quickstart.md) | Complete |
| 1 | Agent context | Updated → `specs/053-cloud-sql-ef-migrations/plan.md` |
| 2 | tasks.md | **Not created** — run `/speckit-tasks` |
