# Feature Specification: Alert and Action-Required Badges (Orange Pills)

**Feature Branch**: `067-orange-alert-badges`

**Created**: 2026-06-24

**Status**: Draft

**Input**: User description: "Theme alert and action-required badges (orange pills)" ([Linear SPLR-90](https://linear.app/audiodex/issue/SPLR-90/theme-alert-and-action-required-badges-orange-pills))

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Recognize action-required items at a glance (Priority: P1)

A venue operator or accountant scans the dashboard, event cards, and ledger surfaces and immediately spots items that need their attention because action-required and alert badges share a consistent Alpine Sunset orange pill appearance with white bold text.

**Why this priority**: Action-required badges are the primary signal that something needs human intervention. Inconsistent styling (legacy amber/red chips, mixed shapes) slows triage and undermines the Montana High Country brand rollout.

**Independent Test**: Can be fully tested by loading screens that surface operational alerts (event cards with bottleneck chips, unmapped-account notices, and similar labels) and confirming every action-required badge uses the same compact orange pill treatment.

**Acceptance Scenarios**:

1. **Given** an event card with one or more operational bottleneck alerts (e.g., missing signature, unmapped accounts, variance review needed), **When** the card renders, **Then** each alert label appears as a compact pill-shaped badge with Alpine Sunset background and white bold text.
2. **Given** a surface that communicates unassigned or unmapped QuickBooks transactions requiring user action, **When** the notice renders, **Then** any action-required badge within that notice matches the shared orange pill specification.
3. **Given** any two action-required badges on different screens, **When** compared side by side, **Then** they share the same pill shape, color, typography weight, and compact size so users perceive them as the same category of signal.

---

### User Story 2 - Distinguish data-variance warnings from action-required alerts (Priority: P2)

An accountant reviewing ledger variance values can tell the difference between neutral financial data, variance cells flagged for numeric concern, and explicit action-required badges that demand workflow steps.

**Why this priority**: Variance highlighting encodes data semantics inside the grid; action-required badges encode operational to-do items. Collapsing both into identical orange pills would blur meaning and increase reconciliation errors.

**Independent Test**: Can be fully tested by opening a reconciled ledger with non-zero variances and confirming flagged variance cells use a distinct warning-style treatment while separate action-required badges (if present) retain the orange pill styling.

**Acceptance Scenarios**:

1. **Given** a ledger grid cell whose variance value is flagged as non-zero or concerning, **When** the cell renders, **Then** it uses a warning-oriented background treatment (light warm/yellow tone with emphasis on the numeric value) that is visually distinct from the solid orange action-required pill badges.
2. **Given** a ledger-level variance summary banner describing non-zero variances after reconciliation, **When** it renders, **Then** it uses a banner-style warning presentation appropriate for contextual messaging, not the compact orange pill reserved for discrete action labels.
3. **Given** an event card showing both a variance concern and operational bottleneck alerts, **When** the card renders, **Then** the variance indicator and bottleneck alert badges remain visually distinguishable so users can separate numeric review from workflow actions.

---

### User Story 3 - Readable badges on brand backgrounds (Priority: P3)

A user views action-required badges on both Pure White data containers and Canvas Cream page backgrounds and can read badge text comfortably without squinting or guessing label meaning.

**Why this priority**: Montana High Country surfaces alternate between cream and white; poor contrast on either background would fail accessibility expectations and reduce trust during financial review.

**Independent Test**: Can be fully tested by placing representative orange pill badges on white event-card surfaces and cream dashboard backgrounds and verifying text meets minimum contrast requirements for small bold labels.

**Acceptance Scenarios**:

1. **Given** an action-required badge on a Pure White card or table container, **When** rendered, **Then** white badge text against the Alpine Sunset background meets at least WCAG AA contrast (4.5:1) for the badge label size.
2. **Given** an action-required badge on a Canvas Cream page background (badge sitting on or adjacent to cream), **When** rendered, **Then** the orange pill remains clearly legible and the badge edge is visually distinct from the surrounding cream tone.
3. **Given** a user relying on keyboard or screen-reader navigation, **When** alert regions are announced, **Then** badge labels remain meaningful plain-language text (not color-only indicators).

---

### Edge Cases

- What happens when multiple action-required badges appear on a single event card? Each badge retains the standard pill styling without overlapping or truncating unreadably; wrapping to a new line is acceptable.
- What happens when an alert label is long (e.g., "3 unmapped accounts")? Text remains readable within the pill with appropriate horizontal padding; extremely long labels may wrap within the pill without breaking the rounded shape.
- What happens when no action is required? No orange pill badge is shown; neutral informational chips (e.g., booking preview) are not restyled as action-required badges.
- What happens when design tokens for Alpine Sunset or white are updated globally? All action-required badges inherit the updated token values without scattered hardcoded color overrides.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The application MUST provide a shared visual treatment for action-required and alert badges: fully rounded pill shape, Alpine Sunset (brand orange) background, white bold label text, and compact size appropriate for inline use in cards, banners, and lists.
- **FR-002**: Event-card operational bottleneck alert labels (e.g., missing signature, not synced to QuickBooks, unmapped accounts, variance review needed) MUST use the shared action-required badge treatment.
- **FR-003**: Surfaces that notify users of unassigned or unmapped QuickBooks transactions requiring mapping action MUST apply the shared action-required badge treatment to any discrete action-required label within those notices.
- **FR-004**: Flagged ledger variance cells MUST retain a distinct warning-style presentation (light warm background emphasizing the numeric variance) that is visually separable from solid orange action-required pill badges.
- **FR-005**: Ledger variance summary banners MUST use banner-appropriate warning styling for contextual messages and MUST NOT be mistaken for compact action-required pill badges.
- **FR-006**: Neutral informational badges (e.g., booking preview, profile labels, deduction markers) MUST NOT be converted to action-required orange pills unless they explicitly communicate that user action is required.
- **FR-007**: Action-required badge colors MUST reference the centralized Montana High Country design token for Alpine Sunset rather than legacy hex literals.
- **FR-008**: Action-required badges MUST meet WCAG AA minimum contrast (4.5:1) for label text against the badge background on both Pure White and Canvas Cream surrounding surfaces.
- **FR-009**: Automated verification MUST confirm the shared badge specification (pill shape, token-based orange background, white bold text) and MUST be updated wherever existing tests assert legacy class names or colors for affected badge surfaces.
- **FR-010**: The feature MUST achieve ≥80% line/branch coverage across backend and frontend for changed code paths (CI-enforced; Constitution III).

### Key Entities

- **Action-required badge**: A compact pill-shaped label signaling that a user must take a workflow step; uses Alpine Sunset background and white bold text.
- **Variance flag (data cell)**: A numeric ledger cell highlight indicating non-zero or concerning variance; uses warning-tone background distinct from action-required pills.
- **Bottleneck alert**: An operational condition on an event (e.g., missing signature, unmapped accounts) rendered as human-readable text, typically as an action-required badge on event cards.
- **Alert notice**: A contextual region (e.g., unmapped transactions) that may contain action-required badges alongside explanatory copy.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In a structured review of all in-scope surfaces (event-card bottleneck chips, unmapped-account notices, and comparable action-required labels), 100% of action-required badges match the shared orange pill specification (pill shape, Alpine Sunset background, white bold compact text).
- **SC-002**: In the same review, 100% of flagged ledger variance cells retain a warning-style treatment visually distinct from orange action-required pills, as confirmed by side-by-side comparison in a reconciled ledger with variances.
- **SC-003**: Automated contrast checks (or equivalent verification) confirm action-required badge text meets WCAG AA (4.5:1) against the badge background on representative white and cream container pairings.
- **SC-004**: Users completing a five-item triage task on the dashboard (identify which events need attention) complete the task in under 30 seconds on first attempt in moderated usability testing, with no misidentification of neutral badges as action-required.
- **SC-005**: ≥80% line/branch coverage achieved across backend and frontend code for this feature (CI-enforced; Constitution III).

## Assumptions

- Montana High Country design tokens (Alpine Sunset, Pure White, Canvas Cream, warning tones) are defined and available from the M1 token milestone (SPLR-79); this feature applies those tokens to badge surfaces rather than introducing new colors.
- The shared badge treatment covers both "alert" and "action-required" semantics with a single visual style; semantic differences are conveyed through label text, not separate color variants.
- Variance cell highlighting continues to use warning-background semantics for numeric data; only discrete workflow labels adopt the solid orange pill.
- Dashboard bottleneck filter control styling (toggle button for "Needs attention") is out of scope unless it explicitly renders an action-required pill label; focus is on badge/chip labels attached to events and transactional notices.
- No backend API or data-model changes are required; this is a presentation-layer consistency update within the web application.
- Legacy slate, amber, and red hex values currently used on some event-card chips and variance badges will be replaced or superseded by token-based brand styling as part of this work.

## Dependencies

- **SPLR-79 / M1 design tokens**: Alpine Sunset, white, cream, and warning semantic tokens must exist before badge colors can be wired consistently.
- **Parent epic SPLR-96 (Branding & Theming)**: Provides program context; this issue is a component-theming slice under milestone M4.
