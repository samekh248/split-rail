---
description: "Task list for Block QBO Sync from Mutating Frozen Settlement Data (SPLR-33)"
---

# Tasks: Block QuickBooks Sync from Mutating Frozen Settlement Data

**Input**: Design documents from `/specs/045-block-qbo-settled-mutation/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/qbo-sync-frozen-event-guard.md, quickstart.md

**Tests**: REQUIRED per Constitution III. Each user story phase adds xUnit unit tests in `apps/api.tests/Unit/QboSyncServiceTests.cs` and integration tests in `apps/api.tests/Integration/QboSyncFrozenEventTests.cs` (write failing tests first, then implement until green). Final Polish phase enforces ≥80.0% line/branch coverage on **backend touched files** via `dotnet test /p:CollectCoverage=true` (coverlet → cobertura). No frontend changes — frontend coverage gate N/A unless files are touched.

**Organization**: Tasks grouped by user story (US1–US3). Primary product changes in `apps/api/Services/QboSyncService.cs` and `apps/api/Data/Interceptors/FrozenEventImmutabilityInterceptor.cs`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1–US3 (maps to user stories in spec.md)
- All paths are repo-relative

## Path Conventions

- Product guard: `apps/api/Services/QboSyncService.cs`
- Operation constant: `apps/api/Services/FrozenEventMutationOperation.cs`
- Persistence guard: `apps/api/Data/Interceptors/FrozenEventImmutabilityInterceptor.cs`
- DI: `apps/api/Program.cs`
- Unit tests: `apps/api.tests/Unit/QboSyncServiceTests.cs`
- Integration tests: `apps/api.tests/Integration/QboSyncFrozenEventTests.cs`
- Test base (reuse): `apps/api.tests/Integration/IntegrationTestBase.cs` (`SeedFinalizedEventAsync`, `CreateFactoryWithQboHandler`)
- Legacy tests to update: `apps/api.tests/Integration/FrozenEventPersistenceGuardTests.cs`
- Contract: `specs/045-block-qbo-settled-mutation/contracts/qbo-sync-frozen-event-guard.md`
- Audit contract extension: `specs/039-log-frozen-mutation-rejections/contracts/frozen-event-mutation-audit-log.md`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm branch, prerequisites, and write-path contract before implementation.

- [x] T001 Verify branch `045-block-qbo-settled-mutation` and design docs in `specs/045-block-qbo-settled-mutation/` per plan.md
- [x] T002 [P] Review write matrix and verification obligations in `specs/045-block-qbo-settled-mutation/contracts/qbo-sync-frozen-event-guard.md`
- [x] T003 [P] Review SETTLED vs RECONCILED decisions and test strategy in `specs/045-block-qbo-settled-mutation/research.md` and field inventory in `specs/045-block-qbo-settled-mutation/data-model.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Operation constant, auditor DI wiring, and unit-test factory updates. **Blocks all user stories.**

**⚠️ CRITICAL**: No user story work begins until `QboSyncRecompute` constant exists and `QboSyncService` accepts `FrozenEventMutationAuditor`.

- [x] T004 Add `QboSyncRecompute = "qbo_sync_recompute"` constant to `apps/api/Services/FrozenEventMutationOperation.cs` per data-model.md audit taxonomy
- [x] T005 Inject `FrozenEventMutationAuditor` into `QboSyncService` constructor and store field in `apps/api/Services/QboSyncService.cs`; verify scoped registration already exists in `apps/api/Program.cs`
- [x] T006 Update `CreateSyncService()` helper in `apps/api.tests/Unit/QboSyncServiceTests.cs` to pass `FrozenEventMutationAuditor` with `NullLogger<FrozenEventMutationAuditor>.Instance`
- [x] T007 [P] Append `qbo_sync_recompute` row to allowed operation values table in `specs/039-log-frozen-mutation-rejections/contracts/frozen-event-mutation-audit-log.md`

**Checkpoint**: Constant compiles; `QboSyncService` constructor updated; unit test factory builds without error

---

## Phase 3: User Story 1 — Settlement Snapshot Immutable on SETTLED Sync (Priority: P1) 🎯 MVP

**Goal**: QuickBooks sync recompute on `SETTLED` events rejects all `financial_line_items` mutations when new transactions would change values; settlement snapshot fields remain unchanged.

**Independent Test**: `dotnet test apps/api.tests --filter "FullyQualifiedName~QboSyncServiceTests&FullyQualifiedName~Settled"` and SETTLED cases in `QboSyncFrozenEventTests` — reject with unchanged snapshot fields.

### Tests for User Story 1 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T008 [P] [US1] Add failing unit test `ProcessTransactionsAsync_SettledEvent_WithNewTransactions_ThrowsLedgerStateException` in `apps/api.tests/Unit/QboSyncServiceTests.cs` — event `Status = Settled`, new mapped txn ingested, assert `LedgerStateException`, `SettlementValue`/`ProformaValue` unchanged
- [x] T009 [P] [US1] Add failing unit test `RecomputeActuals_SettledEvent_WithPendingLedgerChange_ThrowsBeforeMutation` in `apps/api.tests/Unit/QboSyncServiceTests.cs` — seed ledger entry, call `RecomputeActualsForEventAsync`, assert throw before line-item dirty state
- [x] T010 [P] [US1] Add failing unit test `ProcessTransactionsAsync_SettledEvent_NoNewTransactions_SkipsRecompute` in `apps/api.tests/Unit/QboSyncServiceTests.cs` — SETTLED event, empty transaction list, assert success and all line-item fields unchanged
- [x] T011 [P] [US1] Create `QboSyncFrozenEventTests` skeleton in `apps/api.tests/Integration/QboSyncFrozenEventTests.cs` extending `IntegrationTestBase` with `EnableLogCapture => true`
- [x] T012 [US1] Add failing integration test `SettledEvent_SyncWithNewTransaction_Returns400_AndSnapshotUnchanged` in `apps/api.tests/Integration/QboSyncFrozenEventTests.cs` — `SeedFinalizedEventAsync`, mocked QBO handler returns new txn, POST sync, assert HTTP 400, snapshot fields unchanged per contract V-001

### Implementation for User Story 1

- [x] T013 [US1] Add event status lookup at start of `RecomputeActualsForEventAsync` in `apps/api/Services/QboSyncService.cs` — load `Event.Status` by `eventId`
- [x] T014 [US1] When status is `SETTLED`, call `_frozenEventAuditor.RejectIfFrozen(evt, venueId, userId, FrozenEventMutationOperation.QboSyncRecompute)` before modifying any line item in `apps/api/Services/QboSyncService.cs`
- [x] T015 [US1] In `ProcessTransactionsAsync` in `apps/api/Services/QboSyncService.cs`, skip `RecomputeActualsForEventAsync` when event is `SETTLED` and `processed == 0` (zero-transaction no-op per research.md §4)
- [x] T016 [US1] Remove or replace obsolete comment "Constitution V exception: QBO actuals aggregate may update on SETTLED/RECONCILED events" in `apps/api/Services/QboSyncService.cs` with accurate SETTLED-block / RECONCILED-allow note
- [x] T017 [US1] Run US1 tests until green: `dotnet test apps/api.tests --filter "FullyQualifiedName~Settled"`

**Checkpoint**: MVP — SETTLED sync with new data rejected; SETTLED no-op sync succeeds without mutation

---

## Phase 4: User Story 2 — RECONCILED Events Accept Actuals-Only Updates (Priority: P1)

**Goal**: Sync on `RECONCILED` events updates only `QboActualValue`/`UpdatedAt`; settlement snapshot fields and archived PDF remain unchanged.

**Independent Test**: `dotnet test apps/api.tests --filter "FullyQualifiedName~QboSyncFrozenEventTests&FullyQualifiedName~Reconciled"` — sync succeeds, actuals change, snapshot/PDF stable.

### Tests for User Story 2 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL if interceptor still allows SETTLED actuals broadly**

- [x] T018 [P] [US2] Add failing unit test `ProcessTransactionsAsync_ReconciledEvent_UpdatesActualsOnly` in `apps/api.tests/Unit/QboSyncServiceTests.cs` — `Status = Reconciled`, new txn, assert `QboActualValue` changed, `SettlementValue`/`ProformaValue` unchanged
- [x] T019 [P] [US2] Add failing integration test `ReconciledEvent_SyncWithNewTransaction_Returns200_ActualsOnly` in `apps/api.tests/Integration/QboSyncFrozenEventTests.cs` — finalize → reconcile → sync with mocked new txn, assert HTTP 200 and actuals-only change per contract V-003
- [x] T020 [US2] Add failing integration test `ReconciledEvent_Sync_PdfBytesUnchanged` in `apps/api.tests/Integration/QboSyncFrozenEventTests.cs` — capture post-finalize PDF bytes, sync on RECONCILED, assert bytes identical per contract V-004

### Implementation for User Story 2

- [x] T021 [US2] Narrow `IsOnlyQboActualsUpdate` in `apps/api/Data/Interceptors/FrozenEventImmutabilityInterceptor.cs` to require parent event status `RECONCILED` (pass `EventSnapshot.Status` into check from `ValidateLineItemEntry`)
- [x] T022 [US2] Ensure `RecomputeActualsForEventAsync` in `apps/api/Services/QboSyncService.cs` proceeds for `RECONCILED` and only assigns `QboActualValue` and `UpdatedAt` (no other fields)
- [x] T023 [US2] Run US2 tests until green: `dotnet test apps/api.tests --filter "FullyQualifiedName~Reconciled"`

**Checkpoint**: RECONCILED sanctioned actuals refresh works; interceptor aligned with service guard

---

## Phase 5: User Story 3 — Rejected Sync Mutations Are Auditable (Priority: P2)

**Goal**: Rejected sync recompute on frozen events emits structured audit log with operation `qbo_sync_recompute`; successful RECONCILED actuals refresh emits no rejection audit.

**Independent Test**: Audit assertions on SETTLED rejection and RECONCILED success paths in `QboSyncFrozenEventTests`.

### Tests for User Story 3 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL if auditor not wired**

- [x] T024 [P] [US3] Add failing integration test `SettledEvent_SyncRejection_LogsQboSyncRecomputeAudit` in `apps/api.tests/Integration/QboSyncFrozenEventTests.cs` — assert `GetFrozenAuditLogs` contains `Operation = qbo_sync_recompute` and `EventStatus = SETTLED` per spec FR-006
- [x] T025 [P] [US3] Add failing integration test `ReconciledEvent_SuccessfulSync_NoRejectionAuditLog` in `apps/api.tests/Integration/QboSyncFrozenEventTests.cs` — assert no frozen-mutation rejection log after successful actuals refresh
- [x] T026 [P] [US3] Add failing integration test `VenueBatchSync_MixedStates_IsolatesSettledFailure` in `apps/api.tests/Integration/QboSyncFrozenEventTests.cs` — one PRE_SHOW + one SETTLED event in venue; batch sync succeeds for PRE_SHOW, fails independently for SETTLED per contract V-005

### Implementation for User Story 3

- [x] T027 [US3] Verify `FrozenEventMutationAuditor.RejectIfFrozen` is invoked with `FrozenEventMutationOperation.QboSyncRecompute` on SETTLED recompute path in `apps/api/Services/QboSyncService.cs` (adjust message or venue/user resolution if integration tests fail)
- [x] T028 [US3] Run US3 tests until green: `dotnet test apps/api.tests --filter "FullyQualifiedName~QboSyncFrozenEventTests"`

**Checkpoint**: Audit trail complete for sync rejections; batch isolation verified

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Regression fixes, legacy test alignment, coverage gate, quickstart validation.

- [x] T029 [P] Update `SettledEvent_QboActualsRecompute_Succeeds` in `apps/api.tests/Integration/FrozenEventPersistenceGuardTests.cs` to expect rejection (or rename to `SettledEvent_QboActualsRecompute_Rejected`) aligned with SPLR-33
- [x] T030 [P] Update `SettledEvent_QboActualsSave_NoRejectionAuditLog` in `apps/api.tests/Integration/FrozenEventPersistenceGuardTests.cs` — SETTLED direct save of actuals should reject; add `ReconciledEvent_QboActualsSave_Succeeds` counterpart if missing
- [x] T031 Run full regression suite: `dotnet test apps/api.tests --filter "FullyQualifiedName~FrozenEvent|FullyQualifiedName~QboSync|FullyQualifiedName~SettlementImmutability"`
- [x] T032 Verify ≥80.0% line/branch coverage on touched backend files: `cd apps/api.tests && dotnet test /p:CollectCoverage=true --filter "FullyQualifiedName~QboSync|FullyQualifiedName~FrozenEventPersistenceGuard"` — inspect cobertura for `QboSyncService` and `FrozenEventImmutabilityInterceptor`; missing/unparseable report FAIL
- [x] T033 Run quickstart validation scenarios in `specs/045-block-qbo-settled-mutation/quickstart.md` and confirm all expected outcomes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS all user stories**
- **User Story 1 (Phase 3)**: Depends on Foundational — MVP scope
- **User Story 2 (Phase 4)**: Depends on Foundational; interceptor change independent of US1 service guard but logically follows SETTLED block
- **User Story 3 (Phase 5)**: Depends on US1 rejection path (audit on SETTLED); US2 success audit test can parallel after US2 impl
- **Polish (Phase 6)**: Depends on US1–US3 complete

### User Story Dependencies

- **US1 (P1)**: Foundational only — blocks MVP
- **US2 (P1)**: Foundational only — independently testable after interceptor + recompute RECONCILED path
- **US3 (P2)**: Builds on US1/US2 test infrastructure; audit assertions require rejection and success paths

### Within Each User Story

- Tests written and **FAIL** before implementation
- Service guard before interceptor alignment (US1 before US2 interceptor)
- Story checkpoint before next priority

### Parallel Opportunities

- T002, T003 (Setup doc review)
- T007 (audit contract doc) parallel with T004–T006
- T008, T009, T010, T011 (US1 tests) in parallel after Foundational
- T018, T019 (US2 tests) in parallel after Foundational
- T024, T025, T026 (US3 tests) in parallel after US1/US2 impl started
- T029, T030 (legacy test updates) in parallel in Polish

---

## Parallel Example: User Story 1

```bash
# Launch all US1 unit tests together (after Phase 2):
Task: "ProcessTransactionsAsync_SettledEvent_WithNewTransactions_ThrowsLedgerStateException in apps/api.tests/Unit/QboSyncServiceTests.cs"
Task: "RecomputeActuals_SettledEvent_WithPendingLedgerChange_ThrowsBeforeMutation in apps/api.tests/Unit/QboSyncServiceTests.cs"
Task: "ProcessTransactionsAsync_SettledEvent_NoNewTransactions_SkipsRecompute in apps/api.tests/Unit/QboSyncServiceTests.cs"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (T004–T007)
3. Complete Phase 3: User Story 1 (T008–T017)
4. **STOP and VALIDATE**: SETTLED sync rejection proven
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → guard infrastructure ready
2. US1 → SETTLED immutability enforced (MVP compliance fix)
3. US2 → RECONCILED actuals-only path + interceptor alignment
4. US3 → audit trail + batch isolation
5. Polish → legacy test updates + coverage gate

### Parallel Team Strategy

1. Team completes Setup + Foundational together
2. Developer A: US1 service guard + unit tests
3. Developer B: US2 interceptor + RECONCILED integration tests (after T004–T006)
4. Developer C: US3 audit integration tests (after US1 rejection exists)
5. Merge and run Polish regression + coverage

---

## Notes

- Reuses `SeedFinalizedEventAsync` from spec 044 — do not duplicate finalize seeding
- Supersedes spec 040/044 assumption that SETTLED actuals refresh is allowed; update conflicting tests in `FrozenEventPersistenceGuardTests.cs`
- QBO ledger ingest (`qbo_sync_ledgers`) continues on SETTLED; only `financial_line_items` recompute is blocked
- No API DTO, route, or frontend tasks — backend-only feature
- Commit after each task or logical group; stop at any checkpoint to validate story independently
