# Feature Specification: Event Card Lifecycle Progress Bar

**Feature Branch**: `077-event-card-progress-bar`

**Created**: 2026-07-02

**Status**: Draft

**Input**: User description: "Anywhere an event card is shown it should have a progress bar at the bottom of it that shows what state the event is in. It should include holds, confirmed, event date, post-event. Each milestone should have a small bubble on the progress bar. Give it a theme-matching gradient."

## Clarifications

### Session 2026-07-02

- Q: Which surfaces should display the lifecycle progress bar? → A: Shared EventCard only — dashboard zones (tonight, upcoming, recent, pinned, lifecycle sections) in full and compact variants.
- Q: How should Hold 1 and Hold 2 appear on the progress bar? → A: Both highlight the same **Holds** bubble with identical fill position; tier distinction remains on the existing booking-status badge only.
- Q: How should milestone labels appear on compact event cards? → A: Compact cards show bubbles only; full milestone labels appear on hover or keyboard focus via tooltip.
- Q: How should compact milestone labels work on touch devices? → A: Tap a milestone bubble to toggle its label tooltip; tap outside or another bubble to dismiss.
- Q: How should the progress bar behave for cancelled booking placements? → A: Show the full bar with all milestones de-emphasized and no active bubble highlighted.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See event journey at a glance on dashboard cards (Priority: P1)

As a venue operator scanning the dashboard overview, I need a progress bar at the bottom of every event card that shows where the show is in its lifecycle—from tentative hold through confirmed booking, show day, and post-event follow-up—so I can prioritize attention without opening each event workspace.

**Why this priority**: The progress bar is the core deliverable. Without consistent placement on all event card surfaces, users cannot rely on it as a scanning aid across dashboard zones.

**Independent Test**: Render event cards in representative lifecycle states (hold, confirmed pre-show, show day, post-event) and confirm each card displays a bottom-mounted progress bar with four labeled milestone bubbles and a fill position that matches the event's current stage.

**Acceptance Scenarios**:

1. **Given** an event card is rendered in any dashboard zone (tonight, upcoming, recent, pinned, or lifecycle-grouped sections), **When** the card appears, **Then** a horizontal progress bar is visible along the bottom edge of the card beneath the main card content.
2. **Given** an event in Hold 1 or Hold 2 booking placement, **When** its card renders, **Then** the progress indicator highlights the **Holds** milestone bubble at the same fill position for both tiers (no sub-distinction on the bar).
3. **Given** an event with Confirmed booking placement and an event date in the future, **When** its card renders, **Then** the progress indicator highlights the **Confirmed** milestone bubble (holds segment completed).
4. **Given** an event with Confirmed placement whose event date is today, **When** its card renders, **Then** the progress indicator highlights the **Event date** milestone bubble.
5. **Given** an event whose event date is in the past, **When** its card renders, **Then** the progress indicator highlights the **Post-event** milestone bubble.
6. **Given** multiple event cards in a list or grid, **When** they render together, **Then** every card includes the progress bar in a consistent position and proportional width so users can compare stages while scanning.
7. **Given** an event with Cancelled booking placement, **When** its card renders, **Then** the progress bar shows all four milestones de-emphasized with no active bubble highlighted and no gradient fill implying forward progress.

---

### User Story 2 - Distinguish milestones with bubble markers (Priority: P1)

As a user comparing several shows on the dashboard, I need each lifecycle stage marked by a small bubble on the progress bar with a short label, so I understand what each stop represents without relying on color alone.

**Why this priority**: Bubbles and labels make the four-stage model legible and accessible; they are explicitly required in the feature request.

**Independent Test**: Inspect a single event card progress bar and verify four equally spaced milestone bubbles labeled Holds, Confirmed, Event date, and Post-event, with the active milestone visually emphasized.

**Acceptance Scenarios**:

1. **Given** any event card with a progress bar, **When** it renders, **Then** exactly four milestone bubbles appear on the bar at Holds, Confirmed, Event date, and Post-event positions.
2. **Given** a milestone is the event's current lifecycle stage, **When** the bar renders, **Then** that bubble is visually emphasized (e.g., larger, filled, or outlined) compared to inactive milestones.
3. **Given** milestones that the event has already passed, **When** the bar renders, **Then** those bubbles appear in a completed state distinct from both the active and upcoming milestones.
4. **Given** a user who relies on assistive technology, **When** the progress bar is announced, **Then** the current lifecycle stage is conveyed as text (not color alone) via an accessible name or label associated with the bar.

---

### User Story 3 - Brand-aligned gradient styling (Priority: P2)

As a user of the Montana High Country–themed product, I need the progress bar fill to use a theme-matching gradient drawn from the established brand palette, so the new control feels native to the dashboard rather than bolted on.

**Why this priority**: Visual cohesion supports trust and scanability; the user explicitly requested a theme-matching gradient.

**Independent Test**: Render event cards in light and dark theme contexts (if applicable) and confirm the progress bar track and fill use design-token-based brand colors with a gradient on the filled portion, with no legacy off-brand accent colors.

**Acceptance Scenarios**:

1. **Given** an event card progress bar, **When** it renders, **Then** the filled portion of the bar uses a smooth gradient derived from the product's primary brand accent and supporting earth-tone tokens (e.g., Alpine Sunset progressing into Lodgepole Brown).
2. **Given** the unfilled track behind the gradient, **When** the bar renders, **Then** it uses a subtle neutral from the established container or border token set so contrast remains readable on Pure White card surfaces.
3. **Given** compact event card layout (reduced vertical space), **When** the progress bar renders, **Then** the gradient and bubbles scale down proportionally without clipping; milestone bubbles are visible without inline text labels.
4. **Given** a compact event card progress bar, **When** the user hovers over or focuses a milestone bubble, **Then** a tooltip displays the full milestone label (Holds, Confirmed, Event date, or Post-event).
5. **Given** a compact event card on a touch device, **When** the user taps a milestone bubble, **Then** a tooltip displays that bubble's full label; tapping outside the bar or another bubble dismisses the tooltip.
6. **Given** a user with reduced vision, **When** the progress bar is viewed, **Then** active, completed, and upcoming milestone states meet minimum contrast requirements against the card background per project accessibility standards.

---

### User Story 4 - Compact cards and permission-safe rendering (Priority: P3)

As a user viewing upcoming events in compact card mode or events I can only partially act on, I still need the lifecycle progress bar so short cards communicate the same journey information as full-size dashboard cards.

**Why this priority**: Event cards ship in both full and compact variants across dashboard sections; omitting the bar from compact mode would create inconsistent mental models.

**Independent Test**: Render compact and full event cards for the same event state and confirm both show the progress bar with equivalent milestone resolution; confirm cards without quick-link permissions still show the bar.

**Acceptance Scenarios**:

1. **Given** an event card rendered with compact layout, **When** it appears, **Then** the bottom progress bar is present with the same four milestones and correct active position as the full-size card; bubbles are shown without inline text labels.
2. **Given** a compact event card progress bar, **When** the user hovers over or focuses a milestone bubble, **Then** a tooltip reveals the full milestone label for that stop.
3. **Given** a compact event card on a touch device, **When** the user taps a milestone bubble, **Then** a tooltip reveals that milestone's full label until dismissed by tapping outside or selecting another bubble.
4. **Given** a user who lacks permission for some quick links on a card, **When** the card renders, **Then** the progress bar still appears and reflects booking and calendar lifecycle state independent of permission filtering.
5. **Given** an event card with no quick links and only an Open workspace fallback, **When** it renders, **Then** the progress bar is still visible at the bottom of the card.

---

### Edge Cases

- What happens when event date is missing (Date TBD)? Treat the event as pre–event-date: progress stops at **Confirmed** (or **Holds** if still a hold) until a date is assigned; **Event date** and **Post-event** bubbles remain upcoming.
- What happens when booking placement is Cancelled? Show the full progress bar with all four milestone bubbles and track visible, but every milestone is de-emphasized with no active bubble highlighted and no forward gradient fill; do not imply the show is in Holds, Confirmed, or post-event.
- What happens when legacy events lack booking placement data? Treat as **Confirmed** per existing booking-calendar migration rules so historical shows display accurately.
- What happens when event date is today but booking is still Hold 1 or Hold 2? **Holds** milestone takes precedence over calendar date until promotion to Confirmed; Hold 1 and Hold 2 use the same bar position.
- What happens on very narrow viewports? Full-size cards keep abbreviated inline labels if needed; compact cards show bubbles only with full labels available via hover, focus, or tap tooltip; the bar does not overflow the card width.
- What happens when the dashboard refreshes while an event crosses midnight into show day or post-event? Progress position updates on the next render without user interaction.
- What happens for settled or reconciled financial states after the event date? Remain at **Post-event** milestone; financial settlement depth is out of scope for bubble granularity in this release.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST render a horizontal lifecycle progress bar on the bottom edge of every shared event card component instance used on dashboard overview zones (tonight, upcoming, recent, pinned, lifecycle-grouped sections), including full and compact layout variants. Mini-calendar day chips, combobox list rows, and other non-card event summaries are explicitly out of scope.
- **FR-002**: The progress bar MUST display exactly four milestones in fixed left-to-right order: **Holds**, **Confirmed**, **Event date**, **Post-event**.
- **FR-003**: Each milestone MUST be marked by a small circular or rounded bubble positioned on the bar at its corresponding stop.
- **FR-004**: Each milestone bubble MUST have a short text label identifying the stage. Full-size cards MUST show labels inline (full or abbreviated on narrow layouts). Compact cards MUST show bubbles only, with full labels revealed on hover, keyboard focus, or tap (touch) via tooltip; tap outside or on another bubble dismisses the tooltip.
- **FR-005**: The system MUST resolve the active milestone using booking placement status and calendar comparison to the event date:
  - **Holds**: booking placement is Hold 1 or Hold 2 (both tiers share the same bubble position and fill extent on the bar)
  - **Confirmed**: booking placement is Confirmed (or treated as Confirmed when placement is absent) and event date is in the future
  - **Event date**: booking is Confirmed (or legacy equivalent), event date is today
  - **Post-event**: event date is in the past
- **FR-006**: Segments of the bar before the active milestone MUST appear filled; segments after MUST appear unfilled or de-emphasized.
- **FR-007**: The filled portion of the bar MUST use a theme-matching gradient based on established brand design tokens (not ad-hoc hex values unrelated to the theme system).
- **FR-008**: Cancelled booking placements MUST display the full progress bar with all four milestones visible but fully de-emphasized: no active bubble highlighted, no forward gradient fill, and no milestone treated as current.
- **FR-009**: Progress bar state MUST be derivable from event data already available on event cards (booking placement status and event date); no additional user action is required to populate the bar.
- **FR-010**: The progress bar MUST NOT replace existing booking-status badges or lifecycle status labels on the card; it complements them as a timeline summary.
- **FR-011**: The progress bar MUST expose an accessible text description of the current lifecycle stage for screen readers. On compact cards, per-milestone labels MUST remain available via tooltip on hover/focus in addition to the bar-level accessible name.
- **FR-012**: Automated tests MUST cover milestone resolution for hold, confirmed, show-day, post-event, missing-date, cancelled (all milestones de-emphasized, no active bubble), and legacy-no-placement fixtures across full and compact card layouts.
- **FR-013**: The feature MUST achieve ≥80% line/branch coverage across backend and frontend for touched code (CI-enforced; Constitution III). No backend changes are anticipated; frontend coverage applies to the progress bar utility, event card integration, and tests.

### Key Entities

- **Event Card**: A dashboard UI unit summarizing one event; hosts title, date, alerts, quick links, and—after this feature—a bottom lifecycle progress bar.
- **Lifecycle Milestone**: One of four ordered stages on the progress bar (Holds, Confirmed, Event date, Post-event) represented by a labeled bubble.
- **Progress Position**: The derived active milestone and fill extent for a given event, computed from booking placement status and calendar-relative event date. Cancelled placements yield no active milestone—all bubbles de-emphasized.
- **Booking Placement Status**: Scheduling state (Hold 1, Hold 2, Confirmed, Cancelled) already carried on event card data from the unified booking calendar model.
- **Brand Gradient Fill**: The visually filled portion of the progress track using theme token colors in a smooth gradient.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of acceptance scenarios in User Stories 1–4 pass in automated component and utility tests.
- **SC-002**: Users can identify the current lifecycle stage of an event from the progress bar alone within 2 seconds of scanning a dashboard zone (validated via usability review or test assertions on active milestone labels).
- **SC-003**: Every event card rendering path used on the dashboard overview (full and compact) includes the progress bar in 100% of tested fixtures.
- **SC-004**: Milestone resolution matches defined rules in 100% of tested combinations (hold, confirmed, show-day, post-event, cancelled with all milestones de-emphasized, missing date, legacy placement).
- **SC-005**: Progress bar colors are sourced exclusively from the project's design token theme; zero hardcoded off-brand palette values in new styles (verified by style/token audit or regression test).
- **SC-006**: Active milestone state meets project WCAG contrast requirements against the card background in audited fixtures.
- **SC-007**: ≥80% line/branch coverage achieved across backend and frontend code for this feature (CI-enforced; Constitution III).

## Assumptions

- "Event card" means the shared reusable event card component on dashboard overview zones only (lifecycle zones, tonight, upcoming, recent, pinned) in full and compact variants. Mini-calendar day chips and searchable combobox list rows are out of scope for this release and will not receive the progress bar.
- Booking placement statuses Hold 1, Hold 2, Confirmed, and Cancelled follow the unified booking calendar model (spec 073); legacy events without placement data are treated as Confirmed.
- **Post-event** is determined by calendar date after the event date, not by financial settlement status; settled and reconciled events that are past their event date remain at the Post-event milestone.
- **Event date** milestone activation uses the venue-local calendar day of the stored event date, consistent with existing dashboard lifecycle date utilities.
- Theme-matching gradient uses Montana High Country brand tokens (spec 058/059)—Alpine Sunset and Lodgepole Brown family colors—for the fill; exact gradient stops are a design implementation detail within those tokens.
- The progress bar is read-only on the card; changing lifecycle state continues to happen through booking calendar actions and existing workspace flows.
- No new API fields are required; booking placement status and event date are already present on event card payloads.

## Dependencies

- **025-event-card**: Base event card component and layout contract this feature extends.
- **024-event-lifecycle-card-label**: Shared lifecycle vocabulary; progress bar complements but does not duplicate status badge text.
- **073-unified-booking-calendar**: Booking placement statuses (Hold 1, Hold 2, Confirmed, Cancelled) that drive the Holds and Confirmed milestones.
- **058-brand-theming-mhc / 059-mhc-design-tokens**: Brand palette and design tokens for gradient styling.
- **071-wcag-contrast-audit**: Contrast expectations for active/inactive milestone states.
