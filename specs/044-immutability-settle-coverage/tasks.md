---
description: "Task list for Close Immutability Verification Gaps After Full Settlement (SPLR-39)"
---

# Tasks: Close Immutability Verification Gaps After Full Settlement

**Input**: Design documents from `/specs/044-immutability-settle-coverage/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/settled-event-immutability-verification.md, quickstart.md

**Tests**: REQUIRED per Constitution III. Each user story phase adds xUnit integration tests in `apps/api.tests/Integration/` (write failing tests first, then implement until green). Minimal product code only where tests expose gaps (`LedgerService.RecalculateAsync` guard). Final Polish phase enforces ≥80.0% line/branch coverage on **backend touched files** via `dotnet test --collect:"XPlat Code Coverage"` (coverlet → cobertura). No frontend changes — frontend coverage gate N/A unless files are touched.

**Organization**: Tasks grouped by user story (US1–US4). Backend verification slice through `apps/api.tests/Integration/`, `apps/api.tests/Integration/IntegrationTestBase.cs`, and optional `apps/api/Services/LedgerService.cs`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1–US4 (maps to user stories in spec.md)
- All paths are repo-relative

## Path Conventions

- Test base: `apps/api.tests/Integration/IntegrationTestBase.cs`
- New integration suite: `apps/api.tests/Integration/SettlementPostFinalizeImmutabilityTests.cs`
- Existing immutability tests: `apps/api.tests/Integration/SettlementImmutabilityTests.cs`
- Audit reference: `apps/api.tests/Integration/FrozenEventMutationAuditTests.cs`
- QBO mock pattern: `apps/api.tests/Integration/IntegrationTestBase.cs` (`CreateFactoryWithQboHandler`)
- Product guard: `apps/api/Services/LedgerService.cs`, `apps/api/Services/FrozenEventMutationOperation.cs`
- Contract: `specs/044-immutability-settle-coverage/contracts/settled-event-immutability-verification.md`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm branch, prerequisites, and verification contract before test implementation.

- [x] T001 Verify branch `044-immutability-settle-coverage` and design docs in `specs/044-immutability-settle-coverage/` per plan.md
- [x] T002 [P] Review verification contract matrix in `specs/044-immutability-settle-coverage/contracts/settled-event-immutability-verification.md` (seeding rules, blocked paths, PDF invariants)
- [x] T003 [P] Review gap analysis and seeding decisions in `specs/044-immutability-settle-coverage/research.md` and lifecycle fixtures in `specs/044-immutability-settle-coverage/data-model.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared finalize seed helper, audit assertion utilities, test class scaffold, and `recalculate` operation constant. **Blocks all user stories.**

**⚠️ CRITICAL**: No user story test work begins until `SeedFinalizedEventAsync` compiles and returns `(eventId, lineItem, artist?, storedPath, originalPdfBytes, userId)`.

- [x] T004 Add `SeedFinalizedEventAsync` to `apps/api.tests/Integration/IntegrationTestBase.cs` — calls `SeedSettlementReadyEventAsync`, POST `/settle` with `FinalizeSettlementRequest(ValidSignatureBase64(), true)`, captures `ArchiveStore.StoredObjectPaths.Single()` and PDF bytes; returns tuple per research.md §2
- [x] T005 [P] Add `SeedFinalizedEventWithArtistAsync` overload or optional flag on `SeedFinalizedEventAsync` in `apps/api.tests/Integration/IntegrationTestBase.cs` — creates artist via API before finalize when artist mutation tests need one
- [x] T006 [P] Add protected audit assertion helpers to `apps/api.tests/Integration/IntegrationTestBase.cs` (or `apps/api.tests/TestSupport/FrozenEventAuditAssertions.cs`) — mirror `GetFrozenAuditLogs` / `AssertFrozenAuditLog` pattern from `apps/api.tests/Integration/FrozenEventMutationAuditTests.cs`
- [x] T007 Add `Recalculate = "recalculate"` constant to `apps/api/Services/FrozenEventMutationOperation.cs` per research.md §6
- [x] T008 Create `SettlementPostFinalizeImmutabilityTests` class skeleton in `apps/api.tests/Integration/SettlementPostFinalizeImmutabilityTests.cs` extending `IntegrationTestBase` with `EnableLogCapture => true` and `IsQuestPdfSupported()` guard on each test

**Checkpoint**: Shared helpers compile; test class ready; operation constant available

---

## Phase 3: User Story 1 — Post-Settlement Mutations Fail After Real Finalize (Priority: P1) 🎯 MVP

**Goal**: Every standard mutation path on a `SETTLED` event seeded via the complete finalize workflow returns HTTP 400, emits immutability audit log with correct `Operation`, and leaves underlying records unchanged.

**Independent Test**: `dotnet test apps/api.tests --filter "FullyQualifiedName~SettlementPostFinalizeImmutabilityTests&FullyQualifiedName~Settled"` — all blocked-mutation cases pass with audit assertions.

### Tests for User Story 1 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL if guards are missing**

- [x] T009 [P] [US1] Add failing test `PostFinalize_DeleteLineItem_Returns400_AndLogsDeleteLineItem` in `apps/api.tests/Integration/SettlementPostFinalizeImmutabilityTests.cs` per contract row #1
- [x] T010 [P] [US1] Add failing test `PostFinalize_UpdateArtist_Returns400_AndLogsUpdateArtist` in `apps/api.tests/Integration/SettlementPostFinalizeImmutabilityTests.cs` per contract row #2 (uses artist seed)
- [x] T011 [P] [US1] Add failing test `PostFinalize_DeleteArtist_Returns400_AndLogsDeleteArtist` in `apps/api.tests/Integration/SettlementPostFinalizeImmutabilityTests.cs` per contract row #3
- [x] T012 [P] [US1] Add failing test `PostFinalize_CreateLineItem_Returns400_AndLogsCreateLineItem` in `apps/api.tests/Integration/SettlementPostFinalizeImmutabilityTests.cs` per contract row #4
- [x] T013 [P] [US1] Add failing test `PostFinalize_UpdateLineItem_Returns400_AndLogsUpdateLineItem` in `apps/api.tests/Integration/SettlementPostFinalizeImmutabilityTests.cs` per contract row #5
- [x] T014 [P] [US1] Add failing test `PostFinalize_UpdateEventMetadata_Returns400_AndLogsUpdateEventMetadata` in `apps/api.tests/Integration/SettlementPostFinalizeImmutabilityTests.cs` per contract row #6
- [x] T015 [P] [US1] Add failing test `PostFinalize_DeleteEvent_Returns400_AndLogsDeleteEvent` in `apps/api.tests/Integration/SettlementPostFinalizeImmutabilityTests.cs` per contract row #7
- [x] T016 [P] [US1] Add failing test `PostFinalize_CreateArtist_Returns400_AndLogsCreateArtist` in `apps/api.tests/Integration/SettlementPostFinalizeImmutabilityTests.cs` per contract row #8
- [x] T017 [P] [US1] Add failing test `PostFinalize_LockBudget_Returns400_AndLogsLockBudget` in `apps/api.tests/Integration/SettlementPostFinalizeImmutabilityTests.cs` per contract row #9

### Implementation for User Story 1

- [x] T018 [US1] Run US1 tests and fix any product-code gaps only if tests fail due to missing guards (expected: guards exist from specs 004/039); do not use `SetEventStatusDirectAsync` in new tests
- [x] T019 [US1] Refactor `apps/api.tests/Integration/SettlementImmutabilityTests.cs` to call `SeedFinalizedEventAsync` from `IntegrationTestBase.cs` instead of inline finalize (preserve existing assertions)

**Checkpoint**: MVP — all SPLR-39 gap mutation paths (delete line item, update/delete artist) plus full mutation inventory proven on real-finalize seed

---

## Phase 4: User Story 2 — Archived PDF Remains Byte-Identical (Priority: P1)

**Goal**: Rejected post-settlement mutation attempts never alter the archived settlement document; no additional PDF artifacts created.

**Independent Test**: Each US1 test also asserts PDF byte equality; US2 adds sequential multi-mutation and artifact-count scenarios.

### Tests for User Story 2 (REQUIRED) ⚠️

> **NOTE: Extend US1 tests with PDF assertions, then add edge-case tests**

- [x] T020 [P] [US2] Add `originalPdfBytes` and `ArchiveStore.GetStoredPdf(storedPath).Should().Equal(originalPdfBytes)` assertions to every US1 test in `apps/api.tests/Integration/SettlementPostFinalizeImmutabilityTests.cs` per contract per-test assertions #4–#5
- [x] T021 [US2] Add test `PostFinalize_SequentialBlockedMutations_PdfUnchanged` in `apps/api.tests/Integration/SettlementPostFinalizeImmutabilityTests.cs` — execute multiple blocked mutations in sequence; assert PDF bytes and `StoredObjectCount == 1` after full sequence per contract sequential mutation section
- [x] T022 [US2] Add test `PostFinalize_BlockedMutation_NoSecondPdfArtifact` in `apps/api.tests/Integration/SettlementPostFinalizeImmutabilityTests.cs` — assert `ArchiveStore.StoredObjectCount` unchanged and no new paths in `StoredObjectPaths` after rejected attempt

### Implementation for User Story 2

- [x] T023 [US2] Run US2 tests until green: `dotnet test apps/api.tests --filter "FullyQualifiedName~SettlementPostFinalizeImmutabilityTests"`

**Checkpoint**: PDF byte stability proven for all blocked paths and sequential edge cases

---

## Phase 5: User Story 3 — RECONCILED Immutability via Real Lifecycle (Priority: P2)

**Goal**: Events reaching `RECONCILED` through finalize → reconcile reject representative mutations with audit logging and unchanged PDF bytes.

**Independent Test**: Reconciled-state tests pass without any direct status assignment seeding.

### Tests for User Story 3 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL if reconcile path breaks guards**

- [x] T024 [P] [US3] Add helper `SeedFinalizedThenReconciledAsync` on `apps/api.tests/Integration/IntegrationTestBase.cs` — finalize via `SeedFinalizedEventAsync`, POST `/reconcile`, return same tuple with `RECONCILED` status
- [x] T025 [P] [US3] Add failing test `PostReconcile_UpdateLineItem_Returns400_AndLogsAudit` in `apps/api.tests/Integration/SettlementPostFinalizeImmutabilityTests.cs` per contract row #11
- [x] T026 [P] [US3] Add failing test `PostReconcile_UpdateArtist_Returns400_AndLogsAudit` in `apps/api.tests/Integration/SettlementPostFinalizeImmutabilityTests.cs` per contract row #12
- [x] T027 [P] [US3] Add failing test `PostReconcile_DeleteArtist_Returns400_AndLogsAudit_AndPdfUnchanged` in `apps/api.tests/Integration/SettlementPostFinalizeImmutabilityTests.cs` per contract row #13

### Implementation for User Story 3

- [x] T028 [US3] Run US3 tests until green: `dotnet test apps/api.tests --filter "FullyQualifiedName~PostReconcile_"`

**Checkpoint**: RECONCILED immutability proven via real finalize + reconcile lifecycle (SC-003)

---

## Phase 6: User Story 4 — Recalculate Blocked & QBO Sync PDF Stability (Priority: P2)

**Goal**: Recalculate rejected on frozen events with audit log; sanctioned QBO actuals sync on finalized/reconciled events succeeds without PDF drift.

**Independent Test**: Recalculate returns 400; QBO sync returns 200 with updated `QboActualValue`, no rejection audit, PDF bytes unchanged.

### Tests for User Story 4 (REQUIRED) ⚠️

> **NOTE: Write recalculate test FIRST — expected to FAIL until guard added**

- [x] T029 [P] [US4] Add failing test `PostFinalize_Recalculate_Returns400_AndLogsRecalculate_AndPdfUnchanged` in `apps/api.tests/Integration/SettlementPostFinalizeImmutabilityTests.cs` — POST `/recalculate`; assert audit `Operation = recalculate` per contract row #10
- [x] T030 [P] [US4] Add failing test `PostFinalize_QboSync_ActualsOnly_Succeeds_PdfUnchanged` in `apps/api.tests/Integration/SettlementPostFinalizeImmutabilityTests.cs` — use `CreateFactoryWithQboHandler`, seed QBO credential/mapping via `IntegrationTestBase` helpers, POST `/sync`; assert 200, no rejection audit, PDF bytes unchanged per contract sanctioned QBO section
- [x] T031 [P] [US4] Add failing test `PostReconcile_QboSync_ActualsOnly_Succeeds_PdfUnchanged` in `apps/api.tests/Integration/SettlementPostFinalizeImmutabilityTests.cs` — same as T030 on reconciled seed

### Implementation for User Story 4

- [x] T032 [US4] Add `_frozenEventAuditor.RejectIfFrozen` call at start of `RecalculateAsync` in `apps/api/Services/LedgerService.cs` with `FrozenEventMutationOperation.Recalculate` and message consistent with other ledger mutations
- [x] T033 [P] [US4] Add `recalculate` operation label to allowed-values table in `specs/039-log-frozen-mutation-rejections/contracts/frozen-event-mutation-audit-log.md`
- [x] T034 [US4] Run US4 tests until green: `dotnet test apps/api.tests --filter "FullyQualifiedName~Recalculate_|FullyQualifiedName~QboSync_"`

**Checkpoint**: Recalculate guard in place; QBO sanctioned path verified without PDF corruption

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Regression safety, coverage gate, quickstart validation.

- [x] T035 Run full immutability regression suite per `specs/044-immutability-settle-coverage/quickstart.md` Scenario G: `dotnet test apps/api.tests --filter "FullyQualifiedName~FrozenEventMutationAudit|FullyQualifiedName~FrozenEventPersistenceGuard|FullyQualifiedName~SettlementAtomicity|FullyQualifiedName~SettlementFinalize|FullyQualifiedName~SettlementPostFinalizeImmutability|FullyQualifiedName~SettlementImmutability"`
- [x] T036 Verify ≥80.0% line/branch coverage on touched backend files via `dotnet test apps/api.tests --collect:"XPlat Code Coverage"` — inspect cobertura for `LedgerService.cs`, `IntegrationTestBase.cs`, `SettlementPostFinalizeImmutabilityTests.cs`; missing/unparseable reports FAIL; frontend gate N/A (no `apps/web` changes)
- [x] T037 [P] Execute quickstart scenarios A–F in `specs/044-immutability-settle-coverage/quickstart.md` and confirm expected outcomes documented
- [x] T038 Confirm zero API DTO/route/OpenAPI changes — no `swagger.json` regeneration or `apps/web/src/types/generated-api.ts` update required

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS all user stories**
- **User Stories (Phases 3–6)**: All depend on Foundational completion
  - US1 → US2 sequentially recommended (US2 extends US1 tests with PDF assertions)
  - US3 independent after Foundational (uses own reconcile seed)
  - US4 independent after Foundational (recalculate guard is US4-only product change)
- **Polish (Phase 7)**: Depends on US1–US4 completion

### User Story Dependencies

| Story | Depends on | Independent test filter |
|-------|------------|-------------------------|
| US1 (P1) | Phase 2 | `PostFinalize_*` mutation rejection tests |
| US2 (P1) | US1 tests exist | Sequential PDF + artifact count tests |
| US3 (P2) | Phase 2 | `PostReconcile_*` tests |
| US4 (P2) | Phase 2 + T007 constant | `Recalculate_*`, `QboSync_*` tests |

### Parallel Opportunities

- **Phase 1**: T002 ∥ T003
- **Phase 2**: T005 ∥ T006 (after T004 starts)
- **Phase 3**: T009–T017 all parallel (same file — coordinate commits; mark [P] for logical independence)
- **Phase 5**: T025 ∥ T026 ∥ T027 (after T024)
- **Phase 6**: T029 ∥ T030 ∥ T031 (tests); T033 ∥ T034 after T032
- **Phase 7**: T037 ∥ T038

---

## Parallel Example: User Story 1

```bash
# After Phase 2 complete, add all blocked-mutation tests in parallel (separate test methods):
Task: "PostFinalize_DeleteLineItem_Returns400_AndLogsDeleteLineItem in SettlementPostFinalizeImmutabilityTests.cs"
Task: "PostFinalize_UpdateArtist_Returns400_AndLogsUpdateArtist in SettlementPostFinalizeImmutabilityTests.cs"
Task: "PostFinalize_DeleteArtist_Returns400_AndLogsDeleteArtist in SettlementPostFinalizeImmutabilityTests.cs"
# ... remaining US1 mutation paths
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (`SeedFinalizedEventAsync`)
3. Complete Phase 3: User Story 1 (SPLR-39 core gap: delete line item, update/delete artist + full inventory)
4. **STOP and VALIDATE**: `dotnet test --filter "FullyQualifiedName~SettlementPostFinalizeImmutabilityTests&FullyQualifiedName~PostFinalize_"`
5. Demo compliance proof on real finalize seed

### Incremental Delivery

1. Setup + Foundational → helpers ready
2. US1 → mutation rejection on real finalize (MVP)
3. US2 → PDF byte stability assertions
4. US3 → RECONCILED lifecycle coverage
5. US4 → recalculate guard + QBO PDF stability
6. Polish → regression + coverage gate

### Parallel Team Strategy

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: US1 + US2 (same test file)
   - Developer B: US3 (reconcile lifecycle)
   - Developer C: US4 (recalculate guard + QBO sync)
3. Merge and run Phase 7 regression

---

## Notes

- Do **not** replace `FrozenEventMutationAuditTests` helper-seeded tests — they remain the fast operation-label matrix
- All new immutability scenarios MUST use `SeedFinalizedEventAsync` / `SeedFinalizedThenReconciledAsync` — never `SetEventStatusDirectAsync`
- QBO sync tests verify **sanctioned actuals refresh succeeds** with PDF unchanged — not blanket sync rejection (Constitution IV/V)
- QuestPDF-dependent tests skip on unsupported Windows ARM via `IsQuestPdfSupported()` — full suite runs on Linux CI
