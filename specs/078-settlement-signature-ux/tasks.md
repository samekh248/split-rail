---
description: "Task list for Settlement Signature Form UX and Drawing Performance feature"
---

# Tasks: Settlement Signature Form UX and Drawing Performance

**Input**: Design documents from `/specs/078-settlement-signature-ux/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/settlement-signature-ui.md, quickstart.md

**Tests**: REQUIRED per Constitution III. Every user story phase includes automated test tasks (write tests first, ensure they fail before implementation). Final Polish phase includes ≥80.0% frontend coverage gate.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Maps to user stories from spec.md (US1–US3)

## Path Conventions

- **Web app**: `apps/web/src/`, `apps/web/tests/`
- **Docs**: `specs/078-settlement-signature-ux/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm environment and design artifacts before implementation

- [x] T001 Verify feature branch `078-settlement-signature-ux` and read `specs/078-settlement-signature-ux/contracts/settlement-signature-ui.md`, `specs/078-settlement-signature-ux/data-model.md`, and `specs/078-settlement-signature-ux/research.md` for rendering and form-structure decisions

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish baseline test health before modifying settlement components

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T002 Run baseline settlement tests `cd apps/web && npm run test -- tests/settlement/SignaturePad.test.tsx tests/settlement/FinalizeSettlementPanel.test.tsx` and confirm green state before changes

**Checkpoint**: Foundation ready — existing settlement tests pass; safe to begin user story work

---

## Phase 3: User Story 1 - Recognizable signature capture form (Priority: P1) 🎯 MVP

**Goal**: Signature pad reads as a standard form field — labeled artist signature, bordered surface, "Sign here" placeholder, baseline cue, helper hint, and secondary clear button

**Independent Test**: Render `SignaturePad` (or finalize panel); confirm label, bordered surface, placeholder, baseline, hint, and clear button without submitting a settlement

### Tests for User Story 1 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T003 [P] [US1] Write failing tests for form DOM structure (label "Artist signature", `signature-pad__surface`, placeholder, baseline, hint) in `apps/web/tests/settlement/SignaturePad.test.tsx`
- [x] T004 [P] [US1] Write failing tests for placeholder visible when empty, hidden after stroke, and restored after clear in `apps/web/tests/settlement/SignaturePad.test.tsx`

### Implementation for User Story 1

- [x] T005 [US1] Restructure `apps/web/src/components/settlement/SignaturePad.tsx` markup per `specs/078-settlement-signature-ux/contracts/settlement-signature-ui.md` (`.form-field`, `useId` label association, `aria-describedby`, clear as `.btn-secondary`)
- [x] T006 [US1] Add `signature-pad*` BEM block styles (surface border, placeholder, baseline, hint, responsive canvas `width: 100%`, `touch-action: none`) in `apps/web/src/index.css` using design tokens only
- [x] T007 [US1] Run US1 tests `cd apps/web && npm run test -- tests/settlement/SignaturePad.test.tsx` and confirm form presentation assertions pass

**Checkpoint**: User Story 1 independently testable — signature area looks like a recognizable form field

---

## Phase 4: User Story 2 - Responsive signature drawing (Priority: P1)

**Goal**: Ink follows pointer/touch immediately with no degradation as stroke length or count grows

**Independent Test**: Draw continuous strokes in `SignaturePad`; automated spy confirms `clearRect` is not called on every `pointermove`; ink renders without lag during extended signing

### Tests for User Story 2 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T008 [P] [US2] Write failing perf regression test spying `clearRect` — simulated rapid `pointermove` must not invoke full redraw per event in `apps/web/tests/settlement/SignaturePad.test.tsx`
- [x] T009 [P] [US2] Write failing tests for multi-stroke drawing, pointer-leave stroke completion, and payload format unchanged (`btoa` JSON strokes) in `apps/web/tests/settlement/SignaturePad.test.tsx`

### Implementation for User Story 2

- [x] T010 [US2] Extract `applyStrokeStyle(ctx)` helper and remove `redraw()` from `handlePointerDown` and `handlePointerMove` in `apps/web/src/components/settlement/SignaturePad.tsx`
- [x] T011 [US2] Implement incremental `prev→curr` segment draw on `pointermove`; call full `redraw()` only on `finishStroke`, `clear`, and mount in `apps/web/src/components/settlement/SignaturePad.tsx`
- [x] T012 [US2] Run US2 tests `cd apps/web && npm run test -- tests/settlement/SignaturePad.test.tsx` and confirm performance and stroke continuity assertions pass

**Checkpoint**: User Stories 1 and 2 both work — form looks correct and drawing is responsive

---

## Phase 5: User Story 3 - Signature workflow remains intact (Priority: P2)

**Goal**: Finalize settlement rules unchanged — signature required, confirmation required, permission gating, payload compatible; pad disabled while finalize is pending

**Independent Test**: Attempt finalize with/without signature and confirmation; verify panel hidden without sign permission; confirm pad disabled when `isPending`

### Tests for User Story 3 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T013 [P] [US3] Write failing test that `FinalizeSettlementPanel` is not rendered when `useCanSignSettlement` returns false in `apps/web/tests/settlement/FinalizeSettlementPanel.test.tsx`
- [x] T014 [P] [US3] Write failing test that `SignaturePad` is disabled when `useFinalizeSettlement` reports `isPending: true` in `apps/web/tests/settlement/FinalizeSettlementPanel.test.tsx`

### Implementation for User Story 3

- [x] T015 [US3] Add `disabled?: boolean` prop to `apps/web/src/components/settlement/SignaturePad.tsx` — ignore pointer handlers and disable clear when true
- [x] T016 [US3] Pass `disabled={finalize.isPending}` to `SignaturePad` in `apps/web/src/components/settlement/FinalizeSettlementPanel.tsx`
- [x] T017 [US3] Run US3 tests `cd apps/web && npm run test -- tests/settlement/FinalizeSettlementPanel.test.tsx` and confirm workflow, permission, and pending-state assertions pass (existing signature-required and confirmation tests remain green)

**Checkpoint**: All three user stories independently functional — UX improved without weakening finalize gates

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Coverage gate, regression sweep, and quickstart validation

- [x] T018 [P] Run full settlement test suite `cd apps/web && npm run test -- tests/settlement/SignaturePad.test.tsx tests/settlement/FinalizeSettlementPanel.test.tsx`
- [x] T019 Verify ≥80.0% line/branch coverage on touched frontend files (`SignaturePad.tsx`, `FinalizeSettlementPanel.tsx`) via `cd apps/web && npm run test:coverage` (backend N/A for this feature); missing or unparseable reports FAIL
- [x] T020 Execute validation scenarios A–E in `specs/078-settlement-signature-ux/quickstart.md` and confirm expected outcomes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS all user stories**
- **User Story 1 (Phase 3)**: Depends on Foundational — **MVP (form presentation)**
- **User Story 2 (Phase 4)**: Depends on US1 markup structure in `SignaturePad.tsx` (extends same component)
- **User Story 3 (Phase 5)**: Depends on US1/US2 `SignaturePad` API; modifies `FinalizeSettlementPanel.tsx` only
- **Polish (Phase 6)**: Depends on all user stories complete

### User Story Dependencies

| Story | Priority | Depends on | Independent test |
|-------|----------|------------|------------------|
| US1 | P1 | Foundational (T002) | Form label, surface, placeholder, baseline, hint, clear |
| US2 | P1 | US1 (T007) | Incremental draw; no per-move full redraw |
| US3 | P2 | US1 (T007) | Permission gating, finalize rules, `disabled` while pending |

### Within Each User Story

- Tests written and failing before implementation
- `SignaturePad.tsx` form markup (US1) before draw-path refactor (US2)
- `disabled` prop (US3) after core pad behavior stable
- Story checkpoint before next priority

### Parallel Opportunities

- **Phase 3**: T003 ∥ T004 (same file, independent test cases — parallel authors or sequential edits)
- **Phase 4**: T008 ∥ T009 (same file, independent test cases)
- **Phase 5**: T013 ∥ T014 (same file, independent test cases)
- **Phase 6**: T018 can run while preparing T020 manual checks
- **Cross-story**: US3 panel tests (T013–T014) can be authored in parallel with US2 implementation (T010–T011) by different developers after US1 completes

---

## Parallel Example: User Story 1

```bash
# Launch US1 tests together (same file, independent describe blocks):
# T003 — form DOM structure tests in SignaturePad.test.tsx
# T004 — placeholder visibility tests in SignaturePad.test.tsx

# After T005–T006 implementation:
cd apps/web && npm run test -- tests/settlement/SignaturePad.test.tsx
```

---

## Parallel Example: User Story 3

```bash
# Launch US3 tests together:
# T013 — permission gating in FinalizeSettlementPanel.test.tsx
# T014 — isPending disables pad in FinalizeSettlementPanel.test.tsx

# After T015–T016 implementation:
cd apps/web && npm run test -- tests/settlement/FinalizeSettlementPanel.test.tsx
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001)
2. Complete Phase 2: Foundational (T002)
3. Complete Phase 3: User Story 1 (T003–T007)
4. **STOP and VALIDATE**: Signature area presents as a recognizable form field
5. Demo MVP before performance and workflow hardening

### Incremental Delivery

1. Foundational → baseline tests green
2. US1 → signature form presentation (MVP)
3. US2 → responsive incremental drawing (fixes reported lag)
4. US3 → finalize workflow preservation + pending guard
5. Polish → coverage gate + quickstart

### Suggested MVP Scope

**Phases 1–3 only** (T001–T007): delivers labeled, bounded signature form with placeholder and baseline. US2 adds the performance fix; US3 adds pending-disable and permission regression coverage.

---

## Notes

- Frontend-only: no `apps/api` tasks; backend coverage gate N/A
- No deploy scripts in scope (Constitution §X N/A)
- Signature payload format (`btoa(JSON.stringify(Point[][]))`) MUST remain unchanged (FR-008)
- Canvas ink stroke color `#111` retained per existing codebase exemption; form chrome uses design tokens only
- `decodeSignaturePayload` export unchanged — extend tests only if behavior touched
