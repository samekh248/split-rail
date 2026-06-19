# Feature Specification: Explicit Audit Logging for Rejected Frozen-Event Mutations

**Feature Branch**: `039-log-frozen-mutation-rejections`

**Created**: 2026-06-19

**Status**: Draft

**Input**: User description: "Explicitly log rejected mutation attempts on frozen events — Linear [SPLR-36](https://linear.app/audiodex/issue/SPLR-36/explicitly-log-rejected-mutation-attempts-on-frozen-events)"

**Linear Issue**: [SPLR-36](https://linear.app/audiodex/issue/SPLR-36/explicitly-log-rejected-mutation-attempts-on-frozen-events)

**Depends on**: Settlement freeze and immutability guardrails (SPLR-19 / specs 004), tenant isolation and RBAC (SPLR-16 / specs 001)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Compliance officer reviews tampering attempts on settled shows (Priority: P1)

As a compliance or operations stakeholder responsible for financial record integrity, I need every rejected attempt to change a settled or reconciled show to produce a structured audit log entry with enough context to investigate who tried to change what, so post-settlement tampering attempts are traceable without relying on generic error messages alone.

**Why this priority**: The settlement freeze milestone already rejects illegal mutations, but without explicit audit logging those rejections are invisible in operational telemetry. This is the core gap identified in SPLR-36 and required by the platform constitution for immutability enforcement.

**Independent Test**: Settle an event, attempt a financial or metadata mutation through a standard mutation path, and confirm the request is rejected with the same user-facing error as today while a structured audit log entry is emitted containing event identity, venue identity, acting user identity, event lifecycle state, and a description of the attempted operation.

**Acceptance Scenarios**:

1. **Given** an event in `SETTLED` state, **When** an authorized user attempts to mutate that event's financial line items, **Then** the mutation is rejected and a structured audit log entry is recorded containing the event id, venue id, user id, event status, and the attempted operation.
2. **Given** an event in `RECONCILED` state, **When** an authorized user attempts to mutate that event's artist configuration, **Then** the mutation is rejected and a structured audit log entry is recorded with the same contextual fields.
3. **Given** an event in `SETTLED` or `RECONCILED` state, **When** an authorized user attempts to update or delete the event record itself, **Then** the mutation is rejected and a structured audit log entry is recorded with the same contextual fields.
4. **Given** an event in `PRE_SHOW` state, **When** a permitted mutation is attempted, **Then** no frozen-event audit log entry is emitted (normal mutations must not generate false-positive immutability alerts).

---

### User Story 2 - Support engineer diagnoses a "cannot modify settled event" report (Priority: P2)

As a support engineer investigating a user report that their edit was blocked, I need rejected frozen-event mutations to appear in centralized logs with searchable identifiers (event, venue, user, operation), so I can confirm the block was intentional immutability enforcement rather than an unrelated failure.

**Why this priority**: Operational diagnosability depends on log entries being specific enough to correlate with user reports. Generic exception-type logging alone does not satisfy the constitution's "explicitly logged" requirement.

**Independent Test**: Trigger a rejected mutation against a settled event and search logs by event id or venue id; confirm a single, unambiguous audit entry explains the rejection reason at warning/audit severity without requiring stack-trace inspection.

**Acceptance Scenarios**:

1. **Given** a rejected frozen-event mutation, **When** logs are queried by event id, **Then** at least one audit entry for that rejection is found with event status `SETTLED` or `RECONCILED` and a human-readable operation label.
2. **Given** a rejected frozen-event mutation, **When** the global error-handling layer records the HTTP response, **Then** the immutability audit entry is emitted at the point of rejection (not only as a generic downstream exception summary).
3. **Given** multiple distinct mutation paths (event metadata, line items, artist records), **When** each path rejects a frozen event, **Then** each path produces an audit entry that identifies which class of operation was attempted.

---

### User Story 3 - Security review confirms no sensitive data in immutability logs (Priority: P1)

As a security reviewer, I need immutability audit logs to contain only the minimum identifiers required for investigation and to exclude signature payloads, authentication tokens, and personal identifiable information, so audit visibility does not create a secondary data-leak channel.

**Why this priority**: Constitution privacy rules apply equally to audit logs. Logging context must not trade immutability visibility for credential or PII exposure.

**Independent Test**: Trigger rejected frozen-event mutations that involve endpoints capable of carrying signature or financial payload data; capture log output and verify required context fields are present while signature blobs, tokens, secrets, and cleartext PII are absent.

**Acceptance Scenarios**:

1. **Given** a rejected mutation request whose body contains signature or financial payload data, **When** the immutability audit log is written, **Then** the log entry contains event id, venue id, user id, event status, and operation name but does NOT contain signature data, access tokens, refresh tokens, client secrets, or raw request bodies.
2. **Given** a rejected mutation by an authenticated user, **When** the audit log is written, **Then** the user is identified by stable user id only (not email address or display name in cleartext).
3. **Given** automated log-capture verification runs against representative rejection scenarios, **When** results are evaluated, **Then** 100% of captured audit entries include required context fields and 0% include prohibited sensitive fields.

---

### Edge Cases

- What happens when the acting user is unauthenticated? The mutation is rejected by authentication rules before or alongside immutability enforcement; if an immutability audit entry is emitted, user id MUST be omitted or marked as unknown rather than inventing a identity.
- What happens when the same user retries the same blocked operation repeatedly? Each rejection produces its own audit log entry (no silent deduplication) so abuse patterns remain visible.
- What happens when rejection occurs on a sanctioned exit path (e.g., super-admin settlement reversal)? Sanctioned reversal operations MUST NOT emit frozen-event rejection audit entries because they are permitted mutations, not blocked attempts.
- What happens when rejection occurs due to a non-frozen state rule (e.g., artist edit while not in `PRE_SHOW` but event is still editable)? Only rejections specifically because the event is `SETTLED` or `RECONCILED` are in scope; other ledger-state rejections are out of scope unless they also involve frozen status.
- What happens when venue scope validation fails before immutability is evaluated? Out-of-scope access attempts follow existing authorization logging patterns; this feature adds audit entries for immutability rejections on in-scope frozen events.
- What happens under concurrent mutation attempts on the same frozen event? Each rejected attempt is logged independently.

## Requirements *(mandatory)*

### Functional Requirements

#### Audit Log Emission

- **FR-001**: System MUST emit a structured audit log entry at warning or audit severity whenever a mutation against `events`, `event_artists`, or `financial_line_items` is rejected because the target event's lifecycle status is `SETTLED` or `RECONCILED`.
- **FR-002**: Each audit log entry MUST include: event id, venue id, acting user id (when authenticated), event lifecycle status (`SETTLED` or `RECONCILED`), and a concise label identifying the attempted operation (e.g., update line item, delete event, update artist).
- **FR-003**: Audit log entries MUST be emitted at the immutability rejection point so the entry is recorded even if downstream error handling summarizes the failure generically.
- **FR-004**: System MUST cover all existing frozen-event mutation rejection paths for event metadata changes, event deletion, financial line item create/update/delete, and artist record mutations guarded by settled/reconciled status checks.

#### Privacy & Sanitization

- **FR-005**: Audit log entries MUST NOT include signature payloads, authentication tokens, refresh tokens, client secrets, database connection strings, or raw HTTP request/response bodies.
- **FR-006**: Audit log entries MUST NOT include cleartext user PII (email addresses, names, phone numbers); user identity MUST be represented by stable user id only.
- **FR-007**: Audit log entries MUST NOT include full financial field values from the rejected payload; operation classification and entity identifiers are sufficient.

#### Behavioral Preservation

- **FR-008**: User-facing rejection behavior MUST remain unchanged: rejected frozen-event mutations continue to return the same HTTP 400-class error responses and error messages already established by the settlement freeze milestone.
- **FR-009**: Permitted mutations on non-frozen events and sanctioned super-admin settlement-reversal flows MUST NOT emit frozen-event rejection audit entries.

#### Verification

- **FR-010**: System MUST include automated verification that triggers representative frozen-event mutation rejections and asserts (a) a structured audit log entry exists with all required context fields and (b) prohibited sensitive fields are absent from captured log output.
- **FR-011**: Automated verification MUST cover at least one rejection path each for event metadata mutation, line-item mutation, and artist-record mutation on both `SETTLED` and `RECONCILED` events.
- **FR-012**: System MUST achieve ≥80% line/branch coverage across backend and frontend for this feature (CI-enforced; Constitution III).

### Key Entities

- **Frozen Event**: An event whose lifecycle status is `SETTLED` or `RECONCILED`; all standard financial and configuration mutations are prohibited except sanctioned reversal flows defined by the settlement freeze milestone.
- **Immutability Rejection Audit Entry**: A structured log record emitted when a mutation attempt against a frozen event is blocked; carries event id, venue id, user id, event status, and attempted operation label without sensitive payload content.
- **Attempted Operation**: A concise, stable label describing which mutation was blocked (e.g., "update_event_metadata", "create_line_item", "delete_line_item", "update_artist") sufficient for operational search and compliance review.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of tested frozen-event mutation rejection paths (event metadata, line items, artist records) on `SETTLED` and `RECONCILED` events produce a structured audit log entry containing event id, venue id, user id (when authenticated), event status, and attempted operation (proven by automated log-capture verification).
- **SC-002**: 0% of captured immutability audit log entries from automated verification contain signature data, authentication tokens, client secrets, or cleartext user PII (proven by automated log-capture verification).
- **SC-003**: Support engineers can locate a specific rejected frozen-event attempt by searching logs on event id alone and find a single unambiguous audit entry within one query (validated in QA smoke test).
- **SC-004**: User-facing error responses for frozen-event rejections remain unchanged from pre-feature behavior (proven by existing API contract tests continuing to pass).
- **SC-005**: 0 false-positive immutability audit entries are emitted for successful mutations on `PRE_SHOW` events or sanctioned settlement-reversal operations (proven by automated verification).
- **SC-006**: ≥80% line/branch coverage achieved across backend and frontend code for this feature (CI-enforced; Constitution III).

## Assumptions

- Settlement freeze immutability guardrails (SPLR-19) are implemented and already reject mutations on `SETTLED`/`RECONCILED` events with appropriate HTTP 400-class errors.
- Authenticated requests already resolve a stable acting user id through the existing tenant context; this feature consumes that identifier for audit entries.
- Centralized structured application logging (e.g., GCP Cloud Logging) is the destination for audit entries; log retention and alerting policies are infrastructure concerns outside this feature's scope.
- This feature is backend observability only; no user-facing UI changes are required.
- Sanctioned super-admin settlement reversal remains the only permitted exit from frozen status; reversal success paths are not immutability rejections.
- Frontend coverage contribution is minimal (no new UI); backend automated verification carries the primary coverage obligation for this feature.
