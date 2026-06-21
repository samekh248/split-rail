# Quickstart & Validation Guide: GCS WORM Retention on Settlement PDFs

This guide validates SPLR-43 retention enforcement. It references [data-model.md](data-model.md) and [contracts/settlement-archive-retention.md](contracts/settlement-archive-retention.md). The user-facing finalize flow is unchanged from specs 004/043.

## Prerequisites

- Spec 004 settlement pipeline and spec 043 atomic stage/promote pipeline implemented.
- .NET 8 SDK; Docker (Testcontainers PostgreSQL).
- No new database migrations.

## Configuration

```jsonc
"SettlementArchive": {
  "BucketName": "split-rail-settlements-prod",
  "StagingBucketName": "split-rail-settlements-staging",
  "SignedUrlTtlMinutes": 15,
  "RetentionYears": 7,
  "EnforceRetentionValidation": true
}
```

Integration tests use `InMemorySettlementArchiveStore` with simulated retention — **no GCS required in CI**.

## Infrastructure setup (production archive bucket)

Coordinate with infra milestone before deploying app changes:

```bash
# Example — adjust project/region; verify against org Terraform if present
export PROJECT=split-rail
export ARCHIVE_BUCKET=split-rail-settlements-prod
export STAGING_BUCKET=split-rail-settlements-staging

# Archive bucket: 7-year retention (2555 days) + bucket lock
gcloud storage buckets update gs://${ARCHIVE_BUCKET} \
  --retention-period=2555d

gcloud storage buckets update gs://${ARCHIVE_BUCKET} \
  --lock-retention-period

# Staging bucket: NO retention lock (must allow delete for orphan cleanup)
gcloud storage buckets create gs://${STAGING_BUCKET} --project=${PROJECT} --location=us-central1
# Confirm: gcloud storage buckets describe gs://${STAGING_BUCKET} --format="json(retentionPolicy)"
# Expect: no retention policy or effectivePeriod=0
```

Update `.specify/memory/infrastructure.md` WORM section to **7-year** retention when infra is applied.

## Backend validation

```bash
cd apps/api
dotnet build
dotnet test ../api.tests --filter "FullyQualifiedName~SettlementArchiveImmutability|FullyQualifiedName~SettlementArchiveStartup" --collect:"XPlat Code Coverage"
```

### Scenario A — Retention applied on promote (SC-001, FR-006)

1. Run integration test `Finalize_AppliesRetentionLockOnFinalArchiveObject` (or equivalent).
2. **Expect**: After successful finalize, `GetRetentionUntilAsync(finalPath)` ≥ UTC now + 7 years − 1 day.

### Scenario B — Overwrite rejected (SC-002, FR-003)

1. Run test `PromoteAsync_WhenFinalPathExists_ThrowsWithoutMutation`.
2. Run test `RetentionLockedObject_RejectOverwrite`.
3. **Expect**: Operations fail; original PDF bytes unchanged.

### Scenario C — Delete rejected (SC-003)

1. Run test `RetentionLockedObject_RejectDelete`.
2. **Expect**: Delete attempt fails; object still retrievable via store/fake.

### Scenario D — Atomicity preserved (SC-005, FR-008)

1. Re-run existing `SettlementAtomicityTests` suite.
2. **Expect**: All pass unchanged; failed finalizes leave zero retention-locked objects.

### Scenario E — Re-finalize after reversal (SC-006)

1. Run test `ReverseAndRefinalize_OriginalRetentionLocked_NewObjectAtDistinctPath`.
2. **Expect**: Two locked objects; original path still locked and byte-stable.

### Scenario F — Production startup guard (SC-007, FR-007)

1. Run unit test `StartupValidator_RejectsArchiveBucketWithInsufficientRetention`.
2. Run unit test `StartupValidator_RejectsStagingBucketWithRetentionLock`.
3. **Expect**: Validator returns failure / throws when policy misconfigured.

## Coverage gate

```bash
dotnet test ../api.tests --collect:"XPlat Code Coverage"
```

**Expect**: ≥80% line/branch coverage on touched backend files (`GcsSettlementArchiveStore`, `InMemorySettlementArchiveStore`, `SettlementArchiveStartupValidator`, new tests). No frontend changes; frontend gate N/A.

## Manual smoke (optional, staging environment with real GCS)

1. Deploy with retention-enabled archive bucket and updated app.
2. Finalize a test event.
3. Verify object metadata:

```bash
gcloud storage objects describe gs://${ARCHIVE_BUCKET}/settlements/{org}/{venue}/{event}/{guid}.pdf \
  --format="json(retention)"
```

4. Attempt overwrite (should fail):

```bash
echo "tamper" | gcloud storage cp - gs://${ARCHIVE_BUCKET}/settlements/.../....pdf
# Expect: retention policy violation / precondition failed
```

5. Attempt delete (should fail):

```bash
gcloud storage rm gs://${ARCHIVE_BUCKET}/settlements/.../....pdf
# Expect: retention policy violation
```

## Regression checks

- Settlement finalize HTTP contract unchanged (spec 004).
- Stage → commit → promote ordering unchanged (spec 043).
- Signed URL PDF retrieval unchanged.
- Persistence immutability guard (spec 041) unaffected.
