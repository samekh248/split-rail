# Contract: Block Settlement Endpoints

`BlockSettlementsController` — isolated sub-settlement sheets, preflight, atomic finalize, reopen/adjust, artist rollup. Tablet-first consumers (D11 layouts). Isolation rule: responses never include Master Festival Ledger totals, bucket totals, or other blocks' terms — only the requested block's deal (spec FR-026).

Permissions (D10): sheet read/edit for users with settlement authority scoped by `StageZoneAssignment` (assigned stages only) or org-level financial roles; finalize requires `FinalizeSettlements` (+ stage scope when assignments exist); reopen requires `OverrideSettlements`; deduction entry per `AdjustSettlements` rules (stage managers: predefined types only).

## Settlement sheet

### GET /venues/{venueId}/festivals/{eventId}/blocks/{blockId}/settlement
200 `BlockSettlementSheetResponse`:
```
{ block: { id, title, dayDate, stageName, times, artistName? },
  dealTerms: { dealType, baseGuarantee, backendPercentage, percentBasis,
               capAmount?, floorAmount?, bonusThresholdAmount?, bonusAmount?,
               taxWithholdingPercentage, customFormulaExpression? },
  allocations: [ { bucketName, allocationType, calculatedAmount } ],   // named source per line — no bucket totals
  lineItems:   [ { lineType, label, amount } ],
  computed:    { allocationBasis, grossPayout, deductions, taxWithheld, netPayable },
  settlementStatus, requiresSettlementReview, revisions: [ { revisionNumber, finalizedAt, pdfUrl } ] }
```
All computed values server-calculated by `DealMathEngine` (Constitution I) — the client renders, never computes.

### PUT .../settlement/deal-terms — draft-only edits; 409 when `Finalized` (reopen required); audit-trailed.
### POST .../settlement/line-items / PUT / DELETE — deductions/adjustments per `AdjustSettlements` rules; draft-only outside reopen.

## Preflight

### GET .../settlement/preflight
200 `FinalizePreflightResponse`:
```
{ ready: bool,
  blockers: [ { category: MissingRevenueMapping | MissingExpenseMapping |
                          AllocationConflict | MissingSettlementFields |
                          UnresolvedScheduleChange,
                message, linkTarget } ],
  finalPayable?: money-string }
```
Mirrors spec FR-028 categories with direct link targets. Pure read — never mutates (viewing/saving/previewing must not finalize, spec FR-027).

## Finalize (two-phase atomic — D6)

### POST .../settlement/finalize
Request `FinalizeBlockSettlementRequest`: `{ confirmed: true, expectedNetPayable }` — `expectedNetPayable` guards against finalizing a stale view (409 on mismatch).
- Phase A: preflight re-run, snapshot build, PDF render, archive staging. Phase B: short locked DB transaction — status re-check (`ConcurrencyConflictException` when already finalized), in-SQL bucket over-allocation re-check, finalized write + revision row + audit entry. Phase C: staged-PDF promote + dispatch handoff record.
- 200 `BlockSettlementResultDto` `{ settlementStatus: Finalized, finalizedAt, netPayable, pdfUrl, dispatchOutcome, revisionNumber }`.
- Failure at any step → full rollback, settlement stays `Draft`, 422/409/500 per failure class with `{ failedStep, reason }`, failure logged + audit entry `FinalizeFailed`; retry is safe (idempotent from Draft).
- Offline behavior is client-enforced (connectivity check before enabling the action) — the server contract is simply that no partial state can exist.

## Reopen & adjust

### POST .../settlement/reopen
Request `{ reasonCode, note, acknowledgeDispatched? }` — requires `OverrideSettlements`.
- 409 `DISPATCH_ACKNOWLEDGEMENT_REQUIRED` when the current revision was dispatched and `acknowledgeDispatched` is not true (extra confirmation step, PRD).
- 200: status → `Draft`, `BlockSettlementRevision` written, audit entry with reason; prior values preserved; re-finalization creates the next revision + new PDF.

### POST .../settlement/adjustments
Preferred correction path without full reopen: creates an `Adjustment` line item + audit entry against the finalized settlement's *next* revision context; requires `AdjustSettlements` + `OverrideSettlements` when the settlement is finalized.

## Rollup & assignment surfaces

### GET /venues/{venueId}/festivals/{eventId}/my-blocks
Stage-manager work queue: settlement-bearing blocks on the caller's assigned stages with `settlementStatus`, `requiresSettlementReview`, preflight-ready flags — the tablet home screen.

### GET .../artists/{artistId}/settlement-rollup
`{ appearances: [ { blockId, title, dayDate, stageName, settlementStatus, netPayable? } ], totals }` — artist-level rollup while each block settles independently (spec FR-034); visible to full-financial-visibility users and to scoped users for their stages' subset.

## Error semantics

`SettlementStateException` 422 (state-machine violations: unconfirmed finalize, reopen of non-finalized), `ConcurrencyConflictException` 409, `AllocationConflictException` 409, `AuthorizationException` 403, `NotFoundException` 404 (cross-org 404). Interceptor-level immutability violations surface as 400 `InvalidOperationException` mappings per Constitution V.
