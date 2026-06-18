# Research: Artist Deduction Toggle on Expense Rows

**Feature**: 018-artist-deduction-toggle-ui | **Date**: 2026-06-17

## R1 — Backend readiness (no new work expected)

**Decision**: No backend schema, DTO, or endpoint changes. `FinancialLineItem.IsArtistDeduction` persists via existing `CreateLineItemRequest` / `UpdateLineItemRequest`; `LedgerService.ComputeSummary` sums `ActiveValue` for rows where `IsArtistDeduction == true`.

**Rationale**: Code review confirms POST/PUT map the flag and recalculate runs after mutations. SPLR-29 gap is UI-only per Linear issue description.

**Alternatives considered**:
- New dedicated deduction endpoint — rejected; violates minimal-scope principle.
- Client-side deduction math — rejected (Constitution I; server is source of truth).

## R2 — Overlap with feature 013 (line-item CRUD)

**Decision**: Treat 013 as prerequisite wiring; 018 completes the product-visible deduction UX (visual indication + read-only badge + test hardening).

**Rationale**: `LedgerRow` already has inline checkbox gated by `canEditStructure`; `AddLineItemForm` already has Expenses-only checkbox; `EventLedgerPage` already calls `saveLineItemRow({ isArtistDeduction })` + `recalculate`. Missing pieces: persistent badge, row styling, read-only display for non-editors, controlled checkbox for error revert.

**Alternatives considered**:
- Re-scope as duplicate of 013 — rejected; SPLR-29 acceptance criteria explicitly require visual indication and deal-math verification.
- Full rewrite of toggle flow — rejected; reuse existing mutation path.

## R3 — Visual indication pattern

**Decision**: Persistent text badge `"Deduction"` plus `ledger-row--deduction` row class with left border accent and subtle background; badge uses bordered pill styling (not color-only).

**Rationale**: Clarification session chose Option C (badge + styling). Text label satisfies accessibility and SC-004 usability target; border/weight differentiate without relying solely on hue.

**Alternatives considered**:
- Checkbox checked state only — rejected in clarification.
- Color-only row highlight — rejected (accessibility + clarification).
- Icon without text — rejected (SC-004 identification target).

## R4 — Permission and lifecycle gating

**Decision**: Reuse `useCanEditLedgerStructure` (column-aware: `canViewFinancials` when unlocked, `canEditSettlement` when locked during `PRE_SHOW`). Deduction **toggle** renders only when hook returns true; **badge/styling** renders whenever `isArtistDeduction` is true regardless of edit permission.

**Rationale**: Matches clarification Q1 and 013 contract. Read-only users and Settled/Reconciled viewers must still see which rows are deductions (User Story 2 scenario 3).

**Alternatives considered**:
- Hide badge from read-only users — rejected (contradicts User Story 2).
- Separate permission for deduction toggle — rejected in 013 clarification.

## R5 — Toggle save timing and error revert

**Decision**: Immediate save on checkbox `onChange` via existing `PUT`; controlled `checked` bound to server state; on failure refetch ledger (existing `structuralError` + `refetch` in `EventLedgerPage`).

**Rationale**: Matches toggle UX expectation and FR-008. Uncontrolled `defaultChecked` (current code) does not revert cleanly after failed save until full remount.

**Alternatives considered**:
- Debounced save — rejected; adds complexity without spec requirement.
- Optimistic UI without recalculate — rejected; SC-003 requires server-derived totals.

## R6 — Backend test scope

**Decision**: Optional single integration test: create expense row with value, toggle `isArtistDeduction` via PUT, call recalculate, assert `summary.totalDeductions` increases by active column value.

**Rationale**: Frontend tests prove wiring; one backend test guards regression on deal-math path without duplicating full 002 suite.

**Alternatives considered**:
- Frontend-only tests — acceptable if coverage gate met; backend test adds confidence for SPLR-29 acceptance criterion "toggling updates deal-math output."
