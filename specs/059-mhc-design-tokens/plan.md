# Implementation Plan: Montana High Country Design Tokens

**Branch**: `059-mhc-design-tokens` | **Date**: 2026-06-24 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/059-mhc-design-tokens/spec.md` (Linear SPLR-79, milestone M1)

## Summary

Establish a **single authoritative CSS custom property layer** for the Montana High Country four-color palette (Lodgepole Brown, Alpine Sunset, Canvas Cream, Pure White) plus semantic derived tokens (text-on-light, text-on-dark, subtle borders, button radius, card shadow). Wire `:root` and `body` defaults to cream background and brown text. Ship Vitest contract tests that assert token presence, hex values, and root/body wiring. **No component-level restyling** in this milestone.

This is a **frontend-only** slice (`apps/web`). No backend API, DTO, or database changes. Work unblocks SPLR-80, SPLR-81, SPLR-85, SPLR-86, SPLR-88, SPLR-89, SPLR-90, and SPLR-92.

**Branch note**: `index.css` already contains a partial token block from parent epic work (`058-brand-theming-mhc`). This milestone aligns token names/values with SPLR-79 acceptance criteria, adds missing semantic aliases, and confines brand hex literals to the token definition block.

## Technical Context

**Language/Version**: TypeScript 5.7 + React 18.3 (`apps/web`), built with Vite 6. No backend code changes.

**Primary Dependencies**: Plain CSS (`apps/web/src/index.css`). Optional TypeScript mirror in `apps/web/src/theme/tokens.ts` for Vitest parity (no runtime dependency on TS module from CSS).

**Storage**: CSS custom properties on `:root` in `index.css`. Browser-only; no server persistence.

**Testing**: Vitest 2 + file-read assertions in `apps/web/tests/theme/cssTokens.test.ts` and `designTokens.test.ts`; contrast math via `apps/web/src/theme/contrast.ts`. Coverage enforced at ≥80% lines/functions/branches/statements via existing `vite.config.ts` thresholds on modified/new theme modules.

**Target Platform**: Modern evergreen browsers (desktop + mobile), Vite SPA.

**Project Type**: Web application — frontend design-token foundation only.

**Performance Goals**: Token-only change; no runtime performance impact. CSS parse cost unchanged.

**Constraints**: Constitution VI — no new hand-authored API payload types (N/A). Constitution III — ≥80.0% line/branch coverage on frontend for all new/modified source files; backend N/A. Brand hex values MUST appear only in the centralized token block (FR-005). Alpine Sunset token value MUST match brand guide `#E65100` per FR-001; CTA label contrast handled via `--color-surface-white` on orange, not by silently substituting a different accent hex. No Tailwind. Component restyling, font loading (SPLR-80), typography rules (SPLR-81), and legacy hex migration from component rules are **out of scope**.

**Scale/Scope**: 4 core color tokens + ~6 derived semantic tokens; 1 CSS file (or optional `styles/tokens.css` import); 1–2 TypeScript mirror modules; 2 Vitest modules extended for M1 contract; zero component file changes unless required to remove duplicate brand hex introduced during token extraction.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Applicable? | Status | Notes |
|---|-----------|-------------|--------|-------|
| I | Core Mathematical Axioms | No | PASS (N/A) | No monetary computation. |
| II | Multi-Tenant Isolation | No | PASS (N/A) | No database access. |
| III | Engineering Rigor & Quality Gates | **Yes — primary** | PASS | Extend `cssTokens.test.ts` / `designTokens.test.ts` and `tokens.ts` mirror; ≥80% coverage gate via `vite.config.ts`. |
| IV | QBO Integration | No | PASS (N/A) | No QuickBooks interaction. |
| V | Ledger State Machine & Immutability | No | PASS (N/A) | Visual-only token layer. |
| VI | Polyglot Contract Serialization | No | PASS (N/A) | No API types. |
| VII | EF Core Axioms | No | PASS (N/A) | Frontend-only. |
| VIII | Exception Governance & Logging Privacy | No | PASS (N/A) | No logging changes. |
| IX | UI Iconography | No | PASS (N/A) | No icon changes in M1. |
| X | Dual-Platform Operator Scripts | No | PASS (N/A) | No deploy scripts. |

**Gate result (pre-design)**: All gates PASS. No violations.

**Gate result (post-design)**: Unchanged. Artifacts define CSS token contracts and Vitest regression only.

## Project Structure

### Documentation (this feature)

```text
specs/059-mhc-design-tokens/
├── plan.md              # This file
├── research.md          # Phase 0 — token location, naming, accent value, test strategy
├── data-model.md        # Phase 1 — core + derived token catalog
├── quickstart.md        # Phase 1 — manual + automated validation for M1
├── contracts/
│   └── design-tokens.md # CSS custom property contract (M1 scope)
├── checklists/
│   └── requirements.md  # Spec quality checklist (from /speckit-specify)
└── tasks.md             # Phase 2 output (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
apps/web/
├── src/
│   ├── index.css                      # EXTEND — :root token block, :root/body defaults
│   ├── main.tsx                       # UNCHANGED — already imports index.css
│   └── theme/
│       ├── tokens.ts                  # EXTEND — canonical hex mirror + requiredCssVariables
│       └── contrast.ts                # EXISTING — WCAG ratio helper for tests
└── tests/
    └── theme/
        ├── cssTokens.test.ts          # EXTEND — core hex + semantic token presence
        └── designTokens.test.ts       # EXTEND — contrast pairings for M1 tokens
```

**Structure Decision**: Keep tokens in `index.css` `:root` (single import path via `main.tsx`). Do not extract to `styles/tokens.css` unless `index.css` token block exceeds ~60 lines — current file already centralizes tokens; extraction deferred per research D1.

## Complexity Tracking

> No constitution violations. Table not required.
