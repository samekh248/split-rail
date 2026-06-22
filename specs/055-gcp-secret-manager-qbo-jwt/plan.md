# Implementation Plan: Centralized Secret Management for Production Credentials

**Branch**: `055-gcp-secret-manager-qbo-jwt` | **Date**: 2026-06-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/055-gcp-secret-manager-qbo-jwt/spec.md` (Linear SPLR-48)

## Summary

**SPLR-48** closes the security gap where the API reads QuickBooks credentials, database password, and JWT signing key from plain environment variables and committed configuration placeholders, while production deploy only partially wires Secret Manager (`DB_PASSWORD` from spec 053).

Current state: `deploy/production/deploy-api.sh` binds `DB_PASSWORD=db-password:latest` only. `appsettings.json` contains a JWT placeholder (`replace-with-production-secret-at-least-32-chars`) and a dev `InternalTriggerKey`. `Program.cs` already overrides QBO credentials from `QBO_CLIENT_ID` / `QBO_CLIENT_SECRET` env vars but production deploy does not inject them from Secret Manager. JWT reads solely from config with no production validation.

The technical approach:

1. **Extend production deploy** — add `--set-secrets` bindings for `Jwt__Secret`, `QBO_CLIENT_ID`, `QBO_CLIENT_SECRET`, `QBO_INTERNAL_TRIGGER_KEY` alongside existing `DB_PASSWORD`.
2. **Sanitize committed config** — empty JWT/QBO secret fields in `appsettings.json`; move dev-only defaults to `appsettings.Development.json`.
3. **Production startup validation** — fail fast in `Program.cs` when required secrets are missing or placeholder in Production environment (FR-005).
4. **Provision script** — `deploy/infra/provision-app-secrets.sh` for idempotent Secret Manager resource creation (no values in repo).
5. **Verification** — Vitest deploy contract assertions + xUnit production startup tests; ≥80% coverage on new code (Constitution III).

**Builds on** spec 053 (`DB_PASSWORD` binding, migration ordering) and spec 047 (Secret Manager reserved for boot secrets, orthogonal to Data Protection key ring).

## Technical Context

**Language/Version**: Bash deploy scripts; C# / .NET 8 (`apps/api`); TypeScript 5.7 + Vitest (`apps/web/tests/deploy/`).

**Primary Dependencies**: GCP Secret Manager; Cloud Run `--set-secrets`; existing `JwtSettings`, `QboSyncOptions`, `Program.cs` env override pattern; `gcloud` CLI.

**Storage**: Secret Manager secrets (values external to repo). No EF migrations.

**Testing**: Vitest contract tests for deploy bindings and appsettings hygiene; xUnit `WebApplicationFactory` integration tests for production startup validation; ≥80.0% line/branch coverage on new/modified verification and validation code (Constitution III); frontend gate applies to new Vitest modules only.

**Target Platform**: GCP project `split-rail`, region `us-central1`; Cloud Run API (`split-rail-api`).

**Project Type**: Monorepo — `deploy/infra/`, `deploy/production/`, minimal `apps/api` config/startup changes, Vitest deploy assertions.

**Performance Goals**: No runtime Secret Manager API calls; env injection at boot only. Deploy script addition is negligible.

**Constraints**: No cleartext production secrets in repo/deploy scripts/logs (Constitution VIII, FR-006); production MUST fail fast without secrets (FR-005); preview/local dev unchanged (FR-007); JWT rotation is immediate cutover (research §7); ≥80.0% coverage on touched code; missing/unparseable coverage reports fail CI.

**Scale/Scope**: ~1 new bash provision script, ~1 deploy script extension, small `Program.cs` + `appsettings` diff, ~1 Vitest assertion module + test extensions, ~1 xUnit integration test file. No API routes, no frontend UI, no EF changes.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Applicable? | Status | Notes |
|---|-----------|-------------|--------|-------|
| I | Core Mathematical Axioms | No | N/A | No monetary computation. |
| II | Multi-Tenant Isolation | No | N/A | No new queries. |
| III | Engineering Rigor & Quality Gates | **Yes** | PASS | Vitest deploy contracts; xUnit production startup tests; ≥80% on new validation code. |
| IV | QBO Integration | **Yes (light)** | PASS | Wires existing read-only QBO client credentials; no new Intuit mutation paths. |
| V | Ledger State Machine | No | N/A | No ledger mutation paths. |
| VI | Polyglot Contract Serialization | No | N/A | No API/DTO changes. |
| VII | EF Core Axioms | No | N/A | No EF changes. |
| VIII | Exception Governance & Logging Privacy | **Yes** | PASS | No secrets in scripts/logs; startup errors sanitized; Secret Manager for prod credentials. |
| IX | UI Iconography | No | N/A | No UI changes. |

**Gate result**: All applicable gates PASS. No violations. Complexity Tracking not required.

## Project Structure

### Documentation (this feature)

```text
specs/055-gcp-secret-manager-qbo-jwt/
├── plan.md              # This file
├── research.md          # Phase 0 — Secret Manager binding, naming, validation
├── data-model.md        # Phase 1 — secret/binding entities
├── quickstart.md        # Phase 1 — validation scenarios
├── contracts/
│   ├── production-secret-bindings.md
│   └── committed-config-hygiene.md
├── checklists/
│   └── requirements.md  # From /speckit-specify
└── tasks.md             # Phase 2 (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
deploy/
├── infra/
│   └── provision-app-secrets.sh       # NEW — idempotent Secret Manager resource create
└── production/
    └── deploy-api.sh                  # EXTEND — full --set-secrets bindings

apps/api/
├── appsettings.json                   # MODIFY — empty Jwt/QBO secrets; no dev trigger key
├── appsettings.Development.json       # MAY EXTEND — QboSync dev defaults
└── Program.cs                         # EXTEND — production secret validation

apps/web/src/deploy/
├── assertCloudSqlDeployContract.ts    # EXISTING — DB_PASSWORD binding
└── assertProductionSecretsContract.ts  # NEW — JWT/QBO bindings + appsettings hygiene

apps/web/tests/deploy/
├── deployProductionApi.test.ts        # EXTEND — all secret bindings
└── assertProductionSecretsContract.test.ts  # NEW — assertion unit tests

apps/api.tests/
└── Integration/
    └── ProductionSecretConfigurationTests.cs  # NEW — startup fail/pass
```

**Structure Decision**: Follow spec 053/054 bash + Vitest contract test pattern. Application changes limited to config hygiene and production startup guards — no Secret Manager SDK in runtime.

## Complexity Tracking

No constitution violations to justify.

## Post-Design Constitution Re-Check

*Re-evaluated after Phase 1 design artifacts (research.md, data-model.md, contracts/, quickstart.md).*

| # | Principle | Re-Check | Notes |
|---|-----------|----------|-------|
| III | Engineering Rigor | PASS | Contract tests + integration startup tests; coverage on new modules. |
| IV | QBO Integration | PASS | Credential wiring only; read-only QBO boundary unchanged. |
| VIII | Logging Privacy | PASS | Contracts prohibit cleartext secrets in scripts/config/logs; fail-fast without leaking values. |

**Gate result**: PASS — ready for `/speckit-tasks`.

## Phase 0 & Phase 1 Outputs

| Artifact | Path | Status |
|----------|------|--------|
| Research | [research.md](./research.md) | Complete |
| Data model | [data-model.md](./data-model.md) | Complete |
| Contracts | [contracts/production-secret-bindings.md](./contracts/production-secret-bindings.md), [contracts/committed-config-hygiene.md](./contracts/committed-config-hygiene.md) | Complete |
| Quickstart | [quickstart.md](./quickstart.md) | Complete |

**Next**: Run `/speckit-tasks` to generate dependency-ordered `tasks.md`.
