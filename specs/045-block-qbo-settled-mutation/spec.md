# Feature Specification: Block QuickBooks Sync from Mutating Frozen Settlement Data

**Feature Branch**: `045-block-qbo-settled-mutation`

**Created**: 2026-06-20

**Status**: Draft

**Input**: Linear [SPLR-33](https://linear.app/audiodex/issue/SPLR-33/block-qbo-sync-from-mutating-financials-on-settledreconciled-events) — Block QBO sync from mutating financials on SETTLED/RECONCILED events

**Linear Issue**: [SPLR-33](https://linear.app/audiodex/issue/SPLR-33/block-qbo-sync-from-mutating-financials-on-settledreconciled-events)

**Depends on**: QuickBooks Online pull cache & mapping (SPLR-18 / specs 003), night-of settlement freeze pipeline (SPLR-19 / specs 004), frozen-mutation audit logging (SPLR-36 / specs 039), persistence-layer immutability guard (SPLR-35 / specs 041)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Settlement snapshot fields remain immutable during QuickBooks sync on settled events (Priority: P1)

As a compliance stakeholder, I need the QuickBooks synchronization process to validate event lifecycle state before writing any financial data, so that settlement snapshot values captured at finalize time cannot be altered by background sync operations on events that have been frozen.

**Why this priority**: The sync recompute path currently rewrites financial line item values without checking whether the event is frozen. This bypasses audit immutability guarantees and allows the live ledger to drift from the archived settlement document — a critical compliance failure.

**Independent Test**: Finalize an event through the complete settlement workflow, trigger a QuickBooks sync targeting that event, and confirm all settlement snapshot fields on every financial line item remain byte-identical while the sync completes or is rejected with an explicit error.

**Acceptance Scenarios**:

1. **Given** an event in `SETTLED` state with a stored archived settlement document, **When** a QuickBooks sync runs and attempts to recompute financial line item values for that event, **Then** all settlement snapshot fields (proforma values, night-of actuals, calculated payout fields, and any other values captured in the settlement freeze) remain unchanged.
2. **Given** an event in `SETTLED` state, **When** a sync recompute would alter any field other than the constitutionally sanctioned QuickBooks actuals column, **Then** the write is rejected with an explicit error, the attempt is logged, and no partial mutation persists.
3. **Given** an event in `PRE_SHOW` or other non-frozen state, **When** a QuickBooks sync runs, **Then** sync-driven financial updates proceed normally without the frozen-state guard blocking them.

---

### User Story 2 - Reconciled events accept only sanctioned QuickBooks actuals updates (Priority: P1)

As a finance operator reconciling post-settlement QuickBooks data, I need sync operations on `RECONCILED` events to update only the QuickBooks actuals column and derived variance indicators, so that real-world bank actuals populate without touching the immutable settlement snapshot that backs the signed PDF.

**Why this priority**: Reconciliation is the lifecycle stage where QuickBooks actuals are intended to populate. The guard must permit this sanctioned update while rejecting any attempt to mutate settlement snapshot fields — a narrower allowance than a blanket block.

**Independent Test**: Transition a finalized event to `RECONCILED` through the sanctioned reconciliation workflow, trigger a QuickBooks sync with new transaction data, and confirm only QuickBooks actuals values change while settlement snapshot fields and the archived settlement document remain unchanged.

**Acceptance Scenarios**:

1. **Given** an event in `RECONCILED` state reached through finalize plus sanctioned reconciliation, **When** a QuickBooks sync ingests new mapped transactions and recomputes actuals, **Then** only the QuickBooks actuals values on financial line items are updated and all settlement snapshot fields remain unchanged.
2. **Given** an event in `RECONCILED` state, **When** a sync operation attempts to modify any settlement snapshot field (proforma, night-of actuals, calculated payout, artist configuration, or event metadata), **Then** the mutation is rejected with an explicit error and logged as a frozen-state violation.
3. **Given** an event in `RECONCILED` state with an archived settlement document, **When** sanctioned actuals updates occur through sync, **Then** the archived settlement document bytes remain identical to the post-finalize fingerprint.

---

### User Story 3 - Rejected sync mutations are auditable (Priority: P2)

As an audit reviewer, I need every rejected QuickBooks sync mutation on frozen events to produce a structured audit record identifying the event, operation, and attempted field class, so that immutability bypass attempts are traceable without silent failure.

**Why this priority**: Explicit logging closes the observability gap identified in the immutability audit milestone. Operators and compliance reviewers must be able to distinguish successful sanctioned actuals updates from blocked violations.

**Independent Test**: Attempt sync-driven mutations on `SETTLED` and `RECONCILED` events that should be rejected, and confirm each attempt emits a structured immutability audit entry with event identifier, lifecycle state, and operation classification.

**Acceptance Scenarios**:

1. **Given** a sync recompute on a `SETTLED` event that would alter financial data, **When** the guard rejects the operation, **Then** a structured immutability audit entry is recorded identifying the event, status `SETTLED`, and the sync recompute operation class.
2. **Given** a sync on a `RECONCILED` event that attempts to alter a non-sanctioned field, **When** the guard rejects the operation, **Then** a structured immutability audit entry is recorded identifying the event, status `RECONCILED`, and the rejected field class.
3. **Given** a sanctioned actuals-only update on a `RECONCILED` event, **When** the sync completes successfully, **Then** no immutability violation audit entry is emitted for that update.

---

### Edge Cases

- **Sync batch spanning mixed states**: A venue-level sync targeting multiple events must apply frozen-state rules independently per event — a frozen event must not block sync for non-frozen events in the same batch.
- **Zero-transaction sync on frozen event**: A sync that finds no new QuickBooks transactions must not mutate any financial fields on frozen events.
- **Concurrent sync and read**: A sync recompute running concurrently with authorized read operations must not alter archived settlement artifacts.
- **Repeated sync on reconciled event**: Multiple successive syncs on a `RECONCILED` event may update QuickBooks actuals values but must never alter settlement snapshot fields or the archived document.
- **Partial line-item set**: If only some line items receive new QuickBooks transactions, recomputation must still enforce field-level rules on every line item touched — sanctioned fields only on `RECONCILED`, no writes on `SETTLED`.
- **Sanctioned exception boundary**: QuickBooks actuals aggregation on `RECONCILED` events remains permitted; all other financial mutation paths on frozen events remain blocked, consistent with existing immutability contracts in specs 004 and 039.

## Requirements *(mandatory)*

### Functional Requirements

#### State Validation on Sync Write Path

- **FR-001**: The QuickBooks sync recompute write path MUST validate the target event's lifecycle state before persisting any change to `events`, `event_artists`, or `financial_line_items` records.
- **FR-002**: When the target event is in `SETTLED` state, the sync recompute path MUST reject all financial line item mutations with an explicit, unswallowed error — no QuickBooks actuals or other field updates may persist.
- **FR-003**: When the target event is in `RECONCILED` state, the sync recompute path MUST permit updates only to the QuickBooks actuals column on financial line items; all settlement snapshot fields MUST remain unchanged.
- **FR-004**: The system MUST maintain an explicit, documented inventory of settlement snapshot fields (values captured at finalize and embedded in the archived settlement document) versus sanctioned post-reconciliation fields (QuickBooks actuals and derived variance indicators only).

#### Immutability and Audit Integrity

- **FR-005**: Sync operations MUST NOT alter the archived settlement document or cause it to be regenerated on frozen events.
- **FR-006**: Rejected sync mutations on frozen events MUST emit a structured immutability audit entry identifying event identifier, lifecycle state, and operation class, consistent with the frozen-mutation audit contract in specs 039.
- **FR-007**: Rejected sync mutations MUST surface an explicit client-visible error (HTTP 400 equivalent) when invoked through an API-triggered sync path.

#### Verification

- **FR-008**: Automated verification MUST prove that syncing a `SETTLED` event does not change settlement snapshot fields and logs any rejected mutation attempt.
- **FR-009**: Automated verification MUST prove that syncing a `RECONCILED` event updates only QuickBooks actuals values, leaves settlement snapshot fields unchanged, and logs rejected attempts to alter non-sanctioned fields.
- **FR-010**: System MUST achieve ≥80% line/branch coverage across backend and frontend for this feature (CI-enforced; Constitution III).

### Key Entities

- **Event (lifecycle state)**: A show record progressing through lifecycle states including `SETTLED` (settlement frozen, archived document stored) and `RECONCILED` (QuickBooks reconciliation complete). State determines which sync-driven field updates are permitted.
- **Financial Line Item**: A ledger row belonging to an event, carrying settlement snapshot values (proforma, night-of actuals, calculated payout) frozen at finalize, plus the QuickBooks actuals column populated during reconciliation.
- **Settlement Snapshot Field**: Any financial line item value captured in the settlement freeze and embedded in the archived settlement document; must never change after finalize regardless of sync activity.
- **Sanctioned Reconciliation Field**: The QuickBooks actuals value (and derived variance computed from it) — the only financial line item fields that may be updated by sync on `RECONCILED` events.
- **QuickBooks Sync Operation**: A read-only ingestion and recompute workflow that maps external transactions to ledger rows and aggregates amounts into line item actuals columns.
- **Immutability Audit Entry**: A structured log record emitted when a frozen-state mutation is rejected, capturing event context and operation classification for compliance review.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of automated verification cases confirm that settlement snapshot fields on `SETTLED` events remain unchanged after QuickBooks sync operations (zero field drift across all tested line items).
- **SC-002**: 100% of automated verification cases confirm that only QuickBooks actuals values change on `RECONCILED` events after sync, with settlement snapshot fields and archived settlement document bytes remaining identical.
- **SC-003**: 100% of rejected sync mutation attempts on frozen events produce a structured immutability audit entry within the same request lifecycle.
- **SC-004**: Zero production incidents of settlement PDF snapshot drift caused by QuickBooks sync recompute after this feature ships (measured over first 90 days post-release via immutability audit log review).
- **SC-005**: ≥80% line/branch coverage achieved across backend and frontend code for this feature (CI-enforced; Constitution III).

## Assumptions

- Event lifecycle states `SETTLED` and `RECONCILED` are already defined and enforced elsewhere (specs 004, 033); this feature adds the missing guard specifically on the QuickBooks sync recompute write path.
- QuickBooks actuals population is intended only during the `RECONCILED` lifecycle stage; `SETTLED` events have not yet entered reconciliation and therefore receive no sync-driven financial writes.
- Settlement snapshot fields correspond to all financial line item values captured at finalize time (proforma, night-of actuals, calculated payout, and related settlement math outputs) — not the QuickBooks actuals column.
- The existing frozen-mutation audit logging infrastructure (specs 039) will be reused for rejected sync attempts; no new audit schema is required unless the operation classification taxonomy needs extension.
- Frontend changes are limited to error surfacing if sync is triggered via UI on frozen events; the primary fix is backend write-path validation.
- Venue-level bulk sync operations iterate per event and inherit per-event state rules automatically.
- This feature does not change the read-only nature of the QuickBooks Online integration (Constitution IV); it governs only which local ledger fields may be updated after sync ingestion.
