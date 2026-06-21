---
description: "Task list for Persistence-Layer Immutability Guard for Frozen Events (SPLR-35)"
---

# Tasks: Persistence-Layer Immutability Guard for Frozen Events

**Input**: Design documents from `/specs/041-ef-savechanges-interceptor/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/frozen-event-persistence-guard.md, quickstart.md

**Tests**: REQUIRED per Constitution III. Each user story phase adds xUnit unit tests in `apps/api.tests/Unit/` and integration tests in `apps/api.tests/Integration/` (write failing tests first, then implement until green). Final Polish phase enforces ≥80.0% line/branch coverage on **backend touched files** via `dotnet test --collect:"XPlat Code Coverage"` (coverlet → cobertura). No frontend changes — frontend coverage gate N/A.

**Organization**: Tasks grouped by user story (US1–US3). Backend persistence slice through `apps/api/Data/Interceptors/`, `apps/api/Services/`, `apps/api/Program.cs`, and `apps/api.tests/`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1–US3 (maps to user stories in spec.md)
- All paths are repo-relative

## Path Conventions

- Interceptor: `apps/api/Data/Interceptors/FrozenEventImmutabilityInterceptor.cs`
- Save context: `apps/api/Services/FrozenEventSaveContext.cs`, `apps/api/Services/FrozenEventSaveReason.cs`
- Operation labels: `apps/api/Services/FrozenEventMutationOperation.cs`
- Auditor (reuse): `apps/api/Services/FrozenEventMutationAuditor.cs`
- Sanctioned workflows: `apps/api/Services/SettlementService.cs`
- DI: `apps/api/Program.cs`
- Unit tests: `apps/api.tests/Unit/FrozenEventImmutabilityInterceptorTests.cs`, `apps/api.tests/Unit/FrozenEventSaveContextTests.cs`
- Integration tests: `apps/api.tests/Integration/FrozenEventPersistenceGuardTests.cs`
- Log capture (reuse): `apps/api.tests/TestSupport/TestLogCollector.cs`
- Contract: `specs/041-ef-savechanges-interceptor/contracts/frozen-event-persistence-guard.md`
- Test base: `apps/api.tests/Integration/IntegrationTestBase.cs`
- Existing regression: `apps/api.tests/Integration/SettlementImmutabilityTests.cs`, `apps/api.tests/Integration/FrozenEventMutationAuditTests.cs`, `apps/api.tests/Integration/ReconcileControllerTests.cs`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm branch, prerequisites, and persistence guard contract before implementation.

- [x] T001 Verify branch `041-ef-savechanges-interceptor` and design docs in `specs/041-ef-savechanges-interceptor/` per plan.md
- [x] T002 [P] Review persistence guard contract in `specs/041-ef-savechanges-interceptor/contracts/frozen-event-persistence-guard.md` (scope, rejection rules, authorized context, audit contract)
- [x] T003 [P] Review field-diff and save-context rules in `specs/041-ef-savechanges-interceptor/data-model.md` and clarifications in `specs/041-ef-savechanges-interceptor/spec.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Authorized save context, persistence operation labels, interceptor scaffold, DI registration, and test scaffolds. **Blocks all user stories.**

**⚠️ CRITICAL**: No user story implementation begins until interceptor is DI-resolvable and test files exist.

- [x] T004 Create `FrozenEventSaveReason` enum (`SettlementReversal`, `EventReconciliation`) in `apps/api/Services/FrozenEventSaveReason.cs` per data-model.md
- [x] T005 Create `IFrozenEventSaveContext` and `FrozenEventSaveContext` with `Authorize(reason)` disposable scope backed by `AsyncLocal` in `apps/api/Services/FrozenEventSaveContext.cs` per research.md §5
- [x] T006 [P] Add `persistence_*` operation label constants in `apps/api/Services/FrozenEventMutationOperation.cs` per data-model.md (8 labels: event update/delete, line-item create/update/delete, artist create/update/delete)
- [x] T007 Create `FrozenEventImmutabilityInterceptor` stub implementing `SaveChangesInterceptor` with empty `SavingChanges`/`SavingChangesAsync` hooks in `apps/api/Data/Interceptors/FrozenEventImmutabilityInterceptor.cs`
- [x] T008 Register `IFrozenEventSaveContext`, `FrozenEventImmutabilityInterceptor` (scoped), and `options.AddInterceptors(sp.GetRequiredService<FrozenEventImmutabilityInterceptor>())` in `apps/api/Program.cs` per research.md §2
- [x] T009 [P] Create `apps/api.tests/Unit/FrozenEventSaveContextTests.cs` — scope enter/exit, nested dispose, `CurrentReason` cleared after dispose
- [x] T010 [P] Create `apps/api.tests/Unit/FrozenEventImmutabilityInterceptorTests.cs` with in-memory or SQLite `ApplicationDbContext` + `TestLogCollector` wired to auditor logger
- [x] T011 Create `apps/api.tests/Integration/FrozenEventPersistenceGuardTests.cs` extending `IntegrationTestBase` with helpers to settle events and perform raw `DbContext` attach/modify/`SaveChangesAsync` bypass (pattern from `FrozenEventMutationAuditTests.cs`)

**Checkpoint**: Interceptor compiles and is registered; save context and test scaffolds ready

---

## Phase 3: User Story 1 — Persistence Guard Blocks Bypass Saves on Frozen Events (Priority: P1) 🎯 MVP

**Goal**: Direct `SaveChanges` mutations against `SETTLED`/`RECONCILED` events on `events`, `event_artists`, and `financial_line_items` are rejected before commit with no data persisted; `PRE_SHOW` saves are not blocked.

**Independent Test**: Settle an event, attach a line item via DbContext, change `SettlementValue`, call `SaveChangesAsync` without `LedgerService` → `LedgerStateException`, DB unchanged.

### Tests for User Story 1 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T012 [P] [US1] Add failing unit test `ModifiedLineItem_SettlementValueChange_OnFrozenEvent_Throws` in `apps/api.tests/Unit/FrozenEventImmutabilityInterceptorTests.cs`
- [x] T013 [P] [US1] Add failing unit test `ModifiedEvent_TitleChange_WhenOriginalStatusSettled_Throws` in `apps/api.tests/Unit/FrozenEventImmutabilityInterceptorTests.cs`
- [x] T014 [P] [US1] Add failing unit test `DeletedEventArtist_OnFrozenParentEvent_Throws` in `apps/api.tests/Unit/FrozenEventImmutabilityInterceptorTests.cs`
- [x] T015 [P] [US1] Add failing integration test `SettledEvent_RawDbContextLineItemBypass_ThrowsAndNoDbChange` in `apps/api.tests/Integration/FrozenEventPersistenceGuardTests.cs` (quickstart Scenario 1)
- [x] T016 [P] [US1] Add failing integration test `SettledEvent_RawDbContextEventTitleBypass_ThrowsAndNoDbChange` in `apps/api.tests/Integration/FrozenEventPersistenceGuardTests.cs`
- [x] T017 [P] [US1] Add failing integration test `ReconciledEvent_RawDbContextArtistDeleteBypass_Throws` in `apps/api.tests/Integration/FrozenEventPersistenceGuardTests.cs`
- [x] T018 [P] [US1] Add failing integration test `PreShowEvent_RawDbContextLineItemUpdate_Succeeds` in `apps/api.tests/Integration/FrozenEventPersistenceGuardTests.cs` (FR-008 / SC-003)

### Implementation for User Story 1

- [x] T019 [US1] Implement in-scope `ChangeTracker` scan (`Event`, `EventArtist`, `FinancialLineItem` only; ignore all other entity types) in `apps/api/Data/Interceptors/FrozenEventImmutabilityInterceptor.cs`
- [x] T020 [US1] Implement frozen status resolution: `OriginalValues.Status` for `Event` entries; batched DB lookup of parent `events.status` by `EventId` for child entries in `apps/api/Data/Interceptors/FrozenEventImmutabilityInterceptor.cs`
- [x] T021 [US1] Implement block-all rules for `EventArtist` (`Added`/`Modified`/`Deleted`) and `FinancialLineItem` (`Added`/`Deleted`; block all `Modified` until US2 field-diff) when parent/original event is frozen in `apps/api/Data/Interceptors/FrozenEventImmutabilityInterceptor.cs`
- [x] T022 [US1] Implement block rules for `Event` (`Deleted`; `Modified` when original status frozen and no authorized context) in `apps/api/Data/Interceptors/FrozenEventImmutabilityInterceptor.cs`
- [x] T023 [US1] On violation, resolve `EventId`/`VenueId`/`EventStatus`/`UserId?` and call `FrozenEventMutationAuditor.RejectIfFrozen` with appropriate `persistence_*` operation label before save proceeds in `apps/api/Data/Interceptors/FrozenEventImmutabilityInterceptor.cs`
- [x] T024 [US1] Run US1 tests until green: `cd apps/api.tests && dotnet test --filter "FullyQualifiedName~FrozenEventImmutabilityInterceptorTests|FullyQualifiedName~FrozenEventPersistenceGuardTests"`

**Checkpoint**: MVP — persistence bypass on frozen events blocked; PRE_SHOW saves unaffected

---

## Phase 4: User Story 2 — Sanctioned Post-Settlement Operations Continue to Work (Priority: P1)

**Goal**: QBO actuals-only field-diff updates, settlement reversal, reconciliation, and finalize transitions succeed; mixed actuals + snapshot changes rejected.

**Independent Test**: On `SETTLED` event, run QBO actuals recompute and settlement reversal API; both succeed. Modify `SettlementValue` alongside `QboActualValue` in same save → rejected.

### Tests for User Story 2 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T025 [P] [US2] Add failing unit test `ModifiedLineItem_OnlyQboActualValueAndUpdatedAt_OnFrozenEvent_Allows` in `apps/api.tests/Unit/FrozenEventImmutabilityInterceptorTests.cs`
- [x] T026 [P] [US2] Add failing unit test `ModifiedLineItem_QboActualValueAndSettlementValue_OnFrozenEvent_Throws` in `apps/api.tests/Unit/FrozenEventImmutabilityInterceptorTests.cs`
- [x] T027 [P] [US2] Add failing unit test `ModifiedEvent_SettledToReconciled_WithAuthorizedContext_Allows` in `apps/api.tests/Unit/FrozenEventImmutabilityInterceptorTests.cs`
- [x] T028 [P] [US2] Add failing integration test `SettledEvent_QboActualsRecompute_Succeeds` in `apps/api.tests/Integration/FrozenEventPersistenceGuardTests.cs` (quickstart Scenario 2)
- [x] T029 [P] [US2] Add failing integration test `SettledEvent_SettlementReversalApi_Succeeds` in `apps/api.tests/Integration/FrozenEventPersistenceGuardTests.cs` (quickstart Scenario 3)
- [x] T030 [P] [US2] Add failing integration test `SettledEvent_ReconcileApi_Succeeds` in `apps/api.tests/Integration/FrozenEventPersistenceGuardTests.cs` (quickstart Scenario 4)
- [x] T031 [P] [US2] Add failing integration test `PreShowEvent_FinalizeSettlement_Succeeds` in `apps/api.tests/Integration/FrozenEventPersistenceGuardTests.cs` (quickstart Scenario 5)
- [x] T032 [P] [US2] Add failing integration test `SettledEvent_QboSyncWithLedgerInsert_Succeeds` in `apps/api.tests/Integration/FrozenEventPersistenceGuardTests.cs` (quickstart Scenario 7; out-of-scope table)

### Implementation for User Story 2

- [x] T033 [US2] Implement QBO actuals field-diff for `FinancialLineItem` `Modified` entries — permit only `QboActualValue` and `UpdatedAt` property changes when parent event is frozen in `apps/api/Data/Interceptors/FrozenEventImmutabilityInterceptor.cs`
- [x] T034 [US2] Implement authorized save context validation for frozen `Event` modifications: permit when `IFrozenEventSaveContext.CurrentReason` matches `SettlementReversal` or `EventReconciliation` and pending field changes align with data-model.md in `apps/api/Data/Interceptors/FrozenEventImmutabilityInterceptor.cs`
- [x] T035 [US2] Wrap `SaveChangesAsync` in `SettlementService.ReverseAsync` with `using (_saveContext.Authorize(FrozenEventSaveReason.SettlementReversal))` in `apps/api/Services/SettlementService.cs`
- [x] T036 [US2] Wrap `SaveChangesAsync` in `SettlementService.ReconcileAsync` with `using (_saveContext.Authorize(FrozenEventSaveReason.EventReconciliation))` in `apps/api/Services/SettlementService.cs`
- [x] T037 [US2] Inject `IFrozenEventSaveContext` into `SettlementService` constructor in `apps/api/Services/SettlementService.cs`
- [x] T038 [US2] Run US2 tests until green: `cd apps/api.tests && dotnet test --filter "FullyQualifiedName~FrozenEventImmutabilityInterceptorTests|FullyQualifiedName~FrozenEventPersistenceGuardTests"`

**Checkpoint**: Sanctioned workflows unblocked; mixed-field tampering still rejected

---

## Phase 5: User Story 3 — Persistence Rejections Are Observable for Investigation (Priority: P2)

**Goal**: Persistence-layer rejections emit `FrozenEventMutationAuditor` audit entries (spec 039 format) with required fields and no sensitive payload content; successful sanctioned saves emit no rejection audit.

**Independent Test**: Trigger bypass rejection → captured Warning log with `persistence_update_line_item`, event/venue/status ids; log text excludes settlement values.

### Tests for User Story 3 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T039 [P] [US3] Add failing integration test `SettledEvent_BypassRejection_LogsPersistenceOperationLabel` in `apps/api.tests/Integration/FrozenEventPersistenceGuardTests.cs` — assert `Operation=persistence_update_line_item`, `EventId`, `VenueId`, `EventStatus=SETTLED`
- [x] T040 [P] [US3] Add failing integration test `SettledEvent_BypassRejection_LogExcludesFinancialFieldValues` in `apps/api.tests/Integration/FrozenEventPersistenceGuardTests.cs` — use distinctive `SettlementValue`; assert absent from captured log (FR-010)
- [x] T041 [P] [US3] Add failing integration test `SettledEvent_QboActualsSave_NoRejectionAuditLog` in `apps/api.tests/Integration/FrozenEventPersistenceGuardTests.cs` (User Story 3 acceptance scenario 3)

### Implementation for User Story 3

- [x] T042 [US3] Audit interceptor rejection path in `apps/api/Data/Interceptors/FrozenEventImmutabilityInterceptor.cs` — confirm `FrozenEventMutationAuditor.RejectIfFrozen` receives `ITenantContext.UserId`, correct `persistence_*` labels, and does not log entity payloads or exception messages with financial data
- [x] T043 [US3] Run US3 tests until green: `cd apps/api.tests && dotnet test --filter "FullyQualifiedName~FrozenEventPersistenceGuardTests"`

**Checkpoint**: Persistence bypass rejections searchable via same audit format as spec 039

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Full regression, coverage gate, contract verification, quickstart validation.

- [x] T044 [P] Run existing regression suites unchanged: `cd apps/api.tests && dotnet test --filter "FullyQualifiedName~SettlementImmutabilityTests|FullyQualifiedName~FrozenEventMutationAuditTests|FullyQualifiedName~ReconcileControllerTests"` (SC-005)
- [x] T045 Run full API test suite: `cd apps/api.tests && dotnet test`
- [x] T046 Verify ≥80.0% line/branch coverage on touched backend files (`FrozenEventImmutabilityInterceptor`, `FrozenEventSaveContext`, `FrozenEventSaveReason`, modified `SettlementService`/`FrozenEventMutationOperation`): `cd apps/api.tests && dotnet test --collect:"XPlat Code Coverage"` (SC-006)
- [x] T047 Run quickstart validation scenarios in `specs/041-ef-savechanges-interceptor/quickstart.md`
- [x] T048 [P] Mark verification scenarios complete in `specs/041-ef-savechanges-interceptor/contracts/frozen-event-persistence-guard.md` (minimum integration coverage table)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS all user stories**
- **User Story 1 (Phase 3)**: Depends on Foundational — **MVP**; core interceptor blocking logic
- **User Story 2 (Phase 4)**: Depends on US1 core interceptor (T019–T023); adds field-diff and authorized context
- **User Story 3 (Phase 5)**: Depends on US1 rejection path (T023); validates audit emission on bypass; tests can be written in parallel with US2 implementation
- **Polish (Phase 6)**: Depends on Phases 3–5 complete

### User Story Dependencies

- **User Story 1 (P1)**: After Foundational — no dependency on other stories; delivers MVP bypass blocking
- **User Story 2 (P1)**: After US1 core blocking — extends interceptor with exceptions; requires `SettlementService` wiring
- **User Story 3 (P2)**: After US1 auditor wiring — validates log format on persistence rejections; can overlap US2 test writing

### Within Each User Story

- Tests written and **FAIL** before implementation changes
- Foundational infrastructure before interceptor logic
- US1 blocking before US2 field-diff/context exceptions
- Story tests green before next story phase

### Parallel Opportunities

- T002 + T003 (Setup doc review)
- T006 + T009 + T010 (operation labels parallel with unit test scaffolds)
- T012–T018 (US1 failing tests in parallel)
- T025–T032 (US2 failing tests in parallel)
- T039–T041 (US3 failing tests in parallel)
- T044 + T048 (Polish regression + contract update in parallel)

---

## Parallel Example: User Story 1

```bash
# Launch all failing tests for User Story 1 together:
Task: "Add failing unit test ModifiedLineItem_SettlementValueChange_OnFrozenEvent_Throws in apps/api.tests/Unit/FrozenEventImmutabilityInterceptorTests.cs"
Task: "Add failing unit test ModifiedEvent_TitleChange_WhenOriginalStatusSettled_Throws in apps/api.tests/Unit/FrozenEventImmutabilityInterceptorTests.cs"
Task: "Add failing integration test SettledEvent_RawDbContextLineItemBypass_ThrowsAndNoDbChange in apps/api.tests/Integration/FrozenEventPersistenceGuardTests.cs"

# After T019–T023 implementation, run:
cd apps/api.tests && dotnet test --filter "FullyQualifiedName~FrozenEventImmutabilityInterceptorTests|FullyQualifiedName~FrozenEventPersistenceGuardTests"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (save context + interceptor scaffold + DI)
3. Complete Phase 3: User Story 1 (persistence bypass blocking on frozen events)
4. **STOP and VALIDATE**: Integration bypass test green; PRE_SHOW false-positive test green
5. Demo: settle event → raw DbContext mutation → `LedgerStateException` + no DB change

### Incremental Delivery

1. Setup + Foundational → interceptor registered and test scaffolds ready
2. User Story 1 → core persistence guard (MVP)
3. User Story 2 → sanctioned exceptions (QBO actuals, reversal, reconcile, finalize)
4. User Story 3 → audit observability on bypass rejections
5. Polish → regression + coverage gate + quickstart

### Parallel Team Strategy

With multiple developers after Foundational:

- Developer A: US1 interceptor implementation (T019–T023)
- Developer B: US1 failing tests (T012–T018) while A implements
- Developer C: US2 failing tests (T025–T032) after US1 core lands; US3 tests (T039–T041) in parallel with US2 implementation

---

## Notes

- Backend-only feature; no `apps/web/` changes
- Reuse `FrozenEventMutationAuditor` and `TestLogCollector` from spec 039 — do not duplicate audit log format
- `QboSyncService.RecomputeActualsForEventAsync` requires **no code change** — field-diff permits its save pattern
- Out-of-scope tables (`qbo_sync_ledger`, `settlement_reversals`) must never be evaluated by interceptor
- Do **not** weaken or remove existing service-layer guards in `LedgerService`/`EventService`
- Finalize uses original status `PRE_SHOW` — interceptor must use `OriginalValues`, not current values
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
