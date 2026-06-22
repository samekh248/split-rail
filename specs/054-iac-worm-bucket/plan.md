# Implementation Plan: Infrastructure-as-Code for Settlement Archive Storage

**Branch**: `054-iac-worm-bucket` | **Date**: 2026-06-21 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/054-iac-worm-bucket/spec.md` (Linear SPLR-47)

## Summary

**SPLR-47** closes the infrastructure gap where settlement PDF archive storage has no repeatable provisioning and preview uses an in-memory store while dev/production lack codified bucket + deploy wiring. TDD §7 requires GCS buckets with Object Retention / Bucket Lock (WORM).

Current state: `GcsSettlementArchiveStore` and `SettlementArchiveStartupValidator` exist (spec 050), but buckets are documented only in `.specify/memory/infrastructure.md`. `Program.cs` selects in-memory storage when preview seeding/QBO fake flags are set; `deploy/production/deploy-api.sh` does not pass `SettlementArchive__*` env vars. No `deploy/infra/` provisioning scripts exist.

The technical approach:

1. **`deploy/infra/provision-settlement-buckets.sh`** — idempotent gcloud provisioning for archive (7-year retention + optional lock) and staging (no lock) per `ENV=dev|preview|prod`.
2. **`deploy/lib/validate-settlement-buckets.sh`** — automated retention/public-access checks (FR-010).
3. **Production deploy** — extend `deploy-api.sh` with `SettlementArchive__*` env vars; optional pre-deploy validate step.
4. **Application wiring** — explicit GCS backend for Development/Production; decouple from `PreviewOptions`; extend startup validator when `EnforceRetentionValidation=true`.
5. **Config alignment** — env-scoped staging bucket names (`-staging-dev`, `-staging-prod`); add `UseInMemoryStore` for tests only.
6. **Verification** — Vitest deploy contract tests in `apps/web/tests/deploy/`; ≥80% coverage on new assertion code (Constitution III). Minimal backend diff for `Program.cs`/validator scope.

**Pairs with** spec 050 (application retention-on-promote); does not duplicate store immutability logic.

## Technical Context

**Language/Version**: Bash deploy/IaC scripts; C# / .NET 8 (`apps/api` wiring only); TypeScript 5.7 + Vitest (`apps/web/tests/deploy/`).

**Primary Dependencies**: GCP Cloud Storage (`gcloud storage`); existing `Google.Cloud.Storage.V1` client; Cloud Run Workload Identity; existing `SettlementArchiveOptions`, `GcsSettlementArchiveStore`, `SettlementArchiveStartupValidator` (spec 050).

**Storage**: GCS bucket pairs per environment — archive (WORM, 7-year retention + Bucket Lock on prod) + staging (deletable). No database migrations.

**Testing**: Vitest contract tests for provision/validate/deploy scripts; optional GCP live validation via quickstart; xUnit for any touched `Program.cs`/validator lines; ≥80.0% line/branch coverage on new/modified verification files (Constitution III); frontend gate N/A unless UI touched.

**Target Platform**: GCP project `split-rail`, region `us-central1`; Cloud Run API + operator/CI shell with `gcloud`.

**Project Type**: Monorepo — `deploy/infra/`, `deploy/lib/`, `deploy/production/` + minimal `apps/api` DI/config wiring.

**Performance Goals**: Provision script completes in minutes (one-time/infrequent); validate script <30s; no change to finalize latency.

**Constraints**: Bucket Lock irreversible on prod (explicit operator confirm); staging MUST remain deletable; no SA keys in repo/logs (Constitution VIII); non-preview MUST NOT silently use in-memory store (FR-006/FR-008); retention 7 years aligned with specs 004/050; ≥80.0% coverage on touched code; missing/unparseable coverage reports fail CI.

**Scale/Scope**: ~3 new bash scripts, ~2 script extensions, ~1 Vitest file + assertion helpers, small `Program.cs`/options/validator diff, `appsettings` updates. No API routes, no frontend, no EF migrations.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Applicable? | Status | Notes |
|---|-----------|-------------|--------|-------|
| I | Core Mathematical Axioms | No | N/A | No monetary computation. |
| II | Multi-Tenant Isolation | No | N/A | No new queries; archive paths unchanged. |
| III | Engineering Rigor & Quality Gates | **Yes** | PASS | Vitest IaC contract tests; optional live validate; xUnit for wiring changes; ≥80% on new verification code. |
| IV | QBO Integration | No | N/A | No QBO paths. |
| V | Ledger State Machine | **Yes (light)** | PASS | Provisioning enables immutable archive invariant; no new mutation paths. |
| VI | Polyglot Contract Serialization | No | N/A | No API/DTO changes. |
| VII | EF Core Axioms | No | N/A | No EF changes. |
| VIII | Exception Governance & Logging Privacy | **Yes** | PASS | No credentials/keys in scripts/logs; signed URL secrets not in deploy output. |
| IX | UI Iconography | No | N/A | No UI changes. |

**Gate result**: All applicable gates PASS. No violations. Complexity Tracking not required.

## Project Structure

### Documentation (this feature)

```text
specs/054-iac-worm-bucket/
├── plan.md              # This file
├── research.md          # Phase 0 — gcloud IaC, naming, IAM, deploy wiring
├── data-model.md        # Phase 1 — bucket/binding entities
├── quickstart.md        # Phase 1 — validation scenarios
├── contracts/
│   ├── settlement-buckets-provision.md
│   └── non-preview-deploy-wiring.md
├── checklists/
│   └── requirements.md  # From /speckit-specify
└── tasks.md             # Phase 2 (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
deploy/
├── infra/
│   └── provision-settlement-buckets.sh    # NEW — ENV=dev|preview|prod
├── lib/
│   └── validate-settlement-buckets.sh     # NEW — retention/public-access checks
└── production/
    └── deploy-api.sh                      # EXTEND — SettlementArchive__* env vars + validate

apps/api/
├── Configuration/
│   └── SettlementArchiveOptions.cs        # EXTEND — UseInMemoryStore (tests only)
├── Program.cs                             # MODIFY — explicit Gcs vs in-memory selection
└── Services/
    └── SettlementArchiveStartupValidator.cs  # MODIFY — EnforceRetentionValidation scope

apps/api/
├── appsettings.json                       # UPDATE — staging-dev suffix
└── appsettings.Development.json           # UPDATE — staging-dev, EnforceRetentionValidation

apps/web/src/deploy/
└── assertSettlementBucketContract.ts      # NEW — shared script assertions

apps/web/tests/deploy/
├── deploySettlementBuckets.test.ts        # NEW — provision/validate contracts
└── deployProductionApi.test.ts            # EXTEND — SettlementArchive env vars

.specify/memory/
└── infrastructure.md                      # UPDATE — staging-prod bucket name
```

**Structure Decision**: Follow spec 053 bash + Vitest contract test pattern. Infrastructure lives under `deploy/infra/` (new) rather than introducing Terraform. Minimal backend wiring to satisfy FR-006/FR-008 without duplicating spec 050 store logic.

## Complexity Tracking

No constitution violations to justify.

## Post-Design Constitution Re-Check

*Re-evaluated after Phase 1 design artifacts (research.md, data-model.md, contracts/, quickstart.md).*

| # | Principle | Re-Check | Notes |
|---|-----------|----------|-------|
| III | Engineering Rigor | PASS | Contract tests + quickstart scenarios; coverage on new Vitest/helpers and any validator wiring. |
| V | Ledger immutability | PASS | IaC enables WORM archive prerequisite; app guards unchanged from spec 050. |
| VIII | Logging Privacy | PASS | Contracts prohibit SA keys and secrets in scripts/logs. |

**Gate result**: PASS — ready for `/speckit-tasks`.

## Phase 0 & Phase 1 Outputs

| Artifact | Path | Status |
|----------|------|--------|
| Research | [research.md](./research.md) | Complete |
| Data model | [data-model.md](./data-model.md) | Complete |
| Contracts | [contracts/settlement-buckets-provision.md](./contracts/settlement-buckets-provision.md), [contracts/non-preview-deploy-wiring.md](./contracts/non-preview-deploy-wiring.md) | Complete |
| Quickstart | [quickstart.md](./quickstart.md) | Complete |

**Next**: Run `/speckit-tasks` to generate dependency-ordered `tasks.md`.
