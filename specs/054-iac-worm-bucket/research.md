# Phase 0 Research: Infrastructure-as-Code for Settlement Archive Storage

This document resolves technical decisions for SPLR-47 — codifying WORM settlement archive bucket provisioning and wiring non-preview deployments to real cloud storage.

## 1. Infrastructure tooling choice

- **Decision**: Use **version-controlled bash + `gcloud storage` scripts** under `deploy/infra/`, following the monorepo deploy conventions established in specs 051–053. No Terraform module in v1.
- **Rationale**: The repository already ships production/preview deploy as bash (`deploy/production/deploy-api.sh`, `deploy/preview/deploy-preview.sh`) with Vitest contract tests in `apps/web/tests/deploy/`. Adding a parallel Terraform stack would introduce state backend setup, provider pinning, and a second provisioning path without an existing Terraform footprint. SPLR-47 requires repeatable IaC outcomes, not a specific tool.
- **Alternatives considered**:
  - **Terraform GCS bucket resources** — rejected for v1; no existing `*.tf`, no remote state, higher bootstrap cost. Can migrate later if org standardizes on Terraform.
  - **Manual console-only setup** — rejected; current gap.
  - **Pulumi / Crossplane** — rejected; no project precedent.

## 2. Bucket naming and environment isolation

- **Decision**: Standardize per-environment bucket pairs:

  | Environment | Archive bucket | Staging bucket |
  |-------------|----------------|----------------|
  | `dev` | `split-rail-settlements-dev` | `split-rail-settlements-staging-dev` |
  | `preview`* | `split-rail-settlements-preview` | `split-rail-settlements-staging-preview` |
  | `prod` | `split-rail-settlements-prod` | `split-rail-settlements-staging-prod` |

  *Preview buckets are provisioned for optional real-storage preview runs; ephemeral preview continues to use in-memory archive by default (spec FR-007).

- **Rationale**: FR-004 requires distinct namespaces per environment. Current `appsettings.json` uses `split-rail-settlements-staging` without env suffix for dev — update to `-staging-dev` for isolation. Production archive name matches `.specify/memory/infrastructure.md`.
- **Alternatives considered**:
  - **Single shared staging bucket across envs** — rejected; violates FR-004 and risks cross-environment orphan cleanup collisions.
  - **Suffix `{BucketName}-staging` auto-derivation only** — kept as fallback in `SettlementArchiveOptions.ResolveStagingBucketName()` but deploy/IaC sets explicit env-scoped names.

## 3. WORM retention and bucket lock (archive only)

- **Decision**: Archive buckets provisioned with:
  - Location: `us-central1` (aligned with project region)
  - Storage class: **Standard**
  - Encryption: **Google-managed AES-256** (default GCS server-side encryption)
  - Public access: **Uniform bucket-level access + public access prevention enforced**
  - Retention: **2555 days (7 years)** via `gcloud storage buckets update --retention-period=2555d`
  - Lock: **`--lock-retention-period`** applied only after retention period is verified (irreversible — script warns and requires explicit `CONFIRM_BUCKET_LOCK=true` for prod)

  Staging buckets: same location/class/encryption/public-access posture but **no retention period and no bucket lock**.

- **Rationale**: Matches specs 004/050 requirements and SPLR-47 acceptance criteria. Staging must remain deletable (spec 043).
- **Alternatives considered**:
  - **Nearline/Coldline for archive** — rejected; spec FR-003 requires standard class; legal retrieval latency matters.
  - **CMEK** — deferred; Google-managed encryption satisfies "AES-256 at rest" in Linear scope.

## 4. IAM and Cloud Run identity

- **Decision**: Grant the Cloud Run runtime service account (project default compute SA or dedicated `split-rail-api@` SA) on each environment's bucket pair:

  | Bucket | Roles |
  |--------|-------|
  | Archive | `roles/storage.objectAdmin` (create/get/list; delete blocked by retention regardless) |
  | Staging | `roles/storage.objectAdmin` (create/get/delete for orphan cleanup) |

  Provisioning script binds IAM after bucket creation. Deploy scripts do **not** embed service account keys — Cloud Run uses Workload Identity / ADC (existing `GcsSettlementObjectStorageClient` pattern).

- **Rationale**: Application needs create/copy/sign on archive, full CRUD on staging. No long-lived keys (FR-009, Constitution VIII).
- **Alternatives considered**:
  - **Signed URL only SA with no write** — rejected; finalize requires stage/promote writes.
  - **Separate SA per environment** — optional enhancement; v1 uses same SA with bucket-scoped IAM conditions if feasible, else per-bucket binding on shared SA.

## 5. Archive store selection (application wiring)

- **Decision**: Replace implicit in-memory selection via `PreviewOptions` QBO/seeding flags with explicit environment rules in `Program.cs`:

  1. **`ASPNETCORE_ENVIRONMENT=Preview`** with `Preview__EnableTestSeeding=true` → `InMemorySettlementArchiveStore` (unchanged preview behavior).
  2. **`Development` and `Production`** → `GcsSettlementArchiveStore` (required).
  3. Add **`SettlementArchive:UseInMemoryStore`** bool (default `false`) for local unit tests only — never set in deploy scripts.

  Extend `SettlementArchiveStartupValidator` to run when `EnforceRetentionValidation=true` (not only `IsProduction()`), enabling dev bucket validation when configured.

- **Rationale**: FR-006/FR-008 require non-preview real storage with fail-fast misconfig detection. Coupling archive backend to QBO fake connector is incidental and confusing for dev deployments.
- **Alternatives considered**:
  - **Keep PreviewOptions proxy** — rejected; dev could accidentally stay in-memory if seeding flag toggled.
  - **Require GCS emulator locally** — rejected; local dev uses real dev buckets or explicit in-memory test flag.

## 6. Deploy script integration

- **Decision**:
  - **`deploy/infra/provision-settlement-buckets.sh`** — idempotent create/update for archive + staging given `ENV=dev|preview|prod`.
  - **`deploy/lib/validate-settlement-buckets.sh`** — read-only checks: retention ≥ 2555d on archive, no retention on staging, public access blocked; exit non-zero on failure (FR-010/FR-011).
  - **`deploy/production/deploy-api.sh`** — extend `--set-env-vars` with `SettlementArchive__BucketName`, `SettlementArchive__StagingBucketName`, `SettlementArchive__RetentionYears=7`, `SettlementArchive__EnforceRetentionValidation=true`. Invoke validate script before deploy (or document one-time provision + validate in quickstart).
  - **Preview** — no bucket env vars; in-memory archive preserved (FR-007).
  - **Dev** — one-time `ENV=dev ./deploy/infra/provision-settlement-buckets.sh`; update `appsettings.Development.json` staging bucket to `-staging-dev`.

- **Rationale**: Pairs infrastructure with deploy wiring per SPLR-47 acceptance criteria. Follows spec 053 pattern of bash + Vitest contracts.
- **Alternatives considered**:
  - **Provision buckets inside every production deploy** — rejected; bucket lock is irreversible and slow; provision is infrequent, deploy validates.
  - **Separate dev deploy script** — deferred; dev uses local `dotnet run` + provisioned dev buckets.

## 7. Verification strategy

- **Decision**:
  - **Vitest contract tests** (`apps/web/tests/deploy/`) assert provision script sets retention/lock flags, validate script checks policy, production deploy sets `SettlementArchive__*` env vars.
  - **Optional GCP integration job** (manual or credentialed CI) runs validate against live buckets.
  - **Backend**: extend `SettlementArchiveStartupValidatorTests` if validator scope changes; no new domain logic beyond wiring — existing spec 050 tests cover store behavior.
  - **Coverage**: ≥80% on new Vitest deploy assertion helpers + any touched `Program.cs`/validator lines (Constitution III).

- **Rationale**: CI cannot create locked production buckets on every PR; contract tests prove script content and deploy wiring; optional live validation in quickstart.
- **Alternatives considered**:
  - **Testcontainers GCS** — rejected; no official emulator; heavy.
  - **Only manual validation** — rejected; FR-010 requires automated verification.

## 8. Pre-existing buckets and idempotency

- **Decision**: Provision script uses `gcloud storage buckets describe` → create if missing → update retention/IAM if present. If archive bucket exists with **insufficient** retention or **already locked** with shorter period, script **fails with actionable error** (no silent downgrade). Re-apply with unchanged config is no-op for locked buckets.
- **Rationale**: FR-005 idempotency + edge case for manual pre-provisioned prod bucket from infrastructure memory.
- **Alternatives considered**:
  - **Import-only Terraform** — N/A without Terraform.
  - **Force recreate buckets** — rejected; would destroy legal records.

## 9. Relationship to spec 050

- **Decision**: Spec 050 (SPLR-43) owns application retention-on-promote, overwrite guards, and immutability tests. Spec 054 (SPLR-47) owns **infrastructure provisioning** and **deploy wiring**. Overlap: startup validator and bucket names — 054 ensures buckets exist and deploy passes config; 050 ensures app enforces retention at promote time.
- **Rationale**: Linear explicitly pairs the issues; avoid duplicating app retention logic in 054.
- **Alternatives considered**:
  - **Merge into single spec** — rejected; already split for parallel delivery.

## 10. API and frontend surface

- **Decision**: **No API or frontend changes** expected. Optional error surfacing if startup fails on misconfigured buckets is existing ASP.NET startup failure behavior.
- **Rationale**: Infrastructure-only feature with deploy/config touchpoints.
