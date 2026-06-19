# Feature Specification: Dashboard Aggregate API

**Feature Branch**: `031-dashboard-aggregate-api`

**Created**: 2026-06-18

**Status**: Draft

**Input**: User description: "Add DashboardService and GET /dashboard endpoint with EventCardDto aggregates (Linear SPLR-72)"

**Linear Issue**: [SPLR-72](https://linear.app/audiodex/issue/SPLR-72/add-dashboardservice-and-get-dashboard-endpoint-with-eventcarddto)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Retrieve a venue dashboard in one request (Priority: P1)

As a venue operator with permission to view financial data, I need the system to return my active venue's dashboard as pre-partitioned event groups in a single response, so the overview page can render priority zones without fetching raw events and computing partitions on the client.

**Why this priority**: The dashboard overview depends on fast, consistent zone data. A single aggregate response eliminates redundant round-trips and ensures every user sees the same partition rules applied server-side.

**Independent Test**: Request the dashboard for a venue with events spanning tonight, pinned, recent, and upcoming buckets. Confirm the response contains four partition collections with the correct events in each bucket per the dashboard overview rules.

**Acceptance Scenarios**:

1. **Given** an authenticated user with financial-view permission and access to a venue with mixed event dates, **When** they request that venue's dashboard, **Then** the response includes partitioned collections for tonight's events, pinned events, recent events, and upcoming events.
2. **Given** a venue with no events dated today, **When** the dashboard is requested, **Then** the tonight partition is empty (or omitted per contract convention) while other partitions reflect qualifying events.
3. **Given** a venue with zero events, **When** the dashboard is requested, **Then** all partitions are empty and the response completes successfully.
4. **Given** an authenticated user without financial-view permission, **When** they request a venue dashboard, **Then** the request is denied.

---

### User Story 2 - Event summaries include operational intelligence (Priority: P2)

As a venue operator scanning the dashboard overview, I need each event in the dashboard response to carry summary indicators—variance concern, unmapped account count, and latest sync activity—so event cards can show alerts and status without additional per-event requests.

**Why this priority**: The overview's event cards surface financial and operational alerts. Pre-computed summaries in the aggregate response keep the dashboard responsive and consistent with ledger variance rules.

**Independent Test**: Seed events with known variance conditions, unmapped line items, and sync history. Request the dashboard and confirm each event summary reflects the correct aggregate values.

**Acceptance Scenarios**:

1. **Given** an event with one or more line items showing negative variance per existing ledger variance rules, **When** the dashboard is requested, **Then** that event's summary indicates a variance concern.
2. **Given** an event with unmapped financial line items, **When** the dashboard is requested, **Then** that event's summary includes the count of unmapped items.
3. **Given** an event with prior sync activity, **When** the dashboard is requested, **Then** that event's summary includes the timestamp of the most recent sync (when available).
4. **Given** an event with no variance issues, no unmapped items, and no sync history, **When** the dashboard is requested, **Then** the event summary reflects neutral or zero values without false-positive alerts.

---

### User Story 3 - Pinned events reflect server-side user preferences (Priority: P3)

As a venue operator who pins events for quick access, I need the dashboard response to mark which events I have pinned and include them in the pinned partition, so my pinned zone stays consistent across devices and sessions once server-side pin storage is available.

**Why this priority**: Pin state must move from browser-only storage to authoritative server records. The dashboard aggregate is the primary consumer that surfaces pins alongside date-based zones.

**Independent Test**: Pin two events for a user via the pin API, request the dashboard, and confirm those events appear in the pinned partition with pinned state indicated on their summaries.

**Acceptance Scenarios**:

1. **Given** a user has pinned one or more events for a venue, **When** they request that venue's dashboard, **Then** those events appear in the pinned partition and each summary indicates pinned status for that user.
2. **Given** a user has not pinned any events, **When** they request the dashboard, **Then** the pinned partition is empty and no event summaries show pinned status.
3. **Given** a user has pinned an event that also falls within the recent or upcoming date window, **When** the dashboard is requested, **Then** that event appears in the pinned partition and in each matching date-based partition.
4. **Given** two users in the same organization with different pin selections, **When** each requests the dashboard, **Then** each sees only their own pinned events in the pinned partition.

---

### User Story 4 - Dashboard access respects tenant and venue boundaries (Priority: P1)

As a platform operator, I need dashboard requests to enforce organization and venue access rules, so users never receive event summaries from another tenant or from venues they cannot access.

**Why this priority**: The aggregate bundles sensitive financial summary data. Cross-tenant leakage is a release blocker.

**Independent Test**: Attempt dashboard requests against venues and events in another organization or inaccessible venues within the same organization. Confirm every attempt is denied without exposing cross-tenant data.

**Acceptance Scenarios**:

1. **Given** an authenticated user in Organization A, **When** they request a dashboard for a venue belonging to Organization B, **Then** the request is denied.
2. **Given** an authenticated user scoped to Venue X only, **When** they request a dashboard for Venue Y in the same organization, **Then** the request is denied.
3. **Given** an authenticated user referencing a non-existent venue in their organization, **When** they request its dashboard, **Then** the request is denied without revealing whether the venue exists in another tenant.

---

### Edge Cases

- What happens when the only event is dated today? It appears in the tonight partition (and pinned partition if the user pinned it); recent and upcoming partitions exclude it.
- What happens when a pinned event is also tonight's show? The event appears in both pinned and tonight partitions; it does not also appear in recent or upcoming unless its date falls in those windows (today is excluded from recent/upcoming).
- What happens when an event date is exactly seven days ago or thirty days ahead? Boundary dates are included in recent (≤7 days past, excluding today) and upcoming (≤30 days future, excluding today) per inclusive calendar-day rules aligned with the dashboard overview specification.
- What happens when variance or unmapped aggregates cannot be computed due to incomplete data? The event summary omits or zeroes alert fields rather than reporting false positives.
- What happens when an event is deleted after pins exist? Pin cleanup follows the user-event pin specification; deleted events do not appear in dashboard partitions.
- What happens when Action Center or Financial Health summary blocks are requested? They are out of scope for this release; the response delivers core event-card partitions and per-event summaries only.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST expose a venue-scoped dashboard retrieval operation that returns all data needed to render the dashboard overview priority zones in a single response.
- **FR-002**: The dashboard response MUST partition events into four collections aligned with the dashboard overview specification: tonight (events scheduled for the current calendar day), pinned (events the requesting user has pinned), recent (events within the inclusive seven-calendar-day lookback before today, excluding today), and upcoming (events within the inclusive thirty-calendar-day lookahead after today, excluding today).
- **FR-003**: An event MAY appear in more than one partition when it qualifies for multiple buckets (for example, pinned and upcoming).
- **FR-004**: Each event entry in the dashboard response MUST include core display fields needed by event cards: event identity, title, scheduled date, lifecycle/status inputs, and a pinned flag for the requesting user.
- **FR-005**: Each event entry MUST include summary aggregates: a variance-concern indicator derived from the same rules as the ledger grid variance derivation, a count of unmapped financial line items, and the latest sync timestamp when sync history exists.
- **FR-006**: The system MUST determine pinned membership from the requesting user's server-side pin records for the venue, not from client-supplied state.
- **FR-007**: Dashboard retrieval MUST require permission to view financial data; users without that permission MUST be denied.
- **FR-008**: Dashboard retrieval MUST enforce organization isolation and venue access scope identical to other venue-scoped event operations.
- **FR-009**: When a venue has no qualifying events for a partition, that partition MUST be present as an empty collection so clients can render zone headings with empty-state messaging.
- **FR-010**: Action Center and Financial Health aggregate blocks are explicitly out of scope for this release and MUST NOT be required for dashboard overview rendering.
- **FR-011**: The system MUST achieve ≥80% line/branch coverage across backend and frontend for this feature (CI-enforced; Constitution III).

### Key Entities

- **Dashboard Response**: The top-level aggregate returned for a venue, containing partitioned event collections and per-event summaries.
- **Event Card Summary**: A single event's dashboard representation—identity, display fields, pin state for the requesting user, variance indicator, unmapped-item count, and latest sync timestamp.
- **Tonight Partition**: Events whose scheduled date matches the current calendar day for partition calculations.
- **Pinned Partition**: Events the requesting user has marked as pinned for the venue, regardless of scheduled date.
- **Recent Partition**: Events scheduled within the seven-day lookback window before today, sorted most-recent-first by scheduled date.
- **Upcoming Partition**: Events scheduled within the thirty-day lookahead window after today, sorted soonest-first by scheduled date.
- **User Event Pin**: A server-side association between a user and an event, sourced from the user-event pin persistence feature.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Authorized users receive a complete partitioned dashboard for a venue with mixed event dates in a single request, with 100% partition correctness against the acceptance test matrix (today, within 7d past, outside 7d past, within 30d future, outside 30d future, pinned combinations).
- **SC-002**: Event summary aggregates (variance concern, unmapped count, latest sync) match independently verified fixture data in 100% of integration test scenarios.
- **SC-003**: Cross-tenant and out-of-scope venue dashboard requests are denied in 100% of security test cases without leaking cross-tenant existence signals.
- **SC-004**: Dashboard responses for venues with 50 events complete within 2 seconds under normal load in integration test environments.
- **SC-005**: Users without financial-view permission are denied dashboard access in 100% of permission test cases.
- **SC-006**: ≥80% line/branch coverage achieved across backend and frontend code for this feature (CI-enforced; Constitution III).

## Assumptions

- The user-event pin persistence entity (SPLR-69) and pin API endpoints (SPLR-70) are available or sequenced immediately before this feature; dashboard pin membership depends on stored pin records.
- Partition date boundaries follow the same inclusive calendar-day rules as the dashboard overview page specification (026-dashboard-overview-page).
- Calendar-day calculations for server-side partitioning use the venue's configured timezone when available; otherwise UTC is used as the default reference for "today" and boundary windows.
- Variance concern derivation reuses existing ledger grid variance rules (020-grid-variance-derivation); no separate dashboard-specific variance threshold is introduced.
- Bottleneck alert chips on event cards may continue to use client-side derivation in a follow-on release unless included in event summary fields later; this release focuses on variance, unmapped count, and sync timestamp aggregates per the Linear issue scope.
- Action Center and Financial Health dashboard sections are deferred to a follow-on issue (SPLR-74); this release delivers core partitions and event-card summaries only.
- The dashboard overview frontend (SPLR-71) will consume this API in a subsequent release; this feature delivers the backend aggregate without requiring frontend wiring in the same delivery.
- Event display fields (title, date, status) are sourced from existing event records within the requesting user's organization and venue scope.

## Dependencies

- **Blocked by**: [SPLR-69](https://linear.app/audiodex/issue/SPLR-69) — UserEventPin entity and migration for server-side pin records.
- **Blocks**: [SPLR-71](https://linear.app/audiodex/issue/SPLR-71) — Wire overview to useDashboard() and server-side pin toggle.
- **Related**: [SPLR-74](https://linear.app/audiodex/issue/SPLR-74) — Extend dashboard API with ActionCenter and FinancialHealth aggregates (downstream).
- **Related**: [026-dashboard-overview-page](specs/026-dashboard-overview-page/spec.md) — Defines client zone layout and partition rules this API mirrors.
- **Related**: [025-event-card](specs/025-event-card/spec.md) — Defines event card display and alert expectations consumed by the overview.
