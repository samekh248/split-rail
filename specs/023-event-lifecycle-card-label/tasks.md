---
description: "Task list for event lifecycle and card label utilities (SPLR-64)"
---

# Tasks: Event Lifecycle & Card Label Utilities

**Input**: Design documents from `/specs/023-event-lifecycle-card-label/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/event-lifecycle-utilities.md, quickstart.md

**Tests**: REQUIRED per Constitution III. Each user story phase includes Vitest tasks (write tests first, ensure they fail before implementation). Final Polish phase enforces ≥80.0% line/branch coverage on touched frontend files via `npm run test:coverage` (Vitest → lcov). No backend changes expected; backend coverage gate N/A.

**Organization**: Tasks grouped by user story (US1–US4). Frontend-only vertical slice through `apps/web/`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1–US4 (maps to user stories in spec.md)
- All paths are repo-relative

## Path Conventions

- Utilities: `apps/web/src/venue/eventLifecycle.ts`, `apps/web/src/venue/eventCardLabel.ts`
- Consumer: `apps/web/src/components/event/EventCombobox.tsx`, `apps/web/src/venue/eventSelection.ts`
- Tests: `apps/web/tests/venue/eventLifecycle.test.ts`, `apps/web/tests/venue/eventCardLabel.test.ts`, `apps/web/tests/components/event/EventCombobox.test.tsx`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm directory layout and contract reference before utility work.

- [x] T001 [P] Verify `apps/web/src/venue/` exists and is the target colocation path per plan.md (alongside `eventSelection.ts`, `activeEventStorage.ts`)
- [x] T002 [P] Add shared golden-matrix fixture constants (rows G1–G8 from `specs/023-event-lifecycle-card-label/contracts/event-lifecycle-utilities.md`) in `apps/web/tests/venue/eventLifecycle.test.ts` as exported `LIFECYCLE_GOLDEN_MATRIX` for reuse by `eventCardLabel.test.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core lifecycle phase resolver and permission booleans. **Blocks US1, US3, and US4 consumer migration.**

**⚠️ CRITICAL**: No card-label or combobox migration work begins until this phase completes.

- [x] T003 Add failing table-driven tests for `resolveLifecyclePhase`, `isPreShow`, `canEditEventMetadata`, `canDeleteEvent`, and `isEventFullyLocked` covering golden rows G1–G8 in `apps/web/tests/venue/eventLifecycle.test.ts`
- [x] T004 Implement `EventLifecyclePhase` union and lifecycle helpers (`resolveLifecyclePhase`, `isPreShow`, `canEditEventMetadata`, `canDeleteEvent`, `isEventFullyLocked`) in `apps/web/src/venue/eventLifecycle.ts` per `specs/023-event-lifecycle-card-label/contracts/event-lifecycle-utilities.md`
- [x] T005 Make all lifecycle golden-matrix tests pass in `apps/web/tests/venue/eventLifecycle.test.ts`

**Checkpoint**: US2 lifecycle utilities green in isolation; `eventCardLabel.ts` may import `resolveLifecyclePhase`.

---

## Phase 3: User Story 2 - Centralized lifecycle permission rules (Priority: P1)

**Goal**: Single pure module answers phase resolution and metadata edit/delete eligibility from status + budget-lock flag alone.

**Independent Test**: `cd apps/web && npm run test -- eventLifecycle` — all G1–G8 phase and permission columns pass without rendering UI.

### Tests for User Story 2 (REQUIRED) ⚠️

> **NOTE: Covered by T003/T005 in Foundational phase; extend here if edge-case gaps found**

- [x] T006 [P] [US2] Add explicit edge-case tests for null status, unrecognized status strings, and undefined `isBudgetLocked` on Pre-Show in `apps/web/tests/venue/eventLifecycle.test.ts`

### Implementation for User Story 2

- [x] T007 [US2] Add optional convenience overloads accepting `Pick<EventResponse, 'status' | 'isBudgetLocked'>` wrapping primitive signatures in `apps/web/src/venue/eventLifecycle.ts` for combobox ergonomics

**Checkpoint**: US2 complete; permission booleans match feature 015 rules (metadata edit on all Pre-Show; delete only on unlocked Pre-Show).

---

## Phase 4: User Story 1 - Consistent lifecycle status on event cards (Priority: P1) 🎯 MVP

**Goal**: Status badges show correct human-readable labels for all lifecycle phases, including **"Budget locked"** for Pre-Show with locked budget.

**Independent Test**: `cd apps/web && npm run test -- eventCardLabel EventCombobox` — badge labels match golden matrix; combobox renders "Budget locked" for locked Pre-Show.

### Tests for User Story 1 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T008 [P] [US1] Add failing badge-label tests (golden matrix badge column G1–G8) in `apps/web/tests/venue/eventCardLabel.test.ts`
- [x] T009 [P] [US1] Add failing combobox test: Pre-Show + `isBudgetLocked: true` badge reads "Budget locked" (not "Planning") in `apps/web/tests/components/event/EventCombobox.test.tsx`

### Implementation for User Story 1

- [x] T010 [US1] Implement `formatStatusBadgeLabel(status, isBudgetLocked?)` in `apps/web/src/venue/eventCardLabel.ts` delegating to `resolveLifecyclePhase` from `apps/web/src/venue/eventLifecycle.ts`
- [x] T011 [US1] Replace `formatEventStatus(selectedEvent.status)` and list-row status formatting with `formatStatusBadgeLabel(event.status, event.isBudgetLocked)` in `apps/web/src/components/event/EventCombobox.tsx`

**Checkpoint**: MVP — correct status badges in event combobox; US1 utility and component tests green.

---

## Phase 5: User Story 3 - Action hint labels for locked events (Priority: P2)

**Goal**: Centralized edit/delete hint strings ("Budget locked" vs "Event locked"); null when action permitted.

**Independent Test**: `cd apps/web && npm run test -- eventCardLabel` — hint columns match golden matrix; no hints when actions allowed.

### Tests for User Story 3 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T012 [P] [US3] Add failing action-hint tests (golden matrix `editHint` and `deleteHint` columns G1–G8) in `apps/web/tests/venue/eventCardLabel.test.ts`

### Implementation for User Story 3

- [x] T013 [US3] Implement `resolveEditActionHint(status, isBudgetLocked?)` and `resolveDeleteActionHint(status, isBudgetLocked?)` in `apps/web/src/venue/eventCardLabel.ts`
- [x] T014 [US3] Replace inline "Budget locked" / "Event locked" hint JSX in `apps/web/src/components/event/EventCombobox.tsx` with calls to hint utilities (render hint only when non-null)

**Checkpoint**: US3 complete; combobox hints sourced from utilities, not hardcoded strings.

---

## Phase 6: User Story 4 - Automated verification and migration cleanup (Priority: P1)

**Goal**: Remove duplicate lifecycle logic from `eventSelection.ts`; consolidate tests; combobox uses lifecycle permission helpers; no duplicate assertions.

**Independent Test**: Full suite passes; `rg` finds no legacy helpers in `eventSelection.ts`; `eventSelection.test.ts` covers filter/resolve only.

### Tests for User Story 4 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T015 [P] [US4] Extend `apps/web/tests/components/event/EventCombobox.test.tsx`: settled/reconciled events show "Event locked" hint and hide edit/delete; unlocked Pre-Show shows edit/delete when `canManageEvents`
- [x] T016 [P] [US4] Trim lifecycle gating assertions from `apps/web/tests/venue/eventSelection.test.ts` (retain filter/resolve tests only)

### Implementation for User Story 4

- [x] T017 [US4] Remove `formatEventStatus`, `canEditEvent`, and `canDeleteEvent` from `apps/web/src/venue/eventSelection.ts` (keep `filterEvents` and `resolveActiveEventId` only)
- [x] T018 [US4] Migrate edit/delete affordance checks in `apps/web/src/components/event/EventCombobox.tsx` to `canEditEventMetadata` and `canDeleteEvent` from `apps/web/src/venue/eventLifecycle.ts`
- [x] T019 [US4] Update any remaining imports of removed helpers across `apps/web/src/**` (if any beyond `EventCombobox.tsx`)

**Checkpoint**: Single source of truth for lifecycle rules and labels; no duplicate implementations (SC-004).

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Coverage gate, duplicate-logic audit, and quickstart validation.

- [x] T020 [P] Verify no duplicate lifecycle/label logic: run Scenario F from `specs/023-event-lifecycle-card-label/quickstart.md` (`rg "formatEventStatus|canEditEvent|canDeleteEvent" apps/web/src/`)
- [x] T021 Run quickstart validation scenarios A–E from `specs/023-event-lifecycle-card-label/quickstart.md` (`npm run test -- eventLifecycle eventCardLabel eventSelection EventCombobox`)
- [x] T022 Verify ≥80.0% line/branch coverage on touched frontend files via `cd apps/web && npm run test:coverage -- eventLifecycle eventCardLabel eventSelection EventCombobox` (Vitest → lcov); missing or unparseable reports FAIL; backend N/A

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS** US1, US3, US4
- **US2 (Phase 3)**: Depends on Foundational (extends lifecycle module)
- **US1 (Phase 4)**: Depends on Foundational (`eventLifecycle.ts` for phase delegation)
- **US3 (Phase 5)**: Depends on US1 (`eventCardLabel.ts` module exists; may parallelize hint tests with US1 badge impl if file conflicts avoided)
- **US4 (Phase 6)**: Depends on US1 + US3 (combobox fully migrated before removing legacy helpers)
- **Polish (Phase 7)**: Depends on all user stories complete

### User Story Dependencies

| Story | Priority | Depends on | Delivers independently |
|-------|----------|------------|------------------------|
| US2 | P1 | Foundational | Lifecycle phase + permission booleans |
| US1 | P1 | Foundational | Status badge labels + combobox badge fix |
| US3 | P2 | US1 (shared module) | Action hint strings |
| US4 | P1 | US1, US3 | Legacy cleanup + consolidated tests |

### Within Each User Story

- Tests MUST fail before implementation
- Utility module before consumer migration
- Story checkpoint before next priority

### Parallel Opportunities

- T001 + T002 (Setup)
- T008 + T009 (US1 tests, different files)
- T012 (US3 tests) can start once T010 lands `eventCardLabel.ts` stub
- T015 + T016 (US4 tests, different files)
- T020 parallel with T021 prep

---

## Parallel Example: User Story 1

```bash
# Launch US1 tests together (different files):
Task T008: "Add failing badge-label tests in apps/web/tests/venue/eventCardLabel.test.ts"
Task T009: "Add failing combobox budget-locked badge test in apps/web/tests/components/event/EventCombobox.test.tsx"

# After T010 implements formatStatusBadgeLabel:
Task T011: "Migrate EventCombobox.tsx badges to formatStatusBadgeLabel"
```

---

## Parallel Example: User Story 4

```bash
# Launch US4 test updates together:
Task T015: "Extend EventCombobox.test.tsx for settled/reconciled lock hints"
Task T016: "Trim lifecycle assertions from eventSelection.test.ts"

# Then sequential migration:
Task T017 → T018 → T019
```

---

## Implementation Strategy

### MVP First (User Story 1 + Foundational)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (lifecycle module)
3. Complete Phase 4: User Story 1 (status badges + combobox badge fix)
4. **STOP and VALIDATE**: `npm run test -- eventLifecycle eventCardLabel EventCombobox`
5. Demo correct "Budget locked" badge to stakeholders

### Incremental Delivery

1. Setup + Foundational → lifecycle utilities ready
2. US1 → correct badges in combobox (MVP visible fix)
3. US3 → centralized action hints
4. US4 → remove legacy helpers; single import path
5. Polish → coverage gate + quickstart

### Suggested MVP Scope

**Foundational + US1** (T001–T011): Delivers the user-visible bug fix (budget-locked badge) and core badge utility with tests.

---

## Notes

- Do not modify `useCanEditLedgerStructure` — role-aware gating stays in hooks (FR-008)
- Use generated `EventStatus` from `@/types/generated-api` only (Constitution VI)
- Golden matrix G1–G8 is canonical; both utility test files MUST stay in sync with `contracts/event-lifecycle-utilities.md`
- Commit after each task or logical group
- Total tasks: **22** (Setup 2, Foundational 3, US2 2, US1 4, US3 3, US4 5, Polish 3)
