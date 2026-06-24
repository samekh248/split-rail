# Contract: Accounting Overview & Global Nav UI

**Feature**: `037-global-nav-qbo-views`  
**Extends**: [022-vertical-navigation/contracts/vertical-navigation-ui.md](../../022-vertical-navigation/contracts/vertical-navigation-ui.md), [035-unassigned-transactions-banner/contracts/unassigned-transactions-banner-ui.md](../../035-unassigned-transactions-banner/contracts/unassigned-transactions-banner-ui.md)  
**Date**: 2026-06-19

Types from `generated-api.ts` only (Constitution VI).

---

## Module: `apps/web/src/lib/globalNav.ts`

### `GLOBAL_NAV_ITEMS` (accounting item)

| Field | Value |
|-------|-------|
| `id` | `accounting` |
| `label` | `Settlements / Accounting Sync` |
| `disabled` | removed when item shown |
| `navigate` | `navigateToAccounting` |
| `matchPaths` | `['/accounting']` |

### `resolveActiveGlobalNavId`

| Path | Active id |
|------|-----------|
| `/accounting` | `accounting` |
| (unchanged dashboard/workspace paths) | `dashboard` |
| `/settings/*` | `null` |

### `navigateToAccounting()`

1. If `isAllVenuesSelected`, resolve `targetVenueId = getActiveVenueId() ?? venues[0].id`; call `activateVenueId(targetVenueId)`.
2. `pushPath('/accounting')`.

---

## Module: `apps/web/src/lib/appRoute.ts`

### `AppPath` extension

Add `'/accounting'` to union.

### `getAppPath()`

Map `pathname === '/accounting'` → `'/accounting'`.

### `useAppRoute()`

Must emit updates on `/accounting` navigation.

---

## Component: `GlobalNav`

**Path**: `apps/web/src/components/shell/GlobalNav.tsx`

### Permission filter

| Condition | Accounting item |
|-----------|-----------------|
| `canViewFinancials === false` | Not rendered |
| `canViewFinancials === true` | Rendered, enabled, no "Coming soon" |

### Icons (Constitution IX)

| Item | Icon |
|------|------|
| Dashboard | `faGauge` |
| Booking Calendar | `faCalendarDays` |
| Accounting | `faArrowsRotate` |

---

## Page: `AccountingOverviewPage`

**Path**: `apps/web/src/pages/AccountingOverviewPage.tsx`  
**Route**: `/accounting` (via `App.tsx`)

### Layout regions

| Region | Content |
|--------|---------|
| Header | Title "Settlements & Accounting Sync" |
| QBO status card | `VenueQboStatusDto` — connected badge, `lastSyncedAt` formatted |
| Sync all | `SyncAllButton` when `canTriggerQboSync` |
| Unassigned triage | `UnassignedTransactionsBanner` (`isAllVenuesView={false}`) |
| Workload list | `AccountingWorkloadList` — events with alerts/unmapped |
| Empty state | Reuse dashboard no-venue panel when no venue |

### Data hooks

| Hook | Purpose |
|------|---------|
| `useActiveVenue()` | Venue scope, empty state |
| `useDashboard(activeVenueId)` | `actionCenter`, event partitions |
| `useVenueQboStatus(activeVenueId)` | Connection card |
| `useCanTriggerQboSync()` | Sync all visibility |

### Workload list row actions

| Control | Action |
|---------|--------|
| Workspace link | `navigateToEventWorkspace(venueId, eventId, 'sync')` |

---

## Component: `SyncAllButton`

**Path**: `apps/web/src/components/qbo/SyncAllButton.tsx`

| Prop | Type |
|------|------|
| `venueId` | `string` |

| State | UI |
|-------|-----|
| `isPending` | Disabled; label "Syncing…" |
| Success with failures | Alert listing failed event titles |
| Full success | Toast or inline success message |

`data-testid="sync-all-button"`

On success: invalidate `dashboardQueryKey(venueId)`, `qboKeys` for venue.

---

## Module: `apps/web/src/api/qbo.ts` (extended)

### `useVenueQboStatus(venueId)`

Query key: `[...qboKeys.all, 'venue-status', venueId]`

### `useVenueSync(venueId)`

Mutation: `POST /venues/{venueId}/sync`

---

## `App.tsx` routing

```text
appPath === '/accounting' → <AccountingOverviewPage />
```

Inside existing `AuthenticatedShell` (global sidebar).

---

## Test contracts (Vitest + RTL)

| Suite | Asserts |
|-------|---------|
| `globalNav.test.ts` | `/accounting` → active `accounting`; dashboard paths unchanged |
| `GlobalNav.test.tsx` | accounting hidden without financial permission; no "Coming soon" with permission; booking still disabled |
| `AccountingOverviewPage.test.tsx` | status card, banner, workload list, sync all, empty state, venue switch refresh |
| `SyncAllButton.test.tsx` | permission gate, partial failure message |

Coverage: ≥80% line/branch on `apps/web/src/components/shell/**`, `pages/AccountingOverviewPage.tsx`, `lib/globalNav.ts`, `components/qbo/SyncAllButton.tsx`.

---

## Helper: `deriveAccountingWorkloadEvents`

**Path**: `apps/web/src/lib/accountingWorkload.ts` (NEW)

Pure function: flatten dashboard partitions → filter events with `unmappedCount > 0` OR bottleneck alerts → dedupe → sort.

Unit-tested in `accountingWorkload.test.ts`.
