# Feature Specification: Montana High Country Branding & Theming

**Feature Branch**: `058-brand-theming-mhc`

**Created**: 2026-06-23

**Status**: Draft

**Input**: User description: "[Epic] Branding & Theming — Montana High Country implementation" (Linear SPLR-96, project: Branding and theming)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consistent brand foundation across the application (Priority: P1)

A venue operator or accountant opens any screen in Split-Rail and immediately recognizes the Montana High Country brand: warm earth tones, purposeful contrast, and typography that separates headings from everyday interface text. The visual language is consistent whether they are on the dashboard, ledger, or settings.

**Why this priority**: Color, typography, and spacing tokens are the foundation every other branded surface depends on. Without a shared palette and type system, later theming work will fragment and require rework.

**Independent Test**: Can be fully tested by loading representative pages and confirming the four core brand colors (Lodgepole Brown, Alpine Sunset, Canvas Cream, Pure White) and two-font hierarchy (slab-serif headings, sans-serif body) appear consistently, with no legacy slate/blue palette visible in primary surfaces.

**Acceptance Scenarios**:

1. **Given** any primary application screen, **When** it renders, **Then** page backgrounds use Canvas Cream, data containers use Pure White, primary text and navigation chrome use Lodgepole Brown, and calls-to-action and active highlights use Alpine Sunset.
2. **Given** a page with a top-level title, **When** it renders, **Then** the title uses the brand heading typeface at bold weight in Lodgepole Brown.
3. **Given** body copy, navigation labels, table data, and form fields, **When** they render, **Then** they use the brand interface typeface at appropriate regular, medium, or bold weights.
4. **Given** a review of all primary styles, **When** complete, **Then** no hardcoded legacy slate or blue palette values remain in global styling.

---

### User Story 2 - Branded navigation shell on desktop and mobile (Priority: P2)

A user navigates the application using the left sidebar on desktop or the mobile top bar and drawer. The navigation feels anchored to the Split-Rail brand: a Lodgepole Brown sidebar with cream text, orange active-state indicators, and a cream main content area that reduces eye strain during long financial review sessions.

**Why this priority**: Navigation is the persistent frame users see on every authenticated screen. Branding the shell delivers immediate visual impact and sets context for all workspace content.

**Independent Test**: Can be fully tested by opening the app on desktop and mobile viewports, expanding and collapsing the sidebar, and confirming background colors, text colors, hover feedback, and active-page indicators match the Montana High Country rules.

**Acceptance Scenarios**:

1. **Given** an authenticated user on desktop, **When** the left navigation renders, **Then** the sidebar background is Lodgepole Brown, link text and icons are Canvas Cream, hover states provide subtle lightening feedback, and the active page shows an Alpine Sunset vertical indicator on the left edge of the menu item.
2. **Given** an authenticated user viewing main workspace content, **When** the content area renders, **Then** the application background is Canvas Cream and data cards or tables sit on Pure White surfaces with subtle separation from the background.
3. **Given** a user on a mobile viewport, **When** they open navigation, **Then** the top bar and fly-out drawer follow the same Lodgepole Brown / Canvas Cream / Alpine Sunset rules as desktop navigation.

---

### User Story 3 - Dynamic logo presence in navigation states (Priority: P3)

A user sees the Split-Rail logo appropriately sized and positioned whether the sidebar is expanded, collapsed to a compact rail, or accessed via mobile navigation. The logo reinforces brand identity without crowding navigation controls.

**Why this priority**: Logo placement is a high-visibility brand touchpoint tied to the navigation redesign. It depends on the shell (P2) but can be validated independently once navigation containers exist.

**Independent Test**: Can be fully tested by toggling sidebar expanded/collapsed states and resizing to mobile, confirming the full wordmark appears when space allows and the compact badge appears when the rail is minimized.

**Acceptance Scenarios**:

1. **Given** an expanded desktop sidebar, **When** it renders, **Then** the full Split-Rail wordmark logo is centered at the top with adequate padding (at least 24px) from surrounding edges.
2. **Given** a collapsed desktop sidebar rail, **When** it renders, **Then** the compact badge logo is centered at the top as the visual anchor.
3. **Given** a mobile viewport with hidden sidebar, **When** navigation is visible, **Then** the full wordmark appears centered in the persistent top bar or at the top of the fly-out drawer.

---

### User Story 4 - Branded interactive components and data surfaces (Priority: P4)

A user interacts with buttons, cards, tables, modals, and alert badges while reviewing events and financial data. Primary actions are clearly identifiable in Alpine Sunset; secondary actions are visually distinct; data containers pop cleanly off the cream background; and action-required badges draw attention without breaking the palette.

**Why this priority**: High-traffic UI primitives and data surfaces are where users spend most of their time after navigation. Consistent component theming completes the accounting-first, professional feel.

**Independent Test**: Can be fully tested by visiting dashboard, ledger, and modal flows and confirming button variants, card/table containers, and alert badges match brand rules including hover feedback and pill-shaped alert styling.

**Acceptance Scenarios**:

1. **Given** a primary call-to-action (e.g., lock budget, sync), **When** it renders, **Then** it uses an Alpine Sunset background, cream or white bold label text, and slightly rounded corners with a visible hover state (darkened background or subtle shadow).
2. **Given** a secondary action, **When** it renders, **Then** it uses a transparent or Lodgepole Brown treatment with brown text and/or border, visually distinct from primary CTAs.
3. **Given** a data card, modal, or table container, **When** it renders, **Then** it uses a Pure White surface on the Canvas Cream background with a faint brown border or soft shadow for depth.
4. **Given** an action-required or alert badge, **When** it renders, **Then** it appears as a pill-shaped Alpine Sunset badge with white bold text at a compact size.

---

### User Story 5 - Branded authentication and onboarding flows (Priority: P5)

A new or returning user who is not yet in the workspace sees login, registration, organization creation, and welcome/onboarding screens that match the Montana High Country identity, building trust before they reach the dashboard.

**Why this priority**: Auth and onboarding are the first brand impression for new organizations. They should feel cohesive with the authenticated experience but can follow after core in-app theming is established.

**Independent Test**: Can be fully tested by walking through login, registration, org creation, and welcome modal flows and confirming palette, typography, and component styling match the in-app brand rules.

**Acceptance Scenarios**:

1. **Given** a user on the login or registration screen, **When** it renders, **Then** backgrounds, typography, and primary/secondary actions follow Montana High Country rules.
2. **Given** a user creating an organization, **When** the org-creation flow renders, **Then** it uses the same brand palette and type hierarchy as other auth screens.
3. **Given** a user completing onboarding, **When** the welcome modal or onboarding steps appear, **Then** they use branded colors, fonts, and button styles consistent with the rest of the application.

---

### User Story 6 - Accessible, regression-resistant brand compliance (Priority: P6)

A user with visual accessibility needs can read text, distinguish interactive elements, and use the application without contrast failures. Stakeholders can be confident future changes will not silently reintroduce off-brand or inaccessible colors.

**Why this priority**: Accessibility verification and automated checks are the quality gate that makes the rebrand durable. This milestone closes the epic and satisfies the project's definition of done.

**Independent Test**: Can be fully tested by running a WCAG AA contrast audit on all primary text/background pairings and confirming automated checks fail if legacy or off-palette colors reappear in global styling.

**Acceptance Scenarios**:

1. **Given** all primary text and background pairings (brown on cream, cream on brown, cream or white on orange buttons), **When** contrast is measured, **Then** each pairing meets WCAG AA minimum ratios; if cream-on-orange fails, button label text is adjusted to Pure White until compliant.
2. **Given** a change that reintroduces a legacy slate or blue hex value in global styling, **When** automated brand regression checks run, **Then** the check fails and reports the offending value.
3. **Given** the full epic scope, **When** all milestone work is complete, **Then** auth, dashboard, ledger, and navigation visually match the brand guide with no legacy palette in global styles.

---

### Edge Cases

- What happens when the vertical navigation shell is not yet merged on the current branch? Implementers should reuse existing shell components from the main branch or the vertical-navigation feature rather than duplicating navigation structure solely for theming.
- How are third-party or embedded components that cannot be restyled handled? They should inherit surrounding background and typography where possible; any unavoidable neutral styling must not reintroduce the legacy palette on adjacent branded surfaces.
- What happens at very narrow mobile widths where the full wordmark does not fit? The mobile drawer top placement or scaled wordmark treatment takes precedence over cramming the logo into the top bar.
- How are focus indicators handled for keyboard users during the rebrand? Focus rings must remain visible against Lodgepole Brown and Alpine Sunset backgrounds and meet WCAG AA contrast requirements.
- What if a contrast adjustment changes a token value? The adjustment applies globally through shared brand tokens so all dependent surfaces update consistently.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The application MUST define a shared Montana High Country color system consisting of Lodgepole Brown (navigation, primary typography, subtle borders), Alpine Sunset (primary CTAs, active indicators, alert badges), Canvas Cream (main background and navigation text on dark surfaces), and Pure White (data cards, tables, modals).
- **FR-002**: The application MUST load and apply a two-font typography system: a bold slab-serif for top-level headings, modal titles, and headliner names on event cards; and a sans-serif family for body text, navigation, buttons, inputs, tables, and financial metrics.
- **FR-003**: All primary text on light backgrounds MUST use Lodgepole Brown; all primary text on Lodgepole Brown navigation MUST use Canvas Cream.
- **FR-004**: The left navigation shell MUST use a Lodgepole Brown background with cream text/icons, subtle hover feedback, and an Alpine Sunset left-edge indicator on the active menu item.
- **FR-005**: The main authenticated content area MUST use a Canvas Cream background with Pure White surfaces for cards, tables, and modals separated by faint brown borders or soft shadows.
- **FR-006**: Mobile navigation (top bar and drawer) MUST follow the same color and active-state rules as desktop navigation.
- **FR-007**: The application MUST display the full Split-Rail wordmark when navigation is expanded or in mobile drawer/top contexts, and the compact badge logo when the sidebar is collapsed, each centered with at least 24px padding in expanded state.
- **FR-008**: Primary call-to-action controls MUST use Alpine Sunset backgrounds with bold cream or white label text, 4–6px corner rounding, and a visible hover state.
- **FR-009**: Secondary action controls MUST be visually distinct from primary CTAs using transparent or Lodgepole Brown treatments.
- **FR-010**: Action-required and alert badges MUST render as pill-shaped Alpine Sunset badges with white bold text at compact size.
- **FR-011**: Login, registration, organization creation, and welcome/onboarding flows MUST use the same Montana High Country palette, typography, and button styles as authenticated screens.
- **FR-012**: All legacy slate and blue palette values MUST be removed from global application styling and replaced with shared brand tokens.
- **FR-013**: All primary text/background pairings MUST meet WCAG AA contrast minimums, with token adjustments applied globally when a pairing fails (including switching CTA label text to Pure White if cream-on-orange is insufficient).
- **FR-014**: Automated brand regression checks MUST detect reintroduction of legacy or off-palette color values in global styling.
- **FR-015**: The feature MUST achieve ≥80% line/branch coverage across backend and frontend for this feature (CI-enforced; Constitution III).

### Key Entities

- **Brand color token**: A named color in the Montana High Country palette (Lodgepole Brown, Alpine Sunset, Canvas Cream, Pure White) applied consistently across surfaces; adjustments propagate globally.
- **Typography role**: A semantic text role (heading, body, navigation, button label, badge) mapped to font family, weight, and color rules.
- **Logo variant**: Either the full wordmark or compact badge asset, selected based on navigation layout state (expanded, collapsed, mobile).
- **Navigation state**: Expanded sidebar, collapsed rail, or mobile drawer/top bar — each with prescribed logo placement and color treatment.
- **UI surface tier**: Background (cream), container (white), navigation chrome (brown), or interactive accent (orange) — determines which tokens apply.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of audited primary screens (auth, dashboard, ledger, navigation) display the four core brand colors and two-font hierarchy with no legacy slate/blue palette visible on primary surfaces.
- **SC-002**: 100% of primary text/background pairings in the contrast audit meet WCAG AA minimum contrast ratios.
- **SC-003**: Users can identify the active navigation item and primary call-to-action on any audited screen within 2 seconds in moderated usability checks (distinct orange active indicator and CTA styling).
- **SC-004**: Logo variant swaps correctly in 100% of tested navigation states (expanded desktop, collapsed rail, mobile drawer/top bar).
- **SC-005**: Automated brand regression checks fail when legacy off-palette hex values are reintroduced to global styling, with zero false negatives in the defined test suite.
- **SC-006**: ≥80% line/branch coverage achieved across backend and frontend code for this feature (CI-enforced; Constitution III).

## Assumptions

- The Montana High Country brand guide in Linear project "Branding and theming" is the authoritative reference for color names, hex values, font choices (Zilla Slab + Inter preferred; acceptable alternates listed in the guide may be used only if primary choices are unavailable), and component mapping rules.
- A left-aligned, collapsible vertical navigation shell exists or will be merged from the vertical-navigation feature before shell theming (M3) is completed; theming work applies to existing shell components rather than inventing new navigation structure.
- This epic is primarily a visual/branding change with no new backend business logic; backend coverage requirements apply to any new or modified verification utilities (e.g., contrast or token regression helpers) rather than API endpoints.
- Milestones M1 through M6 SHOULD be implemented in order, as downstream work depends on tokens and typography established in M1.
- Brand colors and typography are applied through a single shared token layer so all surfaces update consistently when tokens change; introducing an alternate styling framework is out of scope unless explicitly requested later.
- Auth layout components from the login/registration layout feature already exist and will be restyled rather than rebuilt.

## Dependencies

- Linear epic SPLR-96 and child issues SPLR-79 through SPLR-95 define milestone-level deliverables and acceptance detail.
- Vertical navigation shell (spec `022-vertical-navigation` or equivalent on main) for sidebar/mobile structure before M2–M3 logo and shell theming.
- Login, registration, and org onboarding UI (spec `006-login-registration-layout` and `007-registration-org-onboarding`) for M5 auth/onboarding theming targets.
