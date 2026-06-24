---
description: "Task list for Montana High Country Branding & Theming (SPLR-96)"
---

# Tasks: Montana High Country Branding & Theming

**Input**: Design documents from `/specs/058-brand-theming-mhc/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: REQUIRED per Constitution III. Every user story phase includes Vitest + React Testing Library tasks (write tests first, ensure they FAIL before implementation). Final Polish phase includes frontend ≥80.0% coverage gate via `npm run test:coverage` (Vitest → lcov). No backend changes in this feature.

**Organization**: Tasks grouped by user story (US1–US6) aligned with Linear milestones M1–M6 (SPLR-79 through SPLR-95). Frontend-only (`apps/web`).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Maps to user stories from spec.md (US1–US6)
- Include exact file paths in every task description

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Scaffold theme module directories and font-loading hook. No new npm runtime dependencies.

- [x] T001 Create `apps/web/src/theme/`, `apps/web/src/components/brand/`, and `apps/web/tests/theme/` directory scaffold per plan.md
- [x] T002 [P] Add Google Fonts preconnect `<link>` tags for `fonts.googleapis.com` and `fonts.gstatic.com` in `apps/web/index.html` per research.md D2

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Canonical token values, contrast math, and legacy denylist utilities used by all story tests. **No user story work can begin until this phase is complete.**

- [x] T003 [P] Export canonical Montana High Country color and font token map in `apps/web/src/theme/tokens.ts` per `contracts/design-tokens.md` and `data-model.md`
- [x] T004 [P] Export legacy hex denylist array in `apps/web/src/theme/legacyPalette.ts` per `data-model.md`
- [x] T005 [P] Implement WCAG 2.1 relative-luminance contrast ratio helper in `apps/web/src/theme/contrast.ts`
- [x] T006 Write failing unit tests for `tokens.ts` exports and `contrast.ts` ratio calculations in `apps/web/tests/theme/contrast.test.ts` (make T003–T005 pass)

**Checkpoint**: Theme test utilities exist; contrast helper verified.

---

## Phase 3: User Story 1 — Consistent Brand Foundation (Priority: P1) 🎯 MVP

**Goal**: Global CSS design tokens, web fonts, and typography hierarchy (M1 — SPLR-79, SPLR-80, SPLR-81).

**Independent Test**: Load any primary screen and confirm four brand colors and two-font hierarchy via `:root` tokens and global typography rules (spec US1).

### Tests for User Story 1 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T007 [P] [US1] Write failing test asserting required `:root` CSS custom properties exist in `apps/web/src/index.css` in `apps/web/tests/theme/cssTokens.test.ts`
- [x] T008 [P] [US1] Write failing test asserting global heading/body font-family rules reference `--font-heading` and `--font-ui` in `apps/web/tests/theme/typography.test.ts`

### Implementation for User Story 1

- [x] T009 [US1] Add Montana High Country color and derived tokens to `:root` in `apps/web/src/index.css` per `contracts/design-tokens.md` (SPLR-79)
- [x] T010 [US1] Add Google Fonts `@import` for Zilla Slab 700 and Inter 400/500/700 with `font-display: swap` in `apps/web/src/index.css` (SPLR-80)
- [x] T011 [US1] Define `--font-heading` and `--font-ui` variables and apply global `body` cream background + brown text in `apps/web/src/index.css`
- [x] T012 [US1] Apply slab-serif bold rules to `h1`, `h2`, and `.heading-brand`; sans-serif to body copy in `apps/web/src/index.css` (SPLR-81)
- [x] T013 [US1] Run `npm test` in `apps/web` and confirm T007–T008 pass

**Checkpoint**: Token layer and typography foundation ready — all downstream theming can reference `var(--color-*)`.

---

## Phase 4: User Story 2 — Branded Navigation Shell (Priority: P2)

**Goal**: Lodgepole Brown navigation chrome, Canvas Cream content canvas, white data surfaces (M3 — SPLR-85, SPLR-86, SPLR-87).

**Independent Test**: Open app on desktop and mobile viewports; confirm nav chrome brown/cream, content area cream, cards white (spec US2).

### Tests for User Story 2 (REQUIRED) ⚠️

- [x] T014 [P] [US2] Write failing tests asserting `app__header` nav chrome classes render on authenticated dashboard in `apps/web/tests/pages/DashboardHome.theme.test.tsx`
- [x] T015 [P] [US2] Write failing tests for cream canvas + white surface classes on ledger containers in `apps/web/tests/components/ledger/LedgerGrid.theme.test.tsx`

### Implementation for User Story 2

- [x] T016 [US2] Retheme `.app__header`, `.app__logout` with Lodgepole Brown background and Canvas Cream text using tokens in `apps/web/src/index.css` (SPLR-85; interim header when shell absent)
- [x] T017 [US2] Apply Canvas Cream background to `.app`, `.event-ledger-page`, and main workspace wrappers in `apps/web/src/index.css` (SPLR-86)
- [x] T018 [P] [US2] Add shell nav theme rules (`.sidebar-rail`, `.global-nav__link`, `.global-nav__link--active`, hover overlay, orange active indicator) in `apps/web/src/index.css` per `contracts/ui-theming.md` when `apps/web/src/components/shell/` exists (SPLR-85)
- [x] T019 [P] [US2] Add mobile top bar and drawer theme rules (`.top-bar`, `.mobile-nav-drawer`) in `apps/web/src/index.css` per `contracts/ui-theming.md` when shell components exist (SPLR-87)
- [x] T020 [US2] Apply Pure White surface + subtle border/shadow tokens to `.block-section`, `.ledger-grid__summary`, and table containers in `apps/web/src/index.css` (SPLR-86)
- [x] T021 [US2] Run `npm test` in `apps/web` and confirm T014–T015 pass

**Checkpoint**: Navigation chrome and content canvas match Montana High Country shell rules.

---

## Phase 5: User Story 3 — Dynamic Logo in Navigation (Priority: P3)

**Goal**: Logo assets, `BrandLogo` component, and wiring into header/sidebar states (M2 — SPLR-82, SPLR-83, SPLR-84).

**Independent Test**: Toggle sidebar expanded/collapsed (or view header on current branch); wordmark vs badge renders correctly (spec US3).

### Tests for User Story 3 (REQUIRED) ⚠️

- [x] T022 [P] [US3] Write failing `BrandLogo` variant tests (`text` → `sr-text.png`, `badge` → `sr-badge.png`, default alt) in `apps/web/tests/theme/BrandLogo.test.tsx` per `contracts/brand-logo.md`

### Implementation for User Story 3

- [x] T023 [P] [US3] Add `sr-text.png` and `sr-badge.png` logo assets to `apps/web/public/brand/` with path constants in `apps/web/src/brand/assets.ts` (SPLR-82)
- [x] T024 [US3] Implement `BrandLogo` component with `variant: 'text' | 'badge'` in `apps/web/src/components/brand/BrandLogo.tsx` (make T022 pass; SPLR-83)
- [x] T025 [US3] Add `.brand-logo-wrapper` and variant sizing styles with ≥24px padding in expanded state in `apps/web/src/index.css`
- [x] T026 [US3] Wire `<BrandLogo variant="text" />` into header in `apps/web/src/pages/DashboardHome.tsx` (SPLR-84 interim wiring)
- [x] T027 [P] [US3] Wire dynamic `BrandLogo` variant (`text` expanded / `badge` collapsed) into `apps/web/src/components/shell/SidebarRail.tsx` when shell present (SPLR-84)
- [x] T028 [P] [US3] Wire `<BrandLogo variant="text" />` into `apps/web/src/components/shell/TopBar.tsx` and `apps/web/src/components/shell/MobileNavDrawer.tsx` when shell present (SPLR-84)

**Checkpoint**: Logo displays correctly in all navigation states available on the branch.

---

## Phase 6: User Story 4 — Branded Components & Data Surfaces (Priority: P4)

**Goal**: Shared button/badge primitives, card/modal/table theming, legacy hex migration (M4 — SPLR-88, SPLR-89, SPLR-90, SPLR-91).

**Independent Test**: Visit dashboard and ledger; primary/secondary buttons, white cards on cream, orange alert badges match brand rules (spec US4).

### Tests for User Story 4 (REQUIRED) ⚠️

- [x] T029 [P] [US4] Write failing tests for `.btn-primary` and `.btn-secondary` computed token classes in `apps/web/tests/theme/buttons.test.tsx`
- [x] T030 [P] [US4] Write failing tests for `.badge-action-required` pill styling in `apps/web/tests/theme/badges.test.tsx`

### Implementation for User Story 4

- [x] T031 [US4] Implement shared `.btn-primary` and `.btn-secondary` styles with hover/focus-visible states in `apps/web/src/index.css` per `contracts/ui-theming.md` (SPLR-88)
- [x] T032 [US4] Implement `.badge-action-required` pill badge styles in `apps/web/src/index.css` (SPLR-90)
- [x] T033 [US4] Retheme modal and card surfaces (`.welcome-modal`, `.auth-layout__card`, `.artist-deal-panel`) to white-on-cream with token borders/shadows in `apps/web/src/index.css` (SPLR-89)
- [x] T034 [US4] Compose existing submit/retry/dismiss selectors (`.auth-form__submit`, `.dashboard-empty__retry`, `.welcome-modal__dismiss`) with `.btn-primary` in `apps/web/src/index.css`
- [x] T035 [US4] Migrate all legacy slate/blue hex literals to `var(--color-*)` tokens throughout `apps/web/src/index.css` per `contracts/design-tokens.md` denylist (SPLR-91)
- [x] T036 [US4] Apply `.badge-action-required` to action-required UI surfaces (e.g., `.ledger-grid__variance-banner`, QBO unmapped indicators) in `apps/web/src/index.css`
- [x] T037 [US4] Run `npm test` in `apps/web` and confirm T029–T030 pass

**Checkpoint**: Interactive primitives and data surfaces fully on-brand; no legacy hex in global CSS.

---

## Phase 7: User Story 5 — Branded Auth & Onboarding (Priority: P5)

**Goal**: Login, registration, org creation, and welcome modal match Montana High Country identity (M5 — SPLR-92, SPLR-93).

**Independent Test**: Walk login → register → org create → welcome modal; palette, typography, and buttons match in-app brand (spec US5).

### Tests for User Story 5 (REQUIRED) ⚠️

- [x] T038 [P] [US5] Write failing branded auth layout class assertions in `apps/web/tests/auth/AuthLayout.theme.test.tsx`
- [x] T039 [P] [US5] Write failing branded onboarding tests for welcome modal and org-create step in `apps/web/tests/onboarding/WelcomeModal.theme.test.tsx` and `apps/web/tests/onboarding/OrganizationCreateStep.theme.test.tsx`

### Implementation for User Story 5

- [x] T040 [US5] Apply Montana High Country tokens to `.auth-layout`, `.auth-form`, `.form-field`, and link/focus styles in `apps/web/src/index.css` (SPLR-92)
- [x] T041 [US5] Retheme `.welcome-modal__backdrop`, `.welcome-modal`, and dismiss CTA with brand tokens in `apps/web/src/index.css` (SPLR-93)
- [x] T042 [US5] Ensure `OrganizationCreateStep` in `apps/web/src/components/onboarding/OrganizationCreateStep.tsx` uses auth card + `.btn-primary` classes consistently (SPLR-93)
- [x] T043 [US5] Update existing `apps/web/tests/auth/AuthLayout.test.tsx` and `apps/web/tests/onboarding/WelcomeModal.test.tsx` for branded class assertions without breaking WCAG associations from feature 006

**Checkpoint**: Unauthenticated flows visually cohesive with authenticated experience.

---

## Phase 8: User Story 6 — Accessible, Regression-Resistant Compliance (Priority: P6)

**Goal**: WCAG AA contrast verification and automated legacy-color regression tests (M6 — SPLR-94, SPLR-95).

**Independent Test**: Contrast tests pass; reintroducing a denylisted hex causes test failure (spec US6).

### Tests for User Story 6 (REQUIRED) ⚠️

- [x] T044 [P] [US6] Write failing WCAG AA contrast pairing tests using `apps/web/src/theme/contrast.ts` in `apps/web/tests/theme/designTokens.test.ts` (SPLR-94)
- [x] T045 [P] [US6] Write failing legacy hex denylist file scan of `apps/web/src/index.css` in `apps/web/tests/theme/legacyPalette.test.ts` (SPLR-95)

### Implementation for User Story 6

- [x] T046 [US6] Adjust CTA label color token to `--color-surface-white` on `.btn-primary` if cream-on-orange fails contrast in `apps/web/src/index.css` (FR-013)
- [x] T047 [US6] Verify and fix any remaining contrast failures until `apps/web/tests/theme/designTokens.test.ts` passes (SPLR-94)
- [x] T048 [US6] Verify zero denylisted hex values remain until `apps/web/tests/theme/legacyPalette.test.ts` passes (SPLR-95)
- [x] T049 [US6] Add `:focus-visible` focus-ring token rules on nav, buttons, and form fields meeting 3:1 contrast in `apps/web/src/index.css`

**Checkpoint**: Automated brand regression suite green; WCAG AA pairings verified.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Build verification, manual validation, coverage gate.

- [x] T050 Run `npm run build` in `apps/web` and fix any build failures introduced by theming changes
- [x] T051 Execute manual spot-check scenarios from `specs/058-brand-theming-mhc/quickstart.md` (auth, dashboard, ledger, navigation)
- [x] T052 Verify ≥80.0% frontend line/branch coverage via `npm run test:coverage` in `apps/web` (Vitest → lcov); backend N/A — no `dotnet test` required for this feature; missing or unparseable coverage report FAILs

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS all user stories**
- **User Stories (Phases 3–8)**: Depend on Foundational; proceed in priority order P1→P6 (M1→M6)
- **Polish (Phase 9)**: Depends on all desired user stories complete

### User Story Dependencies

| Story | Depends on | Notes |
|-------|------------|-------|
| **US1 (P1)** | Foundational | MVP — token layer only |
| **US2 (P2)** | US1 | Shell rules reference `:root` tokens |
| **US3 (P3)** | US2 (partial) | Logo wires into nav chrome from US2; header-only wiring works without full shell |
| **US4 (P4)** | US1 | Buttons/cards use tokens; hex migration assumes tokens exist |
| **US5 (P5)** | US1, US4 (partial) | Auth benefits from `.btn-primary`; can start after US1 if buttons added incrementally |
| **US6 (P6)** | US1–US5 | Contrast/denylist tests validate final CSS state |

### Within Each User Story

- Tests written and FAIL before implementation
- `index.css` token changes before component wiring
- Story checkpoint (`npm test`) before next priority

### Parallel Opportunities

- **Phase 1**: T002 parallel with T001
- **Phase 2**: T003, T004, T005 parallel; then T006
- **US1**: T007, T008 parallel; then T009–T012 sequential on `index.css`
- **US2**: T014, T015 parallel; T018, T019 parallel after T016–T017
- **US3**: T022 parallel with T023; T027, T028 parallel after T024–T026
- **US4**: T029, T030 parallel; T031–T036 mostly sequential on `index.css`
- **US5**: T038, T039 parallel
- **US6**: T044, T045 parallel; then T046–T049

---

## Parallel Example: User Story 1

```bash
# Launch US1 tests together (from apps/web):
npm run test -- tests/theme/cssTokens.test.ts tests/theme/typography.test.ts

# After T009–T012 land, re-run to confirm green
npm run test -- tests/theme/
```

---

## Parallel Example: User Story 3

```bash
# Parallel tasks while CSS work continues:
# Agent A: T023 — copy logo assets to apps/web/public/
# Agent B: T022 — write BrandLogo.test.tsx (fails until T024)
# Agent C: T025 — draft .brand-logo styles in index.css
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1 (M1 — tokens + fonts + typography)
4. **STOP and VALIDATE**: `npm test` + visual check — cream background, brown text, slab headings
5. Demo brand foundation before shell/logo work

### Incremental Delivery (Linear M1→M6)

1. Setup + Foundational → utilities ready
2. **US1 (M1)** → global tokens — **MVP**
3. **US2 (M3)** → shell + canvas (can swap with US3 if logo assets ready first)
4. **US3 (M2)** → logo assets + BrandLogo
5. **US4 (M4)** → buttons, cards, hex migration
6. **US5 (M5)** → auth + onboarding
7. **US6 (M6)** → contrast + regression tests
8. Polish → build + coverage + quickstart

### Parallel Team Strategy

With multiple developers after Phase 2:

- **Developer A**: US1 → US4 (CSS-heavy migration)
- **Developer B**: US2 → US3 (shell + logo wiring)
- **Developer C**: US5 → US6 (auth reskin + test suite)

US5 can start after US1 if `.btn-primary` is stubbed early.

---

## Notes

- Run `npm test` and `npm run build` in `apps/web` after each Linear issue / milestone (per SPLR-96 implementation notes)
- Prefer `var(--color-*)` over new hex literals in all new rules
- When `apps/web/src/components/shell/` is absent, skip T018, T019, T027, T028 and complete interim `app__header` theming (T016, T026)
- [P] tasks = different files, no incomplete-task dependencies
- [Story] label maps to spec.md user stories for traceability
- Constitution III: every new component (`BrandLogo`) and theme module file requires tests; coverage gate in T052

---

## Task Summary

| Phase | Story | Task IDs | Count |
|-------|-------|----------|-------|
| Setup | — | T001–T002 | 2 |
| Foundational | — | T003–T006 | 4 |
| US1 Brand foundation | P1 / M1 | T007–T013 | 7 |
| US2 Navigation shell | P2 / M3 | T014–T021 | 8 |
| US3 Dynamic logo | P3 / M2 | T022–T028 | 7 |
| US4 Components & surfaces | P4 / M4 | T029–T037 | 9 |
| US5 Auth & onboarding | P5 / M5 | T038–T043 | 6 |
| US6 A11y & regression | P6 / M6 | T044–T049 | 6 |
| Polish | — | T050–T052 | 3 |
| **Total** | | **T001–T052** | **52** |

**Suggested MVP scope**: Phase 1 + Phase 2 + Phase 3 (User Story 1 / M1) — tasks T001–T013.

**Independent test criteria**:

| Story | Verify independently by |
|-------|-------------------------|
| US1 | `cssTokens.test.ts` + `typography.test.ts` + visual token check |
| US2 | `DashboardHome.theme.test.tsx` + cream canvas on ledger |
| US3 | `BrandLogo.test.tsx` + wordmark in header |
| US4 | `buttons.test.ts` + `badges.test.ts` + no legacy hex |
| US5 | Auth/onboarding theme tests + manual login flow |
| US6 | `designTokens.test.ts` + `legacyPalette.test.ts` green |
