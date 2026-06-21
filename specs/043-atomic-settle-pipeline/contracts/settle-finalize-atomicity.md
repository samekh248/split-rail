# Contract: Finalize Settlement — Atomic Pipeline (SPLR-38)

This contract **extends** [spec 004 settle.md](../../004-settlement-freeze-archiving/contracts/settle.md). The HTTP surface (endpoint, request/response DTOs, status codes) is **unchanged**. This document defines the internal finalize pipeline ordering and failure semantics hardened by SPLR-38.

## Endpoint (unchanged)

```
POST /api/venues/{venueId}/events/{eventId}/settle
```

See spec 004 for auth, permission, request body, and response DTOs.

## Pipeline phases (normative)

| Step | Phase | Action | DB transaction open? | Storage side effect |
|------|-------|--------|----------------------|---------------------|
| 1 | A | Resolve tenant + venue scope; load event (read) | No | None |
| 2 | A | Validate `PreShow`, budget locked, `confirmed`, signature | No | None |
| 3 | A | Snapshot financial line items + artist payouts | No | None |
| 4 | A | Render PDF via `ISettlementPdfRenderer` | No | None |
| 5 | A | **Stage** PDF to deletable staging storage | No | Staging object written |
| 6 | B | **Begin DB transaction**; `FOR UPDATE` lock on event row | **Yes** | None |
| 7 | B | Re-validate `PreShow` + budget locked; apply settlement fields including final `settlement_pdf_url` path; `SaveChanges`; commit with `xmin` check | **Yes** | Event row updated on commit |
| 8 | C | **Promote** staged object to WORM archive final path | No | Final immutable object created |
| 9 | C | **Delete** staging object | No | Staging object removed |
| 10 | C | Return `200` + `SettlementResultDto` | No | — |

**Ordering invariant**: Steps 4–5 MUST complete before step 6 begins. Steps 6–7 MUST complete before step 8 begins. The database transaction MUST NOT span steps 4–5 or 8–9.

## Failure semantics

| Failure point | HTTP status | Event state | Staging object | Final WORM object |
|---------------|-------------|-------------|----------------|-------------------|
| Validation / signature (steps 1–2) | 400 | Unchanged | None | None |
| PDF render (step 4) | 502 (`settlement_archive` or dedicated render exception) | Unchanged | None | None |
| Stage upload (step 5) | 502 | Unchanged | None (or deleted on partial write) | None |
| DB commit (steps 6–7) | 409 (concurrency) or 502/500 (other) | Unchanged (rolled back) | **Deleted** | None |
| Promote (step 8) | 502 | See compensating rule below | Deleted after cleanup attempt | None if promote never succeeded |
| Success | 200 | `SETTLED` | Deleted | Exactly one object at final path |

### Compensating rule (promote failure after commit)

If step 8 fails after step 7 committed:

1. Retry promote up to 3 times with short backoff.
2. If all retries fail: delete staging object, log structured error (event/venue/user IDs only), return **502** to caller.
3. The event MUST NOT remain `SETTLED` with a `settlement_pdf_url` pointing to a non-existent final object. Implementation MUST either (a) roll back the settlement state change in a compensating DB transaction (return event to `PRE_SHOW`, clear settlement fields, keep budget locked) or (b) complete promote before returning success — **(b) is preferred**; (a) is fallback only if promote is permanently unavailable.

> MVP implementation note: synchronous promote with retries before returning 200 satisfies the invariant; compensating rollback is required only if promote cannot succeed after retries.

### Concurrent finalize loser

When step 7 fails with concurrency conflict after step 5 succeeded:

- Delete the loser's staging object.
- Return **409 Conflict**.
- Exactly one request's staging object is promoted; stored final object count = 1.

## Archive store interface (implementation contract)

`ISettlementArchiveStore` MUST support:

```csharp
Task StageAsync(string stagingPath, byte[] pdfBytes, CancellationToken cancellationToken = default);
Task PromoteAsync(string stagingPath, string finalPath, CancellationToken cancellationToken = default);
Task DeleteStagedAsync(string stagingPath, CancellationToken cancellationToken = default);
```

Existing methods (`UploadAsync`, `CreateSignedUrlAsync`) remain for signed-URL retrieval and backward compatibility. Finalize MUST use stage/promote; it MUST NOT write directly to the final WORM path before DB commit.

### GCS implementation expectations

- `StageAsync`: `UploadObjectAsync` to `StagingBucketName`.
- `PromoteAsync`: server-side `CopyObject` from staging bucket to `BucketName` at final path.
- `DeleteStagedAsync`: `DeleteObject` on staging bucket (must succeed — staging bucket has no retention lock).

## Test assertions (required)

| Test | Force failure at | Assert |
|------|------------------|--------|
| Render atomicity | Step 4 (`ThrowOnRender`) | Event not `SETTLED`; `StoredObjectCount == 0`; no staged objects |
| Upload atomicity | Step 5 (`ThrowOnUpload` on stage) | Event not `SETTLED`; `StoredObjectCount == 0` |
| DB commit atomicity | Step 7 (`ThrowOnNextSave`) | Event not `SETTLED`; `StoredObjectCount == 0`; staged object deleted |
| Happy path | — | Event `SETTLED`; exactly one final object; zero staged objects |
| Concurrency | Two parallel requests | One 200, one 409; exactly one final object |

## Logging (unchanged)

- Log event id, venue id, user id on success/failure.
- NEVER log raw signature payloads, PDF bytes, or storage credentials.
