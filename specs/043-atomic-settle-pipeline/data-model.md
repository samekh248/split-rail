# Phase 1 Data Model: Atomic Settlement Finalize Pipeline

This feature introduces **no database schema changes**. It refines the operational lifecycle of settlement PDF artifacts and the finalize pipeline transaction boundaries. Entities below are conceptual/operational extensions to spec 004.

## Entities (unchanged schema)

### Event

Settlement finalize still mutates the same columns defined in spec 004:

| Field | Role in finalize |
|-------|------------------|
| `status` | `PRE_SHOW` → `SETTLED` on successful commit (Phase B) |
| `settled_at` | UTC timestamp at commit |
| `settled_by_user_id` | Authenticated signer |
| `artist_signature_data` | Base64 vector signature |
| `settlement_pdf_url` | Permanent reference to **final** WORM archive path (`gs://{bucket}/settlements/{org}/{venue}/{event}/{settlementId}.pdf`) |
| `xmin` | Optimistic concurrency token; loser → HTTP 409 |

**Invariant (strengthened)**: `status = SETTLED` ⟹ `settlement_pdf_url` references a promoted object in the WORM archive bucket that exists at the time HTTP 200 is returned.

### Settlement PDF Artifact (operational states)

A settlement PDF passes through transient states during finalize:

| State | Location | Deletable? | Referenced by event? |
|-------|----------|------------|----------------------|
| **Rendered** | In-memory bytes only | N/A | No |
| **Staged** | Staging bucket at `staging/settlements/{org}/{venue}/{event}/{settlementId}.pdf` | Yes | No |
| **Promoted (final)** | WORM bucket at `settlements/{org}/{venue}/{event}/{settlementId}.pdf` | No (retention lock) | Yes, after commit + promote |

**Path convention** (unchanged final path; new staging prefix):

- **Staging**: `{StagingBucket}/staging/settlements/{organizationId}/{venueId}/{eventId}/{settlementId}.pdf`
- **Final (WORM)**: `{ArchiveBucket}/settlements/{organizationId}/{venueId}/{eventId}/{settlementId}.pdf`

`settlementId` remains a freshly generated GUID per finalize attempt (re-settlement after reversal uses a new GUID).

### Settlement Archive Storage

Extended operational contract (see [contracts/settle-finalize-atomicity.md](./contracts/settle-finalize-atomicity.md)):

| Operation | When | On failure |
|-----------|------|------------|
| `StageAsync` | After PDF render, before DB transaction | No DB change; no final artifact |
| DB commit | After successful stage | — |
| `PromoteAsync` | After successful DB commit | Compensating cleanup per contract |
| `DeleteStagedAsync` | After promote OR on any pre-promote failure | Staging object removed |

## Configuration (appsettings extension)

`SettlementArchiveOptions` gains:

| Option | Purpose | Default |
|--------|---------|---------|
| `BucketName` | WORM production archive bucket (existing) | required in prod |
| `StagingBucketName` | Deletable staging bucket | `{BucketName}-staging` when unset |
| `SignedUrlTtlMinutes` | Signed URL TTL (existing) | 15 |

No migration required.

## State transitions (finalize pipeline)

```text
PRE_SHOW (budget locked)
    │
    ├─ validate + render (no storage)
    │
    ├─ stage upload ──fail──► PRE_SHOW (unchanged, no artifact)
    │
    ├─ DB transaction (FOR UPDATE, set SETTLED + pdf url)
    │       │
    │       ├─ fail ──► delete staged ──► PRE_SHOW
    │       │
    │       └─ commit OK
    │
    ├─ promote staged → WORM final
    │       │
    │       ├─ fail ──► cleanup + error (see contract)
    │       │
    │       └─ success
    │
    └─ delete staged ──► SETTLED (pdf url → final path)
```

Concurrent finalize: two requests may each reach staging; only one commits; loser deletes staging and returns 409.

## Validation rules (unchanged)

- Signature: non-empty base64 vector, ≥1 stroke
- Preconditions: `PRE_SHOW`, budget locked, `confirmed=true`, permission + venue scope
- Re-finalize on `SETTLED`/`RECONCILED`: rejected (409/400)

## Relationships

No new tables or FKs. Staging objects are keyed by `settlementId` GUID; linkage to `Event` is established only after DB commit sets `settlement_pdf_url` to the final path.
