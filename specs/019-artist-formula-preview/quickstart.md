# Quickstart & Validation: Artist Edit Flow with Live Formula Preview

**Feature**: 019-artist-formula-preview | **Date**: 2026-06-17

Validates artist edit, reorder, live preview, and token insertion. See [contracts/artist-formula-preview-ui.md](./contracts/artist-formula-preview-ui.md) and [data-model.md](./data-model.md).

## Prerequisites

- .NET 8 SDK, Node 20+, Docker (Testcontainers for optional backend permission test).
- Features 002 (ledger grid + artist API) implemented.
- Seeded user with `can_view_financials` and `can_edit_settlement`.
- Local API + web dev server running.

```bash
dotnet run --project apps/api/split-rail-api.csproj
cd apps/web && npm run dev
```

## Scenario A — Edit existing artist deal (User Story 1, P1)

1. Open a `PRE_SHOW` event with budget unlocked and at least one artist (e.g. guarantee `5000.00`).
2. Click **Edit** on the artist row.
3. Change base guarantee to `6000.00`; click **Save Changes**.

**Expected**:
- Form clears to add mode.
- List shows updated guarantee and recalculated payout.
- Payout persists after page reload.

## Scenario B — Live preview without save (User Story 2, P1)

1. Open add or edit form on a show with known gross/deductions.
2. Change backend % or custom formula.

**Expected**:
- `payout-preview` updates within 1 second without saving.
- Invalid formula shows `payout-preview-error` and no misleading payout amount.
- After save, preview matches `payout-{id}` in list.

## Scenario C — Insert formula tokens (User Story 3, P2)

1. Select deal type **Custom Formula**.
2. Place cursor mid-expression in formula textarea.
3. Click **GrossRevenue** token button.

**Expected**: Token name inserted at cursor; preview recalculates if expression valid.

## Scenario D — Reorder artists (FR-001a)

1. Add two artists on a `PRE_SHOW` event.
2. Click **↓** on the first artist.

**Expected**:
- Order swaps immediately (no separate save).
- Order persists after reload.
- Payouts unchanged (order-only change).

## Scenario E — Unsaved edit confirmation (Clarification Q5)

1. Click **Edit** on an artist; change base guarantee (do not save).
2. Click **Edit** on a different artist.

**Expected**: Confirmation prompt; cancel keeps first edit intact; confirm loads second artist.

## Scenario F — Permission gating (FR-012)

1. As user **without** `can_edit_settlement`, open budget-locked `PRE_SHOW` event.

**Expected**: No Edit, Add, Remove, or reorder controls; payouts visible read-only.

2. As user **with** settlement permission on same event.

**Expected**: Full edit affordances available.

## Scenario G — Settled event read-only (FR-003)

1. Open a **Settled** event with artists.

**Expected**: No edit/add/reorder/remove; saved payouts visible.

## Scenario H — Concurrent save conflict (FR-004)

1. Open same event in two tabs; edit same artist in both.
2. Save in tab 1; save in tab 2 with stale form.

**Expected**: Tab 2 shows conflict/error; form reflects last server state after refetch.

## Automated tests

```bash
cd apps/web && npm run test -- tests/artists tests/lib/reorderArtists.test.ts tests/pages/EventLedgerPage.test.tsx
cd apps/web && npm run test:coverage

dotnet test apps/api.tests/split-rail-api.tests.csproj --filter "FullyQualifiedName~ArtistDeal"
```

**Coverage gate**: ≥80% line/branch on backend and frontend independently (Constitution III).

## Success criteria mapping

| Criterion | Validated by |
|-----------|--------------|
| SC-001 | Scenario A (edit + payout under 10s) |
| SC-002 | Scenario B (preview latency) |
| SC-003 | Scenario B + `dealMathPreview.test.ts` golden vectors |
| SC-004 | Scenario C (token insert workflow) |
| SC-005 | Scenario B invalid formula branch |
| SC-006 | `test:coverage` + backend coverage in CI |
