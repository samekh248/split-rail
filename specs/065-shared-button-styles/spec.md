# Feature Specification: Shared Primary and Secondary Button Styles

**Feature Branch**: `065-shared-button-styles`

**Created**: 2026-06-24

**Status**: Draft

**Input**: User description: "Implement shared primary and secondary button styles" (Linear SPLR-88, milestone M4 — Component theming)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Recognizable primary actions across the product (Priority: P1)

A venue operator or accountant performs a high-importance action — signing in, syncing financial data, locking a budget, or finalizing a settlement — and immediately recognizes the control as the main call-to-action through consistent Alpine Sunset orange styling, bold interface typography, and clear hover and focus feedback.

**Why this priority**: Primary buttons drive critical workflows. Inconsistent or legacy dark-slate styling undermines brand trust and makes it harder to spot the most important action on a busy financial screen.

**Independent Test**: Can be fully tested by visiting representative flows (authentication, dashboard empty state, QuickBooks sync, settlement finalize) and confirming every primary action button shares the same visual treatment sourced from brand design tokens.

**Acceptance Scenarios**:

1. **Given** a screen with a primary call-to-action, **When** it renders, **Then** the button background uses the Alpine Sunset accent color, label text uses a high-contrast light color (Canvas Cream or Pure White when contrast requires it), type is bold sans-serif, and corners are softly rounded within the brand's 4–6px radius range.
2. **Given** a primary button in its default state, **When** the user hovers or focuses it with keyboard navigation, **Then** the button provides visible feedback (darkened accent or subtle elevation) without changing its semantic role.
3. **Given** a primary button that is temporarily unavailable, **When** it is disabled, **Then** it appears visually muted, does not respond to pointer interaction, and retains an accessible disabled state.
4. **Given** a review of all submit-style and primary call-to-action buttons in the migrated surfaces, **When** complete, **Then** no legacy dark-slate (`#1e293b`) styling remains on those controls.

---

### User Story 2 - Clearly distinct secondary actions (Priority: P2)

A user encounters a supporting action — dismissing a modal, canceling a step, or choosing a non-destructive alternative — and can distinguish it from primary actions at a glance through secondary styling that uses Lodgepole Brown text and borders (or a subtle brown fill) rather than the orange accent fill.

**Why this priority**: Secondary actions prevent accidental primary submissions and reduce cognitive load. Without a shared secondary style, teams re-create one-off button treatments that clash with the Montana High Country palette.

**Independent Test**: Can be fully tested by placing a primary and secondary button side by side on a cream or white surface and confirming the secondary control is visually subordinate yet still readable and on-brand.

**Acceptance Scenarios**:

1. **Given** a screen that offers both a primary and secondary action, **When** both render, **Then** the secondary button uses Lodgepole Brown for label and border (or a restrained brown-tinted fill) and does not use the Alpine Sunset fill reserved for primary actions.
2. **Given** a secondary button on a light (cream or white) background, **When** the user hovers or focuses it, **Then** feedback is subtle (light background tint or border emphasis) and the control remains distinguishable from primary buttons.
3. **Given** a secondary button that is disabled, **When** rendered, **Then** it follows the same muted disabled treatment pattern as primary buttons for consistency.

---

### User Story 3 - High-traffic surfaces migrated to shared styles (Priority: P3)

A developer or QA reviewer audits the application's most-used action buttons and finds they all consume the shared primary or secondary styles instead of bespoke per-component color rules, so future brand adjustments propagate from one place.

**Why this priority**: Centralized styles only deliver value once high-traffic buttons adopt them. Migration completes the user-visible rebrand on authentication, onboarding, dashboard recovery, sync, and settlement flows.

**Independent Test**: Can be fully tested by exercising each migrated flow's automated tests and a visual audit checklist, confirming behavior and accessibility are unchanged while appearance matches the shared styles.

**Acceptance Scenarios**:

1. **Given** the authentication sign-in flow, **When** the submit control renders, **Then** it uses the shared primary button style.
2. **Given** the welcome onboarding modal and dashboard empty-state retry action, **When** they render, **Then** their action buttons use the shared primary style.
3. **Given** QuickBooks sync controls (single sync and sync-all), **When** they render, **Then** they use the shared primary style appropriate to their compact layout.
4. **Given** the settlement finalize call-to-action, **When** it renders, **Then** it uses the shared primary style.
5. **Given** any migrated button, **When** a user activates it, **Then** existing behavior (navigation, API calls, loading states, validation gating) is unchanged from before the style migration.

---

### Edge Cases

- What happens when Alpine Sunset on Canvas Cream fails contrast for small button labels? The specification allows Pure White label text on primary buttons when contrast validation requires it; the choice MUST be applied consistently through the shared style, not per-screen overrides.
- How should compact primary buttons (sync, lock budget) differ from standard primary buttons? They MAY use reduced padding and font size while retaining the same accent fill, typography family, radius, and interaction states.
- What about secondary buttons on dark (brown) navigation surfaces? Secondary styling on dark backgrounds MAY use cream-toned borders and text when brown-on-brown would fail contrast, provided the control remains visually subordinate to primary actions on that surface.
- What happens when a button is in a loading or in-progress state? Loading indicators and labels MUST remain legible against the primary or secondary button background without breaking shared color rules.
- How are destructive actions (delete, remove) handled? Destructive buttons are out of scope for this milestone unless they are currently styled as primary submit buttons; dedicated destructive styling is handled by a later component-theming milestone.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The application MUST provide a single shared primary button style that applies Alpine Sunset as the fill color, bold sans-serif label typography, brand button corner radius (4–6px), and a high-contrast light label color (Canvas Cream or Pure White when contrast requires).
- **FR-002**: The application MUST provide a single shared secondary button style that is visually distinct from primary buttons, using Lodgepole Brown for label and border (or a restrained brown-tinted fill) on light backgrounds.
- **FR-003**: Shared primary and secondary styles MUST define consistent hover, focus-visible, and disabled interaction states so keyboard and pointer users receive equivalent feedback.
- **FR-004**: Shared button styles MUST source all brand colors and radius values from the centralized Montana High Country design token set (dependency: design tokens milestone).
- **FR-005**: The following high-traffic primary actions MUST adopt the shared primary style: authentication form submit, welcome modal dismiss, dashboard empty-state retry, QuickBooks sync-now and sync-all controls, and settlement finalize call-to-action.
- **FR-006**: Migrated buttons MUST retain their existing behavior, accessibility roles, and automated test expectations; only visual presentation changes.
- **FR-007**: No legacy dark-slate (`#1e293b`) color MUST remain on submit-style or primary call-to-action buttons within the migrated scope.
- **FR-008**: Automated verification MUST confirm shared primary and secondary class definitions use design tokens (not hardcoded brand hex literals outside the token layer).
- **FR-009**: The feature MUST achieve ≥80% line/branch coverage across backend and frontend for this feature (CI-enforced; Constitution III). For this frontend-only milestone, coverage applies to new or updated button theme tests; no backend changes are expected.

### Key Entities

- **Primary button style**: The canonical visual and interaction pattern for the highest-priority action on a surface — accent fill, bold sans-serif label, standard or compact sizing, shared hover/focus/disabled states.
- **Secondary button style**: The canonical visual pattern for supporting actions — brown border and text (or subtle brown fill), shared hover/focus/disabled states, visually subordinate to primary.
- **Design token**: Named brand value (color, radius, shadow) defined in the global Montana High Country token set and referenced by shared button styles.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of the five high-traffic primary action surfaces listed in FR-005 render with the shared primary button style in manual or automated visual verification.
- **SC-002**: When primary and secondary buttons appear together on a cream or white surface, 90% or more of usability reviewers (or structured QA checklist runs) correctly identify which is the primary action without hesitation.
- **SC-003**: Zero instances of legacy dark-slate (`#1e293b`) remain on submit-style or primary call-to-action buttons within the migrated scope (verified by automated grep or lint check).
- **SC-004**: All existing automated tests for migrated flows pass without modification to behavioral assertions; only style-class or theme assertions may be added or updated.
- **SC-005**: ≥80% line/branch coverage achieved across backend and frontend code for this feature (CI-enforced; Constitution III).

## Assumptions

- The Montana High Country design token foundation (Lodgepole Brown, Alpine Sunset, Canvas Cream, Pure White, button radius, accent hover) is available before implementation begins (Linear SPLR-79 / spec `059-mhc-design-tokens`).
- This milestone delivers shared CSS-level button classes (and optional thin wrapper usage); a full reusable Button component library with every variant is out of scope unless required to complete migration.
- Secondary button styling on dark navigation chrome may use cream-toned variants for contrast; the default secondary style targets light (cream/white) content surfaces.
- Destructive, ghost, and link-style buttons are explicitly out of scope and will be addressed in subsequent M4 component-theming work (cards, tables, badges, remaining legacy color migration).
- Downstream milestones that theme auth layout, welcome/onboarding flows, and remaining legacy slate/blue hex values depend on this shared button foundation (Linear SPLR-92, SPLR-93, SPLR-91).
