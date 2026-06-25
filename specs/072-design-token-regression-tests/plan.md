# Implementation Plan: Automated Design Token and Color Regression Tests

**Branch**: `072-design-token-regression-tests` | **Date**: 2026-06-24 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/072-design-token-regression-tests/spec.md` (Linear SPLR-95, milestone M6)

## Summary

Consolidate **deterministic brand regression checks** into a dedicated `apps/web/tests/brand/` suite that verifies **`:root` CSS custom properties in `index.css` match the canonical `colors` export in `tokens.ts`**, **required token names remain present**, and **legacy slate-blue hex values do not reappear** in the global stylesheet. Extract shared CSS parsing into a small `@/theme` utility so tests are DOM-free and failure messages name the offending token or hex. Add an npm `test:brand` script for focused runs; existing `npm test` already includes the suite via Vitest glob. Document the maintainer update procedure when approved brand values change. Frontend-only; complements SPLR-94 contrast tests in `tests/theme/designTokens.test.ts` without duplicating WCAG ratio logic.

Depends on M1 tokens and SPLR-91 migration (`068`) being substantially complete per spec Assumptions.

## Technical Context

**Language/Version**: TypeScript 5.7 + React 18.3 (`apps/web`), Vite 6. No backend code changes.

**Primary Dependencies**: Montana High Country tokens in `apps/web/src/index.css` (`:root`); canonical values in `apps/web/src/theme/tokens.ts` (`colors`, `requiredCssVariables`); legacy denylist in `apps/web/src/theme/legacyPalette.ts` (`LEGACY_HEX_DENYLIST`); existing Vitest theme suite (`tests/theme/cssTokens.test.ts`, `legacyPalette.test.ts`, `hexBudget.test.ts`) as migration-era coverage to consolidate.

**Storage**: N/A — static CSS + TypeScript token module only.

**Testing**: Vitest 2 — new `tests/brand/designTokens.test.ts` (primary SPLR-95 deliverable); new `@/theme/parseCssRoot.ts` utility with `parseCssRoot.test.ts`; optional thin re-exports or deduplication in `tests/theme/cssTokens.test.ts` / `legacyPalette.test.ts` to avoid duplicate assertions. Constitution III: ≥80% line/branch coverage on all new/modified frontend source files via `npm run test:coverage`.

**Target Platform**: Modern evergreen browsers (desktop + mobile), Vite SPA; tests run in Node via `readFileSync` (no jsdom).

**Project Type**: Web application — frontend brand regression guardrails only.

**Performance Goals**: Brand suite completes in &lt;2s locally; no runtime impact in production.

**Constraints**: Constitution III — ≥80.0% line/branch coverage on frontend for new/modified files; backend N/A. Tests MUST NOT use browser DOM (FR-005). Single source of truth for expected hex: `tokens.ts` `colors` export; `index.css` is the runtime sink under test. Legacy scan scoped to full `index.css` per spec. No deploy scripts (Constitution §X N/A). Do not weaken existing `hexBudget` or `colorMigration` theme tests during consolidation.

**Scale/Scope**: ~15–20 `:root` color tokens under parity check; 10-entry `LEGACY_HEX_DENYLIST` (superset of required `#1e293b` / `#2563eb`); 1 new test module + 1 parser utility; 1 npm script; maintainer doc section in `quickstart.md`; no API or database changes.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Applicable? | Status | Notes |
|---|-----------|-------------|--------|-------|
| I | Core Mathematical Axioms | No | PASS (N/A) | No monetary computation. |
| II | Multi-Tenant Isolation | No | PASS (N/A) | No database access. |
| III | Engineering Rigor & Quality Gates | **Yes — primary** | PASS | Vitest brand regression + parser unit tests; ≥80% coverage on new modules. |
| IV | QBO Integration | No | PASS (N/A) | Visual-only. |
| V | Ledger State Machine & Immutability | No | PASS (N/A) | Visual-only. |
| VI | Polyglot Contract Serialization | No | PASS (N/A) | No API types. |
| VII | EF Core Axioms | No | PASS (N/A) | Frontend-only. |
| VIII | Exception Governance & Logging Privacy | No | PASS (N/A) | No logging changes. |
| IX | UI Iconography | No | PASS (N/A) | No icon changes. |
| X | Dual-Platform Operator Scripts | No | PASS (N/A) | No deploy scripts. |

**Gate result (pre-design)**: All gates PASS. No violations.

**Gate result (post-design)**: Unchanged. Artifacts define brand regression contracts and Vitest coverage only.

## Project Structure

### Documentation (this feature)

```text
specs/072-design-token-regression-tests/
├── plan.md              # This file
├── research.md          # Phase 0 — consolidation strategy, parser design, overlap resolution
├── data-model.md        # Phase 1 — token parity map, denylist, validation rules
├── quickstart.md        # Phase 1 — test:brand, CI gate, maintainer update procedure
├── contracts/
│   └── design-token-regression.md   # Parity matrix, legacy scan, failure message contract
├── checklists/
│   └── requirements.md  # Spec quality checklist (from /speckit-specify)
└── tasks.md             # Phase 2 output (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
apps/web/
├── package.json                               # MODIFY — add "test:brand" script
├── src/
│   ├── index.css                              # READ — runtime :root token sink under test
│   └── theme/
│       ├── tokens.ts                          # READ/MODIFY — add rootTokenParity map if needed
│       ├── legacyPalette.ts                   # READ — LEGACY_HEX_DENYLIST (existing)
│       └── parseCssRoot.ts                    # NEW — extract :root custom properties from CSS text
└── tests/
    ├── brand/
    │   └── designTokens.test.ts               # NEW — SPLR-95 primary regression suite
    └── theme/
        ├── parseCssRoot.test.ts               # NEW — parser unit tests
        ├── cssTokens.test.ts                  # MODIFY — delegate or trim overlap with brand suite
        └── legacyPalette.test.ts              # MODIFY — delegate legacy scan to brand suite or remove duplicate
```

**Structure Decision**: Linear SPLR-95 specifies `tests/brand/designTokens.test.ts` as the canonical brand regression entry point. Extract duplicated `extractRootBlock` logic from scattered theme tests into `parseCssRoot.ts`. Keep WCAG contrast pairing tests in `tests/theme/designTokens.test.ts` (SPLR-94); brand suite covers **value parity** and **legacy hex guardrails** only. Theme migration tests (`colorMigration`, `hexBudget`, `formFieldTokens`) remain in `tests/theme/` — out of scope for consolidation except removing exact duplicate legacy-scan assertions.

## Complexity Tracking

> No constitution violations. Table not required.

## Phase Artifacts Summary

| Phase | Artifact | Key decisions |
|-------|----------|---------------|
| 0 | [research.md](./research.md) | `tokens.ts` as expected record; `parseCssRoot` utility; consolidate legacy scan; `test:brand` script |
| 1 | [data-model.md](./data-model.md) | Parity map schema, denylist entities, validation rules |
| 1 | [contracts/design-token-regression.md](./contracts/design-token-regression.md) | Token parity contract, legacy scan, maintainer update contract |
| 1 | [quickstart.md](./quickstart.md) | `test:brand`, intentional-failure validation, update procedure |
