# Quickstart & Validation: Artist Deduction Toggle on Expense Rows

**Feature**: 018-artist-deduction-toggle-ui | **Date**: 2026-06-17

Validates deduction flag toggle, visual indication, and deal-math recalculation. See [contracts/artist-deduction-ui.md](./contracts/artist-deduction-ui.md) and [data-model.md](./data-model.md).

## Prerequisites

- .NET 8 SDK, Node 20+, Docker (Testcontainers for optional backend test).
- Features 002 (ledger grid) and 013 (line-item CRUD wiring) implemented.
- Seeded user with `can_view_financials` and `can_edit_settlement`.
- Local API + web dev server running.

```bash
dotnet run --project apps/api/split-rail-api.csproj
cd apps/web && npm run dev
```

## Scenario A — Toggle deduction on existing expense row (User Story 1, P1)

1. Open a `PRE_SHOW` event with budget unlocked and an expense row valued `2000.00` (not flagged).
2. Note summary **Deductions** and **Net** totals.
3. Toggle artist-deduction checkbox on the expense row.

**Expected**:
- Row shows **Deduction** badge and distinct row styling.
- **Deductions** increases by `2000.00`; **Net** decreases by `2000.00`.
- Artist payout section recalculates.
- Toggle persists after page reload.

## Scenario B — Unflag deduction (User Story 1)

1. On a flagged expense row, toggle deduction off.

**Expected**: Badge and row styling removed; deductions and net revert; payouts recalculate.

## Scenario C — Visual indication read-only (User Story 2)

1. Load ledger with mixed flagged/unflagged expense rows.
2. Without clicking controls, identify flagged rows.

**Expected**: Flagged rows show badge + styling; unflagged do not.

3. Open a **Settled** event with previously flagged rows.

**Expected**: Badge + styling visible; toggle absent/disabled.

## Scenario D — Add row with deduction flag (Clarification Q3)

1. Click **Add row** on Expenses (planning phase).
2. Enter label `Catering`, value `800.00`, check **Artist deduction**, save.

**Expected**: New row appears flagged with badge + styling; deductions include `800.00`.

## Scenario E — Permission gating (User Story 3)

1. As user **without** `can_edit_settlement`, open budget-locked `PRE_SHOW` event.

**Expected**: Deduction toggle hidden; flagged rows still show badge if any exist.

2. As user **with** settlement permission on same event.

**Expected**: Toggle available on expense rows.

## Scenario F — Error revert (User Story 3 scenario 4)

1. Open same event in two tabs; toggle deduction in tab 1 (success).
2. In tab 2 (stale), toggle same row again.

**Expected**: Conflict/error message; checkbox reverts to server state after refetch.

## Scenario G — Revenue row has no toggle (FR-002)

1. View Revenue block rows.

**Expected**: No deduction toggle or badge on revenue rows.

## Automated tests

```bash
# Frontend (primary)
cd apps/web
npm run test:coverage -- tests/ledger/ArtistDeductionToggle.test.tsx tests/ledger/Editability.test.tsx

# Backend (optional regression)
dotnet test apps/api.tests/split-rail-api.tests.csproj -c Release --filter "FullyQualifiedName~Deduction"
```

**Expected new/extended suites**:
- `ArtistDeductionToggle.test.tsx` — badge, row class, toggle gating, onDeductionChange, add-form flag
- `Editability.test.tsx` — read-only badge without toggle
- `LedgerDeductionToggleTests.cs` (optional) — PUT flag + recalculate summary delta

## Success checklist

- [ ] Toggle updates deductions/net/payouts within 5s (SC-001)
- [ ] Badge + styling on flagged rows; not color-only (SC-004, FR-005)
- [ ] Toggle hidden when Settled/Reconciled (SC-002)
- [ ] Deduction delta equals row active value (SC-003)
- [ ] Failed save shows error and reverts checkbox (SC-005)
- [ ] Add-row deduction checkbox works (FR-002a)
- [ ] Frontend (+ optional backend) coverage ≥80% (SC-006)
