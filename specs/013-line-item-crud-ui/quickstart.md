# Quickstart & Validation: Production Line-Item CRUD UI

**Feature**: 013-line-item-crud-ui | **Date**: 2026-06-17

Validates add/edit/delete/reorder from the ledger grid. See [contracts/line-item-crud-ui.md](./contracts/line-item-crud-ui.md) for UI shapes and [data-model.md](./data-model.md) for field rules.

## Prerequisites

- .NET 8 SDK, Node 20+, Docker (Testcontainers for backend integration tests).
- Features 001 (RBAC) and 002 (ledger grid) implemented.
- Seeded admin user with `can_view_financials`, `can_edit_settlement`, and `can_lock_budget`.
- Local API + web dev server running.

```bash
# Backend
dotnet run --project apps/api/split-rail-api.csproj

# Frontend (separate terminal)
cd apps/web && npm run dev
```

## Scenario A — Add row during planning (User Story 1, P1)

1. Open an event ledger in `PRE_SHOW`, budget unlocked.
2. Click **Add row** on the Revenue section.
3. Enter label `VIP tier`, proforma value `1500.00`, save.

**Expected**: Row appears under Revenue; summary gross revenue increases; dev-only "Add sample expense row" button is absent.

## Scenario B — Add row during settlement (Clarification Q5)

1. Lock budget on a `PRE_SHOW` event with existing rows.
2. Click **Add row** on Expenses.
3. Form shows settlement value field (required); proforma not editable.
4. Enter label `Late rental`, settlement `400.00`, save.

**Expected**: Row created with `proformaValue = 0.00`, `settlementValue = 400.00`; totals recalculate from settlement column.

**API equivalent**:

```bash
POST /api/venues/{venueId}/events/{eventId}/line-items
{
  "blockType": "EXPENSES",
  "rowLabel": "Late rental",
  "sortOrder": 99,
  "isArtistDeduction": false,
  "proformaValue": "0.00",
  "settlementValue": "400.00",
  "notes": null
}
```

→ **201 Created**

## Scenario C — Delete row with confirmation (User Story 2, P2)

1. On an editable event, click delete on a user-added row.
2. Confirm the dialog.

**Expected**: Row removed; totals update. Canceling dialog leaves row unchanged.

## Scenario D — Reorder within block (User Story 3, P3)

1. Block with ≥2 rows; click move-down on the first row.
2. Reload the page.

**Expected**: Row order persisted. Move-up disabled on first row; move-down disabled on last.

## Scenario E — Inline label and deduction edit (User Story 4, P3)

1. Edit a row label inline; blur to save.
2. Toggle artist-deduction on an expense row.

**Expected**: Label persists after reload; deductions total changes when flag toggled.

## Scenario F — Lifecycle and permission gates

1. Set event to `SETTLED` (via test seed or settlement flow).
2. Open ledger.

**Expected**: No add/delete/reorder/label-edit controls visible.

3. As user **without** `can_edit_settlement`, open locked-budget event.

**Expected**: Structural controls hidden (settlement-phase permission gate).

4. Attempt `POST …/line-items` on settled event via API → **400**.

## Scenario G — Concurrency conflict

1. Open same event in two tabs; edit same row label in both.
2. Save tab 1, then save tab 2 with stale version.

**Expected**: Tab 2 shows conflict error; grid refetches to server state.

## Automated tests

```bash
# Backend (includes new structural permission + settlement create tests)
dotnet test apps/api.tests/split-rail-api.tests.csproj -c Release --filter "FullyQualifiedName~Ledger"

# Frontend
cd apps/web
npm run test:coverage
```

**Expected new/extended suites**:
- `AddLineItemForm.test.tsx` — form validation, planning vs settlement modes
- `LineItemCrud.test.tsx` — delete confirm, reorder buttons, boundary disable
- `EventLedgerPage.test.tsx` — dev button removed, wiring to mutations
- `LedgerStateMachineTests` — settlement-phase create with settlement value succeeds
- Structural permission integration tests for delete and label-only update

## Success checklist

- [ ] Add row works from Revenue/Expenses headers (SC-001)
- [ ] Settlement-phase add requires settlement value (Clarification Q5)
- [ ] Delete confirms and recalculates (SC-003)
- [ ] Reorder persists after reload (SC-004)
- [ ] Controls hidden when Settled/Reconciled (SC-002)
- [ ] Dev sample button removed (SC-006)
- [ ] Backend + frontend coverage ≥80% (SC-007)
