# Contract: QBO Sync

**Feature**: 003-qbo-pull-cache-mapping
**Base path**: `api/venues/{venueId}/events/{eventId}`
**Auth**: JWT Bearer.

## POST `/sync`

Triggers an immediate QBO sync for a specific event, bypassing the scheduled 6-hour cycle. Fetches transactions from QBO filtered by the event's `qbo_tag_name`, resolves mappings, aggregates into `qbo_actual_value`, and stages any unmapped transactions.

- **Permission**: `can_trigger_qbo_sync` + venue scope enforcement on `{venueId}`.
- **Request**: empty body.
- **200 OK**: sync result summary:

```json
{
  "eventId": "uuid",
  "syncBatchId": "uuid",
  "transactionsProcessed": 12,
  "transactionsMapped": 10,
  "transactionsUnmapped": 2,
  "unmappedAccountIds": ["ACC-001", "ACC-002"],
  "syncedAt": "2026-06-14T20:00:00Z"
}
```

- **400 Bad Request**: event has no `qbo_tag_name` configured.
- **403 Forbidden**: lacks `can_trigger_qbo_sync` permission or venue is out of scope.
- **404 Not Found**: unknown/out-of-tenant event or venue.
- **502 Bad Gateway** (`QboSyncException`): Intuit API returned an error (rate limit, auth failure, etc.). Response includes a machine-readable error code.

## GET `/sync-status`

Returns the latest sync status for an event.

- **Permission**: `can_view_financials` (inherits from feature 002).
- **200 OK**:

```json
{
  "eventId": "uuid",
  "lastSyncedAt": "2026-06-14T20:00:00Z",
  "lastSyncBatchId": "uuid",
  "totalMappedTransactions": 45,
  "totalUnmappedTransactions": 3,
  "qboConnected": true
}
```

- **404 Not Found**: unknown/out-of-tenant event.

## Implementation Notes

- `QboSyncService.SyncEventAsync(venueId, eventId)` is called by both the manual trigger endpoint and the `IHostedService` cron.
- The sync operation acquires a distributed lock (advisory lock on `event_id`) to prevent concurrent syncs for the same event.
- All QBO API calls go through `QboTransactionClient` which has no write methods (Constitution IV).
- Token decryption happens in `QboTokenService`; cleartext tokens are never logged (Constitution VIII).
- Monetary aggregation uses `decimal` only (Constitution I).
