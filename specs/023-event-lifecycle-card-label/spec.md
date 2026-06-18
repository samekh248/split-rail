# Feature Specification: Event Lifecycle & Card Label Utilities

**Feature Branch**: `023-event-lifecycle-card-label`

**Created**: 2026-06-18

**Status**: Draft

**Input**: User description: "Add event lifecycle and card label utilities with unit tests" (Linear SPLR-64)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consistent lifecycle status on event cards (Priority: P1)

As a venue manager browsing events in the dashboard event selector, I need every event card and status badge to show the same human-readable lifecycle label for the same underlying state, so I can instantly tell whether an event is in planning, budget-locked settlement, settled, or reconciled without guessing from scattered UI hints.

**Why this priority**: Status badges are the primary at-a-glance signal for event state across the combobox, ledger header, and future event surfaces. Inconsistent or incomplete labels (for example, showing "Planning" for a budget-locked event) erode trust in the product's state machine.

**Independent Test**: Given representative event records covering all lifecycle combinations, verify that the card-label utility returns the expected display label for each combination. Confirm existing event selector badges render those labels after migration.

**Acceptance Scenarios**:

1. **Given** an event in planning with an unlocked budget, **When** its card label is resolved, **Then** the label reads "Planning".
2. **Given** an event in planning with a locked budget, **When** its card label is resolved, **Then** the label reads "Budget locked" (not "Planning").
3. **Given** an event in settled state, **When** its card label is resolved, **Then** the label reads "Settled".
4. **Given** an event in reconciled state, **When** its card label is resolved, **Then** the label reads "Reconciled".
5. **Given** an unknown or missing status value, **When** its card label is resolved, **Then** a safe fallback label is returned rather than a blank or raw enum string.

---

### User Story 2 - Centralized lifecycle permission rules (Priority: P1)

As a developer maintaining event-scoped UI, I need a single set of pure lifecycle utilities that answer "can the user edit metadata?", "can the user delete?", and "is the event fully locked?" from event status and budget-lock flag alone, so permission-gating logic is not duplicated or divergent across components.

**Why this priority**: Lifecycle gating rules are already spread across the event selector, ledger grid, artist deals, and line-item controls. Centralizing them prevents subtle bugs where one surface allows an action another blocks, and aligns with the platform ledger state machine (Pre-Show unlocked → Pre-Show locked → Settled → Reconciled).

**Independent Test**: Run the lifecycle utility test suite with stubbed event status and budget-lock combinations. Each helper returns deterministic booleans matching platform rules documented in prior features (015, 013, 018) without rendering any UI.

**Acceptance Scenarios**:

1. **Given** an event in planning with unlocked budget, **When** lifecycle editability is evaluated, **Then** metadata edit and delete are permitted and structural ledger edits follow existing Pre-Show rules.
2. **Given** an event in planning with locked budget, **When** lifecycle editability is evaluated, **Then** metadata edit is permitted, delete is blocked, and the event is not considered fully settled.
3. **Given** an event in settled or reconciled state, **When** lifecycle editability is evaluated, **Then** metadata edit and delete are blocked and the event is considered fully locked regardless of budget-lock flag.
4. **Given** any lifecycle state, **When** a consumer asks whether the event is in the Pre-Show phase, **Then** the utility returns true only for planning status (both locked and unlocked budget variants).
5. **Given** any lifecycle state, **When** a consumer asks for the resolved lifecycle phase, **Then** the utility returns one of: planning-unlocked, planning-locked, settled, or reconciled.

---

### User Story 3 - Action hint labels for locked events (Priority: P2)

As a venue manager attempting to edit or delete an event from the combobox, I need clear, consistent hint text explaining why an action is unavailable (budget locked vs. event settled), so I understand the constraint without contacting support.

**Why this priority**: The event combobox already shows inline hints ("Budget locked", "Event locked") but they are embedded in component markup. Extracting hint resolution into utilities ensures the same messaging appears anywhere event actions are offered.

**Independent Test**: For each lifecycle combination where edit or delete is blocked, verify the hint utility returns the appropriate user-facing explanation string; when actions are permitted, verify no misleading lock hint is returned.

**Acceptance Scenarios**:

1. **Given** a planning event with locked budget and delete blocked, **When** the action hint is resolved for delete, **Then** the hint explains that deletion is blocked because the budget is locked.
2. **Given** a settled or reconciled event with edit/delete blocked, **When** the action hint is resolved, **Then** the hint explains that the event is locked due to its lifecycle state.
3. **Given** a planning event with unlocked budget where all actions are permitted, **When** action hints are resolved, **Then** no lock hint is returned.

---

### User Story 4 - Automated verification with comprehensive unit tests (Priority: P1)

As an engineering team member, I need exhaustive unit tests covering every lifecycle state combination and label mapping, so regressions in event state presentation or gating are caught in continuous integration before they reach users.

**Why this priority**: This feature's primary deliverable is reliable, test-covered utilities. Without exhaustive tests, extracting logic from components merely moves bugs rather than eliminating them.

**Independent Test**: Run the dedicated lifecycle and card-label test suites in isolation. All cases pass; combined coverage for the new utility modules meets the project ≥80% line/branch gate.

**Acceptance Scenarios**:

1. **Given** the lifecycle utility module, **When** the unit test suite runs, **Then** every documented lifecycle phase and permission combination is asserted.
2. **Given** the card-label utility module, **When** the unit test suite runs, **Then** every status badge label and action hint mapping is asserted including edge cases (null/unknown status).
3. **Given** existing event selector tests, **When** the suite runs after migration, **Then** prior behavior is preserved or intentionally corrected (budget-locked planning shows "Budget locked" badge) with no duplicate assertions across files.

---

### Edge Cases

- What happens when `status` is null, undefined, or an unrecognized string? Utilities return safe fallbacks (unknown phase, generic label, all mutating actions blocked).
- What happens when `isBudgetLocked` is undefined on a Pre-Show event? Treat as unlocked (planning-unlocked phase) for label and permission resolution.
- What happens when `isBudgetLocked` is true but status is Settled or Reconciled? Budget-lock flag is ignored; settled/reconciled rules take precedence.
- How do utilities behave for list/card contexts vs. single-event detail? The same pure functions apply; consumers pass status and budget-lock flag regardless of rendering context.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a dedicated event lifecycle utility module exposing pure functions to resolve lifecycle phase, Pre-Show detection, metadata-edit permission, delete permission, and full-lock detection from event status and budget-lock flag.
- **FR-002**: System MUST map lifecycle phases to exactly four canonical phases: planning-unlocked (Pre-Show, budget unlocked), planning-locked (Pre-Show, budget locked), settled, and reconciled.
- **FR-003**: System MUST provide a dedicated card-label utility module exposing pure functions to resolve human-readable status badge text and action-hint text from event status and budget-lock flag.
- **FR-004**: Status badge labels MUST be: "Planning" (planning-unlocked), "Budget locked" (planning-locked), "Settled" (settled), "Reconciled" (reconciled).
- **FR-005**: Metadata edit MUST be permitted only when status is Pre-Show (both locked and unlocked budget variants); delete MUST be permitted only when status is Pre-Show and budget is unlocked; settled and reconciled events MUST be fully locked for both operations.
- **FR-006**: Action hint text MUST distinguish budget-lock constraints ("Budget locked") from lifecycle-lock constraints ("Event locked") and MUST NOT emit hints when the corresponding action is permitted.
- **FR-007**: Existing event selector and any other consumers of inline lifecycle or label logic MUST migrate to the new utilities so a single source of truth governs labels and gating across the frontend.
- **FR-008**: Lifecycle and label utilities MUST NOT perform network calls, read user permissions, or depend on React; permission-aware gating (role-based) remains in existing hooks — these utilities encode state-machine rules only.
- **FR-009**: Unit tests MUST cover all four lifecycle phases, both action-hint variants, null/unknown status fallbacks, and undefined budget-lock handling with no untested branches in the utility modules.
- **FR-010**: System MUST achieve ≥80% line/branch coverage across backend and frontend for this feature (CI-enforced; Constitution III). For this frontend-only utility feature, the coverage gate applies to all new and modified frontend files; no backend changes are expected.

### Key Entities *(include if feature involves data)*

- **Event Lifecycle Phase**: A derived, UI-facing classification computed from raw event status (`Pre-Show`, `Settled`, `Reconciled`) and budget-lock flag. Distinguishes planning-unlocked from planning-locked within Pre-Show.
- **Status Badge Label**: Human-readable text shown on event cards and combobox entries representing the current lifecycle phase.
- **Action Hint Label**: Contextual explanation shown when edit or delete is unavailable, tied to either budget lock or lifecycle lock.
- **Event (referenced)**: Platform entity carrying `status` and `isBudgetLocked`; utilities accept these fields (or equivalent primitives) without requiring the full event record.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of defined lifecycle phase × permission combinations produce expected utility outputs in automated unit tests.
- **SC-002**: 100% of event selector status badges match the card-label utility output for the same event state in component tests after migration.
- **SC-003**: Budget-locked planning events display "Budget locked" (not "Planning") in the event selector in 100% of tested scenarios.
- **SC-004**: Zero duplicate lifecycle label or gating implementations remain in event selector code after migration (single utility import path).
- **SC-005**: New utility modules achieve ≥80% line/branch coverage; overall frontend CI coverage gate continues to pass (Constitution III).
- **SC-006**: Developers can determine event phase, badge label, and action availability from utilities alone without reading component source — verified by utility API documentation in test describe blocks and exported function names.

## Assumptions

- Event status enum values remain `PRE_SHOW`, `SETTLED`, and `RECONCILED` as defined by the platform; no new lifecycle states are introduced in this feature.
- Budget-lock flag is meaningful only during Pre-Show; settled and reconciled events may carry the flag but lifecycle utilities ignore it for phase resolution when status is not Pre-Show.
- Role- and permission-based gating (for example, whether a user without financials permission can edit ledger structure) stays in existing React hooks; this feature covers state-machine rules shared by all users viewing the same event state.
- No new API endpoints or backend lifecycle logic are required; utilities operate on data already present in generated event types.
- Existing event selector behavior for edit/delete affordance visibility is preserved; only the underlying rule source and status badge accuracy for budget-locked planning events may change intentionally.
- "Card label" refers to compact status text on event list/selector surfaces, not ledger row labels or accounting tags.
