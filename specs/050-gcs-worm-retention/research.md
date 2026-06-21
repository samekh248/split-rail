# Phase 0 Research: GCS WORM Retention on Settlement PDFs

This document resolves the technical decisions for SPLR-43 — enforcing and verifying Object Retention on settlement PDF archives so immutability is applied in application code and proven by automated tests, not assumed from bucket configuration alone.

## 1. Root cause and gap

- **Decision**: `GcsSettlementArchiveStore.PromoteAsync` performs a server-side `CopyObjectAsync` to the archive bucket but **does not set per-object retention metadata**, **does not verify** the destination object carries an active retention lock, and **does not guard** against overwriting an existing final path. CI uses `InMemorySettlementArchiveStore`, which allows overwrite/delete of "promoted" objects — so WORM behavior is untested.
- **Rationale**: SPLR-43 acceptance criteria require storage-layer immutability with an automated check that overwrite/delete is rejected. Spec 004 assumed bucket-level retention would suffice; spec 043 added staging/promote but deferred explicit retention enforcement to this milestone.
- **Alternatives considered**:
  - **Rely on bucket default retention only** — rejected; not verifiable in code/tests; infra doc currently says 3-year while spec 004 clarifies 7-year.
  - **Upload directly with retention (skip copy)** — rejected; breaks stage → commit → promote atomicity from spec 043.
  - **Post-upload async retention job** — rejected; window where object exists without lock; harder to test atomically with finalize response.

## 2. Retention duration and infra alignment

- **Decision**: Canonical retention period is **7 years** (spec 004 clarification). Update `.specify/memory/infrastructure.md` from 3-year to **7-year** Object Retention Policy + Bucket Lock on `gs://split-rail-settlements-prod`. Application config `SettlementArchiveOptions.RetentionYears` defaults to **7** and MUST match infra policy duration.
- **Rationale**: Single source of truth across spec, app config, and Terraform/gcloud provisioning. US financial/tax record retention alignment from spec 004.
- **Alternatives considered**: Keep 3-year infra doc — rejected; contradicts spec 004 and feature spec FR-001.

## 3. Applying retention on promote (GCS)

- **Decision**: After successful `CopyObjectAsync` from staging to archive bucket, **explicitly set per-object retention** on the destination object via `UpdateObjectAsync` (or equivalent in `Google.Cloud.Storage.V1`) with `RetainUntilTime = UtcNow + RetentionYears`. If the bucket already applies default retention, the explicit per-object lock **must be ≥ bucket minimum** and provides a code-visible enforcement point testable via object metadata reads.
- **Rationale**: FR-002 requires per-object retention on every final archive write, not bucket-default assumptions alone. Explicit `RetainUntilTime` is readable in tests (GCS integration or mocked metadata) and in production diagnostics.
- **Alternatives considered**:
  - **Retention only via bucket policy** — rejected for SPLR-43; not observable in promote code path.
  - **Set retention on UploadObject to staging then copy** — rejected; staging must remain deletable; retention on staging would block orphan cleanup.

## 4. Overwrite prevention

- **Decision**: Before `CopyObjectAsync` in `PromoteAsync`, call `GetObjectAsync` (or metadata-only fetch) on the **final archive path**. If the object exists, throw `SettlementArchiveException` ("Archive object already exists") without mutating storage. GUID-based paths make collisions rare; this satisfies FR-003 and guards against logic bugs or manual re-promote to the same path.
- **Rationale**: Defense in depth — bucket retention may reject overwrites, but application-level rejection produces clearer errors and is testable in `InMemorySettlementArchiveStore` without GCS.
- **Alternatives considered**: Rely on GCS 412 Precondition Failed only — rejected; error semantics less explicit; harder to unit test without GCS emulator.

## 5. In-memory retention simulation for CI

- **Decision**: Extend **both** `InMemorySettlementArchiveStore` implementations (`apps/api.tests/Integration/` and `apps/api/Services/InMemorySettlementArchiveStore.cs` if used in dev) so `PromoteAsync`:
  1. Rejects promote when `finalPath` already exists in `_objects`.
  2. Marks promoted objects as **retention-locked** with `RetainUntil = UtcNow + RetentionYears`.
  3. Rejects subsequent `UploadAsync`/`PromoteAsync` overwrite and explicit delete attempts on locked paths (throw `SettlementArchiveException`).
  4. Exposes test helpers: `IsRetentionLocked(path)`, `GetRetainUntil(path)`, `TryOverwrite(path, bytes)`, `TryDelete(path)`.
- **Rationale**: FR-005/FR-006 require automated proof without mandatory GCS in CI. Simulation mirrors GCS semantics sufficiently for regression detection.
- **Alternatives considered**: GCS emulator in CI — rejected; heavy, flaky, not required for MVP given in-memory fidelity.

## 6. Production startup validation (FR-007)

- **Decision**: Register `SettlementArchiveStartupValidator` (`IHostedService` or `IStartupFilter`) that runs **only in Production** when `SettlementArchive:BucketName` is configured. It:
  1. Fetches archive bucket metadata (`GetBucket`).
  2. Verifies an active **retention policy** exists with `RetentionPeriod` ≥ configured `RetentionYears`.
  3. Verifies staging bucket (`ResolveStagingBucketName()`) either has **no retention policy** or retention period = 0 (deletable).
  4. On failure: log structured error (bucket names only) and **fail startup** (same pattern as spec 047 Production Data Protection guard).
- **Rationale**: Surfaces misconfiguration before accepting uploads that cannot be proven immutable. Development/Test skip validation (in-memory store or optional GCS).
- **Alternatives considered**: Lazy check on first finalize — rejected; delayed detection; first settlement could upload without verified policy.

## 7. Interface and options extension

- **Decision**: Extend `SettlementArchiveOptions`:
  - `RetentionYears` (int, default 7)
  - `EnforceRetentionValidation` (bool, default true in Production)
  
  Optionally extend `ISettlementArchiveStore` with:
  - `Task<DateTimeOffset?> GetRetentionUntilAsync(string objectPath, CancellationToken)` — returns null for staging paths or unlocked objects; used by tests and optional diagnostics.

  `PromoteAsync` signature unchanged; retention applied inside implementation.
- **Rationale**: Keeps finalize pipeline contract stable (spec 043); configuration drives retention duration; test interface enables FR-006 assertions without reaching into store internals.
- **Alternatives considered**: Separate `IRetentionAwareArchiveStore` — rejected; unnecessary abstraction for one implementation pair.

## 8. Settlement pipeline integration

- **Decision**: **No changes** to `SettlementService.FinalizeAsync` phase ordering (A → B → C). Retention enforcement is entirely inside `GcsSettlementArchiveStore.PromoteAsync` / in-memory equivalent. Compensating rollback on promote failure (spec 043) unchanged — no retention-locked object exists if promote fails before copy+retention completes.
- **Rationale**: FR-008 preserves atomicity; retention is a property of the promote step, not a new pipeline phase.
- **Alternatives considered**: Retention as post-promote step in service — rejected; belongs in archive store encapsulation.

## 9. Test matrix

- **Decision**: New `SettlementArchiveImmutabilityTests` (integration) covering:
  1. Happy-path finalize → final object retention-locked; `GetRetentionUntilAsync` ≥ now + 7y (within tolerance).
  2. `TryOverwrite` on locked path → fails; content hash unchanged.
  3. `TryDelete` on locked path → fails; object still present.
  4. Second promote to same final path → fails at store layer.
  5. Re-finalize after reversal → two distinct locked objects; original still locked.
  
  Unit tests for `SettlementArchiveStartupValidator` with mocked bucket metadata (missing policy, short policy, staging bucket locked).
- **Rationale**: Maps directly to SC-001 through SC-006 and SPLR-43 acceptance criteria.
- **Alternatives considered**: Extend only existing `SettlementAtomicityTests` — rejected; immutability deserves focused suite for clarity.

## 10. API and frontend surface

- **Decision**: **No API contract changes** — same finalize endpoint, settlement PDF signed-URL endpoint, DTOs, and HTTP status mapping. Operators see identical UX; immutability is storage-layer hardening.
- **Rationale**: SPLR-43 is compliance/integrity gap closure, not a user-facing feature.
- **Alternatives considered**: Expose retention expiry in `SettlementPdfLinkDto` — rejected; unnecessary leakage; out of scope.

## 11. Infrastructure coordination

- **Decision**: Document in [quickstart.md](./quickstart.md) the required gcloud/Terraform steps:
  - Enable Bucket Lock on archive bucket.
  - Set Object Retention Policy to 7 years (2555 days).
  - Ensure staging bucket has **no** retention lock.
  - IAM: Cloud Run SA retains `storage.objects.create`, `storage.objects.get`, `storage.objects.delete` on staging only; archive bucket delete denied by retention regardless of IAM.
- **Rationale**: FR-001 spans infra + app; quickstart gives ops a validation checklist.
- **Alternatives considered**: App-only changes without infra doc — rejected; bucket lock is prerequisite for legal WORM compliance.
