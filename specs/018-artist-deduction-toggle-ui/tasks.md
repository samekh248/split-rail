---
description: "Task list for Artist Deduction Toggle on Expense Rows feature"
---

# Tasks: Artist Deduction Toggle on Expense Rows

**Input**: Design documents from `/specs/018-artist-deduction-toggle-ui/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/artist-deduction-ui.md, quickstart.md

**Tests**: REQUIRED per Constitution III. Every user story phase includes automated test tasks (write first, ensure fail). Final phase includes ≥80.0% coverage gate.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story label ([US1]–[US3])

## Path Conventions

- Backend: `apps/api/`, `apps/api.tests/`
- Frontend: `apps/web/src/`, `apps/web/tests/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm prerequisites and design artifacts before implementation

- [x] T001 Verify feature branch `018-artist-deduction-toggle-ui` and review design docs in `specs/018-artist-deduction-toggle-ui/`
- [x] T002 [P] Confirm `isArtistDeduction` on `LineItemDto` / `UpdateLineItemRequest` / `CreateLineItemRequest` in `apps/web/src/types/generated-api.ts` and mutation hooks in `apps/web/src/api/ledger.ts`
- [x] T003 [P] Review UI contract in `specs/018-artist-deduction-toggle-ui/contracts/artist-deduction-ui.md` and badge/toggle rules in `specs/018-artist-deduction-toggle-ui/data-model.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Confirm backend deal-math path and shared permission hook from feature 013 — MUST complete before user story work

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Tests for Foundational (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation (if regression not already covered)**

- [x] T004 Write integration test `ToggleArtistDeduction_Recalculate_UpdatesTotalDeductions` in `apps/api.tests/Integration/LedgerDeductionToggleTests.cs` (PUT flag on expense row → recalculate → `summary.totalDeductions` delta equals active column value)

### Implementation for Foundational

- [x] T005 Verify `ComputeSummary` sums `IsArtistDeduction` rows in `apps/api/Services/LedgerService.cs` — no code change expected; document finding in test or skip test if 002 suite already covers
- [x] T006 Run backend deduction test until T004 passes: `dotnet test apps/api.tests/split-rail-api.tests.csproj --filter "FullyQualifiedName~Deduction"`
- [x] T007 [P] Confirm `useCanEditLedgerStructure` column-aware hook exists and matches contract in `apps/web/src/hooks/useCanEditLedgerStructure.ts`

**Checkpoint**: Backend deal-math path verified; permission hook confirmed — user story phases can begin

---

## Phase 3: User Story 1 - Flag an expense as an artist deduction (Priority: P1) 🎯 MVP

**Goal**: Toggle artist-deduction on expense rows (and on add-row form); persist via PUT/POST; recalculate totals and payouts

**Independent Test**: On editable Pre-Show event, toggle deduction on an expense row — flag saves, totals and payouts update; add-row with deduction flag creates flagged row

### Tests for User Story 1 (REQUIRED) ⚠️

- [x] T008 [P] [US1] Write failing Vitest tests for toggle callback, Expenses-only exposure, and Revenue exclusion in `apps/web/tests/ledger/ArtistDeductionToggle.test.tsx`
- [x] T009 [P] [US1] Write failing Vitest test for add-row deduction checkbox payload in `apps/web/tests/ledger/AddLineItemForm.test.tsx`

### Implementation for User Story 1

- [x] T010 [US1] Convert deduction checkbox to controlled `checked={row.isArtistDeduction}` keyed by `row.id`/`rowVersion` in `apps/web/src/components/ledger/LedgerRow.tsx`
- [x] T011 [US1] Verify `onDeductionChange` → `saveLineItemRow` → `useUpdateLineItem` + `useRecalculateLedger` wiring in `apps/web/src/pages/EventLedgerPage.tsx` (fix gaps if tests fail)
- [x] T012 [US1] Verify `AddLineItemForm` sends `isArtistDeduction` for Expenses-only in `apps/web/src/components/ledger/AddLineItemForm.tsx` (fix gaps if tests fail)
- [x] T013 [US1] Run US1 Vitest suites until T008–T009 pass: `npm run test -- tests/ledger/ArtistDeductionToggle.test.tsx tests/ledger/AddLineItemForm.test.tsx`

**Checkpoint**: User Story 1 fully functional — toggle and add-row flag persist; recalculation fires after save

---

## Phase 4: User Story 2 - See which expenses are deductions at a glance (Priority: P2)

**Goal**: Persistent "Deduction" badge and distinct row styling on flagged expense rows; visible in read-only states

**Independent Test**: Load ledger with flagged/unflagged expense rows — flagged rows show badge + styling without interaction; styling removed when flag toggled off

### Tests for User Story 2 (REQUIRED) ⚠️

- [x] T014 [P] [US2] Write failing Vitest tests for `deduction-badge-{id}` presence, `ledger-row--deduction` class, and badge absence when unflagged in `apps/web/tests/ledger/ArtistDeductionToggle.test.tsx`
- [x] T015 [P] [US2] Write failing Vitest test asserting badge visible when `canEditStructure` is false but row is flagged in `apps/web/tests/ledger/Editability.test.tsx`

### Implementation for User Story 2

- [x] T016 [US2] Render persistent `<span class="ledger-row__deduction-badge" data-testid="deduction-badge-{id}">Deduction</span>` and `ledger-row--deduction` class on flagged Expenses rows in `apps/web/src/components/ledger/LedgerRow.tsx`
- [x] T017 [P] [US2] Add accessible badge and row styling (border/weight + subtle background; not color-only) in `apps/web/src/index.css` (`.ledger-row--deduction`, `.ledger-row__deduction-badge`)
- [x] T018 [US2] Run US2 Vitest suites until T014–T015 pass: `npm run test -- tests/ledger/ArtistDeductionToggle.test.tsx tests/ledger/Editability.test.tsx`

**Checkpoint**: User Stories 1 and 2 both work independently — flagged rows visually distinct at a glance

---

## Phase 5: User Story 3 - Deduction flag respects event lifecycle (Priority: P2)

**Goal**: Toggle gated by `PRE_SHOW` lifecycle and column-aware permissions; error revert on failed save; server remains authoritative

**Independent Test**: Settled event hides toggle but shows badge; user without settlement permission on locked budget cannot toggle; stale save shows error and reverts checkbox

### Tests for User Story 3 (REQUIRED) ⚠️

- [x] T019 [P] [US3] Write failing Vitest tests for toggle hidden when `canEditStructure` false and when event status is `SETTLED` in `apps/web/tests/ledger/ArtistDeductionToggle.test.tsx`
- [x] T020 [P] [US3] Write failing Vitest test for checkbox revert after failed save (mock mutation error + refetch) in `apps/web/tests/pages/EventLedgerPage.test.tsx`

### Implementation for User Story 3

- [x] T021 [US3] Ensure deduction toggle renders only when `canEditStructure && blockType === 'EXPENSES'` while badge renders whenever flagged in `apps/web/src/components/ledger/LedgerRow.tsx`
- [x] T022 [US3] Verify `structuralError` banner and `refetch()` on deduction save failure in `apps/web/src/pages/EventLedgerPage.tsx` (fix gaps if T020 fails)
- [x] T023 [US3] Run US3 Vitest suites until T019–T020 pass: `npm run test -- tests/ledger/ArtistDeductionToggle.test.tsx tests/pages/EventLedgerPage.test.tsx`

**Checkpoint**: All user stories independently functional — lifecycle, permission, and error paths covered

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Coverage gate, quickstart validation, and final integration check

- [x] T024 [P] Run full ledger Vitest suite: `cd apps/web && npm run test:coverage -- tests/ledger/`
- [x] T025 [P] Run backend ledger tests: `dotnet test apps/api.tests/split-rail-api.tests.csproj -c Release --filter "FullyQualifiedName~Ledger"`
- [x] T026 Verify ≥80.0% line/branch coverage for backend and frontend via CI reporters (`dotnet test` coverlet → cobertura; `npm run test:coverage` Vitest → lcov); missing or unparseable reports FAIL
- [x] T027 Run quickstart scenarios A–G from `specs/018-artist-deduction-toggle-ui/quickstart.md` and check success checklist

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **User Stories (Phase 3–5)**: Depend on Foundational completion
  - US2 (visual) builds on US1 toggle data but is independently testable via static render tests
  - US3 (gating) can parallel with US2 after US1 toggle wiring confirmed
- **Polish (Phase 6)**: Depends on all user story phases

### User Story Dependencies

- **User Story 1 (P1)**: After Foundational — no dependency on US2/US3
- **User Story 2 (P2)**: After Foundational — badge tests can start in parallel with US1 implementation; full E2E needs flagged rows from US1
- **User Story 3 (P2)**: After Foundational — gating tests independent; integrates with US1 controlled checkbox

### Within Each User Story

- Tests written and FAIL before implementation
- Story complete before Polish phase

### Parallel Opportunities

- T002, T003 (Setup)
- T004, T007 (Foundational tests vs hook verify)
- T008, T009 (US1 tests)
- T014, T015 (US2 tests)
- T016, T017 (US2 implementation — different files)
- T019, T020 (US3 tests)
- T024, T025 (Polish test runs)
- After Phase 2: US2 CSS work (T017) can parallel US1 wiring (T010–T012)

---

## Parallel Example: User Story 2

```bash
# Launch US2 tests together:
Task: "Write failing Vitest tests for deduction-badge in apps/web/tests/ledger/ArtistDeductionToggle.test.tsx"
Task: "Write failing Vitest test for read-only badge in apps/web/tests/ledger/Editability.test.tsx"

# Launch US2 implementation in parallel:
Task: "Render badge and row class in apps/web/src/components/ledger/LedgerRow.tsx"
Task: "Add CSS in apps/web/src/index.css"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Toggle + add-row flag + recalc (quickstart Scenario A, D)
5. Demo if ready

### Incremental Delivery

1. Setup + Foundational → deal-math and hooks verified
2. User Story 1 → toggle persistence works (MVP)
3. User Story 2 → visual indication (product-visible completion for SPLR-29)
4. User Story 3 → lifecycle/permission hardening
5. Polish → coverage + quickstart sign-off

### Parallel Team Strategy

1. Team completes Setup + Foundational together
2. Once Foundational done:
   - Developer A: User Story 1 (toggle wiring)
   - Developer B: User Story 2 (badge + CSS) — can start test scaffolding immediately
   - Developer C: User Story 3 (gating tests) — after T010 lands
3. Polish together

---

## Notes

- Feature 013 (line-item CRUD) is a prerequisite; most mutation wiring already exists — tasks focus on gaps (visual indication, controlled toggle, test coverage)
- No backend schema or API route changes expected
- Badge MUST remain visible when toggle is hidden (Settled/Reconciled, read-only users)
- Avoid relying on color alone for deduction row styling (clarification + FR-005)
