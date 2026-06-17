# Research: Production Line-Item CRUD UI

**Feature**: 013-line-item-crud-ui | **Date**: 2026-06-17

## R1 — Backend lifecycle support for settlement-phase structural ops

**Decision**: No new mutation endpoints. Existing `POST/PUT/DELETE …/line-items` already allow structural operations throughout `PRE_SHOW` (including budget-locked settlement); only `SETTLED`/`RECONCILED` are rejected via `AssertNotSettledOrReconciled`.

**Rationale**: Code review of `LedgerService` confirms create/update/delete call `AssertNotSettledOrReconciled` only. Column editability is enforced separately in `ValidateLineItemColumnEditAsync`. After budget lock, creating a row succeeds when `proformaValue = 0.00` and `settlementValue` is the entered amount (settlement column change triggers settlement permission). Existing test `ProformaEdit_AfterLockBudget_Returns400` proves proforma-only create fails after lock; `SettlementEdit_AfterLock_WithPermission_Succeeds` proves settlement updates work.

**Alternatives considered**:
- New batch reorder endpoint — rejected; per-row `PUT` with updated `sortOrder` is sufficient for ≤100 rows per event.
- Relax settled-state rules — rejected (Constitution V).

## R2 — Structural permission gaps on delete and non-value updates

**Decision**: Add `ValidateLineItemStructuralEditAsync` in `LedgerService` and invoke it on every create, delete, and update (regardless of whether monetary columns changed).

**Rationale**: Today `DeleteLineItemAsync` performs no permission check. `UpdateLineItemAsync` skips authorization when only `rowLabel`, `sortOrder`, or `isArtistDeduction` change (no proforma/settlement delta). Spec FR-015 requires the same permission as value editing: `can_view_financials` while budget is unlocked, `can_edit_settlement` while budget is locked during `PRE_SHOW`.

**Alternatives considered**:
- UI-only gating — rejected; server must remain authoritative backstop (FR-008).
- New dedicated permission — rejected per clarification session.

## R3 — Reorder persistence strategy

**Decision**: Swap `sortOrder` with the adjacent row via two sequential `PUT` requests (each carrying full row payload + `rowVersion`), then trigger recalculate (already auto-triggered server-side per mutation).

**Rationale**: No batch API exists. Blocks typically hold ≤100 rows; two PUTs per move is acceptable. Client computes `newSortOrder` by swapping integer positions with neighbor; on 409 conflict, invalidate ledger query and surface error (FR-011/FR-012).

**Alternatives considered**:
- Drag-and-drop — rejected in clarification.
- Optimistic UI reorder without persist — rejected (SC-004 requires reload persistence).

## R4 — Add-row UX entry point

**Decision**: Per-block "Add row" button on Revenue and Expenses section headers (`BlockSection`); inline dialog/form with block pre-selected.

**Rationale**: Matches clarification Q4. Mirrors `ArtistDealPanel` add/remove pattern already in `EventLedgerPage`. Deal Math block excluded (system-derived).

**Alternatives considered**:
- Single grid-level add control — rejected.
- Always-visible blank row — rejected.

## R5 — Permission signal for frontend gating

**Decision**: Derive structural editability from `ledger.editability` + `useUserProfile().role.permissions` via a shared hook `useCanEditLedgerStructure(status, isBudgetLocked)`.

**Rationale**: `LedgerGridResponse` does not embed user permissions; `GET /users/me` already exposes `canViewFinancials` and `canEditSettlement` (same pattern as `useCanTriggerQboSync`). Structural controls visible when `status === 'PRE_SHOW'` AND the matching permission flag is true.

**Alternatives considered**:
- Extend `LedgerGridResponse` with permission flags — rejected; avoids API churn and duplicates existing profile endpoint.

## R6 — Initial sort order for new rows

**Decision**: Assign `sortOrder = max(existing sortOrder in block) + 1` (or `0` if block empty).

**Rationale**: Spec acceptance scenario requires append-after-existing behavior. Client computes from current block rows before `POST`.

**Alternatives considered**:
- Server auto-assign — not available on current API; client-side computation is deterministic.

## R7 — Delete confirmation UX

**Decision**: Native `window.confirm` for v1 (consistent with minimal scope); message includes row label.

**Rationale**: Keeps dependency surface small. Can upgrade to accessible modal in a follow-up if needed.

**Alternatives considered**:
- Custom modal component — deferred; not required for MVP correctness.
