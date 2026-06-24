# Implementation Plan: White-on-Cream Data Container Theming

**Branch**: `066-white-cream-containers` | **Date**: 2026-06-24 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/066-white-cream-containers/spec.md` (Linear SPLR-89, milestone M4)

## Summary

Standardize **Montana High Country data container styling** so ledger panels, dashboard event cards, deal panels, modals, and table headers present as **Pure White surfaces with subtle depth** on the **Canvas Cream workspace**. Consolidate CSS in `apps/web/src/index.css` using existing design tokens (`--color-surface-white`, `--color-border-subtle`, `--shadow-card` / `--shadow-soft`, `--radius-card`, `--color-bg-cream` for table headers). **Close gaps** where in-scope selectors still use hardcoded `#fff`, lack card shadow, or diverge from the shared container pattern. Extend Vitest CSS contract and component theme tests; no backend changes.

**Gap reconciliation**: Ledger containers (`.block-section`, `.ledger-grid__summary`, `.artist-deal-panel`), modal (`.welcome-modal`), and ledger table headers (`.ledger-table th`) are **largely tokenized already**. **Remaining net-new work**: align `.event-card` with token background + depth, consolidate duplicated container rule blocks via grouped selectors, replace in-scope `#fff` literals with `var(--color-surface-white)`, expand automated container/table-header regression tests, and document the CSS contract. Auth card (`.auth-layout__card`) is already aligned — note for M5 but no additional scope unless trivial verification only.

Frontend-only (`apps/web`). Depends on `059-mhc-design-tokens` (SPLR-79) and cream workspace background (SPLR-86). Unblocks SPLR-91 (legacy hex migration).

## Technical Context

**Language/Version**: TypeScript 5.7 + React 18.3 (`apps/web`), Vite 6. No backend code changes.

**Primary Dependencies**: Montana High Country CSS tokens in `apps/web/src/index.css` (`--color-surface-white`, `--color-bg-cream`, `--color-border-subtle`, `--color-primary-brown`, `--radius-card`, `--shadow-soft`, `--shadow-card`, `--shadow-modal`); plain CSS class architecture (no Tailwind).

**Storage**: N/A — presentation-layer CSS only.

**Testing**: Vitest 2 + React Testing Library — extend `apps/web/tests/components/ledger/LedgerGrid.theme.test.tsx`; add `apps/web/tests/theme/dataContainers.test.ts` and `apps/web/tests/components/dashboard/EventCard.theme.test.tsx`; leverage existing `legacyPalette.test.ts` (denylist includes `#f8fafc`). Constitution III: ≥80% line/branch coverage on modified frontend files via `vite.config.ts` thresholds; backend N/A.

**Target Platform**: Modern evergreen browsers (desktop + mobile), Vite SPA.

**Project Type**: Web application — frontend component theming only.

**Performance Goals**: CSS-only change; no runtime performance impact.

**Constraints**: Constitution III — ≥80.0% line/branch coverage on frontend for all new/modified source files; backend N/A. All container colors MUST reference named tokens (FR-007). No `#f8fafc` or other `LEGACY_HEX_DENYLIST` values in in-scope container rules (FR-004). Table headers MUST use cream-derived tint (`var(--color-bg-cream)` or dedicated token). Auth layout cards MAY remain verified-only (M5 deferral). Settings/team surfaces using `#fff` outside SPLR-89 scope deferred to SPLR-91 unless they share in-scope class names.

**Scale/Scope**: ~40–80 lines CSS consolidation + `.event-card` alignment, 2–4 Vitest modules extended/added, no TSX logic changes expected; no deploy scripts.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Applicable? | Status | Notes |
|---|-----------|-------------|--------|-------|
| I | Core Mathematical Axioms | No | PASS (N/A) | No monetary computation. |
| II | Multi-Tenant Isolation | No | PASS (N/A) | No database access. |
| III | Engineering Rigor & Quality Gates | **Yes — primary** | PASS | CSS contract + component theme tests; ≥80% coverage on modified files. |
| IV | QBO Integration | No | PASS (N/A) | Visual-only. |
| V | Ledger State Machine & Immutability | No | PASS (N/A) | No ledger mutation logic changes. |
| VI | Polyglot Contract Serialization | No | PASS (N/A) | No API types. |
| VII | EF Core Axioms | No | PASS (N/A) | Frontend-only. |
| VIII | Exception Governance & Logging Privacy | No | PASS (N/A) | No logging changes. |
| IX | UI Iconography | No | PASS (N/A) | No icon changes. |
| X | Dual-Platform Operator Scripts | No | PASS (N/A) | No deploy scripts. |

**Gate result (pre-design)**: All gates PASS. No violations.

**Gate result (post-design)**: Unchanged. Artifacts define CSS container contracts and Vitest regression only.

## Project Structure

### Documentation (this feature)

```text
specs/066-white-cream-containers/
├── plan.md              # This file
├── research.md          # Phase 0 — CSS consolidation, gap analysis, table headers
├── data-model.md        # Phase 1 — container entities, validation rules
├── quickstart.md        # Phase 1 — manual + automated validation for SPLR-89
├── contracts/
│   └── data-container-theming.md   # CSS class contract + in-scope selector matrix
├── checklists/
│   └── requirements.md  # Spec quality checklist (from /speckit-specify)
└── tasks.md             # Phase 2 output (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
apps/web/
├── src/
│   ├── index.css                              # MODIFY — consolidate container rules, fix .event-card, token hygiene
│   └── components/
│       ├── ledger/BlockSection.tsx           # VERIFY — uses .block-section (no TSX change expected)
│       ├── ledger/LedgerGrid.tsx              # VERIFY — .ledger-grid__summary
│       ├── artists/ArtistDealPanel.tsx        # VERIFY — .artist-deal-panel
│       ├── dashboard/EventCard.tsx            # VERIFY — .event-card class present
│       └── onboarding/WelcomeModal.tsx        # VERIFY — .welcome-modal tokenized
└── tests/
    ├── theme/
    │   ├── dataContainers.test.ts             # NEW — shared container CSS contract
    │   └── legacyPalette.test.ts              # EXISTING — denylist includes #f8fafc
    └── components/
        ├── ledger/LedgerGrid.theme.test.tsx   # EXTEND — table header + artist panel assertions
        └── dashboard/EventCard.theme.test.tsx # NEW — event-card CSS contract via RTL class check
```

**Structure Decision**: CSS-first consolidation in `index.css` (single import via `main.tsx`). Component TSX files retain existing BEM class names; theming is CSS-only. Group shared container properties under a merged selector list to prevent drift between ledger, dashboard, and modal surfaces.

## Complexity Tracking

> No constitution violations. Table not required.

## Phase Artifacts Summary

| Phase | Artifact | Key decisions |
|-------|----------|---------------|
| 0 | [research.md](./research.md) | Grouped selectors over new React wrapper; event-card gap; table headers use `--color-bg-cream`; auth already aligned |
| 1 | [data-model.md](./data-model.md) | Data container + table header entities, validation rules, in-scope selector matrix |
| 1 | [contracts/data-container-theming.md](./contracts/data-container-theming.md) | CSS hooks, token map, FR migration matrix, test contract |
| 1 | [quickstart.md](./quickstart.md) | Automated + manual validation steps |
