# Tasks: Core Financial Ledger Grid & Base-10 Math Engine

**Input**: Design documents from `specs/002-financial-ledger-grid/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included per FR-034 and Constitution III — `DealMathEngine`/`CustomFormulaEvaluator` unit tests, Testcontainers integration tests (tenant isolation, state machine, recalculation, concurrency), Vitest + RTL for grid components.

**Organization**: Tasks grouped by user story. Each story is independently testable after its phase completes.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add packages, bootstrap frontend, and establish shared serialization/exception infrastructure.

- [x] T001 Add NCalcSync 5.12.x package reference to `apps/api/split-rail-api.csproj`
- [x] T002 Bootstrap React 18 + Vite + TypeScript app at `apps/web/` with TanStack Query, Vitest, and React Testing Library per plan.md
- [x] T003 [P] Create `DecimalStringJsonConverter` and nullable variant in `apps/api/Serialization/DecimalStringJsonConverter.cs` — serialize `decimal` as invariant `"F2"` strings
- [x] T004 [P] Extend domain exceptions in `apps/api/Exceptions/ApiExceptions.cs` — add `LedgerStateException`, `FormulaEvaluationException`, `ConcurrencyConflictException`
- [x] T005 [P] Add `gen:api` script in `apps/web/package.json` using `openapi-typescript` pointed at API Swagger JSON → `apps/web/src/types/generated-api.ts`
- [x] T006 Register `DecimalStringJsonConverter` on JSON options and ledger service DI stubs in `apps/api/Program.cs`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Ledger entities, DbContext, migration, event scaffold, DTOs, and test helpers. MUST complete before any user story.

**CRITICAL**: No user story work can begin until this phase is complete.

- [x] T007 Create enums in `apps/api/Models/Enums/` — `EventStatus.cs` (PreShow, Settled, Reconciled), `BlockType.cs` (Revenue, Expenses, DealMath), `DealType.cs` (Guarantee, DoorSplit, Custom)
- [x] T008 [P] Create `Event` entity in `apps/api/Models/Event.cs` per data-model.md — venue FK, title, event_date, status, qbo_tag_name, is_budget_locked, settled_at, settled_by_user_id, created_at
- [x] T009 [P] Create `FinancialLineItem` entity in `apps/api/Models/FinancialLineItem.cs` per data-model.md — block_type, row_label, sort_order, is_artist_deduction, proforma/settlement/qbo values, notes, is_hidden_from_promoter, updated_at, xmin concurrency token
- [x] T010 [P] Create `EventArtist` entity in `apps/api/Models/EventArtist.cs` per data-model.md — artist_name, performance_order, deal_type, custom_formula_expression, base_guarantee, backend_percentage, tax_withholding_percentage, calculated_net_payout, xmin concurrency token
- [x] T011 Update `apps/api/Data/ApplicationDbContext.cs` — add DbSets; Fluent API for `events`, `financial_line_items`, `event_artists`; map `event_status` enum; `UseXminAsConcurrencyToken()` on line items and artists; global query filters via `Event.Venue.OrganizationId`; indexes per data-model.md
- [x] T012 Generate EF Core migration `AddFinancialLedgerEntities` in `apps/api/Data/Migrations/` — run `dotnet ef migrations add AddFinancialLedgerEntities` from `apps/api/`
- [x] T013 [P] Create ledger DTOs in `apps/api/DTOs/Ledger/` — `LedgerGridResponse`, `LedgerBlockDto`, `LineItemDto`, `EventArtistDto`, `EditabilityDto`, create/update request records; all monetary/percentage fields as `string`
- [x] T014 Implement `EventService` in `apps/api/Services/EventService.cs` — create/list/get events scoped to venue + org via `.Include().ThenInclude()` and `.AsNoTracking()` reads
- [x] T015 Create `EventsController` in `apps/api/Controllers/EventsController.cs` — `POST/GET api/venues/{venueId}/events` and `GET api/venues/{venueId}/events/{eventId}` for test/setup scaffolding
- [x] T016 Create `LedgerService` skeleton in `apps/api/Services/LedgerService.cs` — venue/org scope validation, `UserVenueScope` enforcement, shared `AssertEditableState` guard (Constitution V), editability matrix helper
- [x] T017 [P] Extend `apps/api.tests/Integration/IntegrationTestBase.cs` — seed helpers for event, line items, artists, and authenticated clients with financial permissions
- [x] T018 Register `EventService` and `LedgerService` as scoped in `apps/api/Program.cs`

**Checkpoint**: Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 1 — Plan a show budget with automatic deal math (Priority: P1) 🎯 MVP

**Goal**: Build a proforma budget on the ledger grid, configure standard artist deals (guarantee, door split), and see accurate net payouts that auto-recalculate on every change.

**Independent Test**: Create an event, add revenue/expense line items (with artist deduction flag), add artists with guarantee/door-split deals, `GET …/ledger` shows grouped blocks, correct totals, and payouts that update after each mutation — per quickstart Scenario A/B.

### Tests for User Story 1

- [x] T019 [P] [US1] Write unit tests in `apps/api.tests/Unit/DealMathEngineTests.cs` — fractional splits, `.005` AwayFromZero rounding, zero gross, deductions > gross (floor at 0), guarantee pre-tax max comparison, multi-artist mixed deals, shared net revenue base
- [x] T020 [P] [US1] Write integration tests in `apps/api.tests/Integration/LedgerControllerTests.cs` — line-item CRUD, artist CRUD (guarantee/door_split), auto-recalc on mutation, `GET …/ledger` block grouping and summary totals

### Implementation for User Story 1

- [x] T021 [US1] Implement `DealMathEngine` in `apps/api/Services/DealMathEngine.cs` — decimal-only arithmetic, guarantee/door_split logic, tax withholding once on selected gross, payout floor at 0.00, return values as formatted strings
- [x] T022 [US1] Extend `LedgerService` in `apps/api/Services/LedgerService.cs` — aggregate gross/deductions from proforma column when unlocked; line-item CRUD; artist CRUD (guarantee/door_split); persist `calculated_net_payout`; auto-trigger recalculation after mutations
- [x] T023 [US1] Create `LedgerController` in `apps/api/Controllers/LedgerController.cs` — `GET …/ledger` [`can_view_financials`], `POST/PUT/DELETE …/line-items`, `POST/PUT/DELETE …/artists`, `POST …/recalculate` per contracts/ledger.md, line-items.md, artists.md
- [x] T024 [P] [US1] Create decimal display helpers in `apps/web/src/lib/money.ts` — format/parse decimal strings without float math
- [x] T025 [P] [US1] Generate API types and TanStack Query hooks in `apps/web/src/api/ledger.ts` importing from `apps/web/src/types/generated-api.ts` only
- [x] T026 [US1] Implement `LedgerGrid`, `BlockSection`, and `LedgerRow` in `apps/web/src/components/ledger/` — 3 blocks × 5 columns, proforma editing in planning state, notes column, currency two-decimal display
- [x] T027 [US1] Implement `ArtistDealPanel` in `apps/web/src/components/artists/ArtistDealPanel.tsx` — guarantee and door_split deal types, add/edit/remove artists (Pre-Show only)
- [x] T028 [US1] Create ledger page route in `apps/web/src/pages/EventLedgerPage.tsx` wiring grid, mutations, and auto-refetch after saves
- [x] T029 [US1] Write component tests in `apps/web/tests/ledger/LedgerGrid.test.tsx` — block rendering, proforma edit, payout display after mock recalc response

**Checkpoint**: MVP complete — managers can build a show budget with accurate deal math without external calculators (SC-005).

---

## Phase 4: User Story 2 — Lock the budget and record night-of settlement (Priority: P2)

**Goal**: Lock proforma after approval; enable settlement column edits for authorized staff; reject edits once settled; mobile-usable settlement view.

**Independent Test**: Lock budget → proforma read-only and settlement editable → settlement values drive recalc → `SETTLED` status rejects all mutations — per quickstart Scenario C and spec acceptance scenarios.

### Tests for User Story 2

- [x] T030 [P] [US2] Write integration tests in `apps/api.tests/Integration/LedgerStateMachineTests.cs` — lock-budget success/403, proforma edit rejected after lock, settlement edit with `can_edit_settlement`, all mutations rejected when status is `SETTLED`/`RECONCILED`

### Implementation for User Story 2

- [x] T031 [US2] Implement `LockBudgetAsync` in `apps/api/Services/LedgerService.cs` — set `is_budget_locked = true`, idempotent if already locked, enforce `can_lock_budget`, return updated editability
- [x] T032 [US2] Add `POST …/lock-budget` to `apps/api/Controllers/LedgerController.cs` per contracts/events-lifecycle.md
- [x] T033 [US2] Extend column editability gating in `apps/api/Services/LedgerService.cs` — proforma editable only when `PRE_SHOW` + unlocked; settlement editable only when locked + `PRE_SHOW` + `can_edit_settlement`; switch aggregation column to settlement after lock
- [x] T034 [US2] Surface `editability` object on `GET …/ledger` response and enforce server-side on every line-item mutation in `apps/api/Services/LedgerService.cs`
- [x] T035 [US2] Add Lock Budget action and permission-aware disabled state in `apps/web/src/components/ledger/LedgerGrid.tsx`
- [x] T036 [US2] Enable settlement column editing and mobile-responsive layout in `apps/web/src/components/ledger/LedgerRow.tsx` and grid styles — usable on mobile web (SC-008)
- [x] T037 [US2] Write component tests in `apps/web/tests/ledger/Editability.test.tsx` — proforma locked after lock-budget; settlement cells editable when permitted

**Checkpoint**: Budget lock and night-of settlement workflow functional with lifecycle enforcement.

---

## Phase 5: User Story 3 — Reconcile against QuickBooks actuals via variance (Priority: P3)

**Goal**: Show read-only QBO Actuals (default `0.00`), compute per-row variance server-side and client-side, highlight non-zero variances.

**Independent Test**: With settlement values set and QBO actuals at default zero, each row shows variance = QBO − settlement; non-zero rows flagged — per quickstart Scenario D.

### Implementation for User Story 3

- [x] T038 [P] [US3] Compute per-row `variance` and `varianceFlagged` in `apps/api/Services/LedgerService.cs` when assembling `LedgerGridResponse` — `qbo_actual_value − settlement_value`; reject any client attempt to write `qboActualValue` on line-item create/update
- [x] T039 [US3] Implement `VarianceCell` in `apps/web/src/components/ledger/VarianceCell.tsx` — display variance string; amber/red highlight when `|variance| > 0.00`
- [x] T040 [US3] Render read-only QBO Actuals column in `apps/web/src/components/ledger/LedgerRow.tsx` — no input controls; show `"0.00"` default
- [x] T041 [US3] Add reconciled-state read-only UI and non-zero variance alert banner in `apps/web/src/components/ledger/LedgerGrid.tsx` when `status = RECONCILED`
- [x] T042 [US3] Write component tests in `apps/web/tests/ledger/VarianceCell.test.tsx` — zero vs non-zero highlight behavior

**Checkpoint**: Variance auditing visible in grid; QBO actuals remain read-only with no manual entry path.

---

## Phase 6: User Story 4 — Configure complex multi-artist deals with custom formulas (Priority: P4)

**Goal**: Support `custom` deal type via sandboxed NCalc evaluation; show formula editor with token list and live payout preview.

**Independent Test**: Configure custom formula artist, recalculate, payout matches evaluated expression; malicious input sanitized; parse failure returns clear error — per quickstart Scenario E.

### Tests for User Story 4

- [x] T043 [P] [US4] Write unit tests in `apps/api.tests/Unit/CustomFormulaEvaluatorTests.cs` — nested parentheses, injection chars stripped, parse/eval failure throws `FormulaEvaluationException`, decimal result rounded AwayFromZero
- [x] T044 [P] [US4] Extend integration tests in `apps/api.tests/Integration/LedgerControllerTests.cs` — custom artist create/recalc, invalid formula returns 422 with safe message

### Implementation for User Story 4

- [x] T045 [US4] Implement `CustomFormulaEvaluator` in `apps/api/Services/CustomFormulaEvaluator.cs` — NCalcSync decimal mode, allow-list sanitizer `[a-zA-Z0-9\s+\-*/().]`, bind GrossRevenue/TotalDeductions/BaseGuarantee/SplitPercentage tokens
- [x] T046 [US4] Integrate custom deal path in `apps/api/Services/DealMathEngine.cs` and `apps/api/Services/LedgerService.cs` — route `deal_type = custom` through evaluator; map failures to 422
- [x] T047 [US4] Implement `FormulaEditor` in `apps/web/src/components/artists/FormulaEditor.tsx` — textarea, available token list, validation error display
- [x] T048 [US4] Extend `ArtistDealPanel` in `apps/web/src/components/artists/ArtistDealPanel.tsx` — custom deal type selector, formula editor, live `calculatedNetPayout` preview after recalculate
- [x] T049 [US4] Write component tests in `apps/web/tests/artists/FormulaEditor.test.tsx` — token list rendered, preview updates after mock recalc

**Checkpoint**: Custom contract formulas supported safely with live preview.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Tenant isolation, optimistic concurrency, OpenAPI/codegen verification, performance, and quickstart validation.

- [x] T050 [P] Write integration tests in `apps/api.tests/Integration/LedgerTenantIsolationTests.cs` — cross-org event/ledger access returns 404; venue scope enforced for scoped users
- [x] T051 [P] Write concurrency integration test in `apps/api.tests/Integration/LedgerConcurrencyTests.cs` — stale `rowVersion` on line-item PUT returns 409 Conflict
- [x] T052 Implement optimistic concurrency handling in `apps/api/Services/LedgerService.cs` — translate `DbUpdateConcurrencyException` to `ConcurrencyConflictException`; expose `rowVersion` in DTOs
- [x] T053 [P] Add `is_hidden_from_promoter` support in `apps/api/Services/LedgerService.cs` and filter rows for promoter role in ledger reads per FR-031
- [x] T054 Verify Swagger emits monetary fields as `type: string` in generated OpenAPI spec; run `npm run gen:api` in `apps/web/` and confirm compile with no hand-written duplicate types (SC-007)
- [x] T055 Run quickstart validation scenarios A–F from `specs/002-financial-ledger-grid/quickstart.md` and document results
- [x] T056 Verify test coverage ≥80% for new ledger/math code paths (`dotnet test` with coverage collector)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS all user stories**
- **User Stories (Phases 3–6)**: All depend on Foundational completion
  - US1 (P1) first for MVP
  - US2 depends on US1 ledger CRUD/recalc existing
  - US3 depends on US1 grid + US2 settlement values (can parallelize frontend variance work after US1 backend)
  - US4 depends on US1 DealMathEngine/LedgerService (custom path extends them)
- **Polish (Phase 7)**: Depends on desired user stories being complete

### User Story Dependencies

| Story | Depends on | Can start after |
|-------|------------|-----------------|
| US1 (P1) | Foundational | Phase 2 checkpoint |
| US2 (P2) | US1 backend ledger endpoints | Phase 3 checkpoint (or US1 backend tasks T021–T023) |
| US3 (P3) | US1 ledger read path; US2 settlement values for meaningful variance | Phase 3 backend; US2 for full scenario |
| US4 (P4) | US1 DealMathEngine + artist CRUD | Phase 3 checkpoint |

### Within Each User Story

- Tests written first (should FAIL before implementation)
- Services before controllers
- Backend before dependent frontend hooks/components
- Story checkpoint before next priority

### Parallel Opportunities

- **Phase 1**: T003, T004, T005 in parallel
- **Phase 2**: T008, T009, T010, T013, T017 in parallel after T007
- **US1**: T019 + T020 (tests); T024 + T025 (frontend setup) while backend T021–T023 proceed sequentially
- **US2–US4**: Backend and frontend tasks marked [P] within each phase
- **Polish**: T050, T051, T053 in parallel

---

## Parallel Example: User Story 1

```bash
# Tests first (should fail):
Task T019: apps/api.tests/Unit/DealMathEngineTests.cs
Task T020: apps/api.tests/Integration/LedgerControllerTests.cs

# Backend core (sequential):
Task T021: apps/api/Services/DealMathEngine.cs
Task T022: apps/api/Services/LedgerService.cs
Task T023: apps/api/Controllers/LedgerController.cs

# Frontend (parallel after T023):
Task T024: apps/web/src/lib/money.ts
Task T025: apps/web/src/api/ledger.ts
Task T026: apps/web/src/components/ledger/
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (**CRITICAL**)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: quickstart Scenarios A + B
5. Demo budgeting + deal math

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. US1 → MVP budgeting calculator (deploy/demo)
3. US2 → lock + settlement lifecycle
4. US3 → variance column for accounting review
5. US4 → custom formulas for edge-case contracts
6. Polish → isolation, concurrency, coverage, OpenAPI verification

### Parallel Team Strategy

1. Team completes Setup + Foundational together
2. After Phase 2:
   - Developer A: US1 backend (T021–T023)
   - Developer B: US1 frontend (T024–T028) after T023 contracts stable
   - Developer C: US1 tests (T019–T020) in TDD mode
3. US2/US3/US4 sequentially or split backend/frontend per story

---

## Notes

- All monetary API fields MUST remain JSON strings — never expose raw JSON numbers (Constitution I/VI)
- No QBO HTTP writes; `qbo_actual_value` read-only until sync feature (Constitution IV)
- Routes use `api/venues/{venueId}/events/{eventId}/…` — no `/v1/` prefix (research.md §3)
- Playwright E2E lifecycle tests explicitly out of scope — tracked as follow-up per spec Assumptions
- `[P]` tasks = different files, no incomplete-task dependencies
- Commit after each task or logical group; stop at any checkpoint to validate story independently
