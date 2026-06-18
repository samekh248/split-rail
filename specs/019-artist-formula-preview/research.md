# Research: Artist Edit Flow with Live Formula Preview

**Feature**: 019-artist-formula-preview | **Date**: 2026-06-17

## R1 — Backend readiness for edit (partial gap)

**Decision**: Reuse existing `PUT /artists/{id}` (`UpdateArtistRequest` + `rowVersion`); add column-aware permission guard to artist CRUD matching line-item structural edits.

**Rationale**: `useUpdateArtist` hook exists in `ledger.ts` but is never called from `EventLedgerPage`. `LedgerService.UpdateArtistAsync` recalculates payouts on save. `AssertArtistEditable` only checks `PRE_SHOW` — does not enforce financials/settlement permissions required by clarified FR-012.

**Alternatives considered**:
- New artist-edit endpoint — rejected; PUT already complete.
- Frontend-only permission gating — rejected; server must enforce (Constitution II/FR-012).

## R2 — Live preview computation strategy

**Decision**: Client-side synchronous preview via new `dealMathPreview.ts`, extending `money.ts` with bigint-cent percent multiply, away-from-zero rounding, and max; custom formulas use the same sanitizer regex as `CustomFormulaEvaluator` plus a small token-substitution + safe arithmetic evaluator (no new npm dependency).

**Rationale**: Meets SC-002 (sub-second, no network latency); assumption allows client-side if results match authoritative math. Vitest golden tests copy vectors from `CustomFormulaEvaluatorTests` and `DealMathEngine` unit tests for SC-003 parity. `ledger.summary` already exposes `grossRevenue` and `totalDeductions` for the active column.

**Alternatives considered**:
- Debounced `POST /artists/preview-payout` — rejected for v1; adds API surface and latency; viable fallback if custom-formula parity proves difficult.
- JS `number` / `eval()` — rejected (Constitution I; injection risk).
- `decimal.js` npm package — rejected; keep zero new runtime dependencies; bigint path sufficient for MVP token set.

## R3 — Edit UX pattern

**Decision**: Shared bottom add/edit form (clarification Q3); `editingArtistId` state; Save label switches between "Add Artist" / "Save Changes"; Cancel returns to add mode.

**Rationale**: Matches existing `ArtistDealPanel` layout; one formula editor and preview region; minimal new DOM structure.

**Alternatives considered**:
- Inline row expansion — rejected in clarification.
- Modal — rejected in clarification.

## R4 — Artist reorder mechanics

**Decision**: `reorderArtists.ts` mirroring `reorderLineItems.ts`; swap `performanceOrder` via two sequential `PUT` calls + `POST /recalculate`; immediate persist per click (clarification Q4).

**Rationale**: No `performanceOrder`-only PATCH exists; swap pattern proven by line-item reorder in `EventLedgerPage.handleMoveLineItem`. `performanceOrder` is int32 on `UpdateArtistRequest`.

**Alternatives considered**:
- Dedicated reorder endpoint — rejected; unnecessary API expansion.
- Local-only reorder until form save — rejected in clarification.

## R5 — Permission and lifecycle gating

**Decision**: Pass `canEditStructure` from `useCanEditLedgerStructure(status, isBudgetLocked)` into `ArtistDealPanel`; hide/disable add, edit, remove, reorder, formula editor, and token buttons when false. Backend mirrors via shared structural-edit validation.

**Rationale**: Clarification Q1 + parity with spec 018 deduction toggle and line-item CRUD. Saved `calculatedNetPayout` in list remains visible read-only.

**Alternatives considered**:
- `PRE_SHOW` only (current behavior) — rejected; contradicts clarified spec.

## R6 — Unsaved edit switch behavior

**Decision**: `window.confirm` (or equivalent accessible confirm dialog) when form is dirty and user clicks Edit on another artist, Add, or Cancel-with-switch; confirming discards and switches; canceling keeps current edit (clarification Q5).

**Rationale**: Minimal implementation; matches spec without new modal component library.

**Alternatives considered**:
- Silent discard — rejected in clarification.
- Block switch until Save — rejected in clarification.

## R7 — Formula token insertion

**Decision**: Convert token list items to `<button>` controls; maintain `selectionStart`/`selectionEnd` on the formula `<textarea>`; insert token string at cursor or append when unfocused.

**Rationale**: FR-009/FR-010; no API changes. Standard controlled-textarea pattern.

**Alternatives considered**:
- Drag-and-drop tokens — rejected; out of scope.
- Copy-to-clipboard only — rejected; does not meet click-to-insert requirement.

## R8 — Test scope

**Decision**: Vitest primary coverage: edit save/cancel, confirm-on-switch, reorder swap, preview updates, token insert, permission gating. `dealMathPreview.test.ts` golden vectors. One xUnit integration test for artist PUT permission after budget lock.

**Rationale**: Constitution III; frontend-heavy feature; backend change is small permission guard.

**Alternatives considered**:
- E2E Playwright for full flow — deferred; Vitest + quickstart manual scenarios sufficient for MVP.
