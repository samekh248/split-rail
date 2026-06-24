# Data Model: Infrastructure-as-Code for Settlement Archive Storage

**Feature**: 054-iac-worm-bucket (SPLR-47) | **Date**: 2026-06-21

This feature is **infrastructure-only** — no new application domain tables or EF entity changes. The model describes **cloud storage resources**, **environment bindings**, and **provision/validate lifecycle** artifacts.

## Entities

### SettlementArchiveBucket

WORM-protected bucket for finalized settlement PDFs.

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | e.g. `split-rail-settlements-prod` |
| `environment` | enum | `dev` \| `preview` \| `prod` |
| `location` | string | `us-central1` |
| `storageClass` | string | `STANDARD` |
| `retentionPeriodDays` | int | `2555` (7 years) |
| `retentionLocked` | bool | Bucket Lock applied (irreversible) |
| `publicAccessPrevention` | enum | `enforced` |
| `encryption` | string | Google-managed AES-256 (default) |

**Validation**:
- `retentionPeriodDays` MUST be ≥ 2555 for archive buckets (FR-001).
- `retentionLocked` MUST be `true` in production after initial provision.
- MUST NOT allow public read (FR-003).

**State transitions**:

```text
[absent] → created → retention_configured → locked → [immutable config]
```

---

### SettlementStagingBucket

Deletable bucket for in-flight finalize uploads (spec 043).

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | e.g. `split-rail-settlements-staging-prod` |
| `environment` | enum | `dev` \| `preview` \| `prod` |
| `location` | string | `us-central1` |
| `storageClass` | string | `STANDARD` |
| `retentionPeriodDays` | int | `0` (none) |
| `retentionLocked` | bool | MUST be `false` |

**Validation**:
- MUST NOT have Object Retention / Bucket Lock (FR-002, spec 043).
- Same encryption and public-access posture as archive buckets.

**State transitions**:

```text
[absent] → created → iam_configured → in_use
```

---

### EnvironmentStorageBinding

Deploy/runtime mapping from environment to bucket pair and application config.

| Field | Type | Description |
|-------|------|-------------|
| `environment` | enum | `dev` \| `preview` \| `prod` |
| `archiveBucketName` | string | Maps to `SettlementArchive:BucketName` |
| `stagingBucketName` | string | Maps to `SettlementArchive:StagingBucketName` |
| `retentionYears` | int | `7` — must match archive bucket policy |
| `enforceRetentionValidation` | bool | `true` for dev/prod non-preview; `false` for local test overrides |
| `archiveStoreBackend` | enum | `gcs` (dev/prod) \| `in_memory` (preview default) |

**Validation**:
- `archiveBucketName` and `stagingBucketName` MUST be unique per environment (FR-004).
- Non-preview bindings MUST use `archiveStoreBackend = gcs` (FR-006).
- Preview MAY use `in_memory` without bucket binding (FR-007).

---

### CloudRunStorageIamBinding

IAM grant linking Cloud Run runtime identity to bucket operations.

| Field | Type | Description |
|-------|------|-------------|
| `serviceAccountEmail` | string | Cloud Run runtime SA |
| `archiveBucket` | string | Archive bucket name |
| `stagingBucket` | string | Staging bucket name |
| `role` | string | `roles/storage.objectAdmin` per bucket |

**Validation**:
- MUST NOT create or commit JSON key files (FR-009, Constitution VIII).
- Bindings scoped to environment-specific buckets only.

---

### InfrastructureProvisionRun

Single execution of settlement bucket provisioning.

| Field | Type | Description |
|-------|------|-------------|
| `environment` | enum | `dev` \| `preview` \| `prod` |
| `gcpProject` | string | `split-rail` |
| `gcpRegion` | string | `us-central1` |
| `confirmBucketLock` | bool | Required `true` for prod lock step |

**State transitions**:

```text
[started] → archive_created → staging_created → iam_bound → validated → complete | failed
```

**Validation**:
- Prod lock step MUST require explicit operator confirmation (irreversible).
- MUST exit non-zero on validation failure.

---

### BucketValidationResult

Output of read-only validation script (CI or pre-deploy).

| Field | Type | Description |
|-------|------|-------------|
| `archiveBucket` | string | Target archive bucket |
| `retentionOk` | bool | Retention ≥ 2555 days |
| `lockOk` | bool | Bucket lock active (prod) |
| `stagingDeletable` | bool | No retention on staging |
| `publicAccessBlocked` | bool | Public access prevention enforced |

**Validation**:
- Any `false` → exit code non-zero (FR-010, SC-005).

---

## Entity Relationships

```text
EnvironmentStorageBinding 1──1 SettlementArchiveBucket
EnvironmentStorageBinding 1──1 SettlementStagingBucket
CloudRunStorageIamBinding N──2 (archive + staging buckets)
InfrastructureProvisionRun 1──2 SettlementArchiveBucket + SettlementStagingBucket
BucketValidationResult ──validates──> SettlementArchiveBucket + SettlementStagingBucket
```

## Configuration mapping (application)

Existing `SettlementArchiveOptions` — no schema migration:

| Option | Dev example | Prod example |
|--------|-------------|--------------|
| `BucketName` | `split-rail-settlements-dev` | `split-rail-settlements-prod` |
| `StagingBucketName` | `split-rail-settlements-staging-dev` | `split-rail-settlements-staging-prod` |
| `RetentionYears` | `7` | `7` |
| `EnforceRetentionValidation` | `true` (after IaC) | `true` |
| `UseInMemoryStore` | `false` | `false` (new; never in deploy) |

## Out of Scope (no model changes)

- `Event.settlement_pdf_url` and archive object paths (specs 004/043).
- Per-object retention on promote (spec 050 application logic).
- Database tables and EF migrations.
