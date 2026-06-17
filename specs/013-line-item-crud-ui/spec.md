# Feature Specification: Production Line-Item CRUD UI (Add/Edit/Delete/Reorder)

**Feature Branch**: `dustin/splr-28-production-line-item-crud-ui-addeditdeletereorder`

**Created**: 2026-06-17

**Status**: Draft

**Input**: User description: "Production line-item CRUD UI (add/edit/delete/reorder)" (Linear SPLR-28) — Replace the dev-only "Add sample expense row" button on the event ledger grid with real, lifecycle-aware controls so venue staff can add, edit, delete, and reorder ledger line items directly from the grid. Backend endpoints (`POST/PUT/DELETE .../line-items`) already exist; `useDeleteLineItem` exists but is currently unused.

## Clarifications

### Session 2026-06-17

- Q: In which lifecycle states should add/delete/reorder of line items be available? → A: Available throughout Pre-Show — both the planning (budget unlocked) and settlement (budget locked) phases — and blocked only once the event is Settled or Reconciled.
- Q: Which users may add/delete/reorder line items? → A: Reuse the existing permission that governs editing line-item values — any user who can edit the ledger can also add, delete, and reorder rows; no new role is introduced.
- Q: How should users reorder line items within a block? → A: Move up / move down buttons per row (keyboard-accessible, deterministic); drag-and-drop is out of scope.
- Q: Where should the add-row flow be initiated from? → A: Per-block "Add row" button on each Revenue and Expenses section header; the block is pre-selected in the add form.
- Q: When adding a row during settlement (budget locked), must the user enter the settlement value in the add form? → A: Yes — the add form requires a settlement value when the budget is locked; proforma is omitted or shown read-only as `0.00`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Add a real line item to the ledger (Priority: P1)

A venue financial manager building or adjusting a show budget needs to add a new ledger row of their choosing. From the Revenue or Expenses section header they click "Add row", enter a meaningful label (e.g. "VIP ticket tier", "Backline rental") and starting value in the add form (block pre-selected by section), then save. The new row appears in that block and the grid totals update. This replaces the temporary developer-only "Add sample expense row" button that always inserts a hard-coded placeholder.

**Why this priority**: Adding meaningful rows is the foundational capability. Without it, managers cannot model a real show in the ledger, and the current placeholder button is unusable in production. It delivers standalone value as a usable budgeting input.

**Independent Test**: On an editable Pre-Show event, click "Add row" on the Revenue section, enter a label and value, save, and confirm the row appears under Revenue with the entered label/value and that totals recalculate.

**Acceptance Scenarios**:

1. **Given** an event in Pre-Show with an unlocked budget, **When** the manager clicks "Add row" on the Revenue section and submits a label and proforma value, **Then** the new row appears under Revenue with that label and value, and gross revenue and net totals update.
2. **Given** an event in Pre-Show with an unlocked budget, **When** the manager clicks "Add row" on the Expenses section and flags the row as an artist deduction, **Then** the row appears under Expenses, is marked as a deduction, and total deductions update.
3. **Given** the add-row form is open, **When** the manager submits without a label, **Then** the system prevents the add and indicates the label is required.
4. **Given** a newly added row appended to a block, **When** the grid renders, **Then** the row is placed after existing rows in that block (highest ordering position).
5. **Given** an event in Pre-Show with a locked budget (settlement phase), **When** the manager clicks "Add row" on a block section, **Then** the add form requires a settlement value and does not accept proforma entry (proforma shown or stored as `0.00`).

---

### User Story 2 - Delete a line item (Priority: P2)

A manager realizes a row was added in error or no longer applies and removes it from the grid. They trigger delete on the row, confirm the action, and the row disappears with totals recalculating. This wires up the existing-but-unused delete capability.

**Why this priority**: Removing erroneous or obsolete rows keeps the ledger accurate and is the natural counterpart to adding rows. It builds on P1 but is a distinct, independently valuable action.

**Independent Test**: On an editable event with at least one user-added row, trigger delete on that row, confirm, and verify the row is gone and totals recalculate.

**Acceptance Scenarios**:

1. **Given** an editable event with an existing line item, **When** the manager deletes that row and confirms, **Then** the row is removed from the grid and gross/deduction/net totals recalculate.
2. **Given** a delete control on a row, **When** the manager triggers it, **Then** they are asked to confirm before the row is permanently removed.
3. **Given** the manager cancels the delete confirmation, **When** the dialog closes, **Then** the row remains unchanged.

---

### User Story 3 - Reorder line items within a block (Priority: P3)

A manager wants ledger rows to read in a logical order (e.g. grouping ticket tiers together, ordering expenses by size). They use move-up and move-down controls on a row to change its position within its block, and the new order persists so it is preserved on reload and reflected in any downstream rendering that relies on ordering position.

**Why this priority**: Ordering improves readability and presentation of the budget but is not required to record correct financial data, so it follows add and delete.

**Independent Test**: On an editable event with multiple rows in a block, change the order of two rows, reload the grid, and confirm the new order persists.

**Acceptance Scenarios**:

1. **Given** a block with multiple rows, **When** the manager clicks move up or move down on a row, **Then** the grid immediately reflects the new visual order.
2. **Given** a reordered block, **When** the grid is reloaded, **Then** the persisted ordering positions reproduce the new order.
3. **Given** a row in the Revenue block, **When** the manager reorders rows, **Then** reordering only affects ordering within that block and does not move the row into a different block.

---

### User Story 4 - Edit a row's label inline (Priority: P3)

Beyond editing per-column monetary values (already supported), a manager corrects or renames a row's label and its deduction flag directly in the grid without recreating the row.

**Why this priority**: Renaming and re-flagging rows avoids the delete-and-re-add workaround. It complements the existing inline value editing, but value editing already covers the most critical path, so label/flag editing is lower priority.

**Independent Test**: On an editable event, change a row's label inline, save, reload, and confirm the new label persists; toggle the deduction flag and confirm deductions recalculate.

**Acceptance Scenarios**:

1. **Given** an editable row, **When** the manager edits its label and saves, **Then** the new label persists and is shown after reload.
2. **Given** an editable expense row, **When** the manager toggles its artist-deduction flag, **Then** total deductions and net revenue recalculate accordingly.

---

### Edge Cases

- **Settled/Reconciled event**: when the event is Settled or Reconciled, add/delete/reorder/label-edit controls are hidden or disabled, and any attempt is rejected by the server backstop.
- **Adding a row during settlement**: when the budget is locked (settlement phase), the add form requires a settlement value; proforma is omitted from the form or shown read-only as `0.00` and stored as `0.00`. The user cannot save a new row without entering a settlement value.
- **Concurrent edit conflict**: if another user changed or deleted the same row, a save/delete based on a stale version is rejected with a conflict, prompting the user to refresh and retry (no silent overwrite).
- **Deleting the last row in a block**: the block renders as empty (header/totals shown, no rows) without error.
- **Add/delete/reorder failure**: when a mutation fails (validation, conflict, permission, or network), the grid shows a clear error and the displayed rows return to the last known server state rather than showing an optimistic row that was never saved.
- **Reorder of a single-row block**: move-up and move-down controls are disabled (or hidden) for the sole row; no error occurs.
- **Reorder at block boundaries**: move-up is disabled (or hidden) on the first row in a block; move-down is disabled (or hidden) on the last row in a block.
- **Cross-tenant attempt**: a user cannot add/edit/delete/reorder rows on an event belonging to another organization.
- **Empty or whitespace-only label**: rejected as invalid.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Users MUST be able to add a new line item from a per-block "Add row" control on each Revenue and Expenses section header (block pre-selected). The add form MUST collect a label, an initial monetary value for the currently editable column (proforma while budget is unlocked; settlement while budget is locked — settlement value is required during settlement and proforma is omitted or read-only as `0.00`), and an optional artist-deduction flag (Expenses only).
- **FR-002**: System MUST replace the developer-only "Add sample expense row" placeholder control with the production add-line-item experience (the placeholder MUST NOT remain in the shipped UI).
- **FR-003**: Users MUST be able to delete an existing line item from the grid, with a confirmation step before removal.
- **FR-004**: Users MUST be able to reorder line items within a block using per-row move-up and move-down controls (keyboard-accessible); drag-and-drop reordering is out of scope. The new ordering positions MUST be persisted so they survive reload. Move-up MUST be unavailable on the first row in a block and move-down MUST be unavailable on the last row.
- **FR-005**: Users MUST be able to edit an existing row's label and artist-deduction flag inline, in addition to the already-supported per-column value editing.
- **FR-006**: System MUST recalculate grid totals (gross revenue, total deductions, net show revenue) and artist payouts after any add, delete, reorder, or edit that affects values, deduction flags, or membership.
- **FR-007**: System MUST gate add, delete, reorder, and label/flag editing on the event's lifecycle state: these structural operations are available throughout Pre-Show (both the unlocked planning phase and the budget-locked settlement phase) and MUST be hidden or disabled once the event is Settled or Reconciled. Per-column value editing continues to follow its own column editability (proforma editable while unlocked; settlement editable after lock).
- **FR-008**: System MUST rely on the existing backend endpoints for create, update, and delete of line items, and MUST treat the server's enforcement of lifecycle/lock/settlement rules as the authoritative backstop (the UI gating is a usability layer, not the sole guard).
- **FR-009**: System MUST require a non-empty, non-whitespace label when adding or renaming a line item and MUST prevent submission of an invalid label with a clear message.
- **FR-010**: System MUST display and accept all monetary values with exactly two decimal places, consistent with the existing grid, and MUST NOT introduce floating-point handling of monetary values in the client.
- **FR-011**: System MUST surface a clear, actionable error when an add, delete, reorder, or edit operation is rejected (validation, optimistic-concurrency conflict, permission, or lifecycle state), and MUST restore the grid to the last known server state on failure (no orphaned optimistic rows).
- **FR-012**: System MUST honor optimistic-concurrency control already enforced by the backend: a mutation based on a stale row version MUST be reported as a conflict prompting refresh-and-retry, never silently overwriting.
- **FR-013**: System MUST scope all line-item operations to the authenticated user's organization and venue/event context, never allowing cross-organization line-item access.
- **FR-015**: System MUST gate add, delete, reorder, and label/flag editing behind the same permission that already governs editing line-item values; no new role or permission is introduced, and users without that permission MUST NOT see or be able to invoke the structural controls.
- **FR-014**: System MUST achieve ≥80% line/branch coverage across backend and frontend for this feature (CI-enforced; Constitution III), including frontend component tests for the add/delete/reorder/edit interactions and their disabled/hidden states under each lifecycle condition.

### Key Entities *(include if feature involves data)*

- **Financial Line Item**: A single ledger row belonging to an event, classified into a block (Revenue or Expenses for user-managed rows), with a label, an ordering position (sort order) within its block, an artist-deduction flag, per-column monetary values (proforma, settlement, QBO actual), an optional note, a promoter-hidden flag, and a version used for optimistic concurrency.
- **Ledger Grid (view)**: The composed, per-event view that groups line items into blocks and exposes the lifecycle editability state (proforma/settlement/locked) that drives which controls are shown or enabled.
- **Event lifecycle/editability state (referenced)**: The Pre-Show/Settled/Reconciled status plus budget-locked flag that determines whether structural line-item operations are permitted.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A manager can add a meaningful, correctly-placed line item (chosen block, custom label, value) from the grid in under 30 seconds, without using any developer-only control.
- **SC-002**: 100% of add/delete/reorder/label-edit controls are hidden or disabled when the event is Settled or Reconciled, and 100% of attempted structural mutations in those states are rejected.
- **SC-003**: After any add, delete, or deduction-affecting edit, grid totals and artist payouts reflect the change with no manual refresh required.
- **SC-004**: Reordered line-item positions persist across a full page reload 100% of the time.
- **SC-005**: When a mutation fails or conflicts, the user sees a clear error and the grid never displays an unsaved row as if it were saved (no orphaned optimistic state).
- **SC-006**: The developer-only "Add sample expense row" control is absent from the shipped UI.
- **SC-007**: ≥80% line/branch coverage achieved across backend and frontend code for this feature (CI-enforced; Constitution III).

## Assumptions

- The backend `POST/PUT/DELETE .../line-items` endpoints exist and already enforce lifecycle, lock/settlement, tenant isolation, and optimistic-concurrency rules; this feature adds the UI and wires the existing unused `useDeleteLineItem` mutation, and does not add new backend mutation endpoints. If persisting reorder requires a batch/sort-order update capability the backend does not yet expose, reorder will persist via per-row updates to the existing update endpoint.
- User-managed line items are limited to the Revenue and Expenses blocks; the Deal Math block is system-derived from artist configuration and is not directly add/delete/reorder-able through this feature.
- Structural operations (add/delete/reorder/label-and-flag edit) are offered throughout Pre-Show — both the unlocked planning phase and the budget-locked settlement phase — and are blocked once the event is Settled or Reconciled (server-enforced). During settlement, the add form requires a settlement value; proforma is stored as `0.00`. If the backend currently rejects line-item creation/deletion once the budget is locked, that constraint will be reconciled with the backend during planning.
- Inline value editing already present in the grid is reused as-is; this feature extends inline editing to the row label and deduction flag.
- Reorder uses per-row move-up and move-down controls only; drag-and-drop is explicitly out of scope for this feature.
- The planning/grid view is desktop-first, consistent with the existing ledger grid; mobile parity for structural editing is not required by this feature.
- Generated API types are the source of truth for line-item request/response shapes; no hand-written duplicate contracts are introduced.
