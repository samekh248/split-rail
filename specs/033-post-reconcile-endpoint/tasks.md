---
description: "Task list for Post-Show Event Reconciliation Transition (SPLR-73)"
---

# Tasks: Post-Show Event Reconciliation Transition

**Input**: Design documents from `/specs/033-post-reconcile-endpoint/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/reconcile-api.md, quickstart.md

**Tests**: REQUIRED per Constitution III. Each user story phase adds xUnit integration tests in `apps/api.tests/Integration/ReconcileControllerTests.cs` (write failing tests first, then implement until green). Final Polish phase enforces ≥80.0% line/branch coverage on **backend** touched files via `dotnet test --collect:"XPlat Code Coverage"` (coverlet → cobertura). No frontend changes — frontend coverage gate N/A.

**Organization**: Tasks grouped by user story (US1–US4). Backend API slice through `apps/api/Services/`, `apps/api/Controllers/`, `apps/api/DTOs/`, `apps/api/Data/`, and `apps/api.tests/Integration/`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1–US4 (maps to user stories in spec.md)
- All paths are repo-relative

## Path Conventions

- Service: `apps/api/Services/SettlementService.cs`
- Controller: `apps/api/Controllers/SettlementController.cs`
- Entity: `apps/api/Models/Event.cs`
- DTOs: `apps/api/DTOs/Ledger/LedgerDtos.cs`, `apps/api/DTOs/Dashboard/DashboardDtos.cs`
- Mappers: `apps/api/Services/EventService.cs`, `apps/api/Services/DashboardService.cs`
- EF config: `apps/api/Data/ApplicationDbContext.cs`
- Migrations: `apps/api/Data/Migrations/`
- Integration tests: `apps/api.tests/Integration/ReconcileControllerTests.cs`
- Contract matrix: `specs/033-post-reconcile-endpoint/contracts/reconcile-api.md`
- Test base: `apps/api.tests/Integration/IntegrationTestBase.cs`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm branch, prerequisites, and API contract before implementation.

- [x] T001 Verify branch `033-post-reconcile-endpoint` and design docs in `specs/033-post-reconcile-endpoint/` per plan.md
- [x] T002 [P] Review API contract matrix in `specs/033-post-reconcile-endpoint/contracts/reconcile-api.md` (rows R1–R13)
- [x] T003 [P] Review schema requirements in `specs/033-post-reconcile-endpoint/data-model.md` (`reconciled_at`, `reconciled_by_user_id`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Schema migration, DTO extensions, and integration test scaffold. **Blocks all user stories.**

**⚠️ CRITICAL**: No user story implementation begins until migration and DTO scaffold exist.

- [x] T004 Add `ReconciledAt` (`DateTimeOffset?`) and `ReconciledByUserId` (`Guid?`) plus `ReconciledByUser` navigation to `apps/api/Models/Event.cs` per data-model.md
- [x] T005 Configure `reconciled_at` and `reconciled_by_user_id` column mapping and FK (`users.id` SET NULL) in `apps/api/Data/ApplicationDbContext.cs` (mirror `settled_at` / `settled_by_user_id` pattern)
- [x] T006 Generate EF migration `AddEventReconciliationColumns` in `apps/api/Data/Migrations/` and verify `dotnet build` in `apps/api/`
- [x] T007 [P] Extend `EventResponse` with `ReconciledAt` and `ReconciledByUserId` in `apps/api/DTOs/Ledger/LedgerDtos.cs`
- [x] T008 [P] Extend `EventCardDto` with `ReconciledAt` and `ReconciledByUserId` in `apps/api/DTOs/Dashboard/DashboardDtos.cs`
- [x] T009 Create `apps/api.tests/Integration/ReconcileControllerTests.cs` extending `IntegrationTestBase` with helper to seed `SETTLED` events via `SetEventStatusDirectAsync` (pattern from `LedgerStateMachineTests.cs`)

**Checkpoint**: Migration applies; DTOs compile; test file scaffold ready

---

## Phase 3: User Story 1 — Mark a Settled Show as Reconciled (Priority: P1) 🎯 MVP

**Goal**: Authorized users with `can_trigger_qbo_sync` can `POST .../reconcile` a Settled event; status becomes `RECONCILED` with audit metadata persisted and visible on subsequent GET event and dashboard reads.

**Independent Test**: `cd apps/api.tests && dotnet test --filter "FullyQualifiedName~ReconcileControllerTests"` — happy path, GET propagation, permission denial, and dashboard tests pass (quickstart Scenarios 1, 3, 7 partial).

### Tests for User Story 1 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T010 [P] [US1] Add failing test `Reconcile_SettledEvent_Returns200_WithMetadata` in `apps/api.tests/Integration/ReconcileControllerTests.cs` (contract R1)
- [x] T011 [P] [US1] Add failing test `Reconcile_GetEventAfterReconcile_ReflectsMetadata` in `apps/api.tests/Integration/ReconcileControllerTests.cs` (contract R8)
- [x] T012 [P] [US1] Add failing test `Reconcile_DashboardAfterReconcile_ReflectsReconciledStatus` in `apps/api.tests/Integration/ReconcileControllerTests.cs` (contract R9)
- [x] T013 [P] [US1] Add failing test `Reconcile_WithoutTriggerQboSync_Returns403` in `apps/api.tests/Integration/ReconcileControllerTests.cs` (contract R4; pattern from `SettlementAuthorizationTests.cs`)

### Implementation for User Story 1

- [x] T014 [US1] Implement `ReconcileAsync(venueId, eventId, ct)` in `apps/api/Services/SettlementService.cs` per `specs/033-post-reconcile-endpoint/research.md` (row lock, SETTLED-only guard, set status + metadata, structured log)
- [x] T015 [US1] Update `ToEventResponse` to map `ReconciledAt` and `ReconciledByUserId` in `apps/api/Services/EventService.cs`
- [x] T016 [US1] Update `ToEventCardDto` to map `ReconciledAt` and `ReconciledByUserId` in `apps/api/Services/DashboardService.cs`
- [x] T017 [US1] Add `[HttpPost("reconcile")]` action with `[RequirePermission(PermissionNames.TriggerQboSync)]` returning `Ok(EventResponse)` in `apps/api/Controllers/SettlementController.cs`
- [x] T018 [US1] Run US1 tests until green: `cd apps/api.tests && dotnet test --filter "FullyQualifiedName~ReconcileControllerTests"`
- [x] T019 [US1] Mark rows R1, R4, R8, R9 complete in `specs/033-post-reconcile-endpoint/contracts/reconcile-api.md`

**Checkpoint**: MVP — reconcile via HTTP works; metadata persisted; permission gate enforced; event and dashboard reads updated

---

## Phase 4: User Story 2 — Reject Invalid Lifecycle Transitions (Priority: P1)

**Goal**: Reconcile attempts against Pre-Show or already-Reconciled events return 400 with no status change.

**Independent Test**: Invalid-state tests pass (quickstart Scenario 2).

### Tests for User Story 2 (REQUIRED) ⚠️

- [x] T020 [P] [US2] Add failing test `Reconcile_PreShowEvent_Returns400` in `apps/api.tests/Integration/ReconcileControllerTests.cs` (contract R2)
- [x] T021 [P] [US2] Add failing test `Reconcile_AlreadyReconciled_Returns400` in `apps/api.tests/Integration/ReconcileControllerTests.cs` (contract R3)

### Implementation for User Story 2

- [x] T022 [US2] Verify `SettlementStateException` for non-SETTLED status in `ReconcileAsync` in `apps/api/Services/SettlementService.cs` (adjust message/guard if tests reveal gaps)
- [x] T023 [US2] Run US2 tests until green: `cd apps/api.tests && dotnet test --filter "FullyQualifiedName~ReconcileControllerTests"`
- [x] T024 [US2] Mark rows R2, R3 complete in `specs/033-post-reconcile-endpoint/contracts/reconcile-api.md`

**Checkpoint**: Lifecycle state machine rejects invalid transitions

---

## Phase 5: User Story 3 — Enforce Organization and Venue Access (Priority: P1)

**Goal**: Cross-org, out-of-scope venue, and wrong-venue reconcile attempts return 404 without data leakage.

**Independent Test**: Tenant and venue scope denial tests pass (quickstart Scenarios 4–5).

### Tests for User Story 3 (REQUIRED) ⚠️

- [x] T025 [P] [US3] Add failing test `Reconcile_CrossOrg_Returns404` in `apps/api.tests/Integration/ReconcileControllerTests.cs` (contract R5, R7; pattern from `TenantIsolationTests.cs`)
- [x] T026 [P] [US3] Add failing test `Reconcile_OutOfScopeVenue_Returns404` in `apps/api.tests/Integration/ReconcileControllerTests.cs` (contract R6)
- [x] T027 [P] [US3] Add failing test `Reconcile_WrongVenueIdForEvent_Returns404` in `apps/api.tests/Integration/ReconcileControllerTests.cs` (contract R5)

### Implementation for User Story 3

- [x] T028 [US3] Verify venue/event validation and `NotFoundException` paths in `ReconcileAsync` in `apps/api/Services/SettlementService.cs` cover all US3 test cases
- [x] T029 [US3] Run US3 tests until green: `cd apps/api.tests && dotnet test --filter "FullyQualifiedName~ReconcileControllerTests"`
- [x] T030 [US3] Mark rows R5, R6, R7 complete in `specs/033-post-reconcile-endpoint/contracts/reconcile-api.md`

**Checkpoint**: Multi-tenant and venue-scoping enforcement verified

---

## Phase 6: User Story 4 — Preserve Financial Immutability After Reconciliation (Priority: P2)

**Goal**: Reconciliation does not alter settlement snapshot fields; post-reconcile financial mutations remain blocked.

**Independent Test**: Immutability tests pass (quickstart Scenario 6).

### Tests for User Story 4 (REQUIRED) ⚠️

- [x] T031 [P] [US4] Add failing test `Reconcile_PreservesSettlementFields` in `apps/api.tests/Integration/ReconcileControllerTests.cs` (contract R10; compare `settledAt`, `settlementPdfAvailable` before/after)
- [x] T032 [P] [US4] Add failing test `Reconcile_PostReconcileLineItemMutation_Returns400` in `apps/api.tests/Integration/ReconcileControllerTests.cs` (contract R11; pattern from `LedgerStateMachineTests.Mutations_WhenReconciled_Return400`)

### Implementation for User Story 4

- [x] T033 [US4] Verify `ReconcileAsync` in `apps/api/Services/SettlementService.cs` updates only `status`, `reconciled_at`, and `reconciled_by_user_id` (no settlement/financial field writes)
- [x] T034 [US4] Run US4 tests until green: `cd apps/api.tests && dotnet test --filter "FullyQualifiedName~ReconcileControllerTests"`
- [x] T035 [US4] Mark rows R10, R11 complete in `specs/033-post-reconcile-endpoint/contracts/reconcile-api.md`

**Checkpoint**: Financial immutability preserved through reconcile transition

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Concurrency edge case, full regression, coverage gate, OpenAPI regeneration, quickstart validation.

- [x] T036 [P] Add failing test `Reconcile_ConcurrentSecondRequest_Returns409` in `apps/api.tests/Integration/ReconcileControllerTests.cs` (contract R12; optional if harness supports parallel POST)
- [x] T037 Run full API test suite: `cd apps/api.tests && dotnet test`
- [x] T038 Verify ≥80.0% line/branch coverage on touched backend files: `cd apps/api.tests && dotnet test --collect:"XPlat Code Coverage"` (contract R13, SC-006)
- [x] T039 Run `dotnet build` in `apps/api/` and verify `swagger.json` includes `POST .../reconcile` with extended `EventResponse` fields; confirm `apps/web/src/types/generated-api.ts` regenerated per Constitution VI
- [x] T040 Run quickstart validation scenarios in `specs/033-post-reconcile-endpoint/quickstart.md`
- [x] T041 Mark rows R12, R13 complete in `specs/033-post-reconcile-endpoint/contracts/reconcile-api.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS all user stories**
- **User Stories (Phases 3–6)**: All depend on Foundational completion
  - US1 (Phase 3) implements core endpoint — **MVP blocker for US2–US4 tests**
  - US2–US4 add test coverage for guards already in `ReconcileAsync`; can proceed sequentially after US1
- **Polish (Phase 7)**: Depends on Phases 3–6 complete

### User Story Dependencies

- **User Story 1 (P1)**: After Foundational — no dependency on other stories; delivers MVP
- **User Story 2 (P1)**: After US1 implementation (tests assert existing `ReconcileAsync` guards)
- **User Story 3 (P1)**: After US1 implementation (tests assert venue/org validation)
- **User Story 4 (P2)**: After US1 implementation (tests assert immutability post-reconcile)

### Within Each User Story

- Tests written and **FAIL** before implementation changes
- Foundational migration/DTOs before any service logic
- Service method before controller route
- DTO mappers updated before dashboard/event propagation tests
- Story tests green before next story phase

### Parallel Opportunities

- T002 + T003 (Setup review docs)
- T007 + T008 (DTO extensions in parallel)
- T010–T013 (US1 failing tests in parallel)
- T020 + T021 (US2 failing tests in parallel)
- T025–T027 (US3 failing tests in parallel)
- T031 + T032 (US4 failing tests in parallel)

---

## Parallel Example: User Story 1

```bash
# Launch all failing tests for User Story 1 together:
Task: "Add failing test Reconcile_SettledEvent_Returns200_WithMetadata in apps/api.tests/Integration/ReconcileControllerTests.cs"
Task: "Add failing test Reconcile_GetEventAfterReconcile_ReflectsMetadata in apps/api.tests/Integration/ReconcileControllerTests.cs"
Task: "Add failing test Reconcile_DashboardAfterReconcile_ReflectsReconciledStatus in apps/api.tests/Integration/ReconcileControllerTests.cs"
Task: "Add failing test Reconcile_WithoutTriggerQboSync_Returns403 in apps/api.tests/Integration/ReconcileControllerTests.cs"

# After T014–T017 implementation, run:
cd apps/api.tests && dotnet test --filter "FullyQualifiedName~ReconcileControllerTests"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (migration + DTOs + test scaffold)
3. Complete Phase 3: User Story 1 (reconcile endpoint + metadata propagation)
4. **STOP and VALIDATE**: `dotnet test --filter "FullyQualifiedName~ReconcileControllerTests"` — happy path green
5. Demo via HTTP: settle event → reconcile → GET event shows `RECONCILED`

### Incremental Delivery

1. Setup + Foundational → schema and DTOs ready
2. User Story 1 → reconcile works end-to-end (MVP)
3. User Story 2 → invalid transitions rejected
4. User Story 3 → tenant/venue isolation hardened
5. User Story 4 → immutability verified post-reconcile
6. Polish → coverage gate + quickstart

### Parallel Team Strategy

With multiple developers after Foundational:

- Developer A: US1 implementation (T014–T017)
- Developer B: US2 + US3 failing tests (T020–T027) while A implements
- Developer C: US4 failing tests (T031–T032) + Polish prep

---

## Notes

- Backend-only feature; no `apps/web/` changes until a future UI feature consumes the endpoint
- `ReconcileAsync` is a **sanctioned** `events` mutation — does not trigger `LedgerService.AssertNotSettledOrReconciled` on financial paths
- Seed settled events via `SetEventStatusDirectAsync` in tests; full settle flow optional when QuestPDF supported
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
