# Implementation Plan: Vertical Navigation Architecture

**Branch**: `022-vertical-navigation` | **Date**: 2026-06-18 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/022-vertical-navigation/spec.md` (Linear SPLR-62)

## Summary

Re-architect authenticated SPA layout into a **two-tier navigation shell**: fixed **left rail** for global destinations + profile menu, **sticky top bar** for organization name and page-specific controls. Implement desktop collapse/pin/hover-overlay sidebar states, mobile hamburger drawer, disabled "Coming soon" placeholders for unbuilt modules, and migrate Settings/Sign out out of the legacy header into the profile dropdown. **Frontend-only** — no API or schema changes.

## Technical Context

**Language/Version**: TypeScript 5.7 + React 18 (`apps/web` only)

**Primary Dependencies**: Existing History API routing (`appRoute.ts`); TanStack Query (`useUserProfile`); **Font Awesome Free** (`@fortawesome/react-fontawesome`, `@fortawesome/free-solid-svg-icons`) for UI icons per Constitution IX and `.specify/memory/iconography.md`; CSS in `index.css` (no other UI library)

**Storage**: Browser `sessionStorage` for sidebar pin/collapse preference; no server persistence

**Testing**: Vitest + React Testing Library for shell components, sidebar state machine, profile menu, mobile drawer, and updated page integration; optional Playwright viewport smoke; ≥80.0% line/branch coverage on touched frontend files (Constitution III); no backend code changes expected

**Target Platform**: Vite SPA — desktop-first with `<768px` mobile drawer

**Project Type**: Web application (`apps/web` vertical slice; `apps/api` unchanged)

**Performance Goals**: Sidebar hover expansion feels immediate (150ms width transition, 250ms intent delay per SPLR-62); no layout shift jank on pin/collapse

**Constraints**: Constitution VI — no hand-written API types; Constitution III — Vitest coverage ≥80% on new/modified frontend files; permission gating from features 014–016 unchanged (FR-021); auth/onboarding/accept-invite remain outside shell; ≥80.0% coverage gate on frontend touched files (backend N/A — no changes)

**Scale/Scope**: ~8 new shell components/hooks, ~6 modified pages/layouts, ~1 CSS section, ~8 new/extended test files; 0 backend files; Font Awesome Free npm additions (Constitution IX)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Relevance | Status |
|-----------|-----------|--------|
| I. Core Mathematical Axioms | No monetary math. | N/A |
| II. Multi-Tenant Isolation | No new data access; org name from existing profile. | N/A |
| III. Engineering Rigor | Vitest + RTL for shell; ≥80% on touched frontend files. | PASS (with tests) |
| IV. QBO Integration | No QBO interaction. | N/A |
| V. Ledger State Machine | No ledger mutations. | N/A |
| VI. Polyglot Contract | Read-only use of `UserProfileResponse`; no new TS API types. | PASS |
| VII. EF Core Axioms | No backend queries. | N/A |
| VIII. Exception Governance | No new error paths. | N/A |
| IX. UI Iconography | Font Awesome Free for shell icons (nav pin/unpin, future nav glyphs). | PASS |

**Post-design re-check**: PASS. Frontend-only layout refactor; Complexity Tracking not required.

## Project Structure

### Documentation (this feature)

```text
specs/022-vertical-navigation/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── vertical-navigation-ui.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
apps/web/src/
├── components/shell/
│   ├── AppShell.tsx              # NEW: two-tier layout wrapper
│   ├── SidebarRail.tsx           # NEW: collapse/pin/hover container
│   ├── GlobalNav.tsx             # NEW: left-rail destinations
│   ├── TopBar.tsx                # NEW: sticky bar + org name + slot
│   ├── ProfileBadge.tsx          # NEW: avatar + dropdown menu
│   └── MobileNavDrawer.tsx       # NEW: <768px overlay drawer
├── hooks/
│   └── useSidebarState.ts        # NEW: sidebar state + sessionStorage
├── lib/
│   ├── globalNav.ts              # NEW: nav items + active id resolver
│   └── sidebarStorage.ts         # NEW: sessionStorage helpers
├── pages/
│   ├── DashboardHome.tsx         # MODIFIED: remove legacy header; top bar slot
│   ├── CreateVenuePage.tsx       # MODIFIED: drop AuthLayout; content only
│   └── SettingsLandingPage.tsx   # MODIFIED: use shell top bar tabs
├── components/settings/
│   ├── SettingsLayout.tsx        # MODIFIED: content-only; no back/vertical nav
│   └── SettingsNav.tsx           # MODIFIED: horizontal top-bar variant
├── App.tsx                       # MODIFIED: AppShell wraps authenticated routes
└── index.css                     # MODIFIED: shell, rail, drawer, top bar styles

apps/web/tests/
├── shell/
│   ├── AppShell.test.tsx         # NEW
│   ├── SidebarRail.test.tsx      # NEW
│   ├── GlobalNav.test.tsx        # NEW
│   ├── ProfileBadge.test.tsx     # NEW
│   └── MobileNavDrawer.test.tsx  # NEW
├── pages/
│   └── DashboardHome.test.tsx    # EXTENDED: no legacy header controls
└── components/settings/
    └── SettingsNav.test.tsx      # EXTENDED: horizontal top-bar placement
```

**Structure Decision**: Single vertical slice through `apps/web`. Shell components colocated under `components/shell/`. Routing unchanged (`appRoute.ts`). `App.tsx` centralizes shell wrapping per route-specific `topBarContent`.

## Implementation Phases

### Phase A — Shell foundation (P1)

1. Add `sidebarStorage.ts`, `useSidebarState.ts`, `globalNav.ts`.
2. Implement `SidebarRail`, `GlobalNav`, `ProfileBadge`, `TopBar`, `AppShell`, `MobileNavDrawer`.
3. Add CSS variables and layout classes in `index.css` (240px / 64px widths, sticky top bar, overlay z-index, 768px breakpoint).
4. Wire `App.tsx` to wrap authenticated routes in `AppShell` + `VenueProvider`.

### Phase B — Page migration (P1–P4)

1. Refactor `DashboardHome`: extract header actions to `topBarContent`; remove Settings/Sign out/org subtitle.
2. Refactor `SettingsLayout` / `SettingsNav`: horizontal tabs in top bar; remove back button and vertical nav column.
3. Refactor `CreateVenuePage`: remove `AuthLayout` wrapper; render form in shell main area.
4. Ensure org name always visible via `TopBar` leading region.

### Phase C — Sidebar interactions (P2)

1. Implement collapse/pin controls and hover intent timer (250ms) with overlay mode.
2. Implement pin-from-hover transition with content reflow.
3. Unit tests for state machine edge cases (rapid hover, session persistence).

### Phase D — Mobile drawer + polish (P5)

1. Hamburger trigger in `TopBar` below 768px.
2. Drawer focus trap, Escape/outside dismiss, focus restore.
3. Disabled placeholder nav items with "Coming soon" styling.

### Phase E — Verification

1. Run Vitest shell + page suites.
2. Manual quickstart scenarios A–I.
3. Confirm ≥80% coverage on touched frontend files.

## Complexity Tracking

> Not required — no constitution violations.

## Generated Artifacts

| Artifact | Path |
|----------|------|
| Implementation plan | [plan.md](./plan.md) |
| Research | [research.md](./research.md) |
| Data model | [data-model.md](./data-model.md) |
| UI contracts | [contracts/vertical-navigation-ui.md](./contracts/vertical-navigation-ui.md) |
| Quickstart | [quickstart.md](./quickstart.md) |
