# Phase 1 Data Model: Event Workflow Visual Cleanup and Show Detail Capture

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Research**: [research.md](./research.md)

## Scope of change

Two nullable columns are added to `events`. Everything else listed here already exists and is documented so implementation extends it rather than duplicating it (see [research.md](./research.md) D1).

---

## E1 — Event (extended)

The booked show. Only the last two rows are new.

| Field | Type | Nullable | Status | Notes |
|---|---|---|---|---|
| `Id` | `Guid` | no | existing | |
| `VenueId` | `Guid` | no | existing | Tenant scope — every query filters on it (Constitution II) |
| `Title` | `string` | no | existing | |
| `EventDate` | `DateOnly` | no | existing | The calendar day all times below belong to |
| `EndDate` | `DateOnly?` | yes | existing | Festivals only |
| `EventType` | `EventType` | no | existing | `Standard` \| `Festival` |
| `Status` | `EventStatus` | no | existing | `PreShow` \| `Settled` \| `Reconciled` — **no `Confirmed` member** |
| `BookingPlacementStatus` | `BookingPlacementStatus` | no | existing | `Hold1` \| `Hold2` \| `Confirmed` \| `Cancelled`; **this is what "confirmed" means** |
| `DoorsTime` | `TimeOnly?` | yes | **existing, under-surfaced** | Captured today only in the booking create modal |
| `LoadInTime` | `TimeOnly?` | yes | existing, no interface | Out of scope; left as-is |
| `CurfewTime` | `TimeOnly?` | yes | existing, no interface | Out of scope; left as-is |
| `SupportLineup` | `string?` | yes | **existing, no interface** | Opening/supporting bands, plain text |
| `ShowStartTime` | `TimeOnly?` | yes | **NEW** | Music start; only settable while placement is confirmed |
| `Notes` | `string?` | yes | **NEW** | Free-text operational notes, max 2000 characters (see V4) |

### Validation rules

| Rule | Applies to | Behaviour on violation |
|---|---|---|
| V1 — Show start requires confirmed placement | `ShowStartTime` | Reject the write; the field is also not offered in the interface (FR-004) |
| V2 — Show start not earlier than doors | `ShowStartTime` vs `DoorsTime` | Reject, naming the conflict; previously saved times unchanged (FR-005) |
| V3 — Settled/reconciled immutability | both new fields | Reject via the existing event-status guard (FR-015, Constitution V) |
| V4 — Notes bounded length | `Notes` | Trimmed length MUST NOT exceed 2000 characters — the same bound already applied to `SupportLineup`. Reject before the save is attempted, with the limit stated (spec US4 scenario 4). |
| V5 — Plain-text normalisation | `Notes`, `SupportLineup` | Trimmed; empty becomes null, matching existing `NormalizeOptionalText` handling |

V2 compares two times on the **same calendar day**. A start earlier in the clock than doors is invalid, never interpreted as the following day ([research.md](./research.md) D5).

### Retention behaviour

`ShowStartTime` is **retained** when a placement moves away from confirmed — hidden from the interface, not cleared — and becomes visible again if the placement returns to confirmed (FR-006, [research.md](./research.md) D4).

---

## E2 — Booking Placement Status (existing, unchanged)

| Value | Show start time offered? |
|---|---|
| `Hold1` | no |
| `Hold2` | no |
| `Confirmed` | **yes** |
| `Cancelled` | no |

Doors time is offered for **all** values; only show start time is gated.

---

## E3 — Event Artist (existing, untouched)

The deal-bearing relationship between an event and its headline artist(s). This feature does **not** extend it. The supporting lineup (E1 `SupportLineup`) is deliberately separate: text describing openers, carrying no deal terms, no settlement, and no financial line items (FR-007, spec Out of Scope).

---

## Derived display states

These are presentation states computed from the fields above; they persist nothing.

| State | Condition | Interface result |
|---|---|---|
| Schedule group | any of doors / show start present | Render the labelled schedule grouping |
| Schedule absent | neither present | Communicate absence in words, no blank space (FR-009) |
| Lineup group | `SupportLineup` non-empty | Render as literal text |
| Notes group | `Notes` non-empty | Render with line breaks preserved, as literal text (FR-010) |
| Start-time field | placement is `Confirmed` **and** user may edit | Offer the field; otherwise omit entirely |
| Read-only | user lacks event-edit, or status is settled/reconciled | Fields readable, not editable |

---

## Contract surface

No new endpoint. The two fields append to the existing event payloads:

- `CreateEventRequest` — already carries `DoorsTime`, `LoadInTime`, `CurfewTime`, `SupportLineup`; gains the two new optional fields.
- `UpdateEventRequest` — same.
- `EventResponse` — same, so every existing consumer receives them without a second fetch.

All three are positional C# records, so new fields **append** to preserve compatibility. Frontend types are regenerated from Swagger, never hand-written ([research.md](./research.md) D7, Constitution VI).
