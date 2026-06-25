# Implementation Plan: WCAG AA Contrast Audit and Token Adjustments

**Branch**: `071-wcag-contrast-audit` | **Date**: 2026-06-24 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/071-wcag-contrast-audit/spec.md` (Linear SPLR-94, milestone M6)

## Summary

Systematically **audit every Montana High Country foreground/background pairing** against WCAG 2.x Level AA, **document measured ratios** in `apps/web/src/brand/contrast-audit.md`, and **remediate failures at the design-token layer** in `apps/web/src/index.css` and `apps/web/src/theme/tokens.ts`. Extend the existing `contrast.ts` helper with **rgba compositing** for opacity-derived tokens, expand `contrastPairings` and Vitest coverage, and fix known gaps: **subtle borders below 3:1 UI contrast**, **disabled CTA opacity reducing label contrast**, and formalizing **`--color-text-on-accent`** for orange surfaces. Frontend-only; no backend changes.

Depends on M1–M5 token migration (`059`–`068`) and theme/onboarding (`069`) being substantially complete per Linear `blockedBy` relations.

## Technical Context

**Language/Version**: TypeScript 5.7 + React 18.3 (`apps/web`), Vite 6. No backend code changes.

**Primary Dependencies**: Montana High Country CSS tokens in `apps/web/src/index.css` (`:root`); `@/theme/contrast` (WCAG relative-luminance math); `@/theme/tokens` (canonical hex + `contrastPairings`); existing Vitest theme suite under `apps/web/tests/theme/`.

**Storage**: N/A — presentation-layer tokens + committed audit markdown only.

**Testing**: Vitest 2 — extend `contrast.test.ts`, `designTokens.test.ts`; add `contrastAudit.test.ts`, `contrastPairingsExpanded.test.ts` (or merge into `designTokens.test.ts`); optional `generateContrastAudit.ts` script invoked from test to keep `contrast-audit.md` in sync. Constitution III: ≥80% line/branch coverage on modified frontend files via `vite.config.ts` thresholds.

**Target Platform**: Modern evergreen browsers (desktop + mobile), Vite SPA.

**Project Type**: Web application — frontend accessibility token audit and adjustment only.

**Performance Goals**: Contrast helpers run in unit tests only; no runtime performance impact.

**Constraints**: Constitution III — ≥80.0% line/branch coverage on frontend for all new/modified source files; backend N/A. Remediation MUST be token-level (FR-005); no per-component hex overrides. Preserve Montana High Country identity; document before/after ratios for any visible shift. No deploy scripts (Constitution §X N/A). Existing a11y tests (`LoginForm.test.tsx` aria associations, theme tests) MUST not regress.

**Scale/Scope**: ~15–25 contrast pairings audited (core + semantic + interactive states); 2–4 token value adjustments expected (`--color-border-subtle`, disabled CTA treatment, `--color-text-on-accent` alias); 1 audit markdown file; extend `contrast.ts` (~40 lines); 2–3 Vitest modules; no API or database changes.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Applicable? | Status | Notes |
|---|-----------|-------------|--------|-------|
| I | Core Mathematical Axioms | No | PASS (N/A) | No monetary computation. |
| II | Multi-Tenant Isolation | No | PASS (N/A) | No database access. |
| III | Engineering Rigor & Quality Gates | **Yes — primary** | PASS | Contrast unit tests + expanded pairings; ≥80% coverage on `contrast.ts`, `tokens.ts`, audit generator. |
| IV | QBO Integration | No | PASS (N/A) | Visual-only. |
| V | Ledger State Machine & Immutability | No | PASS (N/A) | Visual-only. |
| VI | Polyglot Contract Serialization | No | PASS (N/A) | No API types. |
| VII | EF Core Axioms | No | PASS (N/A) | Frontend-only. |
| VIII | Exception Governance & Logging Privacy | No | PASS (N/A) | No logging changes. |
| IX | UI Iconography | No | PASS (N/A) | No icon changes. |
| X | Dual-Platform Operator Scripts | No | PASS (N/A) | No deploy scripts. |

**Gate result (pre-design)**: All gates PASS. No violations.

**Gate result (post-design)**: Unchanged. Artifacts define contrast contracts and Vitest regression only.

## Project Structure

### Documentation (this feature)

```text
specs/071-wcag-contrast-audit/
├── plan.md              # This file
├── research.md          # Phase 0 — pairing inventory, gap analysis, remediation decisions
├── data-model.md        # Phase 1 — token entities, audit records, validation rules
├── quickstart.md        # Phase 1 — automated + manual validation for SPLR-94
├── contracts/
│   └── wcag-contrast-audit.md   # Pairing matrix, thresholds, token remediation contract
├── checklists/
│   └── requirements.md  # Spec quality checklist (from /speckit-specify)
└── tasks.md             # Phase 2 output (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
apps/web/
├── src/
│   ├── index.css                              # MODIFY — token value adjustments; disabled CTA styles; border opacity
│   ├── brand/
│   │   └── contrast-audit.md                  # NEW — committed audit report (before/after ratios)
│   └── theme/
│       ├── contrast.ts                        # MODIFY — rgba compositing; meetsWcagAaLargeText; disabled-state helper
│       └── tokens.ts                          # MODIFY — expand contrastPairings; add textOnAccent; requiredCssVariables
└── tests/
    └── theme/
        ├── contrast.test.ts                   # MODIFY — compositing + threshold helpers
        ├── designTokens.test.ts               # MODIFY — full pairing gate
        └── contrastAudit.test.ts              # NEW — audit doc structure + pairing completeness
```

**Structure Decision**: Extend existing M1 contrast infrastructure (`059-mhc-design-tokens`) rather than introducing new dependencies. Audit markdown lives beside brand assets per Linear SPLR-94. CSS changes limited to `:root` token values and shared utility selectors (buttons, badges, borders) — no TSX changes expected unless a component uses non-token accent text color (grep shows none; buttons/badges already use `--color-surface-white`).

## Complexity Tracking

> No constitution violations. Table not required.

## Phase Artifacts Summary

| Phase | Artifact | Key decisions |
|-------|----------|---------------|
| 0 | [research.md](./research.md) | Extend `contrast.ts` with compositing; formalize `--color-text-on-accent`; raise border opacity; fix disabled CTA contrast |
| 1 | [data-model.md](./data-model.md) | Audit record schema, pairing inventory, validation rules |
| 1 | [contracts/wcag-contrast-audit.md](./contracts/wcag-contrast-audit.md) | Pairing matrix, thresholds, remediation contract |
| 1 | [quickstart.md](./quickstart.md) | Automated + manual validation steps |
