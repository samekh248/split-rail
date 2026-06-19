# Data Model: Global Nav QBO Views

**Feature**: `037-global-nav-qbo-views` | **Date**: 2026-06-19

## New API types (backend DTOs → `generated-api.ts`)

### `VenueQboStatusDto`

| Field | Type | Description |
|-------|------|-------------|
| `venueId` | `uuid` | Active venue |
| `qboConnected` | `boolean` | Whether `QboVenueCredential` exists and token is valid |
| `lastSyncedAt` | `string \| null` | ISO-8601 max `QboSyncLedger.SyncedAt` across venue events; null if never synced |

### `VenueSyncEventResultDto`

| Field | Type | Description |
|-------|------|-------------|
| `eventId` | `uuid` | Event attempted |
| `title` | `string` | Event title for UI error rows |
| `success` | `boolean` | Whether sync completed without domain exception |
| `errorMessage` | `string \| null` | User-safe message when `success === false` |

### `VenueSyncResultDto`

| Field | Type | Description |
|-------|------|-------------|
| `venueId` | `uuid` | Venue synced |
| `attemptedCount` | `integer` | Events with non-empty `qbo_tag_name` considered |
| `succeededCount` | `integer` | Successful syncs |
| `results` | `VenueSyncEventResultDto[]` | Per-event outcomes (includes failures) |

**Eligibility rule**: Events at venue where `qbo_tag_name` is non-empty (matches `SyncAllEligibleEventsAsync`).

## Consumed API types (existing)

### `DashboardResponse` / `ActionCenterDto` / `UnmappedEventSummaryDto`

Same as [035 data-model](../035-unassigned-transactions-banner/data-model.md) — banner/drawer on accounting overview.

### `EventCardDto` (workload list)

| Field | Used for |
|-------|----------|
| `eventId`, `venueId`, `title`, `eventDate` | Row identity |
| `unmappedCount` | Bottleneck + action-center membership |
| `lastSyncedAt` | Sync gap detection |
| `hasVarianceConcern` | Bottleneck derivation |
| `status`, `isBudgetLocked`, `settlementPdfUrl`, `reconciledAt` | Lifecycle / settlement bottleneck rules via `deriveBottleneckAlerts` |

## Client view models

### `AccountingWorkloadEvent`

Derived client-side (not persisted):

```typescript
{
  eventId: string;
  venueId: string;
  title: string;
  eventDate: string;
  alerts: BottleneckAlert[];  // from eventCardSummary helpers
  unmappedCount: number;
  lastSyncedAt: string | null;
}
```

**Inclusion rule**: Event appears in workload list when `unmappedCount > 0` OR `alerts.length > 0`.

**Sort**: `unmappedCount` desc, then `eventDate` asc (matches action-center ordering).

### `GlobalNavItemConfig` (extended behavior)

| `id` | `disabled` | Visible when |
|------|------------|--------------|
| `dashboard` | never | always |
| `booking` | always | always |
| `accounting` | never (when shown) | `canViewFinancials === true` |

## Route model

| Path | Global active id | Page |
|------|------------------|------|
| `/` | `dashboard` | `DashboardOverviewPage` |
| `/venues/new` | `dashboard` | `CreateVenuePage` |
| `/venues/{v}/events/{e}` | `dashboard` | `EventWorkspacePage` |
| `/accounting` | `accounting` | `AccountingOverviewPage` |
| `/settings/*` | `null` | Settings pages |

## State transitions

### All-venues exit on accounting nav

```
isAllVenuesSelected === true
  → resolve targetVenueId = getActiveVenueId() ?? venues[0].id
  → activateVenueId(targetVenueId)
  → pushPath('/accounting')
```

### Venue-wide sync

```
User clicks Sync all (canTriggerQboSync)
  → POST /api/venues/{venueId}/sync
  → For each eligible event: SyncEventAsync (existing pipeline)
  → Return VenueSyncResultDto
  → UI shows summary; invalidate dashboard + qbo queries for venue
```
