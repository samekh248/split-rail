# Feature Specification: Explicit Offset Entry Semantics for QBO Actuals Corrections

**Feature Branch**: `040-qbo-offset-entry-semantics`

**Created**: 2026-06-19

**Status**: Draft

**Input**: User description: "Implement explicit offset entry semantics for QBO actuals corrections — Linear [SPLR-37](https://linear.app/audiodex/issue/SPLR-37/implement-explicit-offset-entry-semantics-for-qbo-actuals-corrections)"

**Linear Issue**: [SPLR-37](https://linear.app/audiodex/issue/SPLR-37/implement-explicit-offset-entry-semantics-for-qbo-actuals-corrections)

**Depends on**: QBO pull cache and append-only sync ledger (SPLR-18 / specs 003), financial ledger grid and QBO actuals column (SPLR-17 / specs 002), platform constitution append-only QBO actuals mandate (Constitution IV)

## Clarifications

### Session 2026-06-19

- Q: Should offset corrections (and resulting actuals updates) apply on settled or reconciled events? → A: Yes — apply offset corrections on settled/reconciled events; only QBO actuals aggregate updates, proforma/settlement stay frozen
- Q: How should the system detect that a previously synced transaction was voided or removed upstream? → A: Compare fetch vs ledger — missing IDs get a one-time negating offset
- Q: What idempotency rule should prevent duplicate offset entries on re-sync? → A: Key by event + txn ID + correction type + target state (amount or absent)
- Q: How should the offset entry amount be calculated for amount-change corrections? → A: Net-to-target — offset amount = current upstream amount minus net sum of all ledger entries for that transaction ID
- Q: Should the event workspace surface any user-visible indication when actuals change due to offset corrections? → A: Correction badge — indicate line items whose actuals include offset corrections

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Bookkeeper correction in QuickBooks produces an explicit offset in actuals (Priority: P1)

As an external bookkeeper, when I correct a previously synced QuickBooks transaction (for example by changing its amount or voiding it and posting a replacement entry), the platform must reflect the correction without altering the historical sync record. The system records a new, clearly typed offset ledger entry that adjusts the line-item actual to match current QuickBooks truth while preserving the original ingested row for audit.

**Why this priority**: This is the core gap identified in SPLR-37. Without explicit offset semantics, corrections depend on implicit behavior (new upstream transaction IDs only) and do not satisfy the constitution's requirement that corrections happen exclusively through additional balancing entries.

**Independent Test**: Seed an event with a mapped QBO transaction already ingested into the sync ledger, simulate an upstream amount change on that same transaction identifier during the next sync, and confirm (1) the original ledger row is unchanged, (2) a new offset entry exists with a correction entry type, and (3) the line-item actual equals the corrected QuickBooks total.

**Acceptance Scenarios**:

1. **Given** a QBO transaction was previously synced to a mapped ledger line item, **When** a subsequent sync detects the same transaction identifier with a different amount upstream, **Then** the system inserts a new offset correction entry (net-to-target amount), leaves the original ledger row unchanged, and recomputes the line-item actual as the sum of all ledger entries including offsets.
2. **Given** a QBO transaction was previously synced, **When** a subsequent sync finds that transaction identifier absent from the current upstream fetch for the event, **Then** the system inserts a one-time offset entry that brings the net sum for that identifier to zero, leaves the original row unchanged, and the line-item actual reflects zero net effect from that transaction unless a replacement transaction is also ingested.
3. **Given** a correction offset entry is created, **When** an auditor reviews the sync ledger for an event, **Then** each entry is distinguishable as either an original ingestion or an offset correction, and offset entries reference the originating transaction they correct.

---

### User Story 2 - Accountant trusts actuals aggregate while history stays immutable (Priority: P1)

As an accounting manager reviewing variance on the financial grid, I need the QBO Actuals column to stay accurate after upstream corrections while every historical ingestion remains visible and unchanged, so I can explain discrepancies and prove no silent overwrites occurred.

**Why this priority**: The platform already recomputes actuals as a sum of ledger entries; this story ensures that sum semantics explicitly include typed offsets and that users can rely on immutability without losing accuracy.

**Independent Test**: Perform two syncs where the second sync introduces a correction scenario from User Story 1, then verify the displayed actual matches QuickBooks and that querying historical ledger entries shows both the original and offset rows with stable identifiers and timestamps.

**Acceptance Scenarios**:

1. **Given** one or more offset entries exist for a line item, **When** actuals are displayed on the event workspace, **Then** the displayed value equals the net sum of all original and offset ledger entries for that line item and a correction badge is visible on that line item.
2. **Given** a line item's actuals are derived only from original ingestion entries with no offset corrections, **When** the event workspace renders, **Then** no correction badge is shown for that line item.
3. **Given** multiple corrections occur on the same upstream transaction over time, **When** each sync runs, **Then** each correction adds another append-only offset entry (never mutates prior rows), the net actual reflects the cumulative correction, and the correction badge remains visible on affected line items.
4. **Given** an event in `SETTLED` or `RECONCILED` state, **When** a subsequent sync detects an upstream correction, **Then** offset entries are appended, the QBO actuals aggregate and correction badge update to reflect QuickBooks, and proforma and settlement values remain frozen per existing immutability rules.
5. **Given** an event in `PRE_SHOW` state, **When** offset entries are applied, **Then** only the read-only actuals aggregate and correction badge change; proforma and settlement editability follow existing lifecycle rules.

---

### User Story 3 - Engineering and compliance guard against ledger mutation (Priority: P2)

As a compliance stakeholder and engineering lead, I need automated verification that production code paths never update or delete sync ledger rows in place, so append-only integrity is enforced continuously rather than by convention alone.

**Why this priority**: SPLR-37 explicitly calls for a code-review and test guard. This converts the constitution's append-only rule into a measurable quality gate that prevents regression.

**Independent Test**: Run the feature's automated verification suite and confirm a dedicated test fails if any code path attempts to update or delete an existing sync ledger row during correction handling; confirm the test passes with offset-based correction behavior.

**Acceptance Scenarios**:

1. **Given** the correction workflow runs, **When** automated verification executes, **Then** a test proves that upstream changes produce new offset rows and do not issue update or delete operations against existing sync ledger rows.
2. **Given** a developer introduces a regression that mutates ledger history, **When** continuous integration runs, **Then** the append-only guard test fails before merge.
3. **Given** offset entries are written, **When** logs or audit views are inspected, **Then** correction events are attributable to a sync batch and reference the corrected upstream transaction without exposing sensitive credentials.

---

### Edge Cases

- **No net change after correction**: If upstream amount returns to a previously synced value, offset entries must still be append-only; net sum may return to the original total without deleting prior offset rows.
- **Duplicate sync concurrency**: Concurrent syncs for the same event must not create duplicate offset entries for the same detected correction; advisory locking or equivalent idempotency must apply.
- **Unmapped then mapped transactions**: Corrections for transactions that were initially unmapped and later mapped must follow the same offset semantics once promoted into the sync ledger.
- **Void/removal detection**: Each sync compares upstream fetch results against ledger transaction identifiers for the event; identifiers present in the ledger but absent from the fetch receive a one-time negating offset entry.
- **Replacement transactions**: When QuickBooks voids one transaction and adds a new one with a new identifier, the system ingests the new transaction as an original entry and applies a negating offset for the voided original—both remain in the ledger.
- **Settled/reconciled events**: Offset corrections and actuals aggregate updates are permitted on frozen events; only the QBO actuals column reflects corrections—proforma, settlement, and manual line-item edits remain blocked.
- **Cross-tenant isolation**: Offset entries and correction detection must respect organization and venue scoping; one tenant's sync must never read or write another tenant's ledger rows.
- **Zero-amount offsets**: Corrections that net to zero must still be representable without removing historical rows.
- **Large correction volume**: Events with many corrected transactions must complete sync within existing operational time expectations without manual intervention.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST treat every row in the QBO sync ledger as immutable after insert; no production correction path may update or delete existing ledger rows.
- **FR-002**: System MUST classify each sync ledger entry with an explicit entry type distinguishing original ingestions from offset corrections.
- **FR-003**: System MUST link each offset correction entry to the upstream transaction identifier (and, when applicable, the original ledger entry) it corrects.
- **FR-004**: When a subsequent sync detects an upstream change to a previously ingested transaction, the system MUST append offset correction entries rather than skip or overwrite the existing row. For amount changes, the offset amount MUST equal the current upstream amount minus the net sum of all ledger entries for that transaction identifier (target state zero when absent). For voids or removals detected by comparing the current upstream fetch to ledger transaction identifiers, the system MUST produce a one-time offset that brings the net sum for that identifier to zero.
- **FR-005**: System MUST compute each line item's QBO actual as the net sum of all sync ledger entries mapped to that line item, including original ingestions and offset corrections.
- **FR-006**: System MUST preserve the full chronological audit trail: original ingestion rows, all offset corrections, sync batch identity, and sync timestamp for each entry.
- **FR-007**: System MUST apply correction detection idempotently so repeated syncs do not duplicate offset entries for the same detected upstream change. An offset is considered already applied when an entry exists keyed by event, upstream transaction identifier, correction type (amount change or void/removal), and target state (the detected upstream amount, or absent for void/removal).
- **FR-008**: System MUST continue to treat QBO integration as read-only toward QuickBooks; corrections are derived from detected upstream changes, never from write-back into the customer's general ledger.
- **FR-009**: System MUST enforce tenant and venue isolation for all ledger reads and writes involved in correction handling.
- **FR-012**: System MUST apply offset corrections and update the QBO actuals aggregate on events in `SETTLED` and `RECONCILED` states; proforma and settlement values MUST remain frozen and MUST NOT be altered by correction handling.
- **FR-013**: System MUST display a correction badge on each financial grid line item whose QBO actuals aggregate includes one or more offset correction entries; line items with original ingestions only MUST NOT show the badge.
- **FR-010**: System MUST include automated verification that upstream changes yield offset entries and that no update or delete operations are performed against existing sync ledger rows during correction handling.
- **FR-011**: System MUST achieve ≥80% line/branch coverage across backend and frontend for this feature (CI-enforced; Constitution III).

### Key Entities

- **QBO Sync Ledger Entry**: An append-only record of one ingested or correcting amount tied to an event, upstream transaction identifier, optional mapped line item, entry type (original or offset correction), optional reference to the entry being corrected, sync batch, amount, transaction date, and sync timestamp.
- **Offset Correction Entry**: A typed sync ledger entry representing an explicit balancing adjustment when upstream QuickBooks data diverges from a previously ingested row; never replaces the original row. Idempotency is enforced by event, upstream transaction identifier, correction type, and target state.
- **Financial Line Item (consumed)**: The read-only QBO Actuals value derived as the net sum of all mapped sync ledger entries including offsets.
- **Sync Batch**: Groups all entries written during a single sync run, including offset corrections, for traceability.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In verification scenarios where an upstream transaction amount changes after initial sync, 100% of runs produce at least one new offset correction entry and zero in-place mutations to existing sync ledger rows.
- **SC-002**: After correction, the line-item QBO actual matches the current upstream QuickBooks net for that mapped account and event within the platform's standard currency precision rules.
- **SC-003**: Auditors can reconstruct the full correction history for any corrected transaction by querying sync ledger entries without gaps or missing original rows.
- **SC-004**: The append-only guard automated verification fails on intentional regression fixtures that attempt ledger row updates or deletes, and passes on the offset-based implementation.
- **SC-005**: Duplicate sync runs against an unchanged upstream correction state do not increase the offset entry count; idempotency is keyed by event, transaction identifier, correction type, and target state.
- **SC-007**: In user acceptance testing, 100% of line items with offset correction entries display a correction badge, and 100% of line items without offset corrections do not display the badge.
- **SC-006**: ≥80% line/branch coverage achieved across backend and frontend code for this feature (CI-enforced; Constitution III).

## Assumptions

- The existing QBO sync ledger table remains the canonical append-only store; this feature extends it with explicit entry typing and correction semantics rather than introducing a separate correction store.
- Upstream change detection compares newly fetched QuickBooks transaction data against previously ingested rows for the same event: amount changes are detected when a known identifier reappears with a different amount; voids and removals are detected when a known identifier is absent from the current fetch.
- Amount changes, voids, and removals are in scope for automatic offset generation; manual user-initiated actuals edits remain out of scope (actuals stay read-only per specs 002 and 003).
- Test seeding and development-only cleanup paths that remove ledger rows for fixture reset are excluded from production append-only guarantees.
- Frontend scope includes accurate post-correction actuals and a per-line-item correction badge when offset entries contribute to that line item's actuals; a full ledger audit drill-down UI remains out of scope (history is queryable via existing data access patterns).
- Existing sync locking and batch grouping behavior from the QBO pull feature continues to apply to offset writes.
- QBO actuals corrections are an explicit exception to settlement freeze for the read-only actuals aggregate only; all other `financial_line_items` fields on settled/reconciled events remain immutable.
