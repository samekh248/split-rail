# Feature Specification: Event Card with Quick Links and Placeholder Booking Status

**Feature Branch**: `025-event-card`

**Created**: 2026-06-18

**Status**: Draft

**Input**: User description: "Build EventCard component with quick links and placeholder booking status (Linear SPLR-65)"

## Clarifications

### Session 2026-06-18

- Q: What triggers the red variance warning badge on an event card? → A: Reuse existing ledger grid variance rules (same derivation as the workspace variance column).
- Q: How should quick links behave when the user lacks permission for that action? → A: Hide unauthorized quick links entirely.
- Q: What should happen when an event's dashboard lifecycle phase cannot be determined? → A: Show a single "Open workspace" fallback link.
- Q: What should display when the user lacks permission for all phase-specific quick links on a card? → A: Show Open workspace fallback when zero permitted phase links remain.
- Q: How should the pin control behave when the parent does not supply pin props? → A: Hide pin control when parent does not supply pin props.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Scan event essentials on the dashboard (Priority: P1)

As a venue operator viewing the dashboard overview, I need each event summarized in a compact card showing the show title, date, and a preview booking-status indicator, so I can quickly identify upcoming shows without opening every event workspace.

**Why this priority**: The card's core identity is at-a-glance event recognition. Without title, date, and status, the dashboard zones cannot communicate what is happening across the venue's calendar.

**Independent Test**: Render a single event card with representative event data and confirm title, formatted event date, and a booking-status preview badge with explanatory tooltip are visible and readable.

**Acceptance Scenarios**:

1. **Given** an event with a title and scheduled date, **When** the card renders, **Then** the title and human-readable event date are displayed prominently.
2. **Given** any event regardless of lifecycle phase, **When** the card renders, **Then** a booking-status preview badge is shown with a tooltip explaining that full booking-calendar integration is coming soon.
3. **Given** multiple events in a dashboard zone, **When** cards render in a list or grid, **Then** each card presents consistent layout so users can scan titles and dates quickly.

---

### User Story 2 - Jump to the right workflow from the card (Priority: P2)

As a venue operator, I need quick-action links on each event card that match where the show is in its lifecycle, so I can open the most relevant workspace area (deal building, settlement, signature, variance review, or sync) in one click instead of hunting through the full ledger.

**Why this priority**: Quick links are the primary productivity gain of the dashboard overview. Phase-appropriate actions reduce navigation friction during planning, night-of settlement, and post-show reconciliation.

**Independent Test**: Render cards for events in each dashboard lifecycle phase and confirm only the correct pair of quick links appears; activating a link notifies the parent view with the intended workspace focus target.

**Acceptance Scenarios**:

1. **Given** an event in the **Pre-Show** dashboard phase, **When** the card renders, **Then** quick links for **Edit Deal Builder** and **Lock Budget** are shown and no other phase-specific links appear.
2. **Given** an event in the **Night Of** dashboard phase, **When** the card renders, **Then** quick links for **Settlement Wizard** and **Capture Signature** are shown.
3. **Given** an event in the **Post-Show** dashboard phase, **When** the card renders, **Then** quick links for **View QBO Variance** and **One-Click QBO Sync** are shown.
4. **Given** a user activates any quick link on a card, **When** the action fires, **Then** the parent handler receives the venue identifier, event identifier, and a focus target matching the action (`deal`, `settlement`, `signature`, `variance`, or `sync`) so navigation can open the correct workspace section.
5. **Given** an event whose phase cannot be determined, **When** the card renders, **Then** phase-specific quick links are not shown and a single **Open workspace** fallback link is displayed instead.

---

### User Story 3 - Notice financial and operational alerts on the card (Priority: P3)

As a venue manager scanning the dashboard, I need visual alerts on event cards when variance risk or operational bottlenecks are detected, so I can prioritize which shows need attention before deadlines pass.

**Why this priority**: Alerts turn the card from passive summary into actionable intelligence, supporting the dashboard's role as a command center.

**Independent Test**: Render cards with and without alert conditions and confirm variance warnings and bottleneck chips appear only when derived alert rules indicate an issue.

**Acceptance Scenarios**:

1. **Given** an event where ledger grid variance rules indicate a negative variance on any applicable line item, **When** the card renders, **Then** a red variance warning badge is displayed on the card.
2. **Given** an event with no variance concern, **When** the card renders, **Then** no variance warning badge is shown.
3. **Given** an event with one or more derived bottleneck alerts (e.g., missing budget lock, unsigned settlement, unmapped QBO accounts), **When** the card renders, **Then** bottleneck alert chips are displayed summarizing each alert.
4. **Given** an event with no bottleneck conditions, **When** the card renders, **Then** no bottleneck chips are shown.

---

### User Story 4 - Pin priority events for quick return (Priority: P4)

As a user who tracks several active shows, I need to pin important events on their cards so I can mark favorites during this release even before server-side pin persistence ships.

**Why this priority**: Pinning supports personal prioritization on a busy dashboard. Phase 1 delivers the interaction pattern with local persistence so the overview page can wire backend sync later without redesigning the card.

**Independent Test**: Toggle pin on a card and confirm visual state changes; refresh the session and confirm pin state persists locally when backend pin is unavailable.

**Acceptance Scenarios**:

1. **Given** an unpinned event card, **When** the user activates the pin control, **Then** the card shows a pinned visual state.
2. **Given** a pinned event card, **When** the user activates the pin control again, **Then** the card returns to an unpinned visual state.
3. **Given** a user pins an event in Phase 1 (before server-side pin), **When** they return in the same browser session or after refresh, **Then** pin state is preserved via client-side storage until backend pin support replaces it.
4. **Given** optional pin props are not supplied by the parent, **When** the card renders, **Then** the pin control is not shown and other card content renders normally.

---

### Edge Cases

- What happens when event title or date is missing from source data? The card shows sensible placeholders (e.g., "Untitled event", "Date TBD") without breaking layout.
- What happens when an event transitions lifecycle phase while the dashboard is open? Quick links update to match the new phase on the next data refresh or re-render.
- What happens when an event's dashboard lifecycle phase cannot be determined? Phase-specific quick links are suppressed; a single Open workspace fallback link is shown and invokes the parent handler without a focus target (or with a neutral default workspace focus).
- What happens when the user lacks permission for a quick-link destination? Unauthorized quick links are hidden entirely; remaining permitted links render normally without layout gaps that imply a missing action.
- What happens when the user lacks permission for every phase-specific quick link on a card? The Open workspace fallback link is shown so the user can still open the event workspace.
- What happens when bottleneck or variance derivation fails due to incomplete data? The card renders without alert badges rather than showing false positives.
- What happens on very narrow viewports? Card content wraps or truncates gracefully; quick links remain tappable and tooltip text remains accessible.
- What happens when booking calendar data becomes available in a future release? The placeholder badge and tooltip are replaced by real booking status without changing the card's overall layout contract.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a reusable event summary card suitable for dashboard zone layouts, accepting event identity and display fields supplied by the parent overview.
- **FR-002**: Each card MUST display the event title and formatted event date.
- **FR-003**: Each card MUST display a placeholder booking-status preview badge with a tooltip stating that full booking-calendar integration is coming soon; real booking data is out of scope for this release.
- **FR-004**: Each card MUST derive its dashboard lifecycle phase (Pre-Show, Night Of, Post-Show) from shared lifecycle utilities and show exactly the quick links defined for that phase:
  - Pre-Show: Edit Deal Builder, Lock Budget
  - Night Of: Settlement Wizard, Capture Signature
  - Post-Show: View QBO Variance, One-Click QBO Sync
  - Unknown phase: Open workspace (single fallback link; no phase-specific links)
- **FR-005**: Activating a quick link MUST invoke a parent callback with venue identifier, event identifier, and a focus target (`deal`, `settlement`, `signature`, `variance`, or `sync`) corresponding to the selected action.
- **FR-006**: Each card MUST show a red variance warning badge when the same variance derivation rules used by the ledger grid workspace indicate a negative variance on any applicable line item; the card MUST NOT define a separate variance threshold.
- **FR-007**: Each card MUST display bottleneck alert chips derived from shared bottleneck-alert rules when applicable conditions are met.
- **FR-008**: Each card MUST include a pin toggle control using standard product iconography when the parent supplies pin props; when pin props are not supplied, the pin control MUST NOT be rendered. Pin state MUST persist locally in Phase 1 when server-side pin is unavailable.
- **FR-009**: The card MUST NOT perform navigation directly; it delegates all workspace navigation to the parent overview via callbacks so routing remains centralized.
- **FR-010**: Automated component tests MUST cover rendering, phase-specific quick links, callback payloads, alert visibility, and pin toggle behavior.
- **FR-011**: The feature MUST achieve ≥80% line/branch coverage across backend and frontend for touched code (CI-enforced; Constitution III). _No backend changes are anticipated; frontend coverage applies to the new card component and its tests._
- **FR-012**: Each card MUST hide quick links the current user is not permitted to use; permitted links MUST remain visible and functional without placeholder gaps for hidden actions. When no phase-specific quick links remain visible after permission filtering, the card MUST show the Open workspace fallback link instead.

### Key Entities

- **Event Card**: A dashboard UI unit summarizing one event—title, date, booking preview badge, optional alerts, phase-appropriate quick links, and optional pin control.
- **Dashboard Lifecycle Phase**: A presentation grouping (Pre-Show, Night Of, Post-Show) derived from event state and budget/settlement progress; determines which quick links appear. Distinct from but mappable to underlying event status values.
- **Quick Link Focus Target**: A semantic destination within the event workspace (`deal`, `settlement`, `signature`, `variance`, `sync`) passed to the parent when the user chooses a card action.
- **Bottleneck Alert**: A derived operational warning (e.g., overdue budget lock, missing signature, QBO mapping gap) surfaced as a chip on the card.
- **Variance Warning**: A badge driven by the shared ledger grid variance derivation (settlement vs. QBO actual per line item); shown prominently when any applicable row has a negative variance.
- **Pin State**: A user preference marking an event as prioritized; persisted locally in Phase 1, designed for future server sync.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of acceptance scenarios in User Stories 1–4 pass in automated component tests.
- **SC-002**: Users can identify event title, date, and booking preview on any card within 2 seconds of scanning a dashboard zone (validated via usability review or test assertions on visible labels).
- **SC-003**: Quick links on cards match lifecycle phase in 100% of tested event fixtures (Pre-Show, Night Of, Post-Show).
- **SC-004**: Every quick-link activation in tests delivers the correct focus target to the parent handler with zero mismatches across the five focus types.
- **SC-005**: Variance and bottleneck indicators appear only when alert rules fire—zero false-positive badges in negative test fixtures.
- **SC-006**: Pin toggle changes visual state and persists across refresh within the same browser when backend pin is not wired.
- **SC-007**: ≥80% line/branch coverage achieved across backend and frontend code for this feature (CI-enforced; Constitution III).

## Assumptions

- Shared lifecycle phase derivation and bottleneck-alert utilities are delivered by a prerequisite issue; this feature consumes them and does not redefine phase rules.
- The multi-zone dashboard overview page (SPLR-66) will compose these cards into Pre-Show, Night Of, and Post-Show zones; this feature delivers the card in isolation.
- Event workspace routing (SPLR-63 / 023-split-dashboard-routes) is available so parent handlers can navigate to venue/event workspace URLs.
- Workspace focus/scroll targeting (SPLR-67) may consume the focus parameter later; this feature only passes the focus value upward.
- Booking calendar integration is explicitly out of scope; the booking badge is preview-only with explanatory tooltip until a future booking feature ships.
- Server-side event pinning is out of scope for Phase 1; local client persistence is an acceptable interim behavior. The pin control is omitted entirely until the parent overview wires pin props.
- Variance warning reuses the existing ledger grid variance derivation (020-grid-variance-derivation); no card-specific variance threshold is introduced.
- Event data fields (title, date, identifiers, lifecycle inputs) are available from existing event APIs; no new backend endpoints are required.
- Permission gating for quick links follows the same capability rules as the underlying workspace actions; unauthorized links are hidden rather than shown disabled.

## Dependencies

- **Prerequisite (blocked by)**: Lifecycle utilities issue supplying dashboard phase derivation and bottleneck alert derivation.
- **SPLR-63 / 023-split-dashboard-routes**: Event workspace routes and navigation helpers for quick-link destinations.
- **Downstream**: SPLR-66 (Dashboard overview) will embed Event Cards in zone layouts.
- **Related**: SPLR-67 (workspace focus params) may consume quick-link focus targets for scroll/highlight behavior.
