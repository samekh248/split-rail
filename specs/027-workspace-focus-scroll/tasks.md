---
description: "Task list for Workspace Focus Scroll Targets (SPLR-67)"
---

# Tasks: Workspace Focus Scroll Targets

**Input**: Design documents from `/specs/027-workspace-focus-scroll/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/workspace-focus-scroll-ui.md, quickstart.md

**Tests**: REQUIRED per Constitution III. Each user story phase includes Vitest + RTL tasks (write tests first, ensure they fail before implementation). Final Polish phase enforces ≥80.0% line/branch coverage on touched frontend files via `npm run test:coverage` (Vitest → lcov). No backend changes; backend coverage gate N/A.

**Organization**: Tasks grouped by user story (US1–US4). Frontend-only vertical slice through `apps/web/`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1–US4 (maps to user stories in spec.md)
- All paths are repo-relative

## Path Conventions

- Route hook: `apps/web/src/lib/appRoute.ts`
- Scroll lib: `apps/web/src/lib/workspaceFocusScroll.ts`
- Pages: `apps/web/src/pages/EventWorkspacePage.tsx`, `apps/web/src/pages/EventLedgerPage.tsx`
- Tests: `apps/web/tests/lib/workspaceFocusScroll.test.ts`, `apps/web/tests/lib/appRoute.test.ts`, `apps/web/tests/pages/EventLedgerPage.test.tsx`, `apps/web/tests/pages/EventWorkspacePage.test.tsx`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm prerequisites and align on UI contracts before code changes.

- [x] T001 Verify branch `027-workspace-focus-scroll` and design docs in `specs/027-workspace-focus-scroll/` per plan.md
- [x] T002 [P] Review UI contract in `specs/027-workspace-focus-scroll/contracts/workspace-focus-scroll-ui.md` and data model in `specs/027-workspace-focus-scroll/data-model.md`
- [x] T003 [P] Confirm prerequisites on branch: `023-split-dashboard-routes` (`useEventWorkspaceRoute`, `navigateToEventWorkspace`), `025-event-card` (`WorkspaceFocus`, quick links), `026-dashboard-overview-page` (overview quick link navigation)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Focus scroll library and route hook that re-reads query params. **Blocks all user stories.**

**⚠️ CRITICAL**: No user story work begins until this phase completes.

### Tests for Foundational (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T004 [P] Write failing type-guard, target-map, scrollIntoView, and keyboard-focus tests in `apps/web/tests/lib/workspaceFocusScroll.test.ts` per contracts/workspace-focus-scroll-ui.md
- [x] T005 [P] Write failing hook test for query-only URL change (same pathname, new `?focus=`) in `apps/web/tests/lib/appRoute.test.ts` per research.md §2

### Implementation for Foundational

- [x] T006 Implement `WORKSPACE_FOCUS_TARGETS`, `isRecognizedWorkspaceFocus`, and `scrollToWorkspaceFocus` in `apps/web/src/lib/workspaceFocusScroll.ts` per contracts/workspace-focus-scroll-ui.md target map
- [x] T007 Update `useEventWorkspaceRoute()` in `apps/web/src/lib/appRoute.ts` to re-read `getWorkspaceFocusFromUrl()` on every `popstate` (not only pathname)
- [x] T008 Run `npm run test -- tests/lib/workspaceFocusScroll.test.ts` until green in `apps/web`
- [x] T009 Run `npm run test -- tests/lib/appRoute.test.ts` until green in `apps/web`

**Checkpoint**: Scroll helper and route hook ready — all five focus values mappable

---

## Phase 3: User Story 1 — Jump to the deal builder from an overview quick link (Priority: P1) 🎯 MVP

**Goal**: `?focus=deal` scrolls artist deal panel into view with keyboard focus after ledger loads.

**Independent Test**: Open workspace URL with `?focus=deal`; assert scroll helper invoked for `artist-deal-panel` after ledger render (quickstart Scenario A).

### Tests for User Story 1 (REQUIRED) ⚠️

- [x] T010 [P] [US1] Write failing `focus="deal"` scroll-effect test (mock `scrollToWorkspaceFocus`) in `apps/web/tests/pages/EventLedgerPage.test.tsx` per quickstart Scenario A
- [x] T011 [P] [US1] Write failing focus prop wiring test from route hook in `apps/web/tests/pages/EventWorkspacePage.test.tsx`

### Implementation for User Story 1

- [x] T012 [US1] Add optional `focus?: WorkspaceFocus | null` prop and post-load `useEffect` calling `scrollToWorkspaceFocus` in `apps/web/src/pages/EventLedgerPage.tsx`
- [x] T013 [US1] Parse `focus` via `isRecognizedWorkspaceFocus` and pass `ledgerFocus` to `EventLedgerPage` in `apps/web/src/pages/EventWorkspacePage.tsx`
- [x] T014 [US1] Confirm US1 tests pass in `apps/web/tests/pages/EventLedgerPage.test.tsx` and `apps/web/tests/pages/EventWorkspacePage.test.tsx`

**Checkpoint**: MVP — deal focus scroll works end-to-end from URL to ledger

---

## Phase 4: User Story 2 — Jump to settlement and signature workflows from quick links (Priority: P2)

**Goal**: `?focus=settlement` and `?focus=signature` scroll to ledger grid and finalize settlement panel respectively.

**Independent Test**: Navigate with each focus param; assert correct scroll targets invoked (quickstart Scenario B).

### Tests for User Story 2 (REQUIRED) ⚠️

- [x] T015 [P] [US2] Write failing `focus="settlement"` scroll-effect test in `apps/web/tests/pages/EventLedgerPage.test.tsx`
- [x] T016 [P] [US2] Write failing `focus="signature"` scroll-effect test (conditional `finalize-settlement-panel`) in `apps/web/tests/pages/EventLedgerPage.test.tsx`

### Implementation for User Story 2

- [x] T017 [US2] Verify settlement (`ledger-grid`) and signature (`finalize-settlement-panel`) selectors and deferred-scroll when panel absent in `apps/web/src/lib/workspaceFocusScroll.ts` and `apps/web/src/pages/EventLedgerPage.tsx`
- [x] T018 [US2] Confirm US2 tests pass in `apps/web/tests/pages/EventLedgerPage.test.tsx`

**Checkpoint**: Settlement and signature focus targets verified independently

---

## Phase 5: User Story 3 — Jump to variance review and sync controls from quick links (Priority: P3)

**Goal**: `?focus=variance` scrolls variance banner; `?focus=sync` scrolls sync toolbar + unmapped banner region.

**Independent Test**: Navigate with variance and sync focus params; assert targets invoked (quickstart Scenario C).

### Tests for User Story 3 (REQUIRED) ⚠️

- [x] T019 [P] [US3] Write failing `focus="variance"` test (conditional banner, no error when absent) in `apps/web/tests/pages/EventLedgerPage.test.tsx`
- [x] T020 [P] [US3] Write failing `focus="sync"` scroll-effect test in `apps/web/tests/pages/EventLedgerPage.test.tsx`

### Implementation for User Story 3

- [x] T021 [US3] Add `data-testid="workspace-focus-sync"` wrapper around toolbar and `UnmappedBanner` in `apps/web/src/pages/EventLedgerPage.tsx` per contracts/workspace-focus-scroll-ui.md
- [x] T022 [US3] Confirm `sync` entry in `WORKSPACE_FOCUS_TARGETS` points to `workspace-focus-sync` in `apps/web/src/lib/workspaceFocusScroll.ts`
- [x] T023 [US3] Confirm US3 tests pass in `apps/web/tests/pages/EventLedgerPage.test.tsx`

**Checkpoint**: Variance and sync focus targets complete

---

## Phase 6: User Story 4 — Workspace loads normally when focus is missing or unrecognized (Priority: P4)

**Goal**: Invalid/absent focus is no-op; combobox and venue switch strip `?focus=`; same-event re-navigation re-applies scroll.

**Independent Test**: Open URLs without focus, with invalid focus, switch event/venue, re-click quick link (quickstart Scenarios D–G).

### Tests for User Story 4 (REQUIRED) ⚠️

- [x] T024 [P] [US4] Write failing invalid/missing focus no-op tests in `apps/web/tests/pages/EventLedgerPage.test.tsx`
- [x] T025 [P] [US4] Write failing combobox-strips-focus URL test in `apps/web/tests/pages/EventWorkspacePage.test.tsx` per clarification Q1
- [x] T026 [P] [US4] Write failing venue-switch-strips-focus URL test in `apps/web/tests/pages/EventWorkspacePage.test.tsx` per clarification Q2
- [x] T027 [P] [US4] Write failing same-event re-navigation re-scroll test in `apps/web/tests/pages/EventWorkspacePage.test.tsx` per clarification Q4 and FR-005a

### Implementation for User Story 4

- [x] T028 [US4] Ensure `EventWorkspacePage.tsx` passes `null` focus for unrecognized values and combobox/venue navigation omits third arg to `navigateToEventWorkspace` in `apps/web/src/pages/EventWorkspacePage.tsx`
- [x] T029 [US4] Confirm US4 tests pass in `apps/web/tests/pages/EventWorkspacePage.test.tsx` and `apps/web/tests/pages/EventLedgerPage.test.tsx`

**Checkpoint**: Graceful fallback and focus stripping behavior verified

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Coverage gate, manual validation, and cross-story regression.

- [x] T030 Run full affected test suites: `npm run test -- tests/lib/workspaceFocusScroll.test.ts tests/lib/appRoute.test.ts tests/pages/EventLedgerPage.test.tsx tests/pages/EventWorkspacePage.test.tsx` in `apps/web`
- [x] T031 [P] Verify ≥80.0% line/branch coverage on touched frontend files via `npm run test:coverage` in `apps/web`; missing or unparseable lcov report FAILs (Constitution III)
- [x] T032 Execute manual validation scenarios A–H in `specs/027-workspace-focus-scroll/quickstart.md`
- [x] T033 [P] Confirm no backend files modified; document Playwright E2E deferral to SPLR-68 in PR description if applicable

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS all user stories**
- **User Stories (Phases 3–6)**: Depend on Foundational completion; sequential P1 → P4 recommended (shared files)
- **Polish (Phase 7)**: Depends on all user stories complete

### User Story Dependencies

- **US1 (P1)**: After Foundational — introduces focus prop and scroll effect (MVP)
- **US2 (P2)**: After US1 — adds settlement/signature test coverage (same scroll effect)
- **US3 (P3)**: After US1 — sync wrapper markup + variance/sync tests
- **US4 (P4)**: After US1 — edge-case and strip-behavior tests (hook fix in Foundational enables re-nav)

### Within Each User Story

- Tests written and failing before implementation
- Story checkpoint before next priority

### Parallel Opportunities

- T002 + T003 (Setup review)
- T004 + T005 (Foundational tests — different files)
- T010 + T011 (US1 tests)
- T015 + T016 (US2 tests)
- T019 + T020 (US3 tests)
- T024 + T025 + T026 + T027 (US4 tests — different cases, same files but parallelizable by scenario)
- T031 + T033 (Polish)

---

## Parallel Example: User Story 4

```bash
# Launch all US4 test tasks together (different test cases):
Task T024: invalid/missing focus no-op in EventLedgerPage.test.tsx
Task T025: combobox strips focus in EventWorkspacePage.test.tsx
Task T026: venue switch strips focus in EventWorkspacePage.test.tsx
Task T027: same-event re-navigation in EventWorkspacePage.test.tsx
```

---

## Parallel Example: Foundational

```bash
# Launch foundational tests in parallel:
Task T004: workspaceFocusScroll.test.ts
Task T005: appRoute.test.ts hook search tracking
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: quickstart Scenario A (`?focus=deal`)
5. Demo deal quick link from overview if 026 is on branch

### Incremental Delivery

1. Setup + Foundational → scroll lib + route hook ready
2. US1 → deal focus (MVP)
3. US2 → settlement + signature targets verified
4. US3 → sync wrapper + variance/sync
5. US4 → invalid focus + strip + re-nav edge cases
6. Polish → coverage gate + manual quickstart

### Parallel Team Strategy

1. Team completes Setup + Foundational together
2. After Foundational:
   - Developer A: US1 + US2 (EventLedgerPage tests)
   - Developer B: US3 (sync wrapper) + US4 (EventWorkspacePage strip/re-nav tests)
3. Merge and run Polish phase together

---

## Notes

- All five `WorkspaceFocus` values defined in `apps/web/src/lib/eventCardQuickLinks.ts` — do not duplicate
- Playwright overview → workspace E2E deferred to SPLR-68
- Re-navigation same event (FR-005a) depends on T007 route hook fix
- Keyboard focus: first focusable in target region; no-op if none (edge case in spec)
