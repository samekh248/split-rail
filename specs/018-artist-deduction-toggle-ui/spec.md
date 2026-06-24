# Feature Specification: Artist Deduction Toggle on Expense Rows

**Feature Branch**: `018-artist-deduction-toggle-ui`

**Created**: 2026-06-17

**Status**: Draft

**Input**: User description: "is_artist_deduction toggle UI on expense rows" (Linear SPLR-29) — The backend correctly strips `is_artist_deduction` expenses from gross before computing splits, and the column exists on the entity, but venue managers need a way to flag which overhead is deducted before contract percentages. Provide a toggle on expense rows, persist the flag through the existing line-item update flow, and visually distinguish deduction rows in the ledger grid.

## Clarifications

### Session 2026-06-17

- Q: Which permission governs deduction-toggle editing during budget-locked settlement vs. unlocked planning? → A: Column-aware — toggle allowed when the user can edit the active value column (financials permission while budget is unlocked; settlement permission while budget is locked during Pre-Show).
- Q: How should flagged deduction rows be visually distinguished in the grid? → A: Both a persistent text badge/label (e.g. "Deduction") and distinct row styling; styling must not rely on color alone.
- Q: Is the artist-deduction flag when adding a new expense row in scope for SPLR-29? → A: Yes — both inline toggle on existing expense rows and an add-row deduction checkbox are in scope.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Flag an expense as an artist deduction (Priority: P1)

A venue general manager building or adjusting a show budget needs to mark specific overhead expenses (e.g. production, catering, marketing) as artist deductions so those amounts are subtracted from gross revenue before artist split percentages are applied. On an expense row in the ledger grid, they toggle the artist-deduction control, and the row is saved with the flag set. Total deductions, net show revenue, and artist payouts update to reflect the change.

**Why this priority**: Artist deductions are a core deal-math input. Without a way to configure which expenses count as deductions, managers cannot model real contracts accurately and payout calculations will be wrong even though the calculation engine supports the flag.

**Independent Test**: On an editable Pre-Show event, open the Expenses block, toggle the deduction flag on one expense row, and confirm total deductions increase, net revenue decreases, and artist payouts recalculate accordingly.

**Acceptance Scenarios**:

1. **Given** an editable expense row in Pre-Show, **When** the manager toggles the artist-deduction flag on, **Then** the flag is saved, the row is visually marked as a deduction, total deductions increase by that row's active monetary value, net show revenue decreases, and artist payouts recalculate.
2. **Given** an expense row flagged as an artist deduction, **When** the manager toggles the flag off, **Then** the flag is cleared, the visual deduction indicator is removed, total deductions decrease, net show revenue increases, and artist payouts recalculate.
3. **Given** a revenue row, **When** the grid renders, **Then** no artist-deduction toggle is shown (deductions apply to expenses only).
4. **Given** an editable Expenses block and a user adding a new expense row, **When** they submit the add-row form, **Then** they can optionally flag the new row as an artist deduction and the saved row appears with the badge/label and styling if flagged.
5. **Given** an expense row and a user who cannot edit the active value column for the current budget state, **When** the grid renders, **Then** the deduction toggle is not available and the row shows its current flag state read-only.

---

### User Story 2 - See which expenses are deductions at a glance (Priority: P2)

While reviewing or presenting a budget, a manager needs to quickly identify which expense rows are counted as artist deductions without opening each row's controls. Flagged rows are visually distinct in the grid so deduction configuration is obvious during planning and settlement review.

**Why this priority**: Visual clarity prevents misconfiguration and supports trust in deal math during settlement conversations. It complements the toggle (P1) but delivers standalone readability value even when the user is not actively editing.

**Independent Test**: Load a ledger with at least one flagged and one unflagged expense row; confirm flagged rows are visually distinguishable from unflagged expense rows without interacting with controls.

**Acceptance Scenarios**:

1. **Given** expense rows with mixed deduction flags, **When** the grid renders, **Then** rows flagged as artist deductions show a persistent "Deduction" badge/label and distinct row styling (not color-only) that differs from unflagged expense rows.
2. **Given** a flagged expense row, **When** the manager toggles the flag off and the save succeeds, **Then** the badge/label and distinct styling are removed immediately (or after the grid refreshes from the saved state).
3. **Given** a settled or reconciled event, **When** the grid renders, **Then** flagged expense rows retain the badge/label and distinct styling even though the toggle is not editable.

---

### User Story 3 - Deduction flag respects event lifecycle (Priority: P2)

A manager configuring deductions during planning or settlement must not be able to change deduction flags once the event is finalized. The toggle follows the same lifecycle rules as other structural line-item edits: available throughout Pre-Show (planning and budget-locked settlement phases) and blocked once the event is Settled or Reconciled.

**Why this priority**: Deduction flags affect deal math captured in settlement snapshots. Allowing changes after settlement would desynchronize the grid from finalized financial records.

**Independent Test**: On a Settled event, confirm deduction toggles are hidden or disabled on expense rows; on a Pre-Show event with budget locked, confirm toggles remain available for users with edit permission.

**Acceptance Scenarios**:

1. **Given** an event in Pre-Show with an unlocked budget, **When** a user with financials-edit permission views expense rows, **Then** the deduction toggle is available.
2. **Given** an event in Pre-Show with a locked budget (settlement phase), **When** a user with settlement-edit permission (and without financials-edit for the locked proforma column) views expense rows, **Then** the deduction toggle remains available.
3. **Given** an event in Settled or Reconciled status, **When** any user views expense rows, **Then** the deduction toggle is hidden or disabled and any server-side attempt to change the flag is rejected.
4. **Given** a user toggles a deduction flag during an editable phase, **When** the save fails (conflict, permission, or network error), **Then** the user sees a clear error and the displayed flag reverts to the last known saved state.

---

### Edge Cases

- **Zero-value expense row**: toggling the deduction flag on a row with zero active value updates totals without error (deduction contribution is zero until a value is entered).
- **Deductions exceed gross revenue**: net show revenue may go negative; artist payouts follow existing deal-math rules (standard deals floor at zero).
- **Concurrent edit**: if another user changed the same row's flag or deleted the row, a save based on a stale version is rejected with a conflict message prompting refresh.
- **Cross-tenant access**: a user cannot view or change deduction flags on events outside their organization.
- **Promoter-restricted rows**: if an expense row is hidden from promoters, deduction visibility and editability still follow the user's role and lifecycle state, not promoter visibility alone.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Users MUST be able to toggle an artist-deduction flag on individual expense rows when they can edit the active value column for the current budget state: financials-edit permission while the budget is unlocked, settlement-edit permission while the budget is locked during Pre-Show.
- **FR-002**: System MUST NOT expose the artist-deduction toggle on revenue rows, on rows in non-expense blocks, or in the add-row form for Revenue blocks.
- **FR-002a**: Users adding a new expense row MUST be able to optionally flag it as an artist deduction in the add-row form; the flag MUST persist with the new row and display the badge/label and distinct styling when set.
- **FR-003**: System MUST persist deduction-flag changes through the existing line-item update mechanism and treat server enforcement of lifecycle, permission, and concurrency rules as authoritative.
- **FR-004**: System MUST recalculate grid summary totals (gross revenue, total deductions, net show revenue) and artist payouts immediately after a successful deduction-flag change.
- **FR-005**: System MUST visually distinguish expense rows flagged as artist deductions using both a persistent text badge/label (e.g. "Deduction") and distinct row styling; the styling MUST NOT rely on color alone.
- **FR-006**: System MUST gate deduction-toggle editing on event lifecycle: available throughout Pre-Show (unlocked planning and budget-locked settlement) and unavailable once the event is Settled or Reconciled.
- **FR-007**: System MUST gate deduction-toggle editing behind the same column-aware permission that governs editing line-item values (financials-edit when budget is unlocked; settlement-edit when budget is locked during Pre-Show); users without permission for the active column MUST see the flag state read-only.
- **FR-008**: System MUST surface a clear, actionable error when a deduction-flag save is rejected (validation, conflict, permission, lifecycle, or network failure) and MUST restore the displayed flag to the last known server state on failure.
- **FR-009**: System MUST honor optimistic-concurrency control: a mutation based on a stale row version MUST be reported as a conflict prompting refresh-and-retry, never silently overwriting.
- **FR-010**: System MUST scope all deduction-flag operations to the authenticated user's organization and event context.
- **FR-011**: System MUST achieve ≥80% line/branch coverage across backend and frontend for this feature (CI-enforced; Constitution III), including tests for toggle interaction, visual indication, lifecycle-disabled states, and recalculation behavior.

### Key Entities *(include if feature involves data)*

- **Financial Line Item (expense row)**: A ledger row in the Expenses block with a label, monetary values per lifecycle column, and an artist-deduction boolean indicating whether the row's active value is subtracted from gross revenue before artist split calculations.
- **Ledger Grid Summary**: Aggregated gross revenue, total deductions (sum of flagged expense active values), and net show revenue derived from line items and used to drive artist payout calculations.
- **Event Lifecycle / Editability State**: Pre-Show (planning or budget-locked settlement), Settled, or Reconciled status that determines whether the deduction toggle is editable.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A manager can flag or unflag an expense row as an artist deduction and see updated net revenue and artist payouts in under 5 seconds without leaving the ledger grid.
- **SC-002**: 100% of deduction toggles are hidden or disabled when the event is Settled or Reconciled, and 100% of attempted flag changes in those states are rejected by the server.
- **SC-003**: After toggling a deduction flag on an expense row with a non-zero active value, total deductions and net show revenue change by exactly that row's active value (within two-decimal monetary precision).
- **SC-004**: Users can correctly identify flagged deduction rows vs. unflagged expense rows in a usability check — at least 90% of reviewers identify all flagged rows without opening row controls.
- **SC-005**: When a deduction-flag save fails or conflicts, the user receives an error message and the grid never displays an unsaved flag state as if it were persisted.
- **SC-006**: ≥80% line/branch coverage achieved across backend and frontend code for this feature (CI-enforced; Constitution III).

## Assumptions

- The backend already stores `is_artist_deduction` on financial line items and excludes flagged expense values from gross revenue before computing artist splits; no new calculation rules or backend fields are required for this feature.
- The existing line-item update endpoint accepts `isArtistDeduction` and enforces lifecycle, permission, tenant isolation, and optimistic-concurrency rules; this feature adds the user-facing toggle, persistence wiring, and visual indication only.
- Deduction toggling on existing expense rows and optional artist-deduction flagging when adding a new expense row are both in scope for this feature.
- "Active monetary value" follows existing ledger rules: proforma values while the budget is unlocked, settlement values once the budget is locked during Pre-Show.
- Visual distinction for flagged rows uses a persistent "Deduction" badge/label plus distinct row styling that does not rely on color alone; both remain visible in read-only lifecycle states.
- The ledger grid is desktop-first; mobile-specific deduction editing is not required for this feature.
