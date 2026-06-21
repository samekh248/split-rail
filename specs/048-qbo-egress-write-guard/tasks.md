---
description: "Task list for Always-On QuickBooks Egress Write Guard (SPLR-41)"
---

# Tasks: Always-On QuickBooks Egress Write Guard

**Input**: Design documents from `/specs/048-qbo-egress-write-guard/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/qbo-egress-write-guard.md, quickstart.md

**Tests**: Integration tests in `QboEgressWriteGuardProductionTests` use in-memory EF (no Docker). Preview egress regression (`TestSeedingControllerTests.GetQboEgress`) requires Docker/Testcontainers when run locally.

**Organization**: Tasks grouped by user story (US1–US3). Primary product change is unconditional `QboEgressRecordingHandler` registration on `QboApi` in `apps/api/Program.cs`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1–US3 (maps to user stories in spec.md)
- All paths are repo-relative

## Path Conventions

- Handler (existing): `apps/api/Http/QboEgressRecordingHandler.cs`
- DI registration: `apps/api/Program.cs`
- OAuth client (unchanged): `apps/api/Services/QboTokenService.cs`
- Unit tests: `apps/api.tests/Unit/QboEgressRecordingHandlerTests.cs`
- Integration tests: `apps/api.tests/Integration/QboEgressWriteGuardProductionTests.cs`
- Test base (reuse): `apps/api.tests/Integration/IntegrationTestBase.cs` (`CreateFactoryWithQboHandler`)
- Preview egress API (regression): `apps/api/Controllers/TestSeedingController.cs`
- E2E regression: `tests/e2e/specs/integrity/zero-write-infiltration.spec.ts`
- Contract: `specs/048-qbo-egress-write-guard/contracts/qbo-egress-write-guard.md`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm branch, prerequisites, and egress contract before implementation.

- [x] T001 Verify branch `048-qbo-egress-write-guard` and design docs in `specs/048-qbo-egress-write-guard/` per plan.md
- [x] T002 [P] Review verb matrix and registration invariant in `specs/048-qbo-egress-write-guard/contracts/qbo-egress-write-guard.md`
- [x] T003 [P] Review registration and OAuth separation decisions in `specs/048-qbo-egress-write-guard/research.md` and HTTP client channels in `specs/048-qbo-egress-write-guard/data-model.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Confirm current preview-only gap and client-channel separation. **Blocks all user stories.**

**⚠️ CRITICAL**: No user story work begins until the preview-only registration gap in `apps/api/Program.cs` is documented and `QboOAuth` channel separation is verified.

- [x] T004 Audit current `QboApi` / `QboOAuth` registration in `apps/api/Program.cs` — confirm handler is gated on `Preview:UseFakeQboConnector` and `QboOAuth` has no handler
- [x] T005 [P] Verify `QboTokenService` uses `CreateClient("QboOAuth")` exclusively for `IntuitTokenUrl` and `IntuitRevokeUrl` in `apps/api/Services/QboTokenService.cs` per OAuth exclusion contract

**Checkpoint**: Gap confirmed; OAuth structurally isolated from `QboApi` handler

---

## Phase 3: User Story 1 — Production Enforces Zero Write Infiltration (Priority: P1) 🎯 MVP

**Goal**: `QboEgressRecordingHandler` is registered on `QboApi` in all environments; mutating accounting requests blocked, read-only GET permitted.

**Independent Test**: `dotnet test apps/api.tests --filter "FullyQualifiedName~QboEgressWriteGuard"` — POST blocked and GET permitted with `Preview:UseFakeQboConnector=false`.

### Tests for User Story 1 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T006 [P] [US1] Add failing unit test `SendAsync_BlocksPutToIntuitBaseUrl` in `apps/api.tests/Unit/QboEgressRecordingHandlerTests.cs` — PUT to `IntuitApiBaseUrl` throws `QboSyncException` with `zero_write_infiltration`
- [x] T007 [P] [US1] Add failing unit test `SendAsync_BlocksDeleteToIntuitBaseUrl` in `apps/api.tests/Unit/QboEgressRecordingHandlerTests.cs` — DELETE to accounting host throws `QboSyncException`
- [x] T008 [P] [US1] Create `QboEgressWriteGuardProductionTests` skeleton in `apps/api.tests/Integration/QboEgressWriteGuardProductionTests.cs` with factory config `Preview:UseFakeQboConnector=false`
- [x] T009 [US1] Add failing integration test `ProductionConfig_QboApi_PostToAccounting_BlockedBeforeInnerHandler` in `apps/api.tests/Integration/QboEgressWriteGuardProductionTests.cs` — stub `HttpMessageHandler` records requests; POST to `quickbooks.api.intuit.com` throws before stub invoked (contract V-003)
- [x] T010 [US1] Add failing integration test `ProductionConfig_QboApi_GetToAccounting_ReachesInnerHandler` in `apps/api.tests/Integration/QboEgressWriteGuardProductionTests.cs` — GET proceeds to stub handler (contract V-004)

### Implementation for User Story 1

- [x] T011 [US1] Refactor `apps/api/Program.cs` — move `AddSingleton<QboEgressRecordingHandler>()` and `.AddHttpMessageHandler(...)` outside `if (previewOptions.UseFakeQboConnector)` so `QboApi` always has the handler; keep fake-connector and `IQboTransactionClient` swap preview-gated
- [x] T012 [US1] Run US1 tests until green: `dotnet test apps/api.tests --filter "FullyQualifiedName~QboEgressWriteGuard|FullyQualifiedName~QboEgressRecordingHandler"`

**Checkpoint**: MVP — production-like config blocks mutating accounting egress; GET reads permitted

---

## Phase 4: User Story 2 — OAuth Lifecycle Operations Remain Permitted (Priority: P1)

**Goal**: Token exchange, refresh, and revocation on `QboOAuth` succeed while `QboApi` mutating accounting requests remain blocked in the same configuration.

**Independent Test**: Integration tests prove `QboOAuth` POST reaches stub handler and `QboApi` POST does not, with `UseFakeQboConnector=false`.

### Tests for User Story 2 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL if OAuth incorrectly routes through QboApi**

- [x] T013 [P] [US2] Add failing integration test `ProductionConfig_QboOAuth_TokenPost_ReachesInnerHandler` in `apps/api.tests/Integration/QboEgressWriteGuardProductionTests.cs` — POST to `IntuitTokenUrl` via `CreateClient("QboOAuth")` reaches stub (contract OAuth exclusion)
- [x] T014 [P] [US2] Add failing integration test `ProductionConfig_QboOAuth_RevokePost_ReachesInnerHandler` in `apps/api.tests/Integration/QboEgressWriteGuardProductionTests.cs` — POST to `IntuitRevokeUrl` via `QboOAuth` reaches stub
- [x] T015 [P] [US2] Add failing integration test `ProductionConfig_QboApi_PostBlocked_WhileQboOAuth_PostPermitted` in `apps/api.tests/Integration/QboEgressWriteGuardProductionTests.cs` — same factory: accounting POST blocked, OAuth POST permitted (FR-009)

### Implementation for User Story 2

- [x] T016 [US2] Confirm no `Program.cs` change required for `QboOAuth` — handler must NOT be attached to `QboOAuth` client; add inline comment in `apps/api/Program.cs` documenting structural OAuth exclusion if missing
- [x] T017 [US2] Run US2 tests until green: `dotnet test apps/api.tests --filter "FullyQualifiedName~QboEgressWriteGuard"`

**Checkpoint**: OAuth connect/refresh/revoke paths unaffected; accounting writes still blocked

---

## Phase 5: User Story 3 — Blocked Write Attempts Are Observable (Priority: P2)

**Goal**: Blocked mutating egress emits sanitized structured logs (verb + host only); permitted GET does not raise violation errors.

**Independent Test**: Unit/integration tests assert log output on block and absence of violation on permitted GET.

### Tests for User Story 3 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL if logging regresses**

- [x] T018 [P] [US3] Add failing unit test `SendAsync_BlockedMutatingRequest_LogsVerbAndHostOnly` in `apps/api.tests/Unit/QboEgressRecordingHandlerTests.cs` — use test logger or `LogCapturingWebApplicationFactory` pattern; assert debug/error log contains method+host, no `Authorization` or token substrings (FR-006)
- [x] T019 [P] [US3] Add failing unit test `SendAsync_PermittedGet_DoesNotThrowZeroWriteInfiltration` in `apps/api.tests/Unit/QboEgressRecordingHandlerTests.cs` — GET to accounting URL completes without `QboSyncException`

### Implementation for User Story 3

- [x] T020 [US3] Verify existing `_logger.LogDebug("QBO egress {Method} {Host}", ...)` in `apps/api/Http/QboEgressRecordingHandler.cs` satisfies FR-006; add warning-level log on block if contract requires elevated severity — no credential/body logging
- [x] T021 [US3] Run US3 tests until green: `dotnet test apps/api.tests --filter "FullyQualifiedName~QboEgressRecordingHandler"`

**Checkpoint**: Blocked attempts observable and sanitized; read path silent on violations

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Preview regression, coverage gate, quickstart validation.

- [x] T022 [P] Run preview unit regression: `dotnet test apps/api.tests --filter "FullyQualifiedName~TestSeedingControllerTests.GetQboEgress"` — confirm preview egress API still works
- [x] T023 [P] Document manual E2E regression step in `specs/048-qbo-egress-write-guard/quickstart.md` if any filter/command changes; run `dotnet test apps/api.tests --filter "FullyQualifiedName~QboEgress"` full suite
- [x] T024 Verify ≥80.0% line/branch coverage on touched backend files (`QboEgressRecordingHandler.cs`, `Program.cs` registration path) via `dotnet test apps/api.tests /p:CollectCoverage=true --filter "FullyQualifiedName~QboEgress"`; missing or unparseable cobertura report FAIL
- [x] T025 Run quickstart.md validation scenarios 1–4 in `specs/048-qbo-egress-write-guard/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS all user stories**
- **User Story 1 (Phase 3)**: Depends on Foundational — **MVP**; delivers core `Program.cs` fix
- **User Story 2 (Phase 4)**: Depends on US1 completion (shared integration test file and factory)
- **User Story 3 (Phase 5)**: Can start after Foundational; unit tests independent of `Program.cs` but polish after US1 recommended
- **Polish (Phase 6)**: Depends on US1–US3 complete

### User Story Dependencies

- **User Story 1 (P1)**: No dependency on US2/US3 — **MVP scope**
- **User Story 2 (P1)**: Depends on US1 `Program.cs` registration; tests same integration file
- **User Story 3 (P2)**: Independent unit-level; can parallelize with US2 after US1

### Within Each User Story

- Tests written and **FAIL** before implementation
- `Program.cs` change only in US1 implementation
- US2/US3 primarily test-only + verification unless logging tweak needed

### Parallel Opportunities

- T002 + T003 (Setup docs review)
- T006 + T007 + T008 (US1 unit + integration skeleton)
- T013 + T014 + T015 (US2 integration tests)
- T018 + T019 (US3 unit tests)
- T022 + T023 (Polish regression)

---

## Parallel Example: User Story 1

```bash
# Launch US1 tests together (different test methods, same files OK sequentially):
dotnet test apps/api.tests --filter "FullyQualifiedName~SendAsync_BlocksPut|SendAsync_BlocksDelete"

# After T011 Program.cs change:
dotnet test apps/api.tests --filter "FullyQualifiedName~QboEgressWriteGuard"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1 (T006–T012)
4. **STOP and VALIDATE**: `dotnet test apps/api.tests --filter "FullyQualifiedName~QboEgressWriteGuard"`
5. Ship MVP — production egress guard active

### Incremental Delivery

1. Setup + Foundational → gap confirmed
2. US1 → production guard registered (MVP)
3. US2 → OAuth separation proven
4. US3 → logging contract verified
5. Polish → coverage + preview regression

### Parallel Team Strategy

1. Developer A: US1 (Program.cs + integration tests)
2. Developer B: US3 unit tests (after Foundational)
3. Developer A → US2 OAuth tests after US1 merges

---

## Notes

- Handler behavior in `QboEgressRecordingHandler.cs` is expected unchanged; this feature is primarily DI wiring (research.md R1)
- `TestSeedingController.GetQboEgress()` remains preview-gated; production does not expose egress inventory
- E2E `zero-write-infiltration.spec.ts` is manual/CI regression unless preview environment available locally
- Total tasks: **25** (Setup 3, Foundational 2, US1 7, US2 5, US3 4, Polish 4)
