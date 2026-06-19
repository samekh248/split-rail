# Contract: Dashboard Hooks & Overview Wiring (Frontend)

**Feature**: `032-overview-dashboard-wire` | **Extends**: [026-dashboard-overview-page/contracts/dashboard-overview-ui.md](../026-dashboard-overview-page/contracts/dashboard-overview-ui.md), [031-dashboard-aggregate-api/contracts/dashboard-api.md](../031-dashboard-aggregate-api/contracts/dashboard-api.md), [030-event-pin-endpoints/contracts/event-pin-api.md](../030-event-pin-endpoints/contracts/event-pin-api.md)  
**Date**: 2026-06-18

Types from `generated-api.ts` only (Constitution VI). Consumes existing REST endpoints — no new routes.

## Module: `apps/web/src/api/dashboard.ts`

### Query key

```typescript
export function dashboardQueryKey(venueId: string) {
  return ['dashboard', venueId] as const;
}
```

### `useDashboard(venueId: string | null)`

| Property | Value |
|----------|-------|
| `queryFn` | `apiFetch<DashboardResponse>(`/venues/${venueId}/dashboard`) |
| `enabled` | `Boolean(venueId)` |
| `staleTime` | `30_000` |

**Returns**: standard `useQuery` result; `data` partitions drive zone sections.

### `useAllVenuesDashboard(venueIds: string[])`

Parallel fetch via `useQueries`; merges into single partition object per [data-model.md](../data-model.md).

| Property | Value |
|----------|-------|
| `enabled` | `venueIds.length > 0` |
| `staleTime` | `30_000` per query |

**Returns**: `{ data: MergedPartitions, isLoading, isError, refetch }`

### `usePinEvent(venueId: string | null)`

| Property | Value |
|----------|-------|
| `mutationFn` | `(eventId: string) => apiFetch<void>(`/venues/${venueId}/events/${eventId}/pin`, { method: 'PUT' })` |
| `onMutate` | Optimistic dashboard cache update (pin) |
| `onError` | Rollback cache |
| `onSettled` | `invalidateQueries(dashboardQueryKey(venueId))` |

### `useUnpinEvent(venueId: string | null)`

Same as pin with `method: 'DELETE'`.

---

## Page: `DashboardOverviewPage` (modified)

### Data wiring (replaces 026 client partition)

```typescript
// Single venue
const { data: dashboard, isLoading, isError, refetch } = useDashboard(activeVenueId);

// All venues
const merged = useAllVenuesDashboard(isAllVenuesSelected ? venueIds : []);

const partitions = isAllVenuesSelected ? merged.data : dashboard;
```

**Zone mapping**:

| Partition field | Component |
|-----------------|-----------|
| `pinnedEvents` | `PinnedEventsSection` |
| `tonightEvents` | `TonightHeroBanner` (null when empty) |
| `upcomingEvents` | `UpcomingEventsSection` |
| `recentEvents` | `RecentEventsSection` |

**Removed imports**: `useEvents`, `useAllVenuesEvents`, `partitionOverviewZones`, `isEventPinned`, `toggleEventPinned`, `pinnedRevision` state.

### Pin wiring (server-backed)

```typescript
const pinEvent = usePinEvent(activeVenueId);
const unpinEvent = useUnpinEvent(activeVenueId);

const handlePinToggle = (venueId: string, eventId: string, currentlyPinned: boolean) => {
  const mutation = currentlyPinned ? unpinEvent : pinEvent;
  void mutation.mutate(eventId);
};
```

Zone sections pass `event.isPinned` directly; `isEventPinned` callback removed.

**All-venues pin**: resolve `venueId` from `EventCardDto.venueId` on each card (required).

### Navigation wiring

```typescript
const handleCardActivate = (venueId: string, eventId: string) => {
  navigateToEventWorkspace(venueId, eventId);
};
```

### Empty / error states

| Condition | Behavior |
|-----------|----------|
| All four partitions empty | `data-testid="dashboard-no-events"` |
| `isError` | "Unable to load events" + retry `refetch()` |
| No financial permission (403) | Error/guidance state (match existing patterns) |

---

## Component: `EventCard` (modified)

### Props (unchanged surface; widened event type)

```typescript
event: EventCardDto;  // was EventResponse — compatible fields + summaries
```

### Summary precedence

| Display | Rule |
|---------|------|
| Variance badge | `event.hasVarianceConcern === true` OR (`lineItems` provided && negative variance) |
| Bottleneck chips | `deriveBottleneckAlertsFromSummary(event)` then merge/fallback `deriveBottleneckAlerts(event)` |
| Quick links | `deriveLifecyclePhase(event)` — client fallback |
| Pin button | `event.isPinned` from server; `onPinToggle` from parent |

---

## Zone components (modified typing)

`DashboardZoneEvents`, `TonightHeroBanner`, zone sections:

```typescript
events: EventCardDto[];
onPinToggle: (venueId: string, eventId: string, isPinned: boolean) => void;
// Remove isEventPinned callback — use event.isPinned
```

---

## Coverage matrix

| ID | Requirement | Verification target | Suite | Key assertions |
|----|-------------|---------------------|-------|----------------|
| F1 | FR-001 server aggregate | Overview render | `DashboardOverviewPage.test.tsx` | Zones match dashboard fixture partitions | ✓ |
| F2 | FR-003 tonight hidden | Empty `tonightEvents` | same | No `dashboard-zone-tonight` | ✓ |
| F3 | FR-004/005 server pins | Pin + refetch | same | `pinnedEvents` from API; not localStorage | ✓ |
| F4 | FR-007 optimistic pin | Toggle before resolve | same | Immediate zone/card update | ✓ |
| F5 | FR-007 rollback | Mock pin 500 | same | Reverts to prior state + error | ✓ |
| F6 | FR-008 venue switch | Change venue | same | New dashboard fixture loaded | ✓ |
| F7 | FR-009 variance badge | `hasVarianceConcern: true` | `EventCard.test.tsx` | Badge visible without lineItems | ✓ |
| F8 | FR-010 lifecycle fallback | Card with status fields | `EventCard.test.tsx` | Phase quick links render | ✓ |
| F9 | FR-012 no localStorage pins | Pin test | `DashboardOverviewPage.test.tsx` | `pinnedEventStorage` not called | ✓ |
| F10 | FR-013 staleTime | Hook unit test | `dashboard.test.tsx` | `staleTime === 30_000` | ✓ |
| F11 | FR-015 coverage | Vitest coverage | `npm run test:coverage` | Touched files ≥80% | ✓ |
| F12 | Constitution VI | Type imports | ESLint / review | No manual API interfaces | ✓ |

## Definition of Done (verification)

- All matrix rows F1–F12 have at least one passing test or measurable outcome.
- `npm run test` in `apps/web` passes with no regressions.
- Overview no longer imports `partitionOverviewZones` or `pinnedEventStorage`.
- Pin state survives full page reload against running API (manual quickstart Scenario D).
