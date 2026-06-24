# Contract: Unassigned Transactions Banner & Drawer (Frontend)

**Feature**: `035-unassigned-transactions-banner`  
**Extends**: [034-dashboard-action-health-api/contracts/dashboard-api.md](../../034-dashboard-action-health-api/contracts/dashboard-api.md), [032-overview-dashboard-wire/contracts/dashboard-hooks-ui.md](../../032-overview-dashboard-wire/contracts/dashboard-hooks-ui.md), [003-qbo-pull-cache-mapping/contracts/unmapped.md](../../003-qbo-pull-cache-mapping/contracts/unmapped.md)  
**Date**: 2026-06-19

Types from `generated-api.ts` only (Constitution VI). Consumes existing REST endpoints — no new routes.

---

## Module: `apps/web/src/api/dashboard.ts` (extended)

### `mergeActionCenter(dashboards: DashboardResponse[]): ActionCenterDto`

Pure function; unit-tested.

### `useAllVenuesDashboard` (extended return)

```typescript
{
  data: MergedDashboardPartitions | undefined;
  actionCenter: ActionCenterDto | undefined;  // NEW
  isLoading: boolean;
  isError: boolean;
  refetch: () => Promise<unknown[]>;
}
```

`actionCenter` is `undefined` while any per-venue query is loading or errored (same gating as `data`).

---

## Component: `UnassignedTransactionsBanner`

**Path**: `apps/web/src/components/dashboard/UnassignedTransactionsBanner.tsx`

### Props

| Prop | Type | Description |
|------|------|-------------|
| `actionCenter` | `ActionCenterDto \| undefined` | From dashboard query |
| `venues` | `VenueDto[]` or active venue list type | Name lookup for all-venues rows |
| `isAllVenuesView` | `boolean` | Show venue name on drawer rows when true |
| `isLoading` | `boolean` | Suppress banner during dashboard load |

### Visibility

| Condition | Render |
|-----------|--------|
| `isLoading === true` | `null` |
| `actionCenter?.totalUnmappedCount === 0` or undefined | `null` |
| `totalUnmappedCount > 0` | Banner + drawer (drawer open state internal) |

### Banner markup

| Element | Attributes | Content |
|---------|------------|---------|
| Root | `role="alert"`, `data-testid="unassigned-transactions-banner"` | — |
| Toggle/button | `data-testid="unassigned-transactions-banner-toggle"` | `"{n} unassigned transaction(s) detected"` |

### Icons (Constitution IX)

| Control | Icon |
|---------|------|
| Alert indicator | `faTriangleExclamation` |
| Drawer close | `faXmark` |

---

## Component: `UnassignedTransactionsDrawer`

**Path**: `apps/web/src/components/dashboard/UnassignedTransactionsDrawer.tsx`

### Props

| Prop | Type | Description |
|------|------|-------------|
| `open` | `boolean` | Panel visibility |
| `onClose` | `() => void` | Dismiss handler |
| `eventsWithUnmapped` | `UnmappedEventSummaryDto[]` | Sorted event list |
| `totalUnmappedCount` | `number` | For success-state detection |
| `venues` | venue list | Name lookup |
| `isAllVenuesView` | `boolean` | Show venue prefix on rows |

### Drawer structure

```text
[backdrop] → click closes
[panel role="dialog" aria-modal="true"]
  [header] title + close button
  [body — scrollable]
    IF totalUnmappedCount === 0:
      [success alert data-testid="unassigned-drawer-success"]
    ELSE:
      FOR EACH event IN eventsWithUnmapped:
        [accordion row data-testid="unassigned-event-row-{eventId}"]
          [row header] venueName? · title · date · count badge · workspace link
          IF expanded:
            [transaction list data-testid="unassigned-event-list-{eventId}"]
              FOR EACH txn: account, amount, date, InlineMappingDropdown
```

### Accordion row behavior

| Action | Result |
|--------|--------|
| Click row header (not workspace link) | Toggle `expandedEventIds` |
| Expand | Fetch unmapped list + ledger (enabled queries) |
| Workspace link click | `navigateToEventWorkspace(venueId, eventId, 'sync')`; `stopPropagation` |

### Workspace link

| Element | Attributes |
|---------|------------|
| Link/button | `data-testid="unassigned-event-workspace-link-{eventId}"` |

Uses `faArrowUpRightFromSquare` or `faExternalLink` (free solid).

---

## Page integration: `DashboardOverviewPage`

Insert before `dashboard-overview__zones`:

```typescript
const actionCenter = isAllVenuesSelected
  ? allVenuesDashboard.actionCenter
  : singleVenueDashboard.data?.actionCenter;

<UnassignedTransactionsBanner
  actionCenter={actionCenter}
  venues={venues}
  isAllVenuesView={isAllVenuesSelected}
  isLoading={dashboardLoading}
/>
```

Close drawer on venue switch: pass `key={activeVenueId ?? 'all'}` or reset via `useEffect` in banner when `isAllVenuesSelected` / `activeVenueId` changes.

---

## Mapping invalidation extension

**File**: `apps/web/src/components/qbo/InlineMappingDropdown.tsx`

After successful `createMapping.mutateAsync`:

```typescript
void queryClient.invalidateQueries({ queryKey: dashboardQueryKey(venueId) });
```

(existing ledger + unmapped invalidation unchanged)

---

## Test IDs (RTL contract)

| Test ID | Assert |
|---------|--------|
| `unassigned-transactions-banner` | Absent when count 0; present when count > 0 |
| `unassigned-transactions-banner-toggle` | Opens drawer |
| `unassigned-drawer` | Present when open |
| `unassigned-drawer-success` | Present when count 0 while drawer open |
| `unassigned-event-row-{eventId}` | Row renders title, count |
| `unassigned-event-list-{eventId}` | Visible only when expanded |
| `unassigned-event-workspace-link-{eventId}` | Navigation with sync focus |
| `inline-mapping-dropdown` | Reused from existing component |

---

## Error / empty states

| Scenario | Behavior |
|----------|----------|
| `eventsWithUnmapped` empty but `totalUnmappedCount > 0` | Drawer shows recoverable error + retry (`refetchDashboard`) |
| Unmapped list fetch fails on expand | Inline error on row; other rows unaffected |
| Mapping mutation fails | Existing dropdown error pattern; counts unchanged |
