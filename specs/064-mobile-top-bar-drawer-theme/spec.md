# Feature Specification: Mobile Top Bar and Navigation Drawer Theming

**Feature Branch**: `064-mobile-top-bar-drawer-theme`

**Created**: 2026-06-24

**Status**: Draft

**Input**: User description: "Theme mobile top bar and navigation drawer" ([Linear SPLR-87](https://linear.app/audiodex/issue/SPLR-87/theme-mobile-top-bar-and-navigation-drawer))

**Linear Issue**: [SPLR-87](https://linear.app/audiodex/issue/SPLR-87/theme-mobile-top-bar-and-navigation-drawer)

**Project Milestone**: M3 — Shell & navigation theming

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Branded mobile top bar matches desktop sidebar (Priority: P1)

A venue operator uses Split-Rail on a phone or narrow viewport. The persistent top bar uses the same Lodgepole Brown background and cream text treatment as the desktop sidebar, so mobile chrome feels like a cohesive extension of the brand rather than an unstyled overlay on the cream page background.

**Why this priority**: The top bar is always visible on mobile and is the first branded surface users see after the page loads. Aligning it with the sidebar establishes visual continuity across breakpoints.

**Independent Test**: Can be fully tested by loading any authenticated page at a mobile viewport width (768px or below) without opening the drawer and confirming the top bar background is Lodgepole Brown with cream text and controls.

**Acceptance Scenarios**:

1. **Given** an authenticated user on a viewport at or below the mobile breakpoint (768px), **When** the top bar renders, **Then** the bar background uses the Lodgepole Brown brand color and primary text uses the cream-on-dark treatment consistent with the desktop sidebar.
2. **Given** the mobile top bar is visible, **When** the user views the organization name and centered brand logo, **Then** both remain legible against the brown background without contrast failures.
3. **Given** the mobile top bar, **When** the user has not opened the navigation drawer, **Then** the top bar retains its branded appearance with no flash of unstyled or default light-theme chrome during initial load or route changes.

---

### User Story 2 - Branded mobile navigation drawer (Priority: P1)

A user opens the mobile fly-out navigation drawer. The drawer panel, header, navigation links, and profile area use the same brown-and-cream palette as the desktop sidebar, with the full Split-Rail wordmark centered or prominently placed at the top per the logo navigation milestone.

**Why this priority**: The drawer is the primary global navigation surface on mobile. Inconsistent theming between drawer and sidebar undermines the rebrand and creates a jarring transition when users switch between desktop and mobile.

**Independent Test**: Can be fully tested by opening the mobile navigation drawer on a narrow viewport and confirming the panel background, text, links, and close control all use the branded dark-shell palette matching the sidebar.

**Acceptance Scenarios**:

1. **Given** a user on a mobile viewport, **When** they open the navigation drawer, **Then** the drawer panel background is Lodgepole Brown and body text is cream, matching the desktop sidebar treatment.
2. **Given** the mobile drawer is open, **When** the user views the header area, **Then** the full Split-Rail wordmark (text variant) appears at the top with adequate spacing from the close control and navigation links.
3. **Given** the drawer is opening or closing, **When** the animation or visibility transition occurs, **Then** no flash of unstyled or light-theme content appears in the drawer panel or backdrop.
4. **Given** the drawer is open, **When** the user interacts with navigation links and the profile area, **Then** interactive elements remain readable and visually consistent with sidebar navigation styling.

---

### User Story 3 - Accessible mobile menu controls (Priority: P2)

A user on a touch device taps the hamburger menu button to open navigation and the close control to dismiss it. Both controls are easy to hit, visually clear on the brown chrome, and meet minimum touch-target expectations.

**Why this priority**: Mobile navigation is touch-first. Undersized or low-contrast controls cause mis-taps and frustration, especially for operators using the app on venue floors.

**Independent Test**: Can be fully tested by measuring the menu open button and drawer close button on a mobile viewport and confirming cream iconography on brown backgrounds with touch targets of at least 44px where layout permits.

**Acceptance Scenarios**:

1. **Given** the mobile top bar with the menu button visible, **When** the user views the hamburger control, **Then** the icon appears in cream on the brown bar background.
2. **Given** the mobile menu open button and drawer close button, **When** touch target dimensions are measured, **Then** each interactive control is at least 44px in width and height where layout constraints allow.
3. **Given** a keyboard or assistive-technology user, **When** focus moves to the menu open or close controls, **Then** a visible focus indicator appears that meets the same cream-on-brown contrast pattern as other shell controls.

---

### User Story 4 - Regression-safe themed mobile shell (Priority: P2)

A developer or QA engineer modifies shell navigation in the future. Automated tests confirm the mobile drawer and top bar render with the expected branded styling classes and color treatment, preventing silent regressions during layout or navigation refactors.

**Why this priority**: Shell components are high-churn. Automated verification protects the branding investment and satisfies the project's quality gate for test coverage.

**Independent Test**: Can be fully tested by running the mobile navigation shell automated test suite and confirming assertions pass for themed top bar and drawer rendering.

**Acceptance Scenarios**:

1. **Given** the mobile navigation test suite, **When** executed, **Then** tests verify the drawer renders with the branded dark-shell background and cream text treatment.
2. **Given** the mobile top bar test suite, **When** executed at mobile viewport width, **Then** tests verify the top bar uses the branded brown-bar treatment and the menu button uses cream iconography on brown.
3. **Given** coverage metrics for changed shell components, **When** the continuous integration build runs, **Then** line and branch coverage for this feature meets or exceeds the 80% threshold.

---

### Edge Cases

- What happens at the exact mobile breakpoint boundary (768px)? Themed mobile chrome MUST apply only when the sidebar is hidden and mobile navigation mode is active; desktop sidebar theming MUST remain unchanged above the breakpoint.
- What happens when the drawer opens before styles finish loading? The drawer MUST NOT display a flash of unstyled light-theme content; branded colors MUST be present from the first painted frame of the open drawer.
- What happens when contextual content (e.g., workspace actions) occupies the top bar trailing area on very narrow screens? Branded colors MUST persist and controls MUST not overlap the centered wordmark; organization name MAY be truncated but MUST remain legible.
- What happens when the user rapidly opens and closes the drawer? Color and layout MUST remain stable without flicker attributable to missing theme classes.
- What happens when navigation links inside the drawer include active or hover states? Interactive states MUST use the same hover/focus overlay patterns established for sidebar navigation links.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: On viewports at or below 768px (the project's mobile breakpoint), the top bar MUST use a Lodgepole Brown background with cream primary text, defaulting to the brown-bar treatment for consistency with the desktop sidebar.
- **FR-002**: On mobile viewports, the hamburger/menu open button MUST display a cream icon on the brown top bar background.
- **FR-003**: The mobile navigation drawer panel MUST use a Lodgepole Brown background with cream text, matching the desktop sidebar color treatment.
- **FR-004**: The mobile drawer header MUST display the full Split-Rail wordmark (text variant), centered or prominently placed per the logo navigation milestone, with adequate spacing from adjacent controls.
- **FR-005**: Drawer open and close transitions MUST NOT produce a visible flash of unstyled or light-theme content in the drawer panel or top bar.
- **FR-006**: Mobile menu open and drawer close controls MUST have touch targets of at least 44px in width and height where layout constraints allow.
- **FR-007**: Focus indicators on mobile shell controls (menu button, drawer close, navigation links) MUST remain visible and meet contrast expectations on brown backgrounds.
- **FR-008**: Mobile drawer navigation links and profile area MUST use interactive hover/focus treatments consistent with the themed desktop sidebar.
- **FR-009**: Desktop shell appearance above 768px MUST NOT regress; sidebar theming and non-mobile top bar behavior remain unchanged.
- **FR-010**: Automated tests MUST verify mobile top bar and drawer render with the expected branded styling.
- **FR-011**: System MUST achieve ≥80% line/branch coverage across backend and frontend for this feature (CI-enforced; Constitution III).

### Key Entities

- **Mobile shell chrome**: The top bar and fly-out drawer surfaces visible when the desktop sidebar is hidden at mobile breakpoints; carries brand colors, logo placement, and primary navigation entry points.
- **Brand color tokens**: Named Lodgepole Brown and Canvas Cream values from the Montana High Country design token foundation; the single source of truth for shell background and text pairings.
- **Navigation drawer state**: Open or closed visibility of the mobile fly-out panel; governs when drawer-themed surfaces are painted and when focus is trapped inside the panel.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of authenticated mobile viewport sessions (≤768px) display a Lodgepole Brown top bar with cream text on initial page load without a visible unstyled flash.
- **SC-002**: 100% of mobile drawer open actions render the brown panel with cream text from the first visible frame, with no reported flash of unstyled content during QA review across supported mobile browsers.
- **SC-003**: Menu open and drawer close controls meet a minimum 44×44px touch target on standard mobile test viewports (375px and 390px widths).
- **SC-004**: Brand consistency review confirms mobile top bar, mobile drawer, and desktop sidebar use matching brown-and-cream pairings with no ad-hoc hex values outside the token foundation.
- **SC-005**: Automated mobile shell tests pass in continuous integration with assertions covering themed top bar and drawer rendering.
- **SC-006**: ≥80% line/branch coverage achieved across backend and frontend code for this feature (CI-enforced; Constitution III).

## Assumptions

- Montana High Country design tokens (M1) are available and define Lodgepole Brown (`#3E2723`), Canvas Cream (`#F4F1EA`), and derived semantic tokens for text-on-dark and hover overlays.
- Logo navigation wiring (M2, SPLR-84) delivers the centered wordmark in the mobile top bar and wordmark in the drawer header; this feature applies theming around those placements without changing logo variant selection logic.
- Desktop sidebar theming is already complete and serves as the visual reference for mobile drawer and top bar color treatment.
- The mobile breakpoint remains 768px, consistent with existing shell layout rules that hide the sidebar slot below this width.
- The default top bar treatment is brown bar with cream text; an alternate cream bar with brown text is out of scope unless explicitly requested in a future change.
- Hamburger and close controls will use standard iconography from the project's established icon system rather than Unicode placeholders, aligning with shell iconography conventions.
- No backend API or data model changes are required; this is a presentation-layer theming feature scoped to mobile shell components.
