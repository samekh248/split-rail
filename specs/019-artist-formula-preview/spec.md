# Feature Specification: Artist Edit Flow with Live Formula Preview

**Feature Branch**: `019-artist-formula-preview`

**Created**: 2026-06-17

**Status**: Draft

**Input**: User description: "Artist edit flow + live formula preview & inline token modifiers" (Linear SPLR-30) — Venue managers can add and remove artist deals on an event ledger, but cannot edit an existing artist's deal configuration after creation. The custom-formula editor lists available financial tokens as read-only text with no way to insert them, and net payout is shown only after saving and server recalculation. This feature completes the artist-deal configuration experience: edit existing deals, click-to-insert formula tokens, and a live payout preview that updates as deal inputs change.

## Clarifications

### Session 2026-06-17

- Q: Which permission governs artist-deal editing during budget-locked vs. unlocked Pre-Show? → A: Column-aware — financials-edit permission while the budget is unlocked; settlement-edit permission while the budget is locked during Pre-Show.
- Q: How should users change artist performance order among existing deals? → A: Up/down reorder controls in the artist list (no numeric performance-order field).
- Q: What edit interaction pattern should the artist-deals panel use? → A: Shared add/edit form — Edit populates the existing bottom form; only one artist in edit at a time.
- Q: When should artist reorder (up/down) changes persist? → A: Immediate save — each up/down click persists the new performance order right away.
- Q: What happens to unsaved form changes when switching Edit/Add target? → A: Confirmation prompt — warn if unsaved changes exist; user confirms discard or stays on current edit.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Edit an existing artist deal (Priority: P1)

A venue general manager reviewing a show budget discovers an artist's deal type, guarantee, split percentage, tax withholding, or custom formula was entered incorrectly. From the artist-deals section on the event ledger, they click Edit on an existing artist, the shared bottom form populates with that artist's saved values, they change one or more fields, save, and the updated deal is persisted. Only one artist may be in edit mode at a time; starting a new edit or add cancels any unsaved in-progress edit after confirmation or discard.

**Why this priority**: Without edit capability, managers must delete and re-add artists to fix mistakes, losing performance order context and risking data-entry errors. Editing is the foundational gap blocking day-to-day deal configuration.

**Independent Test**: On a Pre-Show event with at least one artist, change the deal type or base guarantee on an existing artist, save, reload the ledger, and confirm the updated values and payout persist.

**Acceptance Scenarios**:

1. **Given** a Pre-Show event with an existing artist deal, **When** a user with artist-edit permission opens and saves changes to artist name, deal type, base guarantee, backend percentage, tax withholding percentage, or custom formula, **Then** the changes are persisted and the artist's calculated net payout updates to match the new configuration.
2. **Given** an existing artist on a Pre-Show event, **When** a user views the artist-deals section, **Then** each artist has an Edit affordance that populates the shared bottom add/edit form with that artist's saved values.
3. **Given** multiple artists on a Pre-Show event, **When** a user with edit permission clicks up/down reorder on an artist row, **Then** the new performance order is saved immediately and the list reflects the updated sequence without a separate save action.
4. **Given** a user editing an artist in the shared bottom form, **When** they cancel or discard changes, **Then** the form clears or returns to add mode and reverts to the last saved values without persisting partial edits.
5. **Given** a user is editing one artist in the shared form with unsaved changes, **When** they click Edit on a different artist or switch to add mode, **Then** a confirmation prompt warns of unsaved changes and the user may confirm discard to switch or cancel to remain on the current edit.
6. **Given** a save fails due to permission denial, validation error, stale version conflict, or network error, **When** the user attempts to save, **Then** they see a clear error message and the UI reflects the last known saved state.
7. **Given** an event in Settled or Reconciled status, **When** any user views artist deals, **Then** edit controls are hidden or disabled and existing deal values are shown read-only.
8. **Given** a Pre-Show event with an unlocked budget, **When** a user with financials-edit permission views artist deals, **Then** add, edit, remove, preview, and token-insertion controls are available.
9. **Given** a Pre-Show event with a locked budget, **When** a user with settlement-edit permission (and without financials-edit for the unlocked proforma column) views artist deals, **Then** add, edit, remove, preview, and token-insertion controls remain available.
10. **Given** a Pre-Show event and a user who lacks permission for the active budget state, **When** they view artist deals, **Then** deal configuration is read-only (no add, edit, remove, or token insertion) while saved payout values remain visible.

---

### User Story 2 - Live payout preview while configuring a deal (Priority: P1)

While adding or editing an artist deal, a manager needs immediate feedback on how their inputs affect net payout before committing a save. As they change deal type, guarantee, split percentage, tax withholding, or custom formula text, a preview of the estimated net payout updates promptly so they can iterate on deal terms without save-and-wait cycles.

**Why this priority**: Deal configuration is iterative. Waiting until after save and server recalculation slows negotiation and increases the risk of publishing incorrect payouts. Live preview delivers the core value promised in the original ledger product requirements.

**Independent Test**: On a Pre-Show event, open the add-artist or edit-artist form, change the backend percentage or custom formula, and confirm the previewed net payout updates within one second without saving.

**Acceptance Scenarios**:

1. **Given** a user is adding or editing an artist deal on a Pre-Show event, **When** they change any deal input (deal type, base guarantee, backend percentage, tax withholding, or custom formula), **Then** a live net-payout preview updates to reflect the current unsaved inputs against the event's current revenue and deduction totals.
2. **Given** a custom-formula deal with a valid formula, **When** the user edits the formula text, **Then** the preview recalculates using the same token values and rounding rules as the authoritative deal-math engine.
3. **Given** a guarantee or door-split deal type, **When** the user changes deal inputs, **Then** the preview applies the correct standard deal-type rules (including guarantee comparison and tax withholding) without requiring a save first.
4. **Given** a custom formula that cannot be parsed or evaluated, **When** the user enters invalid formula text, **Then** the preview shows a clear validation message and does not display a misleading payout amount.
5. **Given** a user saves a deal configuration, **When** the save succeeds, **Then** the previewed payout matches the artist's persisted calculated net payout shown in the artist list (within normal rounding).

---

### User Story 3 - Insert formula tokens with one click (Priority: P2)

A manager building a custom payout formula needs to reference named financial tokens (gross revenue, total deductions, base guarantee, split percentage) without typing token names manually. Each available token is presented as an actionable control; clicking a token inserts it into the formula at the current cursor position (or appends if no cursor focus), reducing typos and speeding formula authoring.

**Why this priority**: Token insertion is a usability accelerator for custom deals. It depends on the formula editor being reachable (add/edit flows from P1) but delivers standalone value for formula accuracy.

**Independent Test**: Open the custom-formula editor, place the cursor mid-expression, click the "GrossRevenue" token control, and confirm the token name is inserted at the cursor without overwriting unrelated text.

**Acceptance Scenarios**:

1. **Given** a user is editing a custom-formula deal (add or edit flow), **When** they click a token control, **Then** the corresponding token name is inserted into the formula text at the cursor position, or appended at the end if the formula field does not have focus.
2. **Given** the formula editor is shown, **When** the user views available tokens, **Then** all four supported tokens (gross revenue, total deductions, base guarantee, split percentage) are listed as clickable controls, not read-only labels alone.
3. **Given** the formula editor is disabled (read-only event or insufficient permission), **When** the user views token controls, **Then** token insertion controls are also disabled.
4. **Given** a user inserts a token, **When** the insertion completes, **Then** the live payout preview recalculates if the resulting expression is valid.

---

### Edge Cases

- **Multi-artist events**: preview for the artist being edited uses shared event-level revenue and deduction totals; editing one artist does not change another artist's saved payout until that artist is also updated. Reordering artists updates display/set order only and does not by itself change payout math.
- **Zero gross revenue or zero-value deductions**: preview produces a defined result (including zero payout for standard deals where applicable) without error.
- **Deductions exceed gross revenue**: net show revenue may be negative; preview follows existing deal-math rules for standard and custom deal types.
- **Fractional percentages and rounding boundaries**: preview rounds monetary results to two decimal places using away-from-zero rules, matching persisted payouts.
- **Malformed custom formula during typing**: preview shows a validation state rather than a stale or fabricated payout while the expression is incomplete.
- **Concurrent edit**: if another user changed or removed the same artist while the current user is editing, save is rejected with a conflict message prompting refresh.
- **Unsaved edit switch**: if a user is editing one artist in the shared form with unsaved changes and selects Edit on another artist or Add mode, a confirmation prompt warns them; confirming discards unsaved changes and switches target, canceling keeps them on the current edit with changes intact.
- **Reorder failure**: if an immediate reorder save fails (permission, conflict, network), the list reverts to the last known saved order and the user sees a clear error.
- **Cross-tenant access**: users cannot view or edit artist deals on events outside their organization.
- **Permission mismatch during Pre-Show**: a user with settlement-edit only can edit artist deals after budget lock but not while the budget is unlocked (and vice versa for users with financials-edit only before lock); users with neither permission see all deal controls read-only.
- **Settled or reconciled events**: all artist-deal fields and token controls are read-only; server-side mutation attempts are rejected.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow users to edit configurable deal fields on an existing artist deal (artist name, deal type, base guarantee, backend percentage, tax withholding percentage, and custom formula when deal type is custom) while the event is in Pre-Show.
- **FR-001a**: System MUST allow users to reorder artists via up/down controls in the artist list, persisting each reorder immediately without exposing a numeric performance-order input field or requiring a separate save action.
- **FR-001b**: System MUST use a single shared bottom form for both adding and editing artist deals; selecting Edit on an artist populates the form with that artist's saved values, only one artist may be in edit mode at a time, and switching Edit/Add targets with unsaved changes MUST show a confirmation prompt allowing the user to discard and switch or cancel and remain on the current edit.
- **FR-002**: System MUST persist artist-deal edits through the existing artist update flow and reflect saved changes in the artist list and deal-math totals after successful save.
- **FR-003**: System MUST reject artist-deal edits when the event status is Settled or Reconciled, with clear feedback to the user.
- **FR-004**: System MUST apply optimistic concurrency to artist-deal saves: a save based on a stale record version MUST be rejected with a conflict response and MUST NOT silently overwrite a concurrent change.
- **FR-005**: System MUST display a live net-payout preview while a user is adding or editing an artist deal, updating promptly as deal inputs change without requiring a save first.
- **FR-006**: Live preview MUST use the event's current revenue and artist-deduction totals and the same deal-type rules, token definitions, sanitization, and rounding behavior as the authoritative deal-math calculation.
- **FR-007**: When a custom formula is invalid or cannot be evaluated during editing, the preview MUST show a clear validation message and MUST NOT display a misleading payout figure.
- **FR-008**: After a successful save, the previewed payout MUST match the persisted calculated net payout for that artist.
- **FR-009**: System MUST present the four supported custom-formula tokens (gross revenue, total deductions, base guarantee, split percentage) as clickable insertion controls in the formula editor.
- **FR-010**: Clicking a token control MUST insert the token name into the formula text at the current cursor position, or append at the end when the formula field lacks cursor focus.
- **FR-011**: Token insertion controls MUST be disabled whenever the formula editor is read-only.
- **FR-012**: Artist-deal add, edit, remove, preview, and token-insertion affordances MUST respect event lifecycle state and column-aware permissions: financials-edit permission while the budget is unlocked during Pre-Show; settlement-edit permission while the budget is locked during Pre-Show. Users without permission for the active budget state MUST see deal configuration read-only.
- **FR-013**: System MUST achieve ≥80% line/branch coverage across backend and frontend for this feature (CI-enforced; Constitution III).

### Key Entities

- **Event Artist Deal**: A performing artist's deal configuration on an event, including name, performance order, deal type (guarantee, door split, custom), monetary guarantee, backend split percentage, tax withholding percentage, optional custom formula expression, version for concurrency, and calculated net payout after save.
- **Formula Token**: A named placeholder in a custom formula that resolves to a financial input at evaluation time — gross revenue, total deductions, base guarantee, or normalized split percentage.
- **Live Payout Preview**: An ephemeral estimated net payout shown during add/edit before save, derived from current unsaved deal inputs and the event's current ledger totals.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can correct an existing artist deal configuration and see the updated payout reflected in the ledger within 10 seconds of opening edit mode (excluding network outages).
- **SC-002**: Live payout preview updates within 1 second of a deal-input change in 95% of interactions during user testing on a typical show budget.
- **SC-003**: In validation testing, previewed payouts match persisted calculated payouts after save for 100% of tested guarantee, door-split, and valid custom-formula scenarios.
- **SC-004**: Users can insert all four formula tokens via clickable controls without typing token names, completing a standard custom-formula template in under 30 seconds in usability testing.
- **SC-005**: Zero instances of misleading payout amounts shown for known-invalid custom formulas during edit (validation message shown instead).
- **SC-006**: ≥80% line/branch coverage achieved across backend and frontend code for this feature (CI-enforced; Constitution III).

## Assumptions

- The backend already supports updating artist deal records and recalculating payouts on save (original ledger specification FR-025); this feature focuses on the missing edit UI, token insertion, and live preview experience.
- Artist-deal editing is limited to Pre-Show events, consistent with existing add/remove behavior and ledger immutability rules after settlement.
- Artist-deal edit permission follows the same column-aware model as ledger structure edits (spec 018): financials-edit when the budget is unlocked, settlement-edit when locked during Pre-Show.
- Live preview may be computed locally or via a debounced server preview, provided results match authoritative deal math and respond within the success-criteria timing targets; the choice does not change user-visible behavior.
- Revenue and deduction totals used for preview reflect the active ledger column for the current event state (proforma before budget lock, settlement after lock), matching existing deal-math behavior.
- The artist-deals panel remains embedded in the event ledger view rather than a separate standalone dashboard page.
- Switching Edit/Add targets with unsaved form changes shows a confirmation prompt; reorder actions persist immediately and are not affected by unsaved form state.
- New artists added during Pre-Show receive the next sequential performance order automatically; explicit order changes use list reorder controls only.
- Standard deal-type math rules (guarantee comparison, tax withholding applied once, independent per-artist calculation) remain unchanged from the original ledger specification.

## Dependencies

- Original financial ledger grid and artist-deal configuration (spec 002), including deal types, custom-formula evaluation rules, and Pre-Show edit lifecycle.
- Artist deduction flag UI (spec 018) for accurate total-deduction inputs used in preview and payout math, when deployed; preview uses whatever deduction totals the ledger currently exposes.
