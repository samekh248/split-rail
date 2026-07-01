# Contract: QBO Integration API

**Feature**: 076-qbo-online-sync  
**Auth**: JWT Bearer unless noted.  
**Admin gate**: Endpoints marked **Admin** require `RoleNames.Admin` on current organization (403 + structured audit log on violation).

Extends contracts from spec 003 (`/mappings`, `/sync`, `/sync-status`). See [data-model.md](../data-model.md).

---

## Integration status

### GET `/api/venues/{venueId}/qbo/integration`

Returns full integration card state for Settings UI.

- **Permission**: **Admin**
- **200 OK**:

```json
{
  "venueId": "uuid",
  "qboConnected": true,
  "connectionState": "Connected",
  "companyName": "The Lodgepole LLC",
  "realmId": "1234567890",
  "lastSyncedAt": "2026-06-26T08:00:00Z",
  "canPurgeCache": false
}
```

- **404**: venue not found or out of tenant scope.

---

## OAuth (extended)

### GET `/api/venues/{venueId}/qbo/connect`

Initiates Intuit OAuth redirect.

- **Permission**: **Admin** (replaces `can_map_qbo_accounts`)
- **302**: redirect to Intuit authorize URL with scope `com.intuit.quickbooks.accounting` only.

### GET `/api/qbo/callback`

OAuth callback (anonymous).

- **302**: redirect to `/settings/integrations?venueId={venueId}&qboConnected=true` (was `/`).

### POST `/api/venues/{venueId}/qbo/disconnect`

Revokes tokens (best-effort), deletes credential row, suspends sync for venue.

- **Permission**: **Admin**
- **204**: success; cached data retained.

---

## Purge cached data

### POST `/api/venues/{venueId}/qbo/purge-cache`

- **Permission**: **Admin**
- **Precondition**: venue disconnected (no credential row); else **409 Conflict**
- **204**: purge complete per cascade in data-model.md

---

## Tracking catalog

### GET `/api/venues/{venueId}/qbo/tracking-catalog`

Read-only pull from Intuit; server cache 15 min.

- **Permission**: **Admin**
- **200 OK**:

```json
{
  "items": [
    { "type": "Class", "id": "1", "name": "Montana West" },
    { "type": "Tag", "id": "42", "name": "Show-104" }
  ]
}
```

- **502**: Intuit query failure (sanitized `QboSyncException`).

---

## Tracking mappings CRUD

Base: `/api/venues/{venueId}/qbo/tracking-mappings`

### GET ``

- **Permission**: **Admin**
- **200 OK**: `{ "venueId": "uuid", "mappings": [ ... ] }`

Mapping object:

```json
{
  "id": "uuid",
  "qboTrackingType": "Tag",
  "qboTrackingId": "42",
  "qboTrackingName": "Show-104",
  "targetTier": "Event",
  "targetEntityId": "uuid",
  "targetDisplayName": "Mountain Echoes",
  "createdAt": "2026-06-26T12:00:00Z"
}
```

### POST ``

- **Permission**: **Admin**
- **Body**: `{ "qboTrackingType", "qboTrackingId", "qboTrackingName", "targetTier", "targetEntityId" }`
- **201 Created**: mapping DTO

### PUT `/{mappingId}`

- **Permission**: **Admin**
- **Body**: `{ "targetTier", "targetEntityId" }` (tracking ref immutable)
- **200 OK**: updated mapping

### DELETE `/{mappingId}`

- **Permission**: **Admin**
- **204**: deleted

---

## Organization summary

### GET `/api/organizations/{orgId}/qbo/summary`

- **Permission**: `can_view_financials`
- **200 OK**:

```json
{
  "organizationId": "uuid",
  "isQboConnected": true,
  "connectedVenueCount": 2,
  "totalVenueCount": 3
}
```

---

## Sync (permission changes)

### POST `/api/venues/{venueId}/sync`

Venue-level Force Pull.

- **Permission**: **Admin** (replaces `can_trigger_qbo_sync`)
- **429**: rate limit — max 1 request per venue per 60 seconds
- **200 OK**: existing `VenueSyncResultDto`

### POST `/api/venues/{venueId}/events/{eventId}/sync`

Event-level Force Pull.

- **Permission**: **Admin**
- **429**: same rate limit per venue
- **200 OK**: existing `SyncResultDto`

### Account mappings CRUD

Existing `/api/venues/{venueId}/mappings` routes: mutation permission changes from `can_map_qbo_accounts` to **Admin**. GET remains `can_view_financials`.

---

## Internal nightly dispatch (extended)

### POST `/api/internal/qbo-sync-trigger`

Existing OIDC auth (spec 057). New query params:

| Param | Description |
|-------|-------------|
| `mode=nightly` | Select orgs in 03:00 local window; 48h lookback |
| `organizationId={uuid}` | Optional; sync single org only |

Scheduler cron changes from `0 */6 * * *` to `*/15 * * * *` UTC (see [qbo-scheduler-timezone-dispatch.md](./qbo-scheduler-timezone-dispatch.md)).

---

## Payload stripping (response contract)

When venue `connectionState != Connected`, omit from client DTOs:

| DTO | Omitted fields |
|-----|----------------|
| Ledger line items | `qboActualValue`, variance fields, `hasQboCorrection` |
| `SyncStatusDto` | `totalMappedTransactions`, `totalUnmappedTransactions` (keep `qboConnected: false`) |
| Dashboard financial health | `actualQboDeposits`, variance series |
| Action center | unmapped QBO counts |

Implemented server-side before serialization (FR-020).

---

## Audit logging (403)

Structured log on Admin-gate rejection:

```text
userId, organizationId, path, outcome=rejected-forbidden, reason=admin-required
```

No PII beyond user id; no tokens (Constitution VIII).
