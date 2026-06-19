---
description: "Task list for Event Pin API Endpoints (SPLR-70)"
---

# Tasks: Event Pin API Endpoints

**Input**: Design documents from `/specs/030-event-pin-endpoints/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/event-pin-api.md, quickstart.md

**Tests**: REQUIRED per Constitution III. Each user story phase adds xUnit integration tests in `apps/api.tests/Integration/EventPinControllerTests.cs` (write failing tests first, then implement until green). Final Polish phase enforces ≥80.0% line/branch coverage on **backend** touched files via `dotnet test --collect:"XPlat Code Coverage"` (coverlet → cobertura). No frontend changes — frontend coverage gate N/A.

**Organization**: Tasks grouped by user story (US1–US4). Backend API slice through `apps/api/Services/`, `apps/api/Controllers/`, and `apps/api.tests/Integration/`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1–US4 (maps to user stories in spec.md)
- All paths are repo-relative

## Path Conventions

- Service: `apps/api/Services/EventPinService.cs`
- Controller: `apps/api/Controllers/EventsController.cs`
- DI registration: `apps/api/Program.cs`
- Integration tests: `apps/api.tests/Integration/EventPinControllerTests.cs`
- Contract matrix: `specs/030-event-pin-endpoints/contracts/event-pin-api.md`
- Test base: `apps/api.tests/Integration/IntegrationTestBase.cs`
- Upstream entity: `apps/api/Models/UserEventPin.cs` (from spec 029 — no changes expected)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm branch, prerequisites, and API contract before implementation.

- [x] T001 Verify branch `030-event-pin-endpoints` and design docs in `specs/030-event-pin-endpoints/` per plan.md
- [x] T002 [P] Review API contract matrix in `specs/030-event-pin-endpoints/contracts/event-pin-api.md` (rows A1–A12)
- [x] T003 [P] Confirm upstream prerequisites: `UserEventPin` entity, `ApplicationDbContext.UserEventPins` DbSet, and migration from spec 029 in `apps/api/Models/UserEventPin.cs` and `apps/api/Data/ApplicationDbContext.cs`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Integration test harness scaffold. **Blocks all user stories.**

**⚠️ CRITICAL**: No user story implementation begins until test scaffold exists.

- [x] T004 Create `apps/api.tests/Integration/EventPinControllerTests.cs` extending `IntegrationTestBase` with helper methods to assert pin row presence/absence via scoped `ApplicationDbContext` (pattern from `UserEventPinPersistenceTests.cs` in `apps/api.tests/Integration/`)

**Checkpoint**: Test file compiles; story-specific test methods added in Phases 3–6

---

## Phase 3: User Story 1 — Pin an Event for Quick Access (Priority: P1) 🎯 MVP

**Goal**: Authorized users can `PUT .../pin` to create a personal pin with `PinnedAt`; idempotent re-pin; denied without `can_view_financials`.

**Independent Test**: `cd apps/api.tests && dotnet test --filter "FullyQualifiedName~EventPinControllerTests"` — pin, idempotent pin, and 403 tests pass (quickstart Scenario 1–2 partial, Scenario 3).

### Tests for User Story 1 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T005 [P] [US1] Add failing test `PinEvent_Returns204_AndCreatesPinRow` in `apps/api.tests/Integration/EventPinControllerTests.cs` (contract A1, A11)
- [x] T006 [P] [US1] Add failing test `PinEvent_Idempotent_DoesNotDuplicate` in `apps/api.tests/Integration/EventPinControllerTests.cs` (contract A7)
- [x] T007 [P] [US1] Add failing test `PinEvent_WithoutViewFinancials_Returns403` in `apps/api.tests/Integration/EventPinControllerTests.cs` (contract A4; pattern from `SettlementAuthorizationTests.cs`)

### Implementation for User Story 1

- [x] T008 [P] [US1] Create `EventPinService` with `PinEventAsync(venueId, eventId, ct)` in `apps/api/Services/EventPinService.cs` per `specs/030-event-pin-endpoints/data-model.md` (venue access via `VenueService.IsVenueAccessibleAsync`, event validation, idempotent insert)
- [x] T009 [US1] Register `EventPinService` in `apps/api/Program.cs`
- [x] T010 [US1] Add `[HttpPut("{eventId:guid}/pin")]` action with `[RequirePermission(PermissionNames.ViewFinancials)]` returning `NoContent()` in `apps/api/Controllers/EventsController.cs`
- [x] T011 [US1] Run US1 tests until green: `cd apps/api.tests && dotnet test --filter "FullyQualifiedName~EventPinControllerTests"`
- [x] T012 [US1] Mark rows A1, A4, A7, A11 complete in `specs/030-event-pin-endpoints/contracts/event-pin-api.md`

**Checkpoint**: MVP — pin via HTTP works; idempotent; permission gate enforced

---

## Phase 4: User Story 2 — Unpin an Event (Priority: P1)

**Goal**: Users can `DELETE .../pin` to remove their pin; no-op when not pinned; per-user isolation when two users pin the same event.

**Independent Test**: Unpin round-trip and per-user isolation tests pass (quickstart Scenario 1, Scenario 6).

### Tests for User Story 2 (REQUIRED) ⚠️

- [x] T013 [P] [US2] Add failing test `UnpinEvent_Returns204_AndRemovesPinRow` in `apps/api.tests/Integration/EventPinControllerTests.cs` (contract A2)
- [x] T014 [P] [US2] Add failing test `UnpinEvent_WhenNotPinned_Returns204` in `apps/api.tests/Integration/EventPinControllerTests.cs` (contract A8)
- [x] T015 [P] [US2] Add failing test `UnpinEvent_PerUserIsolation_TwoUsersSameEvent` in `apps/api.tests/Integration/EventPinControllerTests.cs` (contract A3; use `CreateScopedVenueUserAsync` from `IntegrationTestBase.cs`)

### Implementation for User Story 2

- [x] T016 [US2] Add `UnpinEventAsync(venueId, eventId, ct)` to `apps/api/Services/EventPinService.cs` (same venue/event validation; delete pin row or no-op)
- [x] T017 [US2] Add `[HttpDelete("{eventId:guid}/pin")]` action with `[RequirePermission(PermissionNames.ViewFinancials)]` returning `NoContent()` in `apps/api/Controllers/EventsController.cs`
- [x] T018 [US2] Run US2 tests until green: `cd apps/api.tests && dotnet test --filter "FullyQualifiedName~EventPinControllerTests"`
- [x] T019 [US2] Mark rows A2, A3, A8 complete in `specs/030-event-pin-endpoints/contracts/event-pin-api.md`

**Checkpoint**: Pin/unpin round-trip complete; per-user isolation verified

---

## Phase 5: User Story 3 — Organization and Venue Access Enforcement (Priority: P1)

**Goal**: Cross-org, out-of-scope venue, and wrong-venue pin attempts return 404 without data leakage.

**Independent Test**: Tenant and venue scope denial tests pass (quickstart Scenarios 4–5).

### Tests for User Story 3 (REQUIRED) ⚠️

- [x] T020 [P] [US3] Add failing test `PinEvent_CrossOrg_Returns404` in `apps/api.tests/Integration/EventPinControllerTests.cs` (contract A5, A9; pattern from `TenantIsolationTests.cs`)
- [x] T021 [P] [US3] Add failing test `PinEvent_OutOfScopeVenue_Returns404` in `apps/api.tests/Integration/EventPinControllerTests.cs` (contract A6)
- [x] T022 [P] [US3] Add failing test `PinEvent_WrongVenueIdForEvent_Returns404` in `apps/api.tests/Integration/EventPinControllerTests.cs` (contract A5)

### Implementation for User Story 3

- [x] T023 [US3] Verify venue/event validation and `NotFoundException` paths in `PinEventAsync` and `UnpinEventAsync` in `apps/api/Services/EventPinService.cs` cover all US3 test cases (adjust if tests reveal gaps)
- [x] T024 [US3] Run US3 tests until green: `cd apps/api.tests && dotnet test --filter "FullyQualifiedName~EventPinControllerTests"`
- [x] T025 [US3] Mark rows A5, A6, A9 complete in `specs/030-event-pin-endpoints/contracts/event-pin-api.md`

**Checkpoint**: Multi-tenant and venue-scoping release blocker cleared (Constitution II)

---

## Phase 6: User Story 4 — Pin Cleanup When Events Are Removed (Priority: P2)

**Goal**: Pinning an event via API then deleting the event removes all pin rows (FK cascade from spec 029).

**Independent Test**: Event-delete cascade test passes (quickstart Scenario 7).

### Tests for User Story 4 (REQUIRED) ⚠️

- [x] T026 [P] [US4] Add failing test `PinEvent_EventDelete_CascadesPinRemoval` in `apps/api.tests/Integration/EventPinControllerTests.cs` (contract A10; pin via `PUT`, delete via existing `DELETE /api/venues/{venueId}/events/{eventId}`)

### Implementation for User Story 4

- [x] T027 [US4] Run US4 test until green — no service changes expected if spec 029 FK cascade is intact; fix only if test fails
- [x] T028 [US4] Mark row A10 complete in `specs/030-event-pin-endpoints/contracts/event-pin-api.md`

**Checkpoint**: No orphaned pins after event deletion via API flow

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Full regression, coverage gate, contract closure.

- [x] T029 [P] Run full backend test suite: `cd apps/api.tests && dotnet test`
- [x] T030 Verify ≥80.0% line/branch coverage on touched backend files (`EventPinService.cs`, `EventsController.cs` pin actions, `EventPinControllerTests.cs`) via `cd apps/api.tests && dotnet test --collect:"XPlat Code Coverage"` (contract A12); frontend N/A per plan.md
- [x] T031 Run quickstart validation per `specs/030-event-pin-endpoints/quickstart.md` (all eight scenarios)
- [x] T032 Mark row A12 and all contract statuses ✓ in `specs/030-event-pin-endpoints/contracts/event-pin-api.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS all user stories**
- **User Stories (Phases 3–6)**: Depend on Foundational (T004)
  - **US1 (Phase 3)**: No dependency on US2–US4 — delivers MVP (PUT pin)
  - **US2 (Phase 4)**: Depends on US1 service scaffold (T008–T010); adds DELETE unpin
  - **US3 (Phase 5)**: Depends on US1 pin endpoint (T010); tests access denial on existing routes
  - **US4 (Phase 6)**: Depends on US1 pin endpoint (T010); verifies cascade via existing event DELETE
- **Polish (Phase 7)**: Depends on Phases 3–6 complete

### User Story Dependencies

| Story | Priority | Depends on | Delivers |
|-------|----------|------------|----------|
| US1 | P1 | Phase 2 | `EventPinService.PinEventAsync`, PUT endpoint, pin + auth tests |
| US2 | P1 | US1 (T008–T010) | `UnpinEventAsync`, DELETE endpoint, per-user isolation |
| US3 | P1 | US1 (T010) | Cross-org and venue-scope 404 tests |
| US4 | P2 | US1 (T010) | Event-delete cascade via API integration test |

### Within Each User Story

- Tests written and **FAIL** before implementation changes
- Service methods before controller actions (or controller stub that calls missing service to get red tests)
- Contract matrix updated when story checkpoint reached

### Parallel Opportunities

- **Phase 1**: T002 ∥ T003
- **Phase 3**: T005 ∥ T006 ∥ T007 (tests); T008 can start after tests are written (parallel with T005–T007 if tests reference not-yet-existing routes — expect compile errors until T010)
- **Phase 4**: T013 ∥ T014 ∥ T015 (tests)
- **Phase 5**: T020 ∥ T021 ∥ T022 (tests)
- **Phase 7**: T029 ∥ T030 (after all stories green)

---

## Parallel Example: User Story 1

```bash
# Launch failing tests together (after T004 scaffold):
Task: "Add failing test PinEvent_Returns204_AndCreatesPinRow in apps/api.tests/Integration/EventPinControllerTests.cs"
Task: "Add failing test PinEvent_Idempotent_DoesNotDuplicate in apps/api.tests/Integration/EventPinControllerTests.cs"
Task: "Add failing test PinEvent_WithoutViewFinancials_Returns403 in apps/api.tests/Integration/EventPinControllerTests.cs"

# Then implement service + controller sequentially:
Task: "Create EventPinService with PinEventAsync in apps/api/Services/EventPinService.cs"
Task: "Register EventPinService in apps/api/Program.cs"
Task: "Add PUT pin action in apps/api/Controllers/EventsController.cs"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational test scaffold (T004)
3. Complete Phase 3: User Story 1 (T005–T012)
4. **STOP and VALIDATE**: `dotnet test --filter EventPinControllerTests` — pin + idempotent + 403 green
5. Downstream SPLR-71/72 can proceed once full feature merges

### Incremental Delivery

1. Setup + Foundational → test harness ready
2. US1 → PUT pin endpoint (MVP API)
3. US2 → DELETE unpin + per-user isolation
4. US3 → tenant/venue access enforcement (release blocker)
5. US4 → event-delete cascade integrity
6. Polish → coverage gate + contract closure

### Parallel Team Strategy

With two developers after Phase 2:

- **Developer A**: US1 (service + PUT) then US2 (unpin + DELETE)
- **Developer B**: After US1 T010, US3 (access denial tests) + US4 (cascade test)

---

## Notes

- No new migrations, DTOs, or frontend files (OOS-001–OOS-005 in spec.md)
- Reuse `IntegrationTestBase.SetupFinancialAdminAsync`, `CreateEventViaApiAsync`, `CreateScopedVenueUserAsync`, and DbContext pin assertion helpers
- Both pin actions return **204 No Content** with empty body per `specs/030-event-pin-endpoints/contracts/event-pin-api.md`
- Pin/unpin does **not** require ledger state guards (Constitution V N/A)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
