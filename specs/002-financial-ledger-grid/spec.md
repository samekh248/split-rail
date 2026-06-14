# Feature Specification: Core Financial Ledger Grid & Base-10 Math Engine

**Feature Branch**: `002-financial-ledger-grid`

**Created**: 2026-06-14

**Status**: Draft

**Input**: User description: "Core Financial Ledger Grid & Base-10 Math Engine" (Linear SPLR-17) — Build the unified 5-column financial ledger grid and its base-10 calculation backend: the core operational calculator for show budgeting, night-of settlement, and QuickBooks Online (QBO) variance auditing.

## Clarifications

### Session 2026-06-14

- Q: For a `guarantee` deal, how does tax withholding interact with the `max(base_guarantee, door_split_result)` comparison? → A: Compare on a pre-tax (gross) basis — `grossArtistPayout = max(base_guarantee, netRevenue × backend%)` — then subtract tax withholding from the selected gross. The base guarantee is a pre-tax figure.
- Q: With multiple artists on one event, what revenue base does each split use, and are splits capped? → A: Every artist's split is computed against the same net show revenue, fully independently; the system does not cap or validate that backend percentages sum to ≤100%.
- Q: How are concurrent edits to the same line item/artist (e.g., desktop + mobile during settlement) handled? → A: Optimistic concurrency — each record carries a version; a save based on a stale version is rejected with a conflict, prompting the user to refresh and retry.
- Q: What are the measurable performance targets for recalculation and grid loading? → A: Recalculation under 1 second and full grid load under 2 seconds for a typical event (≤100 line items, ≤20 artists).
- Q: Before the QBO sync feature ships, can QBO actual values be entered manually? → A: No — QBO actuals are strictly read-only and always default to `0.00`; no manual entry path until QBO sync ships.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Plan a show budget with automatic deal math (Priority: P1)

A venue financial manager opens a new event and builds a proforma budget on a spreadsheet-style ledger. They enter projected revenue rows (ticket tiers, bar spend, fees) and expense rows (production, marketing, catering), flag certain expenses as artist deductions, and configure each performing artist's deal (guarantee, door split). The system instantly calculates each artist's net payout from the revenue, deductions, and deal terms — giving the manager a complete, accurate financial picture of the show before it happens.

**Why this priority**: This is the core operational calculator. Without the ability to build a budget and see artist payouts derived from accurate base-10 math, the product delivers no value. It is independently usable as a standalone budgeting tool.

**Independent Test**: Create an event, add revenue and expense line items, add one or more artists with deal terms, and confirm the grid shows correct net payouts that update when any input changes — all while the event is in planning state.

**Acceptance Scenarios**:

1. **Given** a new event in planning state, **When** the manager enters revenue and expense line items in the proforma column, **Then** the grid groups rows under Revenue, Expenses, and Deal Math blocks and totals are shown.
2. **Given** revenue and expense rows exist, **When** an expense row is flagged as an artist deduction, **Then** that amount is subtracted from gross revenue before any artist split is computed.
3. **Given** an artist configured with a door split, **When** recalculation runs, **Then** the artist's net payout equals net show revenue × split percentage, minus tax withholding, rounded to two decimal places using away-from-zero rounding.
4. **Given** an artist configured as a guarantee, **When** recalculation runs, **Then** the gross payout is the greater of the (pre-tax) base guarantee or the calculated gross door-split result, and tax withholding is then subtracted once from that selected gross to produce the net payout.
5. **Given** multiple artists with different deal types on one event, **When** recalculation runs, **Then** each artist's payout is calculated independently and correctly.
6. **Given** any line item or artist value is changed, **When** the change is saved, **Then** the grid totals and artist payouts are automatically recalculated.

---

### User Story 2 - Lock the budget and record night-of settlement (Priority: P2)

After the budget is approved, an authorized manager locks the proforma column so it can no longer be changed. On the night of the show, settlement staff enter actual figures in a separate Settlement column (using a mobile-friendly view), and deal math recalculates payouts against the real numbers. Once settlement is finalized, all values become read-only.

**Why this priority**: Locking and settlement protect financial integrity and capture the real-world results of the show. It builds directly on the P1 grid but is a distinct lifecycle stage.

**Independent Test**: Lock a planned budget, confirm proforma cells become read-only, enter settlement figures, confirm payouts recalculate from settlement values, then advance to settled state and confirm all cells are read-only.

**Acceptance Scenarios**:

1. **Given** an event in planning state and a user with lock permission, **When** they lock the budget, **Then** proforma cells become read-only and settlement cells become editable.
2. **Given** a user without lock permission, **When** they attempt to lock the budget, **Then** the action is rejected.
3. **Given** a locked budget, **When** settlement staff enter values in the settlement column, **Then** artist payouts recalculate using settlement values for revenue and deductions.
4. **Given** an event that has been settled, **When** any user attempts to edit a line item or artist, **Then** the change is rejected and the record is unchanged.
5. **Given** the settlement view on a mobile device, **When** staff edit settlement cells, **Then** the grid remains usable and currency is displayed with two decimal places.

---

### User Story 3 - Reconcile against QuickBooks actuals via variance (Priority: P3)

After the show, accounting reviews actual figures sourced from QuickBooks Online against the recorded settlement. The grid shows a read-only QBO Actuals column and an automatically computed Variance column (actuals minus settlement) per row, highlighting any non-zero differences so discrepancies are easy to spot.

**Why this priority**: Variance auditing closes the loop on financial accuracy but depends on settlement data existing first. QBO actuals are read-only and may be stubbed until the separate QBO sync feature ships.

**Independent Test**: With a settled event, view the ledger and confirm each row shows a variance equal to QBO actual minus settlement, with non-zero variances visually highlighted.

**Acceptance Scenarios**:

1. **Given** a row with a settlement value and a QBO actual value, **When** the grid renders, **Then** the variance cell shows QBO actual minus settlement.
2. **Given** a row where variance is non-zero, **When** the grid renders, **Then** the variance cell is visually highlighted.
3. **Given** the QBO sync feature has not yet populated actuals, **When** the grid renders, **Then** QBO actual values default to zero and remain read-only.
4. **Given** a reconciled event, **When** the grid renders, **Then** all columns are read-only and reconciliation alerts are visible for non-zero variances.

---

### User Story 4 - Configure complex multi-artist deals with custom formulas (Priority: P4)

For non-standard contracts, a manager defines a custom payout formula per artist using a small set of named financial tokens (gross revenue, total deductions, base guarantee, split percentage). The system safely evaluates the formula and shows a live preview of the resulting net payout.

**Why this priority**: Custom formulas cover edge-case contracts beyond standard guarantee/door-split deals. Valuable but only needed by a subset of shows, so it can follow the standard deal types.

**Independent Test**: Configure an artist with a custom formula referencing the supported tokens, recalculate, and confirm the previewed net payout matches the formula evaluated against current grid values.

**Acceptance Scenarios**:

1. **Given** an artist with deal type "custom" and a valid formula, **When** recalculation runs, **Then** the net payout equals the formula evaluated against current revenue, deductions, and deal inputs, rounded to two decimals away-from-zero.
2. **Given** a formula containing characters outside the allowed math character set, **When** it is evaluated, **Then** disallowed characters are stripped before evaluation and no unsafe operation occurs.
3. **Given** a formula that cannot be parsed or evaluated, **When** recalculation runs, **Then** the system reports a clear error rather than silently producing a wrong or zero value.
4. **Given** a manager editing a custom formula, **When** they view the configuration panel, **Then** the available tokens are listed and a live payout preview is available after recalculation.

---

### Edge Cases

- **Fractional splits**: e.g., 33.33% of $1,000.00 must compute and round predictably to two decimals.
- **Rounding boundaries**: values ending in `.005` must round away from zero (e.g., up for positive amounts).
- **Zero gross revenue**: deal math must produce a defined, non-erroneous result.
- **Deductions exceed gross**: net revenue goes negative; standard deal payouts floor at zero rather than producing a negative payout (custom formulas may allow negatives only if explicitly defined).
- **Nested parentheses in custom formula**: must evaluate correctly.
- **Malicious/injection formula input**: non-math characters are stripped; no code execution or data access occurs.
- **Cross-tenant access**: a user from one organization must never read or modify another organization's events, line items, or artists.
- **Edits after lock/settlement**: attempts to change locked or settled records are rejected.
- **Concurrent edits**: two users editing the same line item or artist simultaneously — the second save (based on a stale version) is rejected with a conflict so no edit is silently overwritten.

## Requirements *(mandatory)*

### Functional Requirements

#### Ledger Grid Structure

- **FR-001**: System MUST present a single event's finances as a spreadsheet-style grid of three vertical blocks (Revenue, Expenses, Deal Math) and five columns (Proforma/Budget, Night Settlement, QBO Actuals, Variance, Notes).
- **FR-002**: System MUST allow users to add, edit, remove, and reorder line item rows within a block, each with a label, an ordering position, and per-column monetary values.
- **FR-003**: System MUST allow a free-text note per row.
- **FR-004**: System MUST allow expense rows to be flagged as artist deductions.
- **FR-005**: System MUST display all monetary values with exactly two decimal places.

#### Money Math Accuracy

- **FR-006**: System MUST perform all monetary calculations using base-10 decimal arithmetic and MUST NOT use floating-point types anywhere in the money path.
- **FR-007**: System MUST apply away-from-zero rounding to two decimal places for all rounded monetary results.
- **FR-008**: System MUST compute net show revenue as gross revenue minus total artist deductions, where gross revenue sums the Revenue block and total deductions sum rows flagged as artist deductions, using the column appropriate to the current lifecycle state (proforma before lock, settlement after lock).
- **FR-009**: System MUST support these standard deal types per artist: guarantee (gross payout = greater of the pre-tax base guarantee or the gross door-split result), door split (net revenue × backend percentage), and custom (formula-driven).
- **FR-010**: System MUST treat the base guarantee as a pre-tax figure, perform the guarantee comparison on a pre-tax (gross) basis, and apply tax withholding exactly once as a percentage of the selected gross artist payout, subtracting it to produce the final net payout.
- **FR-011**: System MUST calculate each artist's net payout independently when multiple artists are on one event, computing every artist's split against the same shared net show revenue. The system does NOT cap or reject configurations where backend percentages collectively exceed 100% (treated as a data-entry concern, not a math constraint).
- **FR-012**: System MUST recalculate grid totals and all artist payouts automatically whenever any line item or artist value changes, and MUST also support an explicit recalculation trigger that returns a full grid snapshot.

#### Custom Formula Evaluation

- **FR-013**: System MUST evaluate custom payout formulas in a sandboxed manner, restricting input to a safe mathematical character set and stripping all other characters before evaluation.
- **FR-014**: System MUST expose a fixed set of named tokens to custom formulas: gross revenue, total deductions, base guarantee, and split percentage (with percentages normalized appropriately).
- **FR-015**: System MUST raise a clear, specific error when a custom formula fails to parse or evaluate, and MUST NOT silently swallow the error or substitute an incorrect value.

#### Variance & QBO Actuals

- **FR-016**: System MUST compute a per-row variance equal to QBO actual value minus settlement value, both client-side and server-side.
- **FR-017**: System MUST visually highlight rows where variance is non-zero.
- **FR-018**: System MUST treat QBO actual values as strictly read-only with no manual-entry path, always defaulting to `0.00` until populated by the separate QBO sync feature, and MUST treat synced actuals as append-only (corrections via offsetting entries, never by altering historical values).

#### Lifecycle State Machine

- **FR-019**: System MUST model event lifecycle states of Pre-Show (planning), Settled, and Reconciled, plus a budget-locked flag within Pre-Show.
- **FR-020**: System MUST make the Proforma column editable only in Pre-Show while the budget is unlocked, and read-only once the budget is locked.
- **FR-021**: System MUST make the Settlement column editable only after the budget is locked and while the event is still in Pre-Show, and read-only after the event is settled.
- **FR-022**: System MUST reject any mutation to line items or artists when the event status is Settled or Reconciled.
- **FR-023**: System MUST provide a Lock Budget action that transitions the proforma column to read-only and is restricted to users with budget-lock permission.
- **FR-024**: System MUST drive cell editability on the interface from the combination of event state and the user's permissions, hiding or disabling controls the user cannot use.
- **FR-036**: System MUST apply optimistic concurrency control to line item and artist mutations: each record carries a version, and a save based on a stale version MUST be rejected with a conflict response (no silent overwrite), prompting the user to refresh and retry.

#### Artist Deal Configuration

- **FR-025**: Users MUST be able to add, edit, and remove artist deal configurations (artist name, performance order, deal type, base guarantee, backend percentage, tax withholding percentage, and optional custom formula) only while the event is in Pre-Show.
- **FR-026**: System MUST provide a per-artist configuration panel with a deal-type selector, deal inputs, custom-formula entry with the available tokens listed, and a live preview of the calculated net payout.

#### Authorization & Tenant Isolation

- **FR-027**: System MUST scope every data access for events, line items, and artists to the authenticated user's organization, and MUST reject or hide data belonging to other organizations.
- **FR-028**: System MUST never execute unscoped data queries that could return cross-organization financial data.
- **FR-029**: System MUST enforce permission checks for viewing financials, editing settlement, and locking the budget at the point of each action.
- **FR-030**: System MUST support venue-level scoping when a user has explicit venue access restrictions.
- **FR-031**: System MUST support future row-level hiding of sensitive line items from promoter-type users.

#### Contracts & Quality

- **FR-032**: System MUST expose monetary values across the API as string-formatted decimals so that downstream type generation preserves precision and avoids floating-point representation.
- **FR-033**: Frontend data contracts MUST be derived from the generated API type definitions rather than hand-written, so client and server stay in sync.
- **FR-034**: System MUST include automated tests covering money-math boundary cases (fractional splits, rounding boundaries, zero gross, deductions exceeding gross, nested-parenthesis and injection-attempt custom formulas, multi-artist mixed deal types) and tenant-isolation/state-machine enforcement.
- **FR-035**: System MUST NOT write cleartext PII, access tokens, or secrets to logs in any financial processing path, and MUST avoid empty catch blocks or generic exceptions in those paths.

### Key Entities *(include if feature involves data)*

- **Event**: A single show belonging to a venue (and therefore an organization). Carries lifecycle status (Pre-Show, Settled, Reconciled), a budget-locked flag, an accounting tag, and settlement metadata (who settled it and when). Owns its line items and artist deals.
- **Financial Line Item**: A single ledger row belonging to an event, classified into a block (Revenue, Expenses, Deal Math), with a label, ordering position, an artist-deduction flag, three monetary values (proforma, settlement, QBO actual), and an optional note. A future flag supports hiding sensitive rows from promoters.
- **Event Artist**: A performing artist's deal configuration on an event, with name, performance order, deal type (guarantee, door split, custom), base guarantee, backend percentage, tax withholding percentage, an optional custom formula, and the resulting calculated net payout.
- **Variance (computed)**: A per-row derived value equal to QBO actual minus settlement, surfaced in the grid and not separately stored.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For every documented money-math edge case (fractional splits, `.005` rounding boundaries, zero gross, deductions exceeding gross, nested-parenthesis and injection custom formulas, multi-artist mixed deals), the calculated payouts are exact to the cent with no floating-point error.
- **SC-002**: 100% of attempts to access or modify another organization's financial data are rejected.
- **SC-003**: 100% of attempts to edit proforma values after budget lock, or any values after settlement, are rejected.
- **SC-004**: Changing any single line item or artist input updates all dependent totals and artist payouts within one recalculation cycle, with no manual refresh required.
- **SC-009**: For a typical event (≤100 line items, ≤20 artists), recalculation completes in under 1 second and the full ledger grid loads in under 2 seconds.
- **SC-005**: A manager can build a complete show budget — revenue, expenses, deductions, and at least one artist deal with a correct net payout — in a single sitting without external calculation tools.
- **SC-006**: Non-zero variances are visually distinguishable from zero variances at a glance in the grid.
- **SC-007**: Frontend builds successfully against generated API types with no hand-written duplicate data contracts.
- **SC-008**: The settlement view is usable on a mobile web browser for night-of data entry.

## Assumptions

- QBO OAuth, the sync pipeline, and account-mapping UI are out of scope; QBO actual values are strictly read-only and default to `0.00` (no manual-entry path) until the separate QBO feature ships.
- Settlement signature capture and immutable settlement PDF generation are handled in a separate feature; this feature only gates editability around the settlement transition.
- A permission/authorization middleware already exists; this feature enforces the relevant permissions (view financials, edit settlement, lock budget) at the action level rather than implementing the full role system.
- End-to-end lifecycle tests across the full UI are tracked as a follow-up; this feature's automated tests focus on math correctness, tenant isolation, and state-machine enforcement.
- Existing organization, venue, and user records are available to associate events with a tenant and venue.
- The planning view is desktop-first; the settlement view must additionally work on mobile web.
