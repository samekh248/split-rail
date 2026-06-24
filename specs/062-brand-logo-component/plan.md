# Implementation Plan: Brand Logo Component (Text & Badge Variants)

**Branch**: `062-brand-logo-component` | **Date**: 2026-06-24 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/062-brand-logo-component/spec.md` (Linear SPLR-83, milestone M2)

## Summary

Deliver a reusable **`BrandLogo`** React component with **`text`** (wordmark) and **`badge`** (compact rail) variants that render branded PNG assets from a centralized **`assets.ts`** registry, centered inside a stable wrapper with ≥24px padding for the wordmark and max-width constraints for the badge. Ship Vitest + React Testing Library coverage for variant rendering, asset paths, default/custom `alt`, and wrapper `className` merging. Global layout styles live in `index.css` under `.brand-logo-*` classes.

This is a **frontend-only** slice (`apps/web`). No backend API, DTO, or database changes. Unblocks SPLR-84 (navigation shell wiring).

**Branch note**: Substantial implementation already landed from parent epic `058-brand-theming-mhc` — `BrandLogo.tsx`, `assets.ts`, `index.css` logo block, and `tests/theme/BrandLogo.test.tsx` exist. An additional **`auth`** variant is present in code but is **out of scope** for SPLR-83 per spec. This plan formalizes the SPLR-83 contract, reconciles any gaps against acceptance criteria, and defines verification steps; `/speckit-tasks` may produce mostly verification or gap-fill tasks.

## Technical Context

**Language/Version**: TypeScript 5.7 + React 18.3 (`apps/web`), built with Vite 6. No backend code changes.

**Primary Dependencies**: React functional component, plain CSS in `apps/web/src/index.css`, static PNG assets under `apps/web/public/brand/`, path constants in `apps/web/src/brand/assets.ts`.

**Storage**: Static public assets (`sr-text.png`, `sr-badge.png`); no server persistence.

**Testing**: Vitest 2 + React Testing Library — `apps/web/tests/theme/BrandLogo.test.tsx` per project convention (`tests/theme/**` from epic M2). Coverage enforced at ≥80% lines/functions/branches/statements via existing `vite.config.ts` thresholds on `BrandLogo.tsx`.

**Target Platform**: Modern evergreen browsers (desktop + mobile), Vite SPA.

**Project Type**: Web application — frontend brand component only.

**Performance Goals**: Instant variant swap on sidebar toggle; optional opacity transition must not delay render. Stable wrapper min-height prevents layout shift (SC-004).

**Constraints**: Constitution III — ≥80.0% line/branch coverage on frontend for all new/modified source files; backend N/A. Constitution VI — no hand-authored API types (N/A). Constitution IX — logo uses brand PNG assets, not Font Awesome (iconography exception for generated/brand assets). Image paths MUST appear only in `assets.ts` (FR-009). Navigation wiring is **out of scope** (SPLR-84). `auth` variant is **out of scope** for SPLR-83 but may coexist in the component for epic continuity.

**Scale/Scope**: 1 component file, 1 asset registry module, ~25 lines CSS, 2 PNG assets, 1 Vitest module (~5 cases for SPLR-83 scope); no deploy scripts.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Applicable? | Status | Notes |
|---|-----------|-------------|--------|-------|
| I | Core Mathematical Axioms | No | PASS (N/A) | No monetary computation. |
| II | Multi-Tenant Isolation | No | PASS (N/A) | No database access. |
| III | Engineering Rigor & Quality Gates | **Yes — primary** | PASS | `BrandLogo.test.tsx` with Vitest + RTL; ≥80% coverage gate via `vite.config.ts`. |
| IV | QBO Integration | No | PASS (N/A) | No QuickBooks interaction. |
| V | Ledger State Machine & Immutability | No | PASS (N/A) | Presentational UI only. |
| VI | Polyglot Contract Serialization | No | PASS (N/A) | No API types. |
| VII | EF Core Axioms | No | PASS (N/A) | Frontend-only. |
| VIII | Exception Governance & Logging Privacy | No | PASS (N/A) | No logging changes. |
| IX | UI Iconography | No | PASS (N/A) | Brand PNG logos are an allowed exception per iconography.md. |
| X | Dual-Platform Operator Scripts | No | PASS (N/A) | No deploy scripts. |

**Gate result (pre-design)**: All gates PASS. No violations.

**Gate result (post-design)**: Unchanged. Artifacts define component API contract, CSS layout rules, and Vitest regression only.

## Project Structure

### Documentation (this feature)

```text
specs/062-brand-logo-component/
├── plan.md              # This file
├── research.md          # Phase 0 — rendering pattern, test location, scope boundaries
├── data-model.md        # Phase 1 — component props, asset registry, CSS classes
├── quickstart.md        # Phase 1 — manual + automated validation for SPLR-83
├── contracts/
│   └── brand-logo.md    # Component API + CSS + Vitest contract
├── checklists/
│   └── requirements.md  # Spec quality checklist (from /speckit-specify)
└── tasks.md             # Phase 2 output (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
apps/web/
├── public/
│   └── brand/
│       ├── sr-text.png                 # Wordmark asset (SPLR-82)
│       └── sr-badge.png                # Badge asset (SPLR-82)
├── src/
│   ├── brand/
│   │   └── assets.ts                   # BRAND_LOGO_TEXT, BRAND_LOGO_BADGE path constants
│   ├── components/
│   │   └── brand/
│   │       └── BrandLogo.tsx           # text | badge (+ auth out of SPLR-83 scope)
│   └── index.css                       # .brand-logo-wrapper, .brand-logo--text, .brand-logo--badge
└── tests/
    └── theme/
        └── BrandLogo.test.tsx          # Variant, alt, className contract tests
```

**Structure Decision**: Monorepo web app under `apps/web`. Keep tests in `tests/theme/` (established by `058-brand-theming-mhc`) rather than Linear issue's suggested `tests/components/brand/` path to avoid duplicate suites. SPLR-83 tests cover `text` and `badge` only; `auth` tests may remain for epic continuity but are not SPLR-83 acceptance criteria.

## Complexity Tracking

> No constitution violations. Table not required.
