# Contract: Settlement Archive — WORM Retention (SPLR-43)

This contract **extends** [spec 043 settle-finalize-atomicity.md](../../043-atomic-settle-pipeline/contracts/settle-finalize-atomicity.md) and [spec 004 settlement-pdf.md](../../004-settlement-freeze-archiving/contracts/settlement-pdf.md). The HTTP surface (finalize endpoint, settlement PDF signed-URL endpoint, DTOs) is **unchanged**. This document defines retention enforcement on the archive store promote path and verification requirements.

## Scope

Applies to `ISettlementArchiveStore` implementations used during settlement finalization (`PromoteAsync`) and production archive bucket configuration.

## Retention requirements (normative)

| ID | Requirement |
|----|-------------|
| RET-001 | Every successful `PromoteAsync(stagingPath, finalPath)` MUST result in a final archive object with an active retention lock until at least `UtcNow + RetentionYears` (default 7 years). |
| RET-002 | Retention MUST NOT be applied to staging objects (`StageAsync` targets). Staging objects MUST remain deletable via `DeleteStagedAsync`. |
| RET-003 | If `finalPath` already exists in the archive bucket, `PromoteAsync` MUST throw `SettlementArchiveException` before any copy or metadata mutation. |
| RET-004 | Retention-locked archive objects MUST reject overwrite and delete attempts at the storage layer (GCS retention policy) and MUST be simulatable in `InMemorySettlementArchiveStore` for CI. |
| RET-005 | Production startup MUST validate archive bucket retention policy ≥ `RetentionYears` and staging bucket deletability when `EnforceRetentionValidation` is true. Misconfiguration MUST fail startup. |

## Promote sequence (GCS implementation)

```
1. Assert finalPath does NOT exist (GetObject / metadata fetch)
      └─ exists → throw SettlementArchiveException
2. CopyObject(stagingBucket, stagingPath → archiveBucket, finalPath)
3. UpdateObject retention: RetainUntilTime = UtcNow + RetentionYears
4. Return success
```

On failure at step 2 or 3: throw `SettlementArchiveException`; caller (`SettlementService`) applies spec 043 compensating cleanup. No retention-locked object without successful step 3.

## Archive store interface (extension)

Existing methods unchanged. Optional addition:

```csharp
/// <summary>Returns retention expiry for a final archive object, or null if not locked / not found.</summary>
Task<DateTimeOffset?> GetRetentionUntilAsync(
    string objectPath,
    CancellationToken cancellationToken = default);
```

`InMemorySettlementArchiveStore` MUST implement retention simulation sufficient to satisfy RET-004.

## Configuration contract

`SettlementArchiveOptions`:

| Field | Required | Default | Notes |
|-------|----------|---------|-------|
| `RetentionYears` | No | 7 | MUST match infra bucket policy |
| `EnforceRetentionValidation` | No | true (Production) | Skip in Development when using in-memory store |

## Infrastructure contract (archive bucket)

Production archive bucket `split-rail-settlements-prod`:

- Object Retention Policy enabled with retention period ≥ 7 years.
- Bucket Lock enabled (policy cannot be reduced or removed before lock expiry).
- No public access; Workload Identity for Cloud Run SA.

Production staging bucket `split-rail-settlements-staging`:

- **No** Object Retention Policy (objects deletable for orphan cleanup).
- Same project/region as archive bucket.

## Test assertions (required)

| Test | Action | Assert |
|------|--------|--------|
| Retention applied | Finalize happy path | `GetRetentionUntilAsync(finalPath)` ≥ now + 7y − 1d |
| Overwrite rejected | `TryOverwrite` or second `PromoteAsync` to same path | Operation fails; original bytes unchanged |
| Delete rejected | `TryDelete` on locked final path | Operation fails; object still readable |
| Staging deletable | After successful finalize | `StagedObjectCount == 0`; staging path absent |
| Re-finalize after reversal | Reverse + re-finalize | Two locked objects at distinct paths; original still locked |
| Startup guard | Mock bucket with 1-year policy | Production validator fails startup |
| Atomicity preserved | Promote failure after commit | Compensating rollback per spec 043; no locked final object |

## Logging

- Log bucket name and object path (not full `gs://` URLs with signatures) on retention failures.
- NEVER log PDF bytes, retention unlock credentials, or service account keys.

## HTTP surface (unchanged)

Finalize and settlement PDF retrieval behavior unchanged from spec 004/043. Retention enforcement is internal to archive storage.
