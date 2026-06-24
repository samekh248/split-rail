---
description: "Task list for GCS WORM Retention on Settlement PDFs (SPLR-43)"
---

# Tasks: GCS WORM Retention on Settlement PDFs

**Input**: Design documents from `/specs/050-gcs-worm-retention/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/settlement-archive-retention.md, quickstart.md

**Tests**: REQUIRED per Constitution III. Each user story phase adds xUnit integration tests in `apps/api.tests/Integration/` and unit tests in `apps/api.tests/Unit/` (write failing tests first, then implement until green). Final Polish phase enforces ≥80.0% line/branch coverage on **backend touched files** via `dotnet test --collect:"XPlat Code Coverage"` (coverlet → cobertura). No frontend changes — frontend coverage gate N/A unless files are touched.

**Organization**: Tasks grouped by user story (US1–US3). Backend hardening slice through `apps/api/Configuration/`, `apps/api/Services/`, `apps/api/Program.cs`, and `apps/api.tests/`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1–US3 (maps to user stories in spec.md)
- All paths are repo-relative

## Path Conventions

- Options: `apps/api/Configuration/SettlementArchiveOptions.cs`
- Archive store: `apps/api/Services/ISettlementArchiveStore.cs`, `apps/api/Services/GcsSettlementArchiveStore.cs`, `apps/api/Services/InMemorySettlementArchiveStore.cs`
- Startup validator: `apps/api/Services/SettlementArchiveStartupValidator.cs`
- DI: `apps/api/Program.cs`
- Integration tests: `apps/api.tests/Integration/SettlementArchiveImmutabilityTests.cs`, `SettlementAtomicityTests.cs`, `SettlementReversalTests.cs`
- In-memory test store: `apps/api.tests/Integration/InMemorySettlementArchiveStore.cs`
- Unit tests: `apps/api.tests/Unit/GcsSettlementArchiveStoreTests.cs`, `apps/api.tests/Unit/SettlementArchiveStartupValidatorTests.cs`, `apps/api.tests/Unit/InMemorySettlementArchiveStoreTests.cs`
- Test base: `apps/api.tests/Integration/IntegrationTestBase.cs`
- Contract: `specs/050-gcs-worm-retention/contracts/settlement-archive-retention.md`
- Infra doc: `.specify/memory/infrastructure.md`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm branch, prerequisites, and retention contract before implementation.

- [x] T001 Verify branch `050-gcs-worm-retention` and design docs in `specs/050-gcs-worm-retention/` per plan.md
- [x] T002 [P] Review retention contract in `specs/050-gcs-worm-retention/contracts/settlement-archive-retention.md` (RET-001–RET-005, promote sequence, test assertions)
- [x] T003 [P] Review retention decisions in `specs/050-gcs-worm-retention/research.md` and operational model in `specs/050-gcs-worm-retention/data-model.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Configuration, interface extension, and in-memory retention simulation scaffolding. **Blocks all user stories.**

**⚠️ CRITICAL**: No user story implementation begins until options compile, `GetRetentionUntilAsync` is on the interface, and in-memory stores can track retention locks.

- [x] T004 Extend `SettlementArchiveOptions` with `RetentionYears` (default 7) and `EnforceRetentionValidation` (default true) in `apps/api/Configuration/SettlementArchiveOptions.cs` per data-model.md
- [x] T005 Extend `ISettlementArchiveStore` with `GetRetentionUntilAsync(string objectPath, CancellationToken)` in `apps/api/Services/ISettlementArchiveStore.cs` per contracts/settlement-archive-retention.md
- [x] T006 [P] Extend `InMemorySettlementArchiveStore` in `apps/api.tests/Integration/InMemorySettlementArchiveStore.cs` — add `_retentionUntil` dictionary, `GetRetentionUntilAsync`, test helpers `TryOverwriteAsync`, `TryDeleteAsync`, `IsRetentionLocked`; inject `IOptions<SettlementArchiveOptions>` for retention duration
- [x] T007 [P] Extend `InMemorySettlementArchiveStore` in `apps/api/Services/InMemorySettlementArchiveStore.cs` — mirror retention-lock tracking and `GetRetentionUntilAsync` from integration test store for dev parity
- [x] T008 [P] Add `RetentionYears: 7` and `EnforceRetentionValidation: false` to test configuration in `apps/api.tests/Integration/IntegrationTestBase.cs` `ConfigureTestAppConfiguration`
- [x] T009 [P] Document new `SettlementArchive` options in `apps/api/appsettings.json` and `apps/api/appsettings.Development.json` (RetentionYears, EnforceRetentionValidation)

**Checkpoint**: Options and interface compile; in-memory stores expose retention metadata helpers for tests

---

## Phase 3: User Story 1 — Storage-Layer Immutable for Retention Period (Priority: P1) 🎯 MVP

**Goal**: Every promoted final archive object carries an active 7-year retention lock; delete attempts on locked objects are rejected by storage (simulated in CI, enforced in GCS production).

**Independent Test**: Finalize a settlement (or promote via store directly); assert `GetRetentionUntilAsync(finalPath) ≥ UtcNow + 7 years − 1 day`; assert delete attempt on locked path fails and object remains readable.

### Tests for User Story 1 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T010 [P] [US1] Add failing integration test `Finalize_AppliesRetentionLockOnFinalArchiveObject` in `apps/api.tests/Integration/SettlementArchiveImmutabilityTests.cs` — happy-path finalize; cast `ArchiveStore` to integration `InMemorySettlementArchiveStore`; assert `GetRetentionUntilAsync(finalPath)` ≥ now + 7y − 1d
- [x] T011 [P] [US1] Add failing unit test `PromoteAsync_SetsRetentionLockOnFinalObject` in `apps/api.tests/Unit/InMemorySettlementArchiveStoreTests.cs` — stage + promote; assert retention locked and `GetRetentionUntilAsync` populated
- [x] T012 [P] [US1] Add failing unit test `RetentionLockedObject_RejectDelete` in `apps/api.tests/Unit/InMemorySettlementArchiveStoreTests.cs` — promote object, call `TryDeleteAsync`; assert failure and object still retrievable

### Implementation for User Story 1

- [x] T013 [US1] Implement retention lock on `PromoteAsync` in `apps/api.tests/Integration/InMemorySettlementArchiveStore.cs` — after copy to `_objects`, set `_retentionUntil[finalPath] = UtcNow + RetentionYears`; implement `GetRetentionUntilAsync`; reject delete via `TryDeleteAsync` when locked
- [x] T014 [US1] Implement retention lock on `PromoteAsync` in `apps/api/Services/InMemorySettlementArchiveStore.cs` — same semantics as integration test store
- [x] T015 [US1] Implement per-object retention on promote in `apps/api/Services/GcsSettlementArchiveStore.cs` — after `CopyObjectAsync`, call `UpdateObjectAsync` (or equivalent) setting `RetainUntilTime = UtcNow + RetentionYears` from options; implement `GetRetentionUntilAsync` reading object retention metadata
- [x] T016 [US1] Run US1 tests until green: `dotnet test apps/api.tests --filter "FullyQualifiedName~SettlementArchiveImmutability|FullyQualifiedName~InMemorySettlementArchiveStore"`

**Checkpoint**: MVP — promoted archive objects are retention-locked; delete rejected on locked paths

---

## Phase 4: User Story 2 — Application Upload Behavior Respects Immutability (Priority: P1)

**Goal**: Promote and upload paths reject writes to existing final archive keys; production startup fails fast when archive bucket retention policy is misconfigured; staging remains deletable.

**Independent Test**: Attempt second promote to same final path → `SettlementArchiveException` without byte mutation; production validator rejects bucket with insufficient retention or locked staging bucket.

### Tests for User Story 2 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T017 [P] [US2] Add failing unit test `PromoteAsync_WhenFinalPathExists_ThrowsWithoutMutation` in `apps/api.tests/Unit/InMemorySettlementArchiveStoreTests.cs` — promote once, attempt second promote to same `finalPath` with different staging source; assert exception and original bytes unchanged
- [x] T018 [P] [US2] Add failing unit test `UploadAsync_WhenFinalPathExists_ThrowsWithoutMutation` in `apps/api.tests/Unit/InMemorySettlementArchiveStoreTests.cs` — locked object exists; `UploadAsync` to same path fails without mutation
- [x] T019 [P] [US2] Add failing unit tests in `apps/api.tests/Unit/SettlementArchiveStartupValidatorTests.cs` — `Validate_RejectsArchiveBucketWithInsufficientRetention`, `Validate_RejectsStagingBucketWithRetentionLock`, `Validate_PassesWhenCorrectlyConfigured` (mock `StorageClient` or extract testable validator service)

### Implementation for User Story 2

- [x] T020 [US2] Add pre-promote existence check in `apps/api/Services/GcsSettlementArchiveStore.cs` `PromoteAsync` — `GetObjectAsync` on final path; if exists throw `SettlementArchiveException` before copy; apply same guard to `UploadAsync` for archive bucket writes
- [x] T021 [US2] Add overwrite guards in `apps/api.tests/Integration/InMemorySettlementArchiveStore.cs` and `apps/api/Services/InMemorySettlementArchiveStore.cs` — reject `PromoteAsync`/`UploadAsync` when `finalPath` already in `_objects`
- [x] T022 [US2] Create `SettlementArchiveStartupValidator` in `apps/api/Services/SettlementArchiveStartupValidator.cs` — `IHostedService` validating archive bucket retention ≥ `RetentionYears` and staging bucket deletable when `EnforceRetentionValidation` is true; fail startup with explicit exception on misconfig; log bucket names only (Constitution VIII)
- [x] T023 [US2] Register `SettlementArchiveStartupValidator` in `apps/api/Program.cs` when environment is Production and archive bucket is configured
- [x] T024 [US2] Run US2 tests until green: `dotnet test apps/api.tests --filter "FullyQualifiedName~InMemorySettlementArchiveStore|FullyQualifiedName~SettlementArchiveStartupValidator"`

**Checkpoint**: Overwrite prevention at app layer; production misconfig surfaced at startup

---

## Phase 5: User Story 3 — Automated Verification Proves Storage Immutability (Priority: P2)

**Goal**: Complete immutability test matrix in CI; regressions in retention enforcement block merge; atomicity and reversal behavior preserved.

**Independent Test**: Run `SettlementArchiveImmutabilityTests` + startup validator tests + existing atomicity suite; all pass; removing retention simulation causes failures.

### Tests for User Story 3 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation (where not already covered by US1/US2)**

- [x] T025 [P] [US3] Add failing integration test `RetentionLockedObject_RejectOverwrite` in `apps/api.tests/Integration/SettlementArchiveImmutabilityTests.cs` — finalize event, `TryOverwriteAsync` on final path; assert failure and content hash unchanged
- [x] T026 [P] [US3] Add failing integration test `ReverseAndRefinalize_TwoDistinctRetentionLockedObjects_OriginalPreserved` in `apps/api.tests/Integration/SettlementArchiveImmutabilityTests.cs` — extend or add alongside `SettlementReversalTests.cs`; assert two locked paths, original bytes stable
- [x] T027 [P] [US3] Add unit tests for GCS promote path in `apps/api.tests/Unit/GcsSettlementArchiveStoreTests.cs` — test existence-check and retention application using test doubles or focused integration against mocked `StorageClient` wrapper (document approach in test file header)

### Implementation for User Story 3

- [x] T028 [US3] Ensure all US3 integration tests pass and cover contract test matrix in `specs/050-gcs-worm-retention/contracts/settlement-archive-retention.md` (retention applied, overwrite rejected, delete rejected, re-finalize distinct paths)
- [x] T029 [US3] Run regression suite: `dotnet test apps/api.tests --filter "FullyQualifiedName~SettlementArchiveImmutability|FullyQualifiedName~SettlementAtomicity|FullyQualifiedName~SettlementReversal|FullyQualifiedName~InMemorySettlementArchiveStore|FullyQualifiedName~SettlementArchiveStartupValidator|FullyQualifiedName~GcsSettlementArchiveStore"`
- [x] T030 [US3] Verify failed-finalize atomicity unchanged — re-run `SettlementAtomicityTests`; assert zero retention-locked objects after render/stage/DB-commit failures (`StoredObjectCount == 0`, no entries in retention dictionary)

**Checkpoint**: Full SPLR-43 acceptance criteria proven by automated tests; no regression in spec 043 atomicity

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Infra doc alignment, coverage gate, quickstart validation.

- [x] T031 [P] Confirm `.specify/memory/infrastructure.md` WORM section states 7-year retention + Bucket Lock aligned with `RetentionYears` default (update if still inconsistent)
- [x] T032 [P] Add `RetentionYears` / startup validation notes to `specs/050-gcs-worm-retention/quickstart.md` if implementation deviates from documented gcloud commands
- [x] T033 Verify ≥80.0% line/branch coverage on touched backend files via `dotnet test apps/api.tests --collect:"XPlat Code Coverage"` — scope: `GcsSettlementArchiveStore`, `InMemorySettlementArchiveStore` (both), `SettlementArchiveStartupValidator`, `SettlementArchiveOptions`; missing or unparseable cobertura reports FAIL
- [x] T034 Run quickstart.md validation scenarios A–F in `specs/050-gcs-worm-retention/quickstart.md` and document results in PR description

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS all user stories**
- **User Story 1 (Phase 3)**: Depends on Foundational — MVP storage-layer retention
- **User Story 2 (Phase 4)**: Depends on Foundational; integrates with US1 promote path (can start after T013–T015 begin, but overwrite guard tests T017–T018 need T013)
- **User Story 3 (Phase 5)**: Depends on US1 + US2 complete (full immutability matrix)
- **Polish (Phase 6)**: Depends on US1–US3 complete

### User Story Dependencies

| Story | Priority | Depends on | Delivers independently |
|-------|----------|------------|------------------------|
| US1 | P1 | Foundational | Retention lock on promote; delete rejected |
| US2 | P1 | Foundational (+ US1 promote path) | Overwrite guard; startup validator |
| US3 | P2 | US1 + US2 | Full CI immutability proof + regression |

### Within Each User Story

- Tests written and **FAIL** before implementation
- In-memory store behavior before/alongside GCS store
- Story tests green before next story

### Parallel Opportunities

- **Phase 1**: T002 ∥ T003
- **Phase 2**: T006 ∥ T007 ∥ T008 ∥ T009 (after T004–T005)
- **Phase 3 tests**: T010 ∥ T011 ∥ T012; **Phase 3 impl**: T013 ∥ T014 (in-memory stores) then T015 (GCS)
- **Phase 4 tests**: T017 ∥ T018 ∥ T019; **Phase 4 impl**: T020–T021 ∥ T022 then T023
- **Phase 5 tests**: T025 ∥ T026 ∥ T027
- **Phase 6**: T031 ∥ T032

---

## Parallel Example: User Story 1

```bash
# Failing tests in parallel (after Foundational):
dotnet test apps/api.tests --filter "FullyQualifiedName~Finalize_AppliesRetentionLock"
dotnet test apps/api.tests --filter "FullyQualifiedName~PromoteAsync_SetsRetentionLock"
dotnet test apps/api.tests --filter "FullyQualifiedName~RetentionLockedObject_RejectDelete"

# In-memory implementations in parallel:
# T013 apps/api.tests/Integration/InMemorySettlementArchiveStore.cs
# T014 apps/api/Services/InMemorySettlementArchiveStore.cs
```

---

## Parallel Example: User Story 2

```bash
# Failing tests in parallel:
dotnet test apps/api.tests --filter "FullyQualifiedName~PromoteAsync_WhenFinalPathExists"
dotnet test apps/api.tests --filter "FullyQualifiedName~UploadAsync_WhenFinalPathExists"
dotnet test apps/api.tests --filter "FullyQualifiedName~SettlementArchiveStartupValidator"

# Implementation:
# T020 GcsSettlementArchiveStore.cs (GCS overwrite guard)
# T021 in-memory stores (parallel with T022 validator creation)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1 (retention lock on promote)
4. **STOP and VALIDATE**: Retention metadata present; delete rejected on locked objects
5. Demo/legal compliance increment before overwrite guard and startup validator

### Incremental Delivery

1. Setup + Foundational → scaffolding ready
2. US1 → retention on promote (MVP)
3. US2 → overwrite guard + startup validator
4. US3 → full test matrix + regression
5. Polish → coverage gate + quickstart

### Parallel Team Strategy

1. Team completes Setup + Foundational together
2. Developer A: US1 (GCS + in-memory retention)
3. Developer B: US2 (overwrite guard + startup validator) after T013 lands
4. Developer C: US3 integration/regression tests once US1+US2 merge

---

## Notes

- No database migrations, API route changes, or frontend files expected
- Staging bucket MUST remain without retention lock — never apply retention in `StageAsync`
- `SettlementService.FinalizeAsync` phase ordering unchanged (spec 043); all retention logic lives in archive store `PromoteAsync`
- GUID final paths make overwrite rare; app-level guard is defense-in-depth (FR-003)
- WORM final objects remain non-deletable; staging bucket must be deletable per research.md §5
