# Implementation Plan: Dynamic Logo in Navigation Shell

**Branch**: `063-wire-logo-navigation` | **Date**: 2026-06-24 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/063-wire-logo-navigation/spec.md` (Linear SPLR-84, milestone M2)

## Summary

Wire the existing **`BrandLogo`** component into navigation shell surfaces so logo variant tracks sidebar state on desktop and the full wordmark appears in mobile chrome. **Desktop `SidebarRail`** already maps `showLabels` → `text` / `badge` — this milestone **verifies and hardens** that wiring with explicit `src` tests. **Net-new work** is **`MobileNavDrawer`** header wordmark (CSS hooks exist; JSX still shows "Menu") and **`TopBar`** centered mobile wordmark via a three-zone grid layout. Extend `tests/shell/**` for FR-009 coverage. Frontend-only (`apps/web`); no backend changes.

## Technical Context

**Language/Version**: TypeScript 5.7 + React 18.3 (`apps/web`), Vite 6. No backend code changes.

**Primary Dependencies**: `BrandLogo` (`apps/web/src/components/brand/BrandLogo.tsx`), `useSidebarState` hook, shell components (`SidebarRail`, `TopBar`, `MobileNavDrawer`, `AppShell`), plain CSS in `apps/web/src/index.css`.

**Storage**: N/A — consumes static brand PNGs via BrandLogo; no persistence.

**Testing**: Vitest 2 + React Testing Library — extend `apps/web/tests/shell/SidebarRail.test.tsx`, `MobileNavDrawer.test.tsx`, and add/extend `TopBar.test.tsx`. Constitution III: ≥80% line/branch coverage on modified shell files via `vite.config.ts` thresholds.

**Target Platform**: Modern evergreen browsers (desktop + mobile), Vite SPA; mobile breakpoint at 768px hides sidebar slot.

**Project Type**: Web application — frontend navigation shell integration only.

**Performance Goals**: Instant variant swap on sidebar pin/collapse/hover; no layout jump (SC-006). Mobile top bar logo uses compact `max-height` to avoid row overflow.

**Constraints**: Constitution III — ≥80.0% line/branch coverage on frontend for modified shell files; backend N/A. Constitution VI — no hand-authored API types (N/A). Constitution IX — brand PNG via BrandLogo, not Font Awesome. Shell files MUST NOT hardcode `/brand/` paths (FR-008). SPLR-87 theming and auth logo out of scope.

**Scale/Scope**: 2–3 shell TSX files (1 verify, 2 implement), ~30 lines mobile top-bar CSS, 3 shell test modules (~6–10 new cases); no deploy scripts.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Applicable? | Status | Notes |
|---|-----------|-------------|--------|-------|
| I | Core Mathematical Axioms | No | PASS (N/A) | No monetary computation. |
| II | Multi-Tenant Isolation | No | PASS (N/A) | No database access. |
| III | Engineering Rigor & Quality Gates | **Yes — primary** | PASS | Shell tests in `tests/shell/**`; ≥80% coverage gate on modified components. |
| IV | QBO Integration | No | PASS (N/A) | No QuickBooks interaction. |
| V | Ledger State Machine & Immutability | No | PASS (N/A) | Presentational shell wiring only. |
| VI | Polyglot Contract Serialization | No | PASS (N/A) | No API types. |
| VII | EF Core Axioms | No | PASS (N/A) | Frontend-only. |
| VIII | Exception Governance & Logging Privacy | No | PASS (N/A) | No logging changes. |
| IX | UI Iconography | No | PASS (N/A) | Brand PNG logos via BrandLogo (allowed exception). |
| X | Dual-Platform Operator Scripts | No | PASS (N/A) | No deploy scripts. |

**Gate result (pre-design)**: All gates PASS. No violations.

**Gate result (post-design)**: Unchanged. Artifacts define shell wiring contract, layout state rules, CSS grid for mobile top bar, and Vitest regression cases only.

## Project Structure

### Documentation (this feature)

```text
specs/063-wire-logo-navigation/
├── plan.md              # This file
├── research.md          # Phase 0 — variant mapping, mobile layout, gap reconciliation
├── data-model.md        # Phase 1 — layout state, placement entities, validation rules
├── quickstart.md        # Phase 1 — manual + automated validation for SPLR-84
├── contracts/
│   └── navigation-logo-wiring.md   # Shell wiring + CSS + test contract
├── checklists/
│   └── requirements.md  # Spec quality checklist (from /speckit-specify)
└── tasks.md             # Phase 2 output (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
apps/web/
├── src/
│   ├── components/
│   │   ├── brand/
│   │   │   └── BrandLogo.tsx              # Consumed (SPLR-83) — no changes expected
│   │   └── shell/
│   │       ├── SidebarRail.tsx            # VERIFY — dynamic variant already wired
│   │       ├── MobileNavDrawer.tsx        # MODIFY — BrandLogo in header
│   │       ├── TopBar.tsx                 # MODIFY — centered mobile wordmark
│   │       └── AppShell.tsx               # No change expected (passes showMobileMenu)
│   └── index.css                          # MODIFY — .top-bar mobile grid + .top-bar__brand
└── tests/
    └── shell/
        ├── SidebarRail.test.tsx           # EXTEND — explicit text/badge src assertions
        ├── MobileNavDrawer.test.tsx       # EXTEND — drawer header wordmark
        └── TopBar.test.tsx                # NEW or EXTEND — mobile brand slot
```

**Structure Decision**: Monorepo web app under `apps/web`. Shell tests stay in `tests/shell/**` per `022-vertical-navigation` convention. BrandLogo unit tests remain in `tests/theme/BrandLogo.test.tsx` (SPLR-83 scope).

## Complexity Tracking

> No constitution violations. Table not required.

## Phase Artifacts Summary

| Phase | Artifact | Key decisions |
|-------|----------|---------------|
| 0 | [research.md](./research.md) | Reuse `showLabels` for variant; drawer replaces "Menu"; mobile top bar CSS grid; gap-fill for T028 remainder |
| 1 | [data-model.md](./data-model.md) | Layout state → variant rules; three placement entities |
| 1 | [contracts/navigation-logo-wiring.md](./contracts/navigation-logo-wiring.md) | Per-component wiring, CSS, test matrix |
| 1 | [quickstart.md](./quickstart.md) | Automated + manual validation steps |

## Implementation Notes (for `/speckit-tasks`)

1. **SidebarRail** — Confirm existing `variant={showLabels ? 'text' : 'badge'}`; add tests for `img[src="/brand/sr-text.png"]` vs `sr-badge.png`.
2. **MobileNavDrawer** — Import `BrandLogo`; replace `<span className="mobile-nav-drawer__title">Menu</span>` with `<BrandLogo variant="text" className="mobile-nav-drawer__brand" />`.
3. **TopBar** — Add `top-bar__brand-slot` with `data-testid="top-bar-brand"` when `showMobileMenu`; add mobile grid CSS per contract.
4. **CSS** — Add `.top-bar__brand*` rules; existing `.mobile-nav-drawer__brand` rules should work once JSX wired.
5. **Tests** — Cover all three surfaces; run `npm run test:coverage` on modified files.

**Blocks**: SPLR-87 (mobile chrome theming) can proceed after logo slots exist.
