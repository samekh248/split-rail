# Feature Specification: Close Immutability Verification Gaps After Full Settlement

**Feature Branch**: `044-immutability-settle-coverage`

**Created**: 2026-06-20

**Status**: Draft

**Input**: User description: "Close immutability xUnit coverage gaps after full settle — Linear [SPLR-39](https://linear.app/audiodex/issue/SPLR-39/close-immutability-xunit-coverage-gaps-after-full-settle)"

**Linear Issue**: [SPLR-39](https://linear.app/audiodex/issue/SPLR-39/close-immutability-xunit-coverage-gaps-after-full-settle)

**Depends on**: Night-of settlement freeze pipeline (SPLR-19 / specs 004), frozen-mutation audit logging (SPLR-36 / specs 039), persistence-layer immutability guard (SPLR-35 / specs 041), atomic settlement finalize pipeline (SPLR-38 / specs 043)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Compliance proof that post-settlement mutations fail after the real finalize pipeline (Priority: P1)

As a compliance stakeholder responsible for settlement record integrity, I need automated verification to exercise every standard mutation path against an event that reached `SETTLED` through the complete settlement finalization workflow—not a shortcut that only sets status—so we can prove immutability holds under the same lifecycle path production uses.

**Why this priority**: Existing verification covers some mutation rejections but seeds frozen state through direct status assignment. That leaves a gap between what is tested and what operators experience after a real night-of settlement. SPLR-19 §8.1 explicitly calls out this audit gap.

**Independent Test**: Finalize a settlement-ready event through the full workflow, attempt each mutation class (event metadata, line items, artists), and confirm every attempt is rejected with an explicit client error, a structured immutability audit entry is recorded, and no underlying financial data changes.

**Acceptance Scenarios**:

1. **Given** an event finalized to `SETTLED` through the complete settlement workflow with a stored archived settlement document, **When** an authorized user attempts to delete a financial line item, **Then** the request is rejected with an explicit error, an immutability audit entry is logged, and the line item remains unchanged.
2. **Given** a `SETTLED` event produced by the full finalize workflow, **When** an authorized user attempts to update an artist record on that event, **Then** the request is rejected with an explicit error, an immutability audit entry is logged, and artist configuration remains unchanged.
3. **Given** a `SETTLED` event produced by the full finalize workflow, **When** an authorized user attempts to delete an artist record on that event, **Then** the request is rejected with an explicit error, an immutability audit entry is logged, and the artist record remains present.
4. **Given** a `SETTLED` event produced by the full finalize workflow, **When** an authorized user attempts to create or update line items, update event metadata, create or delete artists, delete the event, or re-lock the budget, **Then** each attempt is rejected with an explicit error and a distinct immutability audit entry identifying the operation class.

---

### User Story 2 - Archived settlement document remains byte-identical after blocked mutations (Priority: P1)

As a legal and audit stakeholder, I need verification to confirm that rejected post-settlement mutation attempts never alter the archived settlement document stored at finalize time, so the signed snapshot remains the authoritative record even when tampering is attempted.

**Why this priority**: Immutability is not complete unless the archived settlement artifact is proven stable. Rejection alone does not guarantee the snapshot was not regenerated or overwritten.

**Independent Test**: Capture the archived settlement document bytes immediately after successful finalize, attempt each blocked mutation path, and confirm the stored document bytes are identical after every attempt.

**Acceptance Scenarios**:

1. **Given** a successfully finalized event with a captured archived settlement document fingerprint, **When** any blocked mutation from User Story 1 is attempted and rejected, **Then** the archived settlement document bytes are unchanged from the post-finalize fingerprint.
2. **Given** multiple sequential blocked mutation attempts on the same finalized event, **When** each attempt is rejected, **Then** the archived settlement document bytes remain identical to the original post-finalize fingerprint after the full sequence.
3. **Given** a blocked mutation that would change settlement totals if it succeeded, **When** the attempt is rejected, **Then** no new settlement document is stored and the original archived document remains the sole artifact for that finalize.

---

### User Story 3 - Reconciled-state immutability proven through the real settlement and reconciliation lifecycle (Priority: P2)

As an operations stakeholder managing post-settlement QuickBooks reconciliation, I need verification to prove that events reaching `RECONCILED` through the sanctioned settlement-then-reconciliation workflow—not helper-assigned status—reject the same mutation classes as `SETTLED` events, so reconciliation does not weaken immutability guarantees.

**Why this priority**: Reconciliation is a distinct production lifecycle step. Testing `RECONCILED` only via direct status assignment does not prove guards behave correctly after the real reconcile transition on a fully finalized event.

**Independent Test**: Finalize an event through the complete workflow, transition it to `RECONCILED` through the sanctioned reconciliation operation, then repeat representative mutation attempts and confirm rejection plus audit logging for both line-item and artist mutation classes.

**Acceptance Scenarios**:

1. **Given** an event finalized to `SETTLED` and then transitioned to `RECONCILED` through the sanctioned reconciliation workflow, **When** an authorized user attempts to update or delete a financial line item, **Then** the request is rejected with an explicit error and an immutability audit entry records event status `RECONCILED`.
2. **Given** an event in `RECONCILED` reached through finalize plus sanctioned reconciliation, **When** an authorized user attempts to update or delete an artist record, **Then** the request is rejected with an explicit error and an immutability audit entry records event status `RECONCILED`.
3. **Given** a `RECONCILED` event from the real lifecycle path, **When** blocked mutations are attempted, **Then** the archived settlement document bytes remain identical to the post-finalize fingerprint.

---

### User Story 4 - QuickBooks sync and recalculate operations are blocked on frozen events (Priority: P2)

As a finance operator, I need verification to confirm that bulk QuickBooks synchronization and settlement recalculation operations cannot mutate frozen events, so integration and recalculation paths respect the same immutability contract as direct ledger edits.

**Why this priority**: SPLR-39 identifies QBO sync and recalculate as uncovered mutation paths on settled events. These operations can touch financial line items indirectly and must be proven blocked (except constitutionally sanctioned actuals-only updates, which remain out of scope for rejection testing here).

**Independent Test**: On an event finalized through the complete workflow, trigger QuickBooks sync and settlement recalculate operations and confirm each is rejected with an explicit error and immutability audit logging without altering the archived settlement document.

**Acceptance Scenarios**:

1. **Given** a `SETTLED` event produced by the full finalize workflow, **When** a QuickBooks sync operation targeting that event's financial data is triggered, **Then** the operation is rejected with an explicit error, an immutability audit entry is logged, and the archived settlement document bytes are unchanged.
2. **Given** a `SETTLED` event produced by the full finalize workflow, **When** a settlement recalculate operation is triggered for that event, **Then** the operation is rejected with an explicit error, an immutability audit entry is logged, and the archived settlement document bytes are unchanged.
3. **Given** a `RECONCILED` event from the real finalize-plus-reconcile lifecycle, **When** QuickBooks sync or recalculate is attempted, **Then** the operation is rejected with an explicit error and audit logging, and the archived settlement document remains byte-stable.

---

### Edge Cases

- **Partial mutation sequences**: Multiple rejected attempts in succession must not accumulate partial state changes or alter the archived document.
- **Concurrent mutation after finalize**: A rejected mutation concurrent with a sanctioned read operation must not affect stored settlement artifacts.
- **Re-finalize prohibition**: Attempting to finalize an already-settled event must remain rejected without producing a second archived document (existing behavior preserved).
- **Sanctioned exceptions unchanged**: QuickBooks actuals-only updates permitted by constitution on frozen events remain allowed and must not be conflated with blocked sync/recalculate paths under test.
- **Document generation unavailable**: Verification that requires an archived settlement document may defer in environments where document generation is unsupported, consistent with existing settlement verification conventions; the full scenario suite must still run in primary release verification environments.

## Requirements *(mandatory)*

### Functional Requirements

#### Verification Completeness (Real Settlement Lifecycle)

- **FR-001**: Automated verification MUST seed frozen events exclusively through the complete settlement finalization workflow (budget lock, settlement values, signature capture, finalize) for all immutability rejection tests added by this feature—not through direct status assignment shortcuts.
- **FR-002**: Automated verification MUST prove rejection of delete-line-item, update-artist, and delete-artist mutation paths on `SETTLED` events reached via the full finalize workflow, asserting explicit client error, immutability audit log emission, and unchanged underlying records.
- **FR-003**: Automated verification MUST prove rejection of all standard mutation classes on frozen events (event metadata update, event delete, line-item create/update/delete, artist create/update/delete, budget re-lock) when the event reached `SETTLED` via the full finalize workflow, matching the mutation inventory established in specs 004 and 039.
- **FR-004**: Automated verification MUST prove `RECONCILED`-state immutability using the sanctioned reconciliation workflow applied to an event that was first finalized through the complete settlement workflow—not via direct status assignment.
- **FR-005**: Automated verification MUST prove QuickBooks sync and settlement recalculate operations are rejected on frozen events (`SETTLED` and `RECONCILED`) reached through real lifecycle paths, with explicit error and immutability audit logging.

#### Archived Document Stability

- **FR-006**: For every blocked mutation test on a finalized event, automated verification MUST capture the archived settlement document fingerprint immediately after successful finalize and assert byte-identical equality after the rejected mutation attempt.
- **FR-007**: Automated verification MUST confirm no additional settlement document artifacts are created as a side effect of rejected mutation attempts on an already-finalized event.

#### Audit and Error Contract

- **FR-008**: Each new blocked-mutation verification MUST assert an immutability audit log entry containing event id, venue id, acting user id (when available), event lifecycle status, and operation class—consistent with specs 039 format.
- **FR-009**: Rejected mutation responses MUST remain explicit client errors (not generic server failures), preserving the user-facing immutability contract from specs 004.

#### Quality Gate

- **FR-010**: This feature MUST achieve ≥80% line/branch coverage across backend and frontend for code touched by this effort (CI-enforced; Constitution III). Primary scope is backend settlement immutability verification; no new frontend surface is expected.

### Key Entities

- **Finalized Event**: A show that completed the settlement finalization workflow with populated settlement metadata and a linked archived settlement document.
- **Reconciled Event**: A finalized event that completed the sanctioned reconciliation transition; immutability rules match or exceed `SETTLED` constraints for tested mutation paths.
- **Archived Settlement Document**: The immutable settlement snapshot stored at finalize time; byte stability is the legal-audit anchor for immutability proof.
- **Immutability Audit Entry**: Structured log record emitted when a frozen-event mutation is rejected, identifying event, venue, user, status, and operation class.
- **Blocked Mutation Path**: A standard API or workflow operation that modifies event metadata, artists, line items, budget lock state, QuickBooks sync scope, or settlement recalculation on a frozen event.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of identified gap mutation paths from SPLR-39 (delete line item, update artist, delete artist, QuickBooks sync, recalculate) have automated verification using events seeded through the full finalize workflow, each asserting explicit rejection.
- **SC-002**: 100% of immutability verification scenarios added by this feature assert archived settlement document byte-identical equality before and after each blocked mutation attempt.
- **SC-003**: 100% of new `RECONCILED`-state immutability scenarios use finalize-then-reconcile lifecycle seeding (zero reliance on direct status assignment for those scenarios).
- **SC-004**: 100% of new blocked-mutation verifications emit an immutability audit log entry with required contextual fields (event id, venue id, user id when available, event status, operation class).
- **SC-005**: Zero regression in existing settlement finalize, atomicity, audit-logging, and persistence-guard verification suites when this coverage is added.
- **SC-006**: ≥80% line/branch coverage achieved across backend and frontend code for this feature scope (CI-enforced; Constitution III).

## Assumptions

- Settlement immutability guards, audit logging, persistence-layer defense, and atomic finalize behavior are already implemented (specs 004, 039, 041, 043); this feature closes verification gaps only and does not introduce new guard logic unless a gap reveals a defect (defect fixes are in scope only when proven by failing verification).
- The mutation path inventory from specs 004 and 039 is the authoritative checklist; this feature extends lifecycle seeding and PDF stability assertions to paths already covered with helper-seeded state.
- QuickBooks sync and recalculate rejection tests target operations that attempt broader mutation than the constitutionally sanctioned actuals-only update; sanctioned actuals refresh behavior remains governed by specs 040 and 041 and is not redefined here.
- Frontend changes are out of scope; success criteria for frontend coverage apply only if incidental code is modified.
- Verification environments that cannot render settlement documents may skip document-dependent tests under the same conditional convention used by existing settlement integration tests, provided CI environments that support rendering execute the full suite.
