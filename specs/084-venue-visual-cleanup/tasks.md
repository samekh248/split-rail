# Tasks: Venue Visual Cleanup

**Input**: Design documents from `/specs/084-venue-visual-cleanup/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: REQUIRED per Constitution III and FR-009. Every user story phase includes automated Vitest + RTL (and CSS contract) tasks. Polish verifies ≥80.0% line/branch coverage on changed frontend code. Backend and Playwright are out of scope for this frontend-only layout change.

**Organization**: Tasks are grouped by user story so each story can be implemented and tested independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Frontend: `apps/web/src/`, `apps/web/tests/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm the existing event-workspace and section-action surfaces this feature will change

- [x] T001 Review `apps/web/src/pages/EventWorkspacePage.tsx`, `apps/web/src/pages/EventLedgerPage.tsx`, `apps/web/src/components/festival/FestivalModeCard.tsx`, and `apps/web/src/index.css` (`.festival-mode-card`, `.event-ledger-page`, `.event-ledger-page__toolbar`) against `specs/084-venue-visual-cleanup/contracts/event-workspace-layout.md`
- [x] T002 [P] Confirm the in-scope vs out-of-scope primary-action inventory in `specs/084-venue-visual-cleanup/research.md` D3 against `apps/web/src/components/qbo/QboIntegrationCard.tsx`, `apps/web/src/components/settlement/FinalizeSettlementPanel.tsx`, `apps/web/src/pages/VenuesPage.tsx`, and `apps/web/src/pages/FestivalItineraryPage.tsx`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared CSS inset and section-header action pattern used by every user story

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Write failing CSS contract coverage in `apps/web/tests/theme/sectionHeader.test.ts` for `.event-workspace` (`max-width: 1200px`, centered, shared horizontal padding and gap) and `.section-header` / `.section-header__actions` (space-between, `margin-left: auto` on actions, wrap, `768px` stack with `justify-content: flex-end`)
- [x] T004 Add `.event-workspace` rules in `apps/web/src/index.css` (max-width 1200px, `margin: 0 auto`, desktop padding matching current ledger inset, vertical gap, `768px` padding `1rem`)
- [x] T005 Add `.section-header` and `.section-header__actions` rules in `apps/web/src/index.css` per `specs/084-venue-visual-cleanup/contracts/event-workspace-layout.md`
- [x] T006 Move `.event-ledger-page` `max-width` / extra horizontal padding onto `.event-workspace` in `apps/web/src/index.css` so `.event-ledger-page` no longer adds a competing inset
- [x] T007 Remove page-level extra margin from `.festival-mode-card` in `apps/web/src/index.css` so the shared `.event-workspace` gap is the only sibling spacing

**Checkpoint**: Foundation ready — user story implementation can begin

---

## Phase 3: User Story 1 - Consistent festival section spacing (Priority: P1) 🎯 MVP

**Goal**: Festival card and ledger share one event-workspace inset so the festival section is no longer closer to the shell edges

**Independent Test**: Open a standard event and a festival-enabled event at desktop and narrow widths; festival and ledger outer left/right edges match with no horizontal overflow

### Tests for User Story 1 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T008 [P] [US1] Extend `apps/web/tests/pages/EventWorkspacePage.test.tsx` so that when the ledger is shown, `data-testid="festival-mode-card"` and `data-testid="event-ledger-page"` are descendants of `data-testid="event-workspace"`
- [x] T009 [P] [US1] Add `apps/web/tests/components/festival/FestivalModeCard.test.tsx` covering hidden / convert-prompt / active-festival states without introducing a competing outer layout class on `data-testid="festival-mode-card"`

### Implementation for User Story 1

- [x] T010 [US1] Wrap `FestivalModeCard` and `EventLedgerPage` in `<div className="event-workspace" data-testid="event-workspace">` in `apps/web/src/pages/EventWorkspacePage.tsx` when `showLedger` is true
- [x] T011 [US1] Keep `apps/web/src/components/festival/FestivalModeCard.tsx` on card-only classes (`.festival-mode-card` / `--active`) with no extra page max-width or horizontal page margin
- [x] T012 [US1] Keep `apps/web/src/pages/EventLedgerPage.tsx` as `event-ledger-page` without a second max-width wrapper now that inset lives on `.event-workspace`

**Checkpoint**: Festival/ledger shared inset is independently verifiable (FR-001, FR-002, SC-001)

---

## Phase 4: User Story 2 - Predictable primary action placement (Priority: P1)

**Goal**: Authenticated section-level primary actions sit on the right of their header or action row, including wrap-friendly narrow behavior

**Independent Test**: Review in-scope authenticated section primaries at desktop width (all trailing-edge) and after header wrap (still associated, no overlap or empty action holes)

### Tests for User Story 2 (REQUIRED) ⚠️

- [x] T013 [P] [US2] Extend `apps/web/tests/components/qbo/QboIntegrationCard.test.tsx` so Connect / Reconnect (`data-testid="qbo-connect-button"`) renders inside a `.section-header__actions` cluster rather than a left-aligned body row
- [x] T014 [P] [US2] Extend `apps/web/tests/settlement/FinalizeSettlementPanel.test.tsx` so `data-testid="finalize-settlement-btn"` is in a right-aligned action row after the required signature/confirm inputs
- [x] T015 [P] [US2] Extend `apps/web/tests/components/festival/FestivalModeCard.test.tsx` so `data-testid="festival-convert-button"` stays on the trailing edge of `.festival-mode-card__prompt`

### Implementation for User Story 2

- [x] T016 [P] [US2] Apply `.section-header` / `.section-header__actions` in `apps/web/src/components/qbo/QboIntegrationCard.tsx` so Connect / Reconnect is the right-aligned section primary and secondary QBO actions stay grouped
- [x] T017 [P] [US2] Right-align the Finalize Settlement primary in `apps/web/src/components/settlement/FinalizeSettlementPanel.tsx` using `.section-header__actions` (keep the button after signature + confirm; do not lift it above required inputs)
- [x] T018 [US2] Compose `.section-header` onto already-correct headers only if needed (`apps/web/src/components/ledger/LedgerGrid.tsx` `.ledger-grid__header`, `apps/web/src/pages/VenuesPage.tsx`, `apps/web/src/pages/FestivalItineraryPage.tsx`) without moving out-of-scope auth, empty-state, modal, or inline compact controls

**Checkpoint**: In-scope section primaries are independently verifiable as right-aligned (FR-003–FR-005, SC-002, SC-004)

---

## Phase 5: User Story 3 - Contextual Sync Now action (Priority: P2)

**Goal**: Event-level Sync Now lives in the ledger hero action cluster instead of a floating toolbar, with unchanged permission/pending behavior

**Independent Test**: With sync permission, Sync Now appears beside the event’s ledger hero actions; without permission, no empty toolbar remains; pending label does not jump the layout

### Tests for User Story 3 (REQUIRED) ⚠️

- [x] T019 [P] [US3] Extend `apps/web/tests/pages/EventLedgerPage.test.tsx` so `.event-ledger-page__toolbar` is absent, `data-testid="workspace-focus-sync"` still exists when the ledger hero renders, and `data-testid="sync-now-button"` is omitted when sync permission is false
- [x] T020 [P] [US3] Extend `apps/web/tests/ledger/LedgerGrid.test.tsx` so an injected Sync Now control renders in the hero `.section-header__actions` cluster with Lock Budget (when visible) and the cluster is omitted/empty-height-free when neither action is shown
- [x] T021 [P] [US3] Keep permission/pending contracts green in `apps/web/tests/qbo/SyncNowButton.test.tsx` (`null` without permission, `btn-primary--compact`, `Syncing…` when pending)

### Implementation for User Story 3

- [x] T022 [US3] Accept an optional header-actions slot (or `SyncNowButton` child) on `apps/web/src/components/ledger/LedgerGrid.tsx` and render it in `.section-header__actions` next to Lock Budget
- [x] T023 [US3] Pass `SyncNowButton` from `apps/web/src/pages/EventLedgerPage.tsx` into the ledger hero and delete the standalone `.event-ledger-page__toolbar` markup
- [x] T024 [US3] Place `data-testid="workspace-focus-sync"` on the ledger hero/header in `apps/web/src/components/ledger/LedgerGrid.tsx` (or the EventLedgerPage wiring) so `apps/web/src/lib/workspaceFocusScroll.ts` keeps `WORKSPACE_FOCUS_TARGETS.sync = '[data-testid="workspace-focus-sync"]'`
- [x] T025 [US3] Delete unused `.event-ledger-page__toolbar` rules from `apps/web/src/index.css`
- [x] T026 [US3] Confirm `apps/web/tests/lib/workspaceFocusScroll.test.ts` still expects the same sync selector and that `?focus=sync` still resolves after the toolbar removal

**Checkpoint**: Sync Now is independently verifiable in the event action area (FR-006, FR-007, SC-003)

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Coverage gate, type safety, regression, and quickstart validation across all stories

- [x] T027 [P] Run `npx tsc --noEmit -p apps/web/tsconfig.app.json` and fix any type errors introduced by layout/prop changes
- [x] T028 [P] Run focused Vitest suites `apps/web/tests/pages/EventWorkspacePage.test.tsx`, `apps/web/tests/pages/EventLedgerPage.test.tsx`, `apps/web/tests/components/festival/FestivalModeCard.test.tsx`, `apps/web/tests/ledger/LedgerGrid.test.tsx`, `apps/web/tests/qbo/SyncNowButton.test.tsx`, `apps/web/tests/theme/sectionHeader.test.ts`, `apps/web/tests/components/qbo/QboIntegrationCard.test.tsx`, and `apps/web/tests/settlement/FinalizeSettlementPanel.test.tsx` until green
- [x] T029 Verify ≥80.0% line/branch coverage for changed frontend files via `npm run test:coverage` in `apps/web` (backend N/A; missing/unparseable reports FAIL)
- [x] T030 Confirm `apps/web/tests/theme/buttonMigration.test.ts` still passes and that auth, empty-state retry, and modal primaries were not relocated
- [x] T031 Walk `specs/084-venue-visual-cleanup/quickstart.md` scenarios 1–4 against the running web app and record any remaining gaps

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational — MVP
- **User Story 2 (Phase 4)**: Depends on Foundational — independently testable; recommended after US1 when working solo because both touch event-workspace visuals
- **User Story 3 (Phase 5)**: Depends on Foundational; uses the ledger hero action cluster from US2’s header pattern and sits inside US1’s wrapper — independently testable at the `LedgerGrid` / `EventLedgerPage` level
- **Polish (Phase 6)**: Depends on US1–US3 completion

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational — no dependency on US2/US3
- **User Story 2 (P1)**: Can start after Foundational — do not wait on US3; avoid editing `LedgerGrid.tsx` action children until US3 if staffed in parallel (T018 compose-class only)
- **User Story 3 (P2)**: Can start after Foundational — sequential after US2 is safer because T022/T023 share `LedgerGrid.tsx` with T018

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Shared CSS (Phase 2) before page/component markup
- Wrapper markup (US1) before Sync Now relocation (US3) when working sequentially
- Story complete before moving to the next priority when delivering MVP first

### Parallel Opportunities

- T001 and T002 during Setup
- T008 and T009 (US1 tests)
- T013, T014, and T015 (US2 tests)
- T016 and T017 (US2 implementation; different component files)
- T019, T020, and T021 (US3 tests)
- T027 and T028 during Polish
- After Foundational, US1 and US2 can proceed in parallel if US2 skips `LedgerGrid.tsx` until US3

Same-file caution: `apps/web/src/index.css` is sequential across T004–T007 and T025. `apps/web/src/components/ledger/LedgerGrid.tsx` is sequential across T018 and T022. `apps/web/src/pages/EventLedgerPage.tsx` is sequential across T012 and T023.

---

## Parallel Example: User Story 1

```bash
# Author failing tests together:
Task: "Extend EventWorkspacePage.test.tsx for event-workspace wrapper"
Task: "Add FestivalModeCard.test.tsx state coverage"

# Then implement the wrapper:
Task: "Wrap FestivalModeCard + EventLedgerPage in EventWorkspacePage.tsx"
```

---

## Parallel Example: User Story 2

```bash
# Author failing tests together:
Task: "Extend QboIntegrationCard.test.tsx for right-aligned Connect"
Task: "Extend FinalizeSettlementPanel.test.tsx for right-aligned Finalize"
Task: "Extend FestivalModeCard.test.tsx for trailing convert action"

# Then implement independent components together:
Task: "Apply section-header actions in QboIntegrationCard.tsx"
Task: "Right-align FinalizeSettlementPanel.tsx primary"
```

---

## Parallel Example: User Story 3

```bash
# Author failing tests together:
Task: "Extend EventLedgerPage.test.tsx (no toolbar, focus target, no empty sync)"
Task: "Extend LedgerGrid.test.tsx hero action cluster"
Task: "Keep SyncNowButton.test.tsx permission/pending contracts"

# Then implement sequentially (same files):
Task: "Add header-actions slot in LedgerGrid.tsx"
Task: "Move SyncNowButton from EventLedgerPage.tsx toolbar into LedgerGrid"
Task: "Retarget workspace-focus-sync and delete toolbar CSS"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Festival and ledger share one inset
5. Demo the event workspace if ready

### Incremental Delivery

1. Complete Setup + Foundational → shared CSS ready
2. Add User Story 1 → Test independently → Demo (MVP)
3. Add User Story 2 → Test independently → Demo
4. Add User Story 3 → Test independently → Demo
5. Polish coverage + quickstart
6. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (`EventWorkspacePage.tsx`, festival tests)
   - Developer B: User Story 2 (`QboIntegrationCard.tsx`, `FinalizeSettlementPanel.tsx`) — do not edit `LedgerGrid.tsx` action children
   - Developer C: User Story 3 after T018, or after coordinating the `LedgerGrid.tsx` handoff
3. Stories complete and integrate independently at checkpoints

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same-file conflicts, relocating auth/empty-state/modal buttons
- No API, DTO, or `generated-api.ts` changes (Constitution VI)
