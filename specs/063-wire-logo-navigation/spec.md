# Feature Specification: Dynamic Logo in Navigation Shell

**Feature Branch**: `063-wire-logo-navigation`

**Created**: 2026-06-24

**Status**: Draft

**Input**: User description: "Wire dynamic logo swapping into sidebar and mobile navigation" (Linear [SPLR-84](https://linear.app/audiodex/issue/SPLR-84/wire-dynamic-logo-swapping-into-sidebar-and-mobile-navigation))

**Linear Issue**: [SPLR-84](https://linear.app/audiodex/issue/SPLR-84/wire-dynamic-logo-swapping-into-sidebar-and-mobile-navigation)

**Project Milestone**: M2 — Logo assets & navigation branding

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Desktop sidebar logo adapts to rail width (Priority: P1)

A venue operator uses the application on a desktop or wide tablet. When the left navigation rail is expanded (pinned or hover-expanded with labels visible), they see the full Split-Rail wordmark centered at the top of the rail. When the rail is collapsed to icon-only width, the logo automatically switches to the compact badge mark, still centered as the visual anchor above navigation links.

**Why this priority**: The desktop sidebar is the primary navigation frame on every authenticated screen. Dynamic logo swapping is the core deliverable of this milestone and must work before mobile placements can complete the branded shell.

**Independent Test**: Can be fully tested by toggling sidebar expanded and collapsed states on a desktop viewport and confirming the wordmark appears when labels are shown and the badge appears when the rail is minimized, without overlapping navigation items.

**Acceptance Scenarios**:

1. **Given** an authenticated user with the sidebar expanded (labels visible), **When** the navigation rail renders, **Then** the full Split-Rail wordmark appears centered at the top of the rail.
2. **Given** an authenticated user with the sidebar collapsed (icon-only rail), **When** the navigation rail renders, **Then** the compact Split-Rail badge appears centered at the top of the minimized rail.
3. **Given** a user temporarily expands the collapsed rail via hover (labels visible), **When** the hover overlay is active, **Then** the wordmark variant is shown; when hover ends, **Then** the badge variant returns.
4. **Given** the logo is displayed in wordmark mode in the sidebar, **When** spacing is measured, **Then** at least 24px of padding separates the logo from adjacent navigation chrome and link items.
5. **Given** the user activates the brand logo control, **When** the action completes, **Then** they are returned to the dashboard home view.

---

### User Story 2 - Mobile fly-out drawer shows wordmark at top (Priority: P1)

A user on a phone or narrow viewport opens the mobile navigation drawer. They see the full Split-Rail wordmark prominently at the top of the drawer panel, establishing brand identity before they scan navigation links.

**Why this priority**: The mobile drawer is the primary global navigation surface when the desktop sidebar is hidden. Brand presence here matches the PRD requirement for wordmark placement in mobile fly-out navigation.

**Independent Test**: Can be fully tested by opening the mobile navigation drawer on a narrow viewport and confirming the wordmark appears at the top of the drawer without crowding the close control or navigation links.

**Acceptance Scenarios**:

1. **Given** a user on a mobile viewport, **When** they open the navigation fly-out drawer, **Then** the full Split-Rail wordmark appears at the top of the drawer panel.
2. **Given** the mobile drawer is open with the wordmark visible, **When** the user views navigation links below, **Then** the logo does not overlap or obscure any nav items.
3. **Given** the wordmark in the mobile drawer header, **When** spacing is measured, **Then** at least 24px of padding separates the logo from surrounding drawer chrome.

---

### User Story 3 - Mobile top bar shows centered wordmark when sidebar is hidden (Priority: P2)

A user on a mobile viewport sees the persistent top bar while the left sidebar is hidden. The full Split-Rail wordmark appears centered in the top bar (alongside the menu control and organization context), reinforcing brand identity without requiring them to open the drawer.

**Why this priority**: The PRD specifies wordmark placement in either the mobile top bar or drawer header; delivering both placements ensures brand visibility in the always-visible chrome as well as the drawer.

**Independent Test**: Can be fully tested by loading any authenticated shell page on a mobile viewport without opening the drawer and confirming the centered wordmark is visible in the top bar.

**Acceptance Scenarios**:

1. **Given** a user on a mobile viewport with the sidebar hidden, **When** the top bar renders, **Then** the full Split-Rail wordmark appears centered in the top bar area.
2. **Given** the mobile top bar with centered wordmark, **When** the user views the menu button and organization name, **Then** the logo does not overlap those controls and remains visually balanced.
3. **Given** the wordmark in the mobile top bar, **When** spacing is measured, **Then** adequate padding prevents the logo from touching adjacent top-bar elements.

---

### User Story 4 - Regression-safe navigation shell integration (Priority: P2)

A developer or QA engineer changes navigation shell behavior in the future. Automated tests confirm logo variant selection tracks sidebar state on desktop and that mobile placements render the wordmark, preventing silent regressions in brand presentation.

**Why this priority**: Navigation shell components are high-churn areas; automated verification protects the branding investment from accidental removal during sidebar or mobile layout work.

**Independent Test**: Can be fully tested by running the navigation shell automated test suite and confirming assertions pass for expanded/collapsed logo variants and mobile wordmark presence.

**Acceptance Scenarios**:

1. **Given** the desktop sidebar test suite, **When** executed, **Then** tests verify wordmark rendering when labels are shown and badge rendering when the rail is collapsed.
2. **Given** the mobile navigation test suite, **When** executed, **Then** tests verify the wordmark appears in the fly-out drawer header and/or mobile top bar per placement rules.
3. **Given** sidebar state toggles rapidly between expanded and collapsed, **When** observed, **Then** logo variant updates without noticeable layout jump attributable to logo swapping.

---

### Edge Cases

- What happens when the sidebar toggles rapidly between expanded and collapsed? The logo variant MUST update immediately; any optional transition MUST NOT delay the swap or cause layout jank.
- What happens when navigation links sit directly below the logo? The logo MUST NOT overlap links; minimum padding on the wordmark variant MUST be preserved.
- What happens on viewports at the desktop/mobile breakpoint boundary? Logo placement rules MUST follow the active navigation mode (sidebar visible vs. mobile shell) without duplicate logos competing for attention.
- What happens when the reusable brand logo component is unavailable? This milestone is blocked until the brand logo component and logo image assets are delivered (SPLR-83, SPLR-82).
- Is authentication-screen logo placement in scope? No — login and registration logo treatment is handled separately within the parent branding epic.
- Is top-bar theming (colors, typography) in scope? No — visual theming of the mobile top bar and drawer chrome is handled by SPLR-87; this milestone wires logo placement only.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The desktop left navigation rail MUST display the reusable brand logo component at the top of the rail on all authenticated shell pages.
- **FR-002**: When the sidebar shows navigation labels (expanded or hover-expanded), the navigation rail MUST render the full wordmark logo variant.
- **FR-003**: When the sidebar is collapsed to icon-only width, the navigation rail MUST render the compact badge logo variant.
- **FR-004**: The mobile navigation fly-out drawer MUST display the full wordmark logo variant at the top of the drawer panel when opened.
- **FR-005**: The mobile persistent top bar MUST display the full wordmark logo variant centered when the desktop sidebar is hidden.
- **FR-006**: Logo placement in all navigation contexts MUST maintain at least 24px padding around the wordmark variant so it does not crowd adjacent navigation chrome or links.
- **FR-007**: The brand logo control in the sidebar MUST navigate the user to the dashboard home view when activated.
- **FR-008**: Logo rendering MUST use the centralized brand logo component and asset registry; navigation shell code MUST NOT introduce duplicate hardcoded brand image paths.
- **FR-009**: Navigation shell automated tests MUST be added or updated to verify desktop variant swapping (wordmark vs. badge) and mobile wordmark placement.
- **FR-010**: The feature MUST achieve ≥80% line/branch coverage across backend and frontend for this feature (CI-enforced; Constitution III). For this frontend-only milestone, coverage applies to modified navigation shell components and their automated tests; no backend API changes are expected.

### Key Entities

- **Navigation shell**: The persistent application frame comprising the desktop left rail, mobile top bar, and mobile fly-out drawer on authenticated routes.
- **Sidebar display state**: Whether the left rail shows full labels (expanded/hover-expanded) or icon-only width (collapsed); drives wordmark vs. badge selection.
- **Brand logo component**: Reusable presentation unit delivering wordmark and badge variants (delivered by SPLR-83).
- **Wordmark placement**: Full Split-Rail text logo used in expanded sidebar, mobile drawer header, and mobile top bar contexts.
- **Badge placement**: Compact Split-Rail mark used in collapsed desktop sidebar rail.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of manual desktop audits show the wordmark when the sidebar displays labels and the badge when collapsed, across pinned, unpinned, and hover-expanded states.
- **SC-002**: 100% of manual mobile audits show the wordmark at the top of the fly-out drawer when opened.
- **SC-003**: 100% of manual mobile audits show the centered wordmark in the persistent top bar when the sidebar is hidden.
- **SC-004**: 100% of measured wordmark placements in navigation chrome maintain ≥24px padding from adjacent elements.
- **SC-005**: 100% of navigation shell automated tests covering logo placement pass in continuous integration.
- **SC-006**: Sidebar expand/collapse toggling produces no noticeable layout jump attributable to logo variant changes in 100% of manual trials.
- **SC-007**: ≥80% line/branch coverage achieved across backend and frontend code for this feature (CI-enforced; Constitution III).

## Assumptions

- The reusable brand logo component with wordmark and badge variants is delivered by SPLR-83 before this milestone can be completed.
- Logo image files are delivered by SPLR-82 before end-to-end visual verification; automated tests may assert variant selection before assets land.
- The vertical navigation shell architecture (left rail, sticky top bar, mobile drawer) from spec `022-vertical-navigation` is present in the application; this milestone integrates logos into existing shell containers rather than redesigning navigation.
- Desktop sidebar already may partially integrate the brand logo component; this milestone completes and verifies all PRD placement rules including mobile surfaces.
- Mobile top bar and drawer color theming is owned by SPLR-87; this milestone focuses on logo wiring and spacing, not palette application.
- Parent epic spec `058-brand-theming-mhc` User Story 3 (dynamic logo presence) is satisfied by completing this milestone together with SPLR-83.
- Only authenticated shell routes receive navigation logo placement; auth, onboarding, and invite-accept flows remain out of scope.

## Dependencies

- Linear issue [SPLR-83](https://linear.app/audiodex/issue/SPLR-83) — Brand logo component with text and badge variants (blocked-by).
- Linear issue [SPLR-82](https://linear.app/audiodex/issue/SPLR-82) — Logo asset files (blocked-by, via SPLR-83 chain).
- Spec `022-vertical-navigation` — Navigation shell architecture (left rail, top bar, mobile drawer).
- Spec `062-brand-logo-component` — Brand logo component contract and acceptance criteria.
- Parent epic [SPLR-96](https://linear.app/audiodex/issue/SPLR-96) / spec `058-brand-theming-mhc` for brand guide and navigation branding context.
- Blocks: Linear issue [SPLR-87](https://linear.app/audiodex/issue/SPLR-87) — Theme mobile top bar and navigation drawer.
