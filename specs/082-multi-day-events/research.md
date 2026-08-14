# Phase 0 Research: Multi-Day Events (Festivals)

All Technical Context items resolved — no `NEEDS CLARIFICATION` markers remain. Decisions grounded in the current `apps/api`/`apps/web` implementation on branch `082-multi-day-events` (`Event.cs`, `EventArtist.cs`, `FinancialLineItem.cs`, `DealMathEngine.cs`, `SettlementService.cs`, `UnmappedQboTransaction.cs`, `BookingConflictService.cs`, spec-041 frozen-mutation interceptor, spec-081 research) and the Linear PRD ([Multi-day events (festivals) PRD](https://linear.app/audiodex/document/multi-day-events-festivals-prd-65aa07c2b03c)).

## D1. Festival Wrapper = existing `Event`, extended — not a new aggregate, not blocks-as-child-Events

**Decision**: Model the Festival Wrapper as the existing `Event` entity with two new columns: `EventType` (enum `Standard | Festival`, default `Standard`) and `EndDate` (`DateOnly?`, required and > `EventDate` for festivals, max 3 calendar days inclusive). All new festival tables foreign-key to the wrapper `Event`.

**Rationale**: The wrapper needs exactly what `Event` already has: org/venue scoping (Constitution II) via `Venue`, the master financial matrix (`FinancialLineItem` rows in REVENUE/EXPENSES blocks = PRD Blocks 1–2), the QBO master tag (`Event.QboTagName` — the PRD's single-tag strategy is literally the existing per-event tag model), booking-calendar presence (spec 073), dashboard aggregation, and the `EventStatus` Settled/Reconciled freeze machinery for festival-level closeout (Constitution V). Reusing it means standard events are untouched (`Standard` default satisfies the PRD's progressive-enhancement coexistence model) and every existing integration keeps working.

**Alternatives considered**:
- **New `Festival` root aggregate** — rejected: duplicates org-scoping, ledger, QBO-tag, calendar, freeze, and dashboard plumbing; every existing surface (calendar, dashboards, QBO sync, settlement archive pathing) would need festival-awareness retrofits. Highest-cost, highest-risk option for zero behavioral benefit.
- **Programming Blocks as child `Event` rows** — rejected: 250 blocks/festival would flood the booking calendar, dashboards, and event lists; spec-073 conflict rules (one Confirmed booking per venue-date) hard-conflict with many same-day blocks; per-event QBO tags contradict the single-master-tag strategy. Excluding child events from all those surfaces would touch more code than new purpose-built tables.

## D2. Days are derived, not a table

**Decision**: No `FestivalDay` table. A block carries `DayDate` (`DateOnly`); the festival's Days are the inclusive `EventDate..EndDate` range. Validation: `DayDate` must fall within the range; shrinking the range while blocks exist on removed dates returns 409 with the affected block ids (spec edge case — user must move/cancel them first).

**Rationale**: The PRD requires Days to be "generated or represented"; a date range plus a constrained `DayDate` column represents them fully with nothing to keep in sync, no orphan-day states, and trivial day-level grouping (`GROUP BY DayDate`) for itinerary and reports. The PRD attaches no day-specific metadata in v1.

**Alternatives considered**: A materialized `festival_days` table — rejected: adds create/delete synchronization on every date-range edit and a join on every query, for zero v1 fields. If a future release adds per-day metadata (gate times, day sponsors), a table can be introduced then without breaking `DayDate`.

## D3. `StageZone` as a per-festival table with an auto-created default

**Decision**: New `StageZone` (Id, EventId→wrapper, Name, SortOrder, xmin). Creating a festival auto-creates one stage named "Main Stage". Unique index on (EventId, Name). Deleting the last stage is blocked; deleting a stage with blocks requires moving/canceling them first (mirrors the region-deletion resolution pattern from spec 081).

**Rationale**: PRD: stages are per-event records, not reusable sub-locations; single-stage festivals must "feel effortless" — the auto-created default means users never touch stage management until a second stage is needed. The unique name constraint implements "distinct name required when more than one exists" (the auto-name satisfies it for one).

**Alternatives considered**: Reusable venue-level sub-locations shared across events — explicitly deferred by the PRD to a future release; rejected for v1.

## D4. `ProgrammingBlock` schema: lean structured fields + status enum + audit side-tables

**Decision**: `ProgrammingBlock` (Id, EventId→wrapper, StageZoneId, FestivalArtistId?, DayDate, Title, StartTime/EndTime (`TimeOnly`), Category enum (`Music | Exhibition | Vendor | Experience`), ScheduleStatus enum (`Scheduled | Delayed | PartiallyCompleted | Canceled` — a *move* is a day/stage reassignment recorded in history, not a terminal status), RequiresSettlement, IsPubliclyVisible, Description (the PRD's "primary container" for logistics), LoadInTime?/SoundcheckTime? (music-preset fields), settlement fields (D6), xmin). Two audit side-tables: `FestivalAuditEntry` rows capture schedule changes (prior/new times, day, stage) and status changes (prior/new status) with user, timestamp, optional reason.

**Rationale**: PRD mandates lean creation-required fields (title, day, stage, start, end, category, settlement flag) with everything else optional, and description-first metadata for non-music categories. Category drives *presets and visibility*, not schema — one table, no per-category subtypes (PRD: categories must not become separate product models). Treating "moved" as a recorded reassignment rather than a status avoids a block being both "on stage B" and "status=Moved" — the history table answers "was it moved?" while the current row answers "where is it now?", and conflict validation naturally frees the old slot (spec US3 scenario 5).

**Alternatives considered**: JSONB metadata column for category fields — rejected: only two structured optional fields exist in v1 (load-in, soundcheck); explicit nullable columns keep EF/LINQ/reporting simple and typed. Per-category subclass tables (TPT/TPH) — rejected: PRD explicitly warns against category-specific models.

## D5. Artist identity: per-festival `FestivalArtist`, not a global directory

**Decision**: New `FestivalArtist` (Id, EventId→wrapper, Name; unique per (EventId, Name)). Music blocks optionally link one. Artist rollup, overlap warnings, and "copy deal terms across appearances" operate on `FestivalArtistId` within one festival.

**Rationale**: The platform has no global artist entity today — `EventArtist.ArtistName` is a per-event string. The PRD requires "one artist identity with many Programming Blocks" *within the event context*; a per-festival identity delivers that (rollups, linked appearances, overlap warnings) without inventing an org-wide artist directory, dedup UX, and migration that the PRD never asked for.

**Alternatives considered**: Global `Artist` entity — rejected as scope creep with real product questions (dedup, merge, cross-org privacy) unanswered in the PRD. Raw name-string matching across blocks — rejected: typo-fragile, makes rollups and warnings unreliable.

## D6. Sub-settlements live on the block + line items; finalization reuses the two-phase atomic pipeline

**Decision**: Settlement state embeds in `ProgrammingBlock`: `SettlementStatus` (`NotRequired | Draft | Finalized`), DealType (existing enum) + `BaseGuarantee`, `BackendPercentage`, `PercentBasis` (`Gross | Net`), `CapAmount?`, `FloorAmount?`, `BonusThresholdAmount?`/`BonusAmount?`, `TaxWithholdingPercentage`, `CustomFormulaExpression?`, `FinalizedAt/FinalizedByUserId`, `CalculatedNetPayout`, `SettlementPdfUrl`, `FinalizedSnapshotJson`. `BlockSettlementLineItem` rows hold deductions and explicit adjustment/rounding lines. `BlockSettlementService.FinalizeAsync` copies the proven `SettlementService.FinalizeAsync` shape: **Phase A** (validate preflight, build snapshot, render PDF, stage to archive store — no DB transaction) → **Phase B** (short DB transaction: reload with lock, re-validate status + *re-check bucket over-allocation in SQL*, write finalized state + audit entry) → **Phase C** (promote staged PDF, record dispatch outcome). Any failure rolls the whole thing back to Draft. Reopen (elevated permission) writes a `BlockSettlementRevision` snapshot row + audit entry with reason code/note, returns status to Draft, and re-finalization produces a new revision — history is never overwritten. The spec-041 EF `SaveChanges` interceptor is extended: mutations to finalized block-settlement fields/line items outside an authorized reopen context throw.

**Rationale**: The PRD's all-or-nothing finalization (validation + calculation + record + audit + PDF + dispatch succeed or fail together, exactly two outcomes) is precisely what the existing two-phase pipeline was built for (spec 043) — reuse eliminates the highest-risk new code in the feature. Embedding settlement state on the block (rather than a separate settlement table) mirrors how `Event` itself carries settlement fields, keeping the freeze-guard surface identical in shape to what the interceptor already protects. Re-checking over-allocation inside Phase B's transaction closes the check-then-act race between two stage managers finalizing against the same bucket concurrently.

**Alternatives considered**: Separate `BlockSettlement` table 1:1 with blocks — rejected: an extra join everywhere for no modeling gain; the platform precedent (settlement fields on `Event`) argues for embedding. Client-orchestrated multi-call finalize — rejected: cannot be atomic (PRD prohibition on partial finalization).

## D7. Deal math: extend `DealMathEngine`; deterministic penny-remainder rule

**Decision**: Keep `DealMathEngine` the single money-math authority. Add: `CalculateBlockPayout(...)` computing gross artist payout from the block's allocation basis (sum of its `RevenueAllocation.CalculatedAmount`s, gross- or net-of-deductions per `PercentBasis`) through guarantee-vs-split, bonus threshold, cap, then floor, then existing `ApplyTaxAndFloor`; and `AllocatePercentage(bucketAmount, participants[])` that computes per-participant shares at full decimal precision, rounds each with `RoundMoney` (AwayFromZero, 2dp), and assigns any penny remainder to the largest calculated share — or emits an explicit `RoundingAdjustment` line item when the caller requests visibility. Rounding happens only at final payable/allocation line level; intermediate math stays unrounded.

**Rationale**: Constitution I requires `decimal` + `AwayFromZero`; the PRD's "round half up to the nearest cent" is identical to away-from-zero for the non-negative amounts settlements handle, so one primitive serves both. A single deterministic remainder rule (PRD's stated preference) makes concurrent recalculations reproducible and testable to the cent.

**Alternatives considered**: Largest-remainder (Hamilton) apportionment — rejected: the PRD names its preferred rule explicitly; Hamilton adds subtlety without a requirement. Banker's rounding — prohibited by Constitution I.

## D8. Revenue buckets as first-class rows; balances computed, not denormalized

**Decision**: `RevenueBucket` (Id, EventId→wrapper, Name, IsAllocable (default **false**), Amount `decimal`, LinkedLineItemId? → master-ledger `FinancialLineItem` for traceability, LockedAt?/LockedByUserId?, xmin). `RevenueAllocation` (Id, RevenueBucketId, ProgrammingBlockId, AllocationType (`FixedAmount | PercentOfBucket`), Percentage?/Amount?, CalculatedAmount, xmin). Total-allocated and remaining balances are `SUM` projections (`AsNoTracking`), never stored columns; writes validate remaining ≥ 0 (warning state allowed in draft, hard 409 on >100% without override permission) and finalize re-checks in-transaction (D6). Finalizing any settlement that references a bucket sets `LockedAt`; locked buckets reject Amount/IsAllocable edits without the override permission.

**Rationale**: PRD: allocation is opt-in per bucket ("not allocable by default"), balances must be real-time and conflict-visible, definitions lock before final settlement. Computing balances avoids denormalization drift; at v1 scale (dozens of allocations per bucket) a SUM is trivial. `LinkedLineItemId` keeps "every allocation traceable to a named source bucket" and buckets traceable to master-ledger rows without forcing every bucket to be ledger-backed (e.g., sponsorship entered directly).

**Alternatives considered**: `IsAllocable` column directly on `FinancialLineItem` — rejected: pollutes a Constitution-V-guarded core table with festival-only semantics and couples bucket identity to ledger row labels; a bucket is a financial concept (with lock state and balances) that merely *may* reference a ledger row.

## D9. One `ExpenseAllocation` table for both master-ledger expense splits and imported QBO transaction splits

**Decision**: `ExpenseAllocation` (Id, EventId→wrapper, exactly one of SourceLineItemId | SourceQboTransactionId, TargetType (`Overhead | Day | Stage | Block`), TargetDayDate?/TargetStageZoneId?/TargetBlockId?, Method (`Equal | Percentage | FixedAmount | ManualLine`), Percentage?/Amount, CalculatedAmount, CountsTowardSettlement (bool — an allocation to a block surfaces as a settlement deduction only when true), CreatedByUserId/CreatedAt, xmin). Sum of a source's allocation lines must not exceed the source amount; the unallocated remainder *is* festival overhead (implicit, always visible in projections — overhead is a valid final state, per PRD). `UnmappedQboTransaction` gains `ReviewState` (`None | Untagged | MismatchedTag | ChangedAfterImport | StaleMapping | ReclassificationRequired`); non-`None` states are excluded from settlement-impacting allocation until a financial-authority user resolves them, and resolution writes a `FestivalAuditEntry` preserving prior state + reason.

**Rationale**: Splitting a bookkeeping expense line and splitting an imported bank transaction are the same operation with different sources (PRD describes identical split methods and traceability rules for both) — one table means one balance validator, one drill-down query shape, one audit path. The existing `UnmappedQboTransaction` inbox already lands master-tagged transactions on the wrapper event via the current per-event tag sync, so festival transaction import needs *no new QBO plumbing* — only the mapping targets grow (Constitution IV untouched).

**Alternatives considered**: Two parallel tables (`LedgerExpenseSplit`, `TransactionSplit`) — rejected: duplicated validation/reporting logic and two drill-down paths for what reports must present uniformly ("expenses pushed down to Day/Stage/block" regardless of source). Mapping QBO detail via more QBO tags — prohibited by the PRD (single master tag) and pointless under a read-only integration.

## D10. Permissions: new flags on the existing role model + `StageZoneAssignment` for stage scoping

**Decision**: Extend `OrganizationRole` with six festival permission flags: `ManageFestivalSchedule`, `ManageAllocations`, `AdjustSettlements`, `FinalizeSettlements`, `OverrideSettlements` (reopen/over-allocation override/locked-bucket edits), `PublishPublicItinerary`. New `StageZoneAssignment` (UserId, StageZoneId) scopes stage managers: a user with `FinalizeSettlements` but with assignments present is limited to assigned stages' blocks (both for finalize actions and scoped settlement visibility); users with full financial authority (`ManageAllocations` + no assignment restriction) see the Master Festival Ledger. Master-ledger reads, settlement views, and external dispatch actions write `FestivalAuditEntry` access records. External parties get no accounts/visibility in v1 — their artifact is the dispatched PDF (existing dispatch model).

**Rationale**: The PRD demands five *distinct* permission layers with no implicit grants — discrete flags on the existing role system deliver that without a new RBAC engine, matching how the platform already gates (`ManagePermissions`, venue scopes via `UserVenueScope`). Stage-level scoping is the only new scoping dimension and gets the narrowest possible table.

**Alternatives considered**: A generic resource/action policy engine — rejected: massive scope for needs six flags + one assignment table cover. Reusing `UserVenueScope` semantics for stages — rejected: stages are per-event and short-lived; a dedicated assignment table keeps venue scoping untouched.

## D11. Multi-track timeline: hand-built CSS grid + native HTML5 drag-and-drop

**Decision**: `TimelineGrid` renders a CSS grid — columns = time slots (30-min granularity for display; times themselves stay minute-precise), rows = stages, one day visible at a time with a day switcher (3 days max). Blocks are absolutely positioned spans within their stage row. Drag uses native HTML5 DnD with the dragged block id/original position held in React state (not `dataTransfer`) exactly per spec-081 research D1/D2; during drag, client-side overlap detection paints target validity and a warning affordance; drop issues the block-update mutation; the server's conflict validation remains authoritative and a 409 leaves the block in place with the conflict dialog (confirm-then-refetch, no optimistic move — spec-081 D4 pattern).

**Rationale**: Repo convention is zero interaction-library dependencies with hand-built widgets, already validated for drag-and-drop in spec 081 (including the jsdom/`DataTransfer` testing rationale). A time×stage grid at v1 scale (≤8 stages × ≤100 blocks/day) renders comfortably without virtualization. Server-authoritative conflicts keep multi-user consistency (two schedulers editing concurrently) independent of client state.

**Alternatives considered**: `@dnd-kit`/`react-dnd`/FullCalendar-style scheduler libraries — rejected: same reasoning as 081 D1 plus licensing/bundle weight for scheduler suites; the PRD's interaction set (drag placement, inline conflict warnings) is within native-API reach. Continuous multi-day horizontal scroll — rejected for v1: a day switcher is simpler and matches "up to 3 Days" optimization.

## D12. Conflict validation server-side in `ProgrammingBlockService`

**Decision**: On block create/update (times, day, stage, or status→active transitions), a single indexed overlap query — same wrapper, same `StageZoneId`, same `DayDate`, active statuses only (`Scheduled`, `Delayed`), `StartTime < other.EndTime AND EndTime > other.StartTime` — rejects with `BlockConflictException` (409) carrying the conflicting block id/title so the UI can offer the PRD's resolution paths. Same-`FestivalArtistId` overlap across stages returns a non-blocking `warnings[]` field on the success response. Composite index on (EventId, StageZoneId, DayDate).

**Rationale**: The PRD requires save-blocking same-stage conflicts, non-blocking artist warnings, and canceled/moved blocks freeing their slots — all natural predicates of one query against current rows. Mirrors the platform's existing `BookingConflictService` server-authority pattern.

**Alternatives considered**: DB exclusion constraint (Postgres `EXCLUDE USING gist` on time ranges) — attractive but rejected for v1: EF Core migration ergonomics are poor, and the service check must exist anyway to produce the friendly 409 payload; at ≤100 blocks/day the race window a constraint would close is negligible and the xmin concurrency token already guards lost updates.

## D13. Internal vs. public itinerary: one endpoint, server-filtered; toggle is client state

**Decision**: `GET .../itinerary?view=internal|public`. `public` returns only `IsPubliclyVisible` blocks with the public field subset (title, day, stage, times, category); `internal` (default) requires itinerary access and returns everything. The toggle is per-user client state (localStorage) — a personal display choice per the PRD. Mutating `IsPubliclyVisible` or public-field content requires `PublishPublicItinerary` and writes audit entries. A future unauthenticated public surface would consume the same `public` shape but is out of scope (spec Assumptions).

**Rationale**: Server-side filtering guarantees internal fields can never leak into a public rendering path regardless of client bugs; one endpoint keeps the contract surface small; the permission split matches the PRD exactly (view-switching free for internal users, publishing separately gated).

**Alternatives considered**: Client-side filtering of one full payload — rejected: internal logistics would ship to any user who can open devtools, violating the PRD's audience separation for exactly the data it deems sensitive.

## D14. Reporting as direct `AsNoTracking` aggregate projections

**Decision**: `FestivalReportService` exposes the six report layers (festival P&L, day summaries, stage rollups, settlement status, unreconciled expenses, variance) as single-query LINQ aggregates (`GROUP BY DayDate` / `StageZoneId` / `Category` / statuses) with `.AsNoTracking()`, each row carrying drill-down ids so the UI can navigate festival → day → stage → block → settlement → source transaction. No caching, no materialized views.

**Rationale**: v1 scale (≤250 blocks, hundreds of allocation lines) is trivially within single-query Postgres territory; Constitution VII mandates the no-tracking/eager pattern these queries follow. Drill-down ids in every aggregate row are what make the PRD's "without losing traceability" requirement structural instead of aspirational.

**Alternatives considered**: Pre-computed report tables refreshed on write — rejected: denormalization drift risk and write-path complexity for a scale that doesn't need it; revisit only if future releases raise scale targets.

## D15. Test strategy

**Decision**: Four layers:
1. **Backend unit** (`apps/api.tests/Unit`): `DealMathEngine` extensions (cap/floor/bonus ordering, percent-basis, penny-remainder determinism — property-style cases summing allocations to exactly the bucket amount), allocation validators.
2. **Backend integration** (WebApplicationFactory + Testcontainers): per-controller suites — structure CRUD + 3-day cap + stage rules; block conflicts (blocking same-stage, allowed cross-stage, canceled/moved freeing slots, artist warnings); bucket/allocation balance + override + lock; two-phase finalize (success, injected PDF-render failure, injected archive failure, concurrent finalize vs. over-allocation race, offline≠server concern but connectivity-required is client-checked + finalize idempotency), reopen/revision/interceptor guard; QBO split balances + ReviewState exclusion; report shapes; **cross-org denial for every endpoint** (Constitution II).
3. **Frontend** (Vitest + RTL): timeline render/drag (state-held payload per 081 pattern), conflict dialog flows, preflight blocker grouping + links, bucket/split editors with live balances, view toggle + publish gating, tablet-layout settlement page assertions, report drill-down wiring.
4. **Playwright E2E** (`tests/`): multi-user permission tiers (stage manager scoped finalize vs. finance master-ledger access vs. itinerary-only user), publish-permission enforcement, and festival tenant isolation — this feature squarely triggers Constitution III's multi-user/E2E mandate.

**Rationale**: Matches Constitution III per stack; concentrates integration depth on the two highest-risk areas (atomic finalize, allocation races) identified in D6/D8.

**Alternatives considered**: None — established per-feature pattern, scaled up to this feature's risk profile.
