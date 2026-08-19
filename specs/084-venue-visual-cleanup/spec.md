# Feature Specification: Venue Visual Cleanup

**Feature Branch**: `084-venue-visual-cleanup`

**Created**: 2026-08-16

**Status**: Draft

**Input**: User description: "venue visual cleanup. The festival section when viewing event details needs to have the same whitespace as the rest of the view. It is closer to the edges than the rest. The primary button for any section should be right aligned, not left aligned. This goes for the entire application. The 'Sync Now' button is just floating out in the middle of nowhere. Make it look like it belongs."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consistent festival section spacing (Priority: P1)

When an operator views an event’s details, the festival section aligns with the rest of the event workspace. Its horizontal and vertical spacing feels like a deliberate part of the page rather than a panel pressed closer to the edge.

**Why this priority**: The visual inconsistency is immediately apparent in the event workflow and makes a core festival entry point look unfinished.

**Independent Test**: Open a standard event and a festival-enabled event at representative desktop and narrow viewport widths; compare the festival section’s outer spacing and alignment with adjacent event sections.

**Acceptance Scenarios**:

1. **Given** an operator is viewing event details with the festival section available, **When** they scan the page, **Then** the festival section’s left/right alignment and surrounding whitespace match adjacent sections.
2. **Given** an operator views the event workspace on a narrow screen, **When** the layout reflows, **Then** the festival section retains the same visual inset and breathing room as other workspace content without horizontal overflow.

---

### User Story 2 - Predictable primary action placement (Priority: P1)

When an operator encounters a section with a primary action, the action appears at the right edge of that section’s header or action row. Operators can consistently find the action without scanning the left edge or a floating location.

**Why this priority**: A consistent visual hierarchy improves scanability and reduces ambiguity across the application’s operational screens.

**Independent Test**: Review every section-level primary action in the application’s authenticated views; each is right-aligned within its containing section while preserving usable narrow-screen behavior.

**Acceptance Scenarios**:

1. **Given** a section presents a primary action, **When** an operator views the section at desktop width, **Then** the primary action is right-aligned within that section rather than left-aligned.
2. **Given** a section header wraps on a narrow screen, **When** space is insufficient for a single row, **Then** the primary action remains visually associated with its section and is still clearly distinguished from secondary actions.
3. **Given** a section has no primary action, **When** an operator views it, **Then** its existing content alignment is not changed solely by this feature.

---

### User Story 3 - Contextual Sync Now action (Priority: P2)

When an operator can manually synchronize an event, the Sync Now action appears in a clear event-level action area instead of floating between unrelated content. Its placement makes the action’s scope and purpose obvious.

**Why this priority**: The current placement can look disconnected from the event it affects and makes the screen harder to scan.

**Independent Test**: Open an event with sync permission and locate Sync Now; verify it appears with the event’s other relevant actions and remains discoverable at narrow widths.

**Acceptance Scenarios**:

1. **Given** an operator has permission to synchronize an event, **When** they view its details, **Then** Sync Now appears in a deliberate event action area that visually belongs to the page or relevant section.
2. **Given** an operator lacks sync permission, **When** they view the event, **Then** no empty or misaligned action area remains.
3. **Given** Sync Now is in progress, **When** the operator views the action area, **Then** the in-progress state remains clear and the layout does not shift unexpectedly.

---

### Edge Cases

- A section may have multiple actions: its primary action is right-aligned while secondary actions remain grouped and visually subordinate.
- A primary action may be disabled or hidden by permissions: the remaining header content must retain balanced spacing.
- Sections with long titles, translated labels, or narrow viewports must not overlap their actions or produce horizontal scrolling.
- The event workspace may show neither sync nor festival capabilities for some roles/events; no blank action space should be introduced.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The festival section in event details MUST use the same outer spacing and horizontal alignment convention as adjacent event-workspace sections.
- **FR-002**: The festival section MUST remain visually aligned and free of horizontal overflow at supported narrow viewport widths.
- **FR-003**: Every section-level primary action in authenticated application views MUST be placed at the right side of its containing section header or action row at desktop widths.
- **FR-004**: Section-level primary actions MUST remain associated with their section and usable when the header wraps at narrow widths.
- **FR-005**: Secondary actions and sections without a primary action MUST preserve a clear visual hierarchy and must not gain empty alignment space.
- **FR-006**: The event-level Sync Now action MUST be placed in a contextual action area that clearly communicates its event scope.
- **FR-007**: Sync Now visibility, disabled state, permission behavior, and progress feedback MUST remain unchanged by the visual repositioning.
- **FR-008**: The visual cleanup MUST preserve existing application functionality and responsive behavior outside the affected layout and action-placement surfaces.
- **FR-009**: System MUST achieve ≥80% line/branch coverage across backend and frontend for this feature (CI-enforced; Constitution III).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Visual review at desktop and narrow viewport widths finds the festival section aligned with adjacent event-workspace sections in 100% of representative event-detail states.
- **SC-002**: Visual review of all authenticated section-level primary actions finds 100% placed on the right side of their containing section at desktop width, except where a documented accessibility or responsive exception applies.
- **SC-003**: Operators can identify the event scope of Sync Now without relying on surrounding body content in 100% of the event-detail review scenarios.
- **SC-004**: No affected view shows horizontal scrolling, overlapping action controls, or empty action-row gaps at supported narrow viewport widths.
- **SC-005**: ≥80% line/branch coverage achieved across backend and frontend code for this feature (CI-enforced; Constitution III).

## Assumptions

- “Primary button” means the primary action within a discrete content section, not global navigation, modal confirmation actions, compact inline controls, or full-page empty-state calls to action.
- The scope covers existing authenticated application views; unauthenticated sign-in, registration, and onboarding flows retain their current action placement unless they share an affected reusable section pattern.
- Existing visual design tokens, responsive breakpoints, and permission rules are reused; the feature introduces no new data, permissions, or backend behavior.
- Sync Now refers to the event-level manual synchronization action, while venue-wide or accounting-wide synchronization controls are reviewed for consistency but only moved when they meet the same section-level criterion.
