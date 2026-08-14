---

description: "Task list template for feature implementation"
---

# Tasks: Multi-Day Events (Festivals)

**Input**: Design documents from `specs/082-multi-day-events/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/festival-structure-endpoints.md](./contracts/festival-structure-endpoints.md), [contracts/festival-financials-endpoints.md](./contracts/festival-financials-endpoints.md), [contracts/block-settlement-endpoints.md](./contracts/block-settlement-endpoints.md), [contracts/festival-reporting-and-views.md](./contracts/festival-reporting-and-views.md), [quickstart.md](./quickstart.md)

**Tests**: REQUIRED per Constitution III. Backend: xUnit unit tests (`apps/api.tests/Unit/`) and `IntegrationTestBase`/WebApplicationFactory + Testcontainers integration tests (`apps/api.tests/Integration/`). Frontend: Vitest + React Testing Library (`apps/web/tests/`), with drag-and-drop simulated via `fireEvent.dragStart`/`dragOver`/`drop` against component state rather than `event.dataTransfer` (research.md D11, reusing spec-081 D2). Playwright E2E (`tests/e2e/`) is REQUIRED for this feature — the permission tiers and tenant isolation in US5/US6 are exactly Constitution III's multi-user trigger. Every user story phase includes its test tasks first; the Polish phase carries the ≥80.0% coverage gate for both stacks.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, or independent test cases in different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US8)
- Include exact file paths in descriptions

## Path Conventions

Backend paths are relative to `apps/api/` and `apps/api.tests/`; frontend paths are relative to `apps/web/`; Playwright specs live in `tests/e2e/`. No new projects or packages are introduced (research.md D11 — native HTML5 drag-and-drop, no new npm dependency).

**Money rule for every task below**: all monetary computation happens in C# `decimal` through `DealMathEngine` with `MidpointRounding.AwayFromZero`; the frontend renders server-computed money strings and never calculates (Constitution I, spec 012).

---

## Phase 1: Setup

**Purpose**: Confirm environments; no new dependencies are introduced by this feature.

- [X] T001 Confirm branch `082-multi-day-events` is checked out and `cd apps/web && npm install`, `cd apps/api && dotnet restore` are up to date
- [X] T002 [P] Confirm Docker is running for Testcontainers-backed integration tests (`apps/api.tests/Integration/IntegrationTestBase.cs` pattern)
- [X] T003 [P] Create the DTO folder `apps/api/DTOs/Festivals/` and the frontend component folder `apps/web/src/components/festival/` as empty placeholders for the vertical slices

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The complete festival schema, enums, permission flags, and shared guards. Per data-model.md this ships as **one additive migration** so later stories implement services/UI against existing tables rather than accumulating eight migrations.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Enums

- [X] T004 [P] Create `EventType` enum (`Standard | Festival`) in `apps/api/Models/Enums/EventType.cs`
- [X] T005 [P] Create `BlockCategory` enum (`Music | Exhibition | Vendor | Experience`) in `apps/api/Models/Enums/BlockCategory.cs`
- [X] T006 [P] Create `BlockScheduleStatus` enum (`Scheduled | Delayed | PartiallyCompleted | Canceled`) in `apps/api/Models/Enums/BlockScheduleStatus.cs`
- [X] T007 [P] Create `BlockSettlementStatus` enum (`NotRequired | Draft | Finalized`) in `apps/api/Models/Enums/BlockSettlementStatus.cs`
- [X] T008 [P] Create `AllocationMethod` (`Equal | Percentage | FixedAmount | ManualLine`), `RevenueAllocationType` (`FixedAmount | PercentOfBucket`), `AllocationTargetType` (`Overhead | Day | Stage | Block`), and `PercentBasis` (`Gross | Net`) enums in `apps/api/Models/Enums/AllocationEnums.cs`
- [X] T009 [P] Create `QboReviewState` enum (`None | Untagged | MismatchedTag | ChangedAfterImport | StaleMapping | ReclassificationRequired`) in `apps/api/Models/Enums/QboReviewState.cs`
- [X] T010 [P] Create `BlockSettlementLineType` enum (`Deduction | Adjustment | RoundingAdjustment`) in `apps/api/Models/Enums/BlockSettlementLineType.cs`

### Entity models (data-model.md)

- [X] T011 [P] Add `EventType` (default `Standard`) and `EndDate` (`DateOnly?`) to `apps/api/Models/Event.cs`, plus navigation collections for stages, blocks, artists, buckets, expense allocations, and audit entries
- [X] T012 [P] Add the six festival permission flags (`ManageFestivalSchedule`, `ManageAllocations`, `AdjustSettlements`, `FinalizeSettlements`, `OverrideSettlements`, `PublishPublicItinerary`) to `apps/api/Models/OrganizationRole.cs`
- [X] T013 [P] Add `ReviewState` (`QboReviewState`, default `None`) to `apps/api/Models/UnmappedQboTransaction.cs`
- [X] T014 [P] Create `StageZone` model in `apps/api/Models/StageZone.cs` (Id, EventId, Name, SortOrder, Xmin)
- [X] T015 [P] Create `ProgrammingBlock` model in `apps/api/Models/ProgrammingBlock.cs` with scheduling fields, category, schedule status, publish flag, description, music-preset times, deal-term fields, and settlement-state fields per data-model.md
- [X] T016 [P] Create `FestivalArtist` model in `apps/api/Models/FestivalArtist.cs` (Id, EventId, Name)
- [X] T017 [P] Create `RevenueBucket` model in `apps/api/Models/RevenueBucket.cs` (Id, EventId, Name, IsAllocable default false, Amount, LinkedLineItemId?, LockedAt?, LockedByUserId?, Xmin)
- [X] T018 [P] Create `RevenueAllocation` model in `apps/api/Models/RevenueAllocation.cs` (Id, RevenueBucketId, ProgrammingBlockId, AllocationType, Percentage?/Amount?, CalculatedAmount, CreatedByUserId, CreatedAt, Xmin)
- [X] T019 [P] Create `ExpenseAllocation` model in `apps/api/Models/ExpenseAllocation.cs` (Id, EventId, SourceLineItemId?/SourceQboTransactionId?, TargetType, target fields, Method, Percentage?/Amount, CalculatedAmount, CountsTowardSettlement, CreatedByUserId, CreatedAt, Xmin)
- [X] T020 [P] Create `BlockSettlementLineItem` model in `apps/api/Models/BlockSettlementLineItem.cs` (Id, ProgrammingBlockId, LineType, Label, Amount, EnteredByUserId, EnteredAt, Xmin)
- [X] T021 [P] Create `BlockSettlementRevision` model in `apps/api/Models/BlockSettlementRevision.cs` (Id, ProgrammingBlockId, RevisionNumber, SnapshotJson, ReasonCode, Note, Reopened/Finalized actor+timestamp, PdfUrl, DispatchOutcome)
- [X] T022 [P] Create `StageZoneAssignment` model in `apps/api/Models/StageZoneAssignment.cs` (Id, StageZoneId, UserId)
- [X] T023 [P] Create `FestivalAuditEntry` model in `apps/api/Models/FestivalAuditEntry.cs` (Id, EventId, EntityType, EntityId, Action, PriorValueJson?, NewValueJson?, UserId, OccurredAt, Reason?)

### Persistence

- [X] T024 Register all new entities and configure relationships, `decimal` precision, `xmin` concurrency tokens, and the unique/composite indexes from data-model.md — (EventId, StageZoneId, DayDate), (EventId, DayDate), (FestivalArtistId), unique (EventId, Name) on stages/artists/buckets — in `apps/api/Data/ApplicationDbContext.cs` (depends on T011–T023)
- [X] T025 Generate the single additive EF migration covering the 10 new tables, 2 `events` columns, 6 `organization_roles` flags, and 1 `unmapped_qbo_transactions` column via `dotnet ef migrations add AddFestivalModule` in `apps/api/` (depends on T024)
- [X] T026 Add a migration-applies-cleanly test asserting default values preserve existing behavior (`EventType=Standard`, `ReviewState=None`, all permission flags false) in `apps/api.tests/Integration/FestivalMigrationTests.cs` (depends on T025)

### Shared guards & scoping

- [X] T027 Create `FestivalAccessGuard` in `apps/api/Services/FestivalAccessGuard.cs` — resolves a wrapper event by (venueId, eventId) scoped to the tenant's `organization_id` and venue scope, asserts `EventType.Festival`, and exposes permission-flag and `StageZoneAssignment` scope checks reused by every festival service (Constitution II)
- [X] T028 [P] Create typed exceptions `BlockConflictException` and `AllocationConflictException` in `apps/api/Exceptions/` and map them to 409 in the existing exception-handling middleware (Constitution VIII)
- [X] T029 [P] Create `FestivalAuditService` in `apps/api/Services/FestivalAuditService.cs` — single write path for `FestivalAuditEntry` rows with sanitized before/after payloads (Constitution VIII)
- [X] T030 Add unit tests for `FestivalAccessGuard` (cross-org denial, non-festival rejection, stage-scope checks) in `apps/api.tests/Unit/FestivalAccessGuardTests.cs` (depends on T027)

### Contract plumbing

- [X] T031 Create shared festival DTO primitives (day/stage/block summary records, error payloads `BlockConflictResponse`, `AllocationConflictResponse`) in `apps/api/DTOs/Festivals/FestivalCommonDtos.cs`
- [X] T032 Build the API and regenerate the frontend contract via `dotnet build` then `npm run gen:api`, refreshing `apps/web/src/types/generated-api.ts` (never hand-edited — Constitution VI) (depends on T031)

**Checkpoint**: Schema, guards, and contracts exist — user story implementation can now begin.

---

## Phase 3: User Story 1 - Set up a festival structure from the standard event workflow (Priority: P1) 🎯 MVP

**Goal**: A manager can mark or create an event as a festival with name + date range (≤3 days), getting derived Days and an auto-created default Stage/Zone, while standard events remain completely untouched.

**Independent Test**: Create a festival with a 3-day range; confirm a Day exists per date and a default stage is auto-created. Create a standard event alongside and confirm zero festival concepts appear (quickstart.md "US1").

### Tests for User Story 1 (REQUIRED) ⚠️

> Write these tests FIRST, ensure they FAIL before implementation

- [X] T033 [P] [US1] Add failing integration tests for festival creation (required fields, derived days, auto-created "Main Stage", master QBO tag generated into `QboTagName`) in `apps/api.tests/Integration/FestivalStructureTests.cs` (spec FR-002, FR-003, FR-004)
- [X] T034 [P] [US1] Add failing integration tests for the 3-day cap and date validation (`endDate < startDate`, range > 3 days both rejected) in `apps/api.tests/Integration/FestivalStructureTests.cs` (spec FR-002)
- [X] T035 [P] [US1] Add failing integration tests for standard→festival conversion preserving title/date/venue/ledger, and rejection when the source event is settled/reconciled, in `apps/api.tests/Integration/FestivalConversionTests.cs` (spec FR-001, Constitution V)
- [X] T036 [P] [US1] Add failing integration tests for date-range shrink returning 409 with affected block ids, and for revert-to-standard being allowed only when no stages/blocks/financial rows exist, in `apps/api.tests/Integration/FestivalConversionTests.cs` (spec edge cases)
- [X] T037 [P] [US1] Add failing integration tests for stage CRUD — duplicate name 409, last-stage deletion blocked, stage-with-blocks deletion blocked — plus cross-org 404 for every structure endpoint, in `apps/api.tests/Integration/FestivalStagesTests.cs` (spec FR-004, Constitution II)
- [X] T038 [P] [US1] Add failing Vitest tests for the festival-mode entry point on `EventWorkspacePage` (convert affordance visible for standard pre-settlement events, hidden otherwise; festival events link to itinerary/ledger/reports) in `apps/web/tests/pages/EventWorkspacePage.test.tsx` (spec FR-001)
- [X] T039 [P] [US1] Add failing Vitest tests for the festival creation/convert form (name + start + end required, >3-day range shows a clear message) in `apps/web/tests/components/festival/FestivalSetupModal.test.tsx`

### Implementation for User Story 1

- [X] T040 [P] [US1] Create festival structure DTOs (`CreateFestivalRequest`, `UpdateFestivalRequest`, `FestivalResponse`, `StageZoneResponse`, `FestivalDateConflictResponse`) in `apps/api/DTOs/Festivals/FestivalStructureDtos.cs` per contracts/festival-structure-endpoints.md
- [X] T041 [US1] Implement `FestivalService` in `apps/api/Services/FestivalService.cs` — create/convert (auto default stage, master tag generation, 3-day cap), get, update with orphan-block detection, revert-to-standard guards, and derived-day projection; all reads `.AsNoTracking()` with explicit `.Include`/`.ThenInclude` (Constitution VII) (depends on T027, T040)
- [X] T042 [US1] Implement stage CRUD in `apps/api/Services/StageZoneService.cs` — create/rename/reorder/delete with unique-name, last-stage, and blocks-present guards (depends on T027)
- [X] T043 [US1] Implement `FestivalsController` structure and stage routes in `apps/api/Controllers/FestivalsController.cs` per contracts/festival-structure-endpoints.md, gated on `ManageFestivalSchedule` (depends on T041, T042)
- [X] T044 [US1] Regenerate the frontend contract (`dotnet build` + `npm run gen:api`) so `apps/web/src/types/generated-api.ts` carries the structure DTOs (depends on T043)
- [X] T045 [P] [US1] Create `apps/web/src/api/festivals.ts` with react-query hooks `useFestival`, `useCreateFestival`, `useConvertEventToFestival`, `useUpdateFestival`, `useStages`, and stage mutations, importing types only from `generated-api.ts` (depends on T044)
- [X] T046 [P] [US1] Create `apps/web/src/components/festival/FestivalSetupModal.tsx` — festival create/convert form (name, start, end) with 3-day-cap and range validation messaging (depends on T045)
- [X] T047 [P] [US1] Create `apps/web/src/components/festival/StageManagerPanel.tsx` — stage list with add/rename/reorder/delete and blocking-reason messaging (depends on T045)
- [X] T048 [US1] Wire the festival-mode entry point into `apps/web/src/pages/EventWorkspacePage.tsx` — convert affordance for standard pre-settlement events, festival links otherwise; standard-event flows render zero festival concepts (spec SC-007) (depends on T046)
- [X] T049 [P] [US1] Add festival structure styles (setup modal, stage panel) to `apps/web/src/index.css`

**Checkpoint**: Festivals can be created/converted with days and stages; standard events verified unchanged.

---

## Phase 4: User Story 2 - Populate the itinerary with categorized programming blocks (Priority: P1)

**Goal**: Schedulers can add Programming Blocks of all four categories to specific Days and Stages, with lean creation-time validation, category-driven field presets, and one artist identity spanning multiple appearances.

**Independent Test**: Create one block per category; confirm required-field enforcement, category presets, lightweight non-music workflows, and linked artist appearances (quickstart.md "US2").

### Tests for User Story 2 (REQUIRED) ⚠️

- [X] T050 [P] [US2] Add failing integration tests for block creation requiring exactly title/day/stage/times/category/settlement-flag, and accepting omitted optional fields, in `apps/api.tests/Integration/ProgrammingBlockTests.cs` (spec FR-005)
- [X] T051 [P] [US2] Add failing integration tests for block validation — `dayDate` outside the festival range, `startTime >= endTime`, stage from another festival — in `apps/api.tests/Integration/ProgrammingBlockTests.cs`
- [X] T052 [P] [US2] Add failing integration tests for `FestivalArtist` creation, uniqueness per festival, multi-appearance linking, and `copy-deal-terms` across draft blocks (409 for finalized targets) in `apps/api.tests/Integration/FestivalArtistTests.cs` (spec FR-008)
- [X] T053 [P] [US2] Add failing integration tests asserting cross-org 404 on all block/artist endpoints in `apps/api.tests/Integration/ProgrammingBlockTests.cs` (Constitution II)
- [X] T054 [P] [US2] Add failing Vitest tests for `BlockEditorDrawer` category presets — Music shows load-in/soundcheck/deal fields; Exhibition/Vendor/Experience show description-first lightweight fields with deal math hidden until settlement is explicitly enabled — in `apps/web/tests/components/festival/BlockEditorDrawer.test.tsx` (spec FR-006, FR-007)
- [X] T055 [P] [US2] Add failing Vitest tests for creation-time validation messaging and the artist picker (existing artist vs. new name) in `apps/web/tests/components/festival/BlockEditorDrawer.test.tsx`

### Implementation for User Story 2

- [X] T056 [P] [US2] Create block and artist DTOs (`CreateProgrammingBlockRequest`, `ProgrammingBlockResponse` with `warnings[]`, `FestivalArtistResponse`, `CopyDealTermsRequest`) in `apps/api/DTOs/Festivals/ProgrammingBlockDtos.cs`
- [X] T057 [US2] Implement `ProgrammingBlockService` create/update/delete in `apps/api/Services/ProgrammingBlockService.cs` — two-level validation (creation fields now, payout fields deferred to settlement), day-range and same-festival stage/artist validation, delete allowed only before settlement work (depends on T027, T056)
- [X] T058 [US2] Implement `FestivalArtistService` in `apps/api/Services/FestivalArtistService.cs` — create/list with per-festival uniqueness, appearance linking, and deal-term copying across an artist's draft blocks (depends on T027)
- [X] T059 [US2] Add block and artist routes to `apps/api/Controllers/FestivalsController.cs` per contracts/festival-structure-endpoints.md, gated on `ManageFestivalSchedule` or stage-scoped `FinalizeSettlements` (depends on T057, T058)
- [X] T060 [US2] Regenerate the frontend contract (`dotnet build` + `npm run gen:api`) so `apps/web/src/types/generated-api.ts` carries the block/artist DTOs (depends on T059)
- [X] T061 [US2] Extend `apps/web/src/api/festivals.ts` with `useBlocks`, `useCreateBlock`, `useUpdateBlock`, `useDeleteBlock`, `useFestivalArtists`, and `useCopyDealTerms` hooks (depends on T060)
- [X] T062 [US2] Create `apps/web/src/components/festival/BlockEditorDrawer.tsx` — category-preset fields, description-first layout for non-music categories, artist picker, and two-level validation (depends on T061)
- [X] T063 [P] [US2] Create `apps/web/src/components/festival/ArtistAppearancesPanel.tsx` — linked appearances for one artist with copy-deal-terms action (depends on T061)
- [X] T064 [P] [US2] Add block editor and category-badge styles to `apps/web/src/index.css` using per-icon Font Awesome Free imports (Constitution IX)

**Checkpoint**: A complete festival program of record exists — **MVP scope reached (US1 + US2)**.

---

## Phase 5: User Story 3 - Manage the schedule on a multi-track timeline (Priority: P2)

**Goal**: A drag-and-drop time × stage timeline with save-blocking same-stage conflict validation, non-blocking artist overlap warnings, status transitions, and full schedule/status audit history.

**Independent Test**: Overlap blocks on the same stage (blocked, conflict named, resolution offered) and across stages (allowed); verify canceled/moved blocks free their slots and history records every change (quickstart.md "US3").

### Tests for User Story 3 (REQUIRED) ⚠️

- [X] T065 [P] [US3] Add failing integration tests for same-stage overlap rejection with `BlockConflictResponse` identifying the conflicting block, and cross-stage overlap acceptance, in `apps/api.tests/Integration/BlockConflictTests.cs` (spec FR-010)
- [X] T066 [P] [US3] Add failing integration tests asserting canceled blocks are excluded from conflict validation and moved blocks free their previous (day, stage) slot in `apps/api.tests/Integration/BlockConflictTests.cs` (spec FR-010)
- [X] T067 [P] [US3] Add failing integration tests for same-artist overlap returning a non-blocking `warnings[]` entry rather than a 409 in `apps/api.tests/Integration/BlockConflictTests.cs` (spec FR-011)
- [X] T068 [P] [US3] Add failing integration tests for every `ScheduleStatus` transition writing a `FestivalAuditEntry` with prior/new status, user, timestamp, and reason in `apps/api.tests/Integration/BlockStatusAuditTests.cs` (spec FR-013)
- [X] T069 [P] [US3] Add failing integration tests asserting reschedules record prior/new times and placement, and that changes after settlement work started set `requiresSettlementReview`, in `apps/api.tests/Integration/BlockStatusAuditTests.cs` (spec FR-012, FR-014)
- [X] T070 [P] [US3] Add failing integration tests for the itinerary endpoint's day/stage/category/status filters in `apps/api.tests/Integration/FestivalItineraryTests.cs` (spec FR-015)
- [X] T071 [P] [US3] Add failing Vitest tests for `TimelineGrid` rendering time columns × stage rows with blocks positioned by day/stage/time, plus the day switcher, in `apps/web/tests/components/festival/TimelineGrid.test.tsx` (spec FR-009)
- [X] T072 [P] [US3] Add failing Vitest tests for drag-and-drop reassignment using `fireEvent.dragStart`/`dragOver`/`drop` with the drag payload held in component state (no `DataTransfer` mocking, research.md D11), asserting the block-update call fires with the target day/stage/time, in `apps/web/tests/components/festival/TimelineGrid.test.tsx`
- [X] T073 [P] [US3] Add failing Vitest tests asserting a 409 conflict leaves the block visually in place (no optimistic move) and opens `ConflictDialog` naming the conflicting block with resolution actions, in `apps/web/tests/components/festival/ConflictDialog.test.tsx` (spec FR-010)
- [X] T074 [P] [US3] Add failing Vitest tests for `ScheduleHistoryPanel` rendering reschedule and status-change entries in `apps/web/tests/components/festival/ScheduleHistoryPanel.test.tsx`

### Implementation for User Story 3

- [X] T075 [US3] Implement same-stage conflict validation in `apps/api/Services/ProgrammingBlockService.cs` — single indexed overlap query over active statuses (`StartTime < other.EndTime AND EndTime > other.StartTime`) throwing `BlockConflictException` with the conflicting block identity (research.md D12) (depends on T057)
- [X] T076 [US3] Add same-artist overlap detection producing non-blocking `warnings[]` on successful saves in `apps/api/Services/ProgrammingBlockService.cs` (depends on T075)
- [X] T077 [US3] Implement the `ScheduleStatus` state machine and status endpoint logic in `apps/api/Services/ProgrammingBlockService.cs`, writing audit entries via `FestivalAuditService` and surfacing `requiresSettlementReview` when settlement work has started (depends on T029, T057)
- [X] T078 [US3] Implement reschedule/move history capture (prior and new day, stage, times, user, timestamp, reason) in `apps/api/Services/ProgrammingBlockService.cs` (depends on T029, T077)
- [X] T079 [US3] Implement the itinerary projection endpoint (`{ days[], stages[], blocks[] }` with day/stage/category/status filters) in `apps/api/Services/FestivalService.cs` and route it in `apps/api/Controllers/FestivalsController.cs` (depends on T041)
- [X] T080 [US3] Add block history and status routes to `apps/api/Controllers/FestivalsController.cs`, then regenerate the contract (`dotnet build` + `npm run gen:api`) (depends on T077, T078)
- [X] T081 [US3] Extend `apps/web/src/api/festivals.ts` with `useItinerary`, `useBlockHistory`, and `useSetBlockStatus` hooks (depends on T080)
- [X] T082 [US3] Create `apps/web/src/components/festival/TimelineGrid.tsx` — CSS-grid time × stage timeline with a day switcher and absolutely positioned block spans (depends on T081)
- [X] T083 [US3] Add native HTML5 drag-and-drop to `apps/web/src/components/festival/TimelineGrid.tsx` — drag payload in React state, drag-over slot validity painting, client-side overlap warning affordance, and confirm-then-refetch drop (no optimistic move) (depends on T082)
- [X] T084 [P] [US3] Create `apps/web/src/components/festival/ConflictDialog.tsx` — names the conflicting block and offers reschedule / edit existing / cancel-or-move resolutions (depends on T081)
- [X] T085 [P] [US3] Create `apps/web/src/components/festival/ScheduleHistoryPanel.tsx` rendering reschedule and status-change audit entries (depends on T081)
- [X] T086 [P] [US3] Create `apps/web/src/components/festival/ItineraryFilters.tsx` — day/stage/category/status filters applied client-side to the fetched day payload (depends on T081)
- [X] T087 [US3] Create `apps/web/src/pages/FestivalItineraryPage.tsx` composing the timeline, filters, block editor drawer, conflict dialog, and history panel; register its route in `apps/web/src/App.tsx` (depends on T082, T084, T086)
- [X] T088 [P] [US3] Add timeline grid, block card, drag-state, and conflict styles to `apps/web/src/index.css`; ensure status/category distinctions never rely on color alone
- [X] T089 [P] [US3] Add keyboard-parity coverage asserting day/stage/time reassignment is fully achievable through `BlockEditorDrawer` fields without dragging, in `apps/web/tests/components/festival/BlockEditorDrawer.test.tsx`

**Checkpoint**: Dense multi-stage scheduling is safe, auditable, and resolvable.

---

## Phase 6: User Story 4 - Operate the master festival ledger with controlled revenue allocation (Priority: P2)

**Goal**: Festival-wide revenue and expenses aggregate in the Master Festival Ledger, with opt-in allocable buckets, live balances, rule-based shared-expense splits, and deterministic rounding.

**Independent Test**: Flag a bucket allocable, allocate to two blocks, verify live balances; over-allocate and confirm a draft warning plus a hard finalize block; verify penny variance lands deterministically (quickstart.md "US4").

### Tests for User Story 4 (REQUIRED) ⚠️

- [X] T090 [P] [US4] Add failing unit tests for `DealMathEngine` extensions — cap, floor, bonus-threshold ordering and `PercentBasis` gross vs. net — in `apps/api.tests/Unit/DealMathEngineFestivalTests.cs` (spec FR-021, Constitution I)
- [X] T091 [P] [US4] Add failing unit tests for the penny-remainder rule asserting multi-participant percentage allocations sum to exactly the bucket amount with the remainder on the largest share (or an explicit rounding line), in `apps/api.tests/Unit/DealMathEngineFestivalTests.cs` (spec FR-022, research.md D7)
- [X] T092 [P] [US4] Add failing integration tests asserting `IsAllocable` defaults to false and non-allocable buckets reject allocations, in `apps/api.tests/Integration/RevenueBucketTests.cs` (spec FR-018)
- [X] T093 [P] [US4] Add failing integration tests for live bucket balances (`totalAllocated`, `remaining` as SUM projections), draft over-allocation warnings, and 409 beyond 100% without `OverrideSettlements`, in `apps/api.tests/Integration/RevenueAllocationTests.cs` (spec FR-020)
- [X] T094 [P] [US4] Add failing integration tests for bucket locking on referencing-settlement finalization and rejection of locked-bucket edits without override, in `apps/api.tests/Integration/RevenueBucketTests.cs` (spec FR-020, FR-024)
- [X] T095 [P] [US4] Add failing integration tests for shared-expense splits — all four methods, reconciliation to the full amount, visible overhead remainder, and traceability to source and method — in `apps/api.tests/Integration/ExpenseAllocationTests.cs` (spec FR-023)
- [X] T096 [P] [US4] Add failing integration tests asserting allocation edits write before/after audit entries and that edits against finalized settlements return 409, in `apps/api.tests/Integration/RevenueAllocationTests.cs` (spec FR-024, FR-025)
- [X] T097 [P] [US4] Add failing Vitest tests for `BucketTable` live balances, allocable toggle, and lock-state rendering in `apps/web/tests/components/festival/BucketTable.test.tsx`
- [X] T098 [P] [US4] Add failing Vitest tests for `AllocationEditor` (named source bucket per line, warning vs. error states, rounding-adjustment display) in `apps/web/tests/components/festival/AllocationEditor.test.tsx`
- [X] T099 [P] [US4] Add failing Vitest tests for `SplitEditor` (method picker, multi-target expansion preview, must-reconcile indicator, always-visible overhead remainder) in `apps/web/tests/components/festival/SplitEditor.test.tsx`

### Implementation for User Story 4

- [X] T100 [US4] Extend `apps/api/Services/DealMathEngine.cs` with `CalculateBlockPayout` (allocation basis → guarantee-vs-split → bonus → cap → floor → tax) and `AllocatePercentage` implementing the deterministic penny-remainder rule, all in `decimal` via `RoundMoney` (depends on T090, T091)
- [X] T101 [P] [US4] Create financial DTOs (`RevenueBucketResponse`, `RevenueAllocationResponse`, `ExpenseAllocationRequest/Response`, `AllocationConflictResponse`, `BucketLockedResponse`) in `apps/api/DTOs/Festivals/FestivalFinancialDtos.cs`
- [X] T102 [US4] Implement bucket management in `apps/api/Services/FestivalAllocationService.cs` — CRUD, computed SUM balances (`.AsNoTracking()`), lock semantics, and amount-below-allocated rejection (depends on T027, T101)
- [X] T103 [US4] Implement revenue allocation writes in `apps/api/Services/FestivalAllocationService.cs` — allocable-bucket validation, draft warnings, hard 409 beyond 100% without override, rounding-adjustment emission, and audit entries (depends on T100, T102)
- [X] T104 [US4] Implement shared-expense splits in `apps/api/Services/FestivalAllocationService.cs` — all four methods with multi-target expansion, source-total reconciliation, implicit overhead remainder, and full traceability (depends on T102)
- [X] T105 [US4] Implement `FestivalFinancialsController` bucket, allocation, and expense-split routes in `apps/api/Controllers/FestivalFinancialsController.cs` gated on `ManageAllocations`, writing `MasterLedgerAccess` audit entries on financial reads (depends on T102, T103, T104)
- [X] T106 [US4] Regenerate the frontend contract (`dotnet build` + `npm run gen:api`) so `apps/web/src/types/generated-api.ts` carries the financial DTOs (depends on T105)
- [X] T107 [P] [US4] Create `apps/web/src/api/festivalFinancials.ts` with bucket, allocation, and split hooks (depends on T106)
- [X] T108 [P] [US4] Create `apps/web/src/components/festival/BucketTable.tsx` with live balances, allocable flag, and lock indicators (depends on T107)
- [X] T109 [P] [US4] Create `apps/web/src/components/festival/AllocationEditor.tsx` — per-block allocation lines with named source buckets and warning/error states (depends on T107)
- [X] T110 [P] [US4] Create `apps/web/src/components/festival/SplitEditor.tsx` — split method picker, target expansion preview, reconciliation indicator, overhead remainder (depends on T107)
- [X] T111 [US4] Create `apps/web/src/pages/FestivalLedgerPage.tsx` composing the master ledger view, bucket table, allocation editor, and split editor; register its route in `apps/web/src/App.tsx` (depends on T108, T109, T110)
- [X] T112 [P] [US4] Add ledger, bucket, and allocation styles to `apps/web/src/index.css`

**Checkpoint**: Festival economics are controlled, traceable, and over-allocation-safe.

---

## Phase 7: User Story 5 - Execute isolated sub-settlements with deliberate finalization (Priority: P3)

**Goal**: Tablet-first isolated settlement sheets with categorized preflight blockers, all-or-nothing finalization, controlled reopen with revisions, and permission-scoped authority.

**Independent Test**: Finalize a complete settlement on a tablet viewport (PDF, dispatch, master-ledger rollup); attempt with missing mappings (categorized blockers); inject a failure mid-finalize and confirm full rollback to Draft (quickstart.md "US5").

### Tests for User Story 5 (REQUIRED) ⚠️

- [X] T113 [P] [US5] Add failing integration tests asserting the settlement sheet payload contains only the requested block's deal — no master-ledger totals, bucket totals, or other blocks' terms — in `apps/api.tests/Integration/BlockSettlementIsolationTests.cs` (spec FR-026, SC-008)
- [X] T114 [P] [US5] Add failing integration tests asserting viewing, saving, and previewing never finalize, and finalize requires explicit confirmation, in `apps/api.tests/Integration/BlockSettlementFinalizeTests.cs` (spec FR-027)
- [X] T115 [P] [US5] Add failing integration tests for preflight blocker categories (missing revenue mapping, missing expense mapping, allocation conflicts, missing payout-critical fields, unresolved schedule change) with draft saving still permitted, in `apps/api.tests/Integration/BlockSettlementPreflightTests.cs` (spec FR-028)
- [X] T116 [P] [US5] Add failing integration tests for successful finalization recording actor, timestamp, snapshot, PDF, and dispatch outcome, and rolling the expense up to the master ledger, in `apps/api.tests/Integration/BlockSettlementFinalizeTests.cs` (spec FR-031)
- [X] T117 [P] [US5] Add failing integration tests injecting PDF-render and archive-store failures, asserting full rollback to Draft with the failed step named, a `FinalizeFailed` audit entry, and a successful retry, in `apps/api.tests/Integration/BlockSettlementFinalizeTests.cs` (spec FR-029)
- [X] T118 [P] [US5] Add failing integration tests for the in-transaction over-allocation re-check blocking concurrent finalizations against the same bucket, in `apps/api.tests/Integration/BlockSettlementConcurrencyTests.cs` (research.md D6/D8)
- [X] T119 [P] [US5] Add failing integration tests for reopen — `OverrideSettlements` required, reason code + note required, dispatched-revision acknowledgement, revision created without overwriting history — in `apps/api.tests/Integration/BlockSettlementReopenTests.cs` (spec FR-033)
- [X] T120 [P] [US5] Add failing integration tests asserting the extended frozen-mutation interceptor rejects edits to finalized settlement fields and line items outside an authorized reopen context, in `apps/api.tests/Integration/FestivalImmutabilityTests.cs` (Constitution V)
- [X] T121 [P] [US5] Add failing integration tests for finalize authority — stage managers scoped to assigned stages, managers/finance broader, general staff and schedule-only editors denied — in `apps/api.tests/Integration/BlockSettlementPermissionTests.cs` (spec FR-032, FR-035, FR-036)
- [X] T122 [P] [US5] Add failing integration tests for the artist settlement rollup showing per-appearance independence in `apps/api.tests/Integration/BlockSettlementRollupTests.cs` (spec FR-034)
- [X] T123 [P] [US5] Add failing Vitest tests for `FinalizePreflightPanel` grouped blockers with working deep links in `apps/web/tests/components/festival/FinalizePreflightPanel.test.tsx`
- [X] T124 [P] [US5] Add failing Vitest tests asserting the Finalize action is disabled when offline (`navigator.onLine` false) with a connectivity message, in `apps/web/tests/pages/BlockSettlementPage.test.tsx` (spec FR-030)
- [X] T125 [P] [US5] Add failing Vitest tests asserting finalization resolves to exactly two terminal states (finalized view with PDF link, or failure banner naming the step with the settlement still Draft) in `apps/web/tests/pages/BlockSettlementPage.test.tsx` (spec FR-029)
- [X] T126 [P] [US5] Add failing Vitest tests for `ReopenDialog` requiring reason code + note and a dispatched-revision acknowledgement in `apps/web/tests/components/festival/ReopenDialog.test.tsx`
- [X] T127 [P] [US5] Add a failing Playwright spec for permission tiers — stage manager finalizes only assigned stages and cannot reach the Master Festival Ledger, finance has full visibility, itinerary-only user sees no financial surfaces — in `tests/e2e/festival-permissions.spec.ts` (Constitution III)
- [X] T128 [P] [US5] Add a failing Playwright spec asserting a second organization cannot reach any festival endpoint or screen of the first, in `tests/e2e/festival-tenant-isolation.spec.ts` (Constitution II/III)

### Implementation for User Story 5

- [X] T129 [P] [US5] Create settlement DTOs (`BlockSettlementSheetResponse`, `FinalizePreflightResponse`, `FinalizeBlockSettlementRequest`, `BlockSettlementResultDto`, `ReopenRequest`) in `apps/api/DTOs/Festivals/BlockSettlementDtos.cs`
- [X] T130 [US5] Implement the settlement sheet projection in `apps/api/Services/BlockSettlementService.cs` — block deal terms, named-source allocation lines, line items, and server-computed totals with strict isolation from festival-wide figures (depends on T027, T100, T129)
- [X] T131 [US5] Implement deal-term and line-item editing in `apps/api/Services/BlockSettlementService.cs` with draft-only guards and `AdjustSettlements` rules (stage managers limited to predefined deduction types) (depends on T130)
- [X] T132 [US5] Implement the preflight evaluator in `apps/api/Services/BlockSettlementService.cs` returning categorized blockers with link targets, as a pure read that never mutates (depends on T130)
- [X] T133 [US5] Implement two-phase atomic finalization in `apps/api/Services/BlockSettlementService.cs` mirroring `SettlementService.FinalizeAsync` — Phase A (preflight, snapshot, PDF render, archive stage), Phase B (locked transaction: status re-check, in-SQL over-allocation re-check, finalized write, revision, audit), Phase C (PDF promote, dispatch record) with full rollback on any failure (depends on T132)
- [X] T134 [US5] Implement reopen and adjustment flows in `apps/api/Services/BlockSettlementService.cs` — `OverrideSettlements` gate, reason code + note, dispatched acknowledgement, revision creation preserving history (depends on T133)
- [X] T135 [US5] Extend the spec-041 frozen-mutation interceptor and `apps/api/Services/FrozenEventMutationAuditor.cs` to guard finalized block-settlement fields and line items outside authorized reopen contexts (Constitution V) (depends on T133)
- [X] T136 [US5] Implement `StageZoneAssignment` scoping in `apps/api/Services/FestivalAccessGuard.cs` — assigned-stage restriction for finalize authority and scoped settlement visibility (depends on T027)
- [X] T137 [US5] Implement `BlockSettlementsController` in `apps/api/Controllers/BlockSettlementsController.cs` — sheet, deal terms, line items, preflight, finalize, reopen, adjustments, `my-blocks`, and artist settlement rollup per contracts/block-settlement-endpoints.md (depends on T130–T136)
- [X] T138 [US5] Regenerate the frontend contract (`dotnet build` + `npm run gen:api`) so `apps/web/src/types/generated-api.ts` carries the settlement DTOs (depends on T137)
- [X] T139 [P] [US5] Create `apps/web/src/api/blockSettlements.ts` with sheet, preflight, finalize, reopen, and rollup hooks (depends on T138)
- [X] T140 [P] [US5] Create `apps/web/src/components/festival/FinalizePreflightPanel.tsx` — blockers grouped by category with deep links to the sections needing correction (depends on T139)
- [X] T141 [P] [US5] Create `apps/web/src/components/festival/ReopenDialog.tsx` — reason code, note, and dispatched-revision acknowledgement (depends on T139)
- [X] T142 [P] [US5] Create `apps/web/src/components/festival/ArtistRollupPanel.tsx` showing linked appearances with per-block settlement status (depends on T139)
- [X] T143 [US5] Create `apps/web/src/pages/BlockSettlementPage.tsx` — tablet-first layout (≥44px targets, single-column financial summary, portrait + landscape), `my-blocks` work queue navigation, offline-gated Finalize, and exactly-two-outcome finalize UX; register its route in `apps/web/src/App.tsx` (depends on T140, T141, T142)
- [X] T144 [P] [US5] Add tablet-first settlement styles (touch targets, readable financial summary, orientation handling) to `apps/web/src/index.css`

**Checkpoint**: Sub-settlements execute safely with zero partial-finalization risk.

---

## Phase 8: User Story 6 - Switch between internal and public itinerary views (Priority: P3)

**Goal**: Internal users freely toggle Internal ⇄ Public as a personal display choice, while changing what the public sees is separately permissioned and audited.

**Independent Test**: Toggle both views (clearly labeled); attempt a public-visibility edit without publish permission (denied); publish as a manager and confirm the change is logged (quickstart.md "US6").

### Tests for User Story 6 (REQUIRED) ⚠️

- [X] T145 [P] [US6] Add failing integration tests asserting `?view=public` returns only publicly-visible blocks with the public field subset — verified against the response payload, not the UI — in `apps/api.tests/Integration/ItineraryViewTests.cs` (spec FR-016, research.md D13)
- [X] T146 [P] [US6] Add failing integration tests asserting publish-visibility mutations require `PublishPublicItinerary` (stage managers denied by default) and write `PublishChange` audit entries, in `apps/api.tests/Integration/ItineraryViewTests.cs` (spec FR-016)
- [X] T147 [P] [US6] Add failing Vitest tests for `ViewToggle` — personal localStorage persistence, always-visible active-view label, publish controls rendered only with permission — in `apps/web/tests/components/festival/ViewToggle.test.tsx`

### Implementation for User Story 6

- [X] T148 [US6] Implement server-side view filtering in `apps/api/Services/FestivalService.cs` — `public` returns only `IsPubliclyVisible` blocks with the reduced field set so internal fields never reach a public rendering path (depends on T079)
- [X] T149 [US6] Implement the publish-visibility endpoint in `apps/api/Controllers/FestivalsController.cs` gated on `PublishPublicItinerary` with audit entries, then regenerate the contract (`dotnet build` + `npm run gen:api`) (depends on T148)
- [X] T150 [P] [US6] Create `apps/web/src/components/festival/ViewToggle.tsx` — personal Internal/Public toggle persisted to localStorage with a permanent active-view indicator (depends on T149)
- [X] T151 [US6] Wire the view toggle and permission-gated publish controls into `apps/web/src/pages/FestivalItineraryPage.tsx` and `apps/web/src/components/festival/BlockEditorDrawer.tsx` (depends on T150)

**Checkpoint**: One itinerary safely serves both operations and public audiences.

---

## Phase 9: User Story 7 - Reconcile QBO transactions through the single master tag (Priority: P4)

**Goal**: Master-tagged transactions import and map internally to overhead, days, stages, or blocks — including splits — with review-required exception handling and two-way traceability, while QBO stays strictly read-only.

**Independent Test**: Map one transaction fully to overhead and split another across block/stage/overhead; verify totals never exceed the original, both drill-down directions work, and mismatched tags land in the exception queue (quickstart.md "US7").

### Tests for User Story 7 (REQUIRED) ⚠️

- [X] T152 [P] [US7] Add failing integration tests asserting the festival master tag is generated locally into `Event.QboTagName` and that no QBO write path exists anywhere in the festival module, in `apps/api.tests/Integration/FestivalQboBoundaryTests.cs` (spec FR-039, Constitution IV)
- [X] T153 [P] [US7] Add failing integration tests asserting imported transactions retain their original QBO reference and master tag, and support overhead / single-target / multi-target split mapping, in `apps/api.tests/Integration/FestivalQboMappingTests.cs` (spec FR-040)
- [X] T154 [P] [US7] Add failing integration tests asserting split lines plus retained overhead never exceed the original transaction amount and that the remainder stays visible, in `apps/api.tests/Integration/FestivalQboMappingTests.cs` (spec FR-041)
- [X] T155 [P] [US7] Add failing integration tests for two-way traceability (block/settlement → source transactions, transaction → all allocations, each with amount, user, timestamp) in `apps/api.tests/Integration/FestivalQboMappingTests.cs` (spec FR-042)
- [X] T156 [P] [US7] Add failing integration tests for `ReviewState` exception handling — exception-state transactions excluded from settlement-impacting allocation, resolution preserving original state and reason, finalized-settlement impacts routed to adjustment/reopen — in `apps/api.tests/Integration/FestivalQboExceptionTests.cs` (spec FR-043)
- [X] T157 [P] [US7] Add failing Vitest tests for `TransactionMappingDrawer` — review-state chips, split builder, blocked settlement-marked splits on exception rows, side-by-side original-vs-current mapping — in `apps/web/tests/components/festival/TransactionMappingDrawer.test.tsx`

### Implementation for User Story 7

- [X] T158 [US7] Implement master tag generation (`#Fest-{yyyy}-{slug}`) as a local display-only string in `apps/api/Services/FestivalService.cs`, with no QBO mutation path (depends on T041)
- [X] T159 [US7] Extend `apps/api/Services/QboMappingService.cs` with festival split targets (overhead, day, stage, block) reusing `ExpenseAllocation`, including source-total validation and visible remainder (depends on T104)
- [X] T160 [US7] Implement `ReviewState` assignment on import and the review-resolution flow (remap / accept-as-overhead / reclassify) preserving original state, prior mapping, and reason, in `apps/api/Services/QboMappingService.cs` (depends on T159)
- [X] T161 [US7] Add festival QBO transaction and review routes to `apps/api/Controllers/FestivalFinancialsController.cs`, then regenerate the contract (`dotnet build` + `npm run gen:api`) (depends on T159, T160)
- [X] T162 [P] [US7] Extend `apps/web/src/api/festivalFinancials.ts` with transaction listing and review-resolution hooks (depends on T161)
- [X] T163 [US7] Create `apps/web/src/components/festival/TransactionMappingDrawer.tsx` — inline mapping with split builder, review-state chips, and side-by-side original-vs-current mapping (depends on T162)
- [X] T164 [US7] Wire the mapping drawer into `apps/web/src/pages/FestivalLedgerPage.tsx` with an exception-queue filter (depends on T163)

**Checkpoint**: Festival reconciliation is complete with QBO still strictly read-only.

---

## Phase 10: User Story 8 - Report across the festival from top to bottom (Priority: P4)

**Goal**: Festival P&L plus day, stage, settlement-status, unreconciled, and variance reports, all segmentable and drillable down to source transactions.

**Independent Test**: Seed mixed block statuses, partial reconciliation, and finalized settlements; run every report layer and drill from festival P&L to one source transaction (quickstart.md "US8").

### Tests for User Story 8 (REQUIRED) ⚠️

- [X] T165 [P] [US8] Add failing integration tests for the festival P&L, day-summary, and stage-rollup report shapes in `apps/api.tests/Integration/FestivalReportTests.cs` (spec FR-044)
- [X] T166 [P] [US8] Add failing integration tests for settlement-status reporting — counts by status, canceled and moved logs, partial-completion exceptions, scheduled-vs-completed variance — in `apps/api.tests/Integration/FestivalReportTests.cs` (spec FR-044)
- [X] T167 [P] [US8] Add failing integration tests for unreconciled-expense reporting distinguishing unreconciled, partial, full, overhead, and pushed-down amounts, in `apps/api.tests/Integration/FestivalReportTests.cs` (spec FR-044)
- [X] T168 [P] [US8] Add failing integration tests asserting every aggregate row carries drill-down ids enabling festival → day → stage → block → settlement → transaction navigation, plus category segmentation, in `apps/api.tests/Integration/FestivalReportTests.cs` (spec FR-044)
- [X] T169 [P] [US8] Add failing Vitest tests for report cards rendering each layer with segmentation controls and working drill-down links in `apps/web/tests/pages/FestivalReportsPage.test.tsx`

### Implementation for User Story 8

- [X] T170 [P] [US8] Create report DTOs for the six layers in `apps/api/DTOs/Festivals/FestivalReportDtos.cs`
- [X] T171 [US8] Implement `FestivalReportService` in `apps/api/Services/FestivalReportService.cs` — single-query `.AsNoTracking()` aggregates for P&L, days, stages, settlement status, unreconciled, and variance, every row carrying drill-down ids (Constitution VII, research.md D14) (depends on T027, T170)
- [X] T172 [US8] Implement `FestivalReportsController` in `apps/api/Controllers/FestivalReportsController.cs` with category/status segmentation and ledger-access audit entries, then regenerate the contract (`dotnet build` + `npm run gen:api`) (depends on T171)
- [X] T173 [P] [US8] Create `apps/web/src/api/festivalReports.ts` with hooks for the six report layers (depends on T172)
- [X] T174 [P] [US8] Create `apps/web/src/components/festival/ReportCards.tsx` — per-layer cards with segmentation controls and drill-down links (depends on T173)
- [X] T175 [US8] Create `apps/web/src/pages/FestivalReportsPage.tsx` composing the report layers with drill-down navigation into the itinerary, ledger, settlement, and mapping surfaces; register its route in `apps/web/src/App.tsx` (depends on T174)
- [X] T176 [P] [US8] Add report card and drill-down styles to `apps/web/src/index.css`

**Checkpoint**: All eight user stories are independently functional.

---

## Phase 11: Polish & Cross-Cutting Concerns

- [X] T177 [P] Add scale/performance verification seeding a festival at v1 limits (3 days, 8 stages, 250 blocks) and asserting itinerary and conflict-check response times meet spec SC-003, in `apps/api.tests/Integration/FestivalScaleTests.cs`
- [X] T178 [P] Verify standard single-day event flows are unchanged — creation step count, workspace, ledger, settlement, calendar — via regression assertions in `apps/api.tests/Integration/StandardEventRegressionTests.cs` (spec SC-007)
- [X] T179 [P] Verify the booking calendar (spec 073) renders a festival wrapper as a single placement without block flooding, in `apps/web/tests/pages/BookingCalendarPage.test.tsx`
- [X] T180 [P] Add accessibility assertions — keyboard parity for drag-and-drop, non-color-only status/category encoding, ARIA roles on the timeline — in `apps/web/tests/components/festival/TimelineGrid.test.tsx`
- [X] T181 [P] Verify all new icons are per-icon Font Awesome Free imports across `apps/web/src/components/festival/` (Constitution IX)
- [X] T182 [P] Verify no hand-written TypeScript mirrors of API payloads exist in `apps/web/src/` for festival types — all imported from `generated-api.ts` (Constitution VI)
- [X] T183 [P] Audit new logging paths for sanitized output (no PII, tokens, or secrets) across the festival services in `apps/api/Services/` (Constitution VIII)
- [X] T184 Verify ≥80.0% line/branch coverage for new backend and frontend code via `dotnet test` against `apps/api.tests/coverage.runsettings` (coverlet → cobertura) and `npm run test:coverage` in `apps/web/` (Vitest → lcov); missing or unparseable reports FAIL (Constitution III)
- [X] T185 Run the full `quickstart.md` validation checklist including the tablet-viewport settlement pass and both Playwright specs

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS all user stories** (schema, guards, contract plumbing)
- **User Stories (Phases 3–10)**: All depend on Foundational completion
- **Polish (Phase 11)**: Depends on all desired user stories

### User Story Dependencies

- **US1 (P1)**: Depends only on Foundational — the festival wrapper every other story attaches to
- **US2 (P1)**: Depends on US1 (blocks need a festival with stages)
- **US3 (P2)**: Depends on US2 (timeline schedules existing blocks)
- **US4 (P2)**: Depends on US2 (allocations target blocks); independent of US3
- **US5 (P3)**: Depends on US4 (settlement consumes allocations) and US2
- **US6 (P3)**: Depends on US2 (public visibility is a block field); independent of US4/US5
- **US7 (P4)**: Depends on US4 (reuses `ExpenseAllocation` splits)
- **US8 (P4)**: Depends on US2 + US4 for meaningful data; report shapes can be built earlier against seeded rows

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- DTOs → services → controllers → contract regeneration → frontend hooks → components → pages
- Contract regeneration (`dotnet build` + `npm run gen:api`) always precedes frontend work in that slice (Constitution VI)

### Parallel Opportunities

- All Phase 2 enum and model tasks (T004–T023) are `[P]` — different files, no interdependencies
- All test tasks within a story are `[P]` — separate test files
- After US2 completes, **US3, US4, and US6 can proceed in parallel** by different developers (disjoint files: timeline vs. financials vs. view toggle)
- After US4 completes, **US5 and US7 can proceed in parallel**
- Frontend component tasks marked `[P]` within a story are separate files and parallelize freely

---

## Parallel Example: Phase 2 Foundational

```bash
# All enums together:
Task: "Create EventType enum in apps/api/Models/Enums/EventType.cs"
Task: "Create BlockCategory enum in apps/api/Models/Enums/BlockCategory.cs"
Task: "Create BlockScheduleStatus enum in apps/api/Models/Enums/BlockScheduleStatus.cs"

# All entity models together (T014–T023):
Task: "Create StageZone model in apps/api/Models/StageZone.cs"
Task: "Create ProgrammingBlock model in apps/api/Models/ProgrammingBlock.cs"
Task: "Create RevenueBucket model in apps/api/Models/RevenueBucket.cs"
```

## Parallel Example: User Story 5 Tests

```bash
# Launch all US5 backend test files together:
Task: "Isolation tests in apps/api.tests/Integration/BlockSettlementIsolationTests.cs"
Task: "Finalize tests in apps/api.tests/Integration/BlockSettlementFinalizeTests.cs"
Task: "Preflight tests in apps/api.tests/Integration/BlockSettlementPreflightTests.cs"
Task: "Reopen tests in apps/api.tests/Integration/BlockSettlementReopenTests.cs"
Task: "Permission tests in apps/api.tests/Integration/BlockSettlementPermissionTests.cs"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks everything)
3. Complete Phase 3 (US1) and Phase 4 (US2)
4. **STOP and VALIDATE**: a festival can be created with days, stages, and a full categorized program of record — the PRD's structural core, with standard events verifiably untouched
5. Deploy/demo

Both P1 stories are needed for a coherent MVP: US1 alone creates an empty container, and US2 is what makes it a usable program of record.

### Incremental Delivery

1. Setup + Foundational → schema ready
2. US1 + US2 → festival program of record (**MVP**)
3. US3 → safe dense multi-stage scheduling
4. US4 → controlled festival economics
5. US5 → isolated sub-settlement execution (the payoff)
6. US6 → public/internal itinerary separation
7. US7 → QBO reconciliation
8. US8 → full reporting (delivers the PRD's primary success metric: visibility across days)

### Parallel Team Strategy

1. Team completes Setup + Foundational together (the schema is the shared bottleneck)
2. One developer takes US1 → US2 (sequential, structural)
3. Once US2 lands: Developer A → US3 (timeline), Developer B → US4 (financials), Developer C → US6 (views)
4. Once US4 lands: Developer B → US5 (settlement), Developer C → US7 (QBO)
5. US8 (reporting) last, consuming all prior data shapes

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps each task to its user story for traceability
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate a story independently
- Every slice that changes a DTO must regenerate `generated-api.ts` before frontend work (Constitution VI)
- The two highest-risk areas are atomic finalization (US5) and allocation races (US4) — their integration tests carry the most weight
