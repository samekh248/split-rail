# Implementation Plan: Legacy Slate/Blue Color Token Migration

**Branch**: `068-slateblue-token-migration` | **Date**: 2026-06-24 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/068-slateblue-token-migration/spec.md` (Linear SPLR-91, milestone M4)

## Summary

Complete the **remaining Montana High Country color debt** in `apps/web/src/index.css` by replacing one-off hardcoded hex literals (white shorthand, cool-toned success/error greens, amber session notices, redundant error reds) with **semantic design token references**. Legacy slate/blue denylist already passes; net-new work is **tokenizing ~25 hex literals outside `:root`**, consolidating duplicate success/error banner patterns into shared utilities, extending automated hex-budget and form-field token tests, and documenting any intentional exceptions (target: zero outside `:root`).

Frontend-only (`apps/web`). No backend changes. Depends on M4 foundations: `065-shared-button-styles` (SPLR-88), `066-white-cream-containers` (SPLR-89), `067-orange-alert-badges` (SPLR-90). Unblocks SPLR-94 (WCAG audit) and SPLR-95 (color regression tests).

## Technical Context

**Language/Version**: TypeScript 5.7 + React 18.3 (`apps/web`), Vite 6. No backend code changes.

**Primary Dependencies**: Montana High Country CSS tokens in `apps/web/src/index.css` (`:root` block); `@/theme/legacyPalette` denylist; `@/theme/tokens` for test parity; plain CSS class architecture (no Tailwind).

**Storage**: N/A — presentation-layer CSS only.

**Testing**: Vitest 2 — extend `legacyPalette.test.ts`; add `hexBudget.test.ts`, `formFieldTokens.test.ts`, `colorMigration.test.ts` under `apps/web/tests/theme/`. Constitution III: ≥80% line/branch coverage on modified frontend files via `vite.config.ts` thresholds.

**Target Platform**: Modern evergreen browsers (desktop + mobile), Vite SPA.

**Project Type**: Web application — frontend stylesheet token migration only.

**Performance Goals**: CSS-only change; no runtime performance impact.

**Constraints**: Constitution III — ≥80.0% line/branch coverage on frontend for all new/modified source files; backend N/A. ≤5 intentional hardcoded hex literals outside `:root` (FR-002; target zero). New `:root` semantic tokens only when pattern repeats ≥3 times (FR-006). Do not re-theme button, container, or badge surfaces owned by SPLR-88/89/90. No deploy scripts.

**Scale/Scope**: ~25 hex literal replacements across `index.css`; optional `:root` success token trio if consolidated to ≥3 call sites; 3–4 Vitest modules; 1 component inline hex review (`SignaturePad.tsx`); no API or database changes.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Applicable? | Status | Notes |
|---|-----------|-------------|--------|-------|
| I | Core Mathematical Axioms | No | PASS (N/A) | No monetary computation. |
| II | Multi-Tenant Isolation | No | PASS (N/A) | No database access. |
| III | Engineering Rigor & Quality Gates | **Yes — primary** | PASS | Hex budget + form-field + migration tests; ≥80% coverage on modified files. |
| IV | QBO Integration | No | PASS (N/A) | Visual-only; unassigned drawer styling unchanged behaviorally. |
| V | Ledger State Machine & Immutability | No | PASS (N/A) | Visual-only. |
| VI | Polyglot Contract Serialization | No | PASS (N/A) | No API types. |
| VII | EF Core Axioms | No | PASS (N/A) | Frontend-only. |
| VIII | Exception Governance & Logging Privacy | No | PASS (N/A) | No logging changes. |
| IX | UI Iconography | No | PASS (N/A) | No icon changes. |
| X | Dual-Platform Operator Scripts | No | PASS (N/A) | No deploy scripts. |

**Gate result (pre-design)**: All gates PASS. No violations.

**Gate result (post-design)**: Unchanged. Artifacts define CSS token contracts and Vitest regression only.

## Project Structure

### Documentation (this feature)

```text
specs/068-slateblue-token-migration/
├── plan.md              # This file
├── research.md          # Phase 0 — hex inventory, token strategy, gap analysis
├── data-model.md        # Phase 1 — token entities, migration targets, validation rules
├── quickstart.md        # Phase 1 — manual + automated validation for SPLR-91
├── contracts/
│   └── color-token-migration.md   # CSS token map + migration matrix + hex budget contract
├── checklists/
│   └── requirements.md  # Spec quality checklist (from /speckit-specify)
└── tasks.md             # Phase 2 output (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
apps/web/
├── src/
│   ├── index.css                              # MODIFY — replace hex literals; add shared feedback utilities; optional success tokens
│   ├── theme/
│   │   ├── tokens.ts                          # MODIFY — register new semantic tokens if added; extend requiredCssVariables
│   │   └── legacyPalette.ts                   # VERIFY — denylist unchanged (already enforced)
│   └── components/
│       └── settlement/SignaturePad.tsx        # REVIEW — document #111 canvas ink as intentional exception
└── tests/
    └── theme/
        ├── legacyPalette.test.ts              # VERIFY — denylist scan (already passing)
        ├── hexBudget.test.ts                  # NEW — FR-002 ≤5 hex outside :root
        ├── formFieldTokens.test.ts            # NEW — FR-003 form-field token assertions
        └── colorMigration.test.ts             # NEW — success/error/warning/session notice token map
```

**Structure Decision**: CSS-first token migration in `index.css`. No TSX className changes expected unless a component uses inline brand hex (only `SignaturePad.tsx` canvas stroke). Tests read CSS file content matching established M4 theme test patterns.

## Complexity Tracking

> No constitution violations. Table not required.

## Phase Artifacts Summary

| Phase | Artifact | Key decisions |
|-------|----------|---------------|
| 0 | [research.md](./research.md) | Denylist already clean; 25 hex literals to migrate; `#fff` → surface/text tokens; shared feedback utilities; success token ≥3 rule |
| 1 | [data-model.md](./data-model.md) | Token entities, migration targets, validation rules |
| 1 | [contracts/color-token-migration.md](./contracts/color-token-migration.md) | Hex→token map, FR migration matrix, test contract |
| 1 | [quickstart.md](./quickstart.md) | Automated + manual validation steps |
