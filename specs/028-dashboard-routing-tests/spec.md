# Feature Specification: Dashboard Routing Test & E2E Alignment

**Feature Branch**: `028-dashboard-routing-tests`

**Created**: 2026-06-18

**Status**: Draft

**Input**: User description: "Update dashboard routing tests and E2E for overview → workspace flow — Linear SPLR-68"

## Clarifications

_None — all requirements resolved via informed defaults documented in Assumptions._

## User Scenarios & Testing *(mandatory)*

<!--
  This feature delivers automated verification aligned with the dashboard routing split
  (overview at the dashboard entry, event workspace at venue/event URLs). The "users"
  of this feature are the engineering team and CI: the value is confidence that
  navigation, URL sync, and cross-page flows behave correctly after the overview page
  and workspace routes ship, and that the frontend continues to meet the project-mandated
  coverage gate.
-->

### User Story 1 - Overview page behavior is verified in isolation (Priority: P1)

As a maintainer of the dashboard overview experience, I need automated verification that the dashboard entry shows the priority-zone overview (not a ledger workspace), handles empty and error states correctly, and navigates to the event workspace when an event card is activated, so that regressions in the new landing experience are caught before release.

**Why this priority**: The overview page is the new dashboard entry point. Tests that still assume a single combined dashboard page will pass falsely or fail noisily until they are split and updated for overview-specific behavior.

**Independent Test**: Run the overview page test suite in isolation with stubbed venue, event, and permission data. Confirm it asserts (a) the overview layout with priority zones renders at the dashboard entry, (b) empty and error states match product rules, (c) activating an event card navigates to the correct event workspace URL, and (d) no ledger grid is shown on the overview itself. The suite passes without workspace or E2E stories being implemented.

**Acceptance Scenarios**:

1. **Given** a signed-in user with an active venue and multiple events, **When** the dashboard entry is rendered in a test, **Then** the suite asserts a priority-zone overview is shown and a ledger workspace is not shown.
2. **Given** a signed-in user with an active venue and zero events, **When** the dashboard entry is rendered, **Then** the suite asserts the no-events empty state appears without a create-event control on the overview (create remains on the workspace only).
3. **Given** a signed-in user with no accessible venues, **When** the dashboard entry is rendered, **Then** the suite asserts the no-venue empty state and permission-gated create-venue affordance behave as before.
4. **Given** event data fails to load, **When** the overview is rendered, **Then** the suite asserts an error state with retry is shown.
5. **Given** an event card on the overview, **When** the suite simulates activating the card, **Then** it asserts navigation targets the event workspace URL for that venue and event.
6. **Given** an event card quick link with a workflow focus indicator, **When** the suite simulates activating the link, **Then** it asserts navigation targets the workspace URL including the focus indicator (aligned with overview quick-link behavior from feature 026).

---

### User Story 2 - Event workspace page behavior is verified in isolation (Priority: P2)

As a maintainer of the event workspace, I need automated verification that the dedicated workspace route loads venue and event context from the URL, keeps the address bar in sync when events or venues change, shows the ledger for the selected event, and preserves global navigation highlighting, so that regressions in the split routing model are caught automatically.

**Why this priority**: The workspace route is the operational surface for ledger work. It replaces behaviors previously bundled into a single dashboard page and must be verified independently of the overview.

**Independent Test**: Run the event workspace page test suite with stubbed routes, venues, and events. Confirm it asserts URL-driven venue/event selection, combobox-driven URL updates, ledger visibility, venue-switch reset behavior, and Dashboard global-nav active state. The suite passes without E2E coverage.

**Acceptance Scenarios**:

1. **Given** a workspace URL identifying an accessible venue and event, **When** the workspace page is rendered, **Then** the suite asserts the venue switcher, event selector, and ledger reflect that context.
2. **Given** a user on a workspace for event X, **When** the suite selects event Y from the event combobox, **Then** it asserts the URL updates to event Y and the ledger reloads for event Y.
3. **Given** a user with event-management permission and zero events, **When** the workspace is rendered, **Then** the suite asserts the no-events empty state with create-event guidance.
4. **Given** a successful inline create-event flow on the workspace, **When** creation completes, **Then** the suite asserts the URL updates to the new event and the ledger is shown.
5. **Given** a selected event in venue A, **When** the suite switches to venue B, **Then** it asserts the prior event does not carry over, the URL updates for venue B, and events for venue B load.
6. **Given** a user on an event workspace URL, **When** the page renders, **Then** the suite asserts the Dashboard item in global navigation is highlighted.
7. **Given** a workspace URL with an invalid or inaccessible venue or event, **When** the page resolves, **Then** the suite asserts a safe fallback or error outcome (not a misleading ledger).

---

### User Story 3 - Route helper and navigation utilities are verified (Priority: P3)

As a maintainer of dashboard routing, I need automated verification that path builders, parsers, and navigation helpers produce correct dashboard entry paths, event workspace paths, and redirect targets for create-venue and settings return flows, so that refactors to the routing layer do not silently break deep links or in-app navigation.

**Why this priority**: Central route helpers underpin both overview and workspace pages. Unit-level verification is fast, stable, and catches regressions before page-level tests.

**Independent Test**: Run the route-helper test suite covering dashboard entry path resolution, event workspace path construction and parsing, and navigation entry points used by overview and workspace pages. Confirm all assertions pass in isolation.

**Acceptance Scenarios**:

1. **Given** a venue and event identifier, **When** the suite invokes workspace path construction, **Then** it asserts the resulting path identifies that venue and event unambiguously.
2. **Given** a workspace path string, **When** the suite invokes path parsing, **Then** it asserts venue and event identifiers are extracted correctly or invalid input is rejected.
3. **Given** navigation to the dashboard entry, **When** the suite invokes dashboard navigation helpers, **Then** it asserts the target is the overview entry path (not a legacy combined dashboard path).
4. **Given** navigation from overview to an event workspace, **When** the suite invokes event-workspace navigation helpers, **Then** it asserts the constructed URL matches the split-route convention.
5. **Given** settings return storage and venue-switch flows that depend on route classification, **When** the suite evaluates workspace vs. non-workspace paths, **Then** it asserts classification remains correct for the new route shapes.

---

### User Story 4 - End-to-end overview-to-workspace journey is verified (Priority: P4)

As a maintainer of release quality, I need an end-to-end automated journey that signs in, lands on the dashboard overview at the entry URL, opens an event from the overview, and confirms the ledger workspace is visible on the event workspace route, so that the primary user path is validated against real routing and authentication integration.

**Why this priority**: Component tests use stubs; E2E confirms the full chain (auth bootstrap, overview render, card navigation, workspace load) that operators experience daily.

**Independent Test**: Run the venue/event E2E suite against a preview or local stack. Confirm the primary scenario: login → overview at dashboard entry → activate event → ledger visible on workspace route. Confirm create-first-event and venue-switcher scenarios still pass without assuming the old single-page dashboard.

**Acceptance Scenarios**:

1. **Given** a seeded admin with an active venue and events, **When** the E2E scenario signs in and navigates to the dashboard entry, **Then** it asserts the overview experience is shown (not an immediate ledger for a default event unless product rules require redirect).
2. **Given** the user is on the overview with at least one event, **When** the scenario activates an event card, **Then** it asserts the browser navigates to the event workspace route and the ledger workspace is visible.
3. **Given** a seeded admin with zero events, **When** the scenario creates the first event from the workspace empty state, **Then** it asserts the ledger workspace becomes visible on the workspace route (updated from prior single-page assumptions).
4. **Given** a user with multiple venues, **When** the scenario switches venues from the overview or workspace, **Then** it asserts venue context updates without stale event selection or broken navigation.
5. **Given** existing E2E coverage for event combobox list/select behavior, **When** the updated suite runs on a workspace route, **Then** it asserts combobox behavior is unchanged aside from route context.

---

### User Story 5 - Legacy dashboard page artifacts are retired safely (Priority: P5)

As a maintainer reducing confusion, I need the obsolete combined dashboard page and its dedicated test file removed or clearly deprecated once overview and workspace tests fully cover prior behavior, so that contributors do not extend dead code paths.

**Why this priority**: Cleanup prevents drift and duplicate maintenance but must happen only after replacement coverage exists.

**Independent Test**: After Stories 1–4 merge, confirm no production imports reference the legacy combined dashboard page, the legacy test file is removed or replaced, and the full frontend verification suite passes.

**Acceptance Scenarios**:

1. **Given** overview and workspace page tests cover all behaviors previously asserted in the legacy dashboard test file, **When** the legacy test file is removed, **Then** no required assertions are lost (verified by reviewer checklist mapping).
2. **Given** the legacy combined dashboard page is fully replaced by overview and workspace pages, **When** the legacy page module is removed, **Then** no application routes or imports reference it.
3. **Given** the cleanup is complete, **When** the standard frontend verification command runs, **Then** all dashboard-related tests pass with no skipped legacy suites.

---

### Edge Cases

- **Overview with pinned + tonight + zone overlap**: Tests verify zone partitioning rules from feature 026 still hold after route split (today exclusive to hero, pinned in multiple zones).
- **Direct workspace URL without visiting overview**: Workspace page tests verify deep links work without requiring an overview visit first.
- **Browser back from workspace to overview**: E2E or page tests verify back navigation restores overview context when applicable.
- **Focus indicator stripped on in-workspace event switch**: Workspace tests verify changing events via combobox clears workflow focus indicators (aligned with feature 027 clarifications).
- **Remembered venue no longer accessible**: Tests verify fallback to a default accessible venue on both overview and workspace entry.
- **Coverage attribution**: New and migrated tests must exercise the overview page, workspace page, and route helper source files so they contribute measurably to the coverage gate—not only assert against trivial mocks.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The test suite MUST verify the dashboard entry renders the priority-zone overview (feature 026) and does not show the event ledger workspace as the landing view.
- **FR-002**: The test suite MUST verify overview empty states for no-venue, no-events, and load-error conditions, including that create-event is absent on the overview and present on the workspace when permitted.
- **FR-003**: The test suite MUST verify activating an event card from the overview navigates to the correct event workspace URL for the active venue and selected event.
- **FR-004**: The test suite MUST verify overview quick links navigate to the workspace URL with the appropriate workflow focus indicator when applicable (feature 027).
- **FR-005**: The test suite MUST verify the event workspace page loads venue and event context from the workspace URL and displays the ledger for the selected event (feature 023).
- **FR-006**: The test suite MUST verify event combobox selection updates the workspace URL and reloads ledger context; venue switching clears prior event selection and updates the URL.
- **FR-007**: The test suite MUST verify inline create-event on the workspace selects the new event, updates the URL, and shows the ledger.
- **FR-008**: The test suite MUST verify Dashboard global navigation remains highlighted on event workspace routes.
- **FR-009**: The test suite MUST verify route helper utilities resolve dashboard entry paths, build and parse event workspace paths, and support navigation helpers used by overview and workspace pages—including any consolidated app-route utilities introduced by the routing split.
- **FR-010**: The test suite MUST migrate assertions from the legacy combined dashboard page test file into dedicated overview and workspace page test files without loss of coverage for in-scope behaviors.
- **FR-011**: End-to-end tests MUST cover the journey: authenticated login → dashboard overview at entry URL → event card activation → ledger visible on event workspace route.
- **FR-012**: End-to-end tests MUST update venue and event selection scenarios to assume workspace routes rather than a single combined dashboard page, preserving venue-switcher and event-combobox behavior assertions.
- **FR-013**: The legacy combined dashboard page module and its dedicated test file MUST be removed once FR-010 migration is complete and no references remain; partial deprecation without removal is not acceptable for completion.
- **FR-014**: New and updated tests MUST live under established frontend test directories following patterns from features 010, 017, and 023 (stubbed API responses, no live backend for unit/page tests).
- **FR-015**: All updated tests MUST run as part of the standard automated verification commands and pass in continuous integration.
- **FR-016**: System MUST achieve ≥80% line/branch coverage across backend and frontend for this feature, with migrated and new dashboard routing tests measurably contributing to the frontend portion of that gate (CI-enforced; Constitution III).

### Key Entities *(include if feature involves data)*

- **Dashboard Entry Path**: Root URL where the priority-zone overview renders after the routing split.
- **Event Workspace Path**: URL identifying a venue and event where the ledger workspace renders.
- **Workflow Focus Indicator**: Optional URL signal from overview quick links targeting a specific ledger workflow area (feature 027).
- **Active Venue / Active Event Selection**: Workspace context synchronized between URL, switcher, combobox, and ledger.
- **Priority Zone Partition**: Client-side grouping of events (pinned, tonight, upcoming, recent) on the overview page.
- **Legacy Combined Dashboard Page**: Obsolete single-page dashboard module and test file superseded by overview + workspace split.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of in-scope behaviors listed in SPLR-68 (overview landing, workspace routing, route helpers, overview→workspace E2E, legacy cleanup) are covered by at least one passing automated test.
- **SC-002**: Dashboard-related unit and page test suites pass reliably with no new flakiness across consecutive CI runs.
- **SC-003**: The primary E2E scenario (login → overview → event card → ledger on workspace route) passes against preview or local stack configuration.
- **SC-004**: Venue-switcher and event-combobox E2E scenarios pass without regression after route updates.
- **SC-005**: An intentionally introduced regression (e.g., overview landing showing a ledger, or card navigation staying on `/`) causes at least one test to fail.
- **SC-006**: ≥80% line/branch coverage achieved across backend and frontend code for this feature, with dashboard routing tests measurably contributing to the frontend coverage gate (CI-enforced; Constitution III).

## Assumptions

- Prerequisite product features are merged or available on the integration branch: dashboard overview page (SPLR-66 / feature 026), route split and event workspace page (SPLR-63 / feature 023), and workspace focus scroll targets (SPLR-67 / feature 027). This feature aligns tests with those deliverables rather than re-implementing UI.
- Partial test files may already exist for overview, workspace, and app-route helpers from in-progress work; this feature completes migration, fills gaps, and removes legacy artifacts rather than duplicating parallel suites.
- The legacy combined dashboard page test file maps to two replacement page test files (overview and workspace); route helper tests extend existing dashboard-route and app-route test files rather than introducing a new test directory.
- Event combobox edit and delete flows remain owned by feature 015; this feature covers list/select/create, venue-switch reset, and URL sync only.
- E2E updates focus on `event-selection` and closely related venue navigation specs; full focus-scroll E2E for all five workflow targets may be deferred to feature 027 if not already covered, but overview quick-link navigation with focus indicators MUST be covered at least at the page-test level (FR-004).
- Backend changes are out of scope unless required to support test seed data; coverage contribution is primarily frontend.
- Auth, venue-switcher baseline coverage from feature 010 remains owned by that feature; this feature extends routing-specific assertions without duplicating auth-layout tests.
