# Research: Dashboard Unassigned Transactions Banner

**Feature**: `035-unassigned-transactions-banner` | **Date**: 2026-06-19

## 1. Action center data source (single vs all-venues)

**Decision**: Read `actionCenter` from `useDashboard` for single-venue; add client-side `mergeActionCenter` in `useAllVenuesDashboard` for all-venues aggregate.

**Rationale**: `DashboardResponse` already includes `actionCenter` per venue (034). `useAllVenuesDashboard` already parallel-fetches per-venue dashboards for partitions but does not merge action center. Client merge matches the existing all-venues partition pattern without a new aggregate API endpoint.

**Alternatives considered**:
- New `GET /api/dashboard/action-center` aggregate endpoint — rejected; out of scope, duplicates per-venue data already fetched.
- Hide banner in all-venues mode — rejected per clarification session 2026-06-19.

## 2. Venue name in all-venues drawer rows

**Decision**: Resolve venue display name from `useActiveVenue().venues` by matching `UnmappedEventSummaryDto.venueId`; show only when `isAllVenuesSelected`.

**Rationale**: `UnmappedEventSummaryDto` carries `venueId` but not venue name. The overview already loads the venue list for `VenueSwitcher`; no DTO extension required (Constitution VI unchanged).

**Alternatives considered**:
- Extend `UnmappedEventSummaryDto` with `venueName` — rejected; unnecessary API churn for data already on the client.

## 3. Drawer UI pattern

**Decision**: Inline overlay drawer modeled on `MobileNavDrawer` (backdrop, panel, Escape dismiss, focus trap) with dashboard-specific BEM classes (`unassigned-drawer`).

**Rationale**: No shared generic drawer component exists beyond mobile nav. Reusing proven a11y patterns avoids inventing focus/keyboard behavior from scratch.

**Alternatives considered**:
- Radix/shadcn Drawer — rejected; not in project dependencies.
- Full-page route for triage — rejected per spec FR-004 (inline overlay).

## 4. Accordion expand + lazy data fetching

**Decision**: Per-event accordion with `expandedEventIds: Set<string>` local state. On expand, enable `useUnmappedTransactions(venueId, eventId, true)` and `useLedger(venueId, eventId)` for `lineItemOptions` (same derivation as `EventLedgerPage`).

**Rationale**: Matches clarified UX (accordion like `UnmappedBanner`). Lazy fetch avoids N+1 ledger/unmapped requests for all events on drawer open.

**Alternatives considered**:
- Drill-down sub-view — rejected per clarification.
- Pre-fetch all events on drawer open — rejected; wasteful for venues with many events.

## 5. Count refresh after mapping

**Decision**: Extend `InlineMappingDropdown` success handler to `invalidateQueries({ queryKey: dashboardQueryKey(venueId) })` in addition to existing ledger/unmapped invalidation.

**Rationale**: Action-center totals are server-computed on dashboard response. Optimistic local decrement of drawer counts is possible but dashboard invalidation is simpler and authoritative (FR-009).

**Alternatives considered**:
- Optimistic-only dashboard cache patch — rejected; action center list sort/order may change after mapping; server refetch is safer.
- New lightweight count endpoint — rejected; dashboard already cached with 30s staleTime.

## 6. Zero-count drawer behavior

**Decision**: Parent hides banner when `totalUnmappedCount === 0`; drawer stays open showing a success alert until user dismisses manually.

**Rationale**: Matches clarification session answer C. Banner disappearance signals completion; drawer success message provides explicit confirmation.

## 7. Banner placement

**Decision**: Render above `dashboard-overview__zones`, below error/loading states, when dashboard data is loaded and `totalUnmappedCount > 0`.

**Rationale**: Prominent top-of-content placement for action-center alerts; deferred clarification item resolved with sensible default.

## 8. Backend scope

**Decision**: No backend changes.

**Rationale**: All required DTOs and endpoints exist (034 dashboard action center, 003 QBO unmapped + mapping). Feature is frontend presentation + cache wiring.
