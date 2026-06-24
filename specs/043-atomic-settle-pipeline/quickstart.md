# Quickstart & Validation Guide: Atomic Settlement Finalize Pipeline

This guide validates SPLR-38 hardening. It references [data-model.md](data-model.md) and [contracts/settle-finalize-atomicity.md](contracts/settle-finalize-atomicity.md). The user-facing finalize flow is unchanged from spec 004 — see [004 quickstart](../004-settlement-freeze-archiving/quickstart.md) for end-to-end UI scenarios.

## Prerequisites

- Spec 004 settlement pipeline implemented (finalize endpoint, PDF renderer, archive store, immutability guards).
- Spec 041 persistence guard active (finalize on `PRE_SHOW` must remain unblocked).
- .NET 8 SDK; Docker (Testcontainers PostgreSQL).
- No new migrations for this feature.

## Configuration (optional staging bucket)

Add to `appsettings` / environment when staging bucket differs from default:

```jsonc
"SettlementArchive": {
  "BucketName": "split-rail-settlements-prod",
  "StagingBucketName": "split-rail-settlements-staging",  // deletable; no WORM retention
  "SignedUrlTtlMinutes": 15
}
```

When `StagingBucketName` is omitted, implementation defaults to `{BucketName}-staging`. Integration tests use `InMemorySettlementArchiveStore` — no GCS required.

## Backend validation

```bash
cd apps/api
dotnet build
dotnet test apps/api.tests --filter "FullyQualifiedName~SettlementAtomicity|FullyQualifiedName~SettlementConcurrency|FullyQualifiedName~SettlementFinalize" --collect:"XPlat Code Coverage"
```

### Scenario A — Render failure atomicity (FR-009)

1. Run integration test `Finalize_WhenRenderFails_LeavesEventUnsettledAndNoStoredPdf`.
2. **Expect**: HTTP error; event `status = PRE_SHOW`; `settlement_pdf_url` null; archive store `StoredObjectCount == 0`; no staged objects remain.

### Scenario B — Upload failure atomicity (FR-010, existing)

1. Run integration test `Finalize_WhenUploadFails_LeavesEventUnsettled` (updated for stage semantics).
2. **Expect**: HTTP 502; event not settled; zero stored/staged PDF objects.

### Scenario C — DB commit failure atomicity (FR-011)

1. Run integration test `Finalize_WhenDbCommitFailsAfterStage_DeletesStagedAndLeavesEventUnsettled`.
2. **Expect**: Event not settled; zero final objects; staging object deleted by cleanup path.

### Scenario D — Happy path unchanged (SC-003)

1. Run `SettlementFinalizeTests` happy-path cases.
2. **Expect**: `200`; event `SETTLED`; one final archive object; zero staged objects; PDF retrievable via signed URL.

### Scenario E — Concurrency unchanged (SC-004)

1. Run `SettlementConcurrencyTests`.
2. **Expect**: One `200`, one `409`; exactly one final stored PDF; loser's staging cleaned up.

### Scenario F — Pipeline ordering (SC-005)

1. Code review or debug trace of `SettlementService.FinalizeAsync`.
2. **Expect**: No `BeginTransactionAsync` before `StageAsync`; transaction does not wrap PDF render or stage upload; `FOR UPDATE` occurs inside the short commit transaction only.

## Coverage gate

```bash
dotnet test apps/api.tests --collect:"XPlat Code Coverage"
```

**Expect**: ≥80% line/branch coverage on touched backend files (`SettlementService`, `ISettlementArchiveStore` implementations, new test fakes). No frontend changes expected; frontend coverage gate N/A unless files are touched.

## Manual smoke (optional)

After deploying with staging bucket configured:

1. Finalize a test event on a staging environment.
2. Verify final object exists in WORM bucket at `settlements/{org}/{venue}/{event}/{guid}.pdf`.
3. Verify no objects remain in staging bucket under `staging/settlements/...` for that attempt.
4. Confirm immutability guard still blocks post-settlement line-item edits (spec 004 Scenario B).

## Regression checks

- Settlement reversal and re-finalize still produce a **new** final PDF path; original WORM artifact preserved.
- Reconciliation (`SETTLED` → `RECONCILED`) unaffected.
- Persistence guard (spec 041) does not block finalize on `PRE_SHOW` events.
