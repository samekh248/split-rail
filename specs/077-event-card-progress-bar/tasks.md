---
description: "Task list for Event Card Lifecycle Progress Bar feature"
---

# Tasks: Event Card Lifecycle Progress Bar

**Input**: Design documents from `/specs/077-event-card-progress-bar/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/event-card-progress-bar-ui.md, quickstart.md

**Tests**: REQUIRED per Constitution III. Every user story phase includes automated test tasks (write tests first, ensure they fail before implementation). Final Polish phase includes ≥80.0% frontend coverage gate.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Maps to user stories from spec.md (US1–US4)

## Path Conventions

- **Web app**: `apps/web/src/`, `apps/web/tests/`
- **Docs**: `specs/077-event-card-progress-bar/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm environment and design artifacts before implementation

- [x] T001 Verify feature branch `077-event-card-progress-bar` and read `specs/077-event-card-progress-bar/contracts/event-card-progress-bar-ui.md` plus `specs/077-event-card-progress-bar/data-model.md` for milestone resolution rules

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Pure milestone utility that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T002 [P] Write failing unit tests for `resolveEventCardProgressPosition` covering all contract fixture rows in `apps/web/tests/lib/eventCardProgress.test.ts`
- [x] T003 Implement `apps/web/src/lib/eventCardProgress.ts` with `EventCardProgressMilestone`, `EventCardProgressPosition`, `resolveEventCardProgressPosition`, and milestone label map (reuse date helpers from `apps/web/src/lib/eventLifecycle.ts` or extract shared utils)
- [x] T004 Run `cd apps/web && npm run test -- tests/lib/eventCardProgress.test.ts` and confirm all milestone matrix cases pass

**Checkpoint**: Foundation ready — milestone resolution utility is tested and stable

---

## Phase 3: User Story 1 - See event journey at a glance (Priority: P1) 🎯 MVP

**Goal**: Every dashboard `EventCard` shows a bottom-mounted progress bar with correct active milestone for hold, confirmed, show-day, post-event, and cancelled states

**Independent Test**: Render `EventCard` fixtures for each lifecycle state; confirm `data-testid="event-card-progress-{eventId}"` at bottom of card and active bubble matches `resolveEventCardProgressPosition` output

### Tests for User Story 1 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T005 [P] [US1] Write failing tests for base `EventCardProgressBar` render, fill width, and active milestone class in `apps/web/tests/components/dashboard/EventCardProgressBar.test.tsx`
- [x] T006 [P] [US1] Write failing tests asserting progress bar mounts as last child of `EventCard` article in `apps/web/tests/components/dashboard/EventCard.test.tsx`

### Implementation for User Story 1

- [x] T007 [US1] Create `apps/web/src/components/dashboard/EventCardProgressBar.tsx` with track, dynamic fill width, four milestone bubbles, `role="progressbar"`, and contract `data-testid` patterns
- [x] T008 [US1] Integrate `EventCardProgressBar` as last child of `<article>` in `apps/web/src/components/dashboard/EventCard.tsx` passing `bookingPlacementStatus`, `eventDate`, `eventId`, and `compact`
- [x] T009 [US1] Add minimal layout styles for `event-card__progress`, `event-card__progress-track`, and `event-card__progress-fill` in `apps/web/src/index.css`
- [x] T010 [US1] Run US1 tests (`EventCardProgressBar.test.tsx`, `EventCard.test.tsx`) and confirm bar presence and milestone resolution assertions pass

**Checkpoint**: User Story 1 independently testable — cards show correct journey position at a glance

---

## Phase 4: User Story 2 - Distinguish milestones with bubble markers (Priority: P1)

**Goal**: Four labeled milestone bubbles with active, completed, and upcoming visual states plus screen-reader text for current stage

**Independent Test**: Inspect progress bar DOM; verify four bubbles with state classes, inline labels on full cards, and descriptive `aria-label` on bar and bubbles

### Tests for User Story 2 (REQUIRED) ⚠️

- [x] T011 [P] [US2] Add failing tests for bubble `--active`, `--completed`, `--upcoming`, and `--cancelled` modifier classes in `apps/web/tests/components/dashboard/EventCardProgressBar.test.tsx`
- [x] T012 [P] [US2] Add failing tests for inline milestone labels on full (non-compact) cards and bar-level accessible name in `apps/web/tests/components/dashboard/EventCardProgressBar.test.tsx`

### Implementation for User Story 2

- [x] T013 [US2] Implement bubble state class logic and inline `<span class="event-card__progress-label">` for full cards in `apps/web/src/components/dashboard/EventCardProgressBar.tsx`
- [x] T014 [US2] Add per-bubble `aria-label`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, and stage description `aria-label` on progress container in `apps/web/src/components/dashboard/EventCardProgressBar.tsx`
- [x] T015 [US2] Run US2 tests in `apps/web/tests/components/dashboard/EventCardProgressBar.test.tsx` and confirm bubble markers and accessibility assertions pass

**Checkpoint**: User Stories 1 and 2 both work — journey position and milestone distinction are legible

---

## Phase 5: User Story 3 - Brand-aligned gradient styling (Priority: P2)

**Goal**: Progress bar fill uses Montana High Country design-token gradient; cancelled and contrast states meet brand and WCAG expectations

**Independent Test**: Render progress bar; confirm fill uses `var(--color-accent-orange)` → `var(--color-primary-brown)` gradient with no off-brand hex literals; cancelled bar fully de-emphasized

### Tests for User Story 3 (REQUIRED) ⚠️

- [x] T016 [P] [US3] Add failing test asserting progress fill and track styles reference design tokens only (extend `apps/web/tests/components/dashboard/EventCardProgressBar.test.tsx` or `apps/web/tests/theme/EventCard.theme.test.tsx`)

### Implementation for User Story 3

- [x] T017 [US3] Implement token-based gradient on `.event-card__progress-fill` and muted track on `.event-card__progress-track` in `apps/web/src/index.css`
- [x] T018 [US3] Implement `.event-card__progress--cancelled` de-emphasized styles (no fill, all bubbles muted) in `apps/web/src/index.css`
- [x] T019 [US3] Add compact variant sizing and proportional bubble/label scaling in `apps/web/src/index.css` under `.event-card__progress--compact`
- [x] T020 [US3] Run US3 styling tests and verify active milestone contrast against card background per project WCAG standards

**Checkpoint**: Progress bar visually matches brand theme with accessible state contrast

---

## Phase 6: User Story 4 - Compact cards and permission-safe rendering (Priority: P3)

**Goal**: Compact cards show bubbles with hover/focus/tap tooltips; progress bar renders regardless of quick-link permission filtering

**Independent Test**: Render `EventCard` with `compact={true}`; verify bubbles only, tooltip on hover/focus/tap, dismiss on outside tap; render with denied permissions and confirm bar still present

### Tests for User Story 4 (REQUIRED) ⚠️

- [x] T021 [P] [US4] Add failing tests for compact bubble-only layout, hover/focus tooltip, tap-toggle, and outside-dismiss behavior in `apps/web/tests/components/dashboard/EventCardProgressBar.test.tsx`
- [x] T022 [P] [US4] Add failing test that progress bar renders when all phase quick links are permission-filtered in `apps/web/tests/components/dashboard/EventCard.test.tsx`

### Implementation for User Story 4

- [x] T023 [US4] Implement compact tooltip state (`openTooltipId`, hover/focus/tap handlers, outside-click dismiss, `stopPropagation` on bubble buttons) in `apps/web/src/components/dashboard/EventCardProgressBar.tsx`
- [x] T024 [US4] Verify dashboard overview card contexts do not clip progress bar (transparent card rules) in `apps/web/src/index.css` under `.dashboard-overview` / `.dashboard-zone__cards`
- [x] T025 [US4] Run US4 tests and confirm compact tooltip and permission-safe rendering assertions pass

**Checkpoint**: All four user stories independently functional across full and compact dashboard cards

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Coverage gate, regression sweep, and quickstart validation

- [x] T026 [P] Run full feature test suite: `cd apps/web && npm run test -- tests/lib/eventCardProgress.test.ts tests/components/dashboard/EventCardProgressBar.test.tsx tests/components/dashboard/EventCard.test.tsx`
- [x] T027 Verify ≥80.0% line/branch coverage on touched frontend files via `cd apps/web && npm run test:coverage` (backend N/A for this feature); missing or unparseable reports FAIL
- [x] T028 Execute validation scenarios A–F in `specs/077-event-card-progress-bar/quickstart.md` and confirm expected outcomes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS all user stories**
- **User Story 1 (Phase 3)**: Depends on Foundational — **MVP**
- **User Story 2 (Phase 4)**: Depends on US1 component existing (extends same `EventCardProgressBar.tsx`)
- **User Story 3 (Phase 5)**: Depends on US1 bar structure (styles layer)
- **User Story 4 (Phase 6)**: Depends on US1 component; tooltip builds on US2 bubble markup
- **Polish (Phase 7)**: Depends on all desired user stories complete

### User Story Dependencies

| Story | Priority | Depends on | Independent test |
|-------|----------|------------|------------------|
| US1 | P1 | Foundational (T004) | Bar at card bottom + correct active milestone |
| US2 | P1 | US1 (T010) | Bubble states + inline labels + a11y |
| US3 | P2 | US1 (T010) | Token gradient + cancelled styling |
| US4 | P3 | US1 (T010), US2 bubbles | Compact tooltips + permission-safe bar |

### Within Each User Story

- Tests written and failing before implementation
- Utility (Phase 2) before component (Phase 3+)
- Component logic before CSS polish where split across phases
- Story checkpoint before next priority

### Parallel Opportunities

- **Phase 2**: T002 can start before T003 (TDD: tests first)
- **Phase 3**: T005 ∥ T006 (different test files)
- **Phase 4**: T011 ∥ T012 (same file but independent test cases — sequential edit or parallel authors)
- **Phase 6**: T021 ∥ T022 (different test files)
- **Phase 7**: T026 parallel with prep for T028
- **Cross-story**: US3 (CSS) and US4 (tooltips) can overlap after US1 completes if staffed separately — US4 needs US2 bubble markup

---

## Parallel Example: User Story 1

```bash
# Launch US1 tests together (different files):
# T005 — apps/web/tests/components/dashboard/EventCardProgressBar.test.tsx
# T006 — apps/web/tests/components/dashboard/EventCard.test.tsx

# After T007–T009 implementation:
cd apps/web && npm run test -- tests/components/dashboard/EventCardProgressBar.test.tsx tests/components/dashboard/EventCard.test.tsx
```

---

## Parallel Example: User Story 4

```bash
# Launch US4 tests together:
# T021 — EventCardProgressBar.test.tsx (compact tooltips)
# T022 — EventCard.test.tsx (permission filtering)

# After T023 implementation:
cd apps/web && npm run test -- tests/components/dashboard/EventCardProgressBar.test.tsx tests/components/dashboard/EventCard.test.tsx
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001)
2. Complete Phase 2: Foundational (T002–T004)
3. Complete Phase 3: User Story 1 (T005–T010)
4. **STOP and VALIDATE**: Dashboard cards show bottom progress bar with correct milestone
5. Demo MVP before styling polish

### Incremental Delivery

1. Foundational → milestone utility ready
2. US1 → journey at a glance (MVP)
3. US2 → bubble markers and accessibility
4. US3 → brand gradient and cancelled styling
5. US4 → compact tooltips and permission safety
6. Polish → coverage gate + quickstart

### Suggested MVP Scope

**Phases 1–3 only** (T001–T010): delivers core progress bar on all dashboard event cards with correct milestone resolution. US2–US4 add polish, brand gradient, compact tooltips, and full a11y without changing milestone logic.

---

## Notes

- Frontend-only: no `apps/api` tasks; backend coverage gate N/A
- No deploy scripts in scope (Constitution §X N/A)
- Progress bar is read-only — no navigation or booking mutations from bar interactions
- Hold 1 and Hold 2 share identical bar position; tier shown on existing booking badge only
- Mini-calendar chips and combobox rows explicitly out of scope
