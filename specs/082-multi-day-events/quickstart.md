# Quickstart & Validation Guide: Multi-Day Events (Festivals)

How to validate the festival module end-to-end. References [plan.md](./plan.md), [data-model.md](./data-model.md), and the four contract documents in [contracts/](./contracts/). Delivery is story-by-story (US1→US8) — each section below is independently checkable as its slice lands.

## Prerequisites

- Node 22 + `npm install` in `apps/web`; .NET 8 SDK for `apps/api`; Docker for Testcontainers
- Branch `082-multi-day-events`
- EF migration applied (`task db:migrate` or the api's migration-on-startup dev flow)
- A test organization with one venue; users covering the permission tiers: org admin/finance (`ManageAllocations` + `FinalizeSettlements` + `OverrideSettlements`), a stage manager (`FinalizeSettlements` only + a `StageZoneAssignment`), a scheduler (`ManageFestivalSchedule` only), and an itinerary-only user

## Run dev environment

```bash
task dev   # or the individual cloudsql-proxy / api / web tasks
```

After backend DTO changes: `dotnet build` then `npm run gen:api` in `apps/web` (Constitution VI — never hand-edit `generated-api.ts`).

## Automated tests (primary gate)

```bash
# Backend
cd apps/api.tests
dotnet test --filter "FullyQualifiedName~Festival"          # structure/financials/settlement/report suites
dotnet test --filter "FullyQualifiedName~DealMathEngine"    # cap/floor/bonus/penny-remainder units

# Frontend
cd apps/web
npm run test -- tests/pages/FestivalItineraryPage.test.tsx tests/pages/FestivalLedgerPage.test.tsx \
  tests/pages/BlockSettlementPage.test.tsx tests/pages/FestivalReportsPage.test.tsx tests/components/festival
npm run test:coverage
npm run build

# E2E (multi-user permission tiers + tenant isolation)
npx playwright test festival
```

**Expected**: all suites pass; ≥80% line/branch coverage per stack; builds clean. Integration suites must include the injected PDF/archive failure rollback cases and a cross-org 404 case per endpoint.

### Validation status (T185, 2026-08-14)

| Area | Validated | Notes |
|------|-----------|-------|
| Backend festival integration + unit suites | Automated | `dotnet test --filter FullyQualifiedName~Festival` and DealMathEngine units pass in CI/local |
| Frontend festival Vitest suites | Automated | Page + component tests under `tests/pages/` and `tests/components/festival/` |
| Hex budget / theme gate | Automated | `npm run test:coverage` includes `tests/theme/hexBudget.test.ts` |
| Booking calendar single placement (regression) | Automated | `BookingCalendarPage.test.tsx` — one `CalendarPlacementDto` per festival event |
| Playwright permission tiers | Spec relocated | `tests/e2e/specs/festival/festival-permissions.spec.ts` — requires `npx playwright install` + live API |
| Playwright tenant isolation | Spec relocated | `tests/e2e/specs/festival/festival-tenant-isolation.spec.ts` — requires `npx playwright install` + live API |
| Manual US1–US8 checklist below | Pending full stack | Needs `task dev`, seeded users for each permission tier, and tablet viewport for US5 |
| Tablet settlement pass (US5) | Pending full stack | Run Block Settlement finalize/reopen on a tablet viewport after dev env is up |

Playwright discovery: `cd tests/e2e && npx playwright test specs/festival --list`

---

## Manual validation checklist

### US1 — Festival setup & progressive enhancement
1. Create a standard event; confirm zero festival concepts appear anywhere in its flow.
2. Create a festival (name + 3-day range); confirm 3 days render and a default "Main Stage" exists.
3. Attempt a 4-day range → blocked with a clear message. End before start → blocked.
4. Convert the standard event to a festival; confirm title/date/ledger carried over.
5. Add a second stage; confirm duplicate names rejected; confirm the wrapper's QBO master tag is visible.
6. Shrink the range with blocks on the removed day → 409 listing affected blocks; move/cancel them; retry succeeds.

### US2 — Programming blocks & categories
1. Create a Music block: only title/day/stage/times/category/settlement flag required; load-in/soundcheck/deal fields visible.
2. Create Vendor, Exhibition, Experience blocks: description-first lightweight fields; no deal math visible until settlement explicitly enabled.
3. Create two blocks for the same artist (shared `FestivalArtist`); confirm linked appearances surface together and deal-term copy works across them.

### US3 — Timeline & conflicts
1. Timeline shows time on X, stages on Y; blocks positioned correctly; day switcher works.
2. Overlap two blocks on different stages → both save. Same stage → save blocked, conflicting block named, resolution options offered; drag shows the warning during hover; nothing moves optimistically.
3. Cancel a conflicting block → slot frees. Move a block to another stage → old slot frees.
4. Reschedule a block → history panel shows prior/new times, user, timestamp.
5. Status changes (Delayed / PartiallyCompleted / Canceled) write audit entries; canceling after settlement work started flags review-required.
6. Same artist overlapping across stages → warning (non-blocking).
7. Filters (day/stage/category/status) respond near-instant at seeded scale (250 blocks — SC-003).

### US4 — Master ledger & allocation
1. Create buckets; confirm `IsAllocable` defaults **off** and only flagged buckets accept allocations.
2. Allocate 60% + 30% of a bucket to two blocks; balances update live; add 20% more → draft warning; attempt finalize → blocked.
3. Three-way percentage split that produces a penny variance → remainder lands on the largest share or an explicit rounding line (verify to the cent).
4. Shared expense split across a day's blocks (equal + percentage + manual) → must reconcile; remainder-at-overhead always visible.
5. Finalize a settlement referencing a bucket → bucket locks; amount edits then require override permission.

### US5 — Block settlement & atomic finalize (run on a tablet/tablet viewport)
1. Settlement sheet shows only that block's deal — no master-ledger totals anywhere in the payload or UI.
2. Preflight with missing mapping → grouped blockers with working deep links; draft save still allowed; viewing/previewing never finalizes.
3. Finalize happy path → PDF link, dispatch outcome, finalized-by/at recorded; expense rolled up to master ledger; exactly-two-outcomes UX.
4. Failure injection (test env: archive store failure) → full rollback to Draft, failed step named, retry succeeds.
5. Go offline (devtools) → Finalize disabled with connectivity message.
6. Reopen (finance user): reason code + note required; dispatched revision demands acknowledgement; new revision created, history intact; stage manager cannot reopen (403).
7. Artist rollup shows one appearance settled, the other still draft.

### US6 — Internal/public views
1. Any itinerary user toggles Internal ⇄ Public; active view clearly labeled; toggle is personal (doesn't affect others).
2. Scheduler without publish permission cannot change public visibility (403); manager can; change is audit-logged.
3. Public view contains only publicly-visible blocks and public fields — verify the network payload, not just the UI (D13).

### US7 — QBO mapping
1. Seed master-tagged transactions (FakeQboTransactionClient); confirm they land in the festival's inbox with original references.
2. Map one fully to overhead; split another 50/30/20 across block/stage/overhead; totals can never exceed the original amount; remainder visible.
3. Trace block → source transactions and transaction → allocations (both directions).
4. Import a mismatched-tag transaction → review-required state, excluded from settlement-marked splits until resolved; resolution preserves original state side-by-side with reason.

### US8 — Reporting
1. P&L, day summaries, stage rollups, settlement status, unreconciled, and variance reports all render from seeded data.
2. Segment by category and status; drill from P&L → day → stage → block → settlement → source transaction without dead ends.

### Permissions & isolation (Playwright-covered; spot-check manually)
1. Stage manager sees/finalizes only assigned stages' blocks; no Master Festival Ledger access.
2. Itinerary-only user sees no financial surfaces.
3. Second organization cannot reach any festival endpoint of the first (404s).

---

## Regression checks

- Standard event creation/workspace/ledger/settlement flows unchanged (SC-007 — zero new steps or concepts).
- Booking calendar (spec 073) renders the festival wrapper as a single placement; block counts do not flood the calendar or dashboards.
- Existing single-event QBO tag sync, ledger grid, and settlement finalize/reversal flows unaffected.
- Existing role management screens still function with the new permission flags rendered.

## Related specs

- Spec: [spec.md](./spec.md) · Plan: [plan.md](./plan.md) · Research: [research.md](./research.md)
