# Implementation Plan: Mobile Top Bar and Navigation Drawer Theming

**Branch**: `064-mobile-top-bar-drawer-theme` | **Date**: 2026-06-24 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/064-mobile-top-bar-drawer-theme/spec.md` (Linear SPLR-87, milestone M3)

## Summary

Apply Montana High Country brand theming to mobile shell chrome so the **top bar** and **navigation drawer** match the desktop sidebar's Lodgepole Brown background with cream text. **Net-new work** is primarily **mobile top bar CSS** (brown bar, cream org name, cream hamburger icon) and **icon/control polish** (Font Awesome menu/close icons, 44px touch targets, focus rings). The **drawer panel** already uses brown/cream tokens — this milestone **verifies parity** with sidebar nav link hover/focus patterns and hardens automated theme regression tests. Frontend-only (`apps/web`); no backend changes.

## Technical Context

**Language/Version**: TypeScript 5.7 + React 18.3 (`apps/web`), Vite 6. No backend code changes.

**Primary Dependencies**: Montana High Country CSS tokens in `apps/web/src/index.css` (`--color-primary-brown`, `--color-bg-cream`, `--color-text-on-dark`, `--color-nav-hover-overlay`); shell components (`TopBar`, `MobileNavDrawer`); Font Awesome Free (`@fortawesome/react-fontawesome`, `@fortawesome/free-solid-svg-icons`).

**Storage**: N/A — presentation-layer theming only.

**Testing**: Vitest 2 + React Testing Library — extend `apps/web/tests/shell/TopBar.test.tsx`, `MobileNavDrawer.test.tsx`; add CSS contract assertions (pattern from `tests/theme/cssTokens.test.ts`). Constitution III: ≥80% line/branch coverage on modified shell/CSS files via `vite.config.ts` thresholds.

**Target Platform**: Modern evergreen browsers (desktop + mobile), Vite SPA; mobile breakpoint at 768px hides sidebar slot and activates mobile chrome.

**Project Type**: Web application — frontend shell theming only.

**Performance Goals**: No layout shift when drawer opens; branded colors present from first painted frame (global CSS, no JS theme toggle).

**Constraints**: Constitution III — ≥80.0% line/branch coverage on frontend for modified files; backend N/A. Constitution IX — hamburger and close controls MUST use Font Awesome Free icons (`faBars`, `faXmark`), not Unicode placeholders. All colors MUST reference named tokens — no ad-hoc hex in shell components. Desktop top bar (>768px) MUST remain transparent with brown text (FR-009). Logo variant/placement logic from SPLR-84 out of scope.

**Scale/Scope**: 2 shell TSX files (icon swap + minor markup), ~40–60 lines mobile top-bar/drawer CSS in `index.css`, 2–3 shell test modules + optional theme CSS contract test; no deploy scripts.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Applicable? | Status | Notes |
|---|-----------|-------------|--------|-------|
| I | Core Mathematical Axioms | No | PASS (N/A) | No monetary computation. |
| II | Multi-Tenant Isolation | No | PASS (N/A) | No database access. |
| III | Engineering Rigor & Quality Gates | **Yes — primary** | PASS | Shell + theme CSS contract tests; ≥80% coverage on modified files. |
| IV | QBO Integration | No | PASS (N/A) | No QuickBooks interaction. |
| V | Ledger State Machine & Immutability | No | PASS (N/A) | Presentational theming only. |
| VI | Polyglot Contract Serialization | No | PASS (N/A) | No API types. |
| VII | EF Core Axioms | No | PASS (N/A) | Frontend-only. |
| VIII | Exception Governance & Logging Privacy | No | PASS (N/A) | No logging changes. |
| IX | UI Iconography | **Yes** | PASS | Replace `☰` and `×` with `faBars` / `faXmark` per constitution. |
| X | Dual-Platform Operator Scripts | No | PASS (N/A) | No deploy scripts. |

**Gate result (pre-design)**: All gates PASS. No violations.

**Gate result (post-design)**: Unchanged. Artifacts define mobile shell theming contract, token usage, icon swap, touch-target CSS, and Vitest/CSS regression cases only.

## Project Structure

### Documentation (this feature)

```text
specs/064-mobile-top-bar-drawer-theme/
├── plan.md              # This file
├── research.md          # Phase 0 — theming approach, gap reconciliation, icon swap
├── data-model.md        # Phase 1 — shell chrome theme entities, validation rules
├── quickstart.md        # Phase 1 — manual + automated validation for SPLR-87
├── contracts/
│   └── mobile-shell-theming.md   # CSS + component theming + test contract
├── checklists/
│   └── requirements.md  # Spec quality checklist (from /speckit-specify)
└── tasks.md             # Phase 2 output (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
apps/web/
├── src/
│   ├── components/
│   │   └── shell/
│   │       ├── TopBar.tsx                 # MODIFY — Font Awesome menu icon
│   │       └── MobileNavDrawer.tsx        # MODIFY — Font Awesome close icon
│   └── index.css                          # MODIFY — mobile top-bar theming, touch targets, focus rings
└── tests/
    ├── shell/
    │   ├── TopBar.test.tsx                # EXTEND — themed menu button assertions
    │   └── MobileNavDrawer.test.tsx       # EXTEND — themed drawer panel assertions
    └── theme/
        └── mobileShellTheming.test.ts     # NEW (optional) — CSS contract for mobile shell rules
```

**Structure Decision**: Monorepo web app under `apps/web`. Shell tests stay in `tests/shell/**`. CSS token contract tests follow `tests/theme/cssTokens.test.ts` pattern for mobile shell media-query rules.

## Complexity Tracking

> No constitution violations. Table not required.

## Phase Artifacts Summary

| Phase | Artifact | Key decisions |
|-------|----------|---------------|
| 0 | [research.md](./research.md) | Mobile top bar brown-bar via existing 768px block; drawer verify-only; FA icons; CSS-first FOUC prevention |
| 1 | [data-model.md](./data-model.md) | Shell chrome theme entities, viewport rules, validation rules |
| 1 | [contracts/mobile-shell-theming.md](./contracts/mobile-shell-theming.md) | Per-component CSS hooks, token map, touch targets, test matrix |
| 1 | [quickstart.md](./quickstart.md) | Automated + manual validation steps |

## Implementation Notes (for `/speckit-tasks`)

1. **TopBar.tsx** — Replace `☰` with `<FontAwesomeIcon icon={faBars} />`; add icon class hook (e.g. `top-bar__menu-icon`).
2. **MobileNavDrawer.tsx** — Replace `×` with `<FontAwesomeIcon icon={faXmark} />`; add close icon class hook.
3. **index.css** — Inside `@media (max-width: 768px)` block, set `.top-bar` background to `var(--color-primary-brown)`, color to `var(--color-text-on-dark)`; cream org name; menu button cream icon on brown with `min-width/min-height: 2.75rem` (44px); cream focus ring matching sidebar (`outline: 2px solid var(--color-bg-cream)`).
4. **Drawer** — Confirm `.mobile-nav-drawer__panel` brown/cream (already present); bump `.mobile-nav-drawer__close` to 44px touch target; ensure `GlobalNav` inherits cream via `color: inherit`.
5. **Tests** — Assert FA icons render; CSS contract tests verify mobile media-query token usage; run `npm run test:coverage` on modified files.

**Depends on**: M1 tokens (SPLR-79), M2 logo wiring (SPLR-84), sidebar theming (reference implementation).
