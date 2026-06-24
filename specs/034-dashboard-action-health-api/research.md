# Research: Dashboard Action Center and Financial Health Aggregates

**Feature**: 034-dashboard-action-health-api (Linear SPLR-74)  
**Date**: 2026-06-18

## 1. Extend existing dashboard response (no new routes)

**Decision**: Add `ActionCenter` and `FinancialHealth` properties to existing `DashboardResponse`; compute in `DashboardService.GetDashboardAsync` after event materialization (same EF round-trip as spec 031).

**Rationale**: Spec FR-010 and TDD §5.4 step 4–5 require aggregates in `GET /api/venues/{venueId}/dashboard`. No controller or route changes beyond returning the extended DTO.

**Alternatives considered**:
- **Separate `/dashboard/action-center` endpoints** — rejected; violates single-request overview contract and SPLR-75/76 consumer expectations.
- **Client-side rollups from event cards** — rejected; spec FR-010 requires server-side computation.

## 2. Action center aggregation

**Decision**:
- `TotalUnmappedCount` = sum of `UnmappedQboTransactions.Count` across all venue events loaded in dashboard query (equals sum of `EventCardDto.UnmappedCount` in response).
- `EventsWithUnmapped` = events where `UnmappedCount > 0`, mapped to `UnmappedEventSummaryDto` (`EventId`, `VenueId`, `Title`, `EventDate`, `UnmappedCount`).
- Sort: `UnmappedCount` descending, then `EventDate` ascending (spec clarification session 2026-06-18).

**Rationale**: Matches TDD §5.4 step 4 and clarified FR-002/FR-003. Reuses counts already computed for event cards to guarantee SC-006 consistency.

**Alternatives considered**:
- **Separate DB aggregate query for unmapped** — rejected; data already loaded via `.Include(e => e.UnmappedQboTransactions)`; in-memory rollup is O(n) on bounded venue event set.

## 3. Financial health — projected net show revenue column selection

**Decision**: Status-based column selection **distinct from** `LedgerService.ComputeSummary` (which uses `IsBudgetLocked`):

```csharp
bool useSettlement = evt.Status is EventStatus.Settled or EventStatus.Reconciled;
decimal ActiveValue(FinancialLineItem li) => useSettlement ? li.SettlementValue : li.ProformaValue;
// grossRevenue = SUM ActiveValue where BlockType == REVENUE
// totalDeductions = SUM ActiveValue where IsArtistDeduction
// netShowRevenue = grossRevenue - totalDeductions
```

**Rationale**: Spec clarification Q3 and FR-006 require proforma for budget-locked `PRE_SHOW` events. `LedgerService` budget-lock rule would incorrectly use settlement for locked-but-unsettled events.

**Alternatives considered**:
- **Reuse `LedgerService.ComputeSummary` directly** — rejected; violates clarified status-based rule for financial health widget.
- **Extract shared helper with mode parameter** — accepted pattern: new `DashboardFinancialHealthHelper` with explicit `FinancialHealthColumnMode.StatusBased` to avoid silent divergence from ledger grid edit view.

## 4. Financial health — actual QBO deposits

**Decision**: Per in-week event, `actualContribution = SUM(lineItem.QboActualValue)` where `lineItem.BlockType == BlockType.Revenue.ToStorage()`. Weekly `ActualQboDeposits` = sum of per-event contributions. Expense and deal-math line QBO actuals excluded.

**Rationale**: Spec clarification Q1 and TDD §5.4 step 5. Aligns with "QBO deposits" semantics (bank deposits map to revenue accounts).

**Alternatives considered**:
- **Net QBO actuals (revenue minus deduction actuals)** — rejected per clarification.
- **All line-item QBO actuals** — rejected; expense actuals are not deposits.

## 5. Calendar week boundaries

**Decision**: Monday–Sunday inclusive week containing reference `today`:
- Reference timezone: **UTC** (`DateOnly.FromDateTime(DateTime.UtcNow)`) — `Venue` model has no timezone field (same as spec 031 partition research).
- `weekStart` = Monday of week containing `today`; `weekEnd` = `weekStart.AddDays(6)`.
- In-week filter: `event.EventDate >= weekStart && event.EventDate <= weekEnd`.

**Rationale**: Spec clarification Q2. ISO-style Mon–Sun. UTC fallback documented in assumptions until venue timezone storage ships.

**Alternatives considered**:
- **Rolling 7-day window** — rejected per clarification.
- **Sunday–Saturday week** — rejected per clarification.

## 6. Financial health DTO monetary fields

**Decision**: `FinancialHealthDto` uses `decimal` properties with `[JsonConverter(typeof(DecimalStringJsonConverter))]` (same pattern as `LedgerSummaryDto`):
- `WeekStart`, `WeekEnd` — ISO date strings (`yyyy-MM-dd`) as `string` (not money).
- `ProjectedNetGross`, `ActualQboDeposits`, `Variance` — money strings in JSON.
- `Variance = ProjectedNetGross - ActualQboDeposits` using `decimal` arithmetic with existing ledger rounding conventions.

**Rationale**: Constitution I (decimal only) and VI (DTO-first OpenAPI). TDD field names preserved for SPLR-76 widget compatibility.

**Alternatives considered**:
- **Pre-serialized string properties on record** — rejected; breaks existing DTO converter pattern.

## 7. Helper placement and testability

**Decision**: Add `DashboardFinancialHealthHelper.cs` (static) with:
- `GetCalendarWeek(DateOnly today) → (weekStart, weekEnd)`
- `ComputeProjectedNetShowRevenue(Event evt) → decimal`
- `ComputeRevenueQboActualTotal(Event evt) → decimal`
- `BuildFinancialHealthDto(IEnumerable<Event> events, DateOnly today) → FinancialHealthDto`

Add `BuildActionCenterDto(IEnumerable<EventCardDto> cards, IEnumerable<Event> events)` or derive action center from cards + event metadata in `DashboardService`.

**Rationale**: Pure functions unit-testable for week math and column selection without Testcontainers; integration tests validate end-to-end API.

**Alternatives considered**:
- **Inline all logic in DashboardService** — rejected; week boundary and status-column rules need focused tests (SC-002, SC-003).

## 8. Test strategy

**Decision**: Extend `DashboardControllerTests.cs` with new cases; add `DashboardFinancialHealthHelperTests.cs` unit tests for week boundaries and column selection:

| Test | Validates |
|------|-----------|
| Action center total matches sum of card unmapped counts | FR-003, SC-006 |
| Action center lists only events with count > 0, sorted | FR-002, FR-004 |
| Financial health includes Mon–Sun in-week events only | FR-005, SC-003 |
| Settled event uses settlement projected; PRE_SHOW uses proforma | FR-006, SC-002 |
| Budget-locked PRE_SHOW still uses proforma | Clarification Q3 |
| Actual = revenue QBO actuals only | FR-007 |
| Variance = projected − actual | FR-008 |
| Empty action center / no in-week events → zero blocks present | FR-013 |
| Existing partition tests unchanged (regression) | FR-014 |

Coverage: ≥80% on `DashboardService`, `DashboardFinancialHealthHelper`, `DashboardDtos`, extended tests. Frontend: `npm run gen:api` only (no new Vitest files — backend-only per SPLR-74).

**Rationale**: Constitution III; unit tests for pure math, integration for HTTP contract.

## 9. Prerequisites

**Decision**: Requires merged spec 031 (`DashboardService`, `GET /dashboard`, `EventCardDto` partitions). No new migration.

**Rationale**: Linear blockedBy SPLR-72; extends existing response shape.
