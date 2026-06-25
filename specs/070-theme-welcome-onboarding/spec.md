# Feature Specification: Welcome Modal and Onboarding Flow Theming

**Feature Branch**: `070-theme-welcome-onboarding`

**Created**: 2026-06-24

**Status**: Draft

**Input**: User description: "Theme welcome modal and onboarding flows" ([Linear SPLR-93](https://linear.app/audiodex/issue/SPLR-93/theme-welcome-modal-and-onboarding-flows))

**Linear Issue**: [SPLR-93](https://linear.app/audiodex/issue/SPLR-93/theme-welcome-modal-and-onboarding-flows)

**Project Milestone**: M5 — Auth & onboarding theming

## User Scenarios & Testing *(mandatory)*

### User Story 1 - New user sees a branded welcome after onboarding (Priority: P1)

A user who has just completed registration and organization setup lands in the dashboard for the first time. A welcome overlay appears that feels unmistakably like Split-Rail: a warm brown-tinted backdrop over the workspace, a white card with subtle depth, a slab-serif brand heading, warm body copy, and a prominent Alpine Sunset "Get started" action that matches sign-in and registration.

**Why this priority**: The welcome moment is the first authenticated brand touchpoint after account creation. A generic or cool-toned modal breaks the continuity established during sign-up and signals an unfinished product before the user explores the workspace.

**Independent Test**: Can be fully tested by completing onboarding (or simulating first-landing state), confirming the welcome overlay renders with Montana High Country styling, and dismissing it to reveal the dashboard without functional regression.

**Acceptance Scenarios**:

1. **Given** a newly onboarded user on their first dashboard landing, **When** the welcome overlay appears, **Then** the backdrop uses a warm brown-tinted scrim over the workspace and the dialog panel sits on a Pure White surface with subtle border or shadow depth.
2. **Given** the welcome overlay heading, **When** it renders, **Then** the title uses brand slab-serif display typography and Lodgepole Brown text color.
3. **Given** the welcome overlay body copy, **When** it renders, **Then** supporting text uses warm muted neutral tones from the Montana High Country palette—not legacy cool-gray body text.
4. **Given** the welcome overlay dismiss action ("Get started"), **When** it renders, **Then** it uses the shared primary button style (Alpine Sunset fill, bold sans-serif label, on-brand hover and focus states).
5. **Given** a keyboard user interacting with the welcome overlay, **When** they tab through controls or press Escape, **Then** focus trapping, Escape dismissal, and backdrop-click dismissal behave exactly as before—only visual presentation changes.

---

### User Story 2 - Returning user completing organization setup sees branded auth flow (Priority: P1)

A returning user who signed in without an organization reaches the organization-creation step. That screen visually matches the branded sign-in and registration experience—cream page background, white card, brown slab-serif title, on-brand form fields, and a shared primary submit action—so the post-auth onboarding path feels continuous.

**Why this priority**: Organization creation is a critical completion path for users with incomplete onboarding. Visual inconsistency at this step increases abandonment before the user reaches a usable workspace.

**Independent Test**: Can be fully tested by rendering the organization-creation step in isolation and confirming it inherits the same branded authentication layout treatment as sign-in and registration, including primary submit styling.

**Acceptance Scenarios**:

1. **Given** a user on the organization-creation step, **When** the screen renders, **Then** it presents content inside the branded authentication layout (Canvas Cream page, Pure White card, Lodgepole Brown slab-serif title).
2. **Given** the organization-creation form fields, **When** the user focuses a field or encounters a validation error, **Then** focus rings and error states use on-brand warm palette tokens—not legacy cool-gray or blue tones.
3. **Given** the organization-creation submit action, **When** it renders, **Then** it uses the shared primary button style consistent with sign-in and registration.
4. **Given** a side-by-side review of sign-in, registration, and organization-creation screens, **When** complete, **Then** no legacy generic SaaS slate or blue styling remains on the organization-creation step.

---

### User Story 3 - Auth resolving state feels on-brand during initial load (Priority: P2)

A user opens the application while authentication state is being determined. Instead of a flash of unbranded neutral gray, they see a full-viewport Canvas Cream background with warm muted status text centered on screen—consistent with the authentication entry experience.

**Why this priority**: The resolving state is brief but highly visible on every cold load. Off-brand loading presentation undermines trust before the user sees any product value.

**Independent Test**: Can be fully tested by observing the application during initial authentication resolution and confirming the loading state uses cream background and warm muted text from the brand palette.

**Acceptance Scenarios**:

1. **Given** a user loading the application while authentication is resolving, **When** the resolving state renders, **Then** the full-page background uses Canvas Cream.
2. **Given** the resolving status message, **When** it renders, **Then** text uses warm muted neutral tones from the Montana High Country palette.
3. **Given** authentication resolution completes, **When** the user is routed to dashboard or entry screens, **Then** there is no jarring color flash between resolving and destination screens.

---

### User Story 4 - Regression-safe onboarding theming verification (Priority: P2)

A developer or QA engineer updates onboarding components in the future. Automated tests confirm branded welcome modal structure, primary button adoption, authentication layout inheritance on organization creation, and palette compliance remain correct, and existing welcome modal functional tests continue to pass.

**Why this priority**: The welcome modal is reused as a dialog pattern elsewhere in the product. Automated verification prevents silent visual regressions and satisfies the project's quality gate.

**Independent Test**: Can be fully tested by running the welcome modal and onboarding theme test suites and confirming branded structure assertions pass alongside unchanged dismiss, focus-trap, and Escape behavior.

**Acceptance Scenarios**:

1. **Given** the welcome modal automated test suite, **When** executed, **Then** tests verify branded modal structure, primary dismiss button styling, and unchanged functional dismiss behavior (button click, Escape, backdrop click).
2. **Given** the organization-creation theme tests, **When** executed, **Then** tests verify branded authentication layout structure and shared primary submit button usage.
3. **Given** coverage metrics for changed onboarding theming surfaces, **When** the continuous integration build runs, **Then** line and branch coverage for this feature meets or exceeds the 80% threshold.

---

### Edge Cases

- What happens when the welcome overlay is dismissed? The dashboard workspace is revealed immediately with no change to existing dismiss semantics (button, Escape, backdrop click).
- Does the welcome overlay reappear for returning users? It appears only for the first post-onboarding landing; ordinary returning-user logins MUST NOT show the welcome overlay (existing behavior unchanged).
- What happens at narrow mobile widths (~375px)? The welcome dialog, title, body copy, and dismiss action MUST remain fully usable without horizontal scrolling or clipped focus rings.
- How should the welcome overlay behave when the organization name is long? Body copy MUST wrap gracefully without breaking layout or truncating critical information.
- What about other dialogs that share the welcome modal visual pattern (for example, team management modals)? They SHOULD inherit the same branded backdrop and white-card treatment when they reuse the shared modal styling, but dedicated team-management UX changes are out of scope unless trivially aligned through shared styles.
- How is organization creation handled when the user arrived via registration vs. returning login? Both paths MUST present the same branded organization-creation experience; functional routing differences are unchanged.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The post-onboarding welcome overlay MUST present a Pure White dialog panel over a warm brown-tinted backdrop scrim consistent with the Montana High Country palette.
- **FR-002**: The welcome overlay title MUST use brand slab-serif display typography and Lodgepole Brown text color.
- **FR-003**: The welcome overlay body copy MUST use warm muted neutral tones from the centralized design token set—not legacy cool-gray body text.
- **FR-004**: The welcome overlay dismiss action MUST use the shared primary button style defined in the component-theming milestone (Alpine Sunset fill, bold sans-serif label, consistent hover, focus-visible, and disabled states).
- **FR-005**: Welcome overlay functional behavior MUST remain unchanged: modal focus trap, Escape key dismissal, backdrop click dismissal, and restoration of prior focus on close.
- **FR-006**: The organization-creation step MUST inherit the branded authentication layout treatment (Canvas Cream page, Pure White card, Lodgepole Brown slab-serif title, on-brand form fields and errors) consistent with sign-in and registration.
- **FR-007**: The organization-creation submit action MUST use the shared primary button style.
- **FR-008**: The authentication-resolving loading state MUST use a Canvas Cream full-page background and warm muted status text from the brand palette.
- **FR-009**: Onboarding theming MUST NOT alter existing functional behavior—registration orchestration, organization creation validation, routing, welcome overlay show/hide rules, and accessibility associations remain unchanged.
- **FR-010**: Automated tests for the welcome modal and organization-creation onboarding flows MUST assert branded structure and primary button adoption, and MUST pass in continuous integration.
- **FR-011**: This feature MUST achieve ≥80% line/branch coverage across backend and frontend for all new or modified code paths (CI-enforced; Constitution III). Backend coverage is not applicable if no server changes are made; frontend coverage applies to all touched onboarding theming surfaces.

### Key Entities *(include if feature involves data)*

- **Welcome Overlay**: The first-landing dialog shown after successful onboarding, displaying the organization name and a dismiss action to enter the workspace.
- **Organization Creation Step**: The post-sign-in onboarding screen where a user without an organization supplies an organization name before entering the workspace.
- **Authentication Resolving State**: The brief full-page loading presentation shown while the application determines whether the user is authenticated and where to route them.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of post-registration onboarding surfaces (welcome overlay, organization-creation step, authentication-resolving state) present the Montana High Country palette with no legacy blue link or generic cool-gray SaaS styling visible on primary layout elements.
- **SC-002**: Users can review the welcome overlay and organization-creation step at mobile (~375px) and desktop (~1280px) widths with all branded elements visible and operable without horizontal scrolling.
- **SC-003**: Keyboard-only users can interact with the welcome overlay (tab through controls, dismiss via Escape) with visible on-brand focus indicators and unchanged focus-trap behavior.
- **SC-004**: Welcome modal and onboarding theme automated tests pass in CI, including assertions for branded structure and shared primary button usage alongside unchanged functional dismiss behavior.
- **SC-005**: ≥80% line/branch coverage achieved across backend and frontend code for this feature (CI-enforced; Constitution III); frontend-only scope satisfies this gate for all modified onboarding theming surfaces.

## Assumptions

- Welcome modal, organization-creation step, and authentication-resolving state already exist functionally (prior registration and onboarding features); this milestone is visual theming only with no change to API contracts or authentication logic.
- Montana High Country design tokens (M1) and shared primary button styles (M4) are available; branded authentication layout theming (SPLR-92) is completed or in progress so organization creation inherits layout styling through the shared authentication layout shell.
- The welcome overlay reuses a shared modal visual pattern also used by team-management dialogs; aligning shared backdrop and card styles benefits those surfaces automatically without dedicated team UX work.
- No backend or database changes are required; coverage obligations apply to frontend presentation and test layers only.
- WCAG AA contrast audit and any token adjustments required to meet accessibility thresholds are handled in a downstream milestone (SPLR-94); this feature applies the established token set as specified in prior branding work.

## Dependencies

- **Blocked by**: Global CSS design tokens — Montana High Country palette (M1); shared primary and secondary button styles (SPLR-88, M4); branded authentication layout for sign-in, registration, and organization creation (SPLR-92, M5).
- **Related to**: Branding & Theming epic (SPLR-96); registration and organization onboarding flow (prior feature 007).
- **Blocks**: WCAG AA contrast audit and token adjustments (SPLR-94).
