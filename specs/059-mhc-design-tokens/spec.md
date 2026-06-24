# Feature Specification: Montana High Country Design Tokens

**Feature Branch**: `059-mhc-design-tokens`

**Created**: 2026-06-24

**Status**: Draft

**Input**: User description: "Define global CSS design tokens — Montana High Country palette" (Linear SPLR-79, milestone M1)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Single source of truth for brand colors (Priority: P1)

A developer or designer working on Split-Rail needs one authoritative set of named brand colors so every future screen, component, and style update references the Montana High Country palette instead of ad-hoc values scattered across the codebase.

**Why this priority**: The four core brand colors are the foundation of the entire rebrand. Without a centralized token layer, downstream theming milestones will duplicate hex values and drift from the brand guide.

**Independent Test**: Can be fully tested by inspecting the global style foundation and confirming all four Montana High Country colors (Lodgepole Brown, Alpine Sunset, Canvas Cream, Pure White) exist as named, reusable values with the correct hex equivalents from the brand guide.

**Acceptance Scenarios**:

1. **Given** the application's global style foundation, **When** it is loaded, **Then** named tokens exist for Lodgepole Brown (`#3E2723`), Alpine Sunset (`#E65100`), Canvas Cream (`#F4F1EA`), and Pure White (`#FFFFFF`).
2. **Given** a developer adding a new style rule, **When** they need a brand color, **Then** they can reference a named token rather than typing a raw hex value.
3. **Given** the token foundation is in place, **When** a brand color value is updated at the token level, **Then** all styles that reference that token reflect the change without hunting for scattered hex literals.

---

### User Story 2 - Consistent default page appearance (Priority: P2)

A venue operator opens any screen in Split-Rail and sees the warm Canvas Cream page background with Lodgepole Brown default text, establishing the Montana High Country identity before any component-level theming is applied.

**Why this priority**: Default page-level colors are the first visual signal users receive. Wiring the root page background and text color to tokens ensures the brand is visible immediately and prevents legacy slate/blue defaults from persisting at the document level.

**Independent Test**: Can be fully tested by loading the application with no component-specific overrides and confirming the page background is Canvas Cream and default body text is Lodgepole Brown, both sourced from named tokens.

**Acceptance Scenarios**:

1. **Given** a user loads any page in the web application, **When** the base document styles apply, **Then** the page background uses the Canvas Cream token and default text uses the Lodgepole Brown token.
2. **Given** the global style root configuration, **When** it is inspected, **Then** its background and text color properties reference named tokens rather than hardcoded hex values.

---

### User Story 3 - Semantic derived tokens for common UI needs (Priority: P3)

A developer styling borders, text-on-background pairings, buttons, and card shadows needs pre-defined semantic tokens (text on light backgrounds, text on dark backgrounds, subtle borders, button corner radius, card shadow) so they do not re-derive these values inconsistently across the codebase.

**Why this priority**: Derived tokens reduce duplication and enforce consistent visual relationships (e.g., borders always derive from Lodgepole Brown at reduced opacity). They unblock downstream milestones without requiring every developer to calculate rgba values independently.

**Independent Test**: Can be fully tested by confirming semantic derived tokens exist for text-on-light, text-on-dark, subtle borders, button radius (4–6px range), and card shadow, each mapping logically to the core palette.

**Acceptance Scenarios**:

1. **Given** the global token set, **When** a developer needs text color on a light (cream or white) surface, **Then** a named text-on-light token is available mapping to Lodgepole Brown.
2. **Given** the global token set, **When** a developer needs text color on a dark (brown) surface, **Then** a named text-on-dark token is available mapping to Canvas Cream.
3. **Given** the global token set, **When** a developer needs a subtle separator border, **Then** a named border token is available derived from Lodgepole Brown at approximately 15% opacity.
4. **Given** the global token set, **When** a developer needs button rounding or card elevation, **Then** named radius (4–6px) and card shadow tokens are available with values matching the brand guide.

---

### Edge Cases

- What happens when a contrast requirement later forces an accent color adjustment? The adjustment MUST be made at the token level so all dependent styles update globally; individual components MUST NOT carry one-off hex overrides.
- How should tokens be organized if the global stylesheet grows large? Tokens MAY be extracted to a dedicated stylesheet file imported at application startup, but MUST remain a single authoritative source — not duplicated across files.
- What if legacy hex values remain in component-level rules? This milestone establishes tokens and root-level defaults only; removing legacy values from individual components is explicitly out of scope and handled by later milestones.
- What happens when a developer introduces a new brand hex outside the token file? New brand color literals MUST NOT be added outside the token definition block; code review and automated checks in later milestones will enforce this.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The application MUST define a centralized global token set containing exactly four core Montana High Country color tokens: Lodgepole Brown (`#3E2723`), Alpine Sunset (`#E65100`), Canvas Cream (`#F4F1EA`), and Pure White (`#FFFFFF`).
- **FR-002**: The application MUST expose semantic derived tokens for text on light backgrounds, text on dark backgrounds, subtle borders (primary brown at ~15% opacity), button corner radius (4–6px), and card shadow (`0 2px 5px` with low-opacity black).
- **FR-003**: The global document root MUST set default background to Canvas Cream and default text color to Lodgepole Brown using the named tokens.
- **FR-004**: The page body element MUST inherit background and text colors from the named tokens (cream background, brown text).
- **FR-005**: No new hardcoded brand color hex values MUST be introduced outside the centralized token definition.
- **FR-006**: The web application MUST build successfully after token changes with no regressions in the build pipeline.
- **FR-007**: The feature MUST achieve ≥80% line/branch coverage across backend and frontend for this feature (CI-enforced; Constitution III). For this frontend-only milestone, coverage applies to any new or modified token verification utilities and tests; no backend changes are expected.

### Key Entities

- **Core color token**: A named brand color (Lodgepole Brown, Alpine Sunset, Canvas Cream, Pure White) with a fixed hex value from the Montana High Country brand guide; the authoritative source for that color across the application.
- **Derived semantic token**: A named value computed from or mapped to a core token (e.g., border derived from brown at reduced opacity, text-on-dark mapped to cream) for a specific UI purpose.
- **Token definition block**: The single global location where all brand tokens are declared and from which all other styles reference values.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of the four core brand colors are present as named global tokens with hex values matching the Montana High Country brand guide.
- **SC-002**: 100% of required derived semantic tokens (text-on-light, text-on-dark, subtle border, button radius, card shadow) are defined and traceable to core palette values.
- **SC-003**: Default page background and text color use named tokens with zero hardcoded brand hex values at the document root and body level.
- **SC-004**: The web application build completes successfully after token implementation.
- **SC-005**: ≥80% line/branch coverage achieved across backend and frontend code for this feature (CI-enforced; Constitution III).

## Assumptions

- The Montana High Country brand guide in the Linear "Branding and theming" project is the authoritative reference for color names and hex values.
- This milestone (M1) covers token definition and root-level defaults only; component-level restyling, typography/font loading (SPLR-80), and legacy hex removal from individual component rules are handled by subsequent milestones (SPLR-81 through SPLR-95).
- Tokens are implemented as CSS custom properties in the existing plain-CSS styling approach; introducing a new styling framework is out of scope.
- The parent epic (SPLR-96, spec `058-brand-theming-mhc`) provides broader context; this spec scopes strictly to SPLR-79 acceptance criteria.
- SPLR-79 blocks eight downstream milestones (SPLR-80, SPLR-81, SPLR-85, SPLR-86, SPLR-88, SPLR-89, SPLR-90, SPLR-92); completing this milestone unblocks all of them.
- Backend coverage requirement is satisfied by N/A or minimal test utilities only; no API or database changes are in scope.

## Dependencies

- Linear issue SPLR-79 (M1 — Design tokens & typography foundation).
- Parent epic SPLR-96 / spec `058-brand-theming-mhc` for brand guide context and downstream milestone sequencing.
- Branding and theming Linear project for authoritative palette values.
