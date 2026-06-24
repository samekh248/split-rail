---
description: "Task list for Explicit Offset Entry Semantics for QBO Actuals Corrections (SPLR-37)"
---

# Tasks: Explicit Offset Entry Semantics for QBO Actuals Corrections

**Input**: Design documents from `/specs/042-qbo-offset-entry-semantics/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: REQUIRED per Constitution III. Each user story phase adds xUnit unit/integration tests in `apps/api.tests/` (write failing tests first, then implement until green) and Vitest + RTL in `apps/web/tests/` for US2. Final Polish phase enforces ≥80.0% line/branch coverage on **backend and frontend touched files** via `dotnet test --collect:"XPlat Code Coverage"` (coverlet → cobertura) and `npm run test:coverage` (Vitest → lcov).

**Organization**: Tasks grouped by user story (US1–US3). Backend sync pipeline in `apps/api/Services/`, schema in `apps/api/Data/`, ledger DTO in `apps/api/DTOs/Ledger/`, frontend badge in `apps/web/src/components/ledger/`.

**Status**: Implementation verified on branch `042-qbo-offset-entry-semantics` (commit `73841b3`). Tasks marked complete; use `/speckit-implement` only for gaps or regression fixes.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1–US3 (maps to user stories in spec.md)
- All paths are repo-relative

## Path Conventions

- Enums: `apps/api/Models/Enums/QboSyncLedgerEntryType.cs`, `apps/api/Models/Enums/QboSyncCorrectionType.cs`
- Model: `apps/api/Models/QboSyncLedger.cs`
- EF config: `apps/api/Data/ApplicationDbContext.cs`
- Sync: `apps/api/Services/QboSyncService.cs`, `apps/api/Services/QboSyncCorrectionService.cs`
- Ledger DTO: `apps/api/DTOs/Ledger/LedgerDtos.cs`, `apps/api/Services/LedgerService.cs`
- DI: `apps/api/Program.cs`
- Unit tests: `apps/api.tests/Unit/QboSyncCorrectionServiceTests.cs`, `apps/api.tests/Unit/QboSyncServiceTests.cs`, `apps/api.tests/Unit/QboSyncCorrectionAppendOnlyTests.cs`
- Integration tests: `apps/api.tests/Integration/QboOffsetCorrectionTests.cs`, `apps/api.tests/Integration/QboAppendOnlyTests.cs`, `apps/api.tests/Integration/QboSyncLedgerAppendOnlyGuardTests.cs`
- Frontend: `apps/web/src/components/ledger/QboCorrectionBadge.tsx`, `apps/web/src/components/ledger/LedgerRow.tsx`
- Frontend tests: `apps/web/tests/components/ledger/LedgerRow.test.tsx`
- Contracts: `specs/042-qbo-offset-entry-semantics/contracts/qbo-offset-corrections.md`, `specs/042-qbo-offset-entry-semantics/contracts/ledger-correction-badge.md`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm branch, prerequisites, and design contracts before implementation.

- [x] T001 Verify branch `042-qbo-offset-entry-semantics` and design docs in `specs/042-qbo-offset-entry-semantics/` per plan.md
- [x] T002 [P] Review correction semantics contract in `specs/042-qbo-offset-entry-semantics/contracts/qbo-offset-corrections.md` (scenarios S1–S5, invariants C1–C6)
- [x] T003 [P] Review badge contract in `specs/042-qbo-offset-entry-semantics/contracts/ledger-correction-badge.md` and schema changes in `specs/042-qbo-offset-entry-semantics/data-model.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Schema migration, enums, model extension, and EF partial unique indexes. **Blocks all user stories.**

**⚠️ CRITICAL**: No user story work begins until migration is applied and model compiles.

- [x] T004 [P] Add `QboSyncLedgerEntryType` enum (`Original`, `OffsetCorrection`) in `apps/api/Models/Enums/QboSyncLedgerEntryType.cs`
- [x] T005 [P] Add `QboSyncCorrectionType` enum (`AmountChange`, `VoidRemoval`) in `apps/api/Models/Enums/QboSyncCorrectionType.cs`
- [x] T006 Extend `QboSyncLedger` with `EntryType`, `CorrectionType`, `TargetStateAbsent`, `TargetStateAmount`, `CorrectedLedgerEntryId` in `apps/api/Models/QboSyncLedger.cs` per data-model.md
- [x] T007 Update `ConfigureQboSyncLedger` in `apps/api/Data/ApplicationDbContext.cs` — drop `IX_qbo_sync_ledger_event_txn`, add partial unique indexes for original and offset idempotency, map new columns
- [x] T008 Generate and apply EF migration `AddQboSyncLedgerOffsetSemantics` in `apps/api/Data/Migrations/20260619215722_AddQboSyncLedgerOffsetSemantics.cs` with backfill `entry_type = 'Original'` on existing rows
- [x] T009 Register `QboSyncCorrectionService` as scoped in `apps/api/Program.cs`
- [x] T010 Update `SeedSyncLedgerEntryDirectAsync` and test seed helpers in `apps/api.tests/Integration/IntegrationTestBase.cs` to set `EntryType = Original` on seeded ledger rows

**Checkpoint**: `dotnet build` succeeds; migration applied; existing QBO tests compile with new required fields

---

## Phase 3: User Story 1 — Bookkeeper Correction Produces Explicit Offset (Priority: P1) 🎯 MVP

**Goal**: Upstream amount changes and voids/removals produce typed `OffsetCorrection` ledger rows (net-to-target amounts, idempotent keys); original rows immutable; `qbo_actual_value` recomputed including on settled events.

**Independent Test**: Seed original ledger entry, mock QBO fetch with changed amount → sync → original row unchanged, offset row appended, line item actual matches upstream. Repeat with absent txn ID → negating offset, actual zero.

### Tests for User Story 1 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T011 [P] [US1] Add unit tests for net-to-target amount math and idempotency key logic in `apps/api.tests/Unit/QboSyncCorrectionServiceTests.cs` (contracts S1, S3, S4)
- [x] T012 [P] [US1] Add integration test `AmountChange_CreatesOffset_PreservesOriginal` in `apps/api.tests/Integration/QboOffsetCorrectionTests.cs` (quickstart Scenario 1)
- [x] T013 [P] [US1] Add integration test `VoidRemoval_CreatesNegatingOffset` in `apps/api.tests/Integration/QboOffsetCorrectionTests.cs` (quickstart Scenario 2)
- [x] T014 [P] [US1] Add integration test `ResyncUnchanged_DoesNotDuplicateOffset` in `apps/api.tests/Integration/QboOffsetCorrectionTests.cs` (quickstart Scenario 3)
- [x] T015 [P] [US1] Add integration test `SettledEvent_UpdatesActualsOnly` in `apps/api.tests/Integration/QboOffsetCorrectionTests.cs` (quickstart Scenario 5; FR-012)

### Implementation for User Story 1

- [x] T016 [US1] Implement `QboSyncCorrectionService` with amount-drift pass, void/removal pass, and idempotency checks in `apps/api/Services/QboSyncCorrectionService.cs` per research.md §2
- [x] T017 [US1] Refactor `ProcessTransactionsAsync` in `apps/api/Services/QboSyncService.cs` — mark new ingests as `EntryType = Original`, invoke correction service after ingest loop, preserve advisory lock transaction scope
- [x] T018 [US1] Ensure `RecomputeActualsForEventAsync` in `apps/api/Services/QboSyncService.cs` sums all entry types and bypasses frozen-event auditor (documented Constitution V exception in code comment)
- [x] T019 [US1] Add structured log fields `{EventId}, {OffsetsCreated}, {SyncBatchId}` on correction sync completion in `apps/api/Services/QboSyncService.cs`
- [x] T020 [US1] Extend `ProcessTransactionsAsync_MapsKnownAccountsAndRecomputesActuals` and add correction cases in `apps/api.tests/Unit/QboSyncServiceTests.cs` until all US1 tests pass

**Checkpoint**: US1 integration tests green; upstream correction produces offset without mutating original rows

---

## Phase 4: User Story 2 — Accountant Sees Accurate Actuals + Correction Badge (Priority: P1)

**Goal**: Ledger API exposes `hasQboCorrection` per line item; financial grid shows Font Awesome correction badge when offsets contribute to that row's actuals.

**Independent Test**: Seed offset-mapped ledger entry, `GET .../ledger` → `hasQboCorrection: true` on affected row; Vitest confirms badge visible. Row with originals only → `hasQboCorrection: false`, no badge.

### Tests for User Story 2 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T021 [P] [US2] Add integration test `GetLedger_HasQboCorrection_TrueWhenOffsetMapped` in `apps/api.tests/Integration/QboOffsetCorrectionTests.cs` (contract B1/B2)
- [x] T022 [P] [US2] Add Vitest cases for badge visible/hidden in `apps/web/tests/components/ledger/LedgerRow.test.tsx` (quickstart Scenario 6; contract B1/B2)

### Implementation for User Story 2

- [x] T023 [US2] Add `HasQboCorrection` to `LineItemDto` in `apps/api/DTOs/Ledger/LedgerDtos.cs` and compute via grouped offset query in `LedgerService.GetLedgerAsync` in `apps/api/Services/LedgerService.cs`
- [x] T024 [US2] Run `dotnet build` in `apps/api` then `npm run generate-types` in `apps/web` to refresh `apps/web/src/types/generated-api.ts`
- [x] T025 [P] [US2] Create `QboCorrectionBadge` with Font Awesome `faClockRotateLeft`, `aria-label`, and `data-testid` in `apps/web/src/components/ledger/QboCorrectionBadge.tsx` per contract ledger-correction-badge.md
- [x] T026 [US2] Render `QboCorrectionBadge` in QBO actuals column of `apps/web/src/components/ledger/LedgerRow.tsx` when `row.hasQboCorrection === true`

**Checkpoint**: US2 API and Vitest tests green; badge appears only on corrected line items

---

## Phase 5: User Story 3 — Append-Only Guard Against Ledger Mutation (Priority: P2)

**Goal**: Automated verification proves correction paths never UPDATE/DELETE sync ledger rows; CI fails on regression fixtures.

**Independent Test**: Run append-only guard tests — original row snapshot identical after correction sync; no `EntityState.Modified` on ledger rows during sync.

### Tests for User Story 3 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation (update expectations in existing test)**

- [x] T027 [P] [US3] Update `ResyncWithAlteredUpstream_PreservesOriginalLedgerAmount` in `apps/api.tests/Integration/QboAppendOnlyTests.cs` to expect offset row + updated actuals while original row unchanged (supersedes spec 003 Scenario 2)
- [x] T028 [P] [US3] Add integration test `CorrectionSync_NeverModifiesExistingLedgerRows` in `apps/api.tests/Integration/QboSyncLedgerAppendOnlyGuardTests.cs` — capture row IDs/amounts before sync, assert unchanged after (quickstart Scenario 4)
- [x] T029 [P] [US3] Add unit test asserting no `_db.QboSyncLedgers.Update`/`Remove` in correction paths in `apps/api.tests/Unit/QboSyncCorrectionAppendOnlyTests.cs`

### Implementation for User Story 3

- [x] T030 [US3] Add test-only `QboSyncLedgerAppendOnlyInterceptor` in `apps/api.tests/TestSupport/QboSyncLedgerAppendOnlyInterceptor.cs` that throws if any `QboSyncLedger` entity state is `Modified` or `Deleted` during sync tests; wire in `QboOffsetCorrectionTests` factory setup

**Checkpoint**: All append-only guard tests green; SC-004 satisfied

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Coverage gate, quickstart validation, and regression sweep.

- [x] T031 [P] Run full QBO test suite: `dotnet test --filter "FullyQualifiedName~Qbo"` in `apps/api.tests`
- [x] T032 [P] Run frontend ledger tests: `npm test -- LedgerRow` in `apps/web`
- [x] T033 Verify ≥80.0% line/branch coverage on touched backend files via `dotnet test --collect:"XPlat Code Coverage"` in `apps/api.tests` and touched frontend files via `npm run test:coverage` in `apps/web`; missing or unparseable reports FAIL (Constitution III)
- [x] T034 Run quickstart validation scenarios in `specs/042-qbo-offset-entry-semantics/quickstart.md` and confirm all checkpoints pass

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS all user stories**
- **User Story 1 (Phase 3)**: Depends on Foundational — core MVP
- **User Story 2 (Phase 4)**: Depends on Foundational; integration tests may seed offsets directly, but end-to-end validation benefits from US1 sync path
- **User Story 3 (Phase 5)**: Depends on US1 correction implementation being present to guard against
- **Polish (Phase 6)**: Depends on US1–US3 complete

### User Story Dependencies

- **US1 (P1)**: After Foundational — no dependency on US2/US3
- **US2 (P1)**: After Foundational — independently testable via seeded offsets; full E2E with live sync after US1
- **US3 (P2)**: After US1 — guards correction sync behavior

### Within Each User Story

- Tests written and failing before implementation
- Models/migration (Foundational) before services
- Services before frontend typegen
- Story checkpoint before next priority

### Parallel Opportunities

- T002 ∥ T003 (contract review)
- T004 ∥ T005 (enum files)
- T011–T015 (US1 tests, different test methods/files)
- T021 ∥ T022 (US2 API test ∥ Vitest)
- T027–T029 (US3 tests)
- T031 ∥ T032 (backend ∥ frontend regression)

---

## Parallel Example: User Story 1

```bash
# Launch all US1 failing tests together:
dotnet test --filter "FullyQualifiedName~QboSyncCorrectionServiceTests"
dotnet test --filter "FullyQualifiedName~QboOffsetCorrectionTests"

# After T016–T017 land, run until green:
dotnet test --filter "FullyQualifiedName~QboOffsetCorrectionTests|QboSyncCorrectionServiceTests"
```

---

## Parallel Example: User Story 2

```bash
# Backend contract test and frontend badge test in parallel:
dotnet test --filter "GetLedger_HasQboCorrection"
npm test -- LedgerRow.test.tsx
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: quickstart Scenarios 1–3 and 5
5. Demo corrected actuals without UI badge (acceptable interim)

### Incremental Delivery

1. Setup + Foundational → schema ready
2. US1 → offset corrections work end-to-end → **MVP**
3. US2 → badge + `hasQboCorrection` → full accountant UX
4. US3 → append-only guard hardening
5. Polish → coverage + quickstart sign-off

### Parallel Team Strategy

1. Team completes Setup + Foundational together
2. Then:
   - Developer A: US1 sync pipeline (T011–T020)
   - Developer B: US2 ledger DTO + badge (T021–T026) after T006 migration lands
   - Developer C: US3 guard tests (T027–T030) after US1 T017 merges

---

## Notes

- Existing `IX_qbo_sync_ledger_event_txn` unique index **must** be dropped — offsets cannot land until T007–T008 complete
- Spec 003 quickstart Scenario 2 is superseded — `QboAppendOnlyTests` expectations flip in T027
- `TestSeedingService` ledger `RemoveRange` remains excluded from production append-only guarantees per spec assumptions
- Settled-event actuals update is intentional; do not route `RecomputeActualsForEventAsync` through frozen-event mutation guards
- Prior task list at `specs/040-qbo-offset-entry-semantics/tasks.md` superseded by this 042 track

---

## Task Summary

| Phase | Tasks | Story |
|-------|-------|-------|
| Setup | T001–T003 (3) | — |
| Foundational | T004–T010 (7) | — |
| US1 — Offset corrections | T011–T020 (10) | US1 |
| US2 — Badge + API flag | T021–T026 (6) | US2 |
| US3 — Append-only guard | T027–T030 (4) | US3 |
| Polish | T031–T034 (4) | — |
| **Total** | **34 tasks** | |

**MVP scope**: Phase 1 + Phase 2 + Phase 3 (User Story 1) — 20 tasks

**Independent test criteria**:

| Story | Verify independently by |
|-------|-------------------------|
| US1 | Integration tests: amount change offset, void offset, idempotent re-sync, settled actuals update |
| US2 | `GET /ledger` returns `hasQboCorrection`; Vitest badge visible/hidden |
| US3 | Append-only guard tests; original row snapshot unchanged after correction |

**Format validation**: All 34 tasks use `- [ ]` / `- [x]` checkbox, sequential T001–T034 IDs, [P] where parallelizable, [USn] on user-story phase tasks, and explicit file paths.
