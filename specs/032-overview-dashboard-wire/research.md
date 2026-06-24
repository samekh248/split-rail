# Research: Server-Backed Dashboard Overview and Pin Persistence

**Feature**: `032-overview-dashboard-wire` | **Date**: 2026-06-18

## 1. Data source: replace client partition with server aggregate

**Decision**: `DashboardOverviewPage` reads **`DashboardResponse`** partition arrays from `useDashboard(venueId)` and stops calling `useEvents()` + `partitionOverviewZones()` for single-venue mode.

**Rationale**: FR-001/FR-002 require server-authoritative zones aligned with 031 API rules (UTC boundaries, pin overlap). Eliminates client/server drift.

**Alternatives considered**:
- Keep client partition with server event list → rejected; duplicates 031 logic and fails SC-001.
- Hybrid (server partitions + client re-sort) → rejected; unnecessary complexity.

## 2. Pin persistence: server mutations + optimistic UI

**Decision**: Pin/unpin via **`PUT`/`DELETE .../pin`** (030). Use TanStack Query **`onMutate`** to optimistically update the cached `DashboardResponse` (toggle `isPinned`, move event in/out of `pinnedEvents` partition). **`onError`** rolls back prior cache snapshot. **`onSettled`** invalidates `dashboardQueryKey(venueId)`.

**Rationale**: FR-004–FR-007 require server persistence with immediate UI feedback and failure rollback. Invalidation reconciles optimistic state with server truth after success.

**Alternatives considered**:
- Pessimistic-only (wait for server before UI update) → rejected; fails SC-004 / User Story 5.
- Keep `pinnedEventStorage` as cache → rejected; violates FR-012.

## 3. Query freshness (30 seconds)

**Decision**: `useDashboard` sets **`staleTime: 30_000`** (same as `useEvents` in `events.ts`).

**Rationale**: Matches FR-013 acceptance criteria from Linear issue and existing app convention.

**Alternatives considered**:
- `staleTime: 0` → rejected; unnecessary refetch churn on overview navigation.
- Longer TTL (5 min) → rejected; pin changes from other tabs/devices would appear stale too long.

## 4. All-venues selection mode

**Decision**: When `isAllVenuesSelected`, use **`useAllVenuesDashboard(venueIds)`** — parallel `useQueries` per venue, then **concatenate** each partition array and **dedupe by `eventId`** within a zone.

**Rationale**: FR-011 requires retaining existing overview behaviors including all-venues view (026). Dashboard API is venue-scoped; parallel fetch mirrors existing `useAllVenuesEvents` pattern without new backend work.

**Alternatives considered**:
- Force single-venue selection on overview → rejected; regresses 026 UX.
- Fall back to client partition for all-venues only → rejected; pin state would still need server calls per event.

## 5. EventCardDto vs EventResponse typing

**Decision**: **`EventCardDto`** is structurally compatible with **`EventResponse`** for display fields (`eventId`, `venueId`, `title`, `eventDate`, `status`, `isBudgetLocked`, `settledAt`, `settlementPdfAvailable`, `qboTagName`) plus summary fields. Zone components and `EventCard` accept **`EventCardDto`** (import from `generated-api.ts`). No manual TS interface.

**Rationale**: Constitution VI; avoids adapter types. `EventCardDto` is a superset for card rendering.

**Alternatives considered**:
- Map DTO → EventResponse in page → rejected; drops summary fields unless threaded separately.
- New hand-written `OverviewEvent` interface → rejected; Constitution VI violation.

## 6. Lifecycle phase and bottleneck alerts

**Decision**: **`EventCardDto` does not include `lifecyclePhase` or `bottleneckAlerts` arrays** (031 scope). Implement FR-009/FR-010 as:
- **Variance**: `hasVarianceConcern` from DTO (replaces `lineItems` + `eventHasNegativeVariance` on overview).
- **Bottlenecks**: derive chips from DTO summary fields (`unmappedCount > 0`, `lastSyncedAt` null + settled status, etc.) via `deriveBottleneckAlertsFromSummary`; **fallback** to `deriveBottleneckAlerts(event)` for signature/settled rules not yet on DTO.
- **Lifecycle / quick links**: **`deriveLifecyclePhase(event)`** client fallback (FR-010) until a future API adds `lifecyclePhase`.

**Rationale**: Spec allows server-first with client fallback; 031 DTO already ships variance/unmapped/sync aggregates. Avoids blocking SPLR-71 on DTO expansion.

**Alternatives considered**:
- Extend backend DTO in this issue → rejected; spec states no new backend endpoints/changes.
- Ignore server summaries; keep client-only alerts → rejected; fails FR-009 / SC-005.

## 7. Empty-state detection

**Decision**: Treat overview as **having events** when **any** of the four partition arrays is non-empty. All empty → show existing no-events empty state.

**Rationale**: Server always returns four arrays (031 FR-009). An event outside date windows appears in zero partitions — same as 026 client behavior for out-of-window events.

**Alternatives considered**:
- Separate `totalEventCount` field → rejected; not in API contract.

## 8. Test mock strategy

**Decision**: Extend **`mockWorkspaceFetch`** to serve **`GET /venues/:id/dashboard`** fixtures and record **`PUT`/`DELETE .../pin`** calls; migrate `DashboardOverviewPage.test.tsx` off `eventsByVenue` + `pinnedEventStorage`.

**Rationale**: Existing page tests use this harness; minimizes new test infrastructure.

**Alternatives considered**:
- MSW only → rejected; project already standardized on `mockWorkspaceFetch` for workspace tests.

## 9. partitionOverviewZones.ts disposition

**Decision**: **Stop importing** from overview page; **retain** module and unit tests for date-rule regression documentation.

**Rationale**: Server owns partition logic in production path; client module remains reference until fully deprecated in a cleanup issue.

**Alternatives considered**:
- Delete module in this PR → rejected; loses tested date matrix without equivalent frontend coverage of server rules.
