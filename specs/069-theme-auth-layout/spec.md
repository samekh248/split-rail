# Feature Specification: Branded Authentication Layout Theming

**Feature Branch**: `069-theme-auth-layout`

**Created**: 2026-06-24

**Status**: Draft

**Input**: User description: "Theme auth layout (login, registration, org creation)" ([Linear SPLR-92](https://linear.app/audiodex/issue/SPLR-92/theme-auth-layout-login-registration-org-creation))

**Linear Issue**: [SPLR-92](https://linear.app/audiodex/issue/SPLR-92/theme-auth-layout-login-registration-org-creation)

**Project Milestone**: M5 — Auth & onboarding theming

## User Scenarios & Testing *(mandatory)*

### User Story 1 - First-time visitor sees a branded sign-in experience (Priority: P1)

A prospective or returning user opens the application and lands on the sign-in screen. The page feels unmistakably like Split-Rail: a warm cream workspace background, a white card with subtle depth, brown brand typography for the heading, on-brand accent colors for links and the primary submit action, and visible focus feedback when navigating by keyboard.

**Why this priority**: Sign-in is the first brand touchpoint for most returning users. Generic cool-toned or legacy blue styling undermines trust before the user reaches any product value.

**Independent Test**: Can be fully tested by opening the sign-in screen at representative mobile and desktop widths and confirming every visual element (background, card, title, links, submit action, focus rings) uses the Montana High Country palette and shared primary button treatment.

**Acceptance Scenarios**:

1. **Given** a signed-out user on the sign-in screen, **When** the page renders, **Then** the full-page background uses the warm Canvas Cream tone and the form sits on a Pure White card with subtle brown-tinted border or soft shadow depth.
2. **Given** the sign-in screen heading, **When** it renders, **Then** the title uses the brand slab-serif display typography and Lodgepole Brown text color.
3. **Given** navigation text and inline action links on the sign-in screen (for example, "Create an account"), **When** they render, **Then** they use Lodgepole Brown or Alpine Sunset accent tones—not legacy blue link colors.
4. **Given** the sign-in submit action, **When** it renders, **Then** it uses the shared primary button style (Alpine Sunset fill, bold sans-serif label, on-brand hover and focus states).
5. **Given** a keyboard user tabbing through sign-in fields and actions, **When** focus moves to an interactive control, **Then** a visible, on-brand focus indicator appears that meets accessibility contrast expectations.

---

### User Story 2 - New user registration matches the same brand language (Priority: P1)

A first-time user switches to account registration. The registration screen reuses the same branded authentication layout as sign-in so the experience feels cohesive from the first field through organization setup on the registration form.

**Why this priority**: Registration is the primary acquisition path. Visual inconsistency between sign-in and registration signals an unfinished product and increases drop-off before account creation.

**Independent Test**: Can be fully tested by navigating from sign-in to registration and confirming layout, card treatment, typography, link colors, form field styling, and submit action match the branded sign-in patterns.

**Acceptance Scenarios**:

1. **Given** a user on the registration screen, **When** it renders, **Then** the page background, card surface, title typography, and depth treatment match the sign-in screen's Montana High Country styling.
2. **Given** the registration form fields, **When** the user focuses a field or encounters a validation error, **Then** focus rings and error states use on-brand warm palette tokens—not legacy cool-gray or blue tones.
3. **Given** the registration submit action, **When** it renders, **Then** it uses the same shared primary button style as sign-in.
4. **Given** a side-by-side review of sign-in and registration screens, **When** complete, **Then** no legacy generic SaaS slate or blue styling remains on either screen.

---

### User Story 3 - Organization creation step feels part of the auth journey (Priority: P2)

A user who signed in without an organization reaches the organization-creation step. That step uses the same branded authentication layout—cream background, white card, brown headings, primary submit styling—so onboarding feels continuous rather than a sudden visual break.

**Why this priority**: Organization creation completes the auth/onboarding funnel for edge-case returning users. It is second priority because the majority of new users create their organization during registration (P1), but the step must not look like a different product.

**Independent Test**: Can be fully tested by rendering the organization-creation step in isolation and confirming it uses the branded auth layout structure, shared primary submit styling, and the same palette rules as sign-in and registration.

**Acceptance Scenarios**:

1. **Given** a user on the organization-creation step, **When** it renders, **Then** it presents content inside the same branded auth card layout (cream page, white card, brown title).
2. **Given** the organization-creation submit action, **When** it renders, **Then** it uses the shared primary button style.
3. **Given** a user completing organization creation, **When** they submit valid input, **Then** existing functional behavior (validation, loading state, error display) is unchanged—only visual presentation is updated.

---

### User Story 4 - Optional brand logo reinforces identity on entry screens (Priority: P3)

A user opening sign-in or registration sees the Split-Rail wordmark centered above the card title when space allows, reinforcing brand recognition at the authentication entry point.

**Why this priority**: The logo strengthens first impressions but is optional relative to palette and layout correctness. Sign-in and registration remain usable without the logo if layout constraints require it.

**Independent Test**: Can be fully tested by rendering sign-in (and optionally registration) with the logo enabled and confirming the wordmark appears centered above the title with balanced spacing within the auth card.

**Acceptance Scenarios**:

1. **Given** the sign-in screen with logo display enabled, **When** it renders, **Then** the Split-Rail wordmark appears centered above the page title within the auth card.
2. **Given** the logo above the title, **When** spacing is evaluated, **Then** the wordmark and title do not overlap or crowd form fields at mobile and desktop widths.
3. **Given** registration with logo display enabled, **When** evaluated, **Then** the same centered wordmark treatment MAY appear for parity with sign-in.

---

### User Story 5 - Regression-safe auth theming verification (Priority: P2)

A developer or QA engineer updates authentication components in the future. Automated tests confirm the branded auth layout structure, primary button adoption, and palette compliance remain correct, and existing auth test suites continue to pass.

**Why this priority**: Auth layout is shared across multiple entry flows. Automated verification prevents silent visual regressions during refactors and satisfies the project's quality gate.

**Independent Test**: Can be fully tested by running the authentication layout automated test suite and confirming branded structure assertions pass alongside unchanged functional behavior.

**Acceptance Scenarios**:

1. **Given** the authentication layout test suite, **When** executed, **Then** tests verify the branded auth layout class structure, card container, and title styling hooks remain present.
2. **Given** login, registration, and organization-creation flows, **When** their automated tests run, **Then** submit actions are verified to use the shared primary button treatment.
3. **Given** coverage metrics for changed auth layout styling, **When** the continuous integration build runs, **Then** line and branch coverage for this feature meets or exceeds the 80% threshold.

---

### Edge Cases

- What happens when a session-expired notice appears on sign-in? The notice MUST use warm on-brand warning styling (not legacy amber or blue info banners) and remain readable within the white auth card.
- How should inline validation and form-level errors appear? Error backgrounds, borders, and text MUST use the Montana High Country error token palette and remain legible on the white card surface.
- What happens at narrow mobile widths (~375px)? The auth card, logo (if shown), title, fields, and submit action MUST remain fully usable without horizontal scrolling or clipped focus rings.
- How are auth screens handled while authentication state is resolving? The resolving/loading state SHOULD use the same cream background tone so users do not see a flash of unbranded styling.
- What about invitation-acceptance screens that reuse auth layout patterns? They SHOULD inherit the same branded auth styling when they share the auth layout, but dedicated invitation-flow behavior is out of scope unless trivially aligned.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The shared authentication layout MUST render sign-in, registration, and organization-creation flows on a Canvas Cream full-page background.
- **FR-002**: The authentication form container MUST use a Pure White surface with subtle brown-tinted border or soft card shadow for depth, consistent with the white-on-cream container language established for operational data surfaces.
- **FR-003**: Authentication screen titles MUST use brand slab-serif display typography and Lodgepole Brown text color.
- **FR-004**: Authentication screen body text, subtitles, and navigation helper copy MUST use readable warm neutral tones from the Montana High Country palette—not legacy cool-gray body text.
- **FR-005**: Inline action links within authentication screens (for example, toggling between sign-in and registration) MUST use Lodgepole Brown or Alpine Sunset accent colors and MUST NOT use legacy blue link styling.
- **FR-006**: Primary submit actions on sign-in, registration, and organization-creation screens MUST use the shared primary button style defined in the component-theming milestone (Alpine Sunset fill, bold sans-serif label, consistent hover, focus-visible, and disabled states).
- **FR-007**: Form fields within authentication screens MUST use on-brand border, text, focus, and error styling sourced from the centralized design token set.
- **FR-008**: All interactive controls within authentication flows MUST expose visible focus indicators that use on-brand focus-ring tokens and remain discernible for keyboard users.
- **FR-009**: Sign-in screens MUST support displaying the Split-Rail wordmark centered above the card title; registration screens MAY display the same wordmark for brand parity.
- **FR-010**: Authentication theming MUST NOT alter existing functional behavior—credential validation, submission orchestration, routing, error messaging semantics, and accessibility associations remain unchanged.
- **FR-011**: Automated tests for the authentication layout and themed auth flows MUST be updated to assert branded structure and primary button adoption, and MUST pass in continuous integration.
- **FR-012**: This feature MUST achieve ≥80% line/branch coverage across backend and frontend for all new or modified code paths (CI-enforced; Constitution III). Backend coverage is not applicable if no server changes are made; frontend coverage applies to all touched auth layout and styling surfaces.

### Key Entities *(include if feature involves data)*

- **Authentication Layout Shell**: The shared visual frame (page background, centered card, title area, optional logo slot, footer/navigation area) wrapping sign-in, registration, and organization-creation content.
- **Branded Auth Surface**: The combined visual treatment—palette tokens, typography rules, button styles, and focus/error states—applied consistently across all authentication entry screens.
- **Organization Creation Step**: The post-sign-in onboarding screen where a user without an organization supplies an organization name before entering the workspace.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of authentication entry screens (sign-in, registration, organization creation) present the Montana High Country palette with no legacy blue link or generic cool-gray SaaS styling visible on primary layout elements.
- **SC-002**: Users can complete sign-in or registration visual review at mobile (~375px) and desktop (~1280px) widths with all branded elements visible and operable without horizontal scrolling.
- **SC-003**: Keyboard-only users can tab through every interactive control on authentication screens and see a visible on-brand focus indicator on each focused element.
- **SC-004**: Authentication layout automated tests pass in CI, including updated assertions for branded structure and shared primary button usage.
- **SC-005**: ≥80% line/branch coverage achieved across backend and frontend code for this feature (CI-enforced; Constitution III); frontend-only scope satisfies this gate for all modified auth theming surfaces.

## Assumptions

- Sign-in, registration, and organization-creation flows already exist functionally (prior auth and onboarding features); this milestone is visual theming only with no change to API contracts or authentication logic.
- Montana High Country design tokens (M1) and shared primary button styles (M4) are available before or concurrently with this work; organization-creation already references shared primary styling in the codebase.
- Brand logo assets and the reusable logo component (M2) are available for the optional wordmark on entry screens but are not blocking if sign-in already displays a logo variant.
- Invitation-acceptance and other auth-adjacent screens that reuse the auth layout inherit styling automatically; dedicated invitation UX changes are out of scope.
- Welcome modal and broader onboarding theming (blocked downstream issue SPLR-93) are handled in a separate milestone; this feature focuses on the authentication layout shell and its immediate child forms.
- No backend or database changes are required; coverage obligations apply to frontend presentation and test layers only.

## Dependencies

- **Blocked by**: Global CSS design tokens — Montana High Country palette (SPLR-79, M1); shared primary and secondary button styles (SPLR-88, M4).
- **Related to**: Brand logo component (SPLR-83, M2 — optional wordmark on entry screens); Branding & Theming epic (SPLR-96).
- **Blocks**: Welcome modal and onboarding flow theming (SPLR-93, M5).
