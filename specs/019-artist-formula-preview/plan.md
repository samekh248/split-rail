# Implementation Plan: Artist Edit Flow with Live Formula Preview

**Branch**: `019-artist-formula-preview` | **Date**: 2026-06-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/019-artist-formula-preview/spec.md` (Linear SPLR-30)

## Summary

Complete the artist-deal configuration panel on the event ledger: wire `useUpdateArtist` for editing existing deals via a shared add/edit bottom form, add up/down reorder with immediate persistence, clickable formula-token insertion, and a live net-payout preview that updates as deal inputs change. Backend `PUT /artists/{id}` and `DealMathEngine` already exist; gaps are **column-aware permission enforcement on artist mutations** (align with spec 018 / `useCanEditLedgerStructure`), **frontend edit/reorder/preview UX**, and **Vitest + optional xUnit** coverage. Live preview is computed client-side in bigint cents (`money.ts` + new `dealMathPreview.ts`) with golden tests mirroring backend `DealMathEngine` / `CustomFormulaEvaluator` vectors for parity (SC-003).

## Technical Context

**Language/Version**: C# / .NET 8 (backend `apps/api`); TypeScript 5.7 + React 18 (frontend `apps/web`)

**Primary Dependencies**: TanStack Query (`useUpdateArtist`, `useCreateArtist`, `useDeleteArtist`, `useRecalculateLedger` in `ledger.ts`); Vitest + React Testing Library (frontend); xUnit + WebApplicationFactory + Testcontainers (backend)

**Storage**: PostgreSQL via EF Core 8 — no schema changes; uses existing `event_artists` table and artist REST surface from spec 002

**Testing**: Vitest for `ArtistDealPanel`, `FormulaEditor`, `dealMathPreview`, `reorderArtists`; extend `EventLedgerPage` tests; xUnit integration tests for artist permission gating and reorder; ≥80.0% line/branch coverage enforced independently per stack via CI

**Target Platform**: Linux server (containerized API) + desktop-first SPA (event ledger page)

**Project Type**: Web application (existing two-app monorepo)

**Performance Goals**: Live preview updates within 1s (SC-002) — client-side synchronous preview on input change (no debounced network round-trip); artist save + recalculate within existing ≤1s recalc target (spec 002)

**Constraints**: No floating-point money on client preview path — bigint cents via `money.ts` (Constitution I); frontend types from `generated-api.ts` only (Constitution VI); no artist mutations when Settled/Reconciled (Constitution V); optimistic concurrency via `rowVersion` (FR-004); column-aware permissions (`canViewFinancials` unlocked / `canEditSettlement` locked); ≥80.0% coverage both stacks; custom formula sanitizer must match server `[a-zA-Z0-9\s+\-*/().]` strip rule

**Scale/Scope**: ~6–8 modified/new frontend files; 1 backend service change (`LedgerService` permission guard); 0 new DB tables; 0 new REST routes (preview is client-side); optional 1–2 integration tests

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Relevance | Status |
|-----------|-----------|--------|
| I. Core Mathematical Axioms | Server remains `decimal` + `AwayFromZero`; client preview uses bigint cents only (no JS `number` in money path). | PASS |
| II. Multi-Tenant Isolation | No new queries; existing org-scoped artist mutations unchanged. | N/A |
| III. Engineering Rigor & Quality Gates | Vitest for edit, preview, tokens, reorder, permissions; golden tests for preview parity; xUnit for permission/reorder; ≥80% coverage. | PASS (with tests) |
| IV. QBO Integration Boundaries | No QBO mutations. | N/A |
| V. Ledger State Machine & Immutability | Artist edits gated on `PRE_SHOW`; server `AssertArtistEditable` + new permission guard. | PASS |
| VI. Polyglot Contract & Serialization | Uses generated `EventArtistDto`, `UpdateArtistRequest`; no hand-written TS API mirrors. | PASS |
| VII. EF Core Axioms | No new queries. | N/A |
| VIII. Exception Governance & Logging | Reuse `FormulaEvaluationException`, `ConcurrencyConflictException`, `AuthorizationException` paths. | PASS |

**Post-design re-check**: PASS. No violations; Complexity Tracking not required.

## Project Structure

### Documentation (this feature)

```text
specs/019-artist-formula-preview/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── artist-formula-preview-ui.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
apps/api/
└── Services/
    └── LedgerService.cs                    # MODIFIED: column-aware permission on artist CRUD

apps/api.tests/
└── Integration/
    └── ArtistDealPermissionTests.cs      # NEW: permission 403 on artist PUT when budget locked w/o settlement perm

apps/web/src/
├── api/
│   └── ledger.ts                           # VERIFY: useUpdateArtist (exists, wire in page)
├── components/artists/
│   ├── ArtistDealPanel.tsx                 # MODIFIED: shared add/edit form, Edit, reorder, preview, confirm
│   └── FormulaEditor.tsx                   # MODIFIED: clickable token buttons, cursor insert
├── lib/
│   ├── money.ts                            # MODIFIED: percent multiply, round away-from-zero, max (for preview)
│   ├── dealMathPreview.ts                  # NEW: previewNetPayout mirroring DealMathEngine
│   └── reorderArtists.ts                   # NEW: swap performanceOrder (mirror reorderLineItems)
├── pages/
│   └── EventLedgerPage.tsx                 # MODIFIED: wire updateArtist, canEditStructure to panel, reorder handler
└── index.css                               # MODIFIED: artist row actions, preview, token button styles

apps/web/tests/
├── artists/
│   ├── ArtistDealPanel.test.tsx            # EXTEND: edit, save, cancel, confirm switch, reorder, preview
│   ├── FormulaEditor.test.tsx              # EXTEND: token click insert at cursor
│   └── dealMathPreview.test.ts             # NEW: golden vectors vs backend test cases
├── lib/
│   └── reorderArtists.test.ts              # NEW
└── pages/
    └── EventLedgerPage.test.tsx            # EXTEND: updateArtist + recalculate wiring
```

**Structure Decision**: Existing `apps/api` + `apps/web` monorepo. Primary work is frontend panel completion; one focused backend permission alignment to match clarified FR-012.

## Implementation Phases

### Phase A — Backend permission alignment

1. Extract or reuse `ValidateLineItemStructuralEditAsync` logic as `ValidateArtistStructuralEditAsync` (same rules: `PRE_SHOW` + financials when unlocked + settlement when locked).
2. Call from `CreateArtistAsync`, `UpdateArtistAsync`, `DeleteArtistAsync` before mutation.
3. Integration test: budget-locked event + user without `can_edit_settlement` → `PUT /artists/{id}` returns 403.

### Phase B — Shared add/edit form + `useUpdateArtist`

1. `ArtistDealPanel` accepts `canEditStructure`, `onUpdateArtist`, `onReorderArtist`.
2. Form modes: `add` | `edit` (`editingArtistId` + `rowVersion` snapshot).
3. Edit button per row populates form; Save calls `onUpdateArtist` with full `UpdateArtistRequest` + `id`.
4. Cancel clears form to add mode.
5. Unsaved-change guard: `window.confirm` or small inline dialog when switching Edit target or Add with dirty form (clarification Q5).
6. `EventLedgerPage`: wire `useUpdateArtist` + `recalculate` after success; surface formula 422 errors.

### Phase C — Artist reorder (immediate save)

1. `reorderArtists.ts`: `getArtistReorderSwapPair` sorted by `performanceOrder`.
2. Up/down buttons per row; each click swaps `performanceOrder` via two `PUT` calls (mirror `handleMoveLineItem`) + `recalculate`.
3. On failure: refetch ledger, show error (FR reorder failure edge case).
4. Reorder controls respect `canEditStructure`; independent of unsaved form state.

### Phase D — Live payout preview

1. `dealMathPreview.ts`: `previewNetPayout({ dealType, baseGuarantee, backendPercentage, taxWithholdingPercentage, customFormulaExpression, grossRevenue, totalDeductions })` → `{ payout: string } | { error: string }`.
2. Derive `grossRevenue` / `totalDeductions` from `ledger.summary` (active column per budget lock — already server-computed in grid response).
3. Display preview in shared form (`data-testid="payout-preview"`); hide amount on error, show validation message.
4. Golden Vitest cases ported from `CustomFormulaEvaluatorTests` + guarantee/door-split scenarios.

### Phase E — Formula token insertion

1. `FormulaEditor`: render tokens as `<button type="button">` with `data-testid="token-insert-{name}"`.
2. Track textarea `selectionStart`/`selectionEnd` on select/blur; insert token at cursor or append.
3. Disabled when `disabled` prop true.

### Phase F — Tests & validation

1. Run quickstart scenarios A–H.
2. Verify ≥80% coverage on touched files.

## Complexity Tracking

> No Constitution Check violations. Section intentionally empty.
