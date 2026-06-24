# Implementation Plan: Artist Deduction Toggle on Expense Rows

**Branch**: `018-artist-deduction-toggle-ui` | **Date**: 2026-06-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/018-artist-deduction-toggle-ui/spec.md` (Linear SPLR-29)

## Summary

Expose the existing `is_artist_deduction` field on expense ledger rows so venue managers can configure which overhead is stripped from gross before artist split percentages. Backend deal math (`LedgerService.ComputeSummary`) and the line-item `PUT`/`POST` payloads already support the flag; inline toggle wiring and add-row checkbox largely landed with feature 013. **This feature completes the product gap**: persistent "Deduction" badge + distinct row styling (accessible, not color-only), read-only visual state when the user cannot edit, controlled toggle persistence with error revert, and Vitest coverage for visual indication and recalculation behavior. No schema changes or new API routes.

## Technical Context

**Language/Version**: C# / .NET 8 (backend `apps/api`); TypeScript 5.7 + React 18 (frontend `apps/web`)

**Primary Dependencies**: TanStack Query (`useUpdateLineItem`, `useCreateLineItem`, `useRecalculateLedger` in `ledger.ts`); Vitest + React Testing Library (frontend); xUnit + WebApplicationFactory + Testcontainers (backend)

**Storage**: PostgreSQL via EF Core 8 — no schema changes; uses existing `financial_line_items.is_artist_deduction`

**Testing**: Vitest component tests for badge/styling, toggle gating, add-row flag, and summary recalc wiring; optional xUnit integration test confirming deduction toggle updates summary via recalculate; ≥80.0% line/branch coverage enforced independently per stack via CI

**Target Platform**: Linux server (containerized API) + desktop-first SPA (ledger grid)

**Project Type**: Web application (existing two-app monorepo)

**Performance Goals**: Reuse existing ledger recalc targets (≤1s recalc per 002 spec); toggle triggers existing `PUT` + `POST /recalculate` sequence

**Constraints**: No floating-point money (Constitution I); frontend types from `generated-api.ts` only (Constitution VI); no mutations when Settled/Reconciled (Constitution V); ≥80.0% coverage both stacks; column-aware permissions (`canViewFinancials` unlocked / `canEditSettlement` locked); visual distinction MUST NOT rely on color alone (clarification)

**Scale/Scope**: ~3 modified frontend files (`LedgerRow.tsx`, `index.css`, possibly `EventLedgerPage.tsx`); 1–2 new/extended Vitest files; 0–1 backend integration tests; no new hooks or API endpoints

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Relevance | Status |
|-----------|-----------|--------|
| I. Core Mathematical Axioms | Deduction totals computed server-side in `ComputeSummary`; client displays string money from API. | PASS |
| II. Multi-Tenant Isolation | No new queries; existing org-scoped line-item mutations unchanged. | N/A |
| III. Engineering Rigor & Quality Gates | Vitest for toggle, badge, lifecycle gating, recalc wiring; ≥80% coverage per stack. | PASS (with tests) |
| IV. QBO Integration Boundaries | No QBO mutations. | N/A |
| V. Ledger State Machine & Immutability | Toggle gated on `PRE_SHOW`; server `AssertNotSettledOrReconciled` remains authoritative. | PASS |
| VI. Polyglot Contract & Serialization | Uses generated `LineItemDto.isArtistDeduction`; no hand-written TS mirrors. | PASS |
| VII. EF Core Axioms | No new queries. | N/A |
| VIII. Exception Governance & Logging | Reuse existing conflict/authorization error paths on `PUT`. | PASS |

**Post-design re-check**: PASS. No violations; Complexity Tracking not required.

## Project Structure

### Documentation (this feature)

```text
specs/018-artist-deduction-toggle-ui/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── artist-deduction-ui.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
apps/api/
└── Services/
    └── LedgerService.cs                    # UNCHANGED (ComputeSummary already sums IsArtistDeduction)

apps/api.tests/
└── Integration/
    └── LedgerDeductionToggleTests.cs       # NEW (optional): PUT flag → recalculate → summary delta

apps/web/src/
├── components/ledger/
│   ├── LedgerRow.tsx                       # MODIFIED: badge + row class; read-only badge; controlled toggle
│   └── AddLineItemForm.tsx                 # VERIFY: deduction checkbox on Expenses (likely done)
├── pages/
│   └── EventLedgerPage.tsx                 # VERIFY: onDeductionChange → saveLineItemRow + recalculate
└── index.css                               # MODIFIED: .ledger-row--deduction, .ledger-row__deduction-badge

apps/web/tests/ledger/
├── ArtistDeductionToggle.test.tsx          # NEW: badge, styling, toggle, read-only, recalc callback
└── Editability.test.tsx                    # EXTEND: read-only badge when canEditStructure false
```

**Structure Decision**: Existing `apps/api` + `apps/web` monorepo. Feature is a focused frontend UX completion on top of 013 wiring, with optional backend regression test only.

## Implementation Phases

### Phase A — Visual indication (primary gap)

1. **`LedgerRow`**: When `row.isArtistDeduction`, render persistent `<span class="ledger-row__deduction-badge">Deduction</span>` and apply `ledger-row--deduction` class on `<tr>` (Expenses block only).
2. Badge visible regardless of `canEditStructure` (read-only lifecycle states and view-only users still see flag state).
3. Toggle checkbox remains editable only when `canEditStructure && isExpense`.
4. **`index.css`**: Style badge (border + text) and row (e.g. left border accent + subtle background) using non-color-only cues (border pattern/weight + label text).

### Phase B — Toggle persistence hardening

1. Convert deduction checkbox from uncontrolled `defaultChecked` to controlled `checked={row.isArtistDeduction}` keyed by `row.id` + `rowVersion` so failed saves revert on refetch.
2. Confirm `EventLedgerPage.saveLineItemRow` passes `isArtistDeduction` patch and calls `recalculate` after success (already implemented — verify in tests).
3. Surface `structuralError` banner when deduction save fails (existing pattern).

### Phase C — Add-row deduction (verify / minor)

1. Confirm `AddLineItemForm` shows deduction checkbox for `EXPENSES` only and sends `isArtistDeduction` on `POST`.
2. After create + recalculate, new flagged row shows badge + styling.

### Phase D — Tests & validation

1. Vitest: badge present when flagged; absent when not; row class applied; toggle hidden on Revenue; toggle hidden when `canEditStructure` false but badge still shown when flagged; toggle calls `onDeductionChange`; add-form sends flag.
2. Optional xUnit: toggle `isArtistDeduction` via PUT, recalculate, assert `totalDeductions` delta equals row active value.
3. Run quickstart scenarios A–F; verify coverage ≥80%.

## Complexity Tracking

> No Constitution Check violations. Section intentionally empty.
