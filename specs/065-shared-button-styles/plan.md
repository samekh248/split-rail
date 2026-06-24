# Implementation Plan: Shared Primary and Secondary Button Styles

**Branch**: `065-shared-button-styles` | **Date**: 2026-06-24 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/065-shared-button-styles/spec.md` (Linear SPLR-88, milestone M4)

## Summary

Deliver **shared Montana High Country button styles** (primary accent fill, secondary brown outline) as CSS utility classes in `apps/web/src/index.css`, backed by M1 design tokens. **Migrate high-traffic primary CTAs** (auth submit, welcome dismiss, dashboard retry, QBO sync, settlement finalize) to consume the shared classes while preserving behavior. Extend Vitest CSS contract and component theme tests; enforce zero legacy slate (`#1e293b`) on submit-style buttons.

**Gap reconciliation**: Parent epic branch work already introduced `.btn-primary`, `.btn-primary--compact`, `.btn-outline`, and a dark-surface `.btn-secondary` plus CSS selector aliases for many high-traffic buttons. **Remaining net-new work**: align `.btn-secondary` with SPLR-88 light-surface spec (brown border/text), wire **Finalize Settlement** (currently unstyled), add explicit shared classes to TSX where missing, expand automated regression tests, and remove redundant per-component color overrides.

Frontend-only (`apps/web`). No backend changes. Depends on `059-mhc-design-tokens` (SPLR-79). Unblocks SPLR-91, SPLR-92, SPLR-93.

## Technical Context

**Language/Version**: TypeScript 5.7 + React 18.3 (`apps/web`), Vite 6. No backend code changes.

**Primary Dependencies**: Montana High Country CSS tokens in `apps/web/src/index.css` (`--color-accent-orange`, `--color-accent-orange-hover`, `--color-primary-brown`, `--color-bg-cream`, `--color-surface-white`, `--radius-button`, `--shadow-soft`, `--color-focus-ring`, `--color-border-subtle`); plain CSS class architecture (no Tailwind).

**Storage**: N/A — presentation-layer CSS only.

**Testing**: Vitest 2 + React Testing Library — extend `apps/web/tests/theme/buttons.test.tsx`; add component theme assertions for migrated surfaces; `legacyPalette.test.ts` already scans `index.css` for denylisted hex. Constitution III: ≥80% line/branch coverage on modified frontend files via `vite.config.ts` thresholds.

**Target Platform**: Modern evergreen browsers (desktop + mobile), Vite SPA.

**Project Type**: Web application — frontend component theming only.

**Performance Goals**: CSS-only change; no runtime performance impact.

**Constraints**: Constitution III — ≥80.0% line/branch coverage on frontend for all new/modified source files; backend N/A. All brand colors in button rules MUST reference named tokens (FR-004, FR-008). No `#1e293b` on submit-style or primary CTA buttons (FR-007). Behavioral assertions in existing tests MUST NOT change (FR-006). Destructive/ghost/link buttons out of scope. No `Button.tsx` wrapper required unless migration cannot be completed with CSS classes alone.

**Scale/Scope**: ~120 lines shared button CSS (partially present), 6–8 TSX files for explicit class adoption, 1 finalize-settlement CSS hook, 3–5 Vitest modules extended/added; no deploy scripts.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Applicable? | Status | Notes |
|---|-----------|-------------|--------|-------|
| I | Core Mathematical Axioms | No | PASS (N/A) | No monetary computation. |
| II | Multi-Tenant Isolation | No | PASS (N/A) | No database access. |
| III | Engineering Rigor & Quality Gates | **Yes — primary** | PASS | CSS contract + component theme tests; ≥80% coverage on modified files. |
| IV | QBO Integration | No | PASS (N/A) | Sync buttons are styled only; no QBO API changes. |
| V | Ledger State Machine & Immutability | No | PASS (N/A) | Visual-only; lock/finalize behavior unchanged. |
| VI | Polyglot Contract Serialization | No | PASS (N/A) | No API types. |
| VII | EF Core Axioms | No | PASS (N/A) | Frontend-only. |
| VIII | Exception Governance & Logging Privacy | No | PASS (N/A) | No logging changes. |
| IX | UI Iconography | No | PASS (N/A) | No icon changes. |
| X | Dual-Platform Operator Scripts | No | PASS (N/A) | No deploy scripts. |

**Gate result (pre-design)**: All gates PASS. No violations.

**Gate result (post-design)**: Unchanged. Artifacts define CSS button contracts and Vitest regression only.

## Project Structure

### Documentation (this feature)

```text
specs/065-shared-button-styles/
├── plan.md              # This file
├── research.md          # Phase 0 — CSS vs wrapper, secondary variants, gap analysis
├── data-model.md        # Phase 1 — button style entities, validation rules
├── quickstart.md        # Phase 1 — manual + automated validation for SPLR-88
├── contracts/
│   └── shared-button-styles.md   # CSS class contract + migration matrix
├── checklists/
│   └── requirements.md  # Spec quality checklist (from /speckit-specify)
└── tasks.md             # Phase 2 output (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
apps/web/
├── src/
│   ├── index.css                              # MODIFY — shared .btn-* rules, finalize hook, secondary alignment
│   ├── components/
│   │   ├── auth/LoginForm.tsx                 # VERIFY — btn-primary present
│   │   ├── auth/RegisterForm.tsx              # VERIFY — btn-primary present
│   │   ├── onboarding/WelcomeModal.tsx        # VERIFY — btn-primary present
│   │   ├── onboarding/OrganizationCreateStep.tsx  # VERIFY — btn-primary present
│   │   ├── qbo/SyncNowButton.tsx              # MODIFY — add btn-primary--compact
│   │   ├── qbo/SyncAllButton.tsx              # MODIFY — add btn-primary--compact
│   │   ├── settlement/FinalizeSettlementPanel.tsx  # MODIFY — add btn-primary
│   │   └── ledger/LedgerGrid.tsx              # VERIFY — lock btn via CSS alias or add class
│   └── pages/
│       ├── DashboardOverviewPage.tsx          # MODIFY — add btn-primary to retry buttons
│       └── AccountingOverviewPage.tsx         # MODIFY — add btn-primary to retry buttons
└── tests/
    └── theme/
        ├── buttons.test.tsx                   # EXTEND — secondary, states, migration hooks
        ├── legacyPalette.test.ts              # EXISTING — whole index.css denylist scan
        └── buttonMigration.test.ts            # NEW — FR-005 surface class assertions
```

**Structure Decision**: CSS-first shared classes in `index.css` (single import via `main.tsx`). Component TSX files receive explicit `btn-primary` / `btn-primary--compact` classes for discoverability; CSS selector aliases retained temporarily for unmigrated selectors but high-traffic FR-005 surfaces MUST use explicit classes.

## Complexity Tracking

> No constitution violations. Table not required.

## Phase Artifacts Summary

| Phase | Artifact | Key decisions |
|-------|----------|---------------|
| 0 | [research.md](./research.md) | CSS classes over React wrapper; dual secondary variants; gap vs epic branch; finalize settlement unstyled |
| 1 | [data-model.md](./data-model.md) | Primary/compact/secondary entities, interaction states, validation rules |
| 1 | [contracts/shared-button-styles.md](./contracts/shared-button-styles.md) | CSS hooks, token map, FR-005 migration matrix, test contract |
| 1 | [quickstart.md](./quickstart.md) | Automated + manual validation steps |
