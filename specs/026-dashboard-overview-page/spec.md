# Feature Specification: Dashboard Overview Page with Priority Zones

**Feature Branch**: `026-dashboard-overview-page`

**Created**: 2026-06-18

**Status**: Draft

**Input**: User description: "Build DashboardOverviewPage with priority zones (client-side partitioning) — Linear SPLR-66"

## Clarifications

### Session 2026-06-18

- Q: Should events dated today appear exclusively in the tonight hero zone (excluded from recent and upcoming)? → A: Today exclusive to hero (+ pinned if pinned); excluded from recent and upcoming.
- Q: How should zones with no qualifying events behave? → A: Show zone heading with a minimal empty message (e.g., "No upcoming events").
- Q: What is the vertical display order of priority zones on the overview page? → A: Pinned → Tonight hero → Upcoming → Recent.
- Q: Should a pinned event that also falls within recent or upcoming date windows appear in both zones? → A: Pinned events appear in pinned and any matching date-based zone (recent/upcoming).
- Q: Should the overview page offer a create-event action? → A: Create event appears only on the event management page (event workspace), not on the dashboard overview.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Land on an operational overview at the dashboard entry (Priority: P1)

As an authenticated venue operator, I need the root dashboard entry to show a priority-based overview of my active venue's events instead of dropping me directly into a single-event ledger, so I can see what needs attention tonight, what I have pinned, what just happened, and what is coming up before I commit to one show.

**Why this priority**: The overview is the primary dashboard experience described in the product design. Without it, users cannot scan multiple shows or prioritize work from the entry point.

**Independent Test**: Sign in with an active venue that has multiple events spanning past, today, and future dates. Navigate to the dashboard entry and confirm an overview layout with distinct priority zones is shown—not a ledger grid.

**Acceptance Scenarios**:

1. **Given** a signed-in user with an active venue and at least one event, **When** they navigate to the dashboard entry, **Then** they see the operational overview page (not the event ledger workspace).
2. **Given** a signed-in user on the overview page, **When** the page renders, **Then** the active venue context is visible and changeable using the same venue-switching pattern as the interim dashboard.
3. **Given** a signed-in user with no venues, **When** they navigate to the dashboard entry, **Then** they see the existing no-venue guidance with appropriate create-venue call-to-action when permitted.
4. **Given** a signed-in user with an active venue and zero events, **When** they navigate to the dashboard entry, **Then** they see a no-events empty state with informational guidance and no create-event action on the overview page.
5. **Given** event data fails to load, **When** the overview page renders, **Then** the user sees a clear error state with a retry action (consistent with existing dashboard empty-state patterns).

---

### User Story 2 - See tonight's show highlighted in a hero zone (Priority: P2)

As a venue operator working on show night, I need today's event(s) prominently featured in a dedicated hero area, so I can jump into tonight's operational workflow without scanning the full event list.

**Why this priority**: Tonight's show is the highest-urgency operational context. A hero zone surfaces it immediately and differentiates it from historical and future listings.

**Independent Test**: Configure events where at least one has today's date (using the viewer's local calendar date). Open the overview and confirm the hero zone appears with today's event(s). Repeat with no events dated today and confirm the hero zone is absent.

**Acceptance Scenarios**:

1. **Given** the active venue has one or more events scheduled for today's calendar date, **When** the overview renders, **Then** a tonight hero zone is displayed featuring those event(s).
2. **Given** the active venue has no events scheduled for today's calendar date, **When** the overview renders, **Then** the tonight hero zone is not shown.
3. **Given** multiple events are scheduled for today, **When** the hero zone renders, **Then** all of today's events are represented in the hero area in a scannable layout.
4. **Given** a user views the overview near midnight in their local timezone, **When** the calendar date changes, **Then** tonight's hero reflects the new local "today" on the next page load or data refresh.

---

### User Story 3 - Review pinned, recent, and upcoming events in dedicated zones (Priority: P3)

As a venue operator managing many shows, I need events grouped into pinned, recently past, and upcoming zones, so I can prioritize favorites, review the last week of activity, and plan the next month without manual sorting.

**Why this priority**: Zone partitioning is the structural value of the overview—turning a flat event list into an operational command center aligned with how venues think about their calendar.

**Independent Test**: Seed events across pinned, within-7-days-past, beyond-7-days-past, within-30-days-future, and beyond-30-days-future buckets. Confirm each zone shows the correct subset with correct sort order and that pinned events appear in the pinned zone regardless of date.

**Acceptance Scenarios**:

1. **Given** a user has pinned one or more events for the active venue, **When** the overview renders, **Then** a pinned events zone lists those events and each card reflects pinned visual state.
2. **Given** events occurred within the last seven calendar days before today, **When** the recent events zone renders, **Then** those events appear sorted by event date descending (most recent first) and today's events are not included.
3. **Given** events are scheduled within the next thirty calendar days after today, **When** the upcoming events zone renders, **Then** those events appear sorted by event date ascending (soonest first) and today's events are not included.
4. **Given** an event falls outside both the seven-day recent and thirty-day upcoming windows and is not pinned or tonight's show, **When** the overview renders, **Then** that event does not appear in any zone (it may still appear in the tonight hero if dated today, or in pinned and matching date-based zones if pinned).
5. **Given** a user has pinned an event that also falls within the recent or upcoming date window, **When** the overview renders, **Then** that event appears in the pinned zone and in each matching date-based zone.
6. **Given** a user pins or unpins an event from its card, **When** the action completes, **Then** the pinned zone updates accordingly and pin state persists across page reloads within the same browser session.
7. **Given** a zone has no qualifying events, **When** the overview renders, **Then** the zone heading remains visible with a minimal empty message (for example, "No pinned events" or "No upcoming events") so users understand the section exists but has no matches.

---

### User Story 4 - Open the correct event workspace from overview cards (Priority: P4)

As a venue operator on the overview page, I need to open any event's financial workspace—and jump to a specific workflow area when using quick links—directly from event cards, so the overview acts as a launch pad rather than a dead-end summary.

**Why this priority**: Navigation closure completes the overview loop; users must reach ledger and phase-appropriate tools without re-selecting context manually.

**Independent Test**: Click an event card body and a quick link on another card. Confirm navigation opens the correct venue-and-event workspace URL and, for quick links, applies the intended workspace focus.

**Acceptance Scenarios**:

1. **Given** a user clicks the main body of an event card in any zone, **When** navigation completes, **Then** the user lands on that event's workspace with the ledger visible.
2. **Given** a user activates a phase-appropriate quick link on an event card, **When** navigation completes, **Then** the user lands on that event's workspace with focus applied to the intended workflow area (deal building, settlement, signature, variance review, or sync).
3. **Given** a user switches venues from the overview, **When** the new venue's events load, **Then** all zones re-partition for the new venue and navigation from cards uses the new venue identifier.
4. **Given** a user bookmarks or shares a workspace URL and later returns to the dashboard entry, **When** they navigate to `/`, **Then** they see the overview—not an automatic redirect into a single-event ledger.

---

### Edge Cases

- What happens when the only event is dated today? It appears only in the tonight hero (and pinned zone if pinned); recent and upcoming zones show their headings with minimal empty messages.
- What happens when a pinned event is also tonight's show? The event appears in both the hero and pinned zones; it does not also appear in recent or upcoming.
- What happens when a pinned event also falls within the recent or upcoming date window? The event appears in the pinned zone and in each matching date-based zone (recent and/or upcoming).
- What happens when an event date is exactly seven days ago or thirty days ahead? Boundary dates are included in recent (≤7 days past) and upcoming (≤30 days future) windows per inclusive calendar-day rules.
- What happens when event dates are missing or invalid? Those events are excluded from date-based zones but may still appear in pinned if the user pinned them; cards use fallback display rules from the event card specification.
- What happens when the user has read-only permissions? Overview renders with permission-aware card quick links; create-event is not offered on the overview—users with event-management access create events from the event management page only.
- What happens when pin storage is unavailable (e.g., private browsing restrictions)? Pin toggles degrade gracefully without breaking the overview; unpinned behavior remains usable.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The dashboard entry route MUST render a dedicated overview page for authenticated users instead of automatically redirecting users with events into a single-event ledger workspace.
- **FR-002**: The overview page MUST display events for the user's currently active venue only.
- **FR-003**: The overview page MUST provide venue switching in the workspace bar using the same interaction pattern as the interim dashboard entry experience.
- **FR-004**: The overview MUST partition the active venue's event list into up to four client-side priority zones: tonight hero, pinned events, recent events (last seven calendar days), and upcoming events (next thirty calendar days), displayed top-to-bottom in this order: pinned events, tonight hero, upcoming events, recent events.
- **FR-005**: The tonight hero zone MUST appear only when at least one event's scheduled date matches the viewer's local calendar "today"; when no events are dated today, the tonight hero zone MUST NOT be shown.
- **FR-006**: The pinned events zone MUST list events the user has marked as pinned for the active venue, with pin state persisted locally for the browser session until server-side pin storage is available in a later phase; pinned events MAY also appear in recent or upcoming zones when their scheduled dates fall within those windows.
- **FR-007**: The recent events zone MUST include events whose scheduled dates fall within the inclusive seven-calendar-day lookback before today (yesterday through seven days ago), sorted by event date descending; events dated today MUST NOT appear in this zone.
- **FR-008**: The upcoming events zone MUST include events whose scheduled dates fall within the inclusive thirty-calendar-day lookahead after today (tomorrow through thirty days ahead), sorted by event date ascending; events dated today MUST NOT appear in this zone.
- **FR-009**: Each priority zone (pinned, recent, upcoming) MUST remain visible with its section heading when it has no qualifying events, displaying a minimal empty message that identifies the zone (for example, "No pinned events").
- **FR-010**: Each event in every zone MUST be represented using the shared event card component, including quick links, alerts, and optional pin controls per that component's specification.
- **FR-011**: Activating an event card's main action MUST navigate the user to the corresponding event workspace for the active venue.
- **FR-012**: Activating a quick link on an event card MUST navigate the user to the event workspace with the focus target appropriate to that link.
- **FR-013**: The overview MUST reuse existing empty-state patterns for no-venue, no-events, loading, and error conditions, including permission-aware call-to-action visibility for venue creation; the overview MUST NOT provide a create-event action—event creation remains available only on the event management page (event workspace).
- **FR-014**: Zone visibility MUST update when the user changes active venue or when event data is refreshed, without requiring a full application reload.
- **FR-015**: Date-based zone assignment MUST use the viewer's local calendar date for "today" and boundary calculations in this release.
- **FR-016**: System MUST achieve ≥80% line/branch coverage across backend and frontend for this feature (CI-enforced; Constitution III). For this primarily frontend feature, coverage applies to the new overview page, zone sections, and partitioning logic; backend changes, if any, are included in the same gate.

### Key Entities

- **Dashboard Overview**: The top-level operational landing view at the application dashboard entry, composed of priority zones (pinned, tonight hero, upcoming, recent—in that order) and venue context controls.
- **Priority Zone**: A labeled section of the overview that surfaces a subset of events by operational relevance—tonight, pinned, recent, or upcoming.
- **Tonight Hero**: A prominent zone for events scheduled on the viewer's local calendar today.
- **Pinned Event Reference**: A user-selected event identifier associated with a venue, persisted locally until server-side pin sync ships.
- **Event Card**: The shared summary unit reused across zones, carrying title, date, status preview, alerts, quick links, and optional pin control.
- **Active Venue**: The venue context whose events populate all overview zones; switching venues replaces the entire event set and zone contents.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of signed-in users with an active venue and at least one event see the operational overview (not a ledger redirect) when navigating to the dashboard entry.
- **SC-002**: Users with an event dated today locate tonight's show in the hero zone on first page view without scrolling past unrelated zones in 95% of moderated usability sessions.
- **SC-003**: Zone partitioning correctly classifies a representative test matrix of event dates (today, within 7d past, outside 7d past, within 30d future, outside 30d future, pinned) with zero misclassification errors in automated acceptance tests.
- **SC-004**: Users reach the correct event workspace from an overview card in one click, with navigation completing in under 2 seconds under normal network conditions in 95% of test runs.
- **SC-005**: Empty and error states (no venues, no events, load failure) render with actionable guidance in 100% of automated test scenarios matching existing dashboard behavior.
- **SC-006**: ≥80% line/branch coverage achieved across backend and frontend code for this feature (CI-enforced; Constitution III).

## Assumptions

- The dashboard route split (dedicated event workspace URLs) and event card component are complete or will be sequenced immediately before this feature; the overview depends on both.
- Event lifecycle and date-partitioning utilities from the dashboard foundation work are available for classifying events into zones and driving card quick links.
- Pin persistence uses browser session storage for this phase; cross-device or cross-browser pin sync is deferred to a later API-backed phase.
- "Today" and all day-boundary calculations use the viewer's local calendar date; venue-timezone-aware dating is out of scope for v1.
- The interim dashboard entry redirect behavior is replaced by this overview; users with events no longer auto-redirect to a workspace when visiting the dashboard entry.
- No new server endpoints are required; the overview consumes the existing venue-scoped event list and partitions client-side.
- Quick link permission rules, variance alerts, and booking-status placeholder behavior follow the event card specification without change.
- Create-event flows are out of scope on the dashboard overview; users create events only from the event management page (event workspace). The overview no-events empty state provides informational guidance without a create-event call-to-action.
