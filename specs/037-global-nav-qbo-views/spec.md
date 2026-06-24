# Feature Specification: Wire Global Nav Settlements and Accounting Sync to Venue QBO Views

**Feature Branch**: `037-global-nav-qbo-views`

**Created**: 2026-06-19

**Status**: Draft

**Input**: User description: "Wire global nav Settlements and Accounting Sync to venue QBO views (Linear SPLR-77)"

**Linear Issue**: [SPLR-77](https://linear.app/audiodex/issue/SPLR-77/wire-global-nav-settlements-and-accounting-sync-to-venue-qbo-views)

## Clarifications

### Session 2026-06-19

- Q: For users without financial-view permission, how should the "Settlements / Accounting Sync" global nav item behave? → A: Hidden — item omitted from global nav for unauthorized users.
- Q: Should operators be able to map unassigned transactions directly on the accounting overview, or only after navigating to an event workspace? → A: Full inline triage — overview embeds venue-wide unassigned banner/drawer with inline mapping (reuse 035 patterns).
- Q: When the operator is viewing the all-venues dashboard aggregate and clicks "Settlements / Accounting Sync", what should happen? → A: Auto-exit all-venues — leave all-venues mode and show overview for the last selected single venue.
- Q: When a user has financial-view permission but no active venue is available, how should the accounting nav item behave? → A: Visible + empty state — nav enabled; overview shows same no-venue guidance as dashboard.
- Q: Where should manual sync triggers appear on the accounting overview? → A: Venue-wide sync — single "Sync all" control at overview level.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Reach venue accounting overview from global navigation (Priority: P1)

As a venue operator responsible for settlements and QuickBooks reconciliation, I need the "Settlements / Accounting Sync" item in the global left navigation to open a venue-scoped accounting overview instead of showing "Coming soon", so I can access sync and settlement workflows from a dedicated application area without hunting through individual event workspaces.

**Why this priority**: This is the core gap identified in Phase 4 polish. The global navigation shell was delivered with a disabled placeholder; wiring it to a real destination unlocks the accounting module as a first-class application area.

**Independent Test**: Sign in as a user with financial-view permission, select an active venue, click "Settlements / Accounting Sync" in the left rail, and confirm navigation lands on a venue-scoped accounting overview for that venue. Confirm the left-rail accounting item shows an active/highlighted state on the new page.

**Acceptance Scenarios**:

1. **Given** an authenticated user with financial-view permission and an active venue selected, **When** they activate "Settlements / Accounting Sync" in the global navigation, **Then** they are taken to a venue-scoped accounting overview for the active venue.
2. **Given** a user is on the venue accounting overview, **When** the page renders, **Then** the "Settlements / Accounting Sync" global navigation item is highlighted and the Dashboard item is not highlighted.
3. **Given** a user is on the dashboard overview or an event workspace, **When** the page renders, **Then** the Dashboard global navigation item remains highlighted (unchanged from current behavior).
4. **Given** a user is on any Settings page, **When** the page renders, **Then** no global navigation item is highlighted (unchanged from current behavior).
5. **Given** the accounting overview is open, **When** the user switches the active venue using the venue selector, **Then** the overview refreshes to reflect the newly selected venue's accounting data.
6. **Given** the operator is viewing the all-venues dashboard aggregate, **When** they activate "Settlements / Accounting Sync", **Then** the system exits all-venues mode and navigates to the accounting overview for the last selected single venue.
7. **Given** a user with financial-view permission has no active venue available, **When** they activate "Settlements / Accounting Sync", **Then** the accounting overview opens and displays the same no-venue empty-state guidance used on the dashboard.

---

### User Story 2 - Review venue-wide QBO sync and settlement workload (Priority: P1)

As an accounting manager, I need the venue accounting overview to summarize QuickBooks sync health and settlement-related workload for my active venue, so I can triage unassigned transactions, sync gaps, and events needing attention without opening each show individually.

**Why this priority**: The navigation destination must deliver immediate operational value. A venue-level rollup reuses the reconciliation concepts already surfaced on the dashboard and event workspaces and gives operators a dedicated home for accounting work.

**Independent Test**: Seed a venue with known unassigned transactions, sync metadata, and events in various settlement phases. Open the accounting overview and confirm venue-wide counts, connection/sync status indicators, and a per-event workload list consistent with data already available elsewhere in the product.

**Acceptance Scenarios**:

1. **Given** the active venue has one or more unassigned QuickBooks transactions, **When** the accounting overview loads, **Then** a prominent summary shows the total unassigned transaction count for the venue.
2. **Given** the active venue has events with accounting alerts (unmapped accounts, sync gaps, variance concerns, or settlement bottlenecks), **When** the overview loads, **Then** affected events are listed with enough identity context (show title and scheduled date) for the operator to prioritize work.
3. **Given** QuickBooks is connected for the active venue, **When** the overview loads, **Then** the operator can see whether the integration is connected and when data was last synchronized at the venue level.
4. **Given** QuickBooks is not connected for the active venue, **When** the overview loads, **Then** the operator sees clear guidance that connection is required before sync data is available, without a broken or empty shell.
5. **Given** an event listed on the overview requires deeper cleanup, **When** the operator follows the event's workspace link, **Then** they land on that event's workspace with sync-focused context pre-selected.
6. **Given** the active venue has unassigned transactions, **When** the accounting overview loads, **Then** the operator can open an inline drawer from the overview and map transactions to ledger rows without leaving the page, using the same interaction pattern as the dashboard unassigned-transactions workflow.
7. **Given** the operator maps an unassigned transaction inline from the accounting overview, **When** the mapping succeeds, **Then** venue-wide and per-event unassigned counts on the overview update to reflect the reduced workload.
8. **Given** a user with sync-trigger permission views the accounting overview, **When** the page loads, **Then** a venue-wide "Sync all" control is visible at the overview level.

---

### User Story 3 - Global navigation respects financial permissions (Priority: P1)

As an organization administrator configuring team access, I need the accounting global navigation item to appear only for users authorized to view financial data, and sync-triggering actions on the overview to appear only for users authorized to trigger sync, so permission boundaries remain consistent across the product.

**Why this priority**: Financial and sync capabilities are permission-gated throughout the platform. The new navigation entry and destination must follow the same access rules to avoid exposing accounting surfaces to unauthorized roles.

**Independent Test**: Render global navigation under multiple role fixtures (full financial access, view-only financial access, no financial access). Confirm item visibility and sync action availability match permission expectations without exposing accounting content to unauthorized users.

**Acceptance Scenarios**:

1. **Given** a user lacks financial-view permission, **When** global navigation renders, **Then** the "Settlements / Accounting Sync" item is omitted entirely from the navigation list.
2. **Given** a user has financial-view permission, **When** global navigation renders, **Then** the "Settlements / Accounting Sync" item is enabled and no longer displays a "Coming soon" indicator.
3. **Given** a user has financial-view permission but lacks sync-trigger permission, **When** they view the accounting overview, **Then** they can see sync status and workload summaries but the venue-wide "Sync all" control is not shown.
4. **Given** a user has both financial-view and sync-trigger permissions, **When** they view the accounting overview for a venue with events, **Then** a venue-wide "Sync all" control is available that triggers synchronization for all eligible events at the active venue.
5. **Given** a user without financial-view permission attempts to reach the accounting overview by URL, **When** access is evaluated, **Then** they are denied per the same pattern used for other financial pages (redirect, empty state, or error — consistent with existing behavior).

---

### User Story 4 - Booking Calendar remains a placeholder (Priority: P3)

As a product operator reviewing navigation completeness, I need the Booking Calendar global item to remain a non-interactive "Coming soon" placeholder while only the accounting item is enabled, so partial module rollout does not imply booking features are available.

**Why this priority**: Prevents scope creep and preserves the deliberate placeholder pattern established when vertical navigation shipped.

**Independent Test**: Open global navigation and confirm Booking Calendar still shows "Coming soon", is non-interactive, and does not navigate.

**Acceptance Scenarios**:

1. **Given** any authenticated user, **When** global navigation renders, **Then** the Booking Calendar item remains disabled with a visible "Coming soon" indicator.
2. **Given** a user clicks Booking Calendar, **When** the click is processed, **Then** no navigation occurs.

---

### Edge Cases

- What happens when no venue is selected or the user has no accessible venues? The accounting nav item remains visible for users with financial-view permission; activating it opens the accounting overview with the same no-venue empty-state guidance used on the dashboard (not hidden, not disabled).
- How does the system behave when the user activates accounting navigation while the all-venues dashboard aggregate is active? The system exits all-venues mode and loads the accounting overview for the last selected single venue.
- What happens when accounting data is still loading? The overview must not flash incorrect counts or connection status before authoritative data arrives.
- How does mobile navigation behave? The accounting item must be reachable from the mobile drawer with the same permission rules and active-state highlighting as desktop.
- What happens when venue-wide "Sync all" is triggered but some events fail to sync? The overview reports partial success with per-event failure feedback and does not falsely mark all events as synchronized.
- What happens when the user deep-links to the accounting overview for a venue they cannot access? Access is denied with no cross-tenant data leakage.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST enable the "Settlements / Accounting Sync" global navigation item for users with financial-view permission, removing the "Coming soon" disabled state for those users.
- **FR-002**: The system MUST route activation of the accounting global navigation item to a venue-scoped accounting overview bound to the user's currently active venue.
- **FR-003**: The accounting overview MUST present venue-wide QuickBooks reconciliation workload including unassigned transaction totals, an inline unassigned-transactions banner and mapping drawer, and a per-event list of shows requiring accounting attention.
- **FR-004**: The accounting overview MUST indicate QuickBooks connection status and last-sync timing for the active venue when integration data is available.
- **FR-005**: The accounting overview MUST provide deep links from listed events to the corresponding event workspace with sync-focused context pre-selected.
- **FR-006**: Users without financial-view permission MUST NOT see the accounting global navigation item in the left rail and MUST NOT access the accounting overview destination (direct URL attempts denied per existing financial page patterns).
- **FR-007**: A venue-wide "Sync all" control on the accounting overview MUST be available only to users with sync-trigger permission and MUST trigger synchronization for all eligible events at the active venue.
- **FR-008**: Global navigation active-state rules MUST highlight the accounting item on accounting overview routes and MUST continue highlighting Dashboard only on the dashboard overview (`/`), create-venue flow, and event workspace routes.
- **FR-009**: Global navigation active-state rules MUST highlight no item on Settings routes (unchanged behavior).
- **FR-010**: The Booking Calendar global navigation item MUST remain a disabled "Coming soon" placeholder.
- **FR-011**: Switching the active venue while on the accounting overview MUST refresh displayed data for the newly selected venue.
- **FR-012**: The accounting overview MUST embed the existing venue-wide unassigned-transactions banner and inline mapping drawer from the dashboard workflow so operators can resolve mappings on the overview without navigating to individual event workspaces.
- **FR-013**: System MUST achieve ≥80% line/branch coverage across backend and frontend for this feature (CI-enforced; Constitution III).
- **FR-014**: When the operator activates the accounting global navigation item while the all-venues dashboard aggregate is active, the system MUST exit all-venues mode and present the accounting overview for the last selected single venue.
- **FR-015**: When a user with financial-view permission has no active venue available, the accounting global navigation item MUST remain enabled and the accounting overview MUST display the same no-venue empty-state guidance used on the dashboard.

### Key Entities

- **Venue Accounting Overview**: A venue-scoped page summarizing QuickBooks integration health, unassigned transaction workload, and events needing accounting attention; entry point for the Settlements / Accounting Sync global module.
- **Global Navigation Item**: A left-rail destination representing a major application module; the accounting item transitions from placeholder to active for permitted users.
- **Unassigned Transaction**: A QuickBooks transaction ingested for an event that lacks an account-to-ledger mapping; counted at venue and per-event levels.
- **Accounting Alert**: A bottleneck condition on an event (unmapped accounts, sync gap, variance concern, or settlement-phase issue) that warrants operator attention on the overview list.
- **Active Venue Context**: The venue currently selected by the operator, determining which organization's data and which venue-scoped summaries the accounting overview displays.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users with financial-view permission can reach the venue accounting overview from global navigation in one click from any shell page.
- **SC-002**: 100% of global navigation active-state scenarios pass automated verification: Dashboard highlighted on overview and workspace routes only; accounting highlighted on accounting routes only; no highlight on Settings routes.
- **SC-003**: Users without financial-view permission never see the accounting nav item or accounting overview content in manual permission-matrix testing across at least three role fixtures.
- **SC-004**: Venue accounting overview displays unassigned transaction totals, supports inline mapping from the overview drawer, and shows per-event workload that matches authoritative venue data in integration tests with seeded fixtures.
- **SC-005**: Operators can navigate from an event row on the accounting overview to the correct event workspace with sync context in under 5 seconds (one click plus page load).
- **SC-006**: Booking Calendar remains non-navigable with "Coming soon" visible in all tested role fixtures.
- **SC-007**: ≥80% line/branch coverage achieved across backend and frontend code for this feature (CI-enforced; Constitution III).
- **SC-008**: Users with sync-trigger permission can trigger venue-wide sync from the accounting overview in one action; users without sync-trigger permission never see the "Sync all" control in permission-matrix testing.

## Assumptions

- The combined "Settlements / Accounting Sync" label remains a single global navigation item (not split into two separate rail entries) to match the existing vertical navigation design.
- Users without financial-view permission do not see the accounting nav item (hidden, not disabled), consistent with how other financial surfaces are hidden from unauthorized roles.
- No new dashboard aggregate endpoints are required; the accounting overview consumes existing venue-scoped dashboard, sync, and mapping data. Venue-wide "Sync all" may orchestrate existing per-event sync operations or introduce a venue-level sync entry point — resolved during planning.
- The accounting overview is venue-scoped only; all-venues aggregate mode is not supported on the overview. Activating accounting navigation from all-venues dashboard mode exits all-venues and loads the last selected single venue (same constraint as financial health widget).
- Booking Calendar activation remains deferred to a future feature spec.
- Existing inline mapping, unassigned-transaction banner, and sync-now interaction patterns from the dashboard and event workspace are embedded on the accounting overview (not link-only); the overview is the primary triage home for venue-wide QBO cleanup.

## Dependencies

- **Blocked by**: [SPLR-76](https://linear.app/audiodex/issue/SPLR-76) — Build FinancialHealthWidget and BottleneckFilter for Recent Events ([036-financial-health-bottleneck-filter](specs/036-financial-health-bottleneck-filter/spec.md)).
- **Related**: [022-vertical-navigation](specs/022-vertical-navigation/spec.md) — Global navigation shell and placeholder behavior being upgraded.
- **Related**: [003-qbo-pull-cache-mapping](specs/003-qbo-pull-cache-mapping/spec.md) — QuickBooks sync, mapping, and unassigned transaction domain.
- **Related**: [035-unassigned-transactions-banner](specs/035-unassigned-transactions-banner/spec.md) — Venue-wide unassigned transaction triage patterns to reuse.
- **Related**: [031-dashboard-aggregate-api](specs/031-dashboard-aggregate-api/spec.md) — Venue-scoped dashboard aggregates feeding workload lists.
- **Related**: [004-settlement-freeze-archiving](specs/004-settlement-freeze-archiving/spec.md) — Settlement lifecycle context for events on the overview.
- **Source**: [TDD §7 Phase 4](https://linear.app/audiodex/document/technical-design-document-tdd-72f3cdbb8541) — Technical design reference for enabling global accounting navigation.
