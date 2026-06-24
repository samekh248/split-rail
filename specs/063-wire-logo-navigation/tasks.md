---
description: "Task list for Dynamic Logo in Navigation Shell (SPLR-84, M2 navigation branding)"
---

# Tasks: Dynamic Logo in Navigation Shell

**Input**: Design documents from `/specs/063-wire-logo-navigation/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: REQUIRED per Constitution III. Every user story phase includes Vitest + React Testing Library tasks (write tests first, ensure they FAIL before implementation). Final Polish phase includes frontend ≥80.0% coverage gate via `npm run test:coverage` (Vitest → lcov). No backend changes in this feature.

**Organization**: Tasks grouped by user story (US1–US4) aligned with SPLR-84 acceptance criteria. Frontend-only (`apps/web`). `BrandLogo` component work (SPLR-83), auth logo, and SPLR-87 theming are **out of scope**.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Maps to user stories from spec.md (US1–US4)
- Include exact file paths in every task description

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm branch context, contract baseline, and SPLR-83 prerequisite.

- [x] T001 Verify on branch `063-wire-logo-navigation` and install `apps/web` dependencies with `npm install` in `apps/web`
- [x] T002 [P] Review contract in `specs/063-wire-logo-navigation/contracts/navigation-logo-wiring.md` against current `apps/web/src/components/shell/SidebarRail.tsx`, `apps/web/src/components/shell/MobileNavDrawer.tsx`, `apps/web/src/components/shell/TopBar.tsx`, and `apps/web/src/index.css`
- [x] T003 [P] Confirm SPLR-83 prerequisite: `apps/web/src/components/brand/BrandLogo.tsx`, `apps/web/src/brand/assets.ts`, and `apps/web/tests/theme/BrandLogo.test.tsx` pass per `specs/062-brand-logo-component/contracts/brand-logo.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Logo assets and `BrandLogo` component must be available before shell wiring. **No user story work can begin until this phase is complete.**

- [x] T004 Confirm `apps/web/public/brand/sr-text.png` and `apps/web/public/brand/sr-badge.png` exist (SPLR-82 dependency documented in `specs/063-wire-logo-navigation/quickstart.md`)
- [x] T005 [P] Run `npm test -- tests/theme/BrandLogo.test.tsx` in `apps/web` and confirm text + badge variant tests pass
- [x] T006 [P] Document implementation gap summary in task notes: which of `SidebarRail.tsx`, `MobileNavDrawer.tsx`, `TopBar.tsx` already satisfy `specs/063-wire-logo-navigation/contracts/navigation-logo-wiring.md` (reconciliation per `specs/063-wire-logo-navigation/research.md` D5)

**Checkpoint**: `BrandLogo` and assets verified; gap list ready for user story phases.

---

## Phase 3: User Story 1 — Desktop Sidebar Logo Adapts to Rail Width (Priority: P1) 🎯 MVP

**Goal**: Expanded/hover-expanded sidebar shows wordmark; collapsed rail shows badge; brand click navigates home (FR-001–FR-003, FR-007).

**Independent Test**: Toggle sidebar pin/collapse on desktop viewport; wordmark when labels visible, badge when collapsed; `img[src="/brand/sr-text.png"]` vs `img[src="/brand/sr-badge.png"]`; brand button navigates to `/`.

### Tests for User Story 1 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T007 [P] [US1] Write failing expanded-state wordmark `src` assertion (`/brand/sr-text.png`) in `apps/web/tests/shell/SidebarRail.test.tsx` per `specs/063-wire-logo-navigation/contracts/navigation-logo-wiring.md`
- [x] T008 [P] [US1] Write failing collapsed-state badge `src` assertion (`/brand/sr-badge.png`) in `apps/web/tests/shell/SidebarRail.test.tsx`
- [x] T009 [P] [US1] Write failing hover-overlay wordmark `src` assertion after hover intent in `apps/web/tests/shell/SidebarRail.test.tsx`

### Implementation for User Story 1

- [x] T010 [US1] Verify or implement `variant={showLabels ? 'text' : 'badge'}` on `BrandLogo` in `apps/web/src/components/shell/SidebarRail.tsx` with `className="sidebar-rail__brand-logo"` and `data-testid="sidebar-brand"` button (make T007–T009 pass)
- [x] T011 [US1] Audit and adjust sidebar brand spacing rules (`.sidebar-rail__brand-button`, `.sidebar-rail__brand-logo`, `.sidebar-rail--expanded`) in `apps/web/src/index.css` for ≥24px effective wordmark padding per FR-006
- [x] T012 [US1] Run `npm test -- tests/shell/SidebarRail.test.tsx` in `apps/web` and confirm US1 logo variant + dashboard navigation tests pass

**Checkpoint**: Desktop dynamic logo swapping fully testable — MVP deliverable for SPLR-84.

---

## Phase 4: User Story 2 — Mobile Fly-Out Drawer Shows Wordmark at Top (Priority: P1)

**Goal**: Mobile drawer header displays full wordmark instead of placeholder title; no overlap with nav links (FR-004, FR-006).

**Independent Test**: Open mobile drawer; wordmark `img` with `src="/brand/sr-text.png"` in drawer header; close control remains accessible.

### Tests for User Story 2 (REQUIRED) ⚠️

- [x] T013 [P] [US2] Write failing drawer header wordmark test (`role="img"`, `src="/brand/sr-text.png"`, class `mobile-nav-drawer__brand`) in `apps/web/tests/shell/MobileNavDrawer.test.tsx` per contract

### Implementation for User Story 2

- [x] T014 [US2] Import `BrandLogo` and replace static header title with `<BrandLogo variant="text" className="mobile-nav-drawer__brand" />` in `apps/web/src/components/shell/MobileNavDrawer.tsx` (make T013 pass)
- [x] T015 [US2] Verify `.mobile-nav-drawer__header` and `.mobile-nav-drawer__brand` spacing in `apps/web/src/index.css` preserves ≥24px effective padding and no nav link overlap
- [x] T016 [US2] Run `npm test -- tests/shell/MobileNavDrawer.test.tsx` in `apps/web` and confirm US2 wordmark test passes alongside existing drawer behavior tests

**Checkpoint**: Mobile drawer wordmark independently verifiable.

---

## Phase 5: User Story 3 — Mobile Top Bar Shows Centered Wordmark (Priority: P2)

**Goal**: When `showMobileMenu` is true, centered wordmark appears in top bar without obscuring menu or org name (FR-005).

**Independent Test**: Render `TopBar` with `showMobileMenu`; `data-testid="top-bar-brand"` contains wordmark `img[src="/brand/sr-text.png"]`; hidden when `showMobileMenu` is false.

### Tests for User Story 3 (REQUIRED) ⚠️

- [x] T017 [P] [US3] Create `apps/web/tests/shell/TopBar.test.tsx` with failing `showMobileMenu` wordmark presence test (`top-bar-brand`, `src="/brand/sr-text.png"`) per contract
- [x] T018 [P] [US3] Write failing `showMobileMenu={false}` assertion ensuring `top-bar-brand` is absent in `apps/web/tests/shell/TopBar.test.tsx`

### Implementation for User Story 3

- [x] T019 [US3] Add `top-bar__brand-slot` with `data-testid="top-bar-brand"` and `<BrandLogo variant="text" className="top-bar__brand" />` when `showMobileMenu` in `apps/web/src/components/shell/TopBar.tsx` (make T017–T018 pass)
- [x] T020 [US3] Add mobile grid layout and `.top-bar__brand-slot` / `.top-bar__brand` CSS rules in `apps/web/src/index.css` per `specs/063-wire-logo-navigation/contracts/navigation-logo-wiring.md`
- [x] T021 [US3] Run `npm test -- tests/shell/TopBar.test.tsx` in `apps/web` and confirm US3 tests pass

**Checkpoint**: Mobile top bar centered wordmark independently verifiable.

---

## Phase 6: User Story 4 — Regression-Safe Navigation Shell Integration (Priority: P2)

**Goal**: Automated regression prevents silent logo removal; no hardcoded brand paths in shell source (FR-008, FR-009, SC-005).

**Independent Test**: Full shell logo test suite passes; ripgrep finds no `/brand/sr-` literals in `apps/web/src/components/shell/`.

### Tests for User Story 4 (REQUIRED) ⚠️

- [x] T022 [P] [US4] Write failing shell path centralization test scanning `apps/web/src/components/shell/**` for `/brand/sr-` literals outside `apps/web/src/brand/assets.ts` in `apps/web/tests/shell/shellLogoPaths.test.ts`

### Implementation for User Story 4

- [x] T023 [US4] Remove any hardcoded `/brand/sr-text.png` or `/brand/sr-badge.png` strings from `apps/web/src/components/shell/*.tsx`; ensure shell files import `BrandLogo` only (make T022 pass)
- [x] T024 [US4] Run combined shell logo suite: `npm test -- tests/shell/SidebarRail.test.tsx tests/shell/MobileNavDrawer.test.tsx tests/shell/TopBar.test.tsx tests/shell/shellLogoPaths.test.ts` in `apps/web`

**Checkpoint**: Navigation shell logo wiring regression-safe across all surfaces.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Full build verification, coverage gate, and quickstart sign-off.

- [x] T025 Run `npm test -- tests/shell/` in `apps/web` and resolve any failures introduced by logo wiring
- [x] T026 Run `npm run build` in `apps/web` and confirm production build succeeds
- [x] T027 Verify ≥80.0% line/branch coverage for modified shell files (`SidebarRail.tsx`, `MobileNavDrawer.tsx`, `TopBar.tsx`) via `npm run test:coverage` in `apps/web` (Vitest → lcov); backend N/A for this milestone
- [x] T028 Execute SPLR-84 validation checklist in `specs/063-wire-logo-navigation/quickstart.md` (desktop sidebar, mobile drawer, mobile top bar, layout-shift spot check)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS all user stories**
- **User Stories (Phase 3–6)**: Depend on Foundational completion
  - US1 (P1) and US2 (P1) can proceed in parallel after Phase 2 if staffed (different files)
  - US3 (P2) depends on TopBar work only — can start after Phase 2; no hard dependency on US2
  - US4 (P2) depends on US1–US3 test files existing — run after or in parallel with final story implementations
- **Polish (Phase 7)**: Depends on all user story phases complete

### User Story Dependencies

- **User Story 1 (P1)**: After Foundational — no dependency on US2–US4; delivers desktop MVP
- **User Story 2 (P1)**: After Foundational — independent of US1 file-wise (`MobileNavDrawer.tsx`); parallel-friendly
- **User Story 3 (P2)**: After Foundational — independent of US1/US2 (`TopBar.tsx`); parallel-friendly
- **User Story 4 (P2)**: After US1–US3 tests exist — cross-cutting regression gate

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Component wiring before CSS polish in same story
- Run story checkpoint test command before advancing

### Parallel Opportunities

- **Phase 1**: T002 and T003 parallel after T001
- **Phase 2**: T005 and T006 parallel after T004
- **Phase 3**: T007, T008, T009 parallel (batch in `SidebarRail.test.tsx`); T010 → T011 → T012 sequential
- **Phase 4**: T013 then T014 → T015 → T016 sequential
- **Phase 5**: T017 and T018 parallel (same new file — batch); T019 → T020 → T021 sequential
- **Phase 6**: T022 then T023 → T024 sequential
- **Polish**: T025 → T026 → T027 → T028 sequential

---

## Parallel Example: User Story 1

```bash
# Batch US1 failing tests in SidebarRail.test.tsx (from apps/web):
# T007 — expanded wordmark src
# T008 — collapsed badge src
# T009 — hover overlay wordmark src

# Sequential implementation:
# T010 — verify/implement SidebarRail.tsx variant mapping
# T011 — index.css sidebar brand padding audit
# T012 — npm test tests/shell/SidebarRail.test.tsx
```

---

## Parallel Example: User Stories 1 + 2 (both P1)

```bash
# Developer A — US1 (SidebarRail):
# T007–T012

# Developer B — US2 (MobileNavDrawer):
# T013–T016

# Stories integrate independently; no file conflicts.
```

---

## Parallel Example: User Story 3

```bash
# T017 + T018 — batch TopBar.test.tsx failing cases
# T019 — TopBar.tsx brand slot
# T020 — index.css mobile grid
# T021 — npm test tests/shell/TopBar.test.tsx
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1 (T007–T012)
4. **STOP and VALIDATE**: `npm test -- tests/shell/SidebarRail.test.tsx`
5. Desktop dynamic logo swapping done — partial SPLR-84 deliverable

### Incremental Delivery

1. Setup + Foundational → BrandLogo prerequisite verified
2. US1 → desktop sidebar variant swapping (MVP)
3. US2 → mobile drawer wordmark
4. US3 → mobile top bar centered wordmark
5. US4 → path hygiene + combined shell regression
6. Polish → build + coverage + quickstart

### Suggested MVP Scope

**User Story 1 only** (T007–T012) delivers desktop sidebar dynamic logo swapping. US2 completes mobile drawer (also P1). US3 adds persistent mobile top bar brand. US4 closes regression and path-centralization gates.

### Reconciliation Note

`SidebarRail.tsx` may already wire `BrandLogo` from epic `058-brand-theming-mhc`. Execute tasks as **verify-then-gap-fill**: run failing tests first; only edit when assertions fail. Primary net-new work is expected in `MobileNavDrawer.tsx`, `TopBar.tsx`, and `TopBar.test.tsx`.

---

## Notes

- Do **not** modify `BrandLogo.tsx` API or `apps/web/src/brand/assets.ts` unless SPLR-83 regression found — out of SPLR-84 scope.
- Do **not** implement SPLR-87 mobile chrome theming — logo placement only.
- Keep shell tests in `apps/web/tests/shell/**` per `022-vertical-navigation` convention.
- `[P]` tasks = different files or read-only review; same-file test/CSS edits should be batched sequentially.
- Commit after each task or logical group.
- Unblocks SPLR-87 after logo slots exist in drawer and top bar.

---

## Task Summary

| Phase | Story | Task IDs | Count |
|-------|-------|----------|-------|
| Setup | — | T001–T003 | 3 |
| Foundational | — | T004–T006 | 3 |
| US1 Desktop sidebar | P1 | T007–T012 | 6 |
| US2 Mobile drawer | P1 | T013–T016 | 4 |
| US3 Mobile top bar | P2 | T017–T021 | 5 |
| US4 Regression | P2 | T022–T024 | 3 |
| Polish | — | T025–T028 | 4 |
| **Total** | | **T001–T028** | **28** |
