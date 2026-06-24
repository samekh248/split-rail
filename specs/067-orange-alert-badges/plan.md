# Implementation Plan: Alert and Action-Required Badges (Orange Pills)

**Branch**: `067-orange-alert-badges` | **Date**: 2026-06-24 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/067-orange-alert-badges/spec.md` (Linear SPLR-90, milestone M4)

## Summary

Standardize **Montana High Country orange pill badges** for action-required and alert labels via shared CSS utilities (`.badge-action-required`, `.badge-alert` alias) in `apps/web/src/index.css`, backed by M1 design tokens. **Wire badge classes into in-scope TSX surfaces** (event-card bottleneck chips, unmapped-account notices, accounting workload indicators) while **preserving distinct warning-token styling** for ledger variance data cells and variance summary banners.

**Gap reconciliation**: Parent epic branch (`058-brand-theming-mhc`) already introduced `.badge-action-required` CSS and a minimal CSS contract test. **Remaining net-new work**: add `.badge-alert` alias, migrate event-card alert chips from legacy amber hex to shared badge class, tokenize event-card variance badge (warning semantics, not orange pill), render badges in `UnmappedBanner` and `AccountingWorkloadList`, extend Vitest CSS + component migration tests, add badge contrast pairing to `tokens.ts`, and remove legacy hex from affected badge rules.

Frontend-only (`apps/web`). No backend changes. Depends on `059-mhc-design-tokens` (SPLR-79). Part of M4 component theming; complements `065-shared-button-styles` (SPLR-88).

## Technical Context

**Language/Version**: TypeScript 5.7 + React 18.3 (`apps/web`), Vite 6. No backend code changes.

**Primary Dependencies**: Montana High Country CSS tokens in `apps/web/src/index.css` (`--color-accent-orange`, `--color-surface-white`, `--color-warning-bg`, `--color-warning-border`, `--color-warning-text`, `--color-accent-orange-hover`); plain CSS class architecture (no Tailwind); `@/theme/contrast` + `@/theme/tokens` for WCAG assertions.

**Storage**: N/A — presentation-layer CSS and className wiring only.

**Testing**: Vitest 2 + React Testing Library — extend `apps/web/tests/theme/badges.test.tsx`; add `badgeMigration.test.tsx` for FR-002/FR-003 surface class assertions; extend `EventCard.theme.test.tsx`; add contrast pairing for badge text in `tokens.ts` / `contrast.test.ts`. Constitution III: ≥80% line/branch coverage on modified frontend files via `vite.config.ts` thresholds.

**Target Platform**: Modern evergreen browsers (desktop + mobile), Vite SPA.

**Project Type**: Web application — frontend component theming only.

**Performance Goals**: CSS-only change; no runtime performance impact.

**Constraints**: Constitution III — ≥80.0% line/branch coverage on frontend for all new/modified source files; backend N/A. Badge colors MUST reference named tokens (FR-007). Flagged variance cells MUST NOT use orange pill styling (FR-004). Neutral informational chips (booking preview, deduction markers) out of scope (FR-006). Bottleneck filter toggle button out of scope per spec assumptions. No deploy scripts.

**Scale/Scope**: ~15 lines shared badge CSS (partially present), 3–4 TSX files for class adoption, token migration for 2 event-card badge CSS blocks, 2–3 Vitest modules extended/added; no API or database changes.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Applicable? | Status | Notes |
|---|-----------|-------------|--------|-------|
| I | Core Mathematical Axioms | No | PASS (N/A) | No monetary computation. |
| II | Multi-Tenant Isolation | No | PASS (N/A) | No database access. |
| III | Engineering Rigor & Quality Gates | **Yes — primary** | PASS | CSS contract + component migration tests; ≥80% coverage on modified files. |
| IV | QBO Integration | No | PASS (N/A) | Unmapped banner styled only; no QBO API changes. |
| V | Ledger State Machine & Immutability | No | PASS (N/A) | Visual-only; variance display semantics unchanged. |
| VI | Polyglot Contract Serialization | No | PASS (N/A) | No API types. |
| VII | EF Core Axioms | No | PASS (N/A) | Frontend-only. |
| VIII | Exception Governance & Logging Privacy | No | PASS (N/A) | No logging changes. |
| IX | UI Iconography | No | PASS (N/A) | No icon changes. |
| X | Dual-Platform Operator Scripts | No | PASS (N/A) | No deploy scripts. |

**Gate result (pre-design)**: All gates PASS. No violations.

**Gate result (post-design)**: Unchanged. Artifacts define CSS badge contracts and Vitest regression only.

## Project Structure

### Documentation (this feature)

```text
specs/067-orange-alert-badges/
├── plan.md              # This file
├── research.md          # Phase 0 — CSS alias, variance vs action semantics, gap analysis
├── data-model.md        # Phase 1 — badge style entities, validation rules
├── quickstart.md        # Phase 1 — manual + automated validation for SPLR-90
├── contracts/
│   └── alert-badge-styles.md   # CSS class contract + migration matrix
├── checklists/
│   └── requirements.md  # Spec quality checklist (from /speckit-specify)
└── tasks.md             # Phase 2 output (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
apps/web/
├── src/
│   ├── index.css                              # MODIFY — .badge-alert alias, tokenize event-card badges, workload hooks
│   ├── theme/
│   │   └── tokens.ts                          # MODIFY — add badge contrast pairing (white-on-orange 4.5:1)
│   └── components/
│       ├── dashboard/EventCard.tsx            # MODIFY — badge-action-required on alert chips; variance stays warning
│       ├── qbo/UnmappedBanner.tsx             # MODIFY — render badge-action-required label in notice
│       └── accounting/AccountingWorkloadList.tsx  # MODIFY — badge-action-required on unassigned + alert labels
└── tests/
    └── theme/
        ├── badges.test.tsx                    # EXTEND — .badge-alert alias, font-size, contrast
        ├── badgeMigration.test.tsx            # NEW — FR-002/FR-003 surface class assertions
        ├── contrast.test.ts                   # EXTEND — badge pairing if added to tokens
        └── components/dashboard/
            └── EventCard.theme.test.tsx       # EXTEND — alert chip + variance badge class assertions
```

**Structure Decision**: CSS-first shared badge classes in `index.css`. TSX surfaces receive explicit `badge-action-required` (or `badge-alert`) for testability. Component BEM classes retained for layout; color/typography from shared utilities. Variance data surfaces use warning tokens, not badge utilities.

## Complexity Tracking

> No constitution violations. Table not required.

## Phase Artifacts Summary

| Phase | Artifact | Key decisions |
|-------|----------|---------------|
| 0 | [research.md](./research.md) | CSS alias for alert/action; variance stays warning tokens; epic gap analysis; contrast at 12px bold |
| 1 | [data-model.md](./data-model.md) | Badge entities, variance flag entity, validation rules, migration targets |
| 1 | [contracts/alert-badge-styles.md](./contracts/alert-badge-styles.md) | CSS hooks, token map, FR-002/FR-003 migration matrix, test contract |
| 1 | [quickstart.md](./quickstart.md) | Automated + manual validation steps |
