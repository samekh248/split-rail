# Contract: Venue QBO Sync & Status API

**Feature**: `037-global-nav-qbo-views`  
**Extends**: [003-qbo-pull-cache-mapping/contracts/sync.md](../../003-qbo-pull-cache-mapping/contracts/sync.md)  
**Date**: 2026-06-19

Types defined in C# DTOs first; consumed from `generated-api.ts` (Constitution VI).

---

## `GET /api/venues/{venueId}/qbo/status`

**Permission**: `ViewFinancials`  
**Venue scope**: `VenueService.IsVenueAccessibleAsync`

### Response `200` — `VenueQboStatusDto`

| Field | Type | Notes |
|-------|------|-------|
| `venueId` | `uuid` | Echo path param |
| `qboConnected` | `boolean` | From `QboTokenService.IsConnectedAsync` |
| `lastSyncedAt` | `string \| null` | ISO-8601; max ledger `synced_at` for venue events |

### Errors

| Status | When |
|--------|------|
| `404` | Venue not found or not accessible (tenant isolation) |
| `403` | Missing `ViewFinancials` |

---

## `POST /api/venues/{venueId}/sync`

**Permission**: `TriggerQboSync`  
**Venue scope**: `VenueService.IsVenueAccessibleAsync`

### Response `200` — `VenueSyncResultDto`

| Field | Type | Notes |
|-------|------|-------|
| `venueId` | `uuid` | Echo path param |
| `attemptedCount` | `integer` | Eligible events (non-empty `qbo_tag_name`) |
| `succeededCount` | `integer` | Count where sync succeeded |
| `results` | `VenueSyncEventResultDto[]` | One entry per attempted event |

#### `VenueSyncEventResultDto`

| Field | Type | Notes |
|-------|------|-------|
| `eventId` | `uuid` | |
| `title` | `string` | Event title |
| `success` | `boolean` | |
| `errorMessage` | `string \| null` | Sanitized; no token/PII (Constitution VIII) |

### Behavior

1. Load eligible event IDs: `Events` where `venue_id = {venueId}` AND `qbo_tag_name != ''`.
2. For each event, invoke existing `SyncEventAsync(venueId, eventId)` inside try/catch.
3. On domain exception, append result with `success: false` and user-safe `errorMessage`; continue remaining events (partial success).
4. Read-only QBO HTTP only (Constitution IV).

### Errors

| Status | When |
|--------|------|
| `404` | Venue not accessible |
| `403` | Missing `TriggerQboSync` |

---

## Service: `QboSyncService.SyncVenueEventsAsync`

```csharp
Task<VenueSyncResultDto> SyncVenueEventsAsync(Guid venueId, CancellationToken cancellationToken)
```

- MUST call `_venueService.IsVenueAccessibleAsync` when user context present.
- MUST use `.AsNoTracking()` on eligibility query.
- MUST NOT swallow exceptions without recording per-event failure in `results`.

---

## Integration tests (`QboSyncControllerTests` or new `VenueSyncTests`)

| Case | Assert |
|------|--------|
| Status when credential exists | `qboConnected === true` |
| Status when no credential | `qboConnected === false` |
| Venue sync with tagged events | `attemptedCount >= 1`, mixed results on forced failure |
| Out-of-scope venue | `404` |
| User without TriggerQboSync | `403` on POST sync |

Coverage target: ≥80% line/branch on `QboSyncService.SyncVenueEventsAsync`, new controller actions, DTO mappers.
