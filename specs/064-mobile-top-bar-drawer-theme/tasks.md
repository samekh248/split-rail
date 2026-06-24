---
description: "Task list for Mobile Top Bar and Navigation Drawer Theming (SPLR-87, M3 shell theming)"
---

# Tasks: Mobile Top Bar and Navigation Drawer Theming

**Input**: Design documents from `/specs/064-mobile-top-bar-drawer-theme/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: REQUIRED per Constitution III. Every user story phase includes Vitest + React Testing Library tasks (write tests first, ensure they FAIL before implementation). Final Polish phase includes frontend ≥80.0% coverage gate via `npm run test:coverage` (Vitest → lcov). No backend changes in this feature.

**Organization**: Tasks grouped by user story (US1–US4) aligned with SPLR-87 acceptance criteria. Frontend-only (`apps/web`). Logo placement logic (SPLR-84) and new design tokens (SPLR-79) are **out of scope** — consume existing tokens and logo wiring only.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Maps to user stories from spec.md (US1–US4)
- Include exact file paths in every task description

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm branch context, contract baseline, and M1/M2 prerequisites.

- [x] T001 Verify on branch `064-mobile-top-bar-drawer-theme` and install `apps/web` dependencies with `npm install` in `apps/web`
- [x] T002 [P] Review contract in `specs/064-mobile-top-bar-drawer-theme/contracts/mobile-shell-theming.md` against current `apps/web/src/components/shell/TopBar.tsx`, `apps/web/src/components/shell/MobileNavDrawer.tsx`, and `apps/web/src/index.css`
- [x] T003 [P] Confirm M1/M2 prerequisites: `apps/web/tests/theme/cssTokens.test.ts` passes and `apps/web/tests/shell/TopBar.test.tsx` + `apps/web/tests/shell/MobileNavDrawer.test.tsx` confirm wordmark placements per `specs/063-wire-logo-navigation/contracts/navigation-logo-wiring.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Design tokens and logo wiring must be in place before theming work. **No user story work can begin until this phase is complete.**

- [x] T004 Confirm Montana High Country tokens (`--color-primary-brown`, `--color-bg-cream`, `--color-text-on-dark`, `--color-nav-hover-overlay`) exist in `apps/web/src/index.css` `:root` block per `specs/059-mhc-design-tokens/spec.md`
- [x] T005 [P] Confirm desktop sidebar reference theming (`.sidebar-rail` brown/cream) in `apps/web/src/index.css` for visual parity target per `specs/064-mobile-top-bar-drawer-theme/research.md` D2
- [x] T006 [P] Document implementation gap summary: mobile top bar (transparent vs brown), drawer panel status, Unicode `☰`/`×` vs Font Awesome icons per `specs/064-mobile-top-bar-drawer-theme/research.md` D5

**Checkpoint**: Tokens and logo placements verified; gap list ready for user story phases.

---

## Phase 3: User Story 1 — Branded Mobile Top Bar Matches Desktop Sidebar (Priority: P1) 🎯 MVP

**Goal**: Mobile top bar (≤768px) uses Lodgepole Brown background with cream text; hamburger shows cream icon on brown (FR-001, FR-002, FR-005, FR-009).

**Independent Test**: At mobile viewport, top bar background is brown, org name is cream, menu button shows Font Awesome bars icon; desktop top bar (>768px) remains transparent with brown text.

### Tests for User Story 1 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T007 [P] [US1] Create `apps/web/tests/theme/mobileShellTheming.test.ts` with failing CSS contract assertions that `@media (max-width: 768px)` sets `.top-bar` `background: var(--color-primary-brown)` and cream text tokens per `specs/064-mobile-top-bar-drawer-theme/contracts/mobile-shell-theming.md`
- [x] T008 [P] [US1] Write failing Font Awesome bars icon assertion (`svg[data-icon="bars"]` or equivalent) on `data-testid="mobile-nav-open"` in `apps/web/tests/shell/TopBar.test.tsx`

### Implementation for User Story 1

- [x] T009 [US1] Add mobile-only brown-bar theming rules for `.top-bar`, `.top-bar__org-name`, and `.top-bar__menu-button` inside `@media (max-width: 768px)` in `apps/web/src/index.css` (make T007 pass; preserve desktop transparent top bar above breakpoint per FR-009)
- [x] T010 [US1] Import `FontAwesomeIcon` and `faBars`; replace Unicode `☰` with `<FontAwesomeIcon icon={faBars} className="top-bar__menu-icon" aria-hidden="true" />` in `apps/web/src/components/shell/TopBar.tsx` (make T008 pass)
- [x] T011 [US1] Run `npm test -- tests/theme/mobileShellTheming.test.ts tests/shell/TopBar.test.tsx` in `apps/web` and confirm US1 theme + icon tests pass

**Checkpoint**: Mobile top bar branded brown/cream — MVP deliverable for SPLR-87.

---

## Phase 4: User Story 2 — Branded Mobile Navigation Drawer (Priority: P1)

**Goal**: Drawer panel uses brown/cream palette matching sidebar; wordmark header unchanged; no FOUC on open (FR-003, FR-004, FR-005, FR-008).

**Independent Test**: Open mobile drawer; panel has brown background and cream inherited text; `GlobalNav` links readable; close control accessible.

### Tests for User Story 2 (REQUIRED) ⚠️

- [x] T012 [P] [US2] Add failing drawer panel CSS contract assertion for `.mobile-nav-drawer__panel` `background: var(--color-primary-brown)` in `apps/web/tests/theme/mobileShellTheming.test.ts`
- [x] T013 [P] [US2] Write failing drawer open theme assertion (panel element present with `.mobile-nav-drawer__panel` and cream text context) in `apps/web/tests/shell/MobileNavDrawer.test.tsx`

### Implementation for User Story 2

- [x] T014 [US2] Verify and align `.mobile-nav-drawer__panel`, `.mobile-nav-drawer__profile` border, and `GlobalNav` `color: inherit` hover rules in `apps/web/src/index.css` with sidebar patterns (make T012–T013 pass)
- [x] T015 [US2] Import `FontAwesomeIcon` and `faXmark`; replace Unicode `×` with `<FontAwesomeIcon icon={faXmark} className="mobile-nav-drawer__close-icon" aria-hidden="true" />` in `apps/web/src/components/shell/MobileNavDrawer.tsx`
- [x] T016 [US2] Run `npm test -- tests/theme/mobileShellTheming.test.ts tests/shell/MobileNavDrawer.test.tsx` in `apps/web` and confirm US2 drawer theme tests pass alongside existing drawer behavior tests

**Checkpoint**: Mobile drawer theming independently verifiable.

---

## Phase 5: User Story 3 — Accessible Mobile Menu Controls (Priority: P2)

**Goal**: Menu open and drawer close controls meet 44×44px touch targets with cream focus rings on brown chrome (FR-006, FR-007, SC-003).

**Independent Test**: Measure menu and close buttons ≥44px; Tab focus shows visible cream outline on brown backgrounds.

### Tests for User Story 3 (REQUIRED) ⚠️

- [x] T017 [P] [US3] Write failing min 44×44px touch target assertion for `data-testid="mobile-nav-open"` in `apps/web/tests/shell/TopBar.test.tsx`
- [x] T018 [P] [US3] Write failing min 44×44px touch target assertion for `data-testid="mobile-nav-close"` in `apps/web/tests/shell/MobileNavDrawer.test.tsx`

### Implementation for User Story 3

- [x] T019 [US3] Add `min-width: 2.75rem; min-height: 2.75rem` and flex centering to `.top-bar__menu-button` and `.mobile-nav-drawer__close` in `apps/web/src/index.css` (make T017–T018 pass)
- [x] T020 [US3] Add `:focus-visible` cream outline rules (`2px solid var(--color-bg-cream)`) for `.top-bar__menu-button` and `.mobile-nav-drawer__close` in `apps/web/src/index.css` matching `.nav-pin-button:focus-visible` pattern
- [x] T021 [US3] Run `npm test -- tests/shell/TopBar.test.tsx tests/shell/MobileNavDrawer.test.tsx` in `apps/web` and confirm US3 touch target tests pass

**Checkpoint**: Mobile shell controls meet accessibility sizing and focus requirements.

---

## Phase 6: User Story 4 — Regression-Safe Themed Mobile Shell (Priority: P2)

**Goal**: Automated tests prevent theme regressions; no ad-hoc hex in shell TSX; desktop shell unchanged (FR-009, FR-010, FR-011, SC-005).

**Independent Test**: Full shell theme test suite passes; ripgrep finds no Unicode menu glyphs or hex literals in shell components.

### Tests for User Story 4 (REQUIRED) ⚠️

- [x] T022 [P] [US4] Add failing desktop regression CSS contract assertion that base `.top-bar` retains `background: transparent` outside mobile override in `apps/web/tests/theme/mobileShellTheming.test.ts`
- [x] T023 [P] [US4] Create `apps/web/tests/shell/shellThemeHygiene.test.ts` with failing scan for Unicode `☰`/`×` and hardcoded `#3e2723`/`#f4f1ea` literals in `apps/web/src/components/shell/*.tsx`

### Implementation for User Story 4

- [x] T024 [US4] Fix any hygiene violations found by T023 (ensure colors live in `apps/web/src/index.css` tokens only; icons use Font Awesome) across `apps/web/src/components/shell/TopBar.tsx` and `apps/web/src/components/shell/MobileNavDrawer.tsx`
- [x] T025 [US4] Run `npm test -- tests/theme/mobileShellTheming.test.ts tests/shell/TopBar.test.tsx tests/shell/MobileNavDrawer.test.tsx tests/shell/shellThemeHygiene.test.ts` in `apps/web` and confirm full US4 regression suite passes

**Checkpoint**: Theme regressions caught by automated tests; desktop shell protected.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Coverage gate, build validation, and manual QA per quickstart.

- [x] T026 [P] Run ripgrep hygiene checks from `specs/064-mobile-top-bar-drawer-theme/quickstart.md` (`rg '#3[eE]2723|#f4[fF]1[eE][aA]' src/components/shell` and `rg '☰|×' src/components/shell` in `apps/web`) and confirm zero matches
- [x] T027 Execute manual validation checklist in `specs/064-mobile-top-bar-drawer-theme/quickstart.md` (mobile top bar, drawer, touch targets, desktop regression at >768px)
- [x] T028 Verify ≥80.0% line/branch coverage on modified frontend files via `npm run test:coverage` in `apps/web` (Vitest → lcov); missing or unparseable reports FAIL per Constitution III
- [x] T029 Run `npm run build` in `apps/web` and confirm production build succeeds

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS all user stories**
- **User Story 1 (Phase 3)**: Depends on Foundational — **MVP**; no dependency on US2–US4
- **User Story 2 (Phase 4)**: Depends on Foundational; parallel with US1 after Phase 2 (different primary files)
- **User Story 3 (Phase 5)**: Depends on US1 + US2 component/CSS work (touch targets apply to both buttons)
- **User Story 4 (Phase 6)**: Depends on US1–US3 implementation complete
- **Polish (Phase 7)**: Depends on all user stories complete

### User Story Dependencies

| Story | Priority | Depends on | Independent test |
|-------|----------|------------|------------------|
| US1 | P1 | Foundational | Mobile top bar brown/cream + FA bars icon |
| US2 | P1 | Foundational | Drawer panel brown/cream + FA close icon |
| US3 | P2 | US1, US2 | 44px touch targets + focus rings |
| US4 | P2 | US1–US3 | Full automated regression suite + hygiene scans |

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- CSS contract tests before `index.css` changes
- Component icon swaps after failing icon assertions exist
- Story checkpoint before next priority

### Parallel Opportunities

- **Phase 1**: T002 ∥ T003
- **Phase 2**: T005 ∥ T006
- **Phase 3**: T007 ∥ T008 (different test files)
- **Phase 4**: T012 ∥ T013
- **Phase 5**: T017 ∥ T018
- **Phase 6**: T022 ∥ T023
- **After Phase 2**: US1 (TopBar + mobile top-bar CSS) ∥ US2 (MobileNavDrawer + drawer CSS) by different developers
- **Phase 7**: T026 can run parallel to T027 prep

---

## Parallel Example: User Stories 1 & 2

```bash
# After Phase 2 checkpoint, split by file ownership:

# Developer A — US1 (top bar):
# T007, T008 (tests) → T009, T010 (index.css + TopBar.tsx) → T011

# Developer B — US2 (drawer):
# T012, T013 (tests) → T014, T015 (index.css + MobileNavDrawer.tsx) → T016

# Merge, then US3 touch targets (T017–T021) on both surfaces
```

---

## Parallel Example: User Story 3

```bash
# Launch touch-target tests together:
# T017 in apps/web/tests/shell/TopBar.test.tsx
# T018 in apps/web/tests/shell/MobileNavDrawer.test.tsx

# Then single CSS pass:
# T019, T020 in apps/web/src/index.css
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1 (mobile top bar brown/cream + FA menu icon)
4. **STOP and VALIDATE**: Run T011; manual check at ≤768px per quickstart
5. Demo branded mobile top bar

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. US1 → mobile top bar themed → validate (MVP)
3. US2 → drawer parity verified/polished → validate
4. US3 → touch targets + focus → validate
5. US4 + Polish → regression suite + coverage gate → ready to merge

### Parallel Team Strategy

1. Team completes Setup + Foundational together
2. After Phase 2:
   - Developer A: US1 (`TopBar.tsx`, mobile `.top-bar` CSS)
   - Developer B: US2 (`MobileNavDrawer.tsx`, drawer CSS verify)
3. Developer C or A+B: US3 touch targets (shared `index.css`)
4. Any developer: US4 regression tests + Polish coverage gate

---

## Notes

- Drawer panel brown/cream may already exist — US2 is verify-first, not rewrite (per `research.md` D2)
- All colors via CSS tokens in `index.css`; shell TSX must not introduce hex literals
- Constitution IX: `faBars` and `faXmark` replace Unicode placeholders
- Logo variant/placement unchanged from SPLR-84 — theming only
- Stop at any checkpoint to validate story independently
- Commit after each task or logical group
