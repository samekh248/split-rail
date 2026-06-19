# Research: Financial Health Widget and Recent Events Bottleneck Filter

**Feature**: `036-financial-health-bottleneck-filter` | **Date**: 2026-06-19

## 1. Financial health data source

**Decision**: Read `financialHealth` from `useDashboard(venueId).data` for single-venue overview only; do not merge or display in `useAllVenuesDashboard`.

**Rationale**: `FinancialHealthDto` is venue-scoped with Mon–Sun week boundaries (034). All-venues mode parallel-fetches per venue but spec FR-004 explicitly hides the widget. No client merge needed (unlike action center in 035).

**Alternatives considered**:
- Sum financial health across venues in all-venues mode — rejected per spec FR-004.
- New aggregate endpoint — rejected; out of scope.

## 2. Financial health widget placement

**Decision**: Render below `UnassignedTransactionsBanner` (when present) and above `dashboard-overview__zones`; also render in the branch where venue has dashboard data but zero events (FR-001 + User Story 1 scenario 3).

**Rationale**: Matches User Story 4 acceptance scenario 1 and 035 banner placement pattern. Zero-event venues may still have a financial health summary with zero totals.

**Alternatives considered**:
- Inside tonight hero zone — rejected; weekly rollup is venue-wide, not tonight-specific.
- Hide when `hasAnyDashboardEvents` is false — rejected; contradicts FR-001 when summary exists.

## 3. Money formatting

**Decision**: Use existing `formatMoney` from `@/lib/money` for `projectedNetGross`, `actualQboDeposits`, and `variance`.

**Rationale**: Constitution I compliance (decimal strings, no JS float math). Consistent with ledger grid and unassigned-transactions drawer (035).

**Alternatives considered**:
- Raw string display — rejected; poor UX and inconsistent with dashboard patterns.
- `Intl.NumberFormat` on parsed floats — rejected; violates money helper convention.

## 4. Week date display

**Decision**: Format `weekStart` / `weekEnd` ISO dates (`yyyy-MM-dd`) with `toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })` using local date parts (same pattern as `EventCard.formatEventDate`).

**Rationale**: Human-readable range label (e.g., "Jun 16 – Jun 22, 2026") without timezone drift from `Date` parsing.

**Alternatives considered**:
- Raw ISO strings — rejected; not operator-friendly.
- Venue timezone conversion on client — rejected; server already defines week boundaries in 034; client displays provided dates.

## 5. Bottleneck filter interaction model

**Decision**: Toggle chip/button in Recent Events section header (`BottleneckFilter.tsx`); client-side filter over loaded `recentEvents` partition; default inactive; reset on `venueScopeKey` change.

**Rationale**: Spec FR-005/FR-007/FR-009; no server round-trip (edge case: immediate toggle). Matches "Needs attention" chip language from Linear SPLR-76.

**Alternatives considered**:
- Server-side filtered partition — rejected; unnecessary API change; recent list already loaded.
- Global filter across all zones — rejected per FR-010.

## 6. Bottleneck alert derivation for filter

**Decision**: Shared pure helper `eventHasBottleneckAlerts(event: EventCardDto): boolean` reusing `deriveBottleneckAlertsFromSummary` + `mergeBottleneckAlerts` + `deriveBottleneckAlerts` (same merge path as `EventCard`).

**Rationale**: FR-006 requires identical rules to event cards; single function prevents filter/card drift.

**Alternatives considered**:
- Filter on `unmappedCount > 0` only — rejected; too narrow; ignores sync and variance bottlenecks.
- Server `bottleneckAlerts[]` on DTO — rejected; not on `EventCardDto` today (032 research).

## 7. Filtered empty state copy

**Decision**: When filter active and zero matches, show zone empty message `"No events need attention"` (spec User Story 2 scenario 3).

**Rationale**: Distinguishes from default `"No recent events"` when partition is non-empty but all events filtered out.

## 8. Variance badge on SETTLED events

**Decision**: No status gate on variance badge — keep `showVariance` when `hasVarianceConcern === true` (EventCardDto) regardless of `status`; add explicit Vitest cases for `SETTLED` + `hasVarianceConcern: true` and `SETTLED` + false control.

**Rationale**: Backend `LedgerVarianceHelper.HasVarianceConcern` is status-agnostic; badge already uses `hasVarianceConcern`. SPLR-76 risk mitigation is test/documentation coverage, not a new status branch. Audit confirms no RECONCILED-only gating in current `EventCard.tsx`.

**Alternatives considered**:
- Show badge for all SETTLED events via `deriveBottleneckAlerts` VARIANCE_REVIEW chip only — rejected; would false-positive every settled show.
- Backend change to recompute — rejected; backend already correct per 031/034.

## 9. Backend scope

**Decision**: No backend changes.

**Rationale**: `financialHealth` block and `hasVarianceConcern` on `EventCardDto` exist (034/031). Feature is frontend widgets + filter + tests.

## 10. Icons (Constitution IX)

**Decision**: Financial health section uses `faChartLine` or `faScaleBalanced` for header icon; bottleneck filter chip uses `faFilter` when inactive and `faFilterCircleXmark` or filled variant when active — pick one pair from free-solid set, tree-shaken per icon.

**Rationale**: Constitution IX; matches banner FA pattern from 035.
