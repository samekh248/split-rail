# Feature Specification: Vertical Navigation Architecture

**Feature Branch**: `022-vertical-navigation`

**Created**: 2026-06-18

**Status**: Draft

**Input**: User description: "Vertical Navigation — Navigation Architecture Overhaul (Linear SPLR-62)"

## Clarifications

### Session 2026-06-18

- Q: Which left-rail global item should be active/highlighted while the user is on Settings pages (`/settings`, `/settings/team`, etc.)? → A: No global item is highlighted on settings pages (settings is outside the global module tree).
- Q: Which routes use the new two-tier navigation shell (left rail + sticky top bar)? → A: All authenticated routes use the new shell (dashboard, create-venue, all settings pages); only auth, onboarding, and accept-invite flows are excluded.
- Q: Where should the organization name appear after the legacy header is removed? → A: Top bar — organization name appears in the sticky contextual top bar on all shell pages.
- Q: Should Settings pages keep the legacy "Back to dashboard" control now that global left-rail navigation exists? → A: Remove the "Back to dashboard" control; dashboard navigation uses the global left-rail Dashboard item only.
- Q: How should unimplemented global modules (Booking Calendar, Settlements/Accounting Sync) behave when a user tries to activate them? → A: Disabled + labeled — items appear in the rail with a "Coming soon" indicator; clicks do nothing.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Global and contextual navigation are clearly separated (Priority: P1)

As an authenticated organization member working in the venue dashboard, I need a persistent left-side navigation rail for application-wide destinations and a sticky top bar for page-specific controls (venue selection, event selection, and workspace actions), so I can orient myself quickly and access tools relevant to my current view without cluttering the main workspace.

**Why this priority**: This is the foundational layout change. Without a clear split between global and contextual navigation, every subsequent interaction (collapse, mobile drawer, profile menu) lacks a stable shell to attach to.

**Independent Test**: Sign in and land on the dashboard. Confirm a full-height left rail lists global destinations, a top bar spans the remaining width above the main content and holds venue/event workspace controls, and the main canvas sits below the top bar beside the rail. The layout remains usable while scrolling a long ledger page.

**Acceptance Scenarios**:

1. **Given** an authenticated user on any primary workspace screen, **When** the page loads, **Then** a left navigation rail spans the full viewport height and a top bar sits above the main content area to the right of the rail.
2. **Given** a long scrollable page such as an event ledger, **When** the user scrolls vertically, **Then** the top bar remains visible at the top of the viewport and the left rail remains fixed.
3. **Given** the dashboard workspace, **When** the user views the top bar, **Then** venue switching, event selection, and permitted workspace actions appear there rather than mixed into the global left rail.
4. **Given** a settings sub-page with section navigation, **When** the user views the page, **Then** settings section links appear in the contextual top area rather than duplicating global destinations in the left rail, and no separate "Back to dashboard" control is shown.
5. **Given** an authenticated user on create-venue or any settings route, **When** the page loads, **Then** the same two-tier navigation shell (left rail + sticky top bar) is used as on the dashboard workspace.
6. **Given** any authenticated page using the new shell, **When** the page renders, **Then** the organization name is visible in the sticky top bar.

---

### User Story 2 - Sidebar expand, collapse, and hover overlay behave predictably on desktop (Priority: P2)

As a power user on a wide screen, I need to pin the sidebar open for readability, collapse it to reclaim horizontal space, and temporarily expand it on hover when collapsed, so I can balance label clarity with dense ledger views.

**Why this priority**: Collapse and hover behaviors are the highest-interaction refinements called out in SPLR-62 and directly affect daily ledger work, but they depend on the P1 shell existing first.

**Independent Test**: On a desktop-width viewport with the sidebar collapsed, hover over the rail after a brief pause and confirm labels appear in an overlay without shifting page content; move the pointer away and confirm immediate collapse. Click pin while hovered and confirm the sidebar locks open and content reflows.

**Acceptance Scenarios**:

1. **Given** the sidebar in its default expanded (pinned) state, **When** the user activates the collapse control, **Then** the rail narrows to icon-only width, text labels hide, and the main content area widens to use the reclaimed space.
2. **Given** the sidebar in collapsed state, **When** the user activates the expand/pin control, **Then** the rail returns to full width with visible labels and pushes the main content accordingly.
3. **Given** the sidebar in collapsed state, **When** the user rests the pointer over the rail for approximately one quarter second, **Then** the rail expands to full width with labels visible.
4. **Given** a hover-expanded sidebar, **When** the expansion completes, **Then** it overlays the main content and top bar without shifting them horizontally.
5. **Given** a hover-expanded sidebar, **When** the pointer leaves the rail boundaries, **Then** the rail retracts to collapsed width immediately.
6. **Given** a hover-expanded sidebar, **When** the user activates pin/expand while hovered, **Then** the sidebar locks in expanded (pinned) state and the main content reflows to accommodate the wider rail.
7. **Given** the user moves the pointer quickly across the collapsed rail without resting, **When** less than approximately one quarter second elapses before exit, **Then** the hover expansion does not activate.

---

### User Story 3 - Active wayfinding persists across nested views (Priority: P3)

As a user navigating into nested sections of a global area, I need the left rail to keep highlighting the parent global destination while contextual sub-navigation appears in the top bar, so I always know which major application area I am in.

**Why this priority**: Prevents disorientation when sub-tabs or filters live in the top bar while the user is still conceptually inside one global module.

**Independent Test**: Navigate to a nested sub-view within a global destination (e.g., dashboard workspace). Confirm the corresponding left-rail item remains visually active while contextual items appear only in the top bar. Navigate to Settings and confirm no global left-rail item is highlighted.

**Acceptance Scenarios**:

1. **Given** a user on a nested page belonging to a global destination, **When** the page renders, **Then** the matching global item in the left rail shows an active/highlighted state.
2. **Given** an active global destination with sub-navigation, **When** the user switches sub-tabs or sections in the top bar, **Then** the left-rail active state remains on the parent global destination.
3. **Given** a user navigates to a different global destination, **When** the new page loads, **Then** active highlighting moves to the newly selected global item and contextual top items update to match the new view.
4. **Given** a user on any Settings page (hub or sub-section), **When** the page renders, **Then** no global left-rail item shows an active/highlighted state.

---

### User Story 4 - Account actions live in a profile menu at the bottom of the rail (Priority: P4)

As an authenticated user, I need my avatar anchored at the bottom of the left rail to open a menu containing Settings and Sign out, so account actions are centralized and removed from legacy header clutter.

**Why this priority**: Consolidating account actions completes the navigation overhaul and removes duplicate Settings/Sign out controls from the old header pattern, but it is secondary to establishing the new layout shell.

**Independent Test**: Open the profile menu from both expanded and collapsed rail states. Confirm Settings navigates to the settings hub, Sign out ends the session, and legacy header Settings/Sign out controls are absent.

**Acceptance Scenarios**:

1. **Given** the sidebar in expanded state, **When** the page renders, **Then** the profile badge at the bottom shows the user's avatar and display name.
2. **Given** the sidebar in collapsed state, **When** the page renders, **Then** the profile badge shows only the avatar without the display name.
3. **Given** the profile badge, **When** the user activates it, **Then** a dropdown menu opens with Settings and Sign out actions.
4. **Given** an open profile menu, **When** the user chooses Settings, **Then** they navigate to the settings hub and the menu closes.
5. **Given** an open profile menu, **When** the user chooses Sign out, **Then** the session ends and the menu closes.
6. **Given** an open profile menu, **When** the user clicks outside the menu, presses Escape, or selects any menu item, **Then** the menu closes.
7. **Given** any authenticated workspace screen using the new layout, **When** the page renders, **Then** standalone Settings and Sign out controls are not shown in the legacy top header area.

---

### User Story 5 - Mobile and tablet users reach global navigation through a drawer (Priority: P5)

As a user on a phone or narrow tablet, I need global navigation hidden by default and reachable through a menu control in the top bar, so the workspace remains usable on small screens.

**Why this priority**: Responsive behavior is required for completeness but affects a narrower form factor and builds on the P1 shell.

**Independent Test**: Resize to a narrow viewport. Confirm the left rail is not permanently visible, a menu control appears in the top bar, tapping it opens a full-height drawer with global destinations and profile actions, and tapping outside or close dismisses the drawer.

**Acceptance Scenarios**:

1. **Given** a viewport narrower than a tablet breakpoint, **When** the workspace loads, **Then** the desktop left rail is not permanently shown in the layout flow.
2. **Given** a narrow viewport, **When** the user views the top bar, **Then** a menu control is available to open global navigation.
3. **Given** a narrow viewport, **When** the user opens the menu control, **Then** global navigation appears as a drawer sliding in from the left over the page.
4. **Given** an open navigation drawer, **When** the user taps outside the drawer, taps a close control, or selects a global destination, **Then** the drawer closes.
5. **Given** an open navigation drawer, **When** the user accesses profile actions from the drawer, **Then** Settings and Sign out remain available without a separate legacy header.

---

### Edge Cases

- **Sidebar preference persistence**: If the user pins or collapses the sidebar, their choice persists across page navigations within the same browser session; returning later in a new session restores the default expanded (pinned) state unless a saved preference feature is added later.
- **Rapid hover flicker**: Quick pointer passes over a collapsed rail must not flash the overlay expansion.
- **Overlay vs. pinned transition**: Pinning from hover must not leave the main content in an inconsistent width state.
- **Keyboard access**: Collapse/pin control, profile menu, and mobile drawer open/close must be operable without a pointer.
- **Focus management**: Opening the mobile drawer or profile menu moves focus into the overlay; closing returns focus to the triggering control.
- **Permission-gated destinations**: Global items the user cannot access remain hidden or unreachable according to existing permission rules; layout changes do not bypass gating established by settings and workspace features.
- **Unimplemented global modules**: Placeholder global destinations (Booking Calendar, Settlements/Accounting Sync) appear in the left rail with a visible "Coming soon" indicator, are non-interactive (clicks do nothing), and must not navigate to broken routes.
- **Settings sub-navigation**: Team, Organization, and Integrations section links continue to respect permission gating defined in feature 016 while living in the contextual top area.
- **Settings active state**: Settings is reached via the profile menu, not the global left rail; no global left-rail item is highlighted on Settings pages.
- **Shell scope**: Create-venue and all settings routes use the same global navigation shell as the dashboard; only unauthenticated auth screens, organization onboarding, and accept-invite remain on legacy layouts.
- **Organization context**: The organization name appears in the sticky top bar on all shell pages, replacing its former placement in the legacy header.
- **Settings back navigation**: The legacy "Back to dashboard" button is removed from settings pages; the global Dashboard left-rail item is the canonical return path.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST present all authenticated application pages (dashboard workspace, create-venue, and all settings routes) using a two-tier navigation model: a full-height left rail for global application destinations and a sticky top bar for page-specific controls. Auth, onboarding, and accept-invite flows remain outside this shell.
- **FR-002**: System MUST keep the left rail fixed for the full viewport height on desktop-class layouts.
- **FR-003**: System MUST keep the top bar sticky at the top of the viewport while the user scrolls long content.
- **FR-004**: System MUST place venue selection, event selection, and permitted workspace actions in the contextual top bar on dashboard workspace screens rather than in the global left rail.
- **FR-004a**: System MUST display the current organization name in the sticky top bar on every authenticated page using the new navigation shell.
- **FR-005**: System MUST support three desktop sidebar configurations: expanded (pinned), collapsed (icon-only), and expanded via hover overlay when collapsed.
- **FR-006**: System MUST provide a visible control to collapse an expanded (pinned) sidebar and to expand/pin a collapsed sidebar.
- **FR-007**: When collapsed, the sidebar MUST hide text labels and show only icons until expanded.
- **FR-008**: Hover expansion from collapsed state MUST wait approximately one quarter second before opening to avoid accidental activation.
- **FR-009**: Hover-expanded sidebar MUST overlay main content without shifting layout; pinned expansion MUST reflow main content width.
- **FR-010**: Hover-expanded sidebar MUST retract immediately when the pointer leaves the rail boundaries.
- **FR-011**: System MUST allow the user to pin the sidebar open from a hover-expanded state, locking it in expanded (pinned) mode.
- **FR-012**: System MUST visually highlight the active global destination in the left rail when the user is on that destination or any of its nested sub-pages. Settings pages are outside the global module tree; on any Settings route, no global left-rail item MUST show an active/highlighted state.
- **FR-013**: System MUST render contextual sub-navigation (tabs, section links, filters, or tools) in the top bar for views that require it, including settings section navigation. Settings pages MUST NOT include a legacy "Back to dashboard" control; users return to the dashboard via the global left-rail Dashboard item.
- **FR-014**: System MUST anchor a profile badge at the bottom of the left rail showing the signed-in user's avatar; display name appears only when the rail is expanded or in mobile drawer mode.
- **FR-015**: Activating the profile badge MUST open a menu containing Settings and Sign out.
- **FR-016**: System MUST remove standalone Settings and Sign out controls from the legacy header area on screens using the new layout.
- **FR-017**: Profile menu MUST close when the user selects an item, clicks outside the menu, or presses Escape.
- **FR-018**: On viewports narrower than a tablet breakpoint, system MUST hide the permanent desktop rail and expose global navigation through a top-bar menu control that opens a left drawer overlay.
- **FR-019**: Mobile navigation drawer MUST close when the user dismisses it, selects a destination, or activates a close control.
- **FR-020**: Global left-rail destinations MUST include at minimum the dashboard workspace; additional global modules referenced in SPLR-62 that are not yet productized MUST appear as visibly disabled placeholders labeled "Coming soon" — non-interactive, with no navigation on click.
- **FR-021**: Navigation changes MUST NOT alter existing permission rules for settings, team management, venue creation, or event management.
- **FR-022**: System MUST achieve ≥80% line/branch coverage across backend and frontend for this feature (CI-enforced; Constitution III).

### Key Entities

- **Global Navigation Item**: A top-level application destination shown in the left rail (e.g., dashboard workspace, future booking or accounting modules).
- **Contextual Navigation Item**: A page-specific control shown in the top bar (e.g., venue switcher, event selector, settings section link).
- **Sidebar State**: The user's current rail configuration — expanded (pinned), collapsed, or hover-expanded overlay.
- **Profile Menu**: Dropdown anchored to the profile badge containing Settings and Sign out.
- **Navigation Drawer**: Temporary mobile overlay containing global destinations and profile actions.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In moderated usability checks, 90% of participants can identify which global area they are in and locate page-specific controls within 10 seconds on first visit after the change.
- **SC-002**: On desktop, users can collapse the sidebar and regain usable ledger width without losing access to global destinations via icons or hover expansion.
- **SC-003**: On viewports below the tablet breakpoint, 100% of tested global destinations remain reachable through the drawer menu without horizontal scrolling of the shell.
- **SC-004**: Zero standalone Settings or Sign out controls remain in the legacy header on authenticated screens using the new layout; organization name is present in the top bar instead of the removed legacy header.
- **SC-005**: Active global highlighting remains correct across 100% of defined nested-route test cases for global destinations (dashboard workspace nested views show the correct parent highlight; all Settings routes show no global item highlighted).
- **SC-006**: ≥80% line/branch coverage achieved across backend and frontend code for this feature (CI-enforced; Constitution III).

## Assumptions

- SPLR-62 is a frontend layout and navigation UX feature; no new backend endpoints or data models are required unless persistence of sidebar pin preference is later promoted to a user-preference API.
- The dashboard workspace (venue/event selection and ledger) is the only fully implemented global destination at delivery time. "Booking Calendar" and "Settlements/Accounting Sync" appear in the left rail as disabled placeholders labeled "Coming soon"; they are visible but non-interactive until their respective feature specs ship.
- Settings remains reachable via the profile menu only (not a global left-rail destination); settings section navigation (Team, Organization, Integrations) moves into the contextual top bar and continues to follow permission rules from feature 016. Settings pages are outside the global module tree and do not activate any left-rail global highlight.
- Auth, onboarding, and accept-invite flows remain outside the new navigation shell and keep their existing layouts. All other authenticated routes (dashboard workspace, create-venue, settings hub, and settings sub-pages) use the new two-tier shell.
- The organization name is shown in the sticky top bar on all shell pages, not in the left rail or legacy header.
- Sidebar pin/collapse preference persists for the browser session only; cross-device or cross-session persistence is out of scope for v1.
- Existing Vitest + React Testing Library patterns from features 006–017 apply to navigation shell, sidebar states, profile menu, and mobile drawer behavior.
- The tablet/mobile breakpoint aligns with common small-tablet widths (approximately 768 CSS pixels) as described in SPLR-62.
