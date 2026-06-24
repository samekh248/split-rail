---
description: "Task list for Atomic Settlement Finalize Pipeline (SPLR-38)"
---

# Tasks: Atomic Settlement Finalize Pipeline

**Input**: Design documents from `/specs/043-atomic-settle-pipeline/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/settle-finalize-atomicity.md, quickstart.md

**Tests**: REQUIRED per Constitution III. Each user story phase adds xUnit integration tests in `apps/api.tests/Integration/` and unit tests in `apps/api.tests/Unit/` (write failing tests first, then implement until green). Final Polish phase enforces ≥80.0% line/branch coverage on **backend touched files** via `dotnet test --collect:"XPlat Code Coverage"` (coverlet → cobertura). No frontend changes — frontend coverage gate N/A unless files are touched.

**Organization**: Tasks grouped by user story (US1–US3). Backend hardening slice through `apps/api/Services/`, `apps/api/Configuration/`, `apps/api/Program.cs`, and `apps/api.tests/`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1–US3 (maps to user stories in spec.md)
- All paths are repo-relative

## Path Conventions

- Options: `apps/api/Configuration/SettlementArchiveOptions.cs`
- Archive store: `apps/api/Services/ISettlementArchiveStore.cs`, `apps/api/Services/GcsSettlementArchiveStore.cs`
- PDF renderer: `apps/api/Services/ISettlementPdfRenderer.cs`, `apps/api/Services/SettlementPdfRenderer.cs`
- Finalize orchestration: `apps/api/Services/SettlementService.cs`
- DI: `apps/api/Program.cs`
- Integration tests: `apps/api.tests/Integration/SettlementAtomicityTests.cs`, `SettlementConcurrencyTests.cs`, `SettlementFinalizeTests.cs`
- Test fakes: `apps/api.tests/Integration/InMemorySettlementArchiveStore.cs`, `apps/api.tests/TestSupport/ThrowingSettlementPdfRenderer.cs`, `apps/api.tests/TestSupport/SaveChangesFailureInterceptor.cs`
- Unit tests: `apps/api.tests/Unit/SettlementServiceTests.cs`
- Contract: `specs/043-atomic-settle-pipeline/contracts/settle-finalize-atomicity.md`
- Test base: `apps/api.tests/Integration/IntegrationTestBase.cs`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm branch, prerequisites, and atomic pipeline contract before implementation.

- [x] T001 Verify branch `043-atomic-settle-pipeline` and design docs in `specs/043-atomic-settle-pipeline/` per plan.md
- [x] T002 [P] Review atomic pipeline contract in `specs/043-atomic-settle-pipeline/contracts/settle-finalize-atomicity.md` (phases A/B/C, failure semantics, stage/promote interface)
- [x] T003 [P] Review staging path conventions and artifact states in `specs/043-atomic-settle-pipeline/data-model.md` and stage→commit→promote decision in `specs/043-atomic-settle-pipeline/research.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Archive store interface extension, staging configuration, renderer abstraction, test fakes, and DI scaffolding. **Blocks all user stories.**

**⚠️ CRITICAL**: No user story implementation begins until interfaces compile and test fakes can force failures at render, stage, and save.

- [x] T004 Extend `SettlementArchiveOptions` with `StagingBucketName` (default `{BucketName}-staging` when unset) in `apps/api/Configuration/SettlementArchiveOptions.cs` per data-model.md
- [x] T005 Extend `ISettlementArchiveStore` with `StageAsync`, `PromoteAsync`, and `DeleteStagedAsync` in `apps/api/Services/ISettlementArchiveStore.cs` per contracts/settle-finalize-atomicity.md; retain existing `UploadAsync` and `CreateSignedUrlAsync`
- [x] T006 [P] Create `ISettlementPdfRenderer` interface mirroring `SettlementPdfRenderer.Render` signature in `apps/api/Services/ISettlementPdfRenderer.cs`
- [x] T007 [P] Implement `StageAsync`, `PromoteAsync`, and `DeleteStagedAsync` on `InMemorySettlementArchiveStore` in `apps/api.tests/Integration/InMemorySettlementArchiveStore.cs` — track staged vs promoted objects separately; add `StagedObjectCount`, `ThrowOnStage`, `ThrowOnPromote` flags; migrate `ThrowOnUpload` to stage semantics
- [x] T008 [P] Create `ThrowingSettlementPdfRenderer` fake implementing `ISettlementPdfRenderer` with `ThrowOnRender` flag in `apps/api.tests/TestSupport/ThrowingSettlementPdfRenderer.cs`
- [x] T009 [P] Create `SaveChangesFailureInterceptor` test helper implementing `SaveChangesInterceptor` with `ThrowOnNextSave` flag in `apps/api.tests/TestSupport/SaveChangesFailureInterceptor.cs`
- [x] T010 Update `SettlementPdfRenderer` to implement `ISettlementPdfRenderer` in `apps/api/Services/SettlementPdfRenderer.cs`
- [x] T011 Register `ISettlementPdfRenderer` → `SettlementPdfRenderer` in `apps/api/Program.cs`; bind `StagingBucketName` from configuration
- [x] T012 Extend `IntegrationTestBase.ConfigureTestServices` in `apps/api.tests/Integration/IntegrationTestBase.cs` with helpers to swap in `ThrowingSettlementPdfRenderer` and register `SaveChangesFailureInterceptor` when needed for atomicity tests

**Checkpoint**: Interfaces compile; in-memory store supports stage/promote/delete; test fakes ready for failure injection

---

## Phase 3: User Story 1 — Failed Finalize Never Leaves a Half-Frozen Settlement (Priority: P1) 🎯 MVP

**Goal**: All-or-nothing finalize — failures at render, stage upload, DB commit, or promote leave the event unsettled with zero orphaned PDF artifacts; successful finalize produces exactly one promoted WORM object referenced by the event.

**Independent Test**: Force failures at render, stage, and DB-commit stages via test fakes; assert event `PRE_SHOW`, null `settlement_pdf_url`, `StoredObjectCount == 0`, `StagedObjectCount == 0`. Happy-path finalize still returns `200` with one final object.

### Tests for User Story 1 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T013 [P] [US1] Add failing integration test `Finalize_WhenRenderFails_LeavesEventUnsettledAndNoStoredPdf` in `apps/api.tests/Integration/SettlementAtomicityTests.cs` — register `ThrowingSettlementPdfRenderer` with `ThrowOnRender = true`; assert HTTP error, event not `SETTLED`, `ArchiveStore.StoredObjectCount == 0`, `StagedObjectCount == 0`
- [x] T014 [P] [US1] Update failing integration test `Finalize_WhenUploadFails_LeavesEventUnsettled` in `apps/api.tests/Integration/SettlementAtomicityTests.cs` — set `ThrowOnStage = true` on archive store; assert HTTP 502, event not settled, zero staged and final objects
- [x] T015 [P] [US1] Add failing integration test `Finalize_WhenDbCommitFailsAfterStage_DeletesStagedAndLeavesEventUnsettled` in `apps/api.tests/Integration/SettlementAtomicityTests.cs` — enable `SaveChangesFailureInterceptor.ThrowOnNextSave`; assert event not settled, zero final objects, staged object deleted
- [x] T016 [P] [US1] Verify existing happy-path tests in `apps/api.tests/Integration/SettlementFinalizeTests.cs` still pass after stage/promote refactor — event `SETTLED`, one final object, zero staged objects

### Implementation for User Story 1

- [x] T017 [US1] Implement `StageAsync`, `PromoteAsync`, and `DeleteStagedAsync` on `GcsSettlementArchiveStore` in `apps/api/Services/GcsSettlementArchiveStore.cs` — stage to `StagingBucketName`, server-side copy to `BucketName`, delete staging object; wrap failures in `SettlementArchiveException`
- [x] T018 [US1] Refactor `SettlementService.FinalizeAsync` in `apps/api/Services/SettlementService.cs` to phase A/B/C per contract: validate/snapshot/render (no transaction) → `StageAsync` → short DB transaction (`FOR UPDATE`, re-validate, set fields, commit) → `PromoteAsync` → `DeleteStagedAsync`; inject `ISettlementPdfRenderer` instead of concrete renderer
- [x] T019 [US1] Add staging cleanup in `SettlementService.FinalizeAsync` catch/finally paths in `apps/api/Services/SettlementService.cs` — on any failure before successful promote, call `DeleteStagedAsync`; never leave staged objects after failed finalize
- [x] T020 [US1] Implement promote retry (up to 3 attempts with short backoff) and compensating behavior per contract in `apps/api/Services/SettlementService.cs` — synchronous promote before returning 200; on permanent promote failure after commit, run compensating settlement rollback (return to `PRE_SHOW`, clear settlement fields, budget remains locked) using authorized save context if needed
- [x] T021 [US1] Run US1 tests until green: `cd apps/api.tests && dotnet test --filter "FullyQualifiedName~SettlementAtomicity|FullyQualifiedName~SettlementFinalize"`

**Checkpoint**: MVP — atomic finalize with stage/promote; all three failure points leave event unsettled with no orphaned artifacts

---

## Phase 4: User Story 2 — Finalize Operation Ordering Matches Settlement Contract (Priority: P1)

**Goal**: PDF render and stage upload complete before DB transaction begins; `FOR UPDATE` row lock held only inside short commit transaction; concurrent finalize first-wins preserved with loser staging cleanup; already-settled events rejected without new PDF.

**Independent Test**: Code review or test instrumentation confirms no `BeginTransactionAsync` before `StageAsync`; parallel finalize → one 200, one 409, exactly one final PDF, zero staged objects from loser.

### Tests for User Story 2 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T022 [P] [US2] Update integration test `ParallelFinalize_OneSucceedsOneConflicts_WithSingleStoredPdf` in `apps/api.tests/Integration/SettlementConcurrencyTests.cs` — assert exactly one final object, zero staged objects remain after race
- [x] T023 [P] [US2] Add integration test `Finalize_OnAlreadySettledEvent_RejectsWithoutNewPdf` in `apps/api.tests/Integration/SettlementAtomicityTests.cs` — settle event, attempt second finalize → 409/400; `StoredObjectCount` unchanged
- [x] T024 [P] [US2] Add unit test documenting transaction boundary in `apps/api.tests/Unit/SettlementServiceTests.cs` — verify `FinalizeAsync` calls stage before transaction (mock/archive store call-order assertion or structural test per research.md §4)

### Implementation for User Story 2

- [x] T025 [US2] Ensure `FOR UPDATE` and `BeginTransactionAsync` occur only in Phase B (after `StageAsync`) in `apps/api/Services/SettlementService.cs` — move read-only validation load outside transaction; re-load with lock inside transaction
- [x] T026 [US2] On `ConcurrencyConflictException` / `DbUpdateConcurrencyException` after staging, delete loser's staged object before rethrow in `apps/api/Services/SettlementService.cs` per contract concurrent-loser rule
- [x] T027 [US2] Run US2 tests until green: `cd apps/api.tests && dotnet test --filter "FullyQualifiedName~SettlementConcurrency|FullyQualifiedName~SettlementAtomicity"`

**Checkpoint**: Pipeline ordering matches spec 004 contract step 6; concurrency and already-settled behavior preserved

---

## Phase 5: User Story 3 — Atomicity Failures Verifiable in Automated Tests (Priority: P2)

**Goal**: Complete automated test matrix proving atomicity at every failure point; unit tests cover cleanup paths; persistence guard (spec 041) and reversal regression unaffected.

**Independent Test**: Run full settlement atomicity suite — distinct tests for render, stage, and DB-commit failures; all assert event state and artifact counts per quickstart Scenarios A–C.

### Tests for User Story 3 (REQUIRED) ⚠️

- [x] T028 [P] [US3] Add unit test `FinalizeAsync_OnDbCommitFailure_DeletesStagedObject` in `apps/api.tests/Unit/SettlementServiceTests.cs` using in-memory DB + fake archive store with staged-object tracking
- [x] T029 [P] [US3] Add integration regression test `Finalize_OnPreShowEvent_SucceedsWithPersistenceGuardActive` in `apps/api.tests/Integration/SettlementFinalizeTests.cs` — confirm spec 041 interceptor does not block `PRE_SHOW` → `SETTLED` transition
- [x] T030 [P] [US3] Add integration regression test `ReverseAndRefinalize_ProducesSecondFinalPdf_OriginalPreserved` in `apps/api.tests/Integration/SettlementReversalTests.cs` — verify stage/promote produces distinct final paths; original WORM object count unchanged

### Implementation for User Story 3

- [x] T031 [US3] Update `InMemoryArchiveStoreForUnit` in `apps/api.tests/Unit/SettlementServiceTests.cs` to implement new `ISettlementArchiveStore` stage/promote/delete methods and `ISettlementPdfRenderer` injection in `CreateService` helper
- [x] T032 [US3] Run full US3 + settlement regression suite: `cd apps/api.tests && dotnet test --filter "FullyQualifiedName~Settlement"`

**Checkpoint**: All failure-point atomicity tests green; persistence guard and reversal regressions pass

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Configuration docs, coverage gate, quickstart validation.

- [x] T033 [P] Add `StagingBucketName` example to `apps/api/appsettings.json` (commented or Development section) documenting deletable staging bucket per quickstart.md
- [x] T034 Run quickstart validation scenarios A–F in `specs/043-atomic-settle-pipeline/quickstart.md` — atomicity, concurrency, ordering, regression checks
- [x] T035 Verify ≥80.0% line/branch coverage on touched backend files via `dotnet test apps/api.tests --collect:"XPlat Code Coverage"` (coverlet → cobertura); missing or unparseable report FAILs per Constitution III
- [x] T036 [P] Confirm no raw signature payloads or storage credentials in finalize failure logs — extend log assertions in `apps/api.tests/Unit/SettlementServiceTests.cs` if new log paths added (SC-007 / FR-008)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS all user stories**
- **User Story 1 (Phase 3)**: Depends on Foundational — **MVP**; delivers core atomicity
- **User Story 2 (Phase 4)**: Depends on US1 implementation (same `FinalizeAsync` method) — ordering and concurrency hardening
- **User Story 3 (Phase 5)**: Depends on US1 + US2 — regression and coverage completeness
- **Polish (Phase 6)**: Depends on US1–US3

### User Story Dependencies

- **US1 (P1)**: After Foundational — no dependency on other stories; **MVP scope**
- **US2 (P1)**: After US1 — refines same `SettlementService.FinalizeAsync`; independently testable via concurrency/ordering tests
- **US3 (P2)**: After US1 + US2 — test matrix completion and regression; independently verifiable via full settlement test filter

### Within Each User Story

- Tests written and failing before implementation
- Archive store + renderer abstractions before service refactor
- Service refactor before regression verification
- Story tests green before next phase

### Parallel Opportunities

- Phase 1: T002 ∥ T003
- Phase 2: T006 ∥ T007 ∥ T008 ∥ T009 (after T005)
- Phase 3 tests: T013 ∥ T014 ∥ T015 ∥ T016 (all failing-first)
- Phase 4 tests: T022 ∥ T023 ∥ T024
- Phase 5 tests: T028 ∥ T029 ∥ T030
- Phase 6: T033 ∥ T036

---

## Parallel Example: User Story 1

```bash
# Launch all failing atomicity tests together (after Phase 2):
Task T013: Finalize_WhenRenderFails_LeavesEventUnsettledAndNoStoredPdf
Task T014: Finalize_WhenUploadFails_LeavesEventUnsettled (stage failure)
Task T015: Finalize_WhenDbCommitFailsAfterStage_DeletesStagedAndLeavesEventUnsettled
Task T016: SettlementFinalizeTests happy-path verification

# Then implement sequentially (same service file):
Task T017 → T018 → T019 → T020 → T021
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1 (stage/promote + three failure tests + happy path)
4. **STOP and VALIDATE**: Run `SettlementAtomicityTests` + `SettlementFinalizeTests`
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → interfaces and fakes ready
2. US1 → atomic finalize hardened → **MVP**
3. US2 → ordering + concurrency loser cleanup
4. US3 → full regression matrix + unit cleanup tests
5. Polish → coverage gate + quickstart

### Parallel Team Strategy

1. Team completes Setup + Foundational together
2. After Foundational:
   - Developer A: US1 tests + `SettlementService` refactor
   - Developer B: US2 concurrency/ordering tests (after T018 lands)
   - Developer C: US3 regression tests (after US1 green)

---

## Notes

- No database migrations, API route changes, or frontend work for this feature
- Finalize HTTP contract unchanged — see spec 004 `settle.md`; internal pipeline only
- WORM final objects remain non-deletable; staging bucket must be deletable per research.md §3
- `[P]` tasks = different files, no incomplete-task dependencies
- Commit after each task or logical group; stop at any checkpoint to validate story independently
