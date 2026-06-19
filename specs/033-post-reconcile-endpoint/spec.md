# Feature Specification: Post-Show Event Reconciliation Transition

**Feature Branch**: `033-post-reconcile-endpoint`

**Created**: 2026-06-18

**Status**: Draft

**Input**: User description: "Add POST reconcile endpoint for SETTLED → RECONCILED transition (Linear SPLR-73)"

**Linear Issue**: [SPLR-73](https://linear.app/audiodex/issue/SPLR-73/add-post-reconcile-endpoint-for-settled-reconciled-transition)

## Clarifications

### Session 2026-06-18

- Q: Should reconciliation persist audit metadata (timestamp + user), or only update status? → A: Capture reconciled timestamp and reconciling user (mirror settlement pattern).
- Q: Does this feature include frontend work, or is it backend/API-only for v1? → A: Backend/API only — no new frontend components; coverage applies to backend changes.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Mark a Settled Show as Reconciled (Priority: P1)

As a venue operator who has completed post-show QuickBooks review and variance checks, I need to manually mark a settled event as reconciled so the platform reflects that financial records have been reviewed and aligned with accounting data. This closes the post-show lifecycle and enables dashboard Post-Show workflows (variance alerts, quick links) that depend on the reconciled state.

**Why this priority**: Without a sanctioned transition from Settled to Reconciled, the reconciled lifecycle state exists in the model but cannot be reached in production. Post-show dashboard features and operational reporting remain blocked.

**Independent Test**: Can be verified by an authorized user reconciling a settled event they can access and confirming the event's lifecycle status becomes Reconciled in subsequent event and dashboard reads.

**Acceptance Scenarios**:

1. **Given** an event in Settled status within a venue the user can access, **When** an authorized user performs the reconcile action, **Then** the event transitions to Reconciled status, records the reconciling user and reconciliation timestamp, and the change is persisted.
2. **Given** an event that has been reconciled, **When** the user views the event through event detail or dashboard aggregation, **Then** the lifecycle label and status reflect Reconciled (not Settled), and reconciliation metadata is available alongside existing settlement metadata.
3. **Given** a user without permission to trigger accounting sync operations, **When** they attempt to reconcile an event, **Then** the request is denied.

---

### User Story 2 - Reject Invalid Lifecycle Transitions (Priority: P1)

As the platform, I must only allow reconciliation when the event is in Settled status so the lifecycle state machine remains consistent and financial immutability guardrails are preserved.

**Why this priority**: Allowing reconciliation from Pre-Show or duplicate reconciliation would corrupt lifecycle semantics and undermine settlement immutability guarantees established when the show was frozen.

**Independent Test**: Can be verified by attempting reconciliation against events in Pre-Show and already-Reconciled states and confirming every attempt is rejected with a clear, non-success outcome.

**Acceptance Scenarios**:

1. **Given** an event in Pre-Show status, **When** a user attempts to reconcile it, **Then** the request is rejected and the event status remains unchanged.
2. **Given** an event already in Reconciled status, **When** a user attempts to reconcile it again, **Then** the request is rejected and no duplicate transition occurs.
3. **Given** a reconcile attempt against an invalid state, **When** the rejection occurs, **Then** the user receives a clear error indicating the event is not in a state that permits reconciliation.

---

### User Story 3 - Enforce Organization and Venue Access (Priority: P1)

Reconciliation must respect the same multi-tenant and venue-scoping rules as all other event lifecycle operations. Users must only reconcile events within their current organization and within venues they are allowed to access.

**Why this priority**: Cross-tenant or out-of-scope reconciliation attempts are a security and data-integrity release blocker.

**Independent Test**: Can be verified by attempting reconciliation against events in another organization or inaccessible venues and confirming every attempt is denied without exposing whether the event exists in another tenant.

**Acceptance Scenarios**:

1. **Given** an authenticated user in Organization A, **When** they attempt to reconcile an event belonging to Organization B, **Then** the request is denied.
2. **Given** an authenticated user scoped to Venue X only, **When** they attempt to reconcile an event in Venue Y within the same organization, **Then** the request is denied.
3. **Given** an authenticated user referencing a non-existent event or venue in their organization, **When** they attempt to reconcile, **Then** the request is denied without revealing cross-tenant information.

---

### User Story 4 - Preserve Financial Immutability After Reconciliation (Priority: P2)

After an event is reconciled, all existing immutability rules for settled events must continue to apply. Reconciliation is a lifecycle status change only; it must not alter settlement financial values, artist payouts, or the archived settlement document.

**Why this priority**: Reconciliation marks accounting alignment completion; it must not reopen or mutate the legally frozen settlement snapshot.

**Independent Test**: Can be verified by reconciling a settled event, then attempting to mutate event metadata, artist records, or financial line items, and confirming all mutation attempts remain blocked as they were for settled events.

**Acceptance Scenarios**:

1. **Given** an event in Reconciled status, **When** any mutation is attempted on event, artist, or financial line item data, **Then** the mutation is rejected with the same immutability enforcement applied to Settled events.
2. **Given** a reconciled event with an archived settlement document, **When** reconciliation completes, **Then** the settlement document reference and underlying financial snapshot remain unchanged.

---

### Edge Cases

- What happens when two reconcile requests arrive simultaneously for the same Settled event? The first successful transition wins; the concurrent request is rejected without producing an inconsistent state.
- What happens when the event's venue identifier in the request does not match the event's actual venue? The request is denied as not found or not accessible.
- What happens when reconciliation is attempted during a settlement reversal in progress? The reconcile action follows the same state guards; only Settled events are eligible.
- What happens when the persistence layer is unavailable? The user receives a clear failure response; the event status is not partially updated.
- Does reconciliation require a completed QuickBooks sync? No — version 1 is a manual operator action; sync completion is not a precondition (automatic reconciliation after sync is explicitly out of scope).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a reconcile action that transitions a specified event from Settled to Reconciled status when invoked by an authorized user, persisting the reconciling user's identity and a reconciliation timestamp at the moment of transition.
- **FR-002**: Reconcile action MUST be permitted only when the target event's current status is Settled; events in Pre-Show or already Reconciled MUST be rejected.
- **FR-003**: Reconcile action MUST require the authenticated user to hold permission to trigger accounting sync operations (the same permission gating used for QuickBooks sync initiation).
- **FR-004**: System MUST validate that the requested venue and event belong to the authenticated user's current organization before reconciliation proceeds.
- **FR-005**: System MUST validate that the authenticated user has access to the requested venue (respecting venue scope rules) before reconciliation proceeds.
- **FR-006**: Cross-organization or inaccessible reconcile attempts MUST be denied without leaking information about resources in other tenants.
- **FR-007**: Upon successful reconciliation, the event status MUST persist as Reconciled along with reconciliation metadata (reconciling user, reconciliation timestamp), and all updated fields MUST be reflected in subsequent event retrieval and dashboard aggregation responses.
- **FR-008**: Reconciliation MUST NOT modify settlement financial values, artist payout calculations, signature data, or the archived settlement document reference.
- **FR-009**: After reconciliation, all existing immutability guardrails for Settled and Reconciled events MUST remain enforced for event, artist, and financial line item mutations.
- **FR-010**: Concurrent reconcile requests for the same event MUST resolve to at most one successful transition; losing concurrent requests MUST be rejected without inconsistent state.
- **FR-011**: Reconciliation in version 1 MUST be a manual operator-initiated action; automatic transition to Reconciled upon QuickBooks sync completion is explicitly out of scope.
- **FR-012**: System MUST achieve ≥80% line/branch coverage on backend code changed for this feature (CI-enforced; Constitution III). No new frontend components are in scope; existing frontend lifecycle utilities require no modification for this release.

### Key Entities

- **Event**: A venue show record with a lifecycle status (Pre-Show, Settled, Reconciled). Reconciliation updates status plus reconciliation metadata (reconciliation timestamp, reconciling user). Settlement metadata (settlement timestamp, signer, document reference) remains unchanged.
- **Reconcile Action**: A user-initiated lifecycle transition request scoped to a venue and event, gated by organization membership, venue access, sync permission, and current Settled status.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Authorized users can mark a Settled event as Reconciled in a single action, and 100% of successful reconcile attempts persist Reconciled status plus reconciliation metadata (reconciling user, reconciliation timestamp) visible on the next event or dashboard read.
- **SC-002**: 100% of reconcile attempts against Pre-Show or already-Reconciled events are rejected with a clear error and no status change.
- **SC-003**: 100% of cross-organization or out-of-venue-scope reconcile attempts are denied without exposing cross-tenant resource existence.
- **SC-004**: Post-reconciliation, 100% of financial mutation attempts on the event are blocked with the same immutability behavior as pre-reconciliation Settled events.
- **SC-005**: Dashboard Post-Show lifecycle features that depend on Reconciled status (quick links, variance-oriented workflows) can distinguish reconciled events from merely settled events after this feature ships.
- **SC-006**: ≥80% line/branch coverage achieved on backend code changed for this feature (CI-enforced; Constitution III).

## Assumptions

- The Settled and Reconciled lifecycle states and their immutability rules are already defined by the settlement freeze feature; this feature adds only the missing Settled → Reconciled transition path.
- Permission to trigger accounting sync operations is the correct authorization gate for reconciliation in version 1, aligning post-show financial review with sync-capable operators.
- Reconciliation metadata mirrors the settlement pattern: reconciliation timestamp and reconciling user are persisted at transition time and exposed through event retrieval responses.
- Automatic reconciliation triggered by QuickBooks sync completion is deferred to a future milestone; operators explicitly reconcile after review.
- This feature is backend/API-only for version 1; Post-Show dashboard quick-link UI wiring ships in a separate feature.
- Reconciliation is irreversible in version 1; no undo or reversal path from Reconciled status is in scope (settlement reversal applies only to Settled events per existing platform rules).
- Event retrieval and dashboard aggregate responses already expose event status; reconciliation metadata fields are added following the same exposure pattern as settlement metadata.
