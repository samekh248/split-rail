# Feature Specification: Workspace Focus Scroll Targets

**Feature Branch**: `027-workspace-focus-scroll`

**Created**: 2026-06-18

**Status**: Draft

**Input**: User description: "Add workspace focus param scroll targets to EventLedgerPage — Linear SPLR-67. Overview quick links navigate to the workspace with a `?focus=` param, but the event workspace does not scroll to the target panel (deal builder, settlement, signature, variance, sync)."

## Clarifications

### Session 2026-06-18

- Q: When switching events within the workspace (via event combobox), should the focus query parameter remain in the URL? → A: Remove focus param when switching events via the workspace event selector; new event loads at default scroll position.
- Q: When switching venues within the workspace, should the focus query parameter remain in the URL? → A: Remove focus param on venue switch; resolved event for the new venue loads at default scroll position.
- Q: After scrolling to a focus target, should keyboard focus move to the target region? → A: Always move keyboard focus to the first focusable control in the target region (all five focus values).
- Q: When re-navigating to the same event with a focus indicator, should scroll/focus re-apply? → A: Always re-apply scroll and keyboard focus when arriving via a URL with a focus indicator, even if already on the same event.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Jump to the deal builder from an overview quick link (Priority: P1)

As a venue operator preparing a show, I need to open an event from the dashboard overview and land directly at the deal builder area, so I can start or continue budget work without hunting through the full ledger layout.

**Why this priority**: Deal building is the first operational phase for most events. Quick links labeled for deal work must deliver users to the right place or the overview launch pad loses its primary value.

**Independent Test**: From the dashboard overview, activate a deal-related quick link on an event card. Confirm the event workspace opens and the deal builder area is brought into view without manual scrolling.

**Acceptance Scenarios**:

1. **Given** a user on the dashboard overview with an event in a pre-show phase, **When** they activate a quick link intended for deal or budget work, **Then** the event workspace loads and the deal builder area is scrolled into view.
2. **Given** a user opens a bookmarked or shared workspace URL that includes a deal focus indicator, **When** the page finishes loading, **Then** the deal builder area is scrolled into view.
3. **Given** a user lands on the workspace with deal focus after navigating from the overview, **When** the ledger content is still loading, **Then** the scroll target is applied once the relevant content is available (not before content exists).

---

### User Story 2 - Jump to settlement and signature workflows from quick links (Priority: P2)

As a venue operator closing out a show, I need quick links for settlement and signature capture to take me directly to those workflow areas, so I can finalize and sign without scanning the entire ledger.

**Why this priority**: Settlement and signature are time-sensitive, show-night tasks. Misdirected navigation adds friction when operators are under operational pressure.

**Independent Test**: Activate settlement and signature quick links from overview cards (or equivalent focused URLs) and confirm each lands on the correct workflow section.

**Acceptance Scenarios**:

1. **Given** a user on the dashboard overview, **When** they activate a settlement quick link on an event card, **Then** the event workspace opens with the settlement workflow area scrolled into view.
2. **Given** a user on the dashboard overview, **When** they activate a signature quick link on an event card, **Then** the event workspace opens with the signature capture area scrolled into view.
3. **Given** a user opens a workspace URL with a settlement or signature focus indicator, **When** the page loads, **Then** the corresponding workflow area is scrolled into view.

---

### User Story 3 - Jump to variance review and sync controls from quick links (Priority: P3)

As a venue operator reconciling financial data, I need quick links for variance review and sync to land me at the variance summary and sync controls, so I can resolve discrepancies and trigger sync without searching the ledger.

**Why this priority**: Variance and sync are follow-on operational tasks surfaced by alerts on event cards. Direct navigation closes the loop from overview signal to corrective action.

**Independent Test**: Activate variance and sync quick links and confirm each scrolls to the variance summary area and sync controls respectively.

**Acceptance Scenarios**:

1. **Given** a user on the dashboard overview with an event showing a variance alert, **When** they activate a variance quick link, **Then** the event workspace opens with the variance summary area scrolled into view.
2. **Given** a user on the dashboard overview, **When** they activate a sync quick link, **Then** the event workspace opens with sync controls and any unmapped-data notice area scrolled into view.
3. **Given** a user opens a workspace URL with a variance or sync focus indicator, **When** the page loads, **Then** the corresponding area is scrolled into view.

---

### User Story 4 - Workspace loads normally when focus is missing or unrecognized (Priority: P4)

As a venue operator, I need the event workspace to behave exactly as it does today when I arrive without a focus indicator or with an unrecognized one, so deep links and bookmarks never break the workspace experience.

**Why this priority**: Focus navigation is an enhancement layered on existing workspace routing. Invalid or absent focus must never produce errors or unexpected layout behavior.

**Independent Test**: Open workspace URLs with no focus parameter, an empty focus value, and an unrecognized focus value. Confirm the workspace loads at the default scroll position with no error state.

**Acceptance Scenarios**:

1. **Given** a user navigates to an event workspace URL without a focus parameter, **When** the page loads, **Then** the workspace renders normally at the default scroll position with no error message.
2. **Given** a user navigates to an event workspace URL with an unrecognized focus value, **When** the page loads, **Then** the workspace renders normally at the default scroll position with no error message.
3. **Given** a user activates an event card body (not a quick link) from the overview, **When** navigation completes, **Then** the workspace opens without a focus indicator and displays at the default scroll position.
4. **Given** a user switches to a different event via the workspace event selector, **When** the URL updates, **Then** the focus query parameter is removed and the newly selected event loads at the default scroll position.
5. **Given** a user switches to a different venue within the workspace, **When** the URL updates to the resolved event for the new venue, **Then** the focus query parameter is removed and the workspace loads at the default scroll position.

---

### Edge Cases

- What happens when the target workflow area is not visible for the event's current phase (for example, settlement focus on a pre-show event)? The workspace loads normally; scroll targets the designated area if present in the layout, otherwise the user remains at the default view without error.
- What happens when the ledger is still loading when focus is applied? Scroll is deferred until the target content is rendered; the user is not left at an arbitrary position while content populates.
- What happens when the target region contains no focusable controls (for example, a read-only variance banner)? The workspace scrolls the target into view; if no focusable control exists within the region, keyboard focus remains unchanged and no error is shown.
- What happens when the target area exists but is collapsed or off-screen on smaller viewports? The system scrolls the target into the visible viewport using stable element targeting (not fixed pixel offsets), then moves keyboard focus to the first focusable control within the region if one exists.
- What happens when a user refreshes the page while a focus indicator is in the URL? The same focus scroll behavior applies on reload.
- What happens when browser back/forward navigation changes the focus indicator? Focus scroll behavior respects the updated URL on each navigation event.
- What happens when multiple focus indicators could apply? Only the single focus value from the URL is honored; unrecognized values are ignored per User Story 4.
- What happens when a user switches events via the workspace event selector while a focus indicator is in the URL? The focus parameter is stripped from the URL and the new event opens at the default scroll position (focus scroll applies only when arriving via quick link, bookmark, or history navigation that includes focus).
- What happens when a user switches venues while a focus indicator is in the URL? The focus parameter is stripped from the URL and the resolved event for the new venue opens at the default scroll position.
- What happens when a user activates an overview quick link for an event they are already viewing? Scroll and keyboard focus re-apply to the target region indicated by the focus parameter, even though the event context is unchanged.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The event workspace MUST read an optional focus indicator from the workspace URL query string when the page loads or the URL changes.
- **FR-002**: The event workspace MUST support the following focus values, each mapping to a distinct scroll target within the financial ledger layout: `deal` (deal builder / proforma budget area), `settlement` (settlement workflow area), `signature` (signature capture area within settlement), `variance` (variance summary / alert area), and `sync` (sync controls and unmapped-data notice area).
- **FR-003**: When a recognized focus value is present and the corresponding target content is available, the workspace MUST scroll that target into the user's visible viewport after content load completes and MUST move keyboard focus to the first focusable control within the target region.
- **FR-004**: When no focus indicator is present, the focus indicator is empty, or the value is not one of the five recognized values, the workspace MUST load at the default scroll position with no error state or user-facing failure message.
- **FR-005**: Focus scroll behavior MUST apply when arriving from dashboard overview quick links, direct/bookmarked workspace URLs, and browser refresh or history navigation that includes a focus indicator.
- **FR-005a**: Each navigation to a workspace URL that includes a focus indicator MUST re-apply scroll and keyboard focus to the target region, even when the user is already viewing the same event (for example, activating a quick link for the current event from the overview).
- **FR-006**: Focus scroll targeting MUST use stable, identifiable ledger regions rather than brittle fixed-pixel scroll offsets, so behavior remains reliable across viewport sizes and layout changes.
- **FR-007**: When a user switches events via the workspace event selector or switches venues within the workspace, the focus query parameter MUST be removed from the URL and the workspace MUST load at the default scroll position for the newly resolved event.
- **FR-007a**: Focus scroll behavior MUST apply only when the user arrives with a focus indicator present in the URL (via overview quick link, bookmark, direct link, page refresh, or browser history navigation)—not as a side effect of in-workspace event or venue selection.
- **FR-008**: Focus scroll behavior MUST NOT interfere with existing workspace capabilities: venue switching, event selection, inline event management, and ledger data loading.
- **FR-009**: The feature MUST achieve ≥80% line/branch coverage across backend and frontend for all code touched by this feature (CI-enforced; Constitution III).

### Key Entities

- **Workspace focus indicator**: An optional URL query parameter (`focus`) carrying one of five recognized segment values that tells the event workspace which ledger region to bring into view on load.
- **Focus scroll target**: A named region within the event financial ledger layout corresponding to a focus value — deal builder, settlement workflow, signature capture, variance summary, or sync controls.
- **Quick link**: A phase-appropriate action on an event card (from the dashboard overview or event list) that navigates to the event workspace with a pre-set focus indicator matching the intended workflow.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In user testing or scripted walkthroughs, 100% of recognized focus values (`deal`, `settlement`, `signature`, `variance`, `sync`) scroll the corresponding ledger region into view when navigating from overview quick links.
- **SC-002**: In user testing or scripted walkthroughs, 100% of arrivals without a focus indicator or with an unrecognized value load the workspace at the default position with zero error states.
- **SC-003**: Users activating a quick link from the dashboard overview reach the intended workflow area within 2 seconds of the ledger content becoming visible, without manual scrolling.
- **SC-004**: Focus scroll and keyboard-focus behavior is consistent across page refresh and browser back/forward navigation for all five recognized focus values.
- **SC-005**: ≥80% line/branch coverage achieved across backend and frontend code for this feature (CI-enforced; Constitution III).

## Assumptions

- Dashboard overview event cards and workspace URL routing with optional `?focus=` query parameters are already implemented (SPLR-66, SPLR-63); this feature completes the deferred scroll-target behavior noted in those specifications.
- The five focus segment values (`deal`, `settlement`, `signature`, `variance`, `sync`) and their mapping to quick link labels are defined by the event card specification and do not change in this feature.
- All focus scroll targets correspond to regions already present in the event financial ledger layout; this feature does not add new ledger panels or workflow steps.
- If a target region is not rendered for a given event phase, graceful fallback to the default view (no error) is acceptable.
- Backend API changes are not required; this is a client-side navigation and scroll behavior enhancement.
- Automated verification will cover focus parameter wiring and scroll intent for each recognized value; end-to-end browser tests for overview-to-workspace flows may be covered in a separate issue (SPLR-68).
