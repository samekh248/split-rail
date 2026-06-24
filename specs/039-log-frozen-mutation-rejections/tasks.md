---
description: "Task list for Explicit Audit Logging for Rejected Frozen-Event Mutations (SPLR-36)"
---

# Tasks: Explicit Audit Logging for Rejected Frozen-Event Mutations

**Input**: Design documents from `/specs/039-log-frozen-mutation-rejections/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/frozen-event-mutation-audit-log.md, quickstart.md

**Tests**: REQUIRED per Constitution III. Each user story phase adds xUnit unit tests in `apps/api.tests/Unit/` and integration tests in `apps/api.tests/Integration/` (write failing tests first, then implement until green). Final Polish phase enforces ≥80.0% line/branch coverage on **backend touched files** via `dotnet test --collect:"XPlat Code Coverage"` (coverlet → cobertura). No frontend changes — frontend coverage gate N/A.

**Organization**: Tasks grouped by user story (US1–US3). Backend observability slice through `apps/api/Services/`, `apps/api/Program.cs`, and `apps/api.tests/`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1–US3 (maps to user stories in spec.md)
- All paths are repo-relative

## Path Conventions

- Auditor: `apps/api/Services/FrozenEventMutationAuditor.cs`
- Operation labels: `apps/api/Services/FrozenEventMutationOperation.cs`
- Services: `apps/api/Services/LedgerService.cs`, `apps/api/Services/EventService.cs`
- DI: `apps/api/Program.cs`
- Unit tests: `apps/api.tests/Unit/FrozenEventMutationAuditorTests.cs`
- Integration tests: `apps/api.tests/Integration/FrozenEventMutationAuditTests.cs`
- Log capture helper: `apps/api.tests/TestSupport/TestLogCollector.cs`
- Contract: `specs/039-log-frozen-mutation-rejections/contracts/frozen-event-mutation-audit-log.md`
- Test base: `apps/api.tests/Integration/IntegrationTestBase.cs`
- Existing regression: `apps/api.tests/Integration/SettlementImmutabilityTests.cs`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm branch, prerequisites, and observability contract before implementation.

- [x] T001 Verify branch `039-log-frozen-mutation-rejections` and design docs in `specs/039-log-frozen-mutation-rejections/` per plan.md
- [x] T002 [P] Review observability contract in `specs/039-log-frozen-mutation-rejections/contracts/frozen-event-mutation-audit-log.md` (message template, properties, prohibited content)
- [x] T003 [P] Review mutation path inventory in `specs/039-log-frozen-mutation-rejections/data-model.md` (9 guarded call sites across `LedgerService` and `EventService`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Log capture test infrastructure, operation constants, auditor service, DI registration, and test scaffolds. **Blocks all user stories.**

**⚠️ CRITICAL**: No user story implementation begins until auditor service and test helpers exist.

- [x] T004 Create `TestLogCollector` (`ILoggerProvider` + captured entries API) in `apps/api.tests/TestSupport/TestLogCollector.cs` per research.md §7
- [x] T005 [P] Create stable operation label constants in `apps/api/Services/FrozenEventMutationOperation.cs` per research.md §4 and data-model.md
- [x] T006 Create `FrozenEventMutationAuditor` with `RejectIfFrozen(Event evt, Guid venueId, Guid? userId, string operation)` in `apps/api/Services/FrozenEventMutationAuditor.cs` — emits Warning log per contract, throws `LedgerStateException` with settled/reconciled message; add `RejectIfFrozenWithMessage(...)` or overload for artist/delete/lock-budget distinct messages per data-model.md
- [x] T007 Register `FrozenEventMutationAuditor` as scoped service in `apps/api/Program.cs`
- [x] T008 Create `apps/api.tests/Unit/FrozenEventMutationAuditorTests.cs` with `TestLogCollector` wired to auditor logger factory
- [x] T009 Create `apps/api.tests/Integration/FrozenEventMutationAuditTests.cs` extending `IntegrationTestBase` with helper to register `TestLogCollector` via `WebApplicationFactory.WithWebHostBuilder` → `ConfigureLogging` and helper to settle/reconcile events (pattern from `SettlementImmutabilityTests.cs` and `ReconcileControllerTests.cs`)

**Checkpoint**: Auditor compiles and is DI-resolvable; test files and log collector scaffold ready

---

## Phase 3: User Story 1 — Compliance Audit Trail for Frozen-Event Rejections (Priority: P1) 🎯 MVP

**Goal**: Every rejected mutation on a `SETTLED` or `RECONCILED` event emits a structured Warning audit log with event id, venue id, user id, event status, and operation label; HTTP 400 rejection behavior unchanged; no false positives on `PRE_SHOW` mutations.

**Independent Test**: Settle an event, attempt line-item update → 400 + captured Warning log with all required fields. Reconcile event, attempt mutation → same. Successful `PRE_SHOW` mutation → no frozen audit log.

### Tests for User Story 1 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T010 [P] [US1] Add failing unit test `RejectIfFrozen_SettledEvent_LogsWarningAndThrows` in `apps/api.tests/Unit/FrozenEventMutationAuditorTests.cs`
- [x] T011 [P] [US1] Add failing unit test `RejectIfFrozen_PreShowEvent_NoLogNoThrow` in `apps/api.tests/Unit/FrozenEventMutationAuditorTests.cs`
- [x] T012 [P] [US1] Add failing integration test `SettledEvent_LineItemUpdate_Returns400_AndLogsAudit` in `apps/api.tests/Integration/FrozenEventMutationAuditTests.cs` (quickstart Scenario 1)
- [x] T013 [P] [US1] Add failing integration test `ReconciledEvent_LineItemUpdate_Returns400_AndLogsAudit` in `apps/api.tests/Integration/FrozenEventMutationAuditTests.cs` (quickstart Scenario 2; uses `POST .../reconcile`)
- [x] T014 [P] [US1] Add failing integration test `PreShowEvent_LineItemCreate_Succeeds_NoFrozenAuditLog` in `apps/api.tests/Integration/FrozenEventMutationAuditTests.cs` (quickstart Scenario 5; FR-009)

### Implementation for User Story 1

- [x] T015 [US1] Inject `FrozenEventMutationAuditor` and `ITenantContext` into `LedgerService` constructor in `apps/api/Services/LedgerService.cs`; replace static `AssertNotSettledOrReconciled(Event)` with instance method delegating to auditor with operation label and user id
- [x] T016 [US1] Wire `RejectIfFrozen` calls with operation labels in `CreateLineItemAsync`, `UpdateLineItemAsync`, and `DeleteLineItemAsync` in `apps/api/Services/LedgerService.cs`
- [x] T017 [US1] Replace inline settled/reconciled check in `LockBudgetAsync` with auditor call using `FrozenEventMutationOperation.LockBudget` and lock-budget throw message in `apps/api/Services/LedgerService.cs`
- [x] T018 [US1] Inject `FrozenEventMutationAuditor` into `EventService` in `apps/api/Services/EventService.cs`; replace inline settled/reconciled checks in `UpdateEventAsync` and `DeleteEventAsync` with auditor calls using `UpdateEventMetadata` / `DeleteEvent` labels and existing throw messages
- [x] T019 [US1] Update `LedgerService.AssertNotSettledOrReconciled` static call in `apps/api/Services/TestSeedingService.cs` — inject auditor or route through service instance so compile succeeds after static removal
- [x] T020 [US1] Run US1 tests until green: `cd apps/api.tests && dotnet test --filter "FullyQualifiedName~FrozenEventMutationAuditorTests|FullyQualifiedName~FrozenEventMutationAuditTests"`
- [x] T021 [US1] Verify existing `SettlementImmutabilityTests` still pass unchanged (SC-004): `cd apps/api.tests && dotnet test --filter "FullyQualifiedName~SettlementImmutabilityTests"`

**Checkpoint**: MVP — primary frozen-event rejection paths log structured audit entries; user-facing 400 behavior preserved

---

## Phase 4: User Story 3 — Sanitized Audit Logs Without Sensitive Data (Priority: P1)

**Goal**: Immutability audit entries contain only required identifiers and operation labels; no signature payloads, tokens, secrets, cleartext PII, or financial field values appear in captured logs.

**Independent Test**: Unit and integration tests assert captured log text contains required fields and excludes prohibited substrings from contract.

### Tests for User Story 3 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T022 [P] [US3] Add failing unit test `RejectIfFrozen_LogContainsRequiredFieldsOnly` in `apps/api.tests/Unit/FrozenEventMutationAuditorTests.cs` — assert `Operation`, `EventId`, `VenueId`, `EventStatus` present; no email/name patterns
- [x] T023 [P] [US3] Add failing unit test `RejectIfFrozen_DoesNotLogPayloadValues` in `apps/api.tests/Unit/FrozenEventMutationAuditorTests.cs` — pass dummy signature/financial strings as unrelated context; assert absent from log output
- [x] T024 [P] [US3] Add failing integration test `SettledEvent_MutationWithLargePayload_NoSensitiveDataInLog` in `apps/api.tests/Integration/FrozenEventMutationAuditTests.cs` — attempt line-item update with distinctive settlement value and notes; assert log excludes those values (quickstart Scenario 6)
- [x] T025 [P] [US3] Add failing integration test `SettledEvent_AuditLog_UserIdOnlyNotEmail` in `apps/api.tests/Integration/FrozenEventMutationAuditTests.cs` — assert log contains authenticated user guid, not user email from registration

### Implementation for User Story 3

- [x] T026 [US3] Audit `FrozenEventMutationAuditor` in `apps/api/Services/FrozenEventMutationAuditor.cs` — confirm log template logs only `{Operation}`, `{EventId}`, `{VenueId}`, `{UserId}`, `{EventStatus}` with no exception message payload, request body, or event entity stringification
- [x] T027 [US3] Run US3 tests until green: `cd apps/api.tests && dotnet test --filter "FullyQualifiedName~FrozenEventMutationAuditorTests|FullyQualifiedName~FrozenEventMutationAuditTests"`

**Checkpoint**: Log sanitization verified; Constitution VIII compliance proven by automated capture

---

## Phase 5: User Story 2 — Searchable Multi-Path Audit Entries for Support (Priority: P2)

**Goal**: Each distinct mutation class (event metadata, line items, artists, lock budget) produces an audit entry with a unique operation label; logs emitted at rejection point before generic middleware summary; support can correlate by event id alone.

**Independent Test**: Trigger rejections on event metadata, artist update, and lock-budget paths on SETTLED event; each produces distinct `Operation` value in captured logs queryable by `EventId`.

### Tests for User Story 2 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T028 [P] [US2] Add failing integration test `SettledEvent_UpdateMetadata_Returns400_AndLogsUpdateEventMetadata` in `apps/api.tests/Integration/FrozenEventMutationAuditTests.cs` (quickstart Scenario 3)
- [x] T029 [P] [US2] Add failing integration test `SettledEvent_UpdateArtist_Returns400_AndLogsUpdateArtist` in `apps/api.tests/Integration/FrozenEventMutationAuditTests.cs` (quickstart Scenario 4; preserves existing artist error message)
- [x] T030 [P] [US2] Add failing integration test `SettledEvent_LockBudget_Returns400_AndLogsLockBudget` in `apps/api.tests/Integration/FrozenEventMutationAuditTests.cs`
- [x] T031 [P] [US2] Add failing integration test `SettledEvent_AuditEmittedBeforeMiddlewareGenericLog` in `apps/api.tests/Integration/FrozenEventMutationAuditTests.cs` — assert frozen audit Warning entry exists even when middleware also logs `{ExceptionType}` (FR-003)

### Implementation for User Story 2

- [x] T032 [US2] Extend `AssertArtistEditable` in `apps/api/Services/LedgerService.cs` — when status is `Settled` or `Reconciled`, call auditor with `CreateArtist`/`UpdateArtist`/`DeleteArtist` operation labels (pass operation from each caller) then throw existing artist-specific message unchanged
- [x] T033 [US2] Wire operation labels in `CreateArtistAsync`, `UpdateArtistAsync`, and `DeleteArtistAsync` in `apps/api/Services/LedgerService.cs`
- [x] T034 [US2] Run US2 tests until green: `cd apps/api.tests && dotnet test --filter "FullyQualifiedName~FrozenEventMutationAuditTests"`
- [x] T035 [US2] Mark verification scenarios complete in `specs/039-log-frozen-mutation-rejections/contracts/frozen-event-mutation-audit-log.md` (minimum path coverage table for SETTLED + RECONCILED)

**Checkpoint**: All 9 mutation paths from data-model.md emit distinct searchable audit entries

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Remaining path coverage, full regression, coverage gate, quickstart validation.

- [x] T036 [P] Add integration tests for remaining operation labels if not covered: `create_line_item`, `delete_line_item`, `delete_event`, `create_artist`, `delete_artist` on SETTLED event in `apps/api.tests/Integration/FrozenEventMutationAuditTests.cs`
- [x] T037 [P] Add integration test `ReconciledEvent_UpdateArtist_Returns400_AndLogsAudit` in `apps/api.tests/Integration/FrozenEventMutationAuditTests.cs` (FR-011 RECONCILED artist path)
- [x] T038 Run full API test suite: `cd apps/api.tests && dotnet test`
- [x] T039 Verify ≥80.0% line/branch coverage on touched backend files (`FrozenEventMutationAuditor`, `FrozenEventMutationOperation`, modified guard paths in `LedgerService`/`EventService`): `cd apps/api.tests && dotnet test --collect:"XPlat Code Coverage"` (SC-006)
- [x] T040 Run quickstart validation scenarios in `specs/039-log-frozen-mutation-rejections/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS all user stories**
- **User Story 1 (Phase 3)**: Depends on Foundational — **MVP**; delivers core auditor wiring for line items, event metadata, lock budget
- **User Story 3 (Phase 4)**: Depends on Foundational; best after US1 auditor exists but sanitization tests can be written in parallel with US1 implementation
- **User Story 2 (Phase 5)**: Depends on US1 core wiring (artist paths extend `LedgerService` guards)
- **Polish (Phase 6)**: Depends on Phases 3–5 complete

### User Story Dependencies

- **User Story 1 (P1)**: After Foundational — no dependency on other stories; delivers MVP
- **User Story 3 (P1)**: After Foundational; sanitization validated once auditor emits logs (T010–T014 green)
- **User Story 2 (P2)**: After US1 (T015–T018) — artist path wiring builds on injected auditor pattern

### Within Each User Story

- Tests written and **FAIL** before implementation changes
- Auditor service (Foundational) before service wiring
- `LedgerService`/`EventService` wiring before integration tests green
- Story tests green before next story phase

### Parallel Opportunities

- T002 + T003 (Setup doc review)
- T005 + T004 (operation constants parallel with TestLogCollector — different files)
- T010–T014 (US1 failing tests in parallel)
- T022–T025 (US3 failing tests in parallel)
- T028–T031 (US2 failing tests in parallel)
- T036 + T037 (Polish integration tests in parallel)

---

## Parallel Example: User Story 1

```bash
# Launch all failing tests for User Story 1 together:
Task: "Add failing unit test RejectIfFrozen_SettledEvent_LogsWarningAndThrows in apps/api.tests/Unit/FrozenEventMutationAuditorTests.cs"
Task: "Add failing unit test RejectIfFrozen_PreShowEvent_NoLogNoThrow in apps/api.tests/Unit/FrozenEventMutationAuditorTests.cs"
Task: "Add failing integration test SettledEvent_LineItemUpdate_Returns400_AndLogsAudit in apps/api.tests/Integration/FrozenEventMutationAuditTests.cs"
Task: "Add failing integration test ReconciledEvent_LineItemUpdate_Returns400_AndLogsAudit in apps/api.tests/Integration/FrozenEventMutationAuditTests.cs"
Task: "Add failing integration test PreShowEvent_LineItemCreate_Succeeds_NoFrozenAuditLog in apps/api.tests/Integration/FrozenEventMutationAuditTests.cs"

# After T015–T019 implementation, run:
cd apps/api.tests && dotnet test --filter "FullyQualifiedName~FrozenEventMutationAuditorTests|FullyQualifiedName~FrozenEventMutationAuditTests"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (auditor + test infrastructure)
3. Complete Phase 3: User Story 1 (line-item + event metadata + lock-budget audit logging)
4. **STOP and VALIDATE**: Integration tests green; `SettlementImmutabilityTests` unchanged
5. Demo via test output: settle event → mutate → inspect captured Warning log

### Incremental Delivery

1. Setup + Foundational → auditor and log capture ready
2. User Story 1 → core compliance audit trail (MVP)
3. User Story 3 → sanitization proven (can overlap step 2 test writing)
4. User Story 2 → full multi-path support diagnosability
5. Polish → remaining labels + coverage gate + quickstart

### Parallel Team Strategy

With multiple developers after Foundational:

- Developer A: US1 implementation (T015–T019)
- Developer B: US3 failing tests (T022–T025) while A implements
- Developer C: US2 failing tests (T028–T031) after US1 core wiring lands

---

## Notes

- Backend-only feature; no `apps/web/` changes
- Do **not** modify `ExceptionHandlerMiddleware.cs` — audit entries emit upstream at rejection point
- Sanctioned paths (`ReconcileAsync`, `ReverseAsync`, successful `FinalizeAsync`) must never emit frozen rejection audit entries
- `RejectIfFrozen` must not attach `Exception` object with payload to log call (Constitution VIII)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
