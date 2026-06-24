---
description: "Task list for User Event Pin Persistence (SPLR-69)"
---

# Tasks: User Event Pin Persistence

**Input**: Design documents from `/specs/029-user-event-pin-entity/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/persistence-schema.md, quickstart.md

**Tests**: REQUIRED per Constitution III. Each user story phase adds xUnit integration tests in `apps/api.tests/Integration/UserEventPinPersistenceTests.cs` (write failing tests first, then implement until green). Final Polish phase enforces ≥80.0% line/branch coverage on **backend** touched files via `dotnet test --collect:"XPlat Code Coverage"` (coverlet → cobertura). No frontend changes — frontend coverage gate N/A.

**Organization**: Tasks grouped by user story (US1–US4). Backend data-layer slice through `apps/api/Models/`, `apps/api/Data/`, and `apps/api.tests/Integration/`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1–US4 (maps to user stories in spec.md)
- All paths are repo-relative

## Path Conventions

- Entity: `apps/api/Models/UserEventPin.cs`
- Navigations: `apps/api/Models/User.cs`, `apps/api/Models/Event.cs`
- DbContext: `apps/api/Data/ApplicationDbContext.cs`
- Migrations: `apps/api/Data/Migrations/`
- Integration tests: `apps/api.tests/Integration/UserEventPinPersistenceTests.cs`
- Contract matrix: `specs/029-user-event-pin-entity/contracts/persistence-schema.md`
- Test base: `apps/api.tests/Integration/IntegrationTestBase.cs`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm branch, prerequisites, and persistence contract before implementation.

- [x] T001 Verify branch `029-user-event-pin-entity` and design docs in `specs/029-user-event-pin-entity/` per plan.md
- [x] T002 [P] Review persistence contract matrix in `specs/029-user-event-pin-entity/contracts/persistence-schema.md` (rows P1–P10)
- [x] T003 [P] Confirm prerequisites on branch: `User`, `Event`, `Venue` models, `IntegrationTestBase` with `MigrateAsync`, and `UserVenueScope` composite-key pattern in `apps/api/Data/ApplicationDbContext.cs`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Integration test harness scaffold. **Blocks all user stories.**

**⚠️ CRITICAL**: No user story implementation begins until test scaffold exists.

- [x] T004 Create `apps/api.tests/Integration/UserEventPinPersistenceTests.cs` extending `IntegrationTestBase` with helper methods to seed org/venue/event/user via scoped `ApplicationDbContext` (pattern from `SetEventStatusDirectAsync` in `apps/api.tests/Integration/IntegrationTestBase.cs`)

**Checkpoint**: Test file compiles; story-specific test methods added in Phases 3–6

---

## Phase 3: User Story 1 — Durable Event Pin Records (Priority: P1) 🎯 MVP

**Goal**: Persist a user–event pin with `PinnedAt` timestamp; enforce one pin per user per event.

**Independent Test**: `cd apps/api.tests && dotnet test --filter "FullyQualifiedName~UserEventPinPersistenceTests"` — P1–P3 contract rows pass (quickstart Scenario 2).

### Tests for User Story 1 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T005 [P] [US1] Add failing test `PinRecord_InsertAndQuery_ReturnsPinnedAt` in `apps/api.tests/Integration/UserEventPinPersistenceTests.cs` (contract P1, P2)
- [x] T006 [P] [US1] Add failing test `PinRecord_DuplicateUserEvent_Throws` in `apps/api.tests/Integration/UserEventPinPersistenceTests.cs` (contract P3)

### Implementation for User Story 1

- [x] T007 [P] [US1] Create `UserEventPin` entity in `apps/api/Models/UserEventPin.cs` per `specs/029-user-event-pin-entity/data-model.md` (`UserId`, `EventId`, `PinnedAt`, navigations)
- [x] T008 [P] [US1] Add `EventPins` collection to `apps/api/Models/User.cs` and `UserEventPins` collection to `apps/api/Models/Event.cs`
- [x] T009 [US1] Add `DbSet<UserEventPin>`, `ConfigureUserEventPin` (table `user_event_pins`, composite PK, `pinned_at` default `NOW()`, User/Event FKs) in `apps/api/Data/ApplicationDbContext.cs`
- [x] T010 [US1] Generate EF migration: `cd apps/api && dotnet ef migrations add AddUserEventPin` → `apps/api/Data/Migrations/{timestamp}_AddUserEventPin.cs`
- [x] T011 [US1] Run `cd apps/api.tests && dotnet test --filter "FullyQualifiedName~UserEventPinPersistenceTests"` until US1 tests pass
- [x] T012 [US1] Mark rows P1–P3 complete in `specs/029-user-event-pin-entity/contracts/persistence-schema.md`

**Checkpoint**: MVP — pin insert, query, and uniqueness verified independently

---

## Phase 4: User Story 2 — Organization-Scoped Pin Data (Priority: P1)

**Goal**: Pin records visible only within the organization of the pinned event's venue.

**Independent Test**: Cross-org isolation test passes — Org A context returns zero Org B pins (quickstart Scenario 3).

### Tests for User Story 2 (REQUIRED) ⚠️

- [x] T013 [P] [US2] Add failing test `PinRecord_CrossOrg_NotVisible` in `apps/api.tests/Integration/UserEventPinPersistenceTests.cs` (contract P4)

### Implementation for User Story 2

- [x] T014 [US2] Add `UserEventPin` global query filter (`e.Event.Venue.OrganizationId == _tenantContext.OrganizationId`) in `ApplyTenantQueryFilters` in `apps/api/Data/ApplicationDbContext.cs`
- [x] T015 [US2] Run isolation test until green: `cd apps/api.tests && dotnet test --filter "PinRecord_CrossOrg_NotVisible"`
- [x] T016 [US2] Mark row P4 complete in `specs/029-user-event-pin-entity/contracts/persistence-schema.md`

**Checkpoint**: Tenant isolation for pins verified (Constitution II)

---

## Phase 5: User Story 3 — Automatic Cleanup on Event Removal (Priority: P2)

**Goal**: Deleting an event removes all pin records referencing it.

**Independent Test**: Event-delete cascade test passes — zero pins after event removal (quickstart Scenario 4).

### Tests for User Story 3 (REQUIRED) ⚠️

- [x] T017 [P] [US3] Add failing test `PinRecord_EventDelete_Cascades` in `apps/api.tests/Integration/UserEventPinPersistenceTests.cs` (contract P5)

### Implementation for User Story 3

- [x] T018 [US3] Verify `Event` FK uses `OnDelete(DeleteBehavior.Cascade)` in `ConfigureUserEventPin` in `apps/api/Data/ApplicationDbContext.cs`
- [x] T019 [US3] Run cascade test until green: `cd apps/api.tests && dotnet test --filter "PinRecord_EventDelete_Cascades"`
- [x] T020 [US3] Mark row P5 complete in `specs/029-user-event-pin-entity/contracts/persistence-schema.md`

**Checkpoint**: No orphaned pins after event deletion

---

## Phase 6: User Story 4 — Safe Schema Deployment (Priority: P2)

**Goal**: Migration applies on fresh and pre-populated databases; user deletion cascades pins.

**Independent Test**: Populated-DB and user-cascade tests pass (quickstart Scenarios 1, 5).

### Tests for User Story 4 (REQUIRED) ⚠️

- [x] T021 [P] [US4] Add failing test `Migration_AppliesOnPopulatedDatabase` in `apps/api.tests/Integration/UserEventPinPersistenceTests.cs` (contract P6, P7)
- [x] T022 [P] [US4] Add failing test `PinRecord_UserDelete_Cascades` in `apps/api.tests/Integration/UserEventPinPersistenceTests.cs` (contract P9)

### Implementation for User Story 4

- [x] T023 [US4] Verify `User` FK uses `OnDelete(DeleteBehavior.Cascade)` in `ConfigureUserEventPin` in `apps/api/Data/ApplicationDbContext.cs`
- [x] T024 [US4] Run US4 tests until green: `cd apps/api.tests && dotnet test --filter "FullyQualifiedName~UserEventPinPersistenceTests"`
- [x] T025 [US4] Mark rows P6, P7, P9 complete in `specs/029-user-event-pin-entity/contracts/persistence-schema.md`

**Checkpoint**: Schema deployment and user cascade verified

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Full regression, coverage gate, contract closure.

- [x] T026 [P] Run full backend test suite: `cd apps/api.tests && dotnet test`
- [x] T027 Verify ≥80.0% line/branch coverage on touched backend files (`UserEventPin.cs`, `ApplicationDbContext.cs` delta, `UserEventPinPersistenceTests.cs`) via `cd apps/api.tests && dotnet test --collect:"XPlat Code Coverage"` (contract P10); frontend N/A per plan.md
- [x] T028 Run quickstart validation per `specs/029-user-event-pin-entity/quickstart.md` (all six scenarios)
- [x] T029 Mark rows P8, P10 and all contract statuses ✓ in `specs/029-user-event-pin-entity/contracts/persistence-schema.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS all user stories**
- **User Stories (Phases 3–6)**: Depend on Foundational (T004)
  - **US1 (Phase 3)**: No dependency on US2–US4 — delivers MVP
  - **US2 (Phase 4)**: Depends on US1 entity/migration (T007–T010); adds tenant filter
  - **US3 (Phase 5)**: Depends on US1 entity (T007–T010); verifies event cascade
  - **US4 (Phase 6)**: Depends on US1 migration (T010); adds populated-DB + user cascade tests
- **Polish (Phase 7)**: Depends on Phases 3–6 complete

### User Story Dependencies

| Story | Priority | Depends on | Delivers |
|-------|----------|------------|----------|
| US1 | P1 | Phase 2 | Entity, migration, insert/query/uniqueness |
| US2 | P1 | US1 (T007–T010) | Org-scoped query filter |
| US3 | P2 | US1 (T007–T010) | Event-delete cascade |
| US4 | P2 | US1 (T010) | Populated DB migration + user cascade |

### Within Each User Story

- Tests written and **FAIL** before implementation changes
- DbContext configuration updated before re-running tests
- Contract matrix updated when story checkpoint reached

### Parallel Opportunities

- **Phase 1**: T002 ∥ T003
- **Phase 3**: T005 ∥ T006 (tests); T007 ∥ T008 (models after tests written)
- **Phase 6**: T021 ∥ T022 (tests)
- **Phase 7**: T026 ∥ T027 (after all stories green)

---

## Parallel Example: User Story 1

```bash
# Launch failing tests together (after T004 scaffold):
Task: "Add failing test PinRecord_InsertAndQuery_ReturnsPinnedAt in apps/api.tests/Integration/UserEventPinPersistenceTests.cs"
Task: "Add failing test PinRecord_DuplicateUserEvent_Throws in apps/api.tests/Integration/UserEventPinPersistenceTests.cs"

# Launch model files together (after tests fail):
Task: "Create UserEventPin entity in apps/api/Models/UserEventPin.cs"
Task: "Add EventPins/UserEventPins navigations in apps/api/Models/User.cs and Event.cs"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational test scaffold (T004)
3. Complete Phase 3: User Story 1 (T005–T012)
4. **STOP and VALIDATE**: `dotnet test --filter UserEventPinPersistenceTests` — P1–P3 green
5. Downstream SPLR-70/72 can proceed once full feature merges

### Incremental Delivery

1. Setup + Foundational → test harness ready
2. US1 → durable pin records (MVP data layer)
3. US2 → tenant isolation (release blocker)
4. US3 → event cascade integrity
5. US4 → deployment safety + user cascade
6. Polish → coverage gate + contract closure

### Parallel Team Strategy

With two developers after Phase 2:

- **Developer A**: US1 (entity + migration) then US3 (event cascade)
- **Developer B**: Wait for US1 T010, then US2 (tenant filter) + US4 (user cascade tests)

---

## Notes

- No API controllers, DTOs, or frontend files in this feature (OOS-001–OOS-003 in spec.md)
- Reuse `IntegrationTestBase` seeding helpers; set `ITenantContext` via `SetContext(userId, orgId)` before DbContext operations
- Migration name: `AddUserEventPin` per plan.md
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
