# Research: Wire Global Nav to Venue QBO Views

**Feature**: `037-global-nav-qbo-views` | **Date**: 2026-06-19

## 1. Accounting overview route

**Decision**: Add client route `/accounting` rendered by `AccountingOverviewPage` inside `AppShell`; venue scope from `useActiveVenue().activeVenueId` (same header injection as dashboard).

**Rationale**: Mirrors dashboard (`/`) pattern — one global module path, venue context via `X-Active-Venue-Id`. `globalNav.ts` adds `matchPaths: ['/accounting']` for active-state (FR-008). Deep links use `/accounting` without embedding venue UUID in the path; venue switcher updates overview data (FR-011).

**Alternatives considered**:
- `/venues/{venueId}/accounting` — rejected; duplicates venue context already carried by active-venue header; more routing surface for marginal benefit.
- Query param `/?module=accounting` — rejected; breaks global nav active-state clarity.

## 2. Global nav permission filtering

**Decision**: Filter `GLOBAL_NAV_ITEMS` at render time in `GlobalNav` using `useCanManageEvents()` (`canViewFinancials`); omit `accounting` item when false. Enable `accounting` item (remove `disabled`) when true.

**Rationale**: Clarification session: hidden for unauthorized users (not disabled). `useCanManageEvents` already gates financial surfaces; no new permission hook required (rename deferred).

**Alternatives considered**:
- Static config + disabled state — rejected per clarification.
- Separate `useCanViewFinancials` alias — optional polish; not blocking.

## 3. All-venues → accounting navigation

**Decision**: `navigateToAccounting()` reads `getActiveVenueId()` from session storage; if null (all-venues mode), falls back to first accessible venue from `VenueContext`, calls `activateVenueId(id)`, then `pushPath('/accounting')`.

**Rationale**: Clarification: auto-exit all-venues. `activeVenueId === null` means all-venues selected, but session storage often retains last single venue. Explicit `activateVenueId` ensures single-venue context before overview loads.

**Alternatives considered**:
- Venue picker modal — rejected per clarification.
- Block nav in all-venues — rejected.

## 4. Overview page data sources

**Decision**: Compose overview from existing `useDashboard(activeVenueId)` — `actionCenter` for unassigned banner/drawer; merged partition arrays filtered client-side for accounting workload list (events with ≥1 bottleneck alert via `deriveBottleneckAlertsFromSummary` / `mergeBottleneckAlerts`). Add new `useVenueQboStatus(venueId)` for venue-level connection + `lastSyncedAt`.

**Rationale**: Dashboard aggregate already exposes per-event `unmappedCount`, `lastSyncedAt`, `hasVarianceConcern`, lifecycle fields needed for bottleneck derivation (031/034/036). Avoids duplicate aggregate API. Workload list = union of action-center events + bottleneck-alerted events (deduped by `eventId`).

**Alternatives considered**:
- New `GET /accounting-overview` mega-endpoint — rejected; duplicates dashboard.
- Action-center only (unmapped events) — rejected; spec FR-003 requires sync gaps, variance, settlement bottlenecks.

## 5. Inline triage (banner + drawer)

**Decision**: Reuse `UnassignedTransactionsBanner` + `UnassignedTransactionsDrawer` on `AccountingOverviewPage` with `isAllVenuesView={false}` always (accounting is venue-scoped).

**Rationale**: Clarification: full inline triage; 035 components already encapsulate banner/drawer/mapping. Import directly — no duplication.

**Alternatives considered**:
- Fork components for accounting namespace — rejected; violates FR-012 reuse intent.
- Deep-link only — rejected per clarification.

## 6. Venue-wide "Sync all"

**Decision**: Add backend `POST /api/venues/{venueId}/sync` returning `VenueSyncResultDto` with per-event outcomes; implement `QboSyncService.SyncVenueEventsAsync(venueId)` iterating tagged events at the venue (same eligibility as `SyncAllEligibleEventsAsync` inner loop). Frontend `SyncAllButton` calls `useVenueSync(venueId)` mutation.

**Rationale**: Clarification requires one-action venue-wide sync with partial failure feedback (edge case). Existing per-event `POST .../events/{eventId}/sync` works but N sequential client calls lack structured partial-failure reporting, duplicate permission checks, and poor UX on slow networks. `SyncAllEligibleEventsAsync` is org-wide internal-only — extract venue-scoped variant with tenant/venue access guard.

**Alternatives considered**:
- Client-side sequential per-event POSTs — rejected; partial failure aggregation awkward; no single audit log entry.
- Reuse internal `qbo-sync-trigger` — rejected; not venue-scoped; wrong auth model.

## 7. Venue QBO connection status

**Decision**: Add `GET /api/venues/{venueId}/qbo/status` → `VenueQboStatusDto { qboConnected, lastSyncedAt }` using `_tokenService.IsConnectedAsync` and max `QboSyncLedger.SyncedAt` across venue events (`.AsNoTracking()`).

**Rationale**: Overview needs venue-level connection indicator (FR-004) without requiring an arbitrary event's sync-status call. Small read-only endpoint; gated by `ViewFinancials`.

**Alternatives considered**:
- Derive only from dashboard event cards — insufficient when venue has zero events or no sync history but credential exists.
- Embed in dashboard response — rejected; expands 031 contract for a page-specific concern.

## 8. No-venue empty state

**Decision**: Reuse dashboard empty-state markup/copy from `DashboardOverviewPage` when `venues.length === 0` or `activeVenueId` unset after resolution.

**Rationale**: Clarification: visible nav + same no-venue guidance as dashboard.

## 9. Global nav icons (Constitution IX)

**Decision**: Replace letter-placeholder icons in `GlobalNav` with Font Awesome: `faGauge` (dashboard), `faCalendarDays` (booking), `faFileInvoiceDollar` or `faArrowsRotate` (accounting) — per iconography.md migration guidance for touched shell surface.

**Rationale**: Constitution IX; global nav still uses `item.label.charAt(0)` placeholders — migrate while touching `GlobalNav.tsx`.

## 10. Testing strategy

**Decision**: Vitest + RTL for `globalNav.ts`, `GlobalNav`, `AccountingOverviewPage`, `SyncAllButton`; xUnit integration tests for venue sync + status endpoints (Testcontainers); extend `mockWorkspaceFetch` for new routes; ≥80% line/branch on touched backend and frontend files.

**Rationale**: Constitution III; feature spans shell routing + one new page + two API endpoints.

**Alternatives considered**:
- Frontend-only tests with MSW — insufficient for new backend endpoints.
