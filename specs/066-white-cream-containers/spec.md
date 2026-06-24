# Feature Specification: White-on-Cream Data Container Theming

**Feature Branch**: `066-white-cream-containers`

**Created**: 2026-06-24

**Status**: Draft

**Input**: User description: "Theme data cards, modals, and table containers (white on cream)" ([Linear SPLR-89](https://linear.app/audiodex/issue/SPLR-89/theme-data-cards-modals-and-table-containers-white-on-cream))

**Linear Issue**: [SPLR-89](https://linear.app/audiodex/issue/SPLR-89/theme-data-cards-modals-and-table-containers-white-on-cream)

**Project Milestone**: M4 — Component theming (buttons, cards, tables, badges)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Data cards visually separate from the cream workspace (Priority: P1)

A venue operator or accountant reviews financial data on the ledger or dashboard. Each data card, panel, and grouped section sits on a Pure White surface above the warm Canvas Cream page background, with subtle depth (soft border or shadow) so content blocks are easy to scan during long review sessions.

**Why this priority**: Cards and panels are the primary reading surfaces for event and ledger data. Without clear white-on-cream separation, dense financial screens feel flat and harder to parse.

**Independent Test**: Can be fully tested by opening the ledger and dashboard at desktop width and confirming every major data container (ledger block sections, deal panels, event summary cards) uses a white surface that visually lifts off the cream background.

**Acceptance Scenarios**:

1. **Given** an authenticated user on the ledger page, **When** block sections and summary panels render, **Then** each container uses a Pure White background on the Canvas Cream workspace with a subtle brown-tinted border or soft card shadow for depth.
2. **Given** an authenticated user on the dashboard, **When** event cards render, **Then** each card uses the same white-on-cream container treatment with softly rounded corners consistent with other data surfaces.
3. **Given** an artist deal panel within an event workspace, **When** it renders, **Then** it follows the shared white container rules rather than a flat or legacy light-gray treatment.
4. **Given** a side-by-side review of ledger and dashboard containers, **When** complete, **Then** background, border/shadow depth, and corner rounding are visually consistent across both areas.

---

### User Story 2 - Tables remain readable with branded header and body styling (Priority: P1)

A user reads tabular financial data inside ledger grids and dashboard summaries. Table bodies sit on white surfaces with Lodgepole Brown text; table headers use a light cream-derived tint instead of legacy cool-gray header backgrounds, preserving hierarchy without breaking the warm Montana High Country palette.

**Why this priority**: Tables carry the highest information density in the product. Header tint and text contrast directly affect accuracy and fatigue during reconciliation work.

**Independent Test**: Can be fully tested by loading a ledger grid with multiple rows and confirming header row background is a warm cream tint, body rows are white, and all text is legible in Lodgepole Brown.

**Acceptance Scenarios**:

1. **Given** a ledger or dashboard table with a header row, **When** it renders, **Then** the header background uses a light tint derived from Canvas Cream, not legacy slate or cool-gray tones.
2. **Given** table body rows on a white container, **When** the user reads cell values, **Then** primary text uses Lodgepole Brown and meets readable contrast on the white surface.
3. **Given** a table inside a white card on a cream page, **When** the user scans from header to body, **Then** the header-to-body transition is visually clear without harsh color jumps.

---

### User Story 3 - Modals and overlay panels match data-surface branding (Priority: P2)

A user opens an in-app modal or overlay panel (for example, a welcome or onboarding dialog). The modal panel uses the same Pure White surface treatment as inline data cards, maintaining brand continuity between embedded content and floating overlays.

**Why this priority**: Modals are high-visibility brand touchpoints. Aligning them with card styling completes the white-on-cream language users already see on ledger and dashboard pages.

**Independent Test**: Can be fully tested by triggering a welcome or similar modal and confirming its panel background, depth treatment, and corner rounding match inline data cards on cream backgrounds.

**Acceptance Scenarios**:

1. **Given** a user who sees an in-app modal on a cream workspace background, **When** the modal panel renders, **Then** the panel uses Pure White with subtle depth separation from the backdrop.
2. **Given** modal content with headings and body text, **When** it renders, **Then** typography and text colors follow the Montana High Country rules established for data surfaces (brown headings and body on white).
3. **Given** authentication sign-in and registration card layouts, **When** evaluated for this milestone, **Then** they MAY remain on the existing auth styling track (M5 — Branded authentication) unless already trivially aligned; in-app operational modals MUST adopt the white container treatment.

---

### User Story 4 - Regression-safe container theming (Priority: P2)

A developer or QA engineer changes ledger or dashboard layout in the future. Automated tests confirm white-on-cream container styling and table header treatment remain correct, and existing ledger and dashboard test suites continue to pass.

**Why this priority**: Container styling touches shared layout primitives. Automated verification prevents silent regressions during refactors and satisfies the project's quality gate.

**Independent Test**: Can be fully tested by running the ledger and dashboard automated test suites and confirming themed container assertions pass alongside unchanged functional behavior.

**Acceptance Scenarios**:

1. **Given** the ledger component test suite, **When** executed, **Then** tests verify block sections and summary panels render with the branded white container treatment.
2. **Given** the dashboard component test suite, **When** executed, **Then** tests verify event cards render with the branded white container treatment.
3. **Given** coverage metrics for changed container and table styling, **When** the continuous integration build runs, **Then** line and branch coverage for this feature meets or exceeds the 80% threshold.

---

### Edge Cases

- What happens when a container sits on a nested white surface (white card inside another white panel)? Inner containers MAY omit redundant shadows but MUST retain readable borders or spacing so nested groups do not visually merge.
- How should compact or inline summary strips differ from full cards? Compact summaries MAY use reduced padding while keeping the same white background and depth treatment.
- What about tables with sticky headers during scroll? Sticky header rows MUST retain the cream-tinted header background and legible brown text when pinned over scrolling body rows.
- How are empty states and loading placeholders inside cards handled? Empty and loading states MUST remain legible on white surfaces without reintroducing legacy gray panel backgrounds.
- What if the cream workspace background is not yet applied on a given route? Container theming MUST still render correctly on white or cream backgrounds without contrast failures; full visual impact depends on the cream background milestone (SPLR-86).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: All primary data containers on ledger and dashboard surfaces (block sections, summary panels, deal panels, and event cards) MUST use Pure White as the container background on the Canvas Cream workspace.
- **FR-002**: Data containers MUST provide subtle depth separation from the cream background using either a faint brown-tinted border or a soft card shadow—not both applied so heavily that the interface feels heavy or cluttered.
- **FR-003**: Data containers MUST use softly rounded corners (approximately 8px or consistent with existing card radius where already established) so the treatment aligns with other M4 component-theming work.
- **FR-004**: Table header rows inside ledger and dashboard data surfaces MUST use a light background tint derived from Canvas Cream instead of legacy cool-gray or slate header colors.
- **FR-005**: Table body content on white containers MUST use Lodgepole Brown for primary text so financial figures and labels remain readable during extended review sessions.
- **FR-006**: In-app operational modals and overlay panels (excluding authentication flows deferred to M5 unless already aligned) MUST use the same Pure White container treatment as inline data cards.
- **FR-007**: Container and table theming MUST source colors, shadows, and border values from the centralized Montana High Country design token set (dependency: global design tokens milestone).
- **FR-008**: Container theming MUST assume the main application content area uses Canvas Cream as its workspace background (dependency: cream background milestone).
- **FR-009**: Existing ledger and dashboard automated test suites MUST continue to pass after container styling changes; new or updated tests MUST verify branded container rendering where components are directly affected.
- **FR-010**: This feature MUST achieve ≥80% line/branch coverage across backend and frontend for changed code paths (CI-enforced; Constitution III). Frontend-only styling changes satisfy this gate through component tests covering affected surfaces; no backend changes are anticipated.

### Key Entities

- **Data container**: A bounded visual region presenting grouped financial or event information (card, panel, block section, modal panel) characterized by background color, depth treatment, and corner radius.
- **Table header row**: The top row of a tabular data surface that labels columns; characterized by a cream-derived tint background distinct from white body rows.
- **Design token**: A named brand value (color, shadow, border) from the Montana High Country palette used consistently instead of one-off color values.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On a visual audit of ledger and dashboard pages, 100% of identified primary data containers (block sections, summary panels, deal panels, event cards) display Pure White backgrounds with visible depth separation from the cream workspace.
- **SC-002**: On a visual audit of ledger and dashboard tables, 100% of header rows use a warm cream-derived tint with no legacy cool-gray header backgrounds remaining on in-scope surfaces.
- **SC-003**: Users reviewing representative ledger grids report no difficulty reading brown text on white table bodies during a structured review (qualitative pass/fail against a three-screen checklist: ledger blocks, dashboard event cards, modal overlay).
- **SC-004**: All existing ledger and dashboard automated test suites pass with zero regressions attributable to container styling changes.
- **SC-005**: ≥80% line/branch coverage achieved across backend and frontend code for this feature (CI-enforced; Constitution III).

## Assumptions

- Global Montana High Country design tokens (SPLR-79) and Canvas Cream workspace background (SPLR-86) are available or complete before implementation; this feature depends on both milestones.
- Shared primary and secondary button styles (SPLR-88) may land in parallel; container theming does not redefine button styling.
- Authentication card layouts (sign-in, registration) are explicitly deferred to M5 (branded authentication flows) unless alignment requires no additional scope.
- Scope is limited to ledger components, dashboard event cards, in-app modals named in the Linear issue, and associated global container/table styles—not a full audit of every component in the application (remaining legacy hex migration is tracked separately in SPLR-91).
- Border-radius may remain at existing values where components already use approximately 8px; the goal is consistency, not forced changes to well-fitting layouts.
- This is a frontend presentation milestone; no API, database, or backend service changes are required.
