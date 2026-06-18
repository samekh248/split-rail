# Feature Specification: Client-Side Ledger Variance Derivation

**Feature Branch**: `020-grid-variance-derivation`

**Created**: 2026-06-18

**Status**: Draft

**Input**: User description: "Wire client-side variance derivation into the grid (FR-016)" (Linear SPLR-31) — The financial ledger grid currently displays per-row variance values supplied by the server. The original ledger product requirement (FR-016) mandates that variance be computed both on the server and on the client. This feature closes that gap by deriving variance in the grid from each row's QBO actual and settlement values using decimal-safe arithmetic, while keeping the server value as the authoritative source of truth and preserving existing non-zero variance highlighting.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See accurate variance derived in the grid (Priority: P1)

An accounting reviewer or venue manager opens a settled or reconciled event ledger to compare QuickBooks actuals against night-of settlement figures. For every line item row, the Variance column shows the difference between QBO actual and settlement, computed with the same decimal precision rules as the rest of the ledger so amounts are never distorted by rounding errors.

**Why this priority**: Variance is the primary signal for reconciliation. If the grid displays a server-copied number without client-side derivation, the product fails its own accuracy requirement (FR-016) and users cannot trust that displayed figures follow the platform's decimal-safe money rules end-to-end.

**Independent Test**: Open an event ledger with known QBO actual and settlement values on multiple rows; confirm each Variance cell equals QBO actual minus settlement, formatted to two decimal places, including rows with zero, positive, and negative differences.

**Acceptance Scenarios**:

1. **Given** a row with a QBO actual value and a settlement value, **When** the grid renders the Variance column, **Then** the displayed variance equals QBO actual minus settlement, shown with exactly two decimal places.
2. **Given** a row where QBO actual equals settlement, **When** the grid renders, **Then** the variance displays as zero (e.g., `0.00`) and is not visually flagged as a discrepancy.
3. **Given** a row where QBO actual differs from settlement, **When** the grid renders, **Then** the variance cell is visually highlighted so the discrepancy is easy to spot at a glance.
4. **Given** rows across all three ledger blocks (Revenue, Expenses, Deal Math), **When** the grid renders, **Then** every row's variance is derived consistently using the same subtraction rule.

---

### User Story 2 - Client and server variance stay in agreement (Priority: P1)

When the ledger loads or refreshes, the client-derived variance for each row must agree with the authoritative variance value returned by the server for the same row. This dual computation acts as a correctness check: users always see figures that match the server's canonical calculation, and any mismatch is handled without showing misleading amounts.

**Why this priority**: The server remains the source of truth for persisted ledger data. Client derivation fulfills FR-016's dual-computation mandate while ensuring users never see a variance that contradicts what the backend has validated.

**Independent Test**: Load a ledger with a mix of zero and non-zero variances; for every row, verify the client-derived variance matches the server-provided variance field before display.

**Acceptance Scenarios**:

1. **Given** a ledger response where server variance matches QBO actual minus settlement, **When** the grid renders, **Then** the displayed variance equals both the client-derived result and the server-provided variance value.
2. **Given** a row where the server-provided variance is available, **When** the client derives variance from the same QBO actual and settlement inputs, **Then** the two values are identical (no off-by-one-cent drift).
3. **Given** a hypothetical mismatch between client-derived and server-provided variance for a row, **When** the grid renders, **Then** the authoritative server variance is what the user sees, and the discrepancy does not produce a silently wrong figure.

---

### User Story 3 - Variance updates when settlement or actuals change (Priority: P2)

During Pre-Show settlement entry or after QBO actuals are populated, managers need the Variance column to reflect current row values without requiring a full page reload in cases where the grid already has updated QBO actual and settlement inputs locally.

**Why this priority**: Stale variance undermines reconciliation workflows. This story ensures derivation is tied to the row's current monetary inputs, not a one-time snapshot at initial load.

**Independent Test**: On a Pre-Show event with settlement editable, change a settlement value and confirm the affected row's variance updates to reflect the new difference against QBO actual.

**Acceptance Scenarios**:

1. **Given** a row whose settlement value changes (via save or optimistic local update), **When** the grid re-renders with the new settlement and unchanged QBO actual, **Then** the variance cell reflects the updated difference.
2. **Given** a row whose QBO actual value updates after a sync refresh, **When** the grid re-renders, **Then** the variance cell reflects the new QBO actual minus the current settlement value.
3. **Given** a reconciled event where all columns are read-only, **When** the user views variance, **Then** values remain derived from the read-only QBO actual and settlement fields without edit affordances.

---

### Edge Cases

- **Default zero QBO actuals**: When QBO actual is unset or zero, variance equals negative settlement (or zero if settlement is also zero); highlighting applies only when the magnitude is non-zero.
- **Negative variances**: Rows where settlement exceeds QBO actual show a negative variance with correct sign and two-decimal formatting; highlighting still applies when variance is non-zero.
- **Large monetary values**: Values with thousands separators in display do not affect underlying decimal-safe subtraction (e.g., `10,000.00` minus `9,999.99` = `0.01`).
- **Fractional cent boundaries**: Subtraction and display respect away-from-zero rounding to two decimals, consistent with platform money rules.
- **Missing or null inputs**: Rows with missing QBO actual or settlement treat absent values as `0.00` for derivation purposes, matching server behavior.
- **Settled and reconciled events**: Variance remains read-only; derivation is display-only with no user edit path.
- **Reconciled alert banner**: Existing reconciliation alerts for non-zero variances continue to appear when any row has a non-zero derived variance.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST derive each row's displayed variance on the client as QBO actual value minus settlement value, using decimal-safe arithmetic that never relies on floating-point numeric types for money.
- **FR-002**: System MUST format derived variance values with exactly two decimal places for display in the grid.
- **FR-003**: System MUST treat the server-provided variance on each row as the authoritative value; when client derivation and server variance disagree, the grid MUST display the server value.
- **FR-004**: System MUST verify agreement between client-derived variance and server-provided variance under normal operation (matching inputs produce matching results).
- **FR-005**: System MUST visually highlight variance cells where the derived variance is non-zero, preserving the existing flagged appearance for reconciliation review.
- **FR-006**: System MUST derive variance for every line item row in all ledger blocks using the row's own QBO actual and settlement values.
- **FR-007**: System MUST re-derive variance when a row's QBO actual or settlement value changes and the grid re-renders with updated data.
- **FR-008**: System MUST NOT introduce a manual edit path for variance; variance remains a computed, read-only column.
- **FR-009**: System MUST achieve ≥80% line/branch coverage across backend and frontend for this feature (CI-enforced; Constitution III).

### Key Entities

- **Line Item Row**: A labeled row within a ledger block carrying proforma, settlement, QBO actual, notes, and computed variance fields.
- **Variance**: The monetary difference between QBO actual and settlement for a single row; zero indicates agreement, non-zero indicates a reconciliation discrepancy.
- **Authoritative Server Variance**: The variance value computed and persisted by the backend ledger service, used as the source of truth when client and server results differ.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On a ledger with at least 10 rows spanning all three blocks, 100% of variance cells display a value equal to QBO actual minus settlement (verified against known test data).
- **SC-002**: For every row in acceptance testing, client-derived variance matches the server-provided variance field with zero cent drift.
- **SC-003**: Users can identify non-zero variance rows within 3 seconds of opening a reconciled ledger (visual highlighting unchanged or improved from current behavior).
- **SC-004**: Variance amounts on boundary cases (e.g., one-cent differences on large totals, negative results) display exactly as expected with no cent-level drift in acceptance testing.
- **SC-005**: ≥80% line/branch coverage achieved across backend and frontend code for this feature (CI-enforced; Constitution III).

## Assumptions

- The server already computes and returns per-row `variance` and `varianceFlagged` fields on ledger load; this feature does not change the server calculation contract.
- QBO actual values remain read-only in the grid; population happens via the separate QBO sync feature or defaults to `0.00`.
- Existing variance highlighting styles and reconciled-state alert banners remain the visual baseline; this feature wires derivation logic, not a redesign.
- Settlement and QBO actual values are already available on each row when the grid renders; no new data fields are required from the ledger API.
- Automated tests will cover client derivation paths and grid integration per Constitution III quality gates.
- Scope is limited to the ledger grid variance column; other surfaces that show variance (PDF export, settlement summary) are out of scope unless they already consume server values.
