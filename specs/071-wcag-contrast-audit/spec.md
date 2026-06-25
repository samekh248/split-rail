# Feature Specification: WCAG AA Contrast Audit and Token Adjustments

**Feature Branch**: `071-wcag-contrast-audit`

**Created**: 2026-06-24

**Status**: Draft

**Input**: User description: "WCAG AA contrast audit and token adjustments" ([Linear SPLR-94](https://linear.app/audiodex/issue/SPLR-94/wcag-aa-contrast-audit-and-token-adjustments))

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Readable body text on light surfaces (Priority: P1)

A venue operator or accountant with low vision or color-vision differences reads ledger data, dashboard summaries, and form labels on the warm cream page background and can distinguish all body text without straining or relying on browser zoom beyond normal use.

**Why this priority**: Body text on cream surfaces is the most frequent reading experience in the product. Failing contrast here affects every screen and undermines trust on financial data.

**Independent Test**: Can be fully tested by measuring contrast for default body text on cream and white container surfaces across representative pages (dashboard, ledger, settings) and confirming ratios meet WCAG AA thresholds for normal and large text.

**Acceptance Scenarios**:

1. **Given** default body text on the cream page background, **When** contrast is measured, **Then** the ratio is at least 4.5:1 for normal text and at least 3:1 for large text (headings and other text meeting the large-text size/weight threshold).
2. **Given** secondary or muted text on light surfaces (labels, captions, helper text), **When** contrast is measured, **Then** each pairing meets WCAG AA for its text size category.
3. **Given** a token adjustment is required to pass contrast, **When** the adjustment is applied at the design-token layer, **Then** all surfaces referencing that token inherit the fix without per-screen overrides.

---

### User Story 2 - Legible text on accent buttons and action controls (Priority: P2)

A user activating primary call-to-action buttons, orange alert badges, and other accent-colored controls can read button labels and badge text clearly at a glance, including when using keyboard focus indicators.

**Why this priority**: Accent orange is the primary action color. Poor label contrast on buttons blocks task completion on critical flows (settlement, sync, invitations).

**Independent Test**: Can be fully tested by measuring contrast for all text and icon treatments on orange accent backgrounds (default, hover, and focus-visible states) and confirming WCAG AA compliance for interactive elements.

**Acceptance Scenarios**:

1. **Given** a primary call-to-action button with accent orange background, **When** contrast between label text and button background is measured, **Then** the ratio meets WCAG AA for the text size used (minimum 4.5:1 normal, 3:1 large).
2. **Given** cream-colored text on orange fails the AA threshold, **When** tokens are adjusted, **Then** a compliant text-on-accent token (e.g., pure white) is introduced and applied consistently to all accent buttons and equivalent controls.
3. **Given** orange alert or action-required badges, **When** rendered with their label text, **Then** text/background contrast meets WCAG AA and remains visually consistent with other accent controls after any token changes.

---

### User Story 3 - Clear navigation text on dark sidebar surfaces (Priority: P3)

A user navigating via the sidebar or other dark brown chrome sees cream-toned labels, icons, and active-state indicators that remain readable against the lodgepole-brown background in both default and selected states.

**Why this priority**: Persistent navigation is always visible; low contrast here disorients users and fails accessibility expectations for structural UI.

**Independent Test**: Can be fully tested by measuring contrast for navigation labels, icons, and active/hover states on the dark sidebar background and confirming WCAG AA compliance.

**Acceptance Scenarios**:

1. **Given** default navigation labels on the brown sidebar background, **When** contrast is measured, **Then** the ratio meets WCAG AA for the text size category used in navigation.
2. **Given** a navigation item in hover, focus-visible, or active/selected state, **When** contrast is measured for text and essential indicators against their backgrounds, **Then** each state meets WCAG AA for interactive elements.
3. **Given** any sidebar pairing fails AA, **When** tokens are corrected, **Then** adjustments are made via semantic tokens so mobile drawer navigation and desktop sidebar share the same compliant palette.

---

### Edge Cases

- What happens when a derived token (e.g., muted text at reduced opacity) fails AA on cream but passes on white? Each surface pairing MUST be evaluated independently; opacity-derived tokens MUST be tuned or replaced so every in-use pairing passes.
- What happens when hover or focus states darken/lighten backgrounds? All interactive state variants (default, hover, focus-visible, disabled where text is still shown) MUST be included in the audit, not only the default state.
- What happens when a non-text UI element (icon-only control, border, focus ring) conveys information? Graphical objects and user-interface components that are essential for understanding or operation MUST meet the 3:1 contrast requirement against adjacent colors per WCAG AA.
- What happens when upstream token migration milestones are still in flight? This milestone assumes the Montana High Country token foundation and component token migration are substantially complete; residual legacy hex colors discovered during audit SHOULD be flagged and resolved at the token layer rather than with one-off component fixes.
- What happens when fixing contrast shifts brand appearance? Adjustments MUST prefer token-level changes that preserve the Montana High Country identity; documented before/after ratios justify any visible shift.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The product MUST undergo a systematic contrast audit covering every foreground/background color pairing used by the design-token system and applied across user-facing surfaces (page background, containers, navigation, buttons, badges, form fields, status feedback, and focus indicators).
- **FR-002**: The audit MUST explicitly verify the three highest-risk pairings called out in the brand accessibility requirements: lodgepole-brown text on canvas-cream backgrounds, label text on alpine-sunset accent backgrounds, and cream-toned text on lodgepole-brown navigation backgrounds.
- **FR-003**: All normal body text pairings MUST achieve a minimum contrast ratio of 4.5:1; all large text pairings MUST achieve a minimum ratio of 3:1, per WCAG 2.x Level AA.
- **FR-004**: All interactive control pairings (buttons, links, badges, form focus rings, and navigation active states) MUST meet WCAG AA contrast requirements appropriate to their text size and to non-text contrast rules where applicable.
- **FR-005**: Where an existing token pairing fails WCAG AA, the product MUST adjust design tokens (and dependent semantic aliases) to compliant values before release; one-off per-component color overrides MUST NOT be used as the primary remediation.
- **FR-006**: When cream text on accent orange fails AA, the product MUST adopt a compliant text-on-accent token (pure white or equivalent) and apply it consistently to all accent buttons, badges, and equivalent call-to-action surfaces.
- **FR-007**: When muted or secondary text tokens are derived from primary brown at reduced opacity, those derivations MUST be validated on every background where they appear; failing derivations MUST be retuned to pass AA while preserving visual hierarchy.
- **FR-008**: The audit MUST produce a committed contrast-audit document recording each evaluated pairing, measured ratio, pass/fail status against WCAG AA thresholds, and before/after values for any token that changed.
- **FR-009**: Button, badge, and navigation styles affected by token changes MUST be updated to consume the corrected semantic tokens so visual behavior remains consistent across the application.
- **FR-010**: Existing accessibility-focused automated tests MUST continue to pass after token and style adjustments; no new accessibility regressions MAY be introduced.
- **FR-011**: The feature MUST achieve ≥80% line/branch coverage across backend and frontend for this feature (CI-enforced; Constitution III). Coverage applies to contrast verification utilities, token regression checks, and any automated audit helpers added; no backend API changes are expected.

### Key Entities

- **Design Token**: A named color, opacity, or semantic alias in the centralized brand palette (core colors, text-on-surface roles, accent treatments, borders, focus rings) that styles reference instead of raw color literals.
- **Contrast Audit Record**: A documented entry for one foreground/background pairing including context (surface type, text size category, interactive state), measured ratio, WCAG AA threshold applied, pass/fail result, and remediation action if failed.
- **Text-on-Accent Token**: A semantic token defining label color on alpine-sunset (orange) backgrounds, introduced or updated when cream-on-orange fails AA.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of audited normal-text pairings in active use achieve a contrast ratio of at least 4.5:1.
- **SC-002**: 100% of audited large-text pairings in active use achieve a contrast ratio of at least 3:1.
- **SC-003**: 100% of audited interactive control and navigation pairings (including hover and focus-visible states) meet WCAG AA contrast requirements for their category.
- **SC-004**: The contrast-audit document lists every evaluated token pairing with measured ratios and documents before/after values for every token adjustment made during this milestone.
- **SC-005**: Zero accessibility regressions are detected in the existing accessibility-focused automated test suite after changes merge.
- **SC-006**: A stakeholder review of representative screens (dashboard, ledger, auth, settings navigation) confirms text and controls are comfortably readable without assistive zoom beyond 100% browser scaling.
- **SC-007**: ≥80% line/branch coverage achieved across backend and frontend code for this feature (CI-enforced; Constitution III).

## Assumptions

- Montana High Country core design tokens (lodgepole brown, alpine sunset, canvas cream, pure white) and semantic derived tokens from earlier branding milestones are in place before this audit begins.
- Component-level migration from legacy slate/blue hex values to tokens (Linear SPLR-91) and theme/onboarding styling (Linear SPLR-93) are complete or near-complete so the audit reflects the final token set, not transient legacy colors.
- WCAG 2.x Level AA is the target conformance level per the brand guide; AAA conformance is out of scope unless a pairing already exceeds AA without additional effort.
- Contrast measurement uses industry-standard relative luminance calculations equivalent to established accessibility checker tooling; exact tooling choice is an implementation decision.
- Adjustments prioritize token-level fixes over component exceptions to align with the design-system governance established in prior token milestones.
- This milestone is part of M6 (Accessibility verification and cleanup) within the Branding and Theming program (Linear SPLR-96 epic).
