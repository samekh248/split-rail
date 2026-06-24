# Feature Specification: Global Typography Rules for Headings and UI Text

**Feature Branch**: `061-global-typography-rules`

**Created**: 2026-06-24

**Status**: Draft

**Input**: User description: "Apply global typography rules for headings and UI text" (Linear SPLR-81)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consistent branded headings across the application (Priority: P1)

A venue operator or accountant navigates to any primary screen—dashboard, event ledger, or authentication—and immediately recognizes page titles, section headings, and modal titles in the Montana High Country brand voice: bold slab-serif headings in the primary brown tone, without inconsistent one-off styling from screen to screen.

**Why this priority**: Headings are the primary visual anchor for orientation and brand recognition. Establishing global heading rules eliminates drift and is the minimum slice that makes the typography system feel intentional rather than accidental.

**Independent Test**: Can be fully tested by opening the dashboard home page and an authentication card title and confirming both render with the brand heading typeface, bold weight, and primary brown color—without requiring per-screen custom styling.

**Acceptance Scenarios**:

1. **Given** a user on the dashboard home page, **When** the page title renders, **Then** it displays in the brand slab-serif heading style with bold weight and primary brown color.
2. **Given** a user on the login or registration screen, **When** the card title renders, **Then** it displays in the same brand heading style as other top-level headings.
3. **Given** a modal or dialog with a title, **When** it opens, **Then** the modal heading inherits the global heading rules without additional overrides.

---

### User Story 2 - Readable UI and data text in the sans-serif stack (Priority: P2)

A user reads form labels, button labels, table cells, and body paragraphs across the application and sees a consistent, legible sans-serif typeface suited to dense operational data and everyday interface controls.

**Why this priority**: Body and UI text carry the majority of operational information (ledger figures, form fields, navigation). Consistent sans-serif defaults improve scanability and reduce visual noise after heading rules are in place.

**Independent Test**: Can be fully tested by opening a form-heavy screen and a data table screen and confirming labels, inputs, buttons, and table content all use the UI sans-serif family.

**Acceptance Scenarios**:

1. **Given** a user on a form with labeled fields, **When** the form renders, **Then** labels, inputs, and submit actions use the UI sans-serif typeface.
2. **Given** a user viewing a financial ledger or data table, **When** table headers and cells render, **Then** they use the UI sans-serif typeface.
3. **Given** any standard paragraph or body copy on a page, **When** it renders, **Then** it uses the UI sans-serif typeface by default.

---

### User Story 3 - Legible text on dark brand surfaces (Priority: P3)

A user encounters navigation bars, headers, or other dark brown brand surfaces and can read titles and supporting text clearly because light cream-toned text is applied consistently on those backgrounds.

**Why this priority**: Contrast on dark surfaces is a brand and accessibility requirement, but it depends on the heading and UI foundations (P1/P2) being established first. This slice completes the typography system for the most common dark-background contexts.

**Independent Test**: Can be fully tested by rendering a dark brand surface (e.g., application header or navigation) and confirming text on that surface uses the cream tone utility without per-component color overrides.

**Acceptance Scenarios**:

1. **Given** a dark brown brand surface with text content, **When** it renders, **Then** text on that surface uses the cream background-tone color for sufficient contrast.
2. **Given** a reusable "text on dark" utility is applied to a label or heading on a dark surface, **When** the element renders, **Then** it displays in the cream tone defined by the design token system.

---

### Edge Cases

- What happens when a heading contains very long text (e.g., an unusually long event name)? Headings must wrap naturally without horizontal overflow or clipped characters at supported viewport widths.
- How are nested headings inside already-styled components handled? Semantic heading levels (top three levels) and the designated brand-heading utility class must inherit global rules without fighting local layout styles.
- What happens when legacy screens still carry inline or component-level font overrides? Global rules should win for standard semantic elements unless a documented exception exists; no screen should regress to unreadable contrast or overflow.
- How does the system behave before design tokens and web fonts are available? This feature assumes upstream token and font loading work is complete; until then, typography rules are not considered deliverable.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The application MUST apply a single global typography rule set so page titles, section headings (top three semantic levels), modal titles, and elements designated as brand headings share one consistent style: brand slab-serif typeface, bold weight, and primary brown color from the Montana High Country token system.
- **FR-002**: The application MUST apply a single global UI text rule set so body copy, paragraphs, form labels, buttons, text inputs, and table headers and cells default to the UI sans-serif typeface from the token system.
- **FR-003**: The application MUST provide a reusable utility for cream-toned text on dark brown brand surfaces, referencing the canvas-cream color token, so dark navigation and header regions do not require ad hoc color values.
- **FR-004**: Global typography rules MUST be documented in a concise reference (class names and which elements they affect) so future screens can adopt the system without rediscovering conventions.
- **FR-005**: The dashboard home page title MUST render with brand heading typography (slab-serif, bold, primary brown).
- **FR-006**: Authentication card titles on login and registration flows MUST render with brand heading typography consistent with other top-level headings.
- **FR-007**: Form labels and table cell content on representative data screens (including login, dashboard home, and event ledger views) MUST render in the UI sans-serif typeface.
- **FR-008**: Existing representative pages (login, dashboard home, event ledger) MUST remain fully readable with no text overflow or layout regressions attributable to the new typography defaults.
- **FR-009**: Automated frontend smoke verification for the web application MUST continue to pass after typography rules are applied.
- **FR-010**: System MUST achieve ≥80% line/branch coverage across backend and frontend for this feature (CI-enforced; Constitution III).

### Key Entities

- **Typography Rule Set**: The global defaults mapping semantic content roles (headings, body, UI controls, table data) to brand typefaces, weights, and colors drawn from the shared design token layer.
- **Brand Heading Style**: The combination of slab-serif typeface, bold weight, and primary brown color applied to top-level headings and designated brand-heading elements.
- **UI Text Style**: The sans-serif typeface applied to operational interface text—labels, inputs, buttons, paragraphs, and tabular data.
- **Text-on-Dark Utility**: A named, reusable styling hook that applies canvas-cream text color for legibility on dark brown brand surfaces.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of audited top-level headings on dashboard home, authentication cards, and modal titles display in the brand slab-serif heading style (bold, primary brown) without per-screen custom heading styles.
- **SC-002**: 100% of audited form labels, buttons, inputs, and table cells on login, dashboard home, and event ledger screens display in the UI sans-serif typeface.
- **SC-003**: Zero layout regressions (overflow, clipping, or unreadable contrast) on login, dashboard home, and event ledger screens when compared to pre-typography baselines at representative mobile (≈375px) and desktop (≈1280px) viewports.
- **SC-004**: Automated frontend smoke test suite completes successfully with no new failures attributable to typography changes.
- **SC-005**: A developer or designer can identify which global classes and semantic elements carry heading vs. UI text rules from the in-product documentation reference without inspecting individual screens.
- **SC-006**: ≥80% line/branch coverage achieved across backend and frontend code for this feature (CI-enforced; Constitution III).

## Assumptions

- Montana High Country design tokens (palette including Lodgepole Brown and Canvas Cream) are already defined and available application-wide (Linear SPLR-79 / specs `059-mhc-design-tokens`).
- Brand web fonts (Zilla Slab for headings, Inter for UI text) are already imported and exposed through CSS custom properties (Linear SPLR-80 / specs `060-brand-web-fonts`).
- This feature establishes global defaults only; comprehensive per-component restyling of every screen is out of scope and handled by downstream branding milestones.
- Semantic HTML heading elements and a single brand-heading utility class are sufficient to cover modal titles and event-card headliners without enumerating every component.
- Representative regression pages are login, dashboard home, and event ledger as named in the Linear acceptance criteria; other pages inherit globals passively.
- Backend changes are not expected for this typography-only feature; coverage obligations apply primarily to any new or updated frontend verification assets.
- The typography documentation reference lives alongside the global stylesheet section it describes, readable by humans maintaining the design system.
