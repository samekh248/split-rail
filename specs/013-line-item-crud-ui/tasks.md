---
description: "Task list for Production Line-Item CRUD UI feature"
---

# Tasks: Production Line-Item CRUD UI (Add/Edit/Delete/Reorder)

**Input**: Design documents from `/specs/013-line-item-crud-ui/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/line-item-crud-ui.md, quickstart.md

**Tests**: REQUIRED per Constitution III. Every user story phase includes automated test tasks (write first, ensure fail). Final phase includes ≥80.0% coverage gate.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story label ([US1]–[US4])

## Path Conventions

- Backend: `apps/api/`, `apps/api.tests/`
- Frontend: `apps/web/src/`, `apps/web/tests/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm environment and design artifacts before implementation

- [x] T001 Verify feature branch `dustin/splr-28-production-line-item-crud-ui-addeditdeletereorder` and review design docs in `specs/013-line-item-crud-ui/`
- [x] T002 [P] Confirm `CreateLineItemRequest`, `UpdateLineItemRequest`, and line-item hooks exist in `apps/web/src/types/generated-api.ts` and `apps/web/src/api/ledger.ts`
- [x] T003 [P] Review UI contract constraints in `specs/013-line-item-crud-ui/contracts/line-item-crud-ui.md` and validation rules in `specs/013-line-item-crud-ui/data-model.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Backend permission hardening and shared frontend hooks — MUST complete before user story UI work

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Tests for Foundational (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T004 Write failing integration tests for structural permission enforcement in `apps/api.tests/Integration/LineItemStructuralPermissionTests.cs` (delete without permission → 403; label-only update without permission → 403)
- [x] T005 [P] Write failing integration test `CreateLineItem_AfterLockBudget_WithSettlementValue_Returns201` in `apps/api.tests/Integration/LedgerStateMachineTests.cs`

### Implementation for Foundational

- [x] T006 Implement `ValidateLineItemStructuralEditAsync` and invoke from `CreateLineItemAsync`, `UpdateLineItemAsync`, and `DeleteLineItemAsync` in `apps/api/Services/LedgerService.cs`
- [x] T007 Run backend ledger integration tests until T004–T005 pass: `dotnet test apps/api.tests/split-rail-api.tests.csproj --filter "FullyQualifiedName~Ledger"`
- [x] T008 [P] Create `useCanEditLedgerStructure` hook in `apps/web/src/hooks/useCanEditLedgerStructure.ts` (maps `PRE_SHOW` + lock state to `canViewFinancials` / `canEditSettlement`)
- [x] T009 [P] Create `reorderLineItems.ts` neighbor swap helper in `apps/web/src/lib/reorderLineItems.ts`

**Checkpoint**: Backend structural permissions enforced; frontend shared hooks ready — user story phases can begin

---

## Phase 3: User Story 1 - Add a real line item to the ledger (Priority: P1) 🎯 MVP

**Goal**: Replace dev-only sample button with per-block "Add row" form that creates Revenue/Expenses rows with correct lifecycle-aware value column

**Independent Test**: On editable Pre-Show event, click "Add row" on Revenue section, enter label + value, save — row appears with updated totals; dev sample button absent

### Tests for User Story 1 (REQUIRED) ⚠️

- [x] T010 [P] [US1] Write failing Vitest tests for planning vs settlement add modes and label validation in `apps/web/tests/ledger/AddLineItemForm.test.tsx`
- [x] T011 [P] [US1] Write failing Vitest test asserting dev sample button removed in `apps/web/tests/pages/EventLedgerPage.test.tsx`

### Implementation for User Story 1

- [x] T012 [US1] Create `AddLineItemForm` component in `apps/web/src/components/ledger/AddLineItemForm.tsx` (label required; proforma when unlocked; settlement required when locked; deduction checkbox for Expenses; `sortOrder = max + 1`)
- [x] T013 [US1] Add per-block "Add row" button and form toggle to `apps/web/src/components/ledger/BlockSection.tsx` (Revenue and Expenses only)
- [x] T014 [US1] Thread `canEditStructure`, `isBudgetLocked`, and `onAddLineItem` through `apps/web/src/components/ledger/LedgerGrid.tsx`
- [x] T015 [US1] Wire `useCreateLineItem`, `useCanEditLedgerStructure`, error handling, and remove `event-ledger-page__dev-tools` aside in `apps/web/src/pages/EventLedgerPage.tsx`

**Checkpoint**: User Story 1 fully functional — add row works in planning and settlement modes; dev button gone

---

## Phase 4: User Story 2 - Delete a line item (Priority: P2)

**Goal**: Delete rows from the grid with confirmation; wire unused `useDeleteLineItem`

**Independent Test**: On editable event, delete a row with confirm — row removed and totals recalculate; cancel leaves row unchanged

### Tests for User Story 2 (REQUIRED) ⚠️

- [x] T016 [P] [US2] Write failing Vitest tests for delete confirmation and successful removal in `apps/web/tests/ledger/LineItemCrud.test.tsx`

### Implementation for User Story 2

- [x] T017 [US2] Add delete button with `window.confirm` to `apps/web/src/components/ledger/LedgerRow.tsx` (visible when `canEditStructure`)
- [x] T018 [US2] Wire `useDeleteLineItem`, confirm flow, and error/refetch handling in `apps/web/src/pages/EventLedgerPage.tsx`
- [x] T019 [US2] Thread `onDeleteLineItem` through `apps/web/src/components/ledger/LedgerGrid.tsx` and `apps/web/src/components/ledger/BlockSection.tsx`

**Checkpoint**: User Stories 1 and 2 both work independently

---

## Phase 5: User Story 3 - Reorder line items within a block (Priority: P3)

**Goal**: Move-up/move-down controls persist `sortOrder` within block boundaries

**Independent Test**: Move a row down in a multi-row block, reload page — order persists; boundary buttons disabled

### Tests for User Story 3 (REQUIRED) ⚠️

- [x] T020 [P] [US3] Write failing Vitest tests for move-up/down boundary disable and swap behavior in `apps/web/tests/ledger/LineItemCrud.test.tsx`

### Implementation for User Story 3

- [x] T021 [US3] Add move-up and move-down buttons with boundary disable to `apps/web/src/components/ledger/LedgerRow.tsx`
- [x] T022 [US3] Implement reorder handler using `reorderLineItems.ts` + sequential `useUpdateLineItem` PUTs and conflict refetch in `apps/web/src/pages/EventLedgerPage.tsx`
- [x] T023 [US3] Thread `onMoveLineItem` through `apps/web/src/components/ledger/LedgerGrid.tsx` and `apps/web/src/components/ledger/BlockSection.tsx`

**Checkpoint**: Reorder persists across reload; boundaries respected

---

## Phase 6: User Story 4 - Edit a row's label inline (Priority: P3)

**Goal**: Inline label edit and artist-deduction toggle on expense rows without delete-and-recreate

**Independent Test**: Edit label inline and toggle deduction flag — changes persist after reload; deductions total updates

### Tests for User Story 4 (REQUIRED) ⚠️

- [x] T024 [P] [US4] Write failing Vitest tests for inline label save and deduction toggle in `apps/web/tests/ledger/Editability.test.tsx`

### Implementation for User Story 4

- [x] T025 [US4] Add inline label input and expense deduction checkbox to `apps/web/src/components/ledger/LedgerRow.tsx` (when `canEditStructure`)
- [x] T026 [US4] Wire label/deduction save handlers via `useUpdateLineItem` + recalculate in `apps/web/src/pages/EventLedgerPage.tsx`

**Checkpoint**: All four user stories independently functional

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Lifecycle gating verification, coverage gate, end-to-end validation

- [x] T027 [P] Extend settled/reconciled structural control absence tests in `apps/web/tests/pages/EventLedgerPage.test.tsx`
- [x] T028 [P] Run frontend test suite with coverage: `cd apps/web && npm run test:coverage`
- [x] T029 [P] Run backend tests with coverage: `dotnet test apps/api.tests/split-rail-api.tests.csproj -c Release --collect:"XPlat Code Coverage"`
- [x] T030 Verify ≥80.0% line/branch coverage on backend and frontend independently; missing or unparseable reports FAIL
- [x] T031 Run quickstart validation scenarios A–G from `specs/013-line-item-crud-ui/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS all user stories**
- **User Stories (Phases 3–6)**: All depend on Foundational completion
  - Recommended sequential order: US1 → US2 → US3 → US4 (each builds on shared components)
  - US2–US4 can start in parallel after US1 if different developers own separate files
- **Polish (Phase 7)**: Depends on all user stories complete

### User Story Dependencies

| Story | Depends on | Independent test |
|-------|------------|------------------|
| US1 (P1) | Foundational | Add row from Revenue header; dev button absent |
| US2 (P2) | Foundational (+ US1 for full page context) | Delete with confirm |
| US3 (P3) | Foundational (+ US1 for rows to reorder) | Reorder persists on reload |
| US4 (P3) | Foundational (+ US1 for rows to edit) | Label/deduction inline edit |

### Within Each User Story

- Tests written and failing before implementation
- Components before page wiring
- Story checkpoint before next priority

### Parallel Opportunities

- **Phase 1**: T002 ∥ T003
- **Phase 2**: T004 ∥ T005 (tests); T008 ∥ T009 (after T007 or alongside T006 if backend/frontend split)
- **Phase 3**: T010 ∥ T011 (tests)
- **Phases 4–6**: Test tasks marked [P] can run in parallel with prior story implementation if files differ
- **Phase 7**: T027 ∥ T028 ∥ T029

---

## Parallel Example: User Story 1

```bash
# Launch US1 tests together:
Task T010: "Write failing Vitest tests in apps/web/tests/ledger/AddLineItemForm.test.tsx"
Task T011: "Write failing Vitest test in apps/web/tests/pages/EventLedgerPage.test.tsx"

# After tests fail, implement in order T012 → T013 → T014 → T015
```

---

## Parallel Example: Foundational

```bash
# Backend track:
Task T004 → T005 → T006 → T007

# Frontend track (parallel once T008/T009 have no backend dependency):
Task T008: "Create useCanEditLedgerStructure.ts"
Task T009: "Create reorderLineItems.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (**critical**)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Add row in planning + settlement modes; dev button gone
5. Demo/deploy MVP

### Incremental Delivery

1. Setup + Foundational → shared infrastructure ready
2. US1 → add row MVP → demo
3. US2 → delete → demo
4. US3 → reorder → demo
5. US4 → inline label/deduction → demo
6. Polish → coverage + quickstart → merge-ready

### Parallel Team Strategy

1. Team completes Setup + Foundational together
2. Once Foundational done:
   - Developer A: US1 + US2 (page + row actions)
   - Developer B: US3 + US4 (row edit + reorder helper)
3. Polish phase together

---

## Notes

- Use string money via `parseMoneyInput` / `formatMoney` — no JS `number` for monetary values
- Import types only from `apps/web/src/types/generated-api.ts`
- Settlement-phase create: `proformaValue: "0.00"`, required `settlementValue`
- On 409 conflict: refetch ledger, show error — no silent overwrite
- Commit after each task or logical group
