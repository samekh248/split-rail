# Feature Specification: Automated Design Token and Color Regression Tests

**Feature Branch**: `072-design-token-regression-tests`

**Created**: 2026-06-24

**Status**: Draft

**Input**: User description: "Add automated design token and color regression tests" ([Linear SPLR-95](https://linear.app/audiodex/issue/SPLR-95/add-automated-design-token-and-color-regression-tests))

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Brand palette stays stable across releases (Priority: P1)

A product owner or designer approves an intentional brand change (e.g., adjusting lodgepole brown or alpine sunset orange) and expects that change to propagate deliberately through the design-token system. Any accidental drift—such as a developer hardcoding a one-off color or renaming a core token without updating dependents—must be caught before merge so the Montana High Country identity does not silently degrade.

**Why this priority**: Core brand colors are the foundation of every screen. Unintended token changes undermine user trust and invalidate accessibility work done in prior milestones.

**Independent Test**: Can be fully tested by running the automated brand regression suite against the canonical token definitions and confirming that all primary palette values match the approved expected values; a deliberate mismatch in a test environment must cause the suite to fail with a clear indication of which token changed.

**Acceptance Scenarios**:

1. **Given** the approved Montana High Country primary palette (brown, accent orange, cream background, white surface, and semantic text-on-accent values), **When** the regression suite runs, **Then** each canonical token value matches the documented expected value.
2. **Given** a contributor unintentionally changes a primary brand token value, **When** the continuous integration pipeline runs, **Then** the build fails before merge with a message identifying the affected token.
3. **Given** an intentional brand update, **When** a maintainer updates the documented expected values alongside the token change, **Then** the regression suite passes and the change is explicitly reviewed as part of the pull request.

---

### User Story 2 - Legacy slate-blue colors do not reappear (Priority: P2)

A developer adds a new component or stylesheet and accidentally reintroduces pre-migration legacy hex colors (slate-blue tones from the prior design system). The regression suite flags the reintroduction so the team routes the fix through design tokens instead of raw color literals.

**Why this priority**: Legacy colors were explicitly migrated away in prior milestones; their return fragments the palette and can bypass WCAG audit coverage tied to semantic tokens.

**Independent Test**: Can be fully tested by introducing a banned legacy color into the global stylesheet in a test branch and confirming the regression suite fails; removing it or replacing it with a token reference restores a passing result.

**Acceptance Scenarios**:

1. **Given** the global application stylesheet after the component token migration milestone is complete, **When** the legacy-color scan runs, **Then** no banned legacy hex values are present except those explicitly documented as allowed exceptions.
2. **Given** a banned legacy color is added to the global stylesheet, **When** continuous integration runs, **Then** the build fails with an indication of which banned value was detected.
3. **Given** a legitimate exception requires retaining a legacy reference (e.g., documented third-party embed), **When** the exception is recorded in the maintained exception list, **Then** the scan permits that occurrence without failing the suite.

---

### User Story 3 - Maintainers can update expectations when brand evolves (Priority: P3)

A designer finalizes an approved palette revision. A developer updates token values and knows exactly which expected-value records and documentation to change so the regression suite remains accurate and future contributors understand the update process.

**Why this priority**: Without a clear update path, teams either disable checks or fight false positives, defeating the purpose of regression protection.

**Independent Test**: Can be fully tested by following the documented update procedure to change one expected token value after an approved brand revision and confirming the suite passes only when both the live token and the expected record are updated together.

**Acceptance Scenarios**:

1. **Given** an approved brand token change, **When** a maintainer follows the documented update procedure, **Then** they can update expected values in a single, obvious location without hunting through unrelated test files.
2. **Given** only the live token is changed but expected values are not updated, **When** the suite runs, **Then** it fails until both sides are aligned—ensuring token changes are never silent.
3. **Given** a new primary token is added to the palette, **When** the maintainer extends the canonical token list and expected values per the documentation, **Then** the new token is covered by regression checks on the next run.

---

### Edge Cases

- What happens when a token uses a CSS variable reference (`var(--color-*)`) instead of a literal hex? The regression suite MUST resolve or compare semantic aliases against their canonical literal values so indirect references cannot mask accidental changes to underlying primitives.
- What happens when rgba or opacity-derived tokens are involved? Comparisons MUST account for equivalent representations (hex vs. rgba) so legitimate formats do not cause flaky failures while true value changes are still detected.
- What happens when case differs in hex literals (`#3E2723` vs `#3e2723`)? Comparisons MUST be case-insensitive for hex values to avoid noise without hiding real changes.
- What happens when the regression suite depends on a browser DOM? Tests MUST run deterministically from static source inspection (parsed stylesheet or exported token module) so results are stable in headless continuous integration without timing or rendering variance.
- What happens when component-level CSS still contains a legacy color outside the global stylesheet? This milestone scopes the legacy-color ban to the global stylesheet where token migration was centralized; component-scoped legacy detection MAY be added in a follow-up if scatter persists after SPLR-91.
- What happens when contrast regression tests (prior milestone) and token-value regression tests overlap? Both suites MAY coexist; this feature focuses on canonical value parity and legacy-color guardrails, not WCAG ratio calculation (already covered elsewhere).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The product MUST include an automated regression suite that verifies canonical primary brand token values (primary brown, accent orange and its hover/disabled variants, cream background, white surface, text-on-accent, and other core palette entries defined in the Montana High Country token set) match approved expected values.
- **FR-002**: The regression suite MUST detect unintentional removal, renaming, or value change of any covered primary brand token and cause the continuous integration pipeline to fail.
- **FR-003**: The regression suite MUST scan the global application stylesheet for banned legacy pre-migration hex colors and fail when any banned value appears outside an explicitly maintained exception list.
- **FR-004**: Banned legacy colors MUST include at minimum the slate-blue tones `#1e293b` and `#2563eb` that were superseded by the Montana High Country palette.
- **FR-005**: The regression suite MUST run without browser DOM dependencies, operating on deterministic static sources (parsed stylesheet content and/or exported canonical token definitions).
- **FR-006**: The regression suite MUST integrate into the existing web application test workflow so it runs on every pull request without requiring a separate manual step.
- **FR-007**: Maintainers MUST have documented instructions describing how to intentionally update expected token values when an approved brand change occurs, including which artifacts to modify and how to add new tokens or legacy-color exceptions.
- **FR-008**: Failure output MUST identify which token or banned color triggered the failure so contributors can remediate without debugging the entire stylesheet.
- **FR-009**: The feature MUST achieve ≥80% line/branch coverage across backend and frontend for new code introduced by this feature (CI-enforced; Constitution III).

### Key Entities

- **Canonical Token**: A named design-token entry in the Montana High Country palette with an approved literal value (hex or rgba) that defines brand identity; serves as the source of truth for regression comparison.
- **Expected Value Record**: The approved snapshot of canonical token values maintained alongside tests; updated only when brand changes are intentionally approved.
- **Banned Legacy Color**: A hex value from the pre-migration slate-blue palette that MUST NOT appear in the global stylesheet after token migration.
- **Exception Entry**: A documented allowance for a specific banned color occurrence (location and justification) that the legacy-color scan ignores.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of defined primary brand tokens in the canonical palette are covered by automated value-regression checks.
- **SC-002**: Continuous integration fails within one pipeline run when any covered primary token value changes without a corresponding expected-value update.
- **SC-003**: Continuous integration fails when either banned legacy hex (`#1e293b` or `#2563eb`) is introduced into the global stylesheet without a documented exception.
- **SC-004**: Regression tests produce identical pass/fail results across repeated local and CI runs (zero flaky failures attributable to DOM, timing, or environment variance in a 10-run local repeat).
- **SC-005**: A maintainer can complete the documented expected-value update procedure for an approved single-token change in under 10 minutes without team assistance.
- **SC-006**: ≥80% line/branch coverage achieved across backend and frontend code for this feature (CI-enforced; Constitution III).

## Assumptions

- Montana High Country design tokens (M1) are finalized and the component CSS token migration milestone (SPLR-91) is complete or substantially complete before this feature ships; residual legacy colors outside the global stylesheet are out of scope for the initial legacy-color scan.
- WCAG contrast ratio regression testing is handled by the separate contrast-audit milestone (SPLR-94 / spec 071); this feature complements it with value-parity and legacy-color guardrails rather than replacing contrast checks.
- A canonical token export or parseable global stylesheet already exists or will be established as the single source of truth for expected values; tests compare against that source rather than duplicating ad-hoc literals in multiple files.
- Backend changes are minimal or absent; coverage obligation applies primarily to new frontend test and token artifacts, with any supporting utilities included in the coverage gate.
- No new operator-facing deploy scripts are required; Constitution X dual-platform script pairing does not apply.
- Brand changes are infrequent and always intentional; the regression suite is a guardrail, not a blocker to approved redesigns when maintainers follow the update documentation.
