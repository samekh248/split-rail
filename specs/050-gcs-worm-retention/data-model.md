# Phase 1 Data Model: GCS WORM Retention on Settlement PDFs

This feature introduces **no database schema changes**. It extends the operational model of settlement PDF archive objects and configuration established in specs 004 and 043.

## Entities (unchanged schema)

### Event

No new columns. `settlement_pdf_url` continues to reference the final WORM archive path after successful promote (spec 043).

| Field | Role |
|-------|------|
| `settlement_pdf_url` | Permanent reference to retention-locked final object at `settlements/{org}/{venue}/{event}/{settlementId}.pdf` |

**Invariant (extended)**: `status = SETTLED` ⟹ `settlement_pdf_url` references a **retention-locked** object in the archive bucket that exists when HTTP 200 is returned.

### Settlement PDF Archive Object (extended operational model)

Final promoted objects gain explicit retention metadata:

| Attribute | Staging object | Final (promoted) object |
|-----------|----------------|-------------------------|
| Location | Staging bucket, `staging/settlements/...` | Archive bucket, `settlements/...` |
| Retention lock | **None** (deletable) | **Active** — `RetainUntil ≥ UtcNow + RetentionYears` |
| Overwritable | Yes (until deleted) | **No** (storage + app reject) |
| Deletable | Yes | **No** (within retention window) |
| Referenced by event | No | Yes, after commit + promote |

### Archive Retention Policy (operational)

| Property | Value |
|----------|-------|
| Archive bucket | `split-rail-settlements-prod` (`gs://split-rail-settlements-prod`) |
| Staging bucket | `split-rail-settlements-staging` (deletable) |
| Retention duration | 7 years (2555 days) |
| Lock mechanism | GCS Object Retention Policy + Bucket Lock (infra) + per-object `RetainUntilTime` on promote (app) |
| Enforcement points | Infra bucket policy, app promote path, startup validator (Production) |

## Configuration (`SettlementArchiveOptions` extension)

| Option | Type | Default | Purpose |
|--------|------|---------|---------|
| `BucketName` | string | required in prod | WORM archive bucket (existing) |
| `StagingBucketName` | string? | `{BucketName}-staging` | Deletable staging bucket (existing) |
| `SignedUrlTtlMinutes` | int | 15 | Signed URL TTL (existing) |
| `RetentionYears` | int | **7** | Per-object retention duration applied on promote |
| `EnforceRetentionValidation` | bool | true in Production | Run startup bucket policy validation |

Example:

```jsonc
"SettlementArchive": {
  "BucketName": "split-rail-settlements-prod",
  "StagingBucketName": "split-rail-settlements-staging",
  "SignedUrlTtlMinutes": 15,
  "RetentionYears": 7,
  "EnforceRetentionValidation": true
}
```

No migration required.

## Archive store operations (extended)

| Operation | Retention behavior | Overwrite guard |
|-----------|-------------------|-----------------|
| `StageAsync` | No retention applied | N/A (staging paths are unique per attempt) |
| `PromoteAsync` | Apply `RetainUntilTime` on final object after copy | Reject if final path already exists |
| `DeleteStagedAsync` | N/A | Only staging paths (never retention-locked) |
| `UploadAsync` | Legacy/direct upload — if used, MUST apply same retention + overwrite rules as promote final path |
| `GetRetentionUntilAsync` *(new)* | Returns lock expiry for final archive paths; null for staging/unlocked | Diagnostic/test helper |

## State transitions (promote with retention)

```text
Staged (deletable, no lock)
    │
    ├─ PromoteAsync
    │     ├─ final path exists? ──yes──► SettlementArchiveException (no mutation)
    │     ├─ CopyObject staging → archive
    │     ├─ Set RetainUntilTime = now + RetentionYears
    │     └─ Final (retention-locked, non-deletable)
    │
    └─ DeleteStagedAsync ──► staging removed
```

Re-finalize after reversal: new `settlementId` → new final path → new retention-locked object; prior object unchanged.

## Validation rules

- **Retention on promote**: Every successful `PromoteAsync` to archive bucket MUST result in `GetRetentionUntilAsync(finalPath) ≥ UtcNow + RetentionYears − 1 day` (tolerance for clock skew).
- **Overwrite**: `PromoteAsync` or `UploadAsync` to existing final path MUST throw before byte replacement.
- **Staging delete**: MUST succeed regardless of retention settings on archive bucket.
- **Startup (Production)**: Archive bucket retention policy duration MUST be ≥ `RetentionYears`; staging bucket MUST NOT block delete.

## Relationships

No new tables or FKs. Retention state lives on GCS objects (and in-memory test doubles). Linkage to `Event` remains via `settlement_pdf_url` after promote completes.
