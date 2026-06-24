---
description: "Task list for Event Card with quick links and placeholder booking status"
---

# Tasks: Event Card with Quick Links and Placeholder Booking Status

**Input**: Design documents from `/specs/025-event-card/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/event-card-ui.md, quickstart.md

**Tests**: REQUIRED per Constitution III. Each user story phase includes Vitest + RTL tasks (write tests first, ensure they fail before implementation). Final Polish phase enforces ≥80.0% line/branch coverage on touched frontend files via `npm run test:coverage` (Vitest → lcov). No backend changes; backend coverage gate N/A.

**Organization**: Tasks grouped by user story (US1–US4). Frontend-only vertical slice through `apps/web/`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1–US4 (maps to user stories in spec.md)
- All paths are repo-relative

## Path Conventions

- Component: `apps/web/src/components/dashboard/EventCard.tsx`
- Lib helpers: `apps/web/src/lib/eventCardQuickLinks.ts`, `eventCardVariance.ts`, `pinnedEventStorage.ts`
- Prerequisite libs (SPLR-64): `apps/web/src/lib/eventLifecycle.ts`, `eventCardLabels.ts`
- Styles: `apps/web/src/index.css`
- Tests: `apps/web/tests/components/dashboard/EventCard.test.tsx`, `apps/web/tests/lib/eventCard*.test.ts`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm prerequisites and align on UI contracts before code changes.

- [x] T001 Verify SPLR-63 / `023-split-dashboard-routes` and design docs are available on branch `025-event-card` per spec.md Dependencies
- [x] T002 [P] Review UI contract in `specs/025-event-card/contracts/event-card-ui.md` and props model in `specs/025-event-card/data-model.md`
- [x] T003 [P] Ensure `apps/web/src/components/dashboard/` directory exists for `EventCard.tsx`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Merge SPLR-64 lifecycle utilities and implement pure lib helpers with unit tests. **Blocks all user stories.**

**⚠️ CRITICAL**: No user story work begins until this phase completes.

### Tests for Foundational (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T004 Merge or rebase SPLR-64; confirm `apps/web/src/lib/eventLifecycle.ts` and `apps/web/src/lib/eventCardLabels.ts` exist and existing SPLR-64 unit tests pass
- [x] T005 [P] Write failing phase/permission/fallback matrix tests in `apps/web/tests/lib/eventCardQuickLinks.test.ts` per research.md R3
- [x] T006 [P] Write failing negative-variance aggregation tests in `apps/web/tests/lib/eventCardVariance.test.ts` per contracts/event-card-ui.md
- [x] T007 [P] Write failing localStorage pin read/write/toggle tests in `apps/web/tests/lib/pinnedEventStorage.test.ts` per data-model.md

### Implementation for Foundational

- [x] T008 Implement `resolveQuickLinks` and `WorkspaceFocus` types in `apps/web/src/lib/eventCardQuickLinks.ts` per contracts/event-card-ui.md
- [x] T009 [P] Implement `eventHasNegativeVariance` in `apps/web/src/lib/eventCardVariance.ts` using `ledgerVariance.ts` and `money.ts`
- [x] T010 [P] Implement pin get/set/toggle helpers in `apps/web/src/lib/pinnedEventStorage.ts`
- [x] T011 Run `npm run test -- tests/lib/eventCardQuickLinks.test.ts tests/lib/eventCardVariance.test.ts tests/lib/pinnedEventStorage.test.ts` until green

**Checkpoint**: Foundation ready — lifecycle utils importable; pure helpers tested

---

## Phase 3: User Story 1 — Scan event essentials on the dashboard (Priority: P1) 🎯 MVP

**Goal**: Compact card showing event title, formatted date, and placeholder booking-status preview with tooltip.

**Independent Test**: Render `EventCard` with fixture event; assert title, date, and booking badge with tooltip visible; placeholders when title/date missing.

### Tests for User Story 1 (REQUIRED) ⚠️

- [x] T012 [P] [US1] Write failing summary and placeholder tests in `apps/web/tests/components/dashboard/EventCard.test.tsx` per quickstart Scenario A

### Implementation for User Story 1

- [x] T013 [US1] Create `EventCardProps` and article shell (`data-testid="event-card-{eventId}"`) in `apps/web/src/components/dashboard/EventCard.tsx`
- [x] T014 [US1] Render title, formatted date, and booking preview badge with tooltip via `eventCardLabels` in `apps/web/src/components/dashboard/EventCard.tsx`
- [x] T015 [P] [US1] Add `.event-card` BEM layout styles in `apps/web/src/index.css`
- [x] T016 [US1] Confirm US1 tests pass in `apps/web/tests/components/dashboard/EventCard.test.tsx`

**Checkpoint**: MVP card renders event summary without quick links, alerts, or pin

---

## Phase 4: User Story 2 — Jump to the right workflow from the card (Priority: P2)

**Goal**: Phase-appropriate quick links with correct `onQuickLink` focus payloads; permission filtering and Open workspace fallback.

**Independent Test**: Render cards for Pre-Show, Night Of, Post-Show, and unknown phase fixtures; assert link labels, hidden unauthorized links, fallback behavior, and callback `(venueId, eventId, focus)`.

### Tests for User Story 2 (REQUIRED) ⚠️

- [x] T017 [P] [US2] Write failing phase quick-link matrix and focus payload tests in `apps/web/tests/components/dashboard/EventCard.test.tsx` per quickstart Scenario B
- [x] T018 [P] [US2] Write failing permission hide and Open workspace fallback tests in `apps/web/tests/components/dashboard/EventCard.test.tsx` per quickstart Scenario C

### Implementation for User Story 2

- [x] T019 [US2] Render quick-link nav using `deriveLifecyclePhase(event)` + `resolveQuickLinks` in `apps/web/src/components/dashboard/EventCard.tsx`
- [x] T020 [US2] Wire link button clicks to `onQuickLink(venueId, eventId, focus?)` without importing navigation helpers in `apps/web/src/components/dashboard/EventCard.tsx` (FR-009)
- [x] T021 [US2] Confirm US2 tests pass in `apps/web/tests/components/dashboard/EventCard.test.tsx`

**Checkpoint**: Quick links work per lifecycle phase with permission gating

---

## Phase 5: User Story 3 — Notice financial and operational alerts on the card (Priority: P3)

**Goal**: Red variance warning badge and bottleneck alert chips when derivation rules fire; no false positives.

**Independent Test**: Render with/without negative-variance `lineItems` and bottleneck-triggering events; assert badge/chip visibility.

### Tests for User Story 3 (REQUIRED) ⚠️

- [x] T022 [P] [US3] Write failing variance badge and bottleneck chip tests in `apps/web/tests/components/dashboard/EventCard.test.tsx` per quickstart Scenario D

### Implementation for User Story 3

- [x] T023 [US3] Render variance warning badge when `lineItems` provided and `eventHasNegativeVariance(lineItems)` in `apps/web/src/components/dashboard/EventCard.tsx`
- [x] T024 [US3] Render bottleneck alert chips from `deriveBottleneckAlerts(event)` in `apps/web/src/components/dashboard/EventCard.tsx`
- [x] T025 [P] [US3] Add variance badge and alert chip styles in `apps/web/src/index.css`
- [x] T026 [US3] Confirm US3 tests pass in `apps/web/tests/components/dashboard/EventCard.test.tsx`

**Checkpoint**: Alerts surface correctly without false positives in negative fixtures

---

## Phase 6: User Story 4 — Pin priority events for quick return (Priority: P4)

**Goal**: Optional pin toggle with Font Awesome icons; hidden when parent omits pin props; local persistence via storage helper.

**Independent Test**: Render with/without `onPinToggle`; toggle pin state; verify storage persistence across refresh simulation.

### Tests for User Story 4 (REQUIRED) ⚠️

- [x] T027 [P] [US4] Write failing pin visibility, toggle, and persistence tests in `apps/web/tests/components/dashboard/EventCard.test.tsx` per quickstart Scenario E

### Implementation for User Story 4

- [x] T028 [US4] Add pin control with `faThumbtack` / `faThumbtackSlash` when `onPinToggle` is defined in `apps/web/src/components/dashboard/EventCard.tsx` (Constitution IX)
- [x] T029 [US4] Document parent wiring pattern with `pinnedEventStorage` in `apps/web/tests/components/dashboard/EventCard.test.tsx` test harness
- [x] T030 [US4] Confirm US4 tests pass in `apps/web/tests/components/dashboard/EventCard.test.tsx`

**Checkpoint**: Pin UX complete; ready for SPLR-66 overview composition

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Full regression, coverage gate, and quickstart validation.

- [x] T031 [P] Run full test suite: `npm run test -- tests/components/dashboard/EventCard.test.tsx tests/lib/eventCardQuickLinks.test.ts tests/lib/eventCardVariance.test.ts tests/lib/pinnedEventStorage.test.ts`
- [x] T032 Verify ≥80.0% line/branch coverage on touched frontend files via `cd apps/web && npm run test:coverage` (Vitest → lcov); missing or unparseable reports FAIL; backend N/A
- [x] T033 [P] Execute quickstart validation scenarios A–F in `specs/025-event-card/quickstart.md`
- [x] T034 Confirm `EventCard.tsx` does not import `navigateToEventWorkspace` or routing helpers (FR-009) via code review or grep

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS all user stories** (SPLR-64 merge required)
- **User Stories (Phases 3–6)**: Depend on Foundational completion; implement sequentially P1 → P4 on shared `EventCard.tsx`
- **Polish (Phase 7)**: Depends on Phases 3–6 complete

### User Story Dependencies

| Story | Depends on | Notes |
|-------|------------|-------|
| US1 (P1) | Phase 2 | Creates base `EventCard` — MVP |
| US2 (P2) | US1 | Extends same component with quick links |
| US3 (P3) | US1 | Adds alerts; independent of US2 for testing |
| US4 (P4) | US1 | Adds pin; independent of US2/US3 for testing |

US3 and US4 can be parallelized after US1 if different developers own alert vs pin sections (same file — coordinate merges).

### Within Each User Story

- Tests written and failing before implementation
- Component changes in `EventCard.tsx` are incremental per story
- Lib helpers complete in Foundational before US2/US3 consume them

### Parallel Opportunities

- **Phase 1**: T002 ∥ T003
- **Phase 2**: T005 ∥ T006 ∥ T007; then T009 ∥ T010 after T008
- **US1**: T012 ∥ T015 (tests ∥ CSS)
- **US2**: T017 ∥ T018
- **US3**: T022 ∥ T025
- **Polish**: T031 ∥ T033

---

## Parallel Example: Foundational

```bash
# Write failing lib tests together (after T004 merge):
npm run test -- tests/lib/eventCardQuickLinks.test.ts   # T005
npm run test -- tests/lib/eventCardVariance.test.ts    # T006
npm run test -- tests/lib/pinnedEventStorage.test.ts   # T007

# Implement helpers in parallel (after T008):
# Developer A: eventCardVariance.ts (T009)
# Developer B: pinnedEventStorage.ts (T010)
```

---

## Parallel Example: User Story 2

```bash
# Write failing tests together:
# T017 phase matrix + T018 permission fallback in EventCard.test.tsx

# Single-file implementation sequence:
# T019 → T020 → T021
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (including SPLR-64 merge)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Card renders title, date, booking badge
5. Demo isolated card in Storybook or test harness

### Incremental Delivery

1. Setup + Foundational → helpers ready
2. US1 → event summary card (MVP)
3. US2 → quick links by lifecycle phase
4. US3 → variance + bottleneck alerts
5. US4 → pin toggle
6. Polish → coverage gate + quickstart

### Suggested MVP Scope

**User Story 1 only** (Phases 1–3, tasks T001–T016) delivers a usable event summary card for early SPLR-66 integration while quick links and alerts follow incrementally.

---

## Notes

- SPLR-64 (`eventLifecycle.ts`, `eventCardLabels.ts`) is a hard prerequisite — task T004 must pass before helper or component work
- Parent overview (SPLR-66) wires `onQuickLink` → `navigateToEventWorkspace`; out of scope for this task list
- Use fixtures from `apps/web/tests/fixtures/events.ts`; extend with phase-specific variants as needed
- Lock Budget and Edit Deal Builder both use `focus: 'deal'` per contracts/event-card-ui.md
- Commit after each task or logical group; stop at any checkpoint to validate story independently
