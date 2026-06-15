# Contract: E2E Suites (scenario → assertion)

Playwright specs under `tests/e2e/specs/`. Each maps spec acceptance scenarios + functional requirements to concrete browser-driven assertions. All suites run against the ephemeral preview URL, across the `chromium|firefox|webkit|mobile` projects, with `retries: 2`.

Every suite is independently runnable (per US "Independent Test") and consumes the deterministic seed dataset (`fixtures/seed.ts`) and sentinel constants.

---

## Suite A — Cross-Tenant Isolation (US1, P1) → FR-003/004/005, SC-001

`specs/isolation/*.spec.ts`

| # | Scenario | Driver | Assertion |
|---|----------|--------|-----------|
| A1 | Org A admin loads/requests Org B event & venue by B's IDs (direct nav) | two parallel authenticated contexts | response `403`/`404`; deep body scan finds **zero** Org-B sentinels (US1#1/#3, FR-004) |
| A2 | Org A replays intercepted API requests with identifiers rewritten to B's IDs | capture A request → swap IDs → replay under A auth | every replay denied; no foreign data returned (FR-004, D9) |
| A3 | Venue-scoped user accesses out-of-scope venue | scoped-user context | denied; no out-of-scope venue data exposed (US1#2, FR-005) |
| A4 | Distinguish legitimate not-found from empty-success leak | request unknown vs foreign ID | foreign-ID attempts return deny status, never empty-`200` carrying foreign rows (edge case) |
| A5 | Shared cache/token isolation between parallel sessions | two contexts, overlapping activity | no leakage of B state into A context (edge case) |

**Invariant**: 100% of cross-org attempts denied, `foreignDataLeaked == false` everywhere (SC-001).

---

## Suite B — Full Lifecycle State Machine (US2, P1) → FR-006..010, SC-002

`specs/lifecycle/full-lifecycle.spec.ts` (signature step runs under the touch-enabled mobile project)

| # | Step | Driver | Assertion |
|---|------|--------|-----------|
| B1 | Pre-show planning | open seeded `PreShow` event | planning/proforma fields editable; settlement fields **not** editable (US2#1, FR-007) |
| B2 | Lock budget | click lock-budget | planning fields become read-only; settlement fields become editable (US2#2, FR-007) |
| B3 | Enter night-of settlement values & run deal math | fill settlement cells | computed payouts/totals equal expected **base-10 decimal-string** literals exactly (US2#3, FR-008, Constitution I) |
| B4 | Simulate touch signature & finalize | pointer/drag on signing `<canvas>` under `hasTouch` viewport | finalize succeeds (US2#4, FR-009) |
| B5 | Post-finalize lock | inspect workspace | workspace is **absolute read-only**; settlement document reference resolves to a retrievable document (US2#4, FR-010) |
| B6 | Reconciliation variance | fake QBO actuals ingested | variance display = actuals − settlement values, correct sign/amount (US2#5, FR-011a) |
| B7 | Degenerate signature guard | empty/degenerate stroke | finalization prevented (edge case) |
| B8 | Partial/absent actuals | actuals not-yet / partially arrived | variance UI handles gracefully (edge case) |

**Invariant**: full traversal completes end-to-end including signature simulation and document retrieval (SC-002).

---

## Suite C — Write-Infiltration & Audit Immutability (US3, P2) → FR-011/011a/012, SC-003/SC-004

`specs/integrity/*.spec.ts`

| # | Scenario | Driver | Assertion |
|---|----------|--------|-----------|
| C1 | Zero write infiltration | exercise QBO sync/reconciliation behaviors in preview | egress recorder reports **zero** POST/PUT/DELETE toward Intuit base URL (US3#1, FR-011, SC-004) |
| C2 | Hermetic fake connector | preview QBO interactions | served by fake seeded with deterministic actuals; no external Intuit call; read-only proven (FR-011a) |
| C3 | Audit immutability under mutation | finalize → hash document → mutate underlying DB values for the settled event → re-fetch | stored settlement document byte-for-byte unchanged; never re-rendered (US3#2, FR-012, SC-003) |
| C4 | Frozen-record edit rejected | attempt to edit a `SETTLED` event's financials | rejected; record stays synchronized with stored document snapshot (US3#3, Constitution V) |

**Invariants**: 100% of post-settlement mutation attempts leave the document byte-for-byte unchanged (SC-003); zero create/modify/delete QBO interactions observed (SC-004).

---

## Suite-wide config contract (`playwright.config.ts`)

- `projects`: `chromium`, `firefox`, `webkit`, one `hasTouch` mobile/tablet device.
- `retries: 2`; `trace: 'on-first-retry'`; `screenshot: 'only-on-failure'`; `video: 'retain-on-failure'`.
- `use.baseURL` = preview URL from env (`PREVIEW_BASE_URL`).
- Sharding via CLI `--shard=i/n` in CI matrix.
- `webServer` NOT used in CI (tests target the deployed preview); may be used locally for dev.
