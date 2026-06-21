# Feature Specification: Atomic Settlement Finalize Pipeline

**Feature Branch**: `043-atomic-settle-pipeline`

**Created**: 2026-06-20

**Status**: Draft

**Input**: User description: "Make settle pipeline atomic (DB transaction + upload ordering / orphan cleanup) — Linear [SPLR-38](https://linear.app/audiodex/issue/SPLR-38/make-settle-pipeline-atomic-db-transaction-upload-ordering-orphan)"

**Linear Issue**: [SPLR-38](https://linear.app/audiodex/issue/SPLR-38/make-settle-pipeline-atomic-db-transaction-upload-ordering-orphan)

**Depends on**: Night-of settlement freeze pipeline (SPLR-19 / specs 004), persistence-layer immutability guard (SPLR-35 / specs 041)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Failed finalize never leaves a half-frozen settlement (Priority: P1)

As a tour manager finalizing a show settlement, I need the platform to treat settlement finalization as an all-or-nothing operation so that if anything goes wrong during PDF generation, storage, or record update, the event stays fully editable and no stray settlement document is left behind that could be mistaken for the official record.

**Why this priority**: Partial or inconsistent settlement state undermines legal defensibility. An event marked settled without a matching archive—or an archive without a settled event—creates audit risk and operator confusion. This is the core integrity gap identified in SPLR-38.

**Independent Test**: Trigger finalize on a settlement-ready event while forcing failures at PDF render, storage upload, and database commit stages; confirm every failure leaves the event in its prior non-settled state with no stored settlement PDF artifact associated with that attempt.

**Acceptance Scenarios**:

1. **Given** an event in `PRE_SHOW` with a locked budget and valid signature, **When** PDF generation fails before any storage write, **Then** the event remains not settled, no settlement PDF is stored, and the caller receives an explicit error.
2. **Given** an event in `PRE_SHOW` with a locked budget and valid signature, **When** storage upload fails, **Then** the event remains not settled, no settlement PDF is stored, and the caller receives an explicit error (existing behavior preserved).
3. **Given** an event in `PRE_SHOW` with a locked budget and valid signature, **When** storage upload succeeds but the database state update fails or is rolled back, **Then** the event remains not settled and no orphaned settlement PDF from that attempt remains in storage.
4. **Given** a successful finalize, **When** the operation completes, **Then** the event is settled, settlement metadata is persisted, and exactly one settlement PDF artifact exists and is referenced by the event record.

---

### User Story 2 - Finalize operation ordering matches the settlement contract (Priority: P1)

As a platform operator responsible for settlement integrity, I need the finalize pipeline to follow the documented operation sequence—validate and snapshot, render the PDF, persist the archive, then commit settlement state in a dedicated database transaction—so that long-running storage work does not hold database locks and state changes are isolated to a short, explicit commit phase.

**Why this priority**: The settlement contract (spec 004, step 6) defines upload before a dedicated database transaction for state mutation. Holding a database transaction open during storage upload increases contention, extends row locks, and diverges from the agreed contract auditors and downstream tooling expect.

**Independent Test**: Instrument or review the finalize flow and confirm PDF rendering and storage upload complete before the settlement state mutation begins its database transaction; confirm concurrent finalize behavior (first-wins) is unchanged.

**Acceptance Scenarios**:

1. **Given** a finalize request passes validation and snapshot, **When** the pipeline executes, **Then** PDF rendering and storage upload occur before the settlement state mutation enters its database transaction.
2. **Given** two concurrent finalize requests for the same event, **When** they race, **Then** exactly one succeeds, the loser is rejected with a conflict response, and exactly one settlement PDF artifact is produced (existing concurrency behavior preserved).
3. **Given** a finalize request against an already-settled event, **When** submitted, **Then** it is rejected without creating a new PDF or altering stored settlement metadata.

---

### User Story 3 - Atomicity failures are verifiable in automated tests (Priority: P2)

As an engineering team maintaining settlement integrity, I need automated tests that prove atomicity for every failure point in the finalize pipeline—including PDF render failure—not only storage upload failure, so regressions in ordering or orphan handling are caught before release.

**Why this priority**: Upload-failure atomicity is already tested; render failure and post-upload database failure are not. Without coverage at each step, the orphan gap can reappear silently.

**Independent Test**: Run the settlement atomicity test suite; confirm distinct tests force failures at render, upload, and database-commit stages and assert both event state and storage artifact counts.

**Acceptance Scenarios**:

1. **Given** a forced PDF render failure, **When** finalize is attempted, **Then** automated tests assert the event is not settled and zero new settlement PDF objects were stored.
2. **Given** a forced storage upload failure, **When** finalize is attempted, **Then** automated tests assert the event is not settled and zero new settlement PDF objects were stored.
3. **Given** a forced database commit failure after a successful upload, **When** finalize is attempted, **Then** automated tests assert the event is not settled and zero orphaned settlement PDF objects remain from that attempt.

---

### Edge Cases

- **Render failure before storage**: No storage write, no state change, explicit error to caller.
- **Upload failure after render**: Rendered bytes discarded; no state change; explicit error to caller.
- **Database failure after upload**: Event must not be settled; any PDF written during the attempt must be removed or never promoted to the immutable archive (no orphaned artifact).
- **Concurrent finalize during cleanup**: First-wins semantics unchanged; the losing request must not leave an extra artifact even if it uploaded before losing the race.
- **WORM retention constraints**: Orphan prevention must not require deleting objects already under an immutable retention lock; staging or promote-on-commit strategies must respect that archived settlements remain non-deletable once finalized.
- **Persistence guard interaction**: Finalize transition from `PRE_SHOW` to `SETTLED` must continue to succeed through the persistence-layer immutability guard (spec 041); this hardening must not block sanctioned finalize saves.
- **Re-finalize after reversal**: Re-settlement after a super-admin reversal continues to produce a new PDF at a new path; original archived PDF remains untouched.

## Requirements *(mandatory)*

### Functional Requirements

#### Atomic Finalize Integrity

- **FR-001**: System MUST treat settlement finalization as an all-or-nothing operation: either the event becomes settled with a persisted settlement PDF reference and complete settlement metadata, or the event remains in its prior non-settled state with no new settlement PDF artifact from that attempt.
- **FR-002**: System MUST NOT leave an orphaned settlement PDF in storage when finalize fails after a successful upload but before a successful settlement state commit.
- **FR-003**: System MUST reject finalize with an explicit domain error when PDF generation fails, without writing to storage or mutating event settlement state.

#### Operation Ordering

- **FR-004**: System MUST execute finalize in this order: (1) validate preconditions and signature, (2) snapshot financial values, (3) render PDF, (4) persist PDF to settlement archive storage, (5) commit settlement state mutation in a dedicated database transaction. Steps 1–4 MUST complete before step 5 begins.
- **FR-005**: System MUST NOT hold a database transaction open during PDF rendering or settlement archive upload; the database transaction MUST be limited to the settlement state mutation phase.
- **FR-006**: System MUST preserve existing finalize preconditions and outcomes: budget locked, `PRE_SHOW` status, valid signature, permission and venue scope checks, concurrency first-wins behavior, and rejection of already-settled events.

#### Failure Handling and Observability

- **FR-007**: System MUST surface granular domain errors for render, storage, and state-commit failures—never generic or swallowed exceptions in the finalize path.
- **FR-008**: System MUST NOT log raw signature payloads, storage credentials, or other sensitive data when reporting finalize failures.

#### Automated Verification

- **FR-009**: System MUST include automated tests that force PDF render failure during finalize and assert the event is not settled and no settlement PDF was stored.
- **FR-010**: System MUST include automated tests that force storage upload failure during finalize and assert the event is not settled and no settlement PDF was stored (extends existing coverage).
- **FR-011**: System MUST include automated tests that force database commit failure after a successful upload and assert the event is not settled and no orphaned settlement PDF remains from that attempt.
- **FR-012**: System MUST achieve ≥80% line/branch coverage across backend and frontend for this feature (CI-enforced; Constitution III).

### Key Entities *(include if feature involves data)*

- **Event**: Settlement lifecycle record; finalize updates `status`, `settled_at`, `settled_by_user_id`, `artist_signature_data`, and `settlement_pdf_url` atomically with archive persistence.
- **Settlement PDF Artifact**: Immutable archived document stored in settlement archive storage; must exist if and only if the corresponding event is successfully settled with a non-null PDF reference.
- **Settlement Archive Storage**: Durable object store for settlement PDFs; subject to WORM retention once a document is promoted to the finalized archive path.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of forced finalize failures at render, upload, or database-commit stages leave the event in a non-settled state (proven by automated tests).
- **SC-002**: 100% of forced finalize failures at render, upload, or database-commit stages leave zero orphaned settlement PDF artifacts from that attempt in storage (proven by automated tests).
- **SC-003**: 100% of successful finalize operations produce exactly one stored settlement PDF referenced by the settled event (existing behavior preserved).
- **SC-004**: 100% of concurrent finalize races resolve with exactly one success and one conflict response, with exactly one stored PDF (existing behavior preserved).
- **SC-005**: Finalize operation ordering matches the settlement contract: storage upload completes before the settlement state database transaction begins (verified by code review or integration instrumentation).
- **SC-006**: ≥80% line/branch coverage achieved across backend and frontend code for this feature (CI-enforced; Constitution III).

## Assumptions

- The settlement freeze pipeline (spec 004) is implemented and operational, including finalize endpoint, PDF rendering, archive storage abstraction, and immutability guardrails.
- The persistence-layer immutability guard (spec 041) is active; finalize from `PRE_SHOW` to `SETTLED` is a sanctioned transition and must remain unblocked.
- WORM retention on finalized settlement PDFs prevents deletion once promoted to the immutable archive; orphan prevention therefore uses a staging-or-promote-on-commit pattern or equivalent approach that avoids writing to the retention-locked path until settlement state commit succeeds.
- This feature is a hardening gap fix for SPLR-38; it does not change user-facing finalize UI, signature capture, signed-URL retrieval, settlement reversal, or reconciliation workflows.
- Frontend changes are not expected; coverage contribution is primarily backend integration and unit tests. Frontend coverage gate still applies per Constitution III for any touched frontend files.
