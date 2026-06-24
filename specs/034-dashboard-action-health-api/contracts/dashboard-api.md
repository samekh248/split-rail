# API Contract: Dashboard Action Center and Financial Health (Extension)

**Feature**: 034-dashboard-action-health-api  
**Date**: 2026-06-18  
**Base path**: `/api/venues/{venueId}/dashboard` (unchanged from spec 031)  
**Auth**: JWT Bearer  
**Extends**: [031-dashboard-aggregate-api/contracts/dashboard-api.md](../../031-dashboard-aggregate-api/contracts/dashboard-api.md)

## GET `/` (extended response)

Returns venue dashboard with event partitions **plus** action center and financial health summary blocks.

- **Permission**: `can_view_financials` (unchanged)
- **200 OK**: Extended `DashboardResponse` JSON body
- **401/403/404**: Unchanged from base contract

### Response shape (`DashboardResponse` — extended)

```json
{
  "venueId": "uuid",
  "tonightEvents": [ /* EventCardDto[] */ ],
  "pinnedEvents": [ /* EventCardDto[] */ ],
  "recentEvents": [ /* EventCardDto[] */ ],
  "upcomingEvents": [ /* EventCardDto[] */ ],
  "actionCenter": {
    "totalUnmappedCount": 0,
    "eventsWithUnmapped": []
  },
  "financialHealth": {
    "weekStart": "2026-06-16",
    "weekEnd": "2026-06-22",
    "projectedNetGross": "0.00",
    "actualQboDeposits": "0.00",
    "variance": "0.00"
  }
}
```

Property names follow ASP.NET Core camelCase JSON serialization.

### `ActionCenterDto`

| Field | Type | Description |
|-------|------|-------------|
| `totalUnmappedCount` | int | Sum of unmapped QBO transactions across all venue events |
| `eventsWithUnmapped` | array | Events with `unmappedCount > 0`; see `UnmappedEventSummaryDto` |

### `UnmappedEventSummaryDto`

| Field | Type | Description |
|-------|------|-------------|
| `eventId` | uuid | Event identifier |
| `venueId` | uuid | Owning venue |
| `title` | string | Event title |
| `eventDate` | string | ISO date `yyyy-MM-dd` |
| `unmappedCount` | int | Count of unmapped QBO transactions for this event |

**Sort order**: `unmappedCount` descending, then `eventDate` ascending.

### `FinancialHealthDto`

| Field | Type | Description |
|-------|------|-------------|
| `weekStart` | string | Monday of current calendar week (`yyyy-MM-dd`, UTC reference) |
| `weekEnd` | string | Sunday of current calendar week (`yyyy-MM-dd`) |
| `projectedNetGross` | string | Sum of projected net show revenue for in-week events (money) |
| `actualQboDeposits` | string | Sum of revenue-block QBO actual values for in-week events (money) |
| `variance` | string | `projectedNetGross - actualQboDeposits` (money) |

### Behavior additions (steps 5–6)

After existing partition logic (spec 031 steps 1–4):

5. **ActionCenter**: Sum unmapped counts across all loaded venue events; build `eventsWithUnmapped` for events with count > 0; sort per contract.
6. **FinancialHealth**: Determine Mon–Sun week containing UTC today; filter events by `eventDate` in `[weekStart, weekEnd]`; compute projected (status-based column), actual (revenue QBO only), variance; emit week range dates.

### Projected column selection (financial health)

| Event status | Line-item column |
|--------------|------------------|
| `SETTLED`, `RECONCILED` | `settlementValue` |
| `PRE_SHOW` | `proformaValue` |

Budget lock alone does **not** switch column.

---

## Coverage matrix (new rows)

| ID | Requirement | Verification target | Suite | Key assertions | Status |
|----|-------------|---------------------|-------|----------------|--------|
| C1 | FR-001 action center block | `GET .../dashboard` | `DashboardControllerTests` | `actionCenter` present; total matches sum | ✓ |
| C2 | FR-002 sort + fields | Multiple unmapped events | same | Sorted count desc, date asc; identity fields present | ✓ |
| C3 | FR-004 zero unmapped excluded | Events with 0 unmapped | same | Not in `eventsWithUnmapped` | ✓ |
| C4 | FR-005 week range | In-week + out-of-week events | same | `weekStart`/`weekEnd` Mon–Sun; only in-week in totals | ✓ |
| C5 | FR-006 status column | Settled vs PRE_SHOW in-week | same | Settlement vs proforma projected values | ✓ |
| C6 | FR-006 budget-locked PRE_SHOW | Locked unsettled in-week | same | Uses proforma | ✓ |
| C7 | FR-007 revenue QBO only | Revenue + expense QBO actuals | same | Expense actuals excluded from actual total | ✓ |
| C8 | FR-008 variance | Known projected/actual | same | `variance == projected - actual` | ✓ |
| C9 | FR-013 zero states | No unmapped, no in-week | same | Zero totals; empty list; blocks present | ✓ |
| C10 | FR-014 regression | Existing partition tests | same | All B1–B13 cases still pass | ✓ |
| C11 | SC-006 consistency | Cards + action center | same | `totalUnmappedCount == Σ card.unmappedCount` | ✓ |
| C12 | SC-003 week boundary | Event on Mon and Sun | `DashboardFinancialHealthHelperTests` | Both included; event before Mon excluded | ✓ |
| C13 | FR-015 coverage | Coverage collector | `dotnet test --collect:"XPlat Code Coverage"` | Touched files ≥80% | ✓ |
| C14 | Constitution VI | Type generation | `npm run gen:api` | New DTOs in `generated-api.ts` | ✓ |

## Contract rules (additions)

7. **Always present blocks**: `actionCenter` and `financialHealth` MUST NOT be omitted; use zero values and empty arrays when no qualifying data (FR-013).
8. **Action center scope**: Includes **all** venue events loaded for dashboard (not limited to partition windows).
9. **Financial health scope**: Only events with `eventDate` in current Mon–Sun week (UTC).
10. **Money serialization**: Financial health monetary fields are JSON strings (Constitution I/VI).
11. **Backward compatibility**: Existing four partition arrays unchanged in shape and semantics (FR-014).

## Definition of Done (verification)

- Matrix rows C1–C14 have at least one passing test.
- `dotnet test --filter "FullyQualifiedName~Dashboard"` passes with no regressions.
- Swagger includes `ActionCenterDto`, `UnmappedEventSummaryDto`, `FinancialHealthDto`.
- `generated-api.ts` regenerated; no hand-written TS interfaces in `/apps/web`.
