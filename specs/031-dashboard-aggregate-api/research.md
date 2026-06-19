# Research: Dashboard Aggregate API

**Feature**: 031-dashboard-aggregate-api (Linear SPLR-72)  
**Date**: 2026-06-18

## 1. Endpoint placement and route shape

**Decision**: Add `DashboardController` at `GET /api/venues/{venueId}/dashboard` with `[RequirePermission(PermissionNames.ViewFinancials)]`.

**Rationale**: Matches Linear SPLR-72 and TDD §5.4; venue-nested resource consistent with `EventsController` and `EventPinService` access patterns. Keeps dashboard read separate from event CRUD.

**Alternatives considered**:
- **Extend `EventsController` with `/dashboard` sibling route** — rejected; dashboard is an aggregate read, not an event sub-resource.
- **Organization-level dashboard** — rejected; spec FR-002 requires venue-scoped partitions; overview uses active venue only.

## 2. Single-query data loading strategy

**Decision**: One EF query loads all venue events with explicit `.Include()` for `LineItems`, `UnmappedQboTransactions`, `QboSyncLedgerEntries`, and a filtered include of `UserEventPins` for the authenticated user; `.AsNoTracking()` throughout. Partition assignment and per-event aggregates computed in service memory after materialization.

**Rationale**: Constitution VII mandates eager loading and `.AsNoTracking()` for dashboard reads. Venue-scoped event counts are bounded (SC-004 targets ≤50 events). In-memory partition after one round-trip avoids N+1 per-event sync/variance queries while keeping logic testable.

**Alternatives considered**:
- **Per-event `GetSyncStatusAsync` calls** — rejected; N+1 queries violate performance goal and TDD single round-trip intent.
- **Raw SQL with window functions** — rejected; EF Include pattern matches codebase conventions and tenant filters apply automatically.

## 3. Variance concern derivation

**Decision**: Reuse `LedgerService.ToLineItemDto` logic: `variance = QboActualValue - SettlementValue`; `HasVarianceConcern = true` when any line item has `Math.Abs(variance) > 0m` (matches existing `VarianceFlagged` on `LineItemDto`).

**Rationale**: Spec FR-005 and event card spec (025) require same rules as ledger grid. Server already computes variance in `LedgerService`; extract shared static helper or duplicate the two-line formula in `DashboardService` (prefer small shared `LedgerVarianceHelper` if duplication would violate DRY across services).

**Alternatives considered**:
- **Negative variance only** — rejected; `LedgerService` flags any non-zero variance; dashboard must stay consistent with grid DTOs.
- **Client-side derivation** — rejected; this feature moves aggregates server-side per SPLR-72 gap analysis.

## 4. Unmapped count and latest sync timestamp

**Decision**:
- `UnmappedCount` = count of `UnmappedQboTransactions` rows for the event (same source as `QboSyncService.GetSyncStatusAsync`).
- `LastSyncedAt` = `MAX(SyncedAt)` from `QboSyncLedgerEntries` for the event; `null` when no sync history.

**Rationale**: Mirrors existing `SyncStatusDto` semantics without per-event API calls. Aligns with spec FR-005 and Linear acceptance criteria.

**Alternatives considered**:
- **Unmapped = line items without QBO mapping** — rejected; platform tracks unmapped via `unmapped_qbo_transactions` table per QBO sync flow.
- **Batch-level sync only** — rejected; event cards need per-event latest activity timestamp.

## 5. Server-side partition date boundaries

**Decision**: Partition using `DateOnly` comparisons against UTC calendar "today" (`DateOnly.FromDateTime(DateTime.UtcNow)`). Windows match client `partitionOverviewZones.ts`:
- **Tonight**: `eventDate == today`
- **Recent**: `eventDate >= today.AddDays(-7) && eventDate < today` (yesterday through 7 days ago inclusive)
- **Upcoming**: `eventDate > today && eventDate <= today.AddDays(30)` (tomorrow through 30 days ahead inclusive)
- **Pinned**: events where current user has a `UserEventPin` row (any date)

Sort: recent descending by date; upcoming ascending; tonight by lifecycle phase priority then date (optional v1: date ascending only on server; frontend may re-sort).

**Rationale**: Venue model has no timezone field (confirmed in `Venue.cs`). Spec assumption defaults to UTC when venue timezone unavailable. Rules align with 026-dashboard-overview-page clarifications (today exclusive from recent/upcoming; overlap allowed for pinned + date zones).

**Alternatives considered**:
- **Client-only partitioning with server flat list** — rejected; SPLR-72 explicitly requires server partitions.
- **Accept `?timezone=` query param** — deferred; adds contract surface without venue timezone storage.

## 6. Pin membership

**Decision**: Left-join `UserEventPin` filtered to `ITenantContext.UserId` when loading events. Set `IsPinned = true` on `EventCardDto` when pin row exists; populate `PinnedEvents` partition from pinned events regardless of date.

**Rationale**: FR-006 requires server-side pin authority. `UserEventPin` entity and global org filter exist from spec 029; pin write API from spec 030.

**Alternatives considered**:
- **Separate pins query** — rejected; can be included in same Include graph for one round-trip.

## 7. DTO shape and OpenAPI regeneration

**Decision**: Add `apps/api/DTOs/Dashboard/DashboardDtos.cs`:
- `EventCardDto` — core event fields + `IsPinned`, `HasVarianceConcern`, `UnmappedCount`, `LastSyncedAt`
- `DashboardResponse` — `TonightEvents`, `PinnedEvents`, `RecentEvents`, `UpcomingEvents` (each `IReadOnlyList<EventCardDto>`)

Regenerate `apps/web/src/types/generated-api.ts` via `npm run gen:api` after build (Constitution VI). No frontend consumption in this issue (SPLR-71 downstream).

**Alternatives considered**:
- **Reuse `EventResponse` + extension** — rejected; aggregate fields would pollute generic event list contract.
- **ActionCenter / FinancialHealth stubs** — rejected for this issue; explicitly out of scope (SPLR-74).

## 8. Test strategy

**Decision**: New `DashboardControllerTests.cs` extending `IntegrationTestBase`:
- Partition boundary matrix (today, ±7d, ±30d, outside windows, pinned overlap)
- Aggregate correctness (seed line items with variance, unmapped rows, sync ledger entries)
- Cross-org and venue-scope denial (404)
- Missing `can_view_financials` (403)
- Per-user pin isolation in pinned partition
- Empty venue → all partitions empty arrays

Coverage: `dotnet test --collect:"XPlat Code Coverage"` ≥80% on `DashboardService`, `DashboardController`, DTOs, tests. Frontend coverage N/A (backend-only); run `gen:api` to update types without new Vitest files.

**Rationale**: Constitution III; pattern matches `EventPinControllerTests` and `UserEventPinPersistenceTests`.

**Alternatives considered**:
- **Unit tests only with mocked DbContext** — rejected; partition + tenant isolation require integration tests with Testcontainers.

## 9. Prerequisites and sequencing

**Decision**: Block implementation on merged spec 029 (`UserEventPin` entity) and spec 030 (pin API optional for dashboard read — entity required, write API not required for GET dashboard).

**Rationale**: Linear `blockedBy` SPLR-69; pin Include depends on `user_event_pins` table.

**Alternatives considered**:
- **Ship without pins (empty pinned partition)** — rejected; FR-006 is in scope for SPLR-72.
