# Data Model: Dashboard Unassigned Transactions Banner

**Feature**: `035-unassigned-transactions-banner` | **Date**: 2026-06-19

Frontend-only feature. Documents view-state and consumed API shapes — no new persistence entities.

## Consumed API types (from `generated-api.ts`)

### `ActionCenterDto`

| Field | Type | UI usage |
|-------|------|----------|
| `totalUnmappedCount` | `number` | Banner visibility threshold; banner message count; zero-state trigger |
| `eventsWithUnmapped` | `UnmappedEventSummaryDto[]` | Drawer event list |

### `UnmappedEventSummaryDto`

| Field | Type | UI usage |
|-------|------|----------|
| `eventId` | `uuid` | Accordion key; workspace link; QBO/ledger query keys |
| `venueId` | `uuid` | Workspace link; venue name lookup; QBO/ledger query keys |
| `title` | `string` | Drawer row label |
| `eventDate` | `string` (ISO date) | Drawer row label; sort tiebreaker |
| `unmappedCount` | `number` | Drawer row badge; sort primary key |

**Sort order** (server-provided; re-applied after client merge): `unmappedCount` descending, `eventDate` ascending.

### `UnmappedTransactionDto` (lazy-loaded per expanded row)

| Field | Type | UI usage |
|-------|------|----------|
| `id` | `uuid` | List item key |
| `qboAccountId` | `string` | Mapping payload |
| `qboAccountName` | `string` | Display |
| `amount` | money string | Display via `formatMoney` |
| `transactionDate` | `string` | Display |

### Ledger row options (derived from `useLedger`)

```typescript
{ id: string; label: string }[]  // from blocks[].rows[] — same as EventLedgerPage
```

## Client merge: `mergeActionCenter`

**Input**: `DashboardResponse[]` (one per venue in all-venues mode)

**Output**: `ActionCenterDto`

| Rule | Behavior |
|------|----------|
| Total | Sum of each dashboard's `actionCenter.totalUnmappedCount` |
| Events | Concatenate all `eventsWithUnmapped` arrays |
| Re-sort | `unmappedCount` desc, then `eventDate` asc |

## View state (component-local)

### `UnassignedTransactionsBanner`

| State | Type | Initial | Transitions |
|-------|------|---------|-------------|
| `drawerOpen` | `boolean` | `false` | `true` on banner activate; `false` on dismiss, Escape, venue switch |

### `UnassignedTransactionsDrawer`

| State | Type | Initial | Transitions |
|-------|------|---------|-------------|
| `expandedEventIds` | `Set<string>` | `empty` | Toggle on row activate; cleared on drawer close |
| `showSuccess` | derived | `totalUnmappedCount === 0 && open` | True after final mapping invalidates dashboard to zero |

## Venue name resolution

```typescript
venues.find(v => v.id === event.venueId)?.name ?? 'Unknown venue'
```

Only displayed when `isAllVenuesView === true`.

## Cache keys affected

| Key | Invalidated when |
|-----|------------------|
| `['dashboard', venueId]` | Successful inline mapping (`InlineMappingDropdown`) |
| `qboKeys.unmappedList(venueId, eventId)` | Mapping (existing) |
| `qboKeys.unmappedCount(venueId, eventId)` | Mapping (existing) |
| `ledgerKeys.grid(venueId, eventId)` | Mapping (existing) |

## Validation rules

| Rule | Source |
|------|--------|
| Banner visible iff `!isLoading && totalUnmappedCount > 0` | FR-001, FR-002 |
| Drawer lists only events with `unmappedCount > 0` | Server action center (pre-filtered) |
| Workspace link includes `focus=sync` | FR-010 |
| No banner flash during dashboard loading | User Story 1 scenario 4 |
