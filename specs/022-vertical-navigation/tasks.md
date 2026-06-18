---
description: "Task list for vertical navigation architecture overhaul"
---

# Tasks: Vertical Navigation Architecture

**Input**: Design documents from `/specs/022-vertical-navigation/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/vertical-navigation-ui.md, quickstart.md

**Tests**: REQUIRED per Constitution III. Each user story phase includes Vitest + RTL tasks (write tests first, ensure they fail before implementation). Final Polish phase enforces ≥80.0% line/branch coverage on touched frontend files via `npm run test:coverage` (Vitest → lcov). No backend changes expected; backend coverage gate N/A.

**Organization**: Tasks grouped by user story (US1–US5). Frontend-only vertical slice through `apps/web/`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1–US5 (maps to user stories in spec.md)
- All paths are repo-relative

## Path Conventions

- Shell components: `apps/web/src/components/shell/**`
- Hooks/libs: `apps/web/src/hooks/**`, `apps/web/src/lib/**`
- Pages: `apps/web/src/pages/**`, `apps/web/src/App.tsx`
- Styles: `apps/web/src/index.css`
- Tests: `apps/web/tests/shell/**`, extended page/settings tests

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create shell directory structure and shared navigation configuration libs.

- [x] T001 [P] Create `apps/web/src/components/shell/` directory for layout components per plan.md
- [x] T002 [P] Implement `sessionStorage` read/write helpers for sidebar pin state in `apps/web/src/lib/sidebarStorage.ts`
- [x] T003 [P] Implement `GLOBAL_NAV_ITEMS` config and `resolveActiveGlobalNavId()` in `apps/web/src/lib/globalNav.ts` per contracts/vertical-navigation-ui.md

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core shell skeleton, sidebar state hook, base CSS, and App routing wrapper. **Blocks all user stories.**

**⚠️ CRITICAL**: No user story work begins until this phase completes.

- [x] T004 Add base shell CSS variables (`--sidebar-width`, layout grid, sticky top bar) in `apps/web/src/index.css`
- [x] T005 Implement `useSidebarState()` hook (pinned expanded/collapsed + sessionStorage) in `apps/web/src/hooks/useSidebarState.ts`
- [x] T006 [P] Implement skeleton `AppShell.tsx` and `TopBar.tsx` (regions only, org name placeholder) in `apps/web/src/components/shell/`
- [x] T007 [P] Implement basic `GlobalNav.tsx` with Dashboard link and static placeholder items in `apps/web/src/components/shell/GlobalNav.tsx`
- [x] T008 Wire authenticated routes through `AppShell` in `apps/web/src/App.tsx` (exclude auth/onboarding/accept-invite per spec)
- [x] T009 [P] Create failing baseline tests for two-tier shell regions in `apps/web/tests/shell/AppShell.test.tsx`

**Checkpoint**: Shell skeleton renders on authenticated routes; tests exist and fail on missing behavior.

---

## Phase 3: User Story 1 - Global and contextual navigation separated (Priority: P1) 🎯 MVP

**Goal**: Left rail for global destinations; sticky top bar for org name and page-specific controls; legacy dashboard header removed; settings/create-venue use same shell.

**Independent Test**: Sign in → dashboard shows rail + top bar with org name and venue/event controls in top bar (not rail). Settings and create-venue use same shell. `npx vitest run apps/web/tests/shell/AppShell.test.tsx apps/web/tests/pages/DashboardHome.test.tsx`.

### Tests for User Story 1 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T010 [P] [US1] Extend `apps/web/tests/shell/AppShell.test.tsx`: assert organization name in top bar and absence of legacy Settings/Sign out in dashboard chrome
- [x] T011 [P] [US1] Extend `apps/web/tests/pages/DashboardHome.test.tsx`: assert venue switcher and event controls render in top bar slot, not left rail
- [x] T012 [P] [US1] Extend `apps/web/tests/pages/CreateVenuePage.test.tsx`: assert page renders inside AppShell with org name in top bar

### Implementation for User Story 1

- [x] T013 [US1] Refactor `apps/web/src/pages/DashboardHome.tsx`: remove `app__header` block; expose dashboard contextual controls for top bar slot
- [x] T014 [US1] Refactor `apps/web/src/components/settings/SettingsLayout.tsx`: remove `settings-layout__back` and vertical nav column; content-only wrapper
- [x] T015 [P] [US1] Refactor `apps/web/src/components/settings/SettingsNav.tsx` to horizontal top-bar tab variant per contracts/vertical-navigation-ui.md
- [x] T016 [US1] Refactor `apps/web/src/pages/CreateVenuePage.tsx`: remove `AuthLayout` wrapper; render form as shell main content via `apps/web/src/App.tsx`
- [x] T017 [US1] Update `apps/web/src/pages/SettingsLandingPage.tsx`, `TeamSettingsPage.tsx`, and `PlaceholderSettingsPage.tsx` to pass settings `SettingsNav` as topBarContent
- [x] T018 [US1] Complete `apps/web/src/components/shell/TopBar.tsx`: load org name from `useUserProfile()`, sticky positioning, contextual `topBarContent` slot

**Checkpoint**: MVP shell live on dashboard, settings, and create-venue; US1 tests green.

---

## Phase 4: User Story 2 - Sidebar expand, collapse, and hover overlay (Priority: P2)

**Goal**: Desktop sidebar supports pinned expanded, collapsed icon rail, hover overlay with 250ms intent delay, and pin-from-hover.

**Independent Test**: Collapse rail → content widens; hover 250ms → overlay expands without reflow; pin locks open. `npx vitest run apps/web/tests/shell/SidebarRail.test.tsx`.

### Tests for User Story 2 (REQUIRED) ⚠️

- [x] T019 [P] [US2] Add failing tests for collapse reflow, hover delay, overlay no-reflow, immediate retract, and pin-from-hover in `apps/web/tests/shell/SidebarRail.test.tsx`

### Implementation for User Story 2

- [x] T020 [US2] Implement `apps/web/src/components/shell/SidebarRail.tsx` with collapse/pin controls wrapping `GlobalNav`
- [x] T021 [US2] Extend `apps/web/src/hooks/useSidebarState.ts` with hover intent timer (250ms), `hoverExpanded` overlay mode, and `pinFromHover()`
- [x] T022 [US2] Extend `apps/web/src/index.css` for collapsed width (64px), hover overlay z-index, and 150ms width transition
- [x] T023 [US2] Integrate `SidebarRail` into `apps/web/src/components/shell/AppShell.tsx` replacing bare `GlobalNav` rail

**Checkpoint**: Sidebar state machine complete; US2 tests green.

---

## Phase 5: User Story 3 - Active wayfinding across nested views (Priority: P3)

**Goal**: Dashboard highlighted on workspace routes; no global highlight on settings; disabled placeholders non-interactive.

**Independent Test**: Dashboard active on `/` and `/venues/new`; settings routes show no active global item; placeholder clicks no-op. `npx vitest run apps/web/tests/shell/GlobalNav.test.tsx`.

### Tests for User Story 3 (REQUIRED) ⚠️

- [x] T024 [P] [US3] Add failing tests for active dashboard routes, null active on settings paths, and disabled placeholder no-op in `apps/web/tests/shell/GlobalNav.test.tsx`

### Implementation for User Story 3

- [x] T025 [US3] Implement disabled "Coming soon" styling and click prevention for booking/accounting items in `apps/web/src/components/shell/GlobalNav.tsx`
- [x] T026 [US3] Wire `resolveActiveGlobalNavId()` active highlighting (`global-nav__item--active`) in `apps/web/src/components/shell/GlobalNav.tsx`
- [x] T027 [US3] Extend `apps/web/tests/shell/AppShell.test.tsx` with settings route case asserting no global item highlighted

**Checkpoint**: Wayfinding rules match clarify session; US3 tests green.

---

## Phase 6: User Story 4 - Profile menu at bottom of rail (Priority: P4)

**Goal**: Avatar + name at rail bottom; Settings and Sign out in dropdown; legacy header account controls removed.

**Independent Test**: Profile menu opens from expanded/collapsed rail; Settings navigates; Sign out ends session; no duplicate header buttons. `npx vitest run apps/web/tests/shell/ProfileBadge.test.tsx`.

### Tests for User Story 4 (REQUIRED) ⚠️

- [x] T028 [P] [US4] Add failing tests for menu items, dismiss on outside click/Escape/select, and collapsed avatar-only display in `apps/web/tests/shell/ProfileBadge.test.tsx`

### Implementation for User Story 4

- [x] T029 [US4] Implement `apps/web/src/components/shell/ProfileBadge.tsx` with email initials avatar, display name, Settings/Sign out menu
- [x] T030 [US4] Anchor `ProfileBadge` at bottom of `apps/web/src/components/shell/SidebarRail.tsx`
- [x] T031 [US4] Audit and remove remaining legacy Settings/Sign out controls from `apps/web/src/pages/DashboardHome.tsx` and related shell pages

**Checkpoint**: Account actions consolidated in profile menu; US4 tests green.

---

## Phase 7: User Story 5 - Mobile navigation drawer (Priority: P5)

**Goal**: Below 768px, desktop rail hidden; hamburger opens full-height drawer with global nav and profile actions.

**Independent Test**: Narrow viewport → hamburger visible; drawer opens/closes on dismiss/nav select; focus trapped. `npx vitest run apps/web/tests/shell/MobileNavDrawer.test.tsx`.

### Tests for User Story 5 (REQUIRED) ⚠️

- [x] T032 [P] [US5] Add failing tests for drawer open/close, outside tap, Escape, nav selection dismiss, and focus restore in `apps/web/tests/shell/MobileNavDrawer.test.tsx`

### Implementation for User Story 5

- [x] T033 [US5] Implement `apps/web/src/components/shell/MobileNavDrawer.tsx` with overlay, focus trap, and dismiss handlers
- [x] T034 [US5] Add hamburger trigger to `apps/web/src/components/shell/TopBar.tsx` and wire drawer state in `apps/web/src/components/shell/AppShell.tsx`
- [x] T035 [US5] Extend `apps/web/src/index.css` with `@media (max-width: 767px)` rules hiding desktop rail and styling drawer per research.md D7

**Checkpoint**: Responsive drawer complete; US5 tests green.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Settings test updates, accessibility, quickstart validation, coverage gate, regression fixes.

- [x] T036 [P] Extend `apps/web/tests/components/settings/SettingsNav.test.tsx` for horizontal top-bar placement, permission gating, and absence of back button
- [x] T037 [P] Add keyboard accessibility assertions for collapse/pin control and profile menu in `apps/web/tests/shell/SidebarRail.test.tsx` and `apps/web/tests/shell/ProfileBadge.test.tsx`
- [x] T038 Run manual validation scenarios A–I from `specs/022-vertical-navigation/quickstart.md` and document results
- [x] T039 Verify ≥80.0% line/branch coverage on touched frontend files via `npm run test:coverage` in `apps/web` (Vitest → lcov); backend N/A (no code changes); missing or unparseable reports FAIL
- [x] T040 Fix any broken selectors or assertions in existing workspace tests (`apps/web/tests/pages/DashboardHome.test.tsx`, feature 017 suites) caused by shell migration

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS all user stories**
- **User Stories (Phases 3–7)**: Depend on Foundational; proceed sequentially P1→P5 (each builds on shell)
- **Polish (Phase 8)**: Depends on all user stories complete

### User Story Dependencies

- **US1 (P1)**: After Phase 2 — MVP; no dependency on US2–US5
- **US2 (P2)**: After US1 — extends rail with SidebarRail (replaces bare GlobalNav in AppShell)
- **US3 (P3)**: After US1 — enhances GlobalNav active/placeholder behavior (can parallel with US2 if SidebarRail merged carefully)
- **US4 (P4)**: After US2 — ProfileBadge anchors to SidebarRail bottom
- **US5 (P5)**: After US1 — mobile drawer reuses GlobalNav + ProfileBadge (full polish after US4)

### Within Each User Story

- Tests written and failing before implementation
- Story checkpoint before next priority

### Parallel Opportunities

- Phase 1: T001, T002, T003 in parallel
- Phase 2: T006, T007, T009 in parallel (after T004–T005)
- US1 tests: T010, T011, T012 in parallel
- US1 impl: T015 parallel with T014
- US2–US5 test tasks marked [P] can run in parallel with each other before their impl tasks
- Polish: T036, T037 in parallel

---

## Parallel Example: User Story 1

```bash
# Tests first (parallel):
# T010 — apps/web/tests/shell/AppShell.test.tsx
# T011 — apps/web/tests/pages/DashboardHome.test.tsx
# T012 — apps/web/tests/pages/CreateVenuePage.test.tsx

# Then implementation (T015 can parallel T014):
# T013 — DashboardHome.tsx
# T014 — SettingsLayout.tsx
# T015 — SettingsNav.tsx
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1 (T010–T018)
4. **STOP and VALIDATE**: Run US1 independent test command; manual quickstart Scenario A
5. Demo two-tier shell on dashboard + settings

### Incremental Delivery

1. Setup + Foundational → shell skeleton
2. US1 → MVP layout split → deploy/demo
3. US2 → sidebar interactions
4. US3 → active states + placeholders
5. US4 → profile menu consolidation
6. US5 → mobile drawer
7. Polish → coverage gate + regression fixes

### Parallel Team Strategy

1. Team completes Setup + Foundational together
2. After Foundational:
   - Dev A: US1 (critical path)
   - Dev B: can prep US3 GlobalNav tests (T024) while A finishes US1
3. US2 → US4 → US5 sequential on shared SidebarRail/AppShell files

---

## Notes

- No backend tasks — FR-022 backend coverage satisfied by no touched API files
- Auth/onboarding/accept-invite routes MUST remain outside AppShell (FR-001)
- Settings pages: no global left-rail highlight (clarify Q1-B); no back button (clarify Q4-A)
- Placeholder modules: visible, disabled, "Coming soon", clicks no-op (clarify Q5-A)
- Reuse WelcomeModal focus-trap patterns for MobileNavDrawer and ProfileBadge menu
