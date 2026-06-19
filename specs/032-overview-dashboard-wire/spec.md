# Feature Specification: Server-Backed Dashboard Overview and Pin Persistence

**Feature Branch**: `032-overview-dashboard-wire`

**Created**: 2026-06-18

**Status**: Draft

**Input**: User description: "Wire overview to useDashboard() and server-side pin toggle (Linear SPLR-71)"

**Linear Issue**: [SPLR-71](https://linear.app/audiodex/issue/SPLR-71/wire-overview-to-usedashboard-and-server-side-pin-toggle)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Overview loads from authoritative server data (Priority: P1)

As an authenticated venue operator, I need the dashboard overview to load pre-partitioned event zones from the server in a single request, so I see consistent priority zones (pinned, tonight, upcoming, recent) without the browser recomputing partitions from a raw event list.

**Why this priority**: Server-backed aggregation is the foundation for Phase 2 dashboard work. Without it, users continue to see client-derived zones that may diverge from server rules and cannot carry server-computed summaries.

**Independent Test**: Open the dashboard overview for a venue with events spanning multiple date buckets and pinned items. Confirm all four zone sections reflect the server's partitioned response without requiring a separate raw event fetch for zone layout.

**Acceptance Scenarios**:

1. **Given** a signed-in user with financial-view permission and an active venue with mixed event dates, **When** they open the dashboard overview, **Then** priority zones are populated from the server dashboard aggregate for that venue.
2. **Given** a venue with no events dated today, **When** the overview renders, **Then** the tonight hero zone is not shown while other zones reflect the server response.
3. **Given** a venue with zero events, **When** the overview renders, **Then** zone headings and empty-state messaging appear consistent with the server response (all partitions empty).
4. **Given** dashboard data fails to load, **When** the overview renders, **Then** the user sees a clear error state with a retry action consistent with existing dashboard patterns.
5. **Given** a signed-in user without financial-view permission, **When** they attempt to load the overview, **Then** access is denied with appropriate guidance rather than showing partial financial data.

---

### User Story 2 - Pin preferences persist across sessions and devices (Priority: P1)

As a venue operator who pins shows for quick access, I need pin and unpin actions saved on the server and reflected in the overview, so my pinned zone stays accurate after page refresh, browser restart, or signing in from another device.

**Why this priority**: Browser-only pin storage was an interim Phase 1 approach. Persistent server pins are the primary user-visible upgrade in this release.

**Independent Test**: Pin an event on the overview, refresh the page, and confirm the event remains in the pinned zone with pinned visual state. Unpin it, refresh again, and confirm it is removed from the pinned zone.

**Acceptance Scenarios**:

1. **Given** a user pins an event from its overview card, **When** the pin action completes, **Then** the event appears in the pinned zone with pinned visual state without waiting for a full page reload.
2. **Given** a user has pinned events, **When** they refresh the overview page, **Then** the same events remain pinned as returned by the server dashboard aggregate.
3. **Given** a user unpins an event from its overview card, **When** the unpin action completes, **Then** the event is removed from the pinned zone (unless it still qualifies for another zone by date) and no longer shows pinned visual state after refresh.
4. **Given** two users in the same organization with different pin selections, **When** each views the overview, **Then** each sees only their own pinned events in the pinned zone.
5. **Given** a pin or unpin action fails (network or authorization error), **When** the failure is detected, **Then** the card reverts to the prior pin state and the user receives clear feedback without leaving the overview in an inconsistent state.

---

### User Story 3 - Event cards reflect server-provided summaries (Priority: P2)

As a venue operator scanning the overview, I need each event card to display lifecycle phase, variance concern, sync activity, and bottleneck indicators supplied by the server when available, so alerts and quick links match authoritative operational data without extra per-event requests.

**Why this priority**: The dashboard aggregate bundles summary intelligence for responsive cards. Wiring the overview to server summaries completes the Phase 2 data path from backend to UI.

**Independent Test**: Seed events with known variance, sync, and bottleneck conditions. Open the overview and confirm cards show matching alerts and phase-appropriate quick links derived from server-provided fields.

**Acceptance Scenarios**:

1. **Given** an event whose server summary indicates a variance concern, **When** its card renders on the overview, **Then** the variance warning badge is displayed.
2. **Given** an event whose server summary includes bottleneck alerts, **When** its card renders, **Then** bottleneck alert chips reflect those server-provided alerts.
3. **Given** an event whose server summary includes a lifecycle phase, **When** its card renders, **Then** phase-appropriate quick links are shown per the event card specification.
4. **Given** an event whose server summary omits lifecycle phase, **When** its card renders, **Then** quick links fall back to client-side lifecycle derivation or the single "Open workspace" fallback per existing event card rules.
5. **Given** an event with pinned status in the server summary, **When** its card renders, **Then** the pin control reflects pinned state and toggling updates server pin state.

---

### User Story 4 - Venue switch refreshes the overview (Priority: P2)

As a user managing multiple venues, I need the overview to reload dashboard data when I change active venue, so every zone and pin state reflects the newly selected venue—not stale data from the previous venue.

**Why this priority**: Venue context is central to the dashboard. Stale cross-venue data would mislead operators during show-night workflows.

**Independent Test**: Pin events in Venue A, switch to Venue B, confirm zones and pins reflect Venue B only. Switch back to Venue A and confirm Venue A pins reappear.

**Acceptance Scenarios**:

1. **Given** a user switches active venue from the overview workspace bar, **When** the new venue is selected, **Then** the overview reloads dashboard data for that venue and all zones update accordingly.
2. **Given** a user switches venues, **When** new dashboard data loads, **Then** pin states shown reflect the requesting user's server pins for the new venue only.
3. **Given** a user switches venues while a prior dashboard request is in flight, **When** the new venue is selected, **Then** the overview displays data for the selected venue without briefly showing mixed-venue content.

---

### User Story 5 - Responsive pin interaction during overview use (Priority: P3)

As a venue operator toggling pins while scanning the dashboard, I need pin changes to feel immediate while the server confirms persistence, so I can reprioritize events without waiting for a full dashboard reload.

**Why this priority**: Optimistic interaction keeps the overview usable during normal network latency; it is the expected UX for a toggle control on a command-center page.

**Independent Test**: Toggle pin on a card and observe immediate visual and zone updates before network completion. Simulate slow network and confirm UI remains responsive; simulate failure and confirm rollback.

**Acceptance Scenarios**:

1. **Given** a user toggles pin on an event card, **When** the action is initiated, **Then** pinned visual state and pinned-zone membership update immediately before server confirmation.
2. **Given** a successful pin toggle, **When** the server confirms, **Then** the overview remains consistent with the server dashboard aggregate without a disruptive full-page reload.
3. **Given** a failed pin toggle after optimistic update, **When** the error is handled, **Then** the card and pinned zone revert to the pre-toggle state.

---

### Edge Cases

- What happens when the only event is dated today? It appears in the tonight hero (and pinned zone if pinned); recent and upcoming zones show empty messages per server partitions.
- What happens when a pinned event is also tonight's show? The event appears in both pinned and tonight zones per server partition rules.
- What happens when a pinned event also falls within recent or upcoming windows? The event appears in pinned and each matching date-based zone.
- What happens when the user has no venues or no events? Existing no-venue and no-events empty states continue to apply; no create-event action on the overview.
- What happens when server lifecycle phase is absent for an event? Cards use client-side lifecycle derivation as fallback so quick links remain usable.
- What happens when pin action succeeds but dashboard refresh is delayed? Optimistic UI shows the toggled state; subsequent dashboard sync reconciles with server truth.
- What happens when the user lacks permission to pin? Pin control is hidden or disabled per permission rules; overview remains viewable if financial-view access is granted.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The dashboard overview MUST load event zone content from the server dashboard aggregate for the active venue instead of fetching a raw event list and partitioning in the browser.
- **FR-002**: The overview MUST render four priority zones aligned with the dashboard overview specification (pinned, tonight hero, upcoming, recent—in that display order), using server-provided partition collections.
- **FR-003**: The tonight hero zone MUST appear only when the server tonight partition contains at least one event.
- **FR-004**: Pin and unpin actions on overview event cards MUST persist preferences via the server pin/unpin operations scoped to the active venue and event.
- **FR-005**: Pin state displayed on the overview MUST reflect the requesting user's server-side pin records as included in the dashboard aggregate, not browser-local pin storage.
- **FR-006**: After a successful pin or unpin action, the overview MUST refresh or reconcile dashboard data so zone membership and card pin state remain consistent with server truth.
- **FR-007**: Pin toggles MUST update the UI optimistically before server confirmation and MUST revert on failure with user-visible error feedback.
- **FR-008**: Changing the active venue MUST trigger a reload of dashboard data for the newly selected venue, replacing all zone contents and pin states.
- **FR-009**: Event cards on the overview MUST consume server-provided summary fields for pinned status, lifecycle phase, variance concern, latest sync timestamp, unmapped-item count, and bottleneck alerts when present in the dashboard aggregate.
- **FR-010**: When server-provided lifecycle phase is absent for an event, event cards MUST fall back to existing client-side lifecycle derivation rules without breaking quick-link behavior.
- **FR-011**: The overview MUST retain existing empty-state, loading, error, and permission-aware behaviors from the Phase 1 overview page (no create-event on overview; venue switching in workspace bar; navigation to event workspace from cards).
- **FR-012**: Browser session storage MUST NOT be used as the source of truth for pin state after this feature ships; any legacy session pin data MUST be ignored in favor of server pin state.
- **FR-013**: Dashboard data for the active venue SHOULD be treated as fresh for approximately thirty seconds under normal conditions before background refresh, balancing responsiveness with server load.
- **FR-014**: Action Center widgets, Financial Health widgets, and Unassigned Transactions banner integration are explicitly out of scope for this release (tracked separately as SPLR-74, SPLR-75, SPLR-76).
- **FR-015**: System MUST achieve ≥80% line/branch coverage across backend and frontend for this feature (CI-enforced; Constitution III). Coverage applies to new or modified overview wiring, dashboard data access, pin mutation handling, and event card integration paths.

### Key Entities

- **Dashboard Overview (wired)**: The operational landing view at the dashboard entry, now fed by the server dashboard aggregate rather than client-side event partitioning.
- **Server Dashboard Aggregate**: The venue-scoped response containing partitioned event collections and per-event summaries (pin state, lifecycle phase, alerts, sync metadata).
- **User Event Pin (consumed)**: The per-user bookmark association persisted server-side; pin/unpin actions create or remove these records and the aggregate reflects them for the requesting user.
- **Event Card Summary (consumed)**: Server-provided event display and alert fields rendered by the shared event card on the overview.
- **Active Venue**: The venue whose dashboard aggregate populates all overview zones; switching venues replaces the entire dataset.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of authorized overview page loads for venues with mixed event dates display zone contents matching the server dashboard aggregate in automated acceptance tests (no client-side partition mismatches).
- **SC-002**: Pin-then-refresh and unpin-then-refresh round trips preserve correct pinned zone membership in 100% of automated test scenarios.
- **SC-003**: Users switching active venue see overview content for the selected venue only, with zero cross-venue data bleed in automated multi-venue test runs.
- **SC-004**: Pin toggle interactions update visible pin state within 200 milliseconds of user action in 95% of local test runs, with successful server persistence confirmed on refresh.
- **SC-005**: Event cards display server-provided variance and bottleneck indicators matching fixture data in 100% of integration test scenarios where summaries are present.
- **SC-006**: Failed pin toggles revert optimistic UI state in 100% of simulated failure test scenarios with user-visible error feedback.
- **SC-007**: ≥80% line/branch coverage achieved across backend and frontend code for this feature (CI-enforced; Constitution III).

## Assumptions

- The server dashboard aggregate endpoint (SPLR-72 / spec 031-dashboard-aggregate-api) and event pin/unpin endpoints (SPLR-70 / spec 030-event-pin-endpoints) are available before this feature is implemented.
- The Phase 1 dashboard overview page layout, zone ordering, empty-state messaging, and navigation behavior (spec 026-dashboard-overview-page) remain unchanged; this release replaces the data source and pin persistence mechanism only.
- The shared event card component (spec 025-event-card) already supports pin controls, alerts, and quick links; this release wires it to server summary fields where available.
- Bottleneck alert chips may be fully server-driven when included in the aggregate; otherwise client derivation remains an acceptable fallback only when server fields are absent.
- Action Center, Financial Health, and Unassigned Transactions UI blocks are deferred to follow-on issues and do not block overview wiring.
- Permission to view financial data gates access to the dashboard aggregate; pin/unpin requires the same permission gate as the pin API specification.
- No new backend endpoints are introduced in this feature; it is a frontend integration release consuming existing APIs.

## Dependencies

- **Blocked by**: [SPLR-72](https://linear.app/audiodex/issue/SPLR-72) — Dashboard aggregate API with partitioned event collections and summaries.
- **Blocked by**: [SPLR-70](https://linear.app/audiodex/issue/SPLR-70) — Event pin/unpin server endpoints.
- **Blocked by**: [SPLR-66](https://linear.app/audiodex/issue/SPLR-66) / [026-dashboard-overview-page](specs/026-dashboard-overview-page/spec.md) — Phase 1 overview page with priority zones.
- **Blocks**: [SPLR-75](https://linear.app/audiodex/issue/SPLR-75) — Unassigned Transactions banner; [SPLR-76](https://linear.app/audiodex/issue/SPLR-76) — Financial Health and Bottleneck filter widgets (depend on wired overview data layer).
- **Related**: [031-dashboard-aggregate-api](specs/031-dashboard-aggregate-api/spec.md), [030-event-pin-endpoints](specs/030-event-pin-endpoints/spec.md), [025-event-card](specs/025-event-card/spec.md).
