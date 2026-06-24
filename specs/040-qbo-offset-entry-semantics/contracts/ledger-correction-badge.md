# Contract: Ledger Correction Badge

**Feature**: 040-qbo-offset-entry-semantics  
**Date**: 2026-06-19  
**Endpoint**: Existing `GET /api/venues/{venueId}/events/{eventId}/ledger`

## DTO Change

### LineItemDto (extended)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `hasQboCorrection` | boolean | yes | `true` when one or more `OffsetCorrection` ledger entries are mapped to this line item |

All existing fields unchanged. Money fields remain decimal-as-string per Constitution VI.

**Example row with correction**:

```json
{
  "id": "11111111-1111-1111-1111-111111111111",
  "rowLabel": "Production",
  "qboActualValue": "150.00",
  "hasQboCorrection": true,
  "variance": "50.00",
  "varianceFlagged": true
}
```

**Example row without correction**:

```json
{
  "id": "22222222-2222-2222-2222-222222222222",
  "rowLabel": "Marketing",
  "qboActualValue": "200.00",
  "hasQboCorrection": false
}
```

## Computation Rule

```
hasQboCorrection(lineItemId) =
  EXISTS qbo_sync_ledger
  WHERE event_id = @eventId
    AND mapped_line_item_id = lineItemId
    AND entry_type = 'OffsetCorrection'
```

Evaluated server-side in `LedgerService.GetLedgerAsync`; not client-derived.

## UI Contract

| Element | Requirement |
|---------|-------------|
| Location | QBO Actuals column in `LedgerRow`, adjacent to formatted amount |
| Visibility | Render badge only when `hasQboCorrection === true` |
| Icon | Font Awesome Free solid icon (e.g. `faClockRotateLeft`) |
| Accessibility | `aria-label="QBO actuals include upstream corrections"` on badge |
| Interaction | Non-interactive in v1 (no tooltip/drill-down required) |
| Test IDs | `data-testid="qbo-correction-badge-{lineItemId}"` |

## Contract Tests

| ID | Given | Expected |
|----|-------|----------|
| B1 | Line item with offset entries | `hasQboCorrection: true`; badge visible in RTL |
| B2 | Line item with original entries only | `hasQboCorrection: false`; badge absent |
| B3 | After void offset zeroes actuals | Badge visible if offset row exists (even when actuals = 0) |
| B4 | OpenAPI / generated-api.ts | `hasQboCorrection` present on `LineItemDto` after typegen |

## Regeneration Steps

```bash
cd apps/api && dotnet build
cd apps/web && npm run generate-types
```

Frontend MUST import `LineItemDto` from `@/types/generated-api` only (Constitution VI).
