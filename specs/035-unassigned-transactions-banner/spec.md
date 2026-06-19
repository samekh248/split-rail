# Feature Specification: Dashboard Unassigned Transactions Banner

**Feature Branch**: `035-unassigned-transactions-banner`

**Created**: 2026-06-19

**Status**: Draft

**Input**: User description: "Build UnassignedTransactionsBanner with inline mapping drawer (Linear SPLR-75)"

**Linear Issue**: [SPLR-75](https://linear.app/audiodex/issue/SPLR-75/build-unassignedtransactionsbanner-with-inline-mapping-drawer)

## Clarifications

### Session 2026-06-19

- Q: Should the unassigned-transactions banner appear in the all-venues dashboard view? → A: Both views — banner shows in single-venue and all-venues aggregate with combined totals and per-event list across venues.
- Q: How should events be labeled in the drawer when the all-venues view is active? → A: Show venue name on each event row (e.g., "Venue A · Show Title · 3 unassigned").
- Q: How should an operator access unassigned transactions for a specific event inside the drawer? → A: Accordion expand — clicking an event row toggles an inline transaction list beneath that row.
- Q: What should happen to the drawer when the final unassigned transaction is mapped and the venue-wide count reaches zero? → A: Keep the drawer open with a success message; operator dismisses manually.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See venue-wide unassigned transaction alert on overview (Priority: P1)

As a venue operator responsible for QuickBooks reconciliation, I need a prominent alert on the dashboard overview when unassigned bank transactions exist anywhere at my venue, so I immediately know mapping work is required without opening individual events first.

**Why this priority**: Unassigned transactions block accurate financial reporting. A venue-level alert is the primary entry point for Phase 3 action-center workflows and prevents operators from missing sync cleanup buried inside event workspaces.

**Independent Test**: Seed a venue with a known total of unassigned transactions across one or more events. Open the dashboard overview and confirm the alert appears with the correct total count. Clear all unassigned transactions and confirm the alert disappears.

**Acceptance Scenarios**:

1. **Given** the dashboard reports one or more unassigned transactions for the active venue, **When** the operator views the dashboard overview, **Then** a prominent banner is displayed stating how many unassigned transactions were detected (e.g., "4 new unassigned transactions detected").
2. **Given** the dashboard reports zero unassigned transactions for the active venue, **When** the operator views the dashboard overview, **Then** no unassigned-transactions banner is shown.
3. **Given** the operator is viewing the all-venues dashboard aggregate, **When** any included venue has unassigned transactions, **Then** the banner displays the combined total across all venues and the drawer lists affected events from every included venue.
4. **Given** dashboard data is still loading, **When** the overview renders, **Then** the banner does not flash a stale or incorrect count before authoritative data arrives.

---

### User Story 2 - Review per-event unassigned workload in an inline drawer (Priority: P1)

As a venue operator triaging sync cleanup, I need to open an inline panel from the banner that lists each affected event with its unassigned count, so I can see where work is concentrated without leaving the overview.

**Why this priority**: The venue-wide count alone does not tell operators which shows need attention. A per-event breakdown is required to prioritize mapping work efficiently.

**Independent Test**: Seed multiple events with different unassigned counts. Click the banner, confirm the drawer opens listing only events with at least one unassigned transaction, each showing event title, date, and per-event count, sorted by highest workload first and soonest event date as a tiebreaker.

**Acceptance Scenarios**:

1. **Given** the banner is visible, **When** the operator activates it, **Then** an inline drawer (or equivalent overlay panel) opens on the overview without navigating away from the page.
2. **Given** the action center lists multiple events with unassigned transactions, **When** the drawer opens, **Then** each row shows the event identity (title and scheduled date) and the number of unassigned transactions for that event.
3. **Given** the operator is viewing the all-venues dashboard aggregate, **When** the drawer lists events from multiple venues, **Then** each row also displays the venue name so operators can distinguish events with similar titles across venues.
4. **Given** events are listed in the drawer, **When** the operator reviews the list, **Then** events with more unassigned transactions appear before events with fewer, and events with equal counts appear in ascending event-date order (soonest first).
5. **Given** the drawer is open, **When** the operator dismisses it, **Then** the overview remains visible and the drawer closes without a full page reload.

---

### User Story 3 - Map transactions inline from the drawer (Priority: P1)

As a venue operator, I need to assign unassigned transactions to ledger rows directly from the drawer using the same inline mapping interaction already available on the event workspace, so I can resolve issues quickly without a deep navigation detour.

**Why this priority**: Mapping is the actionable outcome of the alert. Inline resolution from the overview reduces friction and keeps operators in their daily dashboard workflow.

**Independent Test**: Open the drawer for an event with unassigned transactions, expand that event's row to reveal its transaction list, map one transaction to a ledger row, and confirm the transaction is removed from the list and counts decrease after data refresh.

**Acceptance Scenarios**:

1. **Given** an event row in the drawer with unassigned transactions, **When** the operator expands that row, **Then** an inline transaction list appears beneath the row showing each unassigned transaction's account name, amount, and date consistent with the existing event-level unmapped list pattern.
2. **Given** an expanded event row in the drawer, **When** the operator collapses that row, **Then** the transaction list is hidden while the drawer and other event rows remain visible.
2. **Given** an unassigned transaction is shown in an expanded event row, **When** the operator selects a target ledger row and confirms the mapping, **Then** the mapping is persisted and the transaction is removed from the unassigned list for that event.
3. **Given** a mapping is completed from the drawer, **When** dashboard and event sync data refresh, **Then** the banner total and per-event counts in the drawer update to reflect the reduced workload without requiring a manual page reload.
4. **Given** a mapping action fails (network or authorization error), **When** the failure is detected, **Then** the operator receives clear feedback and the transaction remains in the unassigned list with no false count reduction.
5. **Given** the operator maps the final unassigned transaction and the venue-wide count reaches zero, **When** the mapping succeeds, **Then** the banner hides, the drawer remains open with a success message confirming all transactions are assigned, and the operator dismisses the drawer manually.

---

### User Story 4 - Jump to event sync workspace from drawer (Priority: P2)

As a venue operator who needs deeper sync context, I need each event row in the drawer to link directly to that event's workspace focused on sync activities, so I can continue cleanup in the full workspace when inline mapping is insufficient.

**Why this priority**: Some mapping scenarios require the full event ledger and sync tools. A direct deep link preserves operator momentum while keeping the drawer as the lightweight triage entry point.

**Independent Test**: Click an event's workspace link from the drawer and confirm navigation lands on the correct event workspace with sync-focused context active.

**Acceptance Scenarios**:

1. **Given** an event listed in the drawer, **When** the operator chooses the workspace link for that event, **Then** they are taken to that event's workspace with sync-focused context pre-selected.
2. **Given** the operator follows a workspace link, **When** they complete additional mapping in the workspace, **Then** returning to the overview shows updated unassigned counts consistent with work performed in the workspace.

---

### Edge Cases

- What happens when the banner is visible but the per-event list is temporarily empty due to a data inconsistency? The banner should not present a broken drawer; show a recoverable empty or error state with a retry action.
- How does the system behave when the operator switches venues while the drawer is open? The drawer should close or refresh to reflect the newly selected venue's action-center data.
- What happens when an event in the drawer has a very large number of unassigned transactions? The list remains usable (scrollable within the drawer) without blocking overview interaction.
- How does the system handle an operator without financial-view permission? The banner and drawer must not appear or must follow the same access-denial patterns as the dashboard overview.
- What happens when the last unassigned transaction for a venue is mapped from the drawer? The banner hides immediately; the drawer stays open with a success message confirming all transactions are assigned, and the operator dismisses it manually.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The dashboard overview MUST display an unassigned-transactions banner when the venue dashboard action center reports a total unassigned transaction count greater than zero.
- **FR-002**: The dashboard overview MUST NOT display the unassigned-transactions banner when the total unassigned transaction count is zero.
- **FR-003**: The banner MUST communicate the total number of unassigned transactions detected at the venue in plain language understandable to non-technical operators.
- **FR-004**: Activating the banner MUST open an inline drawer or overlay on the overview without navigating away from the dashboard.
- **FR-005**: The drawer MUST list each event that has at least one unassigned transaction, showing event title, scheduled date, and per-event unassigned count; in the all-venues view, each row MUST also display the venue name.
- **FR-006**: Events in the drawer MUST be ordered by unassigned count descending, then by event date ascending (soonest first) when counts are equal.
- **FR-007**: The drawer MUST use an accordion expand pattern per event row: activating a row toggles an inline transaction list beneath it showing account name, amount, and date, using the same mapping interaction pattern established for event-level unmapped transaction alerts.
- **FR-008**: The drawer MUST allow the operator to assign an unassigned transaction to a ledger row and persist that mapping without leaving the overview.
- **FR-009**: After a successful mapping from the drawer, the system MUST refresh unassigned counts so the banner total and drawer per-event counts decrease accordingly; when the venue-wide count reaches zero, the banner MUST hide while the drawer remains open with a success message until the operator dismisses it.
- **FR-010**: Each event row in the drawer MUST provide a navigation path to that event's workspace with sync-focused context pre-selected.
- **FR-011**: The banner and drawer MUST appear in both single-venue and all-venues dashboard views, showing venue-appropriate combined totals and per-event lists that respect the same authorization rules as the dashboard overview.
- **FR-012**: The feature MUST achieve ≥80% line/branch coverage across backend and frontend for this feature (CI-enforced; Constitution III).

### Key Entities

- **Action center summary**: Venue-level rollup supplied by the dashboard aggregate, including total unassigned transaction count and a list of events with per-event unassigned counts.
- **Unassigned transaction**: A QuickBooks-synced bank transaction cached at the venue that has not yet been linked to a ledger line item via account mapping.
- **Unmapped event summary**: A lightweight event reference (identity, display title, scheduled date, unassigned count) used to populate drawer rows.
- **Account mapping**: A persisted rule associating a QuickBooks account with a ledger row at a venue; creating one removes matching transactions from unassigned lists and enables automatic routing on future syncs.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Operators with unassigned transactions see the banner on the dashboard overview within one page load after dashboard data is available—no separate navigation or per-event inspection required to discover venue-wide sync cleanup work.
- **SC-002**: Operators can open the drawer, identify which events have unassigned transactions, and view per-event counts in under 10 seconds from landing on the overview.
- **SC-003**: Operators can complete an inline transaction mapping from the drawer and see updated counts without manually reloading the page in 95% of successful mapping attempts during acceptance testing.
- **SC-004**: When all unassigned transactions are resolved, the banner is absent on subsequent overview visits, confirming zero-state behavior.
- **SC-005**: ≥80% line/branch coverage achieved across backend and frontend code for this feature (CI-enforced; Constitution III).

## Assumptions

- The dashboard aggregate already exposes action center data with venue-wide total unassigned count and per-event breakdown (dependency: SPLR-74 / feature 034).
- The dashboard overview already loads venue dashboard data through the established dashboard hook (dependency: SPLR-71 / feature 032).
- Inline transaction-to-ledger mapping behavior, including persistence and future auto-routing for the same account, is already implemented for event workspaces (dependency: SPLR-18 / feature 003) and will be reused—not re-specified—within the drawer context.
- Ledger row options required for mapping dropdowns are obtainable per event through existing data access patterns used on event workspaces.
- The all-venues dashboard aggregate exposes action center totals and per-event lists suitable for combined banner and cross-venue drawer content (dependency on aggregate action-center support in the dashboard API).
- Operators who can view financial dashboard data are authorized to perform inline mapping actions consistent with existing event-workspace permissions.
