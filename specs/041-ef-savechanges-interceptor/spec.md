# Feature Specification: Persistence-Layer Immutability Guard for Frozen Events

**Feature Branch**: `041-ef-savechanges-interceptor`

**Created**: 2026-06-20

**Status**: Draft

**Input**: User description: "Add EF SaveChanges interceptor as defense-in-depth immutability guard — Linear [SPLR-35](https://linear.app/audiodex/issue/SPLR-35/add-ef-savechanges-interceptor-as-defense-in-depth-immutability-guard)"

**Linear Issue**: [SPLR-35](https://linear.app/audiodex/issue/SPLR-35/add-ef-savechanges-interceptor-as-defense-in-depth-immutability-guard)

**Depends on**: Settlement freeze and immutability guardrails (SPLR-19 / specs 004), explicit frozen-mutation audit logging (SPLR-36 / specs 039), QBO actuals-on-frozen exception (specs 040)

## Clarifications

### Session 2026-06-20

- Q: Should persistence-layer rejections use the same audit log format as service-layer frozen-mutation rejections (spec 039), or a distinct log category? → A: Same frozen-event mutation audit format as service-layer rejections (spec 039).
- Q: How should the persistence guard recognize sanctioned saves (QBO actuals refresh, settlement reversal, status transitions)? → A: Hybrid — field-diff for QBO actuals-only updates; explicit save context for settlement reversal and status transitions.
- Q: Should the persistence guard apply strictly to events, event_artists, and financial_line_items only? → A: Strictly the three tables only; all other tables explicitly out of scope.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Platform guarantees frozen financial records cannot be altered at the database layer (Priority: P1)

As a compliance stakeholder responsible for settlement integrity, I need the platform to enforce immutability at the point financial records are persisted to the database—not only in application services—so that a forgotten or newly added code path cannot silently mutate settled or reconciled show data and drift from the archived settlement snapshot.

**Why this priority**: Service-layer guards (SPLR-19) can be bypassed if a developer adds a mutation path that writes directly to the database without invoking existing validation. A central persistence-layer guard closes this gap and satisfies the constitution's requirement that frozen-event protection holds regardless of caller.

**Independent Test**: Settle an event, then attempt to change event metadata, artist configuration, or financial line items through a path that bypasses standard application services but still reaches the database save operation; confirm the save is rejected with an explicit domain error and no data change is committed.

**Acceptance Scenarios**:

1. **Given** an event in `SETTLED` state, **When** a direct database save attempts to modify that event's metadata fields (e.g., name, date, settlement snapshot fields), **Then** the save is rejected before commit and no change is persisted.
2. **Given** an event in `SETTLED` or `RECONCILED` state, **When** a direct database save attempts to create, update, or delete a financial line item belonging to that event (except the sanctioned actuals update described in User Story 2), **Then** the save is rejected before commit and no change is persisted.
3. **Given** an event in `SETTLED` or `RECONCILED` state, **When** a direct database save attempts to create, update, or delete an artist record belonging to that event, **Then** the save is rejected before commit and no change is persisted.
4. **Given** an event in `PRE_SHOW` state, **When** a permitted mutation is saved through any path, **Then** the persistence guard does not block the save (no false positives on editable events).

---

### User Story 2 - Sanctioned post-settlement operations continue to work (Priority: P1)

As an operations user relying on QuickBooks reconciliation and settlement reversal workflows, I need the persistence-layer guard to permit only the explicitly sanctioned mutations on frozen events, so that legitimate post-settlement actuals updates and super-admin reversals are not blocked while all other changes remain forbidden.

**Why this priority**: A blanket persistence block would break QBO sync actuals aggregation and settlement reversal—both constitutionally defined exceptions. The guard must distinguish allowed from disallowed field changes on frozen records.

**Independent Test**: On a `SETTLED` or `RECONCILED` event, run the sanctioned QBO actuals aggregation update and a super-admin settlement reversal; confirm both succeed. Attempt any other field change on the same records and confirm rejection.

**Acceptance Scenarios**:

1. **Given** an event in `SETTLED` or `RECONCILED` state, **When** the sanctioned QuickBooks actuals aggregation updates only the QBO actuals total on existing line items (detected by field-diff with no other line-item fields changed), **Then** the save succeeds and proforma and settlement snapshot values remain unchanged.
2. **Given** an event in `SETTLED` state, **When** a super-admin executes the sanctioned settlement-reversal operation with an explicit authorized save context, **Then** the event transitions back to an editable state and the original archived settlement document remains untouched.
3. **Given** an event in `SETTLED` or `RECONCILED` state, **When** a save attempts to modify proforma values, settlement snapshot values, artist payout calculations, or event metadata outside a sanctioned flow, **Then** the save is rejected even if the change is submitted alongside an otherwise permitted actuals update.
4. **Given** a `PRE_SHOW` event undergoing the finalize-settlement transition, **When** the atomic settlement pipeline persists signature data, snapshot values, and status change to `SETTLED`, **Then** the persistence guard does not block the transition (finalize is not a mutation against an already-frozen event).

---

### User Story 3 - Blocked persistence attempts are observable for investigation (Priority: P2)

As a support engineer or security reviewer, I need persistence-layer immutability rejections to produce explicit, logged domain errors with enough context to identify the affected event and operation class, so bypass attempts are diagnosable without inspecting raw database state.

**Why this priority**: Defense-in-depth only adds value if violations are visible. Silent failures or generic errors would hide the very bypass paths this feature is meant to catch.

**Independent Test**: Trigger a persistence-layer rejection against a frozen event and confirm a structured log entry or domain error is emitted containing event identity and a description of the blocked operation, without sensitive payload content.

**Acceptance Scenarios**:

1. **Given** a persistence-layer rejection on a frozen event, **When** the save is blocked, **Then** an explicit domain error is raised (not swallowed) and a frozen-event mutation audit entry (same format as spec 039 service-layer rejections) records event id, venue id, user id (when available), event status, and the class of blocked change.
2. **Given** a persistence-layer rejection, **When** the log entry is written, **Then** it does not include signature data, authentication tokens, client secrets, or raw financial field values from the rejected change.
3. **Given** a successful sanctioned actuals update on a frozen event, **When** the save completes, **Then** no immutability rejection log entry is emitted.

---

### Edge Cases

- What happens when multiple entity types for the same frozen event are modified in a single save operation? The entire save MUST be rejected; partial commits of some changes while blocking others are not permitted.
- What happens when a new line item row is inserted for a frozen event? Insertions on frozen events are blocked unless explicitly part of a sanctioned flow (none currently permit new line items post-settlement).
- What happens when an event row's status field alone is changed from `PRE_SHOW` to `SETTLED` during finalize? Allowed as part of the settlement pipeline on a non-frozen source state.
- What happens when an event transitions from `SETTLED` to `RECONCILED` as part of the reconciliation milestone? Status-only transition on the event record is permitted when driven by the sanctioned reconciliation workflow with an explicit authorized save context.
- What happens when a sanctioned workflow forgets to set the authorized save context? The persistence guard treats the save as unauthorized and rejects it—the explicit context is mandatory for settlement reversal and status transitions, not optional.
- What happens when a save modifies both an in-scope table (`events`, `event_artists`, `financial_line_items`) and an out-of-scope table (e.g., QBO sync ledger) in the same operation? The guard evaluates only the three in-scope tables; out-of-scope table changes are not subject to frozen-event immutability rules.
- What happens when a developer uses a bulk update or raw SQL outside the standard save path? Out of scope for this feature—the guard applies to the platform's standard database save pipeline; ad-hoc administrative SQL is an operational concern.
- What happens when the same blocked save is retried? Each attempt produces its own rejection (no silent deduplication).
- What happens under concurrent saves on the same frozen event? Each violating save is evaluated and rejected independently.

## Requirements *(mandatory)*

### Functional Requirements

#### Persistence-Layer Guard

- **FR-001**: System MUST enforce immutability at the central database save pipeline for pending changes to `events`, `event_artists`, and `financial_line_items` records only whose owning event lifecycle status is `SETTLED` or `RECONCILED`. All other tables (including QBO sync ledger, settlement reversal audit records, and organization/venue metadata) are explicitly out of scope for this guard.
- **FR-002**: The persistence guard MUST evaluate pending changes immediately before commit, regardless of which application code path initiated the save.
- **FR-003**: When a disallowed change is detected, the system MUST reject the entire save operation, MUST NOT persist any part of the violating change set, and MUST raise an explicit domain error (never a generic or swallowed failure).
- **FR-004**: The persistence guard MUST block create, update, and delete operations on `event_artists` and `financial_line_items` rows belonging to frozen events, except for the sanctioned exceptions defined in FR-005 through FR-007.
- **FR-005**: The persistence guard MUST block updates and deletes to frozen `events` rows except for: (a) sanctioned settlement-reversal transitions authorized by explicit save context, (b) sanctioned status progression from `SETTLED` to `RECONCILED` authorized by explicit save context, and (c) fields explicitly required by those sanctioned workflows.
- **FR-006**: The persistence guard MUST permit updates to the QBO actuals aggregate field on existing `financial_line_items` rows for frozen events when field-diff confirms no other line-item fields are modified in the same save—this is the sanctioned post-settlement actuals refresh exception aligned with QuickBooks as source of truth (no explicit save context required for this narrow case).
- **FR-007**: The persistence guard MUST permit the sanctioned super-admin settlement-reversal workflow to transition a `SETTLED` event back to an editable state and record reversal audit data when the save carries an explicit authorized save context, without altering or deleting the original archived settlement document reference.
- **FR-007a**: Sanctioned status transitions on frozen events (settlement reversal, `SETTLED` → `RECONCILED` reconciliation) MUST require an explicit authorized save context set by the owning workflow before save; field-diff alone is insufficient for these multi-field event updates.
- **FR-008**: The persistence guard MUST NOT block saves on events in `PRE_SHOW` state, including the finalize-settlement transition that moves an event from `PRE_SHOW` to `SETTLED`.

#### Observability & Error Behavior

- **FR-009**: Each persistence-layer immutability rejection MUST emit a frozen-event mutation audit entry using the same format and fields as service-layer rejections (spec 039): event id, venue id, acting user id (when available), event lifecycle status, and a concise label for the blocked operation class.
- **FR-010**: Persistence-layer rejection logs MUST NOT include signature payloads, authentication tokens, refresh tokens, client secrets, database connection strings, or raw financial field values from the rejected change.
- **FR-011**: User-facing behavior for mutations that reach application services before the persistence guard MUST remain unchanged—existing HTTP 400-class responses and error messages from service-layer guards continue to apply; this feature adds a lower-layer safety net, not new user-facing error semantics for standard API paths.

#### Verification

- **FR-012**: System MUST include automated verification that attempts a direct database save bypassing application service guards against a frozen event and asserts (a) the save is rejected, (b) no data change is committed, and (c) a structured rejection log entry is emitted.
- **FR-013**: Automated verification MUST confirm sanctioned QBO actuals-only updates (field-diff) and settlement-reversal saves (explicit authorized save context) succeed on frozen events while adjacent disallowed field changes on the same records are rejected.
- **FR-014**: Automated verification MUST confirm zero false-positive rejections for permitted mutations on `PRE_SHOW` events.
- **FR-015**: System MUST achieve ≥80% line/branch coverage across backend and frontend for this feature (CI-enforced; Constitution III).

### Key Entities

- **Frozen Event**: An event whose lifecycle status is `SETTLED` or `RECONCILED`; its associated event metadata, artist records, and financial line items are subject to immutability enforcement at both the application and persistence layers.
- **Persistence Guard Rejection**: A blocked database save triggered because pending changes would alter frozen snapshot data outside sanctioned exceptions; produces an explicit domain error and structured audit log entry.
- **Sanctioned Exception**: A constitutionally defined operation permitted on frozen records—QBO actuals aggregate refresh on line items (field-diff detected), settlement reversal by super-admin (explicit save context), and status transitions driven by sanctioned settlement or reconciliation workflows (explicit save context).
- **Authorized Save Context**: An explicit marker attached to a database save operation by a sanctioned workflow, signaling that the pending changes are permitted despite the owning event being frozen; required for settlement reversal and status transitions, not required for QBO actuals-only field-diff updates.
- **Snapshot Fields**: Financial and configuration values captured at settlement that MUST NOT drift after freeze—proforma values, settlement actuals, artist payout calculations, signature data, and settlement document reference—distinct from the QBO actuals aggregate which may refresh post-settlement.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of tested direct-save bypass attempts against `SETTLED` and `RECONCILED` events (event metadata, line items, artist records) are rejected with no committed data change (proven by automated verification).
- **SC-002**: 100% of tested sanctioned post-settlement operations (QBO actuals-only update, super-admin settlement reversal) succeed without persistence-layer rejection (proven by automated verification).
- **SC-003**: 0 false-positive persistence rejections occur for permitted mutations on `PRE_SHOW` events including finalize-settlement transition (proven by automated verification).
- **SC-004**: 100% of persistence-layer immutability rejections in automated verification produce a frozen-event mutation audit entry (spec 039 format) with event id, venue id, user id (when available), event status, and operation class, and 0% contain prohibited sensitive fields (proven by automated log-capture verification).
- **SC-005**: Existing service-layer immutability behavior and user-facing error responses remain unchanged for standard API mutation paths (proven by existing API contract and integration tests continuing to pass).
- **SC-006**: ≥80% line/branch coverage achieved across backend and frontend code for this feature (CI-enforced; Constitution III).

## Assumptions

- Service-layer immutability guards (SPLR-19) and frozen-mutation audit logging (SPLR-36 / specs 039) are implemented and remain the primary enforcement and observability path for standard API mutations; persistence-layer rejections reuse the same audit entry format so operational search covers all immutability violations regardless of enforcement layer.
- This feature adds a persistence-layer safety net; it does not replace or weaken existing service-layer checks.
- The sanctioned QBO actuals aggregate update exception applies only to the QBO actuals total field on existing line items and is detected by field-diff (no explicit save context); append-only QBO ledger entries are handled by separate sync logic and are not blocked by line-item immutability rules when they do not mutate snapshot fields.
- Settlement reversal and `SETTLED` → `RECONCILED` status transitions require an explicit authorized save context from the owning workflow; field-diff alone is used only for the narrow QBO actuals-only case.
- Settlement reversal remains restricted to super-admin elevated permission with full audit trail; the persistence guard permits only this sanctioned exit from `SETTLED`.
- Frontend coverage contribution is minimal (no new UI); backend automated verification carries the primary coverage obligation for this feature.
- Bulk raw SQL or direct database administration outside the application save pipeline is out of scope.
- The persistence guard applies exclusively to `events`, `event_artists`, and `financial_line_items`; QBO sync ledger inserts, settlement reversal audit records, and all other tables are explicitly out of scope.
