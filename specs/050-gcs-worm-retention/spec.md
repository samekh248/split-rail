# Feature Specification: GCS WORM Retention on Settlement PDFs

**Feature Branch**: `050-gcs-worm-retention`

**Created**: 2026-06-21

**Status**: Draft

**Input**: Linear [SPLR-43](https://linear.app/audiodex/issue/SPLR-43/enforce-and-verify-gcs-worm-retention-on-settlement-pdfs) — Enforce and verify GCS WORM retention on settlement PDFs. The finalize upload does not set object retention metadata; WORM/immutability is merely assumed at the bucket level and is not verifiable from code or tests. PRD §5.1/§6 and TDD §7 require legally tamper-proof (Write-Once-Read-Many) settlement archives with an Object Retention Policy.

**Depends on**: Night-of settlement freeze pipeline (SPLR-19 / specs 004), atomic settle pipeline (SPLR-38 / specs 043)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Settlement PDFs are storage-layer immutable for the retention period (Priority: P1)

As a venue operator or auditor reviewing a finalized show settlement, I need every archived settlement PDF to be protected by a durable, tamper-proof retention lock at the storage layer so that no one — including platform operators — can overwrite or delete the legal record before the mandated retention period expires.

**Why this priority**: Settlement PDFs are the legally defensible source of truth for show financials. If immutability depends only on application discipline or bucket configuration assumptions, a storage-layer gap could allow silent tampering or accidental deletion, undermining audit defensibility required by PRD §5.1/§6 and TDD §7.

**Independent Test**: Finalize a settlement and confirm the archived PDF object carries an active retention lock matching the configured retention period; attempt to overwrite or delete the object and confirm the storage service rejects both operations for the duration of the lock.

**Acceptance Scenarios**:

1. **Given** a successful settlement finalization, **When** the settlement PDF is promoted to the immutable archive, **Then** the stored object is protected by a retention lock that prevents overwrite and deletion for at least the configured retention period (7 years per specs 004).
2. **Given** an archived settlement PDF under an active retention lock, **When** any actor attempts to overwrite the object with new content at the same path, **Then** the storage service rejects the operation and the original artifact bytes remain unchanged.
3. **Given** an archived settlement PDF under an active retention lock, **When** any actor attempts to delete the object, **Then** the storage service rejects the operation and the object remains retrievable.
4. **Given** the settlement archive storage is provisioned for production, **When** infrastructure review occurs, **Then** the archive bucket enforces a strict Object Retention / Bucket Lock policy aligned with the 7-year retention requirement, and staging storage used for in-flight uploads remains outside that lock (deletable for orphan cleanup per specs 043).

---

### User Story 2 - Application upload behavior respects immutability contracts (Priority: P1)

As a platform operator responsible for settlement integrity, I need the settlement upload path to apply retention on every finalized archive write and to refuse writes to object paths that already hold a finalized settlement PDF, so that application behavior matches the legal immutability contract rather than relying on bucket defaults alone.

**Why this priority**: Bucket-level policy alone is insufficient if uploads omit per-object retention metadata or silently overwrite existing keys. Application-enforced retention and overwrite prevention closes the gap identified in SPLR-43 and makes immutability observable in code and tests.

**Independent Test**: Trace the promote-to-archive step during finalize and confirm retention metadata is applied on every final archive write; attempt to promote or upload to an existing finalized object path and confirm the operation is rejected before any storage mutation occurs.

**Acceptance Scenarios**:

1. **Given** a settlement PDF is being promoted from staging to the final archive path, **When** the promotion completes, **Then** the archived object inherits the configured retention lock (not merely bucket-default assumptions).
2. **Given** a finalized settlement PDF already exists at an archive object path, **When** any upload or promotion targets that same path, **Then** the operation is rejected with an explicit error and no bytes are replaced.
3. **Given** a settlement finalization fails before the database commit succeeds, **When** cleanup runs, **Then** only staging (non-retention-locked) objects are removed; no retention-locked archive object is created for a non-settled event (preserves atomicity from specs 043).
4. **Given** a super-admin reverses a settlement and a new settlement is finalized, **When** re-finalization completes, **Then** a new archive object is created at a distinct path; the original retention-locked PDF remains intact and non-overwritable.

---

### User Story 3 - Automated verification proves storage immutability (Priority: P2)

As an engineering team maintaining settlement compliance, I need automated checks that prove archived settlement PDFs cannot be overwritten or deleted within the retention window, so regressions in retention enforcement are caught before release rather than discovered during an audit.

**Why this priority**: SPLR-43 explicitly requires a test/verification that settled PDF objects reject overwrite and delete. Without automated proof, WORM compliance remains an untested assumption.

**Independent Test**: Run the settlement archive immutability test suite; confirm tests finalize (or seed) an archived PDF, assert retention metadata is present, and verify overwrite and delete attempts are rejected.

**Acceptance Scenarios**:

1. **Given** an archived settlement PDF under test, **When** an automated overwrite attempt is executed against the same object path, **Then** the test asserts the operation fails and the stored content hash is unchanged.
2. **Given** an archived settlement PDF under test, **When** an automated delete attempt is executed, **Then** the test asserts the operation fails and the object remains present.
3. **Given** the immutability test suite runs in continuous integration, **When** retention enforcement is accidentally removed or bypassed, **Then** the suite fails and blocks merge.

---

### Edge Cases

- **Staging vs archive buckets**: Staging objects used during in-flight finalize must remain deletable for orphan cleanup; only promoted final archive objects receive the retention lock.
- **Promote-after-commit failure**: If promotion to the retention-locked archive fails after database commit, compensating behavior from specs 043 applies; retention must not be applied to staging objects that are later deleted on rollback.
- **Concurrent finalize race**: First-wins semantics unchanged; the losing request must not create a second retention-locked object or overwrite the winner's path.
- **Re-finalize after reversal**: New PDF at a new path; original retention-locked artifact preserved indefinitely within its lock window.
- **Retention period alignment**: Archive retention period matches the 7-year requirement established in specs 004 (US financial/tax record retention); infrastructure and application configuration must agree on the same duration.
- **Configuration mismatch**: If archive storage is misconfigured (missing bucket lock or retention policy), production startup or health verification must surface the misconfiguration rather than silently accepting uploads without provable immutability.
- **Sensitive logging**: Storage credentials, signed URL payloads, and PDF content must not appear in logs during retention verification failures.

## Requirements *(mandatory)*

### Functional Requirements

#### Storage-Layer Retention & Immutability

- **FR-001**: System MUST store finalized settlement PDFs in archive storage configured with a strict Object Retention / Bucket Lock policy enforcing a minimum retention period of 7 years, during which objects cannot be overwritten or deleted.
- **FR-002**: System MUST apply per-object retention metadata on every write that promotes a settlement PDF to the final archive path, ensuring the retention lock is active on the stored object itself (not assumed solely from bucket defaults).
- **FR-003**: System MUST reject any attempt to upload or promote a settlement PDF to an archive object path that already contains a finalized settlement PDF.
- **FR-004**: System MUST keep staging storage (used for in-flight finalize uploads) outside the retention lock so staged objects remain deletable for orphan cleanup per the atomic settle pipeline (specs 043).

#### Verification & Observability

- **FR-005**: System MUST include automated tests that prove an archived settlement PDF cannot be overwritten or deleted while its retention lock is active.
- **FR-006**: System MUST include automated tests that assert retention metadata is present on finalized archive objects after successful promotion.
- **FR-007**: System MUST detect or fail fast when archive storage is misconfigured for retention (e.g., missing bucket lock or retention policy in production), rather than accepting uploads that cannot be proven immutable.

#### Settlement Pipeline Integration

- **FR-008**: System MUST preserve existing atomic finalize behavior: retention-locked archive objects are created only after successful settlement state commit; failed finalizes must not leave retention-locked orphans (specs 043).
- **FR-009**: System MUST preserve re-finalize-after-reversal behavior: each new finalization produces a new archive object at a distinct path; prior retention-locked PDFs remain untouched.
- **FR-010**: System MUST wrap retention and archive storage failures in granular domain exceptions — no empty catch blocks and no generic base exceptions in financial processing paths.

#### Authorization, Logging & Quality

- **FR-011**: System MUST NOT log storage credentials, raw PDF bytes, or signed URL secrets during retention verification or upload failures.
- **FR-012**: System MUST achieve ≥80% line/branch coverage across backend and frontend for this feature (CI-enforced; Constitution III). Frontend coverage is N/A unless frontend files are touched; backend coverage is mandatory for all changed archive and settlement paths.

### Key Entities *(include if feature involves data)*

- **Settlement PDF Archive Object**: The finalized, retention-locked PDF stored at the permanent archive path referenced by `events.settlement_pdf_url`; legally defensible, non-overwritable for the retention period.
- **Settlement PDF Staging Object**: A temporary, deletable PDF written during finalize before database commit; promoted to the archive object on success or deleted on rollback.
- **Archive Retention Policy**: The storage-layer configuration (bucket lock + object retention) defining the minimum non-deletable period (7 years) for finalized settlement PDFs.
- **Settlement Archive Storage Configuration**: Operator-facing settings binding the application to the archive bucket, staging bucket, retention duration, and signed-URL TTL.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of successful settlement finalizations produce an archive object with an active retention lock matching the configured 7-year retention period (proven by automated tests).
- **SC-002**: 100% of automated overwrite attempts against a retention-locked settlement PDF are rejected by storage, with the original object content unchanged (proven by immutability tests).
- **SC-003**: 100% of automated delete attempts against a retention-locked settlement PDF are rejected by storage, with the object remaining present (proven by immutability tests).
- **SC-004**: 100% of upload or promotion attempts targeting an existing finalized archive object path are rejected by the application before any byte replacement occurs (proven by tests).
- **SC-005**: 0 retention-locked archive objects exist for events that did not successfully commit to a settled state (atomicity preserved; proven by existing and extended finalize failure tests).
- **SC-006**: After settlement reversal and re-finalization, 100% of test runs confirm the original retention-locked PDF remains intact and a distinct new PDF is created at a new path.
- **SC-007**: Production misconfiguration of archive retention policy is detected before or at startup, preventing silent operation without provable immutability.
- **SC-008**: ≥80% line/branch coverage achieved across backend code touched by this feature (CI-enforced; Constitution III).

## Assumptions

- The settlement freeze pipeline (specs 004) and atomic settle pipeline (specs 043) are complete, providing staging/promote archive flow, `ISettlementArchiveStore`, and finalize atomicity guarantees.
- The 7-year retention period established in specs 004 remains the canonical requirement; infrastructure documentation referencing a shorter period will be reconciled during implementation planning.
- Production archive storage (`split-rail-settlements-prod` or equivalent) will be provisioned or updated with Object Retention / Bucket Lock policy as part of this milestone, coordinated with the infrastructure team.
- Staging storage remains a separate, deletable bucket without retention locks, consistent with specs 043 research decisions.
- Automated immutability tests may use a test-double archive store that simulates retention semantics in CI, supplemented by optional integration tests against a real retention-enabled bucket in a non-production environment.
- Native mobile signature apps, settlement PDF rendering changes, and QBO reconciliation scope are out of scope for this feature.
- Frontend changes are not expected unless signed-URL or error-display behavior requires adjustment; primary scope is backend archive storage and verification.
