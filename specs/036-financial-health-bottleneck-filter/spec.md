# Feature Specification: Financial Health Widget and Recent Events Bottleneck Filter

**Feature Branch**: `dustin/splr-76-build-financialhealthwidget-and-bottleneckfilter-for-recent`

**Created**: 2026-06-19

**Status**: Draft

**Input**: User description: "Build FinancialHealthWidget and BottleneckFilter for Recent Events (Linear SPLR-76)"

**Linear Issue**: [SPLR-76](https://linear.app/audiodex/issue/SPLR-76/build-financialhealthwidget-and-bottleneckfilter-for-recent-events)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Assess current-week financial health at a glance (Priority: P1)

As a venue operator reviewing weekly performance, I need a financial health summary on the dashboard overview that shows the current calendar week's date range alongside projected net show revenue, actual QuickBooks deposit totals, and the variance between them, so I can quickly judge whether this week's shows are tracking to plan without opening individual event ledgers.

**Why this priority**: Weekly cash-flow visibility is a core Phase 3 dashboard capability identified in the technical design. Management needs at-a-glance projected-vs-actual comparison to spot deposit shortfalls early.

**Independent Test**: Open the dashboard overview for a venue with in-week events and a populated financial health summary. Confirm the widget displays the week date range and three formatted monetary values (projected, actual, variance) matching the server-provided summary.

**Acceptance Scenarios**:

1. **Given** the dashboard response includes a financial health summary for the active venue, **When** the operator views the single-venue dashboard overview, **Then** a financial health widget is displayed showing the week start date, week end date, projected net gross, actual QBO deposits, and variance.
2. **Given** monetary values in the financial health summary, **When** the widget renders, **Then** all amounts are formatted consistently with other dashboard money displays (currency symbol, grouping, two decimal places) and preserve accounting precision from the server-provided string values.
3. **Given** the financial health summary reports zero projected, zero actual, and zero variance (no in-week events or no monetary activity), **When** the widget renders, **Then** it still displays the current week date range and zero-valued amounts without error or omission.
4. **Given** the operator is viewing the all-venues aggregate dashboard, **When** the overview renders, **Then** the financial health widget is not shown (weekly rollup is venue-scoped).
5. **Given** dashboard data is still loading, **When** the overview renders, **Then** the financial health widget does not display stale or misleading values before authoritative data arrives.

---

### User Story 2 - Filter recent events to those needing operational attention (Priority: P1)

As a venue operator triaging post-show cleanup, I need a "Needs attention" filter on the Recent Events section that narrows the list to events with operational bottleneck alerts, so I can focus on shows stuck in operational limbo without scanning every recent card.

**Why this priority**: Recent events often include settled and reconciling shows with sync, mapping, or variance issues. A bottleneck filter turns the recent zone from a passive history list into an actionable work queue.

**Independent Test**: Seed recent events where some have bottleneck alert conditions (e.g., unmapped accounts, settled-but-not-synced, variance review) and some do not. Toggle the filter on and confirm only alerted events remain; toggle off and confirm the full recent list is restored.

**Acceptance Scenarios**:

1. **Given** the Recent Events section is visible with at least one recent event carrying a bottleneck alert, **When** the operator activates the "Needs attention" filter, **Then** only events with one or more bottleneck alerts are shown in the recent list.
2. **Given** the "Needs attention" filter is active, **When** the operator deactivates the filter, **Then** the Recent Events section restores the full server-provided recent event list in its original sort order.
3. **Given** no recent events have bottleneck alerts, **When** the operator views the Recent Events section, **Then** the filter control is available but activating it shows an appropriate empty state (e.g., "No events need attention") while the section heading remains visible.
4. **Given** a recent event has multiple bottleneck alerts, **When** the filter is active, **Then** that event appears once in the filtered list (not duplicated).
5. **Given** the operator switches active venue or toggles all-venues view, **When** the overview reloads, **Then** the bottleneck filter resets to inactive so stale filter state does not carry across venue contexts.

---

### User Story 3 - See variance warnings on settled event cards (Priority: P2)

As a venue operator scanning recent and other dashboard zones, I need the variance warning badge on event cards to appear for settled shows when variance concern is indicated—not only for reconciled shows—so I catch deposit mismatches while events are still in the settled phase before full reconciliation.

**Why this priority**: The technical design identifies a risk that limiting variance badges to reconciled events delays operator awareness. Settled events with variance concerns are a primary bottleneck class and must be visually flagged on cards.

**Independent Test**: Render event cards for settled events with and without variance concern indicators from the server summary. Confirm the red variance badge appears only when variance rules indicate a concern, including for SETTLED status events.

**Acceptance Scenarios**:

1. **Given** a settled event whose server summary indicates a variance concern, **When** its card renders on the overview, **Then** the red variance warning badge is displayed.
2. **Given** a reconciled event whose server summary indicates a variance concern, **When** its card renders, **Then** the red variance warning badge continues to be displayed (no regression).
3. **Given** a settled event with no variance concern, **When** its card renders, **Then** no variance warning badge is shown.
4. **Given** a pre-show event with no variance concern, **When** its card renders, **Then** no variance warning badge is shown regardless of status.

---

### User Story 4 - Financial health and bottleneck filter integrate with existing overview layout (Priority: P2)

As a venue operator using the dashboard command center, I need the financial health widget and bottleneck filter to appear in logical positions within the existing overview—alongside the unassigned-transactions alert and within the recent-events zone—without disrupting pinned, tonight, or upcoming zones.

**Why this priority**: Phase 3 widgets must compose cleanly with Phase 2 zone wiring. Misplaced or duplicative UI would undermine the overview's scanability.

**Independent Test**: Open a venue overview with events in all zones plus financial health and bottleneck data. Confirm widget placement, zone ordering (pinned → tonight → upcoming → recent), and that other zones are unaffected by the bottleneck filter.

**Acceptance Scenarios**:

1. **Given** a venue overview with dashboard data loaded, **When** the page renders, **Then** the financial health widget appears above the priority event zones and below the unassigned-transactions banner (when present).
2. **Given** the Recent Events section renders, **When** the operator views it, **Then** the "Needs attention" filter control appears in the section header area alongside the "Recent events" heading.
3. **Given** the bottleneck filter is active, **When** the operator reviews other zones (pinned, tonight, upcoming), **Then** those zones continue to show their full unfiltered event lists.
4. **Given** the overview is in a loading or error state, **When** the page renders, **Then** the financial health widget and bottleneck filter follow the same loading and error conventions as other dashboard overview sections.

---

### Edge Cases

- What happens when financial health week boundaries span month or year boundaries? The widget displays the inclusive start and end dates provided by the server summary without truncation.
- What happens when variance is negative (actual exceeds projected)? The widget displays the signed variance amount with appropriate formatting; no absolute-value masking.
- What happens when a recent event qualifies for bottleneck alerts via multiple rules (e.g., unmapped accounts and not synced)? The event appears once in the filtered list and its card shows all applicable alert chips.
- What happens when bottleneck alerts are derived from a mix of server summary fields and client fallback rules? An event is included in the filtered list if either source produces at least one bottleneck alert, consistent with how event cards display alerts today.
- What happens when the recent events list is empty? The Recent Events section shows its standard empty message; the filter control remains visible but has no effect.
- What happens when financial health data is absent from the dashboard response (e.g., API not yet extended)? The widget is not rendered; the overview continues to function for zones and other Phase 3 widgets.
- What happens when the operator rapidly toggles the bottleneck filter? The list updates immediately without requiring a server round-trip; filter state is client-side over the already-loaded recent partition.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The dashboard overview MUST display a financial health widget when viewing a single selected venue and the dashboard response includes a financial health summary.
- **FR-002**: The financial health widget MUST display the week start date, week end date, projected net gross, actual QBO deposits, and variance from the server-provided financial health summary.
- **FR-003**: All monetary values in the financial health widget MUST be formatted using the same money-formatting rules applied elsewhere on the dashboard overview.
- **FR-004**: The financial health widget MUST NOT be displayed in the all-venues aggregate dashboard view.
- **FR-005**: The Recent Events section MUST include a "Needs attention" filter control that toggles between showing all recent events and showing only events with at least one bottleneck alert.
- **FR-006**: When the bottleneck filter is active, the Recent Events list MUST include only events where the same bottleneck alert rules used by event cards produce one or more alerts (including alerts derived from server summary fields and applicable client fallback rules).
- **FR-007**: When the bottleneck filter is deactivated, the Recent Events list MUST restore the full server-provided recent partition in its original order.
- **FR-008**: Activating the bottleneck filter when no recent events have alerts MUST show an appropriate empty state while preserving the section heading.
- **FR-009**: The bottleneck filter MUST reset to inactive when the operator changes venue context (venue switch or all-venues toggle).
- **FR-010**: The bottleneck filter MUST affect only the Recent Events section; pinned, tonight, and upcoming zones MUST remain unfiltered.
- **FR-011**: Event cards on the overview MUST display the red variance warning badge when the server summary indicates a variance concern, including for events in SETTLED status (not limited to RECONCILED status).
- **FR-012**: Event cards MUST NOT display a variance warning badge when no variance concern is indicated, regardless of event status.
- **FR-013**: The financial health widget and bottleneck filter MUST consume data from the existing venue dashboard aggregate response; no additional per-widget data requests are required.
- **FR-014**: The financial health widget and bottleneck filter MUST follow existing overview loading, error, and empty-state patterns without blocking rendering of other dashboard zones.
- **FR-015**: System MUST achieve ≥80% line/branch coverage across backend and frontend for this feature (CI-enforced; Constitution III). Primary coverage targets the new widget, bottleneck filter, variance badge behavior change, and overview integration paths; no new backend endpoints are anticipated.

### Key Entities

- **Financial Health Summary (consumed)**: Server-provided weekly rollup with week start/end dates, projected net gross, actual QBO deposits, and variance for events scheduled in the current calendar week at the venue.
- **Recent Events Partition (consumed)**: Server-provided list of events from the past seven calendar days (excluding today), sorted most recent first—the target list for bottleneck filtering.
- **Bottleneck Alert (derived)**: An operational concern attached to an event card, such as unmapped QuickBooks accounts, settled-but-not-synced status, or variance review needed; sourced from the same rules event cards already use.
- **Variance Concern Indicator (consumed)**: Server-provided boolean on event summaries signaling that ledger variance rules detect a negative variance requiring operator attention.
- **Needs Attention Filter State (client)**: Local toggle state controlling whether the Recent Events section shows all events or only those with bottleneck alerts.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Operators viewing a single-venue overview with financial health data can identify the current week date range and three monetary totals (projected, actual, variance) within 5 seconds of page load in 95% of usability test sessions.
- **SC-002**: Activating the "Needs attention" filter reduces the Recent Events list to only alerted events in 100% of automated test scenarios with mixed alert and non-alert fixtures.
- **SC-003**: Deactivating the bottleneck filter restores the full recent event list with original ordering in 100% of automated toggle test scenarios.
- **SC-004**: Settled events with variance concern display the variance warning badge in 100% of card rendering test scenarios; settled events without variance concern show no badge in 100% of control scenarios.
- **SC-005**: Pinned, tonight, and upcoming zones remain unaffected by bottleneck filter state in 100% of automated integration test runs.
- **SC-006**: Financial health monetary values displayed in the widget match server-provided summary values after formatting in 100% of fixture-based test scenarios.
- **SC-007**: ≥80% line/branch coverage achieved across backend and frontend code for this feature (CI-enforced; Constitution III).

## Assumptions

- The venue dashboard aggregate response already includes a financial health summary block (SPLR-74 / spec 034-dashboard-action-health-api) with week boundaries, projected, actual, and variance fields before this feature ships.
- The dashboard overview already loads event partitions and action center data via the established dashboard data hook (SPLR-71 / spec 032-overview-dashboard-wire).
- Financial health week boundaries follow Monday-through-Sunday inclusive rules in the venue timezone as defined by the backend aggregate specification; the widget displays dates as provided by the server.
- Bottleneck alert derivation reuses the same shared rules already applied by event cards (server summary fields merged with client fallback derivation); this feature does not introduce new alert types.
- The unassigned-transactions banner (SPLR-75 / spec 035-unassigned-transactions-banner) ships before or alongside this feature; financial health widget placement is below that banner when both are visible.
- No new backend endpoints or API schema changes are required; this is a frontend presentation and interaction release consuming existing dashboard response fields.
- All-venues aggregate view continues to merge event partitions across venues; financial health remains venue-scoped and is hidden in that view.

## Dependencies

- **Blocked by**: [SPLR-74](https://linear.app/audiodex/issue/SPLR-74) — Extend dashboard API with ActionCenter and FinancialHealth aggregates ([034-dashboard-action-health-api](specs/034-dashboard-action-health-api/spec.md)).
- **Blocked by**: [SPLR-71](https://linear.app/audiodex/issue/SPLR-71) — Wire overview to useDashboard() and server-side pin toggle ([032-overview-dashboard-wire](specs/032-overview-dashboard-wire/spec.md)).
- **Related**: [SPLR-75](https://linear.app/audiodex/issue/SPLR-75) — Unassigned Transactions banner ([035-unassigned-transactions-banner](specs/035-unassigned-transactions-banner/spec.md)).
- **Related**: [025-event-card](specs/025-event-card/spec.md) — Event card variance badge and bottleneck chip rules.
- **Related**: [031-dashboard-aggregate-api](specs/031-dashboard-aggregate-api/spec.md) — Base dashboard response and event summary fields.
- **Blocks**: [SPLR-77](https://linear.app/audiodex/issue/SPLR-77) — Wire global nav Settlements and Accounting Sync to venue QBO views.
- **Source**: [TDD §4.2, §6.2, §7 Phase 3](https://linear.app/audiodex/document/technical-design-document-tdd-72f3cdbb8541) — Technical design reference for financial health widget and bottleneck filter.
