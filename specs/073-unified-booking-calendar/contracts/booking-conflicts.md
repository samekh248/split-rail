# Contract: Booking Placement Conflicts

**Feature**: `073-unified-booking-calendar` | **Date**: 2026-06-25

## Active placement definition

Placements with `bookingPlacementStatus` in `{ HOLD_1, HOLD_2, CONFIRMED }` participate in conflict checks for a given `(venueId, eventDate)`.

`CANCELLED` placements are **inactive** — they do not block new placements.

## Conflict matrix (authoritative)

| Existing active | Create HOLD | Create CONFIRMED | Promote HOLD→CONFIRMED |
|-----------------|---------------|------------------|------------------------|
| none | HOLD_1 | CONFIRMED | — |
| HOLD_1 | HOLD_2 | CONFIRMED* | CONFIRMED* |
| HOLD_2 | **409** | CONFIRMED* | CONFIRMED* |
| HOLD_1 + HOLD_2 | **409** | CONFIRMED* | CONFIRMED* (sibling remains) |
| CONFIRMED | HOLD_2 only† | **409** | **409** |
| CONFIRMED + HOLD_2 | **409** | **409** | **409** |

\* Fails with **409** if another `CONFIRMED` already exists (only one Confirmed allowed).  
† Fails with **409** if `HOLD_2` already exists.

## Auto-tier on hold create

When client omits tier or requests `HOLD_1`:
- If no active placements → assign `HOLD_1`.
- If only `HOLD_1` active → assign `HOLD_2`.
- If `CONFIRMED` active and no `HOLD_2` → assign `HOLD_2`.
- Otherwise → **409**.

## 409 response body

```json
{
  "type": "conflict",
  "detail": "A confirmed booking already exists on this date.",
  "conflictingPlacementId": "uuid | null",
  "suggestedHoldTier": "HOLD_1 | HOLD_2 | null"
}
```

## Client mirror

`apps/web/src/lib/bookingCalendar.ts` exports `previewConflict(activePlacements, action)` returning the same logical result for instant modal validation. Server remains authoritative on save.

## Edit / move rules

Changing `eventDate` or `venueId` re-runs conflict check as if creating anew at the target slot (excluding self).

Promoting `HOLD_*` → `CONFIRMED` at same venue/date: allowed only if no other `CONFIRMED` active at target (excluding self).

## Test matrix (required xUnit cases)

1. Open slot → HOLD_1 → HOLD_2 → third hold 409.
2. CONFIRMED → second CONFIRMED 409.
3. CONFIRMED → HOLD_2 ok → second hold 409.
4. CANCELLED on date → new CONFIRMED ok.
5. Promote HOLD_1 with HOLD_2 present → CONFIRMED + HOLD_2 remain.
6. Promote when CONFIRMED exists → 409.
7. Settled event metadata edit → 400/403 per immutability.
