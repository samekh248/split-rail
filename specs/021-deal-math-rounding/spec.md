# Feature Specification: Consistent Deal-Math Rounding and Custom-Deal Tax

**Feature Branch**: `021-deal-math-rounding`

**Created**: 2026-06-18

**Status**: Draft

**Input**: User description: "Round all intermediate monetary steps in DealMathEngine + consistent custom-deal tax" (Linear SPLR-32) — The authoritative artist payout calculation engine applies away-from-zero rounding to two decimal places only at tax withholding and final payout steps. Intermediate gross amounts produced during guarantee comparison and door-split percentage calculations are not rounded before tax is computed, producing results that diverge from the platform's established monetary rounding policy. Additionally, custom-formula deals skip tax withholding entirely while guarantee and door-split deals apply it, creating inconsistent net payouts for otherwise equivalent configurations.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Accurate payout when percentages produce fractional cents (Priority: P1)

A venue general manager settles a show where an artist's backend percentage applied to net show revenue yields a fractional-cent gross amount (for example, 33.33% of $1,000.00). The manager expects the artist's net payout to reflect professional ledger rounding at every monetary boundary — not just at the final step — so the displayed payout matches what accountants and settlement PDFs would produce.

**Why this priority**: Fractional percentages are common in live-event deals. Unrounded intermediate gross amounts cause silent penny drift between what managers see during configuration, what the ledger persists, and what appears on settlement documents. This is the core correctness gap blocking trust in artist payouts.

**Independent Test**: Configure a door-split artist at 33.33% against a net show revenue of $1,000.00 with 0% tax withholding. Confirm the persisted net payout equals $333.30 (not an unrounded intermediate such as $333.3333 carried into later steps).

**Acceptance Scenarios**:

1. **Given** a door-split deal where net show revenue multiplied by the backend percentage produces a fractional-cent gross amount, **When** the system calculates the artist's net payout, **Then** the gross split amount is rounded away-from-zero to two decimal places before tax withholding is applied.
2. **Given** a guarantee deal where the door-split comparison amount is fractional cents and exceeds the base guarantee, **When** the system selects the split amount as the gross artist payout, **Then** that split amount is rounded away-from-zero to two decimal places before the guarantee comparison and before tax withholding.
3. **Given** a guarantee deal where the rounded split amount is lower than the base guarantee, **When** the system calculates net payout, **Then** the base guarantee is used as the gross artist payout (guarantee amounts are already stored at two decimal places) and tax is computed from that value.
4. **Given** any standard deal type (guarantee or door split) with a non-zero tax withholding percentage, **When** tax is computed from a rounded gross artist payout, **Then** tax withheld and final net payout each round away-from-zero to two decimal places, and the final payout never falls below $0.00.
5. **Given** a fractional-cent gross amount that rounds at the `.005` boundary (for example, $100.055), **When** rounding is applied, **Then** the result rounds away from zero (for example, $100.06, not banker's rounding).

---

### User Story 2 - Custom-formula deals follow the same tax rules as standard deals (Priority: P1)

A manager configures a custom-formula artist deal with a non-zero tax withholding percentage. They expect tax to be withheld from the formula result the same way it is for guarantee and door-split deals, so net payout reflects the configured withholding rate rather than returning the full formula gross.

**Why this priority**: Tax withholding is a contractual and compliance attribute stored on every artist deal. Bypassing it for custom deals produces incorrect net payouts, undermines settlement accuracy, and contradicts the original ledger product requirement that tax is applied exactly once on the selected gross artist payout regardless of deal type.

**Independent Test**: Configure a custom-formula deal whose evaluated gross equals $1,000.00 with 10% tax withholding. Confirm the persisted net payout is $900.00 (not $1,000.00).

**Acceptance Scenarios**:

1. **Given** a custom-formula deal with a valid formula and a non-zero tax withholding percentage, **When** the system calculates net payout, **Then** tax is withheld once from the formula's rounded gross result using the same away-from-zero rounding rules as guarantee and door-split deals.
2. **Given** a custom-formula deal with 0% tax withholding, **When** the system calculates net payout, **Then** the net payout equals the formula's rounded gross result, floored at $0.00 if negative.
3. **Given** a custom-formula deal where the formula evaluates to a negative amount, **When** net payout is computed, **Then** the result is floored at $0.00 after tax processing (consistent with standard deals).
4. **Given** identical gross artist payout amounts and tax withholding percentages across guarantee, door-split, and custom deal types, **When** net payouts are calculated, **Then** all three deal types produce the same net payout.

---

### User Story 3 - Live payout preview matches authoritative calculation (Priority: P2)

While adding or editing an artist deal, a manager uses the live payout preview introduced in the artist-formula-preview feature. After this rounding correction, the preview must continue to match the authoritative payout the system persists after save and recalculation.

**Why this priority**: Managers rely on live preview to iterate on deal terms. If preview math diverges from persisted payouts after rounding fixes, the preview becomes misleading. This story ensures parity but depends on the authoritative engine corrections in P1 and P2.

**Independent Test**: Open the add/edit artist form for a door-split deal with a fractional percentage. Confirm the live preview amount equals the amount persisted after save without a manual recalculation discrepancy.

**Acceptance Scenarios**:

1. **Given** a user is previewing a guarantee, door-split, or custom deal with fractional intermediate amounts, **When** the live preview updates, **Then** the previewed net payout matches the authoritative calculation using the same intermediate rounding and tax rules.
2. **Given** a user saves a deal configuration after viewing a live preview, **When** the save succeeds and the ledger recalculates, **Then** the previewed net payout equals the artist's persisted calculated net payout shown in the artist list.

---

### Edge Cases

- Net show revenue is zero or negative (deductions exceed gross revenue): gross artist payout floors at $0.00; tax on zero gross yields zero net payout.
- Backend percentage is 0% on a door-split deal: gross split rounds to $0.00; net payout is $0.00 regardless of tax rate.
- Guarantee deal where base guarantee and rounded split amount are equal: either selection produces the same gross; tax applies identically.
- Tax withholding percentage produces fractional-cent tax (for example, 10% of $100.05): tax rounds away-from-zero before subtracting from gross.
- Custom formula evaluates to exactly $0.00: net payout is $0.00; no tax is withheld.
- Multiple artists on one event: each artist's payout is computed independently against the shared net show revenue; rounding applies per artist, not once for the event.
- Event recalculation after line-item changes: all artist payouts recompute with the corrected rounding rules; previously persisted penny-drift values update to corrected amounts.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST round away-from-zero to two decimal places every intermediate gross artist payout amount (door-split percentage result and guarantee comparison split amount) before applying tax withholding or selecting the final gross for tax computation.
- **FR-002**: System MUST apply away-from-zero rounding to two decimal places for tax withheld and for final net payout, consistent with the platform's existing monetary rounding policy for all deal types.
- **FR-003**: System MUST apply tax withholding exactly once on the selected gross artist payout for custom-formula deals, using the same rules as guarantee and door-split deals.
- **FR-004**: System MUST floor final net payout at $0.00 for all deal types when the post-tax result would otherwise be negative.
- **FR-005**: System MUST ensure that guarantee, door-split, and custom deals with equivalent gross artist payout and tax withholding percentage produce identical net payouts.
- **FR-006**: System MUST recalculate and persist corrected artist net payouts whenever deal math is invoked (line-item change, artist mutation, or explicit recalculation trigger), replacing any values that were computed under the prior inconsistent rounding behavior.
- **FR-007**: The live payout preview shown during artist deal configuration MUST use the same intermediate rounding and tax rules as the authoritative payout calculation so preview and persisted values agree.
- **FR-008**: System MUST achieve ≥80% line/branch coverage across backend and frontend for this feature (CI-enforced; Constitution III).

### Key Entities

- **Artist deal configuration**: Per-artist deal terms on an event — deal type (guarantee, door split, custom), base guarantee, backend percentage, tax withholding percentage, and optional custom formula expression.
- **Net show revenue**: Shared revenue base for all artists on an event, equal to gross revenue minus total artist deductions for the active lifecycle column.
- **Gross artist payout**: Pre-tax amount selected by deal type (guarantee comparison result, door-split percentage result, or custom formula evaluation), subject to intermediate rounding before tax.
- **Calculated net payout**: Final persisted per-artist payout after tax withholding and flooring, displayed in the ledger grid and settlement artifacts.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For a documented set of fractional-percentage test vectors (including the 33.33% of $1,000.00 case and `.005` midpoint boundaries), authoritative net payouts match expected away-from-zero results at every intermediate step with zero penny drift.
- **SC-002**: Custom-formula deals with non-zero tax withholding produce net payouts that differ from the formula gross by the correctly rounded tax amount in 100% of tested configurations.
- **SC-003**: Guarantee, door-split, and custom deals configured to the same gross and tax rate produce identical net payouts in 100% of equivalence test cases.
- **SC-004**: Live payout preview matches persisted calculated net payout after save in 100% of tested add/edit scenarios covering all three deal types.
- **SC-005**: ≥80% line/branch coverage achieved across backend and frontend code for this feature (CI-enforced; Constitution III).

## Assumptions

- The platform's established monetary rounding policy (away-from-zero to two decimal places at every rounded monetary boundary) from the original financial ledger specification remains the governing rule; this feature closes gaps in deal-math application rather than changing the policy itself.
- Custom-formula deals apply tax withholding on the formula's gross result, consistent with the original ledger requirement that tax is withheld once from the selected gross artist payout regardless of deal type.
- Correcting rounding behavior may change previously persisted artist net payouts by small amounts (typically pennies) when events are recalculated; this is acceptable because it restores correctness relative to the documented rounding policy.
- The live payout preview module introduced in the artist-formula-preview feature is in scope for parity updates; no new preview UI is required.
- No changes to custom formula token definitions, sanitization rules, or deal-type enumeration are required.
- Settlement PDF snapshots taken before this fix retain their historical values; only live/recalculated events receive corrected payouts unless a separate backfill is requested (out of scope).
