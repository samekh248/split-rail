# Feature Specification: Dashboard Action Center and Financial Health Aggregates

**Feature Branch**: `034-dashboard-action-health-api`

**Created**: 2026-06-18

**Status**: Draft

**Input**: User description: "Extend dashboard API with ActionCenter and FinancialHealth aggregates (Linear SPLR-74)"

**Linear Issue**: [SPLR-74](https://linear.app/audiodex/issue/SPLR-74/extend-dashboard-api-with-actioncenter-and-financialhealth-aggregates)

## Clarifications

### Session 2026-06-18

- Q: How should the financial health actual total (Actual QBO Deposits) be calculated? → A: Sum revenue-block QBO actual values only (per TDD §5.4).
- Q: What calendar week boundaries should financial health use? → A: Monday through Sunday (inclusive), venue timezone.
- Q: Which projected column should budget-locked but unsettled events use? → A: Proforma until status is SETTLED or RECONCILED (status-based).
- Q: Should the financial health summary include explicit week range dates? → A: Include weekStart and weekEnd ISO dates in the response.
- Q: How should the action center event list be sorted? → A: Unmapped count descending, then event date ascending (soonest first).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See venue-wide unmapped transaction workload (Priority: P1)

As a venue operator responsible for QuickBooks reconciliation, I need the dashboard to report how many unassigned bank transactions remain across all my venue's events and which specific events still need mapping, so I can prioritize cleanup work from the action center without opening each event individually.

**Why this priority**: Unmapped transactions block accurate financial reporting. A venue-level rollup with per-event breakdown is the primary input for the action center widgets planned in Phase 3.

**Independent Test**: Seed multiple events with known unmapped transaction counts (including events with zero unmapped items). Request the venue dashboard and confirm the action center block shows the correct total and lists only events with at least one unmapped transaction, each with the correct per-event count.

**Acceptance Scenarios**:

1. **Given** a venue with events containing a combined total of unmapped transactions, **When** an authorized user requests the dashboard, **Then** the response includes an action center summary with the venue-wide unmapped transaction total matching the sum of per-event unmapped counts.
2. **Given** one or more events with at least one unmapped transaction, **When** the dashboard is requested, **Then** the action center summary lists each qualifying event with its event identity, display title, scheduled date, and unmapped count.
3. **Given** all events at a venue have zero unmapped transactions, **When** the dashboard is requested, **Then** the action center summary reports a total of zero and an empty list of events needing attention.
4. **Given** an event has unmapped transactions but belongs to another venue, **When** the dashboard is requested for Venue A, **Then** Venue B's unmapped counts are excluded from Venue A's action center summary.

---

### User Story 2 - Assess current-week financial health at a glance (Priority: P1)

As a venue operator reviewing weekly performance, I need the dashboard to compare projected net show revenue for events in the current calendar week against actual QuickBooks deposit totals, including the variance between them, so I can quickly spot whether this week's shows are tracking to plan.

**Why this priority**: Financial health is a core Phase 3 dashboard capability. Operators need a single weekly rollup rather than manually summing individual event ledgers.

**Independent Test**: Seed events scheduled within and outside the current calendar week with known proforma/settlement values and QBO actuals. Request the dashboard and confirm the financial health block reflects correct projected totals, actual deposit totals, and variance for in-week events only.

**Acceptance Scenarios**:

1. **Given** events scheduled within the current calendar week at a venue, **When** an authorized user requests the dashboard, **Then** the response includes a financial health summary covering only those in-week events.
2. **Given** an in-week event that has been settled or reconciled, **When** financial health is computed, **Then** that event's projected contribution uses its settlement net show revenue (not proforma).
3. **Given** an in-week event that has not been settled (including budget-locked events still in PRE_SHOW), **When** financial health is computed, **Then** that event's projected contribution uses its proforma net show revenue.
4. **Given** in-week events with QBO-synced revenue line items, **When** financial health is computed, **Then** the actual total reflects the sum of revenue-block QBO actual values for those events and the variance equals projected minus actual.
5. **Given** no events fall within the current calendar week, **When** the dashboard is requested, **Then** the financial health summary reports zero projected, zero actual, and zero variance without error.
6. **Given** an event scheduled on the first or last day of the current calendar week, **When** financial health is computed, **Then** boundary-dated events are included in the weekly rollup per inclusive calendar-day rules.

---

### User Story 3 - Receive action center and financial health in the existing dashboard response (Priority: P2)

As a frontend developer wiring Phase 3 dashboard widgets, I need action center and financial health data included in the same venue dashboard response that already delivers event partitions, so the overview page can render all command-center sections from one request without additional round-trips.

**Why this priority**: The dashboard aggregate endpoint is the established data contract for the overview. Extending it keeps client integration simple and consistent with the Phase 2 wiring pattern.

**Independent Test**: Request the venue dashboard and confirm the response contains both the existing event partition collections and the new action center and financial health summary blocks in a single successful response.

**Acceptance Scenarios**:

1. **Given** an authorized user requests a venue dashboard, **When** the response is returned, **Then** it includes existing event partition collections unchanged in structure plus populated action center and financial health summary blocks.
2. **Given** a venue with events spanning multiple date windows, **When** the dashboard is requested, **Then** event partitions continue to follow the existing dashboard overview rules independently of action center and financial health calculations.
3. **Given** monetary values in the financial health summary, **When** the response is consumed, **Then** all monetary amounts are represented as precise decimal strings suitable for display and further calculation without floating-point loss.

---

### User Story 4 - Dashboard aggregates respect tenant and permission boundaries (Priority: P1)

As a platform operator, I need action center and financial health aggregates to enforce the same organization, venue, and permission rules as the existing dashboard endpoint, so sensitive financial rollups never leak across tenants or to unauthorized users.

**Why this priority**: These summaries aggregate financial data across all venue events. Cross-tenant leakage or permission bypass is a release blocker.

**Independent Test**: Attempt dashboard requests as unauthorized users, cross-tenant users, and users scoped to a different venue. Confirm action center and financial health data are never returned when access is denied.

**Acceptance Scenarios**:

1. **Given** an authenticated user without permission to view financial data, **When** they request a venue dashboard, **Then** the request is denied and no action center or financial health data is exposed.
2. **Given** an authenticated user in Organization A, **When** they request a dashboard for a venue in Organization B, **Then** the request is denied without revealing whether the venue exists.
3. **Given** an authenticated user scoped to Venue X only, **When** they request a dashboard for Venue Y in the same organization, **Then** the request is denied.
4. **Given** an authorized user requests their accessible venue's dashboard, **When** aggregates are computed, **Then** only events belonging to that venue within the user's organization are included.

---

### Edge Cases

- What happens when an in-week event is budget-locked but still PRE_SHOW? Its projected contribution uses proforma net show revenue; budget lock alone does not switch to settlement values.
- What happens when an in-week event has no line items? Its projected contribution is zero; it still counts as an in-week event if scheduled within the week window.
- What happens when an in-week event has line items but no QBO sync data? Actual contribution for that event is zero; variance reflects the full projected amount.
- What happens when an in-week event has QBO actuals on expense line items but none on revenue? Only revenue-block QBO actual values count toward the actual total; expense actuals are excluded.
- What happens when an event spans the week boundary by timezone interpretation? Week boundaries follow the same calendar-day reference used for dashboard event partitions (venue timezone when configured, otherwise UTC).
- What happens when unmapped counts were already surfaced on individual event cards? Action center totals MUST match the sum of per-event unmapped counts already present on event card summaries in the same response.
- What happens when multiple events share the same unmapped count in the action center list? They are ordered by scheduled date ascending (soonest first).
- What happens when financial health projected totals involve events with negative net show revenue? Amounts are summed algebraically; variance reflects the true signed difference.
- What happens when the dashboard is requested at the exact week rollover (midnight on week start)? The financial health window uses the calendar week containing the reference "today" at request time.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The venue dashboard response MUST include an action center summary block containing a venue-wide total count of unmapped QuickBooks transactions and a list of events that have at least one unmapped transaction.
- **FR-002**: Each entry in the action center event list MUST include sufficient identity and display fields for the UI to link to the event (event identity, title, scheduled date) plus the per-event unmapped transaction count. The list MUST be sorted by unmapped count descending, then by scheduled date ascending (soonest first) as a tiebreaker.
- **FR-003**: The venue-wide unmapped total in the action center summary MUST equal the sum of unmapped counts across all events at the venue included in the dashboard response.
- **FR-004**: Events with zero unmapped transactions MUST NOT appear in the action center event list.
- **FR-005**: The venue dashboard response MUST include a financial health summary block for the current calendar week (Monday through Sunday inclusive, in the venue's configured timezone) covering events scheduled within that week at the venue, including explicit week start and week end dates (ISO calendar dates) defining the rollup window.
- **FR-006**: Financial health projected net show revenue for each in-week event MUST use settlement net show revenue when the event status is SETTLED or RECONCILED, and proforma net show revenue for all other statuses (including budget-locked PRE_SHOW events).
- **FR-007**: Financial health actual total MUST reflect the sum of revenue-block QBO actual values across in-week events (expense-block and other line-item QBO actuals are excluded).
- **FR-008**: Financial health variance MUST equal projected total minus actual total for the current calendar week rollup.
- **FR-009**: All monetary values in the financial health summary MUST be serialized as precise decimal strings (not floating-point numbers) to preserve accounting accuracy.
- **FR-010**: Action center and financial health aggregates MUST be computed server-side and included in the existing venue dashboard retrieval operation; clients MUST NOT be required to derive these rollups from raw event data.
- **FR-011**: Dashboard retrieval MUST continue to require permission to view financial data; users without that permission MUST be denied access to action center and financial health data.
- **FR-012**: Action center and financial health aggregates MUST enforce organization isolation and venue access scope identical to other venue-scoped dashboard operations.
- **FR-013**: When no events qualify for a summary (no unmapped transactions, or no in-week events), the corresponding summary block MUST be present with zero totals and empty event lists rather than omitted or errored.
- **FR-014**: Existing dashboard event partition collections and per-event card summaries MUST remain available and unchanged in purpose; this feature adds new summary blocks without removing or breaking prior dashboard consumers.
- **FR-015**: System MUST achieve ≥80% line/branch coverage across backend and frontend for this feature (CI-enforced; Constitution III). Primary coverage targets the dashboard aggregate computation paths for action center and financial health; frontend coverage applies to regenerated contract types consumed by downstream widget work.

### Key Entities

- **Action Center Summary**: Venue-level rollup of unmapped QuickBooks transaction workload—total count plus a list of events needing mapping attention.
- **Unmapped Event Summary**: A single event's contribution to the action center—identity, display fields, and count of unmapped transactions.
- **Financial Health Summary**: Current calendar week rollup comparing projected net show revenue (settlement for SETTLED/RECONCILED events, proforma for all others) against revenue-block QBO actual totals, with variance; includes explicit week start and end dates (ISO `yyyy-MM-dd`).
- **Current Calendar Week**: The Monday-through-Sunday window (inclusive start and end dates) containing the reference "today", calculated in the venue's configured timezone when available; otherwise UTC.
- **Projected Net Show Revenue**: Per-event net show revenue derived from revenue line items minus artist deductions, using settlement values when status is SETTLED or RECONCILED and proforma values for all other statuses.
- **Actual QBO Deposits**: Per-event sum of QuickBooks-synced actual values on revenue line items only; expense and other block actuals are excluded from the weekly rollup.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Action center venue-wide unmapped totals and per-event counts match independently verified fixture data in 100% of integration test scenarios.
- **SC-002**: Financial health projected, actual, and variance totals match independently verified fixture data for in-week events in 100% of integration test scenarios, including settled-vs-unsettled column selection.
- **SC-003**: Events on the first and last calendar day of the current week are correctly included or excluded in financial health rollups in 100% of week-boundary test cases.
- **SC-004**: Cross-tenant, out-of-scope venue, and missing-permission dashboard requests are denied in 100% of security test cases without exposing aggregate financial data.
- **SC-005**: Authorized users receive action center and financial health summaries in the same dashboard response as event partitions, with dashboard requests completing within 2 seconds under normal load for venues with 50 events in integration test environments.
- **SC-006**: Action center totals are consistent with the sum of per-event unmapped counts on event card summaries in the same response in 100% of test scenarios.
- **SC-007**: ≥80% line/branch coverage achieved across backend and frontend code for this feature (CI-enforced; Constitution III).

## Assumptions

- The base dashboard aggregate endpoint (SPLR-72 / spec 031-dashboard-aggregate-api) is available and returns event partitions and per-event summaries; this feature extends that response with two additional summary blocks.
- Unmapped transaction counts per event reuse the same definition as event card `unmappedCount` in the existing dashboard response (count of unmapped QuickBooks staging records per event).
- Net show revenue calculation follows existing ledger grid rules: gross revenue minus artist deductions, using proforma values for unsettled events and settlement values for settled events.
- Actual QBO deposit totals per event are the sum of synced QBO actual values on revenue line items only, matching TDD §5.4 (not net show revenue from QBO actuals).
- Current calendar week uses Monday through Sunday inclusive, aligned with the venue's configured timezone when available; otherwise UTC is the default reference for "today" and week boundaries—consistent with the base dashboard partition date rules.
- This release delivers backend aggregate data only; Action Center banner UI (SPLR-75) and Financial Health widget UI (SPLR-76) are downstream consumers and out of scope for this specification.
- Bottleneck alert aggregates remain out of scope; action center in this release focuses on unmapped transaction workload only.
- No new HTTP routes are required; summary blocks are added to the existing venue dashboard retrieval response.

## Dependencies

- **Blocked by**: [SPLR-72](https://linear.app/audiodex/issue/SPLR-72) — Base dashboard aggregate API with event partitions and per-event summaries (spec 031-dashboard-aggregate-api).
- **Blocks**: [SPLR-75](https://linear.app/audiodex/issue/SPLR-75) — Unassigned Transactions banner UI; [SPLR-76](https://linear.app/audiodex/issue/SPLR-76) — Financial Health widget UI.
- **Related**: [031-dashboard-aggregate-api](specs/031-dashboard-aggregate-api/spec.md) — Defines base dashboard response this feature extends.
- **Related**: [032-overview-dashboard-wire](specs/032-overview-dashboard-wire/spec.md) — Frontend dashboard consumer; widget wiring deferred to SPLR-75/76.
- **Related**: [002-financial-ledger-grid](specs/002-financial-ledger-grid/spec.md) — Net show revenue and ledger summary derivation rules.
- **Related**: [003-qbo-pull-cache-mapping](specs/003-qbo-pull-cache-mapping/spec.md) — Unmapped QBO transaction staging model.
- **Source**: [TDD §5.3–5.4, §7 Phase 3](https://linear.app/audiodex/document/technical-design-document-tdd-72f3cdbb8541) — Technical design reference for action center and financial health aggregates.
