# Implementation Plan: Montana High Country Branding & Theming

**Branch**: `058-brand-theming-mhc` | **Date**: 2026-06-23 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/058-brand-theming-mhc/spec.md` (Linear SPLR-96)

## Summary

Apply the **Montana High Country (Accounting-First)** brand identity across the Split-Rail web application: a four-color token system (Lodgepole Brown, Alpine Sunset, Canvas Cream, Pure White), Zilla Slab + Inter typography, dynamic logo variants, navigation shell theming, shared button/card/badge primitives, auth/onboarding reskin, legacy slate/blue palette removal, WCAG AA contrast verification, and automated color-regression tests.

This is a **frontend-only** feature (`apps/web`). No backend API, DTO, or database changes. Work follows Linear milestones **M1 → M6** (SPLR-79 through SPLR-95) and maps to six prioritized user stories in the spec. Styling uses **plain CSS custom properties** in `index.css` (no Tailwind). On the current branch the authenticated chrome is a simple top header (`app__header` in `DashboardHome.tsx`); full left-rail shell components (`AppShell`, `SidebarRail`, etc.) may arrive via merge from vertical-navigation work — token-based CSS ensures theming applies to whichever shell is present without palette rework.

## Technical Context

**Language/Version**: TypeScript 5.7 + React 18.3 (`apps/web`), built with Vite 6. No backend code changes.

**Primary Dependencies**: React 18, plain CSS (`index.css`). Google Fonts (`Zilla Slab`, `Inter`) loaded via `@import` or `<link>` in `index.html`/`index.css`. Testing: Vitest 2 + `@testing-library/react` + jsdom (existing). Optional dev dependency for contrast math: `color-contrast-checker` or equivalent pure-function utility in test code (no runtime dependency).

**Storage**: Static assets in `apps/web/public/brand/` (`sr-text.png`, `sr-badge.png`). Path constants in `apps/web/src/brand/assets.ts`. CSS custom properties in `:root`. Browser-only; no server persistence.

**Testing**: Vitest + React Testing Library for `BrandLogo`, token/contrast utilities, and updated component snapshots/class assertions; dedicated `tests/theme/**` suite for legacy-hex denylist scan and WCAG AA token-pair checks. Coverage enforced at ≥80% lines/functions/branches/statements via existing `vite.config.ts` thresholds. Playwright visual regression is optional follow-up; not required for this epic's definition of done.

**Target Platform**: Modern evergreen browsers (desktop + mobile), Vite SPA.

**Project Type**: Web application — frontend visual/theming slice only.

**Performance Goals**: Font loading uses `font-display: swap` to avoid invisible text during load; no perceptible layout shift from logo swap on sidebar collapse (fixed header slot dimensions).

**Constraints**: Constitution VI — no new hand-authored API payload types (N/A for theming). Constitution III — ≥80.0% line/branch coverage on frontend for all new/modified source files; backend N/A unless contrast/token utilities are mistakenly placed server-side. WCAG 2.1 AA on all primary text/background pairings (FR-013). No Tailwind unless explicitly requested. Prefer CSS variables over new hex literals in component rules (FR-012). Linear child issues define milestone acceptance; implement M1 before M2, etc.

**Scale/Scope**: ~4 color tokens + typography/spacing/radius tokens; 2 font imports; 2 logo assets; 1 `BrandLogo` component; reskin of `index.css` (~400+ lines today with legacy slate palette); updates to auth, onboarding, ledger, dashboard header/shell, and shared button/badge classes; 2–4 new test modules under `tests/theme/`; milestone mapping to 17 Linear sub-issues.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Applicable? | Status | Notes |
|---|-----------|-------------|--------|-------|
| I | Core Mathematical Axioms | No | PASS (N/A) | Theming performs no monetary computation. |
| II | Multi-Tenant Isolation | No | PASS (N/A) | No database queries or tenant-scoped data access. |
| III | Engineering Rigor & Quality Gates | **Yes — primary** | PASS | All new components (`BrandLogo`), token utilities, and modified UI components ship with Vitest + RTL tests; ≥80% coverage gate via `vite.config.ts`. Automated token/contrast regression tests satisfy FR-014. |
| IV | QBO Integration | No | PASS (N/A) | No QuickBooks interaction. |
| V | Ledger State Machine & Immutability | No | PASS (N/A) | Visual-only changes; no mutation of settled/reconciled records. |
| VI | Polyglot Contract Serialization | No | PASS (N/A) | No API payload types introduced or modified. |
| VII | EF Core Axioms | No | PASS (N/A) | Frontend-only. |
| VIII | Exception Governance & Logging Privacy | No | PASS (N/A) | No logging changes; no PII in theme assets. |

**Gate result (pre-design)**: All gates PASS. No violations.

**Gate result (post-design)**: Unchanged. Design artifacts define CSS/token contracts and Vitest regression suites only — no constitution conflicts introduced.

## Project Structure

### Documentation (this feature)

```text
specs/058-brand-theming-mhc/
├── plan.md              # This file
├── research.md          # Phase 0 — styling approach, fonts, shell dependency, a11y tooling
├── data-model.md        # Phase 1 — design token catalog, typography roles, navigation/logo state
├── quickstart.md        # Phase 1 — manual + automated validation by milestone
├── contracts/           # Phase 1
│   ├── design-tokens.md       # CSS custom property contract + legacy denylist
│   ├── brand-logo.md          # BrandLogo component + asset contract
│   └── ui-theming.md          # Shell, buttons, cards, badges, auth surface rules
├── checklists/
│   └── requirements.md  # Spec quality checklist (from /speckit-specify)
└── tasks.md             # Phase 2 output (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
apps/web/
├── public/
│   └── brand/
│       ├── sr-text.png                # NEW (M2 / SPLR-82) — full wordmark
│       ├── sr-badge.png               # NEW (M2 / SPLR-82) — compact badge
│       └── sr-auth-logo.png           # Auth screens wordmark
├── index.html                         # EXTEND — optional preconnect to fonts.googleapis.com
├── src/
│   ├── brand/
│   │   └── assets.ts                  # NEW (M2 / SPLR-82) — BRAND_LOGO_TEXT, BRAND_LOGO_BADGE
│   ├── index.css                      # EXTEND — :root tokens, typography, shell, buttons, migration
│   ├── components/
│   │   ├── brand/
│   │   │   └── BrandLogo.tsx          # NEW (M2 / SPLR-83) — text | badge variants
│   │   ├── auth/                      # EXISTING — class names unchanged; styles via tokens
│   │   ├── onboarding/                # EXISTING — WelcomeModal, OrganizationCreateStep reskin
│   │   ├── shell/                     # NEW or MERGED — AppShell, SidebarRail, TopBar, MobileNavDrawer
│   │   │                              #   (from vertical-navigation); themed in M3 if present
│   │   └── …                          # EXISTING ledger, settlement, qbo — hex → var() migration (M4)
│   ├── pages/
│   │   ├── DashboardHome.tsx          # EXTEND — BrandLogo in header; token classes (M2–M3)
│   │   ├── LoginPage.tsx              # EXISTING — inherits AuthLayout reskin (M5)
│   │   └── RegisterPage.tsx           # EXISTING
│   └── theme/
│       ├── tokens.ts                  # NEW (M1) — canonical token names/values for tests
│       └── legacyPalette.ts           # NEW (M6) — denylist hex values for regression scan
└── tests/
    ├── theme/
    │   ├── designTokens.test.ts       # NEW — token values + contrast pairs (M6 / SPLR-94–95)
    │   ├── legacyPalette.test.ts      # NEW — denylist scan of index.css (M6 / SPLR-95)
    │   └── BrandLogo.test.tsx         # NEW — variant rendering (M2 / SPLR-83)
    └── …                              # EXTEND — update existing auth/shell tests for class/token assertions
```

**Structure Decision**: Follow established `apps/web` conventions: presentational components under `src/components/<domain>/`, global styles in `index.css`, static assets in `public/`. Introduce a small `src/theme/` module exporting canonical token values as plain objects for Vitest (not for runtime styling — CSS variables remain source of truth in `:root`). Do **not** add Tailwind or a CSS-in-JS library. When vertical-navigation shell lands, theme it by applying existing BEM classes that already reference `--color-*` tokens rather than duplicating hex values in shell-specific files.

## Complexity Tracking

No constitution violations to justify.

**Notable sequencing constraint**: M3 (shell theming) and M2 (logo wiring in sidebar) depend on navigation shell components. On branches without `AppShell`/`SidebarRail`, implement M1 globally first, wire `BrandLogo` into the existing `app__header` (SPLR-84 partial), and complete full sidebar/mobile logo swap when shell merges (see research.md D5).

## Phase 0 & Phase 1 Artifacts

| Artifact | Path |
|----------|------|
| Research | [research.md](research.md) |
| Data model | [data-model.md](data-model.md) |
| Design token contract | [contracts/design-tokens.md](contracts/design-tokens.md) |
| BrandLogo contract | [contracts/brand-logo.md](contracts/brand-logo.md) |
| UI theming contract | [contracts/ui-theming.md](contracts/ui-theming.md) |
| Quickstart | [quickstart.md](quickstart.md) |

## Milestone → Linear Issue Map

| Milestone | Issues | Plan focus |
|-----------|--------|------------|
| M1 | SPLR-79, SPLR-80, SPLR-81 | `:root` tokens, font imports, global typography |
| M2 | SPLR-82, SPLR-83, SPLR-84 | Logo assets, `BrandLogo`, header/sidebar wiring |
| M3 | SPLR-85, SPLR-86, SPLR-87 | Sidebar, content canvas, mobile nav |
| M4 | SPLR-88, SPLR-89, SPLR-90, SPLR-91 | Buttons, cards/modals/tables, badges, hex migration |
| M5 | SPLR-92, SPLR-93 | Auth layout, welcome/onboarding |
| M6 | SPLR-94, SPLR-95 | WCAG audit, automated regression tests |
