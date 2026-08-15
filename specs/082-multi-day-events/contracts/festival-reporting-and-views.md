# Contract: Festival Reporting Endpoints & Frontend View Interactions

## Reporting — `FestivalReportsController` (D14)

All reads `AsNoTracking` single-query aggregates; every row carries drill-down ids (festival → day → stage → block → settlement → source transaction traceability, spec FR-044). Access: full financial visibility roles; ledger-access audit entries written. All endpoints accept `?category=` and (where meaningful) `?status=` segmentation.

### GET /venues/{venueId}/festivals/{eventId}/reports/pnl
`{ revenue: [ { bucketOrLineLabel, amount, allocated, retained } ], expenses: [ { label, amount, atOverhead, pushedDown } ], net, drill: { dayIds, stageIds } }`

### GET .../reports/days
Per `DayDate`: `{ dayDate, revenueAllocatedToDay, expensesAllocatedToDay, blockCounts { byStatus, byCategory }, settlementCounts { draft, finalized }, blockIds[] }`

### GET .../reports/stages
Per `StageZone`: same shape keyed by stage; includes stage-allocated shared expenses.

### GET .../reports/settlement-status
`{ byStatus: [ { scheduleStatus, settlementStatus, count, blockIds[] } ], canceledLog[], movedLog[], partialCompletionExceptions[], varianceScheduledVsCompleted }`

### GET .../reports/unreconciled
`{ transactions: [ { txId, reviewState, allocationState: Unallocated|Partial|Full|Overhead, remainingAtOverhead } ], totals { unreconciled, partial, full, overhead, pushedDown } }`

### GET .../reports/variance
Scheduled vs. completed programming, allocated vs. settled amounts, per day/stage/category: `{ rows: [ { dimension, scheduled, completed, allocated, settled, variance } ] }`

## Frontend interactions (pages & key components)

### FestivalItineraryPage (US2/US3/US6)
- `TimelineGrid`: CSS grid — time columns (30-min display slots), stage rows, one day at a time with a day switcher (≤3 days). Blocks absolutely positioned; category-styled; status-badged. Filters: day/stage/category/status (client-applied to fetched day payload; near-instant at ≤100 blocks/day, SC-003).
- Drag-and-drop (D11): native HTML5, payload in component state (jsdom-testable, spec-081 pattern); drag-over paints slot validity; same-stage overlap shows inline warning affordance; drop → `PUT blocks/{id}`; 409 → `ConflictDialog` (conflicting block named; actions: pick new time, open existing block, cancel/move) with **no optimistic move** — block stays put until server confirms (confirm-then-refetch).
- `BlockEditorDrawer`: category presets (Music shows load-in/soundcheck/deal fields; Exhibition/Vendor/Experience show description-first lightweight set); two-level validation (creation vs. settlement fields); schedule history panel from `GET blocks/{id}/history`.
- `ViewToggle` (D13): Internal ⇄ Public personal toggle, persisted in localStorage, active view always labeled; public-visibility editing controls render only with `PublishPublicItinerary`.
- Same-artist overlap warnings surface as non-blocking toasts/badges from `warnings[]`.

### FestivalLedgerPage (US4/US7)
- `BucketTable`: buckets with live `totalAllocated`/`remaining`, allocable flag, lock state; over-allocation renders warning state in draft, error state when hard-blocked.
- `AllocationEditor`: per-block allocation lines with named source bucket; rounding-adjustment line surfaced when emitted.
- `SplitEditor`: shared-expense/transaction split builder — method picker (equal/percentage/fixed/manual), multi-target expansion preview, must-reconcile indicator, remainder-at-overhead always visible.
- `TransactionMappingDrawer`: QBO inbox rows with `reviewState` chips; exception rows blocked from settlement-marked splits; side-by-side original-vs-current mapping on review resolution.

### BlockSettlementPage (US5) — tablet-first
- Layout: touch targets ≥44px, single-column financial summary readable at arm's length, portrait + landscape; navigation via `my-blocks` work queue.
- `FinalizePreflightPanel`: grouped blockers with deep links; Finalize button enabled only when `ready` **and** `navigator.onLine` (offline → disabled with connectivity message; finalization never attempted offline).
- Finalize flow: processing state → exactly two terminal outcomes (finalized view with PDF link / failure banner naming the failed step, settlement still Draft, retry available).
- `ReopenDialog`: reason code + note required; dispatched-revision acknowledgement checkbox when applicable.
- `ArtistRollupPanel`: linked appearances with per-block settlement status.

### FestivalReportsPage (US8)
- Report cards per layer with segmentation controls; every aggregate row is a drill-down link (day → filtered itinerary; stage → stage rollup; block → block/settlement; transaction → mapping drawer).

### Route & workspace wiring (US1)
- `EventWorkspacePage`: "Convert to festival" affordance (standard events, pre-settlement only); festival events surface links to Itinerary / Festival Ledger / Reports.
- `App.tsx` routes: `/festivals/{eventId}/itinerary`, `/festivals/{eventId}/ledger`, `/festivals/{eventId}/blocks/{blockId}/settlement`, `/festivals/{eventId}/reports` (venue-scoped like existing event routes).
- Standard-event flows render zero festival concepts (`EventType.Standard` default — spec SC-007).

## Accessibility & iconography

Keyboard alternative for drag-and-drop: block editor drawer's day/stage/time fields provide full reassignment parity. Icons Font Awesome Free per-icon imports only (Constitution IX). Status/category distinctions never rely on color alone (badge text + icon).
