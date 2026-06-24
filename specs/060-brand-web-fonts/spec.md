# Feature Specification: Brand Web Fonts (Zilla Slab + Inter)

**Feature Branch**: `060-brand-web-fonts`

**Created**: 2026-06-24

**Status**: Draft

**Input**: User description: "Import and configure brand web fonts (Zilla Slab + Inter)" (Linear [SPLR-80](https://linear.app/audiodex/issue/SPLR-80/import-and-configure-brand-web-fonts-zilla-slab-inter))

**Linear Issue**: [SPLR-80](https://linear.app/audiodex/issue/SPLR-80/import-and-configure-brand-web-fonts-zilla-slab-inter)

**Project Milestone**: M1 — Design tokens & typography foundation

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Branded typography loads on every screen (Priority: P1)

A venue operator or accountant opens Split-Rail in development or production and sees the Montana High Country two-font system: a bold slab-serif for headings and a clean sans-serif for everyday interface text. Fonts are available before primary content renders so the first impression matches the brand guide rather than a generic system fallback.

**Why this priority**: Font loading is the typography foundation for the entire rebrand. Without reliable delivery of Zilla Slab and Inter, downstream typography rules cannot be applied and users will see inconsistent or unbranded text.

**Independent Test**: Can be fully tested by loading representative pages in development and production builds and confirming heading and body text render in the brand typefaces (not browser default serif/sans-serif) with the specified weight variants available.

**Acceptance Scenarios**:

1. **Given** a user opens any page in the web application during local development, **When** the page finishes loading, **Then** Zilla Slab (bold/700) and Inter (regular 400, medium 500, bold 700) are available for use across the application.
2. **Given** a user opens any page from a production build, **When** the page finishes loading, **Then** the same brand fonts and weight variants load successfully without broken or missing font resources.
3. **Given** the application's global style foundation, **When** font tokens are inspected, **Then** named brand and UI font tokens exist with fallback stacks matching the Montana High Country brand guide.

---

### User Story 2 - Default interface text uses the brand UI typeface (Priority: P2)

A user reading navigation labels, form fields, table data, and body copy sees Inter (or an approved fallback from the brand guide stack) as the default interface typeface, establishing visual consistency before component-level heading rules are applied in a later milestone.

**Why this priority**: Setting the default body font to the UI typeface ensures unstyled or newly added content inherits the brand sans-serif rather than system defaults, reducing drift during incremental theming work.

**Independent Test**: Can be fully tested by loading a page with minimal component-specific typography overrides and confirming default text uses the UI font token.

**Acceptance Scenarios**:

1. **Given** the global document styles, **When** default body text renders, **Then** it uses the named UI font token (Inter with approved fallbacks).
2. **Given** a developer references the brand heading font token, **When** they apply it to a heading, **Then** the stack resolves to Zilla Slab with approved serif fallbacks (Rokkitt, Roboto Slab).
3. **Given** the font token definitions live alongside color design tokens, **When** the token foundation is reviewed, **Then** separate named tokens exist for brand headings and UI text within the same centralized token layer established by the design-tokens milestone.

---

### User Story 3 - Auth screens avoid jarring font-related layout shift (Priority: P3)

A new or returning user on the login or registration screen does not experience noticeable text reflow or layout jump caused by late-arriving web fonts. The first paint feels stable and professional, supporting trust during onboarding.

**Why this priority**: Flash of unstyled text (FOUT) on auth screens—the first brand touchpoint for many users—undermines polish and can cause subtle layout shifts on form labels and headings. Verifying stability on auth pages catches the most visible font-loading regressions.

**Independent Test**: Can be fully tested by manually loading the login or registration screen and observing whether text blocks shift position or change size noticeably after initial render.

**Acceptance Scenarios**:

1. **Given** a user navigates to the login or registration screen, **When** the page loads on a typical broadband connection, **Then** no obvious layout shift attributable to font swapping occurs (manual visual verification).
2. **Given** font resources are requested from the approved external font provider, **When** the security policy is evaluated, **Then** the policy permits loading styles and font files from that provider's domains so fonts are not blocked in production.

---

### Edge Cases

- What happens when the external font provider is temporarily unavailable? Approved fallback stacks (Rokkitt/Roboto Slab for headings; Open Sans/Lato for UI) MUST render legibly so the application remains usable.
- How should font loading be declared—document head link versus stylesheet import? Exactly one loading mechanism MUST be used application-wide to avoid duplicate requests and conflicting load order; the choice is an implementation detail left to planning.
- What if design tokens (SPLR-79) are not yet merged? This milestone is blocked until the centralized token layer exists; font variables MUST be added alongside color tokens rather than in ad-hoc locations.
- How are Content Security Policy restrictions handled? If the application enforces CSP, font provider domains MUST be allowlisted so production builds do not silently block font delivery; related automated policy tests MUST be updated when allowlists change.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The application MUST load Zilla Slab at weight 700 and Inter at weights 400, 500, and 700 from the approved external web font provider (Google Fonts per brand guide).
- **FR-002**: The application MUST define centralized font tokens for brand headings and UI text, including: a brand heading stack (`Zilla Slab`, `Rokkitt`, `Roboto Slab`, serif) and a UI stack (`Inter`, `Open Sans`, `Lato`, sans-serif).
- **FR-003**: Default body text MUST use the UI font token so navigation, forms, tables, and body copy inherit the brand sans-serif family.
- **FR-004**: Font tokens MUST live in the same centralized design-token layer as color tokens (not duplicated across unrelated style files).
- **FR-005**: Brand fonts MUST load successfully in both local development and production build environments.
- **FR-006**: Fallback font stacks MUST match the Montana High Country brand guide so degraded loading still produces acceptable typography.
- **FR-007**: Font loading MUST use a single declared mechanism (document-level link tags OR stylesheet import—not both) to prevent duplicate fetches.
- **FR-008**: The application's content security policy MUST permit font provider domains required for stylesheet and font file delivery; policy tests MUST be updated if allowlists change.
- **FR-009**: Auth screens (login and registration) MUST NOT exhibit obvious font-related layout shift on manual verification under typical network conditions.
- **FR-010**: The feature MUST achieve ≥80% line/branch coverage across backend and frontend for this feature (CI-enforced; Constitution III). For this frontend-only milestone, coverage applies to font-loading verification tests and any modified security-policy tests; no backend API changes are expected.

### Key Entities

- **Brand heading font token**: Named token mapping to Zilla Slab with approved serif fallbacks for headings, titles, and headliner text roles.
- **UI font token**: Named token mapping to Inter with approved sans-serif fallbacks for body text, navigation, buttons, inputs, tables, and metrics.
- **Font weight set**: The required weight variants—Zilla Slab 700; Inter 400, 500, 700—available after fonts load.
- **Font loading declaration**: The single application-wide mechanism that requests external font resources before or during initial page render.
- **Font provider allowlist**: Security-policy entries permitting the external font provider's stylesheet and font-file origins.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of tested development and production page loads successfully deliver Zilla Slab (700) and Inter (400, 500, 700) without blocked or failed font resources.
- **SC-002**: 100% of inspected font token definitions match brand-guide fallback stacks for both heading and UI roles.
- **SC-003**: Default body text on audited pages uses the UI font token in 100% of cases where no component override applies.
- **SC-004**: Manual verification on login and registration screens reports no obvious font-related layout shift in 100% of trials under typical broadband conditions.
- **SC-005**: Content security policy validation passes with font provider domains allowlisted; zero regressions in existing CSP automated tests after allowlist updates.
- **SC-006**: ≥80% line/branch coverage achieved across backend and frontend code for this feature (CI-enforced; Constitution III).

## Assumptions

- The Montana High Country brand guide in the Linear "Branding and theming" project is the authoritative reference for font families, weights, fallback stacks, and loading preferences (Google Fonts).
- This milestone (SPLR-80) is part of M1 and is blocked by SPLR-79 (design tokens); font variables are added alongside color tokens in the centralized token layer.
- Applying heading typography rules to specific components (headings, buttons, event cards) is explicitly out of scope and handled by SPLR-81.
- Google Fonts (`fonts.googleapis.com` for stylesheets, `fonts.gstatic.com` for font files) is the approved external provider unless the brand guide is amended.
- This is a frontend-only visual foundation change; backend coverage is satisfied by unchanged or minimally extended verification utilities only.
- Preconnect or equivalent performance hints may be used to reduce load latency but are not a separate acceptance requirement unless planning identifies measurable benefit.

## Dependencies

- Linear issue [SPLR-79](https://linear.app/audiodex/issue/SPLR-79) — Define global CSS design tokens (blocked-by; must complete first).
- Linear issue [SPLR-81](https://linear.app/audiodex/issue/SPLR-81) — Apply global typography rules (blocked-by this milestone).
- Parent epic [SPLR-96](https://linear.app/audiodex/issue/SPLR-96) / spec `058-brand-theming-mhc` for brand guide context.
- Spec `059-mhc-design-tokens` for color token foundation that font tokens extend.
- Content security policy feature (spec `049-csp-http-response-header`) for policy enforcement context and test expectations.
