# Implementation Plan: Scheduled QBO Sync Trigger for Deployed Environments

**Branch**: `057-qbo-scheduler-oidc-sync` | **Date**: 2026-06-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/057-qbo-scheduler-oidc-sync/spec.md` (Linear SPLR-49)

## Summary

**SPLR-49** closes the operational gap where the internal QBO sync trigger route exists and the in-process timer is disabled in production, but **no Cloud Scheduler job** invokes it on the required 6-hour cadence. TDD §5/§7 mandate an authenticated OIDC HTTP POST from Cloud Scheduler.

Current state: `POST /api/internal/qbo-sync-trigger` authenticates via `X-Internal-Sync-Key` shared secret (interim spec 055 binding). `QboSyncHostedService` disables in-process timer in production. No `deploy/infra/` scheduler provisioning exists.

The technical approach:

1. **OIDC endpoint auth** — replace production shared-key auth with Google service-account JWT validation (`SchedulerTrigger` policy); dev retains in-process timer + optional key for tests.
2. **`deploy/infra/provision-qbo-scheduler.sh/.ps1`** — idempotent SA + Cloud Scheduler job (`0 */6 * * *`, HTTP POST, OIDC).
3. **`deploy/lib/validate-qbo-scheduler.sh/.ps1`** — automated job/schedule/URI/OIDC checks.
4. **Production deploy** — add `QboSync__SchedulerServiceAccountEmail` and `QboSync__SchedulerTokenAudience` env vars; remove `QBO_INTERNAL_TRIGGER_KEY` secret binding; pre-deploy validate step.
5. **Concurrency guard** — `SemaphoreSlim` on `SyncAllEligibleEventsAsync` for overlapping triggers.
6. **Verification** — xUnit OIDC auth matrix + production startup tests; Vitest deploy contract tests; ≥80% coverage on new code (Constitution III).

**Builds on** spec 003 (sync service + trigger route), spec 055 (Secret Manager — supersedes shared-key scheduler auth).

## Technical Context

**Language/Version**: Bash + PowerShell deploy/IaC scripts; C# / .NET 8 (`apps/api` auth + sync guard); TypeScript 5.7 + Vitest (`apps/web/tests/deploy/`).

**Primary Dependencies**: GCP Cloud Scheduler (`gcloud scheduler`); GCP IAM service accounts; Google OIDC JWT validation (`Microsoft.AspNetCore.Authentication.JwtBearer`); existing `QboSyncService`, `QboInternalSyncController`, `QboSyncOptions`.

**Storage**: No EF migrations. Configuration-only (`QboSyncOptions` new fields). Scheduler job + SA are GCP resources.

**Testing**: xUnit integration tests for OIDC accept/reject matrix and production startup validation; xUnit unit tests for `ProductionSecretConfigurationValidator` and sync concurrency guard; Vitest deploy contract tests for provision/validate/deploy scripts (both platforms); ≥80.0% line/branch coverage on new/modified backend and frontend verification code (Constitution III); missing/unparseable coverage reports fail CI.

**Target Platform**: GCP project `split-rail`, region `us-central1`; Cloud Run API (`split-rail-api`); Cloud Scheduler HTTP jobs.

**Project Type**: Monorepo — `deploy/infra/`, `deploy/lib/`, `deploy/production/` + `apps/api` auth/config changes + Vitest deploy assertions.

**Performance Goals**: Scheduler trigger overhead negligible; sync batch duration unchanged from spec 003; provision script completes in seconds.

**Constraints**: OIDC-only auth in production (no shared key); no SA keys in repo/logs (Constitution VIII); preview omits scheduler; paired `.sh`/`.ps1` for operator scripts (Constitution §X); ≥80.0% coverage on touched code; missing/unparseable coverage reports fail CI; QBO read-only integration unchanged (Constitution IV).

**Scale/Scope**: ~3 new script pairs (provision, validate, names), ~2 deploy script extensions, `Program.cs` + controller + options + validator diff, ~1 Vitest module + assertion helpers, xUnit test extensions. No frontend UI, no EF migrations, no user-facing API changes.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Applicable? | Status | Notes |
|---|-----------|-------------|--------|-------|
| I | Core Mathematical Axioms | No | N/A | No monetary computation. |
| II | Multi-Tenant Isolation | No | N/A | Sync uses existing scoped queries. |
| III | Engineering Rigor & Quality Gates | **Yes** | PASS | xUnit OIDC + startup tests; Vitest deploy contracts; ≥80% on new code. |
| IV | QBO Integration | **Yes (light)** | PASS | Triggers existing read-only sync; no new Intuit mutation paths. |
| V | Ledger State Machine | No | N/A | No new ledger mutation paths. |
| VI | Polyglot Contract Serialization | No | N/A | No user-facing API/DTO changes. |
| VII | EF Core Axioms | No | N/A | No EF changes. |
| VIII | Exception Governance & Logging Privacy | **Yes** | PASS | No tokens/keys in logs; OIDC replaces shared secret in prod. |
| IX | UI Iconography | No | N/A | No UI changes. |
| X | Dual-Platform Operator Scripts | **Yes** | PASS | Paired `.sh`/`.ps1` for provision, validate, names libs. |

**Gate result**: All applicable gates PASS. No violations. Complexity Tracking not required.

## Project Structure

### Documentation (this feature)

```text
specs/057-qbo-scheduler-oidc-sync/
├── plan.md              # This file
├── research.md          # Phase 0 — OIDC auth, scheduler config, script layout
├── data-model.md        # Phase 1 — scheduler/SA/config entities
├── quickstart.md        # Phase 1 — validation scenarios
├── contracts/
│   ├── qbo-scheduler-provision.md
│   └── internal-sync-trigger-auth.md
├── checklists/
│   └── requirements.md  # From /speckit-specify
└── tasks.md             # Phase 2 (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
deploy/
├── infra/
│   └── provision-qbo-scheduler.sh          # NEW
│   └── provision-qbo-scheduler.ps1         # NEW
├── lib/
│   ├── qbo-scheduler-names.sh              # NEW
│   ├── qbo-scheduler-names.ps1             # NEW
│   ├── validate-qbo-scheduler.sh           # NEW
│   └── validate-qbo-scheduler.ps1            # NEW
└── production/
    ├── deploy-api.sh                       # EXTEND — scheduler env vars, validate, remove trigger key secret
    └── deploy-api.ps1                      # EXTEND — parity

apps/api/
├── Configuration/
│   ├── QboSyncOptions.cs                   # EXTEND — SchedulerServiceAccountEmail, SchedulerTokenAudience
│   └── ProductionSecretConfigurationValidator.cs  # MODIFY — scheduler SA required; drop InternalTriggerKey
├── Authorization/
│   └── SchedulerTriggerAuthorization.cs    # NEW — policy handler (or inline in Program.cs)
├── Controllers/
│   └── QboSyncController.cs                # MODIFY — QboInternalSyncController OIDC [Authorize]
├── Services/
│   └── QboSyncService.cs                   # MODIFY — SemaphoreSlim on SyncAllEligibleEventsAsync
├── Program.cs                              # MODIFY — GoogleScheduler JWT scheme + policy registration
├── appsettings.json                        # UPDATE — scheduler config placeholders (empty)
└── appsettings.Development.json            # UNCHANGED — in-process timer + dev key

apps/api.tests/
├── Integration/
│   └── QboInternalSyncControllerTests.cs   # EXTEND — OIDC matrix
└── Unit/
    └── ProductionSecretConfigurationValidatorTests.cs  # EXTEND — scheduler SA validation

apps/web/src/deploy/
└── assertQboSchedulerContract.ts           # NEW — shared script assertions

apps/web/tests/deploy/
├── deployQboScheduler.test.ts            # NEW — provision/validate contracts
└── deployProductionApi.test.ts           # EXTEND — scheduler env vars; no trigger key secret

.specify/memory/
└── infrastructure.md                       # UPDATE — scheduler job + SA references
```

**Structure Decision**: Follow specs 054/055 bash + Vitest contract test pattern. Application-level OIDC validation keeps user-facing Cloud Run routes unaffected. Supersedes spec 055 shared-key scheduler auth in production deploy.

## Complexity Tracking

No constitution violations to justify.

## Post-Design Constitution Re-Check

*Re-evaluated after Phase 1 design artifacts (research.md, data-model.md, contracts/, quickstart.md).*

| # | Principle | Re-Check | Notes |
|---|-----------|----------|-------|
| III | Engineering Rigor | PASS | OIDC integration tests + deploy contracts + coverage on new modules. |
| IV | QBO read-only | PASS | Triggers existing `SyncAllEligibleEventsAsync`; no Intuit writes. |
| VIII | Logging Privacy | PASS | Contracts prohibit token/key logging; OIDC replaces shared secret. |
| X | Dual-platform scripts | PASS | All new deploy scripts ship paired `.sh`/`.ps1`. |

**Gate result**: PASS — ready for `/speckit-tasks`.

## Phase 0 & Phase 1 Outputs

| Artifact | Path | Status |
|----------|------|--------|
| Research | [research.md](./research.md) | Complete |
| Data model | [data-model.md](./data-model.md) | Complete |
| Contracts | [contracts/qbo-scheduler-provision.md](./contracts/qbo-scheduler-provision.md), [contracts/internal-sync-trigger-auth.md](./contracts/internal-sync-trigger-auth.md) | Complete |
| Quickstart | [quickstart.md](./quickstart.md) | Complete |

**Next**: Run `/speckit-tasks` to generate dependency-ordered `tasks.md`.
