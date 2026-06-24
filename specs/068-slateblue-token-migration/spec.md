# Feature Specification: Legacy Slate/Blue Color Token Migration

**Feature Branch**: `068-slateblue-token-migration`

**Created**: 2026-06-24

**Status**: Draft

**Input**: User description: "Migrate remaining component CSS from legacy slate/blue hex to tokens" ([Linear SPLR-91](https://linear.app/audiodex/issue/SPLR-91/migrate-remaining-component-css-from-legacy-slateblue-hex-to-tokens))

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consistent Montana High Country palette across all surfaces (Priority: P1)

A venue operator or accountant navigates ledger grids, forms, dashboard empty states, and settlement flows and sees a cohesive warm brown-and-orange visual language instead of scattered legacy slate-gray and blue accent colors left over from the pre-rebrand stylesheet.

**Why this priority**: Residual one-off hex colors undermine the brand rollout and make future palette adjustments expensive. Users perceive inconsistent coloring as unfinished or untrustworthy on financial screens.

**Independent Test**: Can be fully tested by loading representative screens (ledger, auth forms, dashboard empty state, settlement status chips) and confirming no legacy slate/blue palette colors appear; all colors trace to the centralized Montana High Country token set.

**Acceptance Scenarios**:

1. **Given** a review of the global stylesheet and component styles, **When** scanned for legacy slate/blue hex values (e.g., `#1e293b`, `#2563eb`, `#64748b`, `#e2e8f0`, `#f8fafc`), **Then** zero instances remain outside documented intentional exceptions.
2. **Given** ledger, dashboard, and form surfaces that previously used one-off gray or blue hex literals, **When** they render, **Then** backgrounds, borders, and text colors reference semantic design tokens (e.g., cream page background, white containers, brown text, subtle brown borders).
3. **Given** a global brand token update (e.g., accent orange hover darkens), **When** deployed, **Then** migrated surfaces inherit the change without per-component hex edits.

---

### User Story 2 - On-brand form field appearance (Priority: P2)

A user filling out authentication, onboarding, or ledger-related forms sees input fields with warm brown borders and orange focus rings that match the Montana High Country palette, not legacy blue focus outlines.

**Why this priority**: Form fields are high-interaction controls. Blue focus rings and gray borders signal the old design system and clash with the warm lodge aesthetic established in earlier M4 milestones.

**Independent Test**: Can be fully tested by tabbing through form fields on auth and data-entry screens and confirming default, focus, and error states use brown/orange/warm-red tokens rather than legacy blue or cool-gray hex values.

**Acceptance Scenarios**:

1. **Given** a standard text input in its default state, **When** rendered, **Then** the border uses a subtle brown token and the background uses the white surface token.
2. **Given** a focused form input (keyboard or pointer), **When** focus is visible, **Then** the focus ring and border emphasis use the brand accent orange token, not legacy blue.
3. **Given** a form input in an error state (`aria-invalid`), **When** rendered, **Then** the border and error message use the shared error token while remaining clearly distinguishable as an error (not confused with success or neutral states).

---

### User Story 3 - Harmonized status and feedback colors (Priority: P3)

An accountant reviewing settlement status chips, sync feedback banners, and ledger empty states sees success, warning, and error feedback that harmonizes with the warm palette—clear red/green semantic meaning preserved without cool-toned hex leftovers.

**Why this priority**: Status colors communicate financial state. They must remain instantly readable while fitting the brown/cream/orange environment rather than appearing as unrelated Tailwind defaults.

**Independent Test**: Can be fully tested by triggering success, warning, and error UI states across settlement and dashboard surfaces and confirming each uses token-backed warm-harmonized colors.

**Acceptance Scenarios**:

1. **Given** a success status indicator (e.g., synced, reconciled), **When** rendered, **Then** it uses token-backed success styling that reads clearly as positive without cool-gray backgrounds.
2. **Given** a warning or informational banner (e.g., variance notice, pending action), **When** rendered, **Then** it uses the shared warning background token rather than one-off amber hex literals.
3. **Given** an error message or error-status chip, **When** rendered, **Then** it uses the shared error token family (text, border, background) and remains visually distinct from warnings and success states.

---

### Edge Cases

- What happens when a color pattern repeats fewer than three times? It SHOULD map to an existing semantic token rather than introducing a new token; new semantic tokens are added only when the same visual pattern appears three or more times.
- What happens when `#ffffff` or other shorthand hex appears? Shorthand white/black literals SHOULD be replaced with surface or text tokens where they represent brand surfaces; truly universal values MAY remain as documented intentional exceptions.
- What happens when a component uses inline hex (e.g., canvas drawing stroke color)? Component-scoped colors outside the global stylesheet are in scope only when they represent UI chrome colors that should align with the token palette; canvas/signature ink colors MAY remain as documented exceptions.
- What happens when upstream M4 milestones (shared buttons, white/cream containers, orange badges) land concurrently? This milestone MUST not duplicate their scope; it completes remaining stylesheet and component color debt after those foundations land.
- What happens when contrast fails after token substitution? Colors MUST be adjusted at the token layer or via approved semantic aliases before merge; full WCAG audit is deferred to the downstream contrast milestone (Linear SPLR-94).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The global stylesheet MUST eliminate all legacy slate/blue hex values on the denylist (`#1e293b`, `#2563eb`, `#64748b`, `#e2e8f0`, `#f8fafc`, `#cbd5e1`, `#475569`, `#f6f7f9`, `#f1f5f9`, `#0f172a`) from component and layout rules; automated scan MUST pass.
- **FR-002**: After migration, the global stylesheet MUST contain at most five intentional hardcoded hex color literals outside the `:root` token definition block; each exception MUST include an inline comment explaining why a token is not used.
- **FR-003**: Form field styles (labels, inputs, focus-visible rings, and error states) MUST use Montana High Country semantic tokens: brown subtle borders, orange accent focus, and shared error tokens—never legacy blue focus (`#2563eb`) or cool-gray borders.
- **FR-004**: Error feedback (form validation messages, error-status chips, error banners) MUST use the centralized error token family and remain clearly distinguishable from success and warning states while harmonizing with the warm palette.
- **FR-005**: Success and warning feedback surfaces (settlement status chips, sync banners, ledger empty states, variance notices) MUST replace one-off hex literals with existing semantic tokens (`--color-warning-bg`, `--color-error-bg`, surface white, text muted, etc.) or newly introduced semantic tokens that meet the ≥3-repeat rule.
- **FR-006**: New semantic color tokens MUST be introduced only when the same visual pattern (same role and similar hue treatment) appears three or more times across the stylesheet; otherwise existing tokens or aliases MUST be reused.
- **FR-007**: Component styles under the web application source tree MUST not introduce new hardcoded brand hex literals; any remaining inline color in components MUST be documented as an intentional exception or migrated to tokens.
- **FR-008**: Automated verification MUST confirm the legacy hex denylist scan passes, form-field token usage, and the ≤5 intentional hex budget in the global stylesheet.
- **FR-009**: All existing automated tests MUST pass without regressions to behavioral assertions; theme and palette tests MAY be added or updated to lock in token usage.
- **FR-010**: The feature MUST achieve ≥80% line/branch coverage across backend and frontend for changed code paths (CI-enforced; Constitution III). For this frontend-only milestone, coverage applies to new or updated theme migration tests; no backend changes are expected.

### Key Entities

- **Design token**: A named brand or semantic color value defined in the global `:root` token block (e.g., Lodgepole Brown, Alpine Sunset, Canvas Cream, error/warning backgrounds) referenced by component styles instead of raw hex literals.
- **Semantic token alias**: A derived token that maps a UI role (muted text, input border, focus ring) to a brand token, enabling consistent reuse without repeating hex values.
- **Legacy hex denylist**: The canonical set of pre-rebrand slate/blue hex values that MUST NOT appear in migrated styles; enforced by automated scan.
- **Intentional hex exception**: A documented, counted hardcoded color literal permitted after migration when no token adequately represents the value (maximum five in the global stylesheet).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Automated legacy hex denylist scan reports zero matches in the global stylesheet and component styles within migration scope.
- **SC-002**: The global stylesheet contains five or fewer intentional hardcoded hex literals outside the token definition block, each with an explanatory comment (verified by automated count or lint check).
- **SC-003**: In a structured visual review of form fields on authentication and data-entry screens, 100% of default, focus, and error states use warm brown/orange/error tokens with no legacy blue focus rings.
- **SC-004**: In a structured review of settlement status, sync feedback, and ledger empty-state surfaces, 100% of success, warning, and error color treatments use token references rather than one-off hex literals.
- **SC-005**: All existing automated test suites pass; new theme tests confirm token migration constraints where added.
- **SC-006**: ≥80% line/branch coverage achieved across backend and frontend code for this feature (CI-enforced; Constitution III).

## Assumptions

- Shared primary/secondary button styles (Linear SPLR-88 / spec `065-shared-button-styles`), white/cream data containers (SPLR-89 / `066-white-cream-containers`), and orange alert badges (SPLR-90 / `067-orange-alert-badges`) land before or in parallel with this work; this milestone does not re-theme those surfaces.
- The Montana High Country token foundation (Lodgepole Brown, Alpine Sunset, Canvas Cream, Pure White, semantic error/warning tokens) is already defined in the global stylesheet `:root` block.
- Full WCAG AA contrast audit and automated color regression test suite are explicitly out of scope and handled by downstream milestones (Linear SPLR-94, SPLR-95) that this work unblocks.
- Signature pad canvas stroke color and similar non-chrome drawing colors may remain as documented exceptions if they do not affect brand surface styling.
- Scope is limited to the web frontend stylesheet and component styles; backend API responses and PDF generation styling are out of scope unless they inject legacy hex into the web UI.
- This milestone is part of M4 — Component theming under the Branding and Theming project (Linear epic SPLR-96).
