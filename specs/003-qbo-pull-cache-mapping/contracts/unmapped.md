# Contract: Unmapped QBO Transactions

**Feature**: 003-qbo-pull-cache-mapping
**Base path**: `api/venues/{venueId}/events/{eventId}`
**Auth**: JWT Bearer.

## GET `/unmapped-transactions`

Lists all unmapped QBO transactions for an event. These are transactions ingested during sync that had a `qbo_account_id` with no matching entry in `qbo_account_mappings` for the venue.

- **Permission**: `can_view_financials`.
- **200 OK**:

```json
{
  "eventId": "uuid",
  "venueId": "uuid",
  "unmappedCount": 4,
  "transactions": [
    {
      "id": "uuid",
      "qboTransactionId": "TXN-12345",
      "qboAccountId": "ACC-001",
      "qboAccountName": "Sound Equipment Rental",
      "amount": "1250.00",
      "transactionDate": "2026-06-10",
      "syncedAt": "2026-06-14T18:00:00Z"
    }
  ]
}
```

Note: `amount` is serialized as a string (Constitution VI — decimal-as-string serialization).

- **404 Not Found**: unknown/out-of-tenant event or venue.

## GET `/unmapped-count`

Lightweight endpoint returning only the unmapped transaction count for an event. Used by the frontend banner component for efficient polling.

- **Permission**: `can_view_financials`.
- **200 OK**:

```json
{
  "eventId": "uuid",
  "unmappedCount": 4
}
```

- **404 Not Found**: unknown/out-of-tenant event or venue.

## Implementation Notes

- Unmapped transactions are queried from `unmapped_qbo_transactions` scoped by `Event.Venue.OrganizationId` via EF Core global query filters.
- The `venue_id` column on `unmapped_qbo_transactions` is denormalized for fast venue-scope queries (avoids join through event on count queries).
- Monetary values in response DTOs use `DecimalStringJsonConverter` for string serialization.
- Unmapped transactions are NOT directly mutable via API. They are managed by the sync pipeline (create on unmapped ingest) and the mapping creation flow (delete on re-processing). There is no PUT/DELETE endpoint for unmapped transactions.
- The unmapped count poll interval on the frontend is configurable; recommended default is 30 seconds via TanStack Query's `refetchInterval`.
