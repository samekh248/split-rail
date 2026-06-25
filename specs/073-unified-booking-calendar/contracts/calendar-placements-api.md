# API Contract: Calendar Placements

**Base Path**: `/api/calendar`  
**Auth**: Bearer token required  
**Permission**: Financial view (`ViewFinancials`)  
**Tenant Scope**: Organization + user venue access

## GET /api/calendar/placements

Returns all show/hold placements for accessible venues within a date range.

**Query parameters**:

| Param | Required | Description |
|-------|----------|-------------|
| `from` | yes | Inclusive start date `YYYY-MM-DD` |
| `to` | yes | Inclusive end date `YYYY-MM-DD` |
| `regionId` | no | Server-side optional pre-filter |
| `venueId` | no | Server-side optional pre-filter |
| `includeCancelled` | no | Default `false` |

**Response 200**: `CalendarPlacementDto[]`

```json
{
  "eventId": "uuid",
  "venueId": "uuid",
  "venueName": "string",
  "regionId": "uuid | null",
  "regionName": "string | null",
  "title": "string",
  "eventDate": "YYYY-MM-DD",
  "bookingPlacementStatus": "HOLD_1 | HOLD_2 | CONFIRMED | CANCELLED",
  "doorsTime": "HH:mm | null",
  "loadInTime": "HH:mm | null",
  "curfewTime": "HH:mm | null",
  "supportLineup": "string | null",
  "financialStatus": "PRE_SHOW | SETTLED | RECONCILED",
  "isBudgetLocked": false,
  "qboTagName": "string",
  "hasLineItems": false,
  "workspaceAllowed": true
}
```

**Field notes**:
- `workspaceAllowed`: `false` when `bookingPlacementStatus` is `HOLD_1` or `HOLD_2`.
- `hasLineItems`: used for cancel warning copy (FR-021).
- `regionName` null → client groups under "Unassigned".

| Status | Description |
|--------|-------------|
| 400 | Invalid date range (`from` > `to` or span > 93 days) |
| 401 | Unauthenticated |
| 403 | Missing financial view permission |

## Extended event write contracts

Existing `/api/venues/{venueId}/events` endpoints accept additional fields:

**CreateEventRequest** (additions):
```json
{
  "title": "string",
  "eventDate": "YYYY-MM-DD",
  "qboTagName": "string | null",
  "bookingPlacementStatus": "HOLD_1 | HOLD_2 | CONFIRMED",
  "doorsTime": "HH:mm | null",
  "loadInTime": "HH:mm | null",
  "curfewTime": "HH:mm | null",
  "supportLineup": "string | null"
}
```

**UpdateEventRequest**: same fields + allow `bookingPlacementStatus` transitions (`promote`, `cancel`).

**Cancel confirmed** (preferred explicit action):
`PATCH` with `{ "bookingPlacementStatus": "CANCELLED" }` — soft cancel.

**Delete hold**: `DELETE` when status is `HOLD_1` or `HOLD_2` (hard delete).

| Status | Description |
|--------|-------------|
| 409 | Booking conflict — see [booking-conflicts.md](./booking-conflicts.md) |
