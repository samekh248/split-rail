# Phase 0 Research: Atomic Settlement Finalize Pipeline

This document resolves the technical decisions for SPLR-38 — hardening the finalize-settlement pipeline so failures at any step leave the event unsettled with no orphaned PDF artifacts, and the operation ordering matches the spec 004 contract (upload phase before a dedicated DB transaction).

## 1. Root cause and gap

- **Decision**: The current `SettlementService.FinalizeAsync` opens a database transaction before storage upload, holds a row lock (`FOR UPDATE`) during PDF upload, and writes directly to the final WORM archive path. If `SaveChanges` fails after a successful upload, the event rolls back to `PRE_SHOW` but the PDF remains in the WORM bucket (non-deletable under retention).
- **Rationale**: SPLR-38 acceptance criteria require zero orphaned PDFs on DB failure. WORM retention on the production bucket (`gs://split-rail-settlements-prod`) makes delete-on-rollback impossible for objects already written to the final path.
- **Alternatives considered**:
  - **Upload-after-commit** — rejected (spec 004 invariant: a `SETTLED` event must always reference a real archived PDF; post-commit upload failure leaves a settled event without an artifact).
  - **Accept orphans as harmless** — rejected by SPLR-38; superseded for this hardening milestone.
  - **Delete-on-rollback on final path** — rejected; WORM Object Retention Policy blocks deletion.

## 2. Orphan prevention strategy

- **Decision**: **Stage → commit → promote** pattern:
  1. Render PDF in memory (no storage I/O).
  2. Upload to a **deletable staging location** (separate staging bucket or bucket without retention lock).
  3. Open a **short** database transaction: acquire row lock, re-validate preconditions, persist settlement state with the **final** object path reference, commit with `xmin` concurrency check.
  4. **Promote** staged bytes to the WORM archive path (GCS server-side copy).
  5. **Delete** the staging object.
  6. On any failure before step 4 completes: delete staging object and leave event unsettled.
- **Rationale**: Staging objects are deletable on rollback. Final WORM objects are only written after a successful DB commit, so DB failure never leaves an object under retention without a matching settled event. The brief window between commit and promote is closed synchronously before returning HTTP 200; promote failure triggers staging cleanup and surfaces `SettlementArchiveException` (502) — with a compensating internal path documented in the contract if promote fails after commit (retry promote before returning error; event remains settled only if promote succeeds).
- **Alternatives considered**:
  - **Staging prefix in same WORM bucket** — rejected if bucket-level retention applies to all objects.
  - **Two-phase commit across GCS + Postgres** — rejected as over-engineered; stage/promote is sufficient for MVP.

## 3. Staging storage configuration

- **Decision**: Extend `SettlementArchiveOptions` with optional `StagingBucketName`. Production: infrastructure provisions a **non-WORM staging bucket** in the same GCP project; the app uploads to staging, copies to the WORM production bucket on success, deletes staging. Tests: `InMemorySettlementArchiveStore` tracks staged vs promoted objects with deletable staging semantics.
- **Rationale**: Keeps WORM guarantees on finalized artifacts while allowing rollback cleanup. Falls back to staging bucket name = `{BucketName}-staging` when unset (documented in quickstart for ops).
- **Alternatives considered**: Local disk staging in Cloud Run — rejected (ephemeral, not shared across instances).

## 4. Operation ordering and transaction scope

- **Decision**: Restructure `FinalizeAsync` into two phases:
  - **Phase A (no DB transaction)**: tenant/venue scope load (read-only), signature validation, precondition checks, snapshot, PDF render, stage upload.
  - **Phase B (short DB transaction)**: `FOR UPDATE` row lock, re-validate `PreShow` + budget locked, apply settlement field updates, `SaveChanges`, commit.
  - **Phase C (post-commit, no transaction)**: promote staged → final WORM path, delete staging, return result.
- **Rationale**: Matches contract step 5 (persist PDF) before step 6 (DB transaction) while using staging so step 5 does not write to the retention-locked final path. Eliminates holding row locks during render/upload I/O.
- **Alternatives considered**: Keep upload inside transaction — rejected (extends lock duration, diverges from contract, does not fix orphans).

## 5. Archive store interface extension

- **Decision**: Extend `ISettlementArchiveStore` with:
  - `StageAsync(stagingPath, pdfBytes)` — write to deletable staging storage
  - `PromoteAsync(stagingPath, finalPath)` — copy to WORM archive (server-side for GCS)
  - `DeleteStagedAsync(stagingPath)` — cleanup on failure or after successful promote
  - Retain existing `UploadAsync` for backward compatibility or deprecate in favor of stage/promote only for finalize path
- **Rationale**: Explicit lifecycle methods make rollback cleanup testable and keep GCS copy/delete logic in one abstraction.
- **Alternatives considered**: Overload `UploadAsync` with a `isStaging` flag — rejected; separate methods are clearer for tests and GCS implementation.

## 6. PDF render failure testability

- **Decision**: Introduce `ISettlementPdfRenderer` interface implemented by existing `SettlementPdfRenderer`; inject into `SettlementService`. Integration tests register a `ThrowingSettlementPdfRenderer` fake when forcing render failure.
- **Rationale**: FR-009 requires render-failure atomicity tests; the concrete renderer cannot be forced to fail without an abstraction or brittle test hooks.
- **Alternatives considered**: Subclass `SettlementPdfRenderer` in tests — rejected; interface matches existing DI patterns (`ISettlementArchiveStore`).

## 7. Database commit failure testability

- **Decision**: Add a test-only `SaveChangesFailureInterceptor` (or extend integration test factory) with a `ThrowOnNextSave` flag scoped to finalize integration tests. Assert event not settled and zero promoted/staged objects remain after failure.
- **Rationale**: FR-011 requires post-upload DB failure coverage; forcing `DbUpdateException` from the real pipeline is more reliable than unit mocks alone.
- **Alternatives considered**: Unit test only with mocked `DbContext` — rejected; integration test proves end-to-end atomicity through HTTP.

## 8. Concurrency and loser cleanup

- **Decision**: Preserve first-wins via `FOR UPDATE` + `xmin` inside Phase B. If the losing concurrent request fails concurrency check after staging, **always delete its staging object** in a `finally`/catch path before rethrowing `ConcurrencyConflictException`.
- **Rationale**: Prevents orphaned staging objects from concurrent finalize races (spec edge case).
- **Alternatives considered**: Lazy staging GC job — rejected; synchronous cleanup is simpler and testable.

## 9. Persistence guard interaction (spec 041)

- **Decision**: No new `FrozenEventSaveReason` required. Finalize transitions `PRE_SHOW` → `SETTLED`; the interceptor evaluates **original** status (`PreShow`), which is not frozen. Existing guard behavior unchanged.
- **Rationale**: Spec 041 User Story 2 acceptance scenario 4 explicitly permits finalize on `PRE_SHOW` events.
- **Alternatives considered**: Add `SettlementFinalize` authorized reason — unnecessary given original status is not frozen.

## 10. API and frontend surface

- **Decision**: **No API contract changes** — same endpoint, request/response DTOs, and HTTP status mapping. Behavior change is internal pipeline ordering and staging semantics only.
- **Rationale**: SPLR-38 is a hardening gap fix; operators see the same finalize UX and responses.
- **Alternatives considered**: New response field indicating staging status — rejected as unnecessary leakage of implementation detail.
