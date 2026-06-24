# Feature Specification: Brand Logo Component (Text & Badge Variants)

**Feature Branch**: `062-brand-logo-component`

**Created**: 2026-06-24

**Status**: Draft

**Input**: User description: "Create BrandLogo component with text and badge variants" (Linear [SPLR-83](https://linear.app/audiodex/issue/SPLR-83/create-brandlogo-component-with-text-and-badge-variants))

**Linear Issue**: [SPLR-83](https://linear.app/audiodex/issue/SPLR-83/create-brandlogo-component-with-text-and-badge-variants)

**Project Milestone**: M2 — Logo assets & navigation branding

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Full wordmark when navigation has room (Priority: P1)

A venue operator views the application with an expanded desktop sidebar or mobile navigation drawer. They see the full Split-Rail wordmark centered at the top of the navigation chrome, with comfortable spacing so the logo reads clearly and feels intentional rather than cramped.

**Why this priority**: The wordmark is the primary brand identifier when space allows. It must render reliably and look polished before any collapsed-rail or wiring work can deliver value.

**Independent Test**: Can be fully tested by rendering the logo in its full wordmark mode in isolation and confirming the correct branded image appears, is centered, and has adequate padding from surrounding edges.

**Acceptance Scenarios**:

1. **Given** the logo is displayed in full wordmark mode, **When** it renders, **Then** the Split-Rail wordmark image appears centered within its container.
2. **Given** the logo is displayed in full wordmark mode, **When** spacing is measured, **Then** at least 24px of padding separates the logo from adjacent navigation chrome on all sides.
3. **Given** no custom accessibility label is supplied, **When** the logo renders, **Then** screen readers announce a meaningful default brand name ("Split-Rail").

---

### User Story 2 - Compact badge when navigation is minimized (Priority: P1)

A user collapses the desktop sidebar to a narrow rail. The logo automatically switches to a compact badge mark that remains centered and visually balanced within the reduced width, preserving brand recognition without crowding navigation controls.

**Why this priority**: Collapsed navigation is a core interaction pattern; the badge variant is equally critical to the wordmark for a jank-free experience when toggling sidebar state.

**Independent Test**: Can be fully tested by rendering the logo in badge mode in isolation and confirming the compact badge image appears centered and fits within typical collapsed-rail widths.

**Acceptance Scenarios**:

1. **Given** the logo is displayed in compact badge mode, **When** it renders, **Then** the Split-Rail badge image appears centered within its container.
2. **Given** the logo is displayed in compact badge mode, **When** it is placed in a narrow navigation rail width, **Then** the image scales within defined maximum width constraints without overflowing or clipping navigation controls.
3. **Given** a parent container swaps from wordmark to badge mode, **When** the variant changes, **Then** the surrounding layout does not jump or reflow noticeably (stable wrapper slot).

---

### User Story 3 - Consistent, maintainable brand asset references (Priority: P2)

A developer or designer updates logo image files in the future. All logo variants continue to resolve to the correct branded images through a single centralized asset registry, so path changes do not require hunting through multiple components.

**Why this priority**: Centralized asset paths prevent drift and broken logos when files move or are replaced during the broader rebrand epic.

**Independent Test**: Can be fully tested by verifying both variants resolve their image sources exclusively through the shared brand asset registry, with no duplicate hardcoded paths elsewhere in the logo component.

**Acceptance Scenarios**:

1. **Given** the wordmark variant, **When** its image source is inspected, **Then** it references the centralized wordmark asset path from the brand asset registry.
2. **Given** the badge variant, **When** its image source is inspected, **Then** it references the centralized badge asset path from the brand asset registry.
3. **Given** a codebase search for brand logo paths, **When** complete, **Then** image path strings appear only in the centralized asset registry (not duplicated in the logo component or consumers).

---

### Edge Cases

- What happens when a consumer supplies a custom accessibility label? The logo MUST honor the provided label for screen readers.
- What happens when a consumer supplies additional layout classes? Optional wrapper classes MUST merge without breaking centering or variant-specific sizing.
- What happens when sidebar state toggles rapidly between expanded and collapsed? The stable wrapper slot and optional opacity transition MUST prevent visible layout jank; animation is optional but MUST NOT block instant variant swaps.
- What happens if logo asset files are missing? The component SHOULD still render an image element with the correct source reference so broken-image behavior is diagnosable; asset delivery is owned by the logo-assets milestone (SPLR-82).
- Is the authentication-screen logo variant in scope? No — SPLR-83 covers only `text` and `badge` variants; authentication logo treatment is handled separately within the parent branding epic.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The application MUST provide a reusable brand logo presentation that accepts a variant selector with exactly two modes: full wordmark (`text`) and compact badge (`badge`).
- **FR-002**: The wordmark variant MUST render the Split-Rail wordmark image sourced from the centralized brand asset registry.
- **FR-003**: The badge variant MUST render the Split-Rail badge image sourced from the centralized brand asset registry.
- **FR-004**: The logo MUST be centered within a stable wrapper container that reserves consistent vertical space to prevent layout shift when variants swap.
- **FR-005**: The wordmark variant MUST display with at least 24px padding between the logo and surrounding navigation chrome.
- **FR-006**: The badge variant MUST respect maximum width constraints suitable for collapsed navigation rail widths.
- **FR-007**: The logo MUST expose an optional custom accessibility label; when omitted, a meaningful default brand name ("Split-Rail") MUST be used.
- **FR-008**: The logo MUST expose an optional wrapper class hook so parent navigation containers can apply layout-specific styling without forking the component.
- **FR-009**: Brand logo image paths MUST be defined only in the centralized brand asset registry; the logo component and its consumers MUST NOT hardcode duplicate path strings.
- **FR-010**: Both variants MUST be verifiable through automated component tests that assert correct image source, variant-specific styling hooks, default accessibility label, and wrapper class merging.
- **FR-011**: The feature MUST achieve ≥80% line/branch coverage across backend and frontend for this feature (CI-enforced; Constitution III). For this frontend-only milestone, coverage applies to the logo component and its automated tests; no backend API changes are expected.

### Key Entities

- **Brand logo component**: A reusable presentation unit that renders one of two logo variants inside a stable, centered wrapper.
- **Wordmark variant**: Full Split-Rail text logo for expanded navigation and mobile drawer contexts.
- **Badge variant**: Compact Split-Rail mark for collapsed navigation rail contexts.
- **Brand asset registry**: Centralized definitions mapping logical logo roles (wordmark, badge) to public image paths.
- **Logo wrapper slot**: Layout container that centers the image and prevents vertical jump when variants change.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of automated component tests for the logo pass, covering both wordmark and badge variants including default and custom accessibility labels.
- **SC-002**: Manual inspection of expanded navigation shows the wordmark centered with ≥24px padding in 100% of audited layouts.
- **SC-003**: Manual inspection of collapsed navigation rail shows the badge centered and within width constraints in 100% of audited layouts.
- **SC-004**: Sidebar expand/collapse toggling produces no noticeable layout jump attributable to logo variant changes in 100% of manual trials.
- **SC-005**: Code review confirms zero hardcoded brand image paths outside the centralized asset registry.
- **SC-006**: ≥80% line/branch coverage achieved across backend and frontend code for this feature (CI-enforced; Constitution III).

## Assumptions

- Logo image files (wordmark and badge PNGs with transparent backgrounds) are delivered by SPLR-82 (logo assets milestone) before this component can be visually verified end-to-end; automated tests may use path assertions before assets land.
- Wiring the logo into sidebar, top bar, and mobile drawer navigation containers is explicitly out of scope for SPLR-83 and is handled by SPLR-84.
- The Montana High Country brand guide in the Linear "Branding and theming" project defines the wordmark and badge artwork; this milestone consumes those assets rather than creating new artwork.
- Parent epic spec `058-brand-theming-mhc` provides brand palette and navigation context; this spec narrows scope to the logo component only.
- Optional opacity transition on variant swap is a polish enhancement, not a blocking acceptance requirement.
- Authentication-screen logo (`auth` variant) is out of scope for this issue even if added elsewhere in the epic.

## Dependencies

- Linear issue [SPLR-82](https://linear.app/audiodex/issue/SPLR-82) — Logo asset files and centralized path constants (blocked-by; must complete first).
- Linear issue [SPLR-84](https://linear.app/audiodex/issue/SPLR-84) — Wire logo into navigation shell (blocked-by this milestone).
- Parent epic [SPLR-96](https://linear.app/audiodex/issue/SPLR-96) / spec `058-brand-theming-mhc` for brand guide and navigation branding context.
- Spec `058-brand-theming-mhc` contract `contracts/brand-logo.md` for cross-reference during planning (implementation detail deferred to plan phase).
