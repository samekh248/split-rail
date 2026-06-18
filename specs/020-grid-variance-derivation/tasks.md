---
description: "Task list for Client-Side Ledger Variance Derivation feature"
---

# Tasks: Client-Side Ledger Variance Derivation

**Input**: Design documents from `/specs/020-grid-variance-derivation/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/grid-variance-derivation.md, quickstart.md

**Tests**: REQUIRED per Constitution III. Every user story phase includes automated test tasks (write first, ensure fail). Final phase includes ≥80.0% coverage gate.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story label ([US1]–[US3])

## Path Conventions

- Backend: `apps/api/`, `apps/api.tests/` (no changes expected)
- Frontend: `apps/web/src/`, `apps/web/tests/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm prerequisites and design artifacts before implementation

- [x] T001 Verify feature branch `020-grid-variance-derivation` and review design docs in `specs/020-grid-variance-derivation/`
- [x] T002 [P] Confirm `subtractMoney`, `isNonZeroVariance`, `compareMoney`, and `normalizeMoney` in `apps/web/src/lib/money.ts` meet derivation needs per `specs/020-grid-variance-derivation/contracts/grid-variance-derivation.md`
- [x] T003 [P] Confirm `LineItemDto` fields `qboActualValue`, `settlementValue`, `variance`, and `varianceFlagged` in `apps/web/src/types/generated-api.ts`; verify no API changes required

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core `deriveVariance` helper — MUST complete before UI wiring

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Tests for Foundational (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T004 [P] Write failing unit tests for `deriveVariance` (null inputs, zero, negative, boundary `0.01`, large values) in `apps/web/tests/lib/ledgerVariance.test.ts`

### Implementation for Foundational

- [x] T005 Implement `deriveVariance(qboActual, settlement)` with null-safe normalize → `subtractMoney` in `apps/web/src/lib/ledgerVariance.ts`
- [x] T006 Run foundational unit tests until T004 passes: `npm run test -- tests/lib/ledgerVariance.test.ts`

**Checkpoint**: `deriveVariance` exported and tested — user story phases can begin

---

## Phase 3: User Story 1 - See accurate variance derived in the grid (Priority: P1) 🎯 MVP

**Goal**: Variance column displays QBO actual minus settlement with decimal-safe derivation, two-decimal formatting, and non-zero highlighting

**Independent Test**: Render ledger rows with known QBO actual and settlement — each `variance-cell` shows derived difference; zero unflagged, non-zero flagged

### Tests for User Story 1 (REQUIRED) ⚠️

- [x] T007 [P] [US1] Write failing Vitest tests for derived display (zero, negative, `0.01` boundary) via new `qboActual`/`settlement`/`serverVariance` props in `apps/web/tests/ledger/VarianceCell.test.tsx`
- [x] T008 [P] [US1] Write failing Vitest test that `LedgerRow` passes `row.qboActualValue`, `row.settlementValue`, and `row.variance` to `VarianceCell` in `apps/web/tests/ledger/Editability.test.tsx` or new `apps/web/tests/ledger/LedgerRow.test.tsx`

### Implementation for User Story 1

- [x] T009 [US1] Update `VarianceCell` to accept `qboActual`, `settlement`, `serverVariance` and render `formatMoney(deriveVariance(...))` with `isNonZeroVariance` highlighting in `apps/web/src/components/ledger/VarianceCell.tsx`
- [x] T010 [US1] Update `LedgerRow` to pass row monetary fields to `VarianceCell` (remove direct `row.variance` passthrough) in `apps/web/src/components/ledger/LedgerRow.tsx`
- [x] T011 [US1] Run US1 Vitest suites until T007–T008 pass: `npm run test -- tests/ledger/VarianceCell.test.tsx tests/ledger/Editability.test.tsx`

**Checkpoint**: User Story 1 complete — grid variance cells derive from QBO actual minus settlement with correct display and highlighting

---

## Phase 4: User Story 2 - Client and server variance stay in agreement (Priority: P1)

**Goal**: `resolveVarianceDisplay` verifies client/server agreement; on mismatch display server value and flag from displayed amount

**Independent Test**: Unit tests show `agreesWithServer === true` when inputs match; intentional mismatch displays normalized `serverVariance` and flags follow displayed value

### Tests for User Story 2 (REQUIRED) ⚠️

- [x] T012 [P] [US2] Write failing unit tests for `resolveVarianceDisplay` (agreement, mismatch server fallback, `flagged` from displayed variance) in `apps/web/tests/lib/ledgerVariance.test.ts`
- [x] T013 [P] [US2] Write failing Vitest test for mismatch scenario (server variance differs from derived — cell shows server value) in `apps/web/tests/ledger/VarianceCell.test.tsx`

### Implementation for User Story 2

- [x] T014 [US2] Implement `resolveVarianceDisplay({ qboActual, settlement, serverVariance })` per contract in `apps/web/src/lib/ledgerVariance.ts`
- [x] T015 [US2] Refactor `VarianceCell` to use `resolveVarianceDisplay` for `displayVariance` and `flagged` in `apps/web/src/components/ledger/VarianceCell.tsx`
- [x] T016 [US2] Run US2 Vitest suites until T012–T013 pass: `npm run test -- tests/lib/ledgerVariance.test.ts tests/ledger/VarianceCell.test.tsx`

**Checkpoint**: User Stories 1 and 2 complete — dual computation with server authority on mismatch

---

## Phase 5: User Story 3 - Variance updates when settlement or actuals change (Priority: P2)

**Goal**: Variance re-derives on row data change; reconciled banner uses client resolver instead of raw `varianceFlagged`

**Independent Test**: Re-render `VarianceCell` with updated settlement — display updates; reconciled `LedgerGrid` shows banner when any row has non-zero derived variance

### Tests for User Story 3 (REQUIRED) ⚠️

- [x] T017 [P] [US3] Write failing Vitest test that `VarianceCell` updates displayed variance when `settlement` prop changes on rerender in `apps/web/tests/ledger/VarianceCell.test.tsx`
- [x] T018 [P] [US3] Write failing Vitest test that reconciled `LedgerGrid` shows `variance-banner` when derived variance is non-zero (not only `row.varianceFlagged`) in `apps/web/tests/ledger/LedgerGrid.test.tsx`

### Implementation for User Story 3

- [x] T019 [US3] Replace `row.varianceFlagged` scan with `resolveVarianceDisplay(...).flagged` per row in `apps/web/src/components/ledger/LedgerGrid.tsx`
- [x] T020 [US3] Audit ledger test fixtures — ensure mock rows include consistent `qboActualValue`, `settlementValue`, and `variance` in `apps/web/tests/ledger/LedgerGrid.test.tsx`, `apps/web/tests/ledger/Editability.test.tsx`, and `apps/web/tests/ledger/LineItemCrud.test.tsx`
- [x] T021 [US3] Run US3 Vitest suites until T017–T018 pass: `npm run test -- tests/ledger/VarianceCell.test.tsx tests/ledger/LedgerGrid.test.tsx`

**Checkpoint**: All user stories complete — live re-derive and reconciled banner aligned with client resolver

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Coverage gate, regression sweep, quickstart validation

- [x] T022 [P] Grep `apps/web/src/components/ledger/` for direct `row.variance` display bypass — confirm only `serverVariance` input to resolver remains
- [x] T023 Run full frontend ledger test suite: `cd apps/web && npm run test -- tests/ledger tests/lib/ledgerVariance.test.ts`
- [x] T024 Verify ≥80.0% line/branch coverage on touched frontend files via `cd apps/web && npm run test:coverage`; confirm `ledgerVariance.ts`, `VarianceCell.tsx`, `LedgerRow.tsx`, and `LedgerGrid.tsx` meet gate; missing or unparseable lcov FAIL
- [x] T025 Confirm backend unchanged — run `dotnet test apps/api.tests/split-rail-api.tests.csproj` (existing ledger variance integration paths remain green)
- [x] T026 Run manual validation scenarios A–E in `specs/020-grid-variance-derivation/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS** all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational (`deriveVariance`)
- **User Story 2 (Phase 4)**: Depends on US1 (`VarianceCell` wired; adds `resolveVarianceDisplay`)
- **User Story 3 (Phase 5)**: Depends on US2 (`resolveVarianceDisplay` for banner and rerender)
- **Polish (Phase 6)**: Depends on US1–US3

### User Story Dependencies

```text
Phase 2 (deriveVariance)
    └── US1 (VarianceCell + LedgerRow display)
            └── US2 (resolveVarianceDisplay + server fallback)
                    └── US3 (LedgerGrid banner + rerender)
```

### Parallel Opportunities

- **Phase 1**: T002 ∥ T003
- **Phase 3**: T007 ∥ T008 (tests, different files)
- **Phase 4**: T012 ∥ T013
- **Phase 5**: T017 ∥ T018
- **Phase 6**: T022 ∥ T023 (after US3)

### Parallel Example: User Story 1

```bash
# Write US1 tests in parallel:
# T007: apps/web/tests/ledger/VarianceCell.test.tsx
# T008: apps/web/tests/ledger/Editability.test.tsx (or LedgerRow.test.tsx)

# Then implement sequentially:
# T009 → T010 → T011
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (`deriveVariance`)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: `npm run test -- VarianceCell` — variance cells derive correctly
5. Demo reconciled ledger with derived variance column

### Incremental Delivery

1. Setup + Foundational → derivation helper ready
2. US1 → accurate derived display (MVP)
3. US2 → server agreement and mismatch fallback
4. US3 → banner + live update on row change
5. Polish → coverage + quickstart

### Parallel Team Strategy

With two developers after Foundational:

- **Developer A**: US1 (VarianceCell + LedgerRow)
- **Developer B**: US2 unit tests for `resolveVarianceDisplay` (can start writing failing tests while A finishes US1, implement after T015 unblocks)

---

## Notes

- No backend code changes — `LedgerService.ToLineItemDto` already computes server variance
- Highlighting MUST follow **displayed** variance (`flagged = isNonZeroVariance(displayVariance)`)
- Do not use JavaScript `number` in money derivation path (Constitution I)
- `[P]` tasks = different files, no incomplete-task dependencies
- Commit after each task or logical group
