# Feature Specification: Multi-Day Events (Festivals)

**Feature Branch**: `082-multi-day-events`

**Created**: 2026-08-14

**Status**: Draft

**Input**: User description: "https://linear.app/audiodex/project/multi-day-events-festivals-1238e90624f3/overview Make sure to reference the attached documents"

**Source Documents**:

- Linear project: [Multi-day events (festivals)](https://linear.app/audiodex/project/multi-day-events-festivals-1238e90624f3) (team Split-rail)
- Attached PRD: [Multi-day events (festivals) PRD](https://linear.app/audiodex/document/multi-day-events-festivals-prd-65aa07c2b03c) — authoritative product requirements for this specification. All scope decisions below derive from that document, including its resolved recommendations in "Open Questions."

**Depends on**: Organization/tenant and RBAC foundation (spec 001), financial ledger grid and 5-column/3-block matrix (spec 002), QBO pull cache and inline mapping (specs 003, 035, 076), event workspace and list (spec 015), deal math rounding rules (spec 021), atomic settle pipeline and immutability coverage (specs 043, 044), unified booking calendar (spec 073)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Set up a festival structure from the standard event workflow (Priority: P1)

As a venue or event manager planning a 2- to 3-day event, I need to mark an event as a festival and define its name and date range so the system generates the Day and Stage/Zone structure that organizes scheduling and settlement, while standard single-day shows keep their existing workflow completely untouched.

**Why this priority**: The Festival Wrapper → Day → Stage/Zone → Programming Block hierarchy is the system of record everything else in this module builds on. Progressive enhancement protects the platform's most common use case (single stage, one headliner, one or two openers) from added complexity.

**Independent Test**: Create a festival with a name and a 3-day date range; confirm a Day exists for each date and a default Stage/Zone is auto-created. Create a standard single-day event alongside it and confirm no festival concepts appear anywhere in that flow.

**Acceptance Scenarios**:

1. **Given** the standard event creation workflow, **When** a user does not identify the event as a festival, **Then** Festival Wrapper, Day, Stage/Zone, and Programming Block concepts remain hidden and the traditional Event-centered experience is unchanged.
2. **Given** a user marks or creates an event as a festival, **When** they provide the required fields (festival name, start date, end date), **Then** the Festival Wrapper is created and a Day is generated or represented for every date in the range.
3. **Given** a festival where the user defines no stages, **When** the festival is created, **Then** the system auto-creates a single Stage/Zone with a lightweight default label.
4. **Given** a festival using more than one Stage/Zone, **When** stages are created or renamed, **Then** each Stage/Zone must have a distinct name within that event.
5. **Given** a standard event whose complexity grows (multiple days or concurrent stages), **When** the user opts into festival mode, **Then** the event transitions into the Festival Wrapper structure without losing existing event data.
6. **Given** festival creation or date edits, **When** the end date precedes the start date or the range exceeds 3 days, **Then** the action is blocked with a clear validation message (v1 scope bound).

---

### User Story 2 - Populate the itinerary with categorized programming blocks (Priority: P1)

As a talent buyer or operations scheduler, I need to add Programming Blocks — bands, exhibitions (rodeo/sports), vendors, and experiences — to specific Days and Stages/Zones so the full festival program is captured in one system of record with the right level of detail per block type.

**Why this priority**: Programming Blocks are the unit of scheduling, settlement, and reporting. Without them the festival structure is an empty shell; with them alone (plus User Story 1) the module already delivers a usable festival program of record.

**Independent Test**: On a seeded festival, create one block of each category; confirm required-field enforcement at creation, category-driven field presets, and that vendor/exhibition/experience blocks stay lightweight with no artist-style deal math visible.

**Acceptance Scenarios**:

1. **Given** a festival with Days and Stages/Zones, **When** a user creates a Programming Block, **Then** the system requires title or act name, Day, Stage/Zone, start time, end time, category, and whether settlement is required — and nothing more.
2. **Given** a block in the Standard (Bands/Music) category, **When** its detail opens, **Then** load-in, soundcheck, backline, hospitality, and settlement-related fields are shown by default and the artist-style settlement workflow is the default experience.
3. **Given** a block in the Exhibition, Vendor, or Experience category, **When** its detail opens, **Then** category-appropriate lightweight fields (logistics/safety/staffing, booth metadata, or sponsor/age-restriction/activation fields respectively) plus a large description field are shown, and advanced artist-style deal math stays hidden unless an internal user explicitly enables settlement for that block.
4. **Given** block creation, **When** optional fields (deal type, guarantee amount, percentage amount, notes, public visibility flag) are omitted, **Then** creation succeeds; payout-specific fields become required only when settlement is actually being processed.
5. **Given** the same artist appears on multiple days or stages within one festival, **When** their appearances are entered, **Then** each appearance is its own Programming Block linked to one shared artist identity — never duplicated unrelated records and never collapsed into one schedule object — and linked appearances are surfaced together in the event context with the ability to copy or reuse deal terms across them.
6. **Given** anything that appears on the itinerary or requires settlement, **When** it is entered into the festival, **Then** it must exist as a Programming Block.

---

### User Story 3 - Manage the schedule on a multi-track timeline (Priority: P2)

As an operations scheduler working a dense festival program, I need a multi-track timeline (time on the X-axis, Stages/Zones on the Y-axis) with drag-and-drop placement, same-stage conflict blocking, and change history so concurrent schedules stay coherent, resolvable, and auditable.

**Why this priority**: Concurrent multi-stage scheduling is what distinguishes festivals from standard events; conflict enforcement and audit history are the safety rails that make dense schedules operationally trustworthy.

**Independent Test**: Seed blocks across two stages. Drag one block to overlap another on the same stage and confirm the save is blocked with the conflict identified and resolution options offered; overlap the same times across different stages and confirm both save. Verify reschedule history and status audit entries are recorded.

**Acceptance Scenarios**:

1. **Given** a festival itinerary, **When** it renders, **Then** a horizontal timeline displays time on the X-axis and Stages/Zones on the Y-axis with blocks placed in their day/stage/time position.
2. **Given** active blocks on different Stages/Zones, **When** their times overlap, **Then** both save and display concurrently — different-stage overlap is core supported behavior.
3. **Given** an active block on a Stage/Zone, **When** a user tries to save another active block whose scheduled time overlaps it on the same Stage/Zone, **Then** the save is blocked, the conflicting block is clearly identified, and the user can reschedule the new block, edit the existing block, or explicitly resolve via cancellation or move.
4. **Given** a drag interaction that would create a same-stage conflict, **When** the user drags, **Then** the UI warns during the drag, shows the conflict inline, and blocks save until resolved.
5. **Given** a canceled block, or a block moved to another Day or Stage/Zone, **When** conflict validation runs, **Then** the canceled block does not block scheduling and the moved block stops blocking its previous location once reassignment completes.
6. **Given** a block is rescheduled, **When** the change saves, **Then** schedule-change history records prior start/end, new start/end, who changed it, when, and an optional reason or note.
7. **Given** a block status change (canceled, delayed, partially completed, moved), **When** it is applied, **Then** an audit trail captures prior status, new status, timestamp, user, and optional reason — and settlement/reporting treatment follows the defined per-status rules (canceled defaults to no payout if settlement has not started; delayed stays active and eligible; partially completed requires manual settlement review; moved follows the new assignment).
8. **Given** a block is canceled, moved, or materially rescheduled after settlement work has started, **When** settlement proceeds, **Then** the product surfaces a warning and requires review before settlement can be finalized — status changes never silently rewrite finalized settlement outcomes.
9. **Given** the same artist is scheduled into overlapping appearances, **When** the schedule is saved, **Then** the system warns the scheduler.
10. **Given** the itinerary, **When** a user filters by day, stage, category, or block status, **Then** the view narrows accordingly.

---

### User Story 4 - Operate the master festival ledger with controlled revenue allocation (Priority: P2)

As a finance user managing festival economics, I need festival-wide revenue and expenses aggregated in one Master Festival Ledger, with explicit control over which revenue buckets may be allocated to sub-settlements, so shared revenue (wristbands, VIP, bar) flows into individual deals accurately and can never be over-allocated.

**Why this priority**: Festivals decouple ticket revenue from individual performances; controlled allocation is the financial core that makes isolated sub-settlements mathematically safe.

**Independent Test**: Create revenue buckets, flag one as allocable, allocate percentages of it to two blocks, and confirm real-time allocated/remaining balances. Attempt to allocate past 100% and confirm a draft warning plus a hard block at settlement finalization.

**Acceptance Scenarios**:

1. **Given** a festival, **When** revenue and expenses are recorded, **Then** the Master Festival Ledger aggregates all gross revenue (e.g., 3-day wristbands, VIP upgrades, master bar sales) and show expenses (e.g., festival-wide security, fencing, stage rentals) at the festival level.
2. **Given** a revenue bucket, **When** it is defined, **Then** it carries an "allocable to sub-settlements" flag; only flagged buckets may feed deal math, and taxes, processing fees collected on behalf of others, refunds/chargebacks, artist-specific direct sales, and unclassified miscellaneous revenue are ineligible as allocable source buckets by default.
3. **Given** allocations against a shared bucket, **When** any allocation changes, **Then** the bucket shows total amount, total allocated, and remaining allocable balance in real time, and every allocation remains traceable to its named source bucket.
4. **Given** allocations that would exceed the permitted allocable amount of a bucket, **When** the settlement is in draft, **Then** the conflict is shown immediately as a warning; **When** final settlement execution is attempted, **Then** it is blocked until the over-allocation is resolved (no allocation above 100% of a source bucket without an explicit override).
5. **Given** a deal on any block, **When** its allocation is computed, **Then** the deal math engine supports flat guarantees, percentage of gross, percentage of net, bonus structures, caps, floors, and deductions.
6. **Given** any settlement calculation, **When** amounts are computed, **Then** math runs at high internal precision, rounds only at the final payable line-item level using round-half-up to the nearest cent, and resolves penny variance across participants by applying the remainder to the largest calculated allocation or presenting an explicit rounding adjustment line.
7. **Given** a shared expense that applies to multiple targets, **When** it is allocated, **Then** an explicit split method is required (equal, percentage, fixed-amount, or manual line allocation), the allocated total reconciles to the full expense amount or 100% of the split basis, any unallocated remainder is clearly shown, and every split traces back to the original expense record and method.
8. **Given** festival-wide overhead, **When** no user intentionally allocates it downward, **Then** it stays at the festival level and never flows into sub-settlements; artist-specific costs are assigned directly rather than treated as shared.
9. **Given** a shared expense allocation that affects settlement but remains unresolved, **When** finalization is attempted, **Then** it is blocked until the allocation is completed or intentionally removed from settlement treatment.
10. **Given** any allocation edit, **When** it saves, **Then** an audit trail captures who changed it, when, and the before/after values; bucket definitions are locked before final settlement execution.

---

### User Story 5 - Execute isolated sub-settlements with deliberate finalization (Priority: P3)

As a stage manager settling an act right after their set, I need an isolated, tablet-friendly settlement sheet for that specific block with a deliberate Finalize step, so the artist's payout executes safely and privately without exposing the Master Festival Ledger, and so nothing ever half-completes.

**Why this priority**: Sub-settlement execution is the payoff of the financial model, but it depends on the structure (P1) and allocation engine (P2) existing first.

**Independent Test**: Prepare a block settlement with complete mapping and finalize it on a tablet-sized viewport; confirm the PDF compiles, dispatch is recorded, and the finalized expense rolls up to the master ledger. Attempt finalization with missing mappings and confirm categorized blockers; kill a finalization step mid-flight and confirm full rollback to draft.

**Acceptance Scenarios**:

1. **Given** a settlement-required Programming Block, **When** its settlement sheet opens, **Then** it shows only that block's deal — isolating the flat guarantee or percentage split without exposing the Master Festival Ledger's total ticket gross or other participants' terms.
2. **Given** a settlement in progress, **When** a user views, saves, or previews it, **Then** nothing finalizes automatically; a settlement becomes final only when an authorized user explicitly completes the dedicated Finalize Settlement action.
3. **Given** incomplete financial mapping or missing payout-critical fields, **When** finalization is attempted, **Then** it is blocked, the settlement stays in draft, and every blocker is identified — grouped as missing revenue mapping, missing expense mapping, allocation conflicts, or missing payout-critical settlement fields — with direct links to the sections needing correction; saving draft progress remains allowed.
4. **Given** finalization proceeds, **When** any required step fails (final validation, final calculation, finalized record write, finalized audit record, PDF generation, or document dispatch handoff), **Then** the entire process rolls back with no partial finalization, the settlement remains draft, the failed step is clearly identified, the failure is logged with a reason, and retry is available once health is restored.
5. **Given** finalization succeeds, **Then** the system records who finalized, when, the finalized version/value snapshot, and dispatch outcome; the tamper-proof PDF for that artist compiles and routes to their management; and the finalized expense rolls up into the Master Festival Ledger.
6. **Given** the settlement device is offline, **When** finalization is attempted, **Then** it is blocked with a clear connectivity-required message and the settlement stays in draft — no settlement flow may finalize offline.
7. **Given** a finalized settlement needs correction, **When** a user with elevated financial permissions acts, **Then** an explicit adjustment entry is the preferred path; a full reopen requires a reason code and freeform note, warns when the document was already dispatched (with an extra confirmation step available), creates a new settlement revision rather than overwriting history, and records who reopened it, when, why, prior finalized values, new values, whether a new document was generated or sent, and who re-finalized it and when.
8. **Given** users without finalization authority (general staff, artists, schedule-only editors), **When** they attempt to finalize or reopen, **Then** the action is denied; stage managers may finalize for their assigned Stage/Zone, and venue/event managers and finance/admin roles may finalize per their broader authority.
9. **Given** an artist with multiple appearances, **When** one appearance is settled, **Then** other appearances may remain unsettled, and an artist-level rollup shows total appearances, total payouts, total allocated revenue, and activity by day or Stage/Zone.
10. **Given** a modern tablet browser (iPad-class, portrait or landscape), **When** a stage manager executes a settlement, **Then** the full flow — viewing assigned blocks, reviewing deal terms, entering deductions, validating, finalizing, and viewing the result — works with touch-optimized layouts, large tap targets, and readable financial summaries; phones support schedule review, block details, notes, and settlement status but are not the primary finalization environment.

---

### User Story 6 - Switch between internal and public itinerary views (Priority: P3)

As an internal user with itinerary access, I need to toggle between an Internal Logistics view and a Public Facing view as a personal display choice, while changing what the public actually sees stays restricted to explicitly permissioned publishers.

**Why this priority**: View separation protects sensitive logistics and financial context while letting one itinerary serve both operations and public consumption; it builds on the itinerary (P1/P2) already existing.

**Independent Test**: As a stage manager, toggle both views and confirm the active view is clearly indicated; attempt to edit a public-visible field without publisher permission and confirm denial; as an authorized manager, change public visibility and confirm the change is logged.

**Acceptance Scenarios**:

1. **Given** any internal user with itinerary access (managers, stage managers, authorized operations staff, schedulers, finance users with itinerary access, internal read-only users), **When** they toggle between Internal Logistics and Public Facing views, **Then** the switch applies as a personal viewing choice without changing anyone else's display or the published content.
2. **Given** the itinerary is displayed, **When** either view is active, **Then** the product clearly indicates whether the user is viewing the internal or public-facing itinerary.
3. **Given** a user without public-itinerary publishing permission (including stage managers by default), **When** they attempt to edit public-visible fields, control public-facing visibility, or publish the public itinerary, **Then** the action is denied; only venue/event managers, authorized operations or scheduler roles, and explicitly approved public-itinerary publisher roles may do so.
4. **Given** an authorized publisher changes public-facing visibility or publishing settings, **When** the change saves, **Then** it is logged for auditability.
5. **Given** artists, vendors, or other external parties, **When** they see itinerary information at all, **Then** it is limited to the public-facing view only — they can never toggle into internal views.

---

### User Story 7 - Reconcile QBO transactions through the single master tag (Priority: P4)

As a venue manager reconciling festival finances, I need banking transactions tagged with the festival's single master QBO project tag to import into Split-Rail, where I map each one internally to festival overhead, a Day, a Stage/Zone, or specific blocks — including splits — so the bookkeeper's QuickBooks stays clean of micro-tags while the festival retains full attribution detail.

**Why this priority**: Reconciliation closes the loop between real banking activity and festival attribution, but depends on the structure and ledger existing first.

**Independent Test**: Import transactions carrying the master tag; leave one fully at overhead, split another across a block and overhead; verify split totals can never exceed the original amount, trace both directions, and confirm a mismatched-tag transaction lands in the review-required exception queue.

**Acceptance Scenarios**:

1. **Given** a Festival Wrapper, **When** it is created, **Then** a single unified QBO project tag is generated for the entire festival (e.g., `#Fest-2026-KALISPELL`) as the external accounting key the bookkeeper applies in QBO — no per-artist or per-block QBO tags, and the integration remains strictly read-only pull.
2. **Given** imported tagged transactions, **When** they arrive, **Then** each retains its original QBO transaction reference and master tag reference.
3. **Given** an imported transaction, **When** the venue manager maps it inline, **Then** it may remain fully at festival overhead (a valid final state), map fully to one target, or be split across Days, Stages/Zones, Programming Blocks, or sub-settlements using percentage, fixed-amount, or manual line allocation.
4. **Given** transaction splits, **When** they are stored, **Then** each split is its own allocation line under the original transaction; the total of split lines plus retained overhead never exceeds the original amount, and any remaining unallocated balance stays visible until resolved or intentionally left at overhead.
5. **Given** a settlement or block, **When** a user navigates its financials, **Then** they can trace back to source transactions — and from any source transaction down to all related allocations — with each mapping recording the amount or percentage, mapping user, and timestamp.
6. **Given** a transaction with a missing, ambiguous, inconsistent, or changed tag, **When** it imports, **Then** it is flagged as a review-required reconciliation exception (states: untagged, mismatched tag, changed tag after import, mapping stale after source change, reclassification required) and excluded from automatic settlement-impacting allocation until resolved by a user with financial authority.
7. **Given** a reclassification or remap, **When** it is applied, **Then** the original import state, original tag value, prior mapping history, and reason are preserved and shown side by side with current mapping; draft impacts recalculate with changes shown, while finalized-settlement impacts require an explicit adjustment or controlled reopen — never a silent mutation.

---

### User Story 8 - Report across the festival from top to bottom (Priority: P4)

As an owner or finance user, I need festival-level P&L with day, stage, settlement-status, reconciliation, and variance views so I can see how each day and stage performed, what remains open, and how scheduled programming compared to what actually happened.

**Why this priority**: Improved visibility across days is the PRD's primary success metric; reporting is the layer that delivers it, once the underlying data exists.

**Independent Test**: Seed a festival with mixed block statuses, partial reconciliation, and some finalized settlements; run each report layer and drill from the festival P&L down to one source transaction without losing traceability.

**Acceptance Scenarios**:

1. **Given** a festival with financial activity, **When** reports run, **Then** a festival-level P&L, day-level summaries, and stage-level rollups are available.
2. **Given** blocks in varied statuses, **When** settlement status reporting runs, **Then** it segments by block status and includes counts by status, settlement status by block status, canceled and moved block logs, partial-completion exceptions, and variance between scheduled and completed programming.
3. **Given** imported transactions in varied reconciliation states, **When** reconciliation reporting runs, **Then** it distinguishes unreconciled tagged transactions, partially allocated, fully allocated, festival overhead, and expenses pushed down to Day-, Stage-, block-, or artist-level views.
4. **Given** category assignments, **When** category reporting runs, **Then** blocks, settlement counts, and operational views group by category, and artist-settlement blocks are distinguished from lightweight vendor/exhibition/experience blocks.
5. **Given** any top-level figure, **When** a user drills down, **Then** they can move from the festival financial view into individual Days, Stages/Zones, Programming Blocks, settlements, and source transactions without losing traceability.

---

### Edge Cases

- What happens when a block is canceled after settlement work has started? It enters a review-required exception path — it cannot be newly finalized or closed out without explicit review, and reporting counts it as canceled, not completed.
- What happens when a block is moved to another Day or Stage/Zone after settlement work has started? The move triggers required review before finalization and stays visible in historical reporting; before settlement work, the move simply reassigns scheduling and reporting.
- What happens when percentage allocations across participants create a penny variance? The remainder is applied to the largest calculated allocation or presented as an explicit rounding adjustment line — never silently distributed.
- What happens when an allocation would exceed a bucket's allocable amount? Draft mode shows an immediate conflict warning; final settlement execution is blocked until resolved or explicitly overridden where permitted.
- What happens when the same artist is booked into overlapping appearances? The system warns but does not hard-block, since different-stage overlap may be intentional (e.g., a special guest cameo).
- What happens when finalization is attempted offline? It is blocked with a connectivity-required message; the settlement stays in draft.
- What happens when a finalization step fails mid-flight (e.g., PDF generation)? The whole transaction rolls back; the user sees "failed with no finalization applied," the failed step, and a retry path — never a partially finalized settlement.
- What happens when an imported transaction's tag is missing, mismatched, or changed after import? It becomes a review-required reconciliation exception and cannot flow into settlement-impacting allocation until a user with financial authority resolves it.
- What happens when a reclassification affects an already-finalized settlement? The finalized outcome is never silently mutated; the change requires an explicit adjustment entry or a controlled, permissioned reopen.
- What happens when a user shrinks the festival date range after Days hold Programming Blocks? Blocks on removed Days must be explicitly resolved (moved or canceled) before the date change applies.
- What happens when a festival has only one stage? The system auto-creates a default Stage/Zone with a lightweight label so the user never has to think about stages until a second one is needed.
- What happens to standard single-day events after this ships? Nothing — they keep the existing Event-centered workflow, reporting, and financial flow with zero added steps.

## Requirements *(mandatory)*

### Functional Requirements

#### Festival structure & progressive enhancement

- **FR-001**: The standard single-day Event-centered workflow MUST remain the default and primary entry point; Festival Wrapper, Day, Stage/Zone, and Programming Block concepts MUST stay hidden until a user explicitly marks or creates an event as a festival.
- **FR-002**: Users MUST be able to create a festival — or transition an existing standard event into festival mode without data loss — by providing exactly three required fields: festival name, start date, and end date; v1 MUST reject ranges longer than 3 days with a clear message.
- **FR-003**: The system-of-record hierarchy MUST be Festival Wrapper → Day → Stage/Zone → Programming Block, with a Day generated or represented for every date in the festival range and at least one Stage/Zone for any scheduled Day.
- **FR-004**: When an event uses a single Stage/Zone the system MUST auto-create it with a lightweight default label; when more than one Stage/Zone exists each MUST have a distinct name; Stages/Zones are per-event records that exist only within their Festival Wrapper.
- **FR-005**: Programming Block creation MUST require only: title or act name, Day, Stage/Zone, start time, end time, category, and settlement-required flag; deal type, guarantee amount, percentage amount, notes/internal logistics, and public visibility MUST remain optional at creation. Payout-specific fields MUST become required only when settlement is actually processed (two-level validation).
- **FR-006**: Categories (Standard/Bands, Exhibition, Vendor, Experience) MUST drive workflow presets, default field visibility, itinerary labeling, filtering, and reporting segmentation — and MUST NOT create separate accounting engines, revenue allocation logic, permission models, or finalization flows.
- **FR-007**: Vendor, Exhibition, and Experience blocks MUST be first-class itinerary citizens using a lightweight operational workflow: minimal structured fields plus a large description field, with artist-style deal math hidden unless an internal user explicitly enables settlement for that block; when payout is needed it uses a simplified optional payout pattern, not the full artist settlement experience.
- **FR-008**: A single artist appearing multiple times in one festival MUST be modeled as one artist identity with many Programming Blocks; linked appearances MUST be surfaced together in the event context with support for copying or reusing deal terms across them.

#### Itinerary & scheduling

- **FR-009**: The itinerary MUST render as a multi-track timeline — time on the X-axis, Stages/Zones on the Y-axis — supporting drag-and-drop placement of Programming Blocks and concurrent (overlapping) times across different stages.
- **FR-010**: The system MUST block saving a Programming Block whose active scheduled time overlaps another active block on the same Stage/Zone; the UI MUST warn during drag, show the conflict inline, clearly identify the conflicting block, and offer resolution (reschedule new, edit existing, or cancel/move). Canceled blocks MUST NOT participate in conflict validation, and moved blocks MUST stop blocking their previous location once reassignment completes.
- **FR-011**: The system MUST warn when the same artist is scheduled into overlapping appearances.
- **FR-012**: Every reschedule MUST preserve schedule-change history: prior start/end, new start/end, who made the change, when, and an optional reason or note.
- **FR-013**: Programming Blocks MUST support explicit statuses with defined treatment — Canceled (off active itinerary; defaults to no payout if settlement unstarted; requires review if settlement exists; reported as canceled), Delayed (active and settlement-eligible with updated time in operational reporting; no automatic financial change), Partially completed (no automatic full payout; manual settlement review; reported distinctly), and Moved (new assignment governs; review required if settlement started; visible in history) — and every status change MUST be audit-trailed (prior status, new status, timestamp, user, optional reason).
- **FR-014**: Blocks canceled, moved after settlement work begins, or partially completed MUST enter a review-oriented exception path; status changes MUST never silently rewrite finalized settlement outcomes.
- **FR-015**: The itinerary MUST support filtering by day, stage, category, and block status.
- **FR-016**: Switching between Internal Logistics and Public Facing itinerary views MUST be a personal display choice for any internal user with itinerary access; editing public-visible fields, controlling public-facing visibility, or publishing MUST be a separately permissioned action (managers, authorized operations/scheduler roles, and approved publisher roles only — stage managers excluded by default). The active view MUST be clearly indicated, publishing/visibility changes MUST be logged, and external parties MUST only ever see the public-facing view.

#### Master ledger & allocation

- **FR-017**: The Master Festival Ledger MUST aggregate all festival gross revenue and show expenses at the festival level, adapting the existing master financial matrix.
- **FR-018**: Only revenue buckets explicitly flagged "allocable to sub-settlements" MAY feed deal math; recommended eligible buckets are single-day tickets, multi-day passes, VIP upgrades, parking, camping, festival-wide sponsorship, centrally tracked merch, and contractually shareable concessions/bar; taxes, pass-through processing fees, refunds/chargebacks, artist-specific direct sales, and unclassified miscellaneous revenue MUST be ineligible as allocable source buckets by default.
- **FR-019**: Taxes MUST be non-allocable and separate from allocable buckets unless a specific deal explicitly defines taxes in its basis; payment/platform fees MUST stay separate unless a deal explicitly uses a net-based calculation.
- **FR-020**: Each shared bucket MUST track total amount, total allocated, and remaining allocable balance in real time; every sub-settlement allocation MUST record its named source bucket, allocation type, and calculated amount; over-allocation MUST surface immediately as a draft conflict and MUST block final settlement execution unless explicitly overridden where permitted (never above 100% without override).
- **FR-021**: The deal math engine MUST support flat guarantees, percentage of gross, percentage of net, bonus structures, caps, floors, and deductions, applied globally to all event types.
- **FR-022**: Monetary math MUST compute at high internal precision and round only at the final payable line-item level, using round-half-up to the nearest cent; penny variance across participants MUST resolve via a defined rule — remainder to the largest calculated allocation or an explicit rounding adjustment line.
- **FR-023**: Shared expenses MUST use explicit, rule-based allocation: they may stay at festival level (the default for festival-wide overhead) or be intentionally allocated to a Day, Stage/Zone, or multiple blocks/acts using equal, percentage, fixed-amount, or manual line splits; allocated totals MUST reconcile to the full amount or 100% of the split basis, unallocated remainders MUST stay visible, every split MUST trace to its original expense and method, and unresolved settlement-affecting allocations MUST block finalization. Artist-specific costs MUST be assigned directly, not treated as shared.
- **FR-024**: Allocation edits MUST be audit-trailed (who, when, before/after values); bucket definitions MUST be locked before final settlement execution.
- **FR-025**: Late adjustments to draft settlements MAY recalculate automatically with changes shown; finalized settlements MUST never change silently — corrections require an explicit adjustment entry or a controlled reopen, retaining original source amounts, formula used, rounded result, adjustments, who acted, and when.

#### Sub-settlements & finalization

- **FR-026**: Every settlement-required Programming Block MUST generate an independent, isolated settlement sheet exposing only that block's deal — never the Master Festival Ledger totals or other participants' terms.
- **FR-027**: A settlement MUST become final only through an explicit, dedicated Finalize Settlement action by an authorized user — never as a side effect of viewing, saving, or previewing.
- **FR-028**: A finalization preflight MUST verify required settlement fields, valid revenue allocations, no over-allocated buckets, resolved deductions/adjustments, a visible final payable amount, and successful PDF generability; failures MUST block finalization, keep the settlement in draft, and present blockers grouped by category (missing revenue mapping, missing expense mapping, allocation conflicts, missing payout-critical fields) with direct links to fix; draft saving MUST remain available throughout.
- **FR-029**: Finalization MUST execute as an all-or-nothing transaction across final validation, final calculation, finalized record write, finalized audit record, PDF generation, and document dispatch handoff — resolving to exactly two outcomes (fully finalized, or failed with no finalization applied), logging failures with reasons, and supporting retry.
- **FR-030**: Finalization MUST be blocked while the settlement device is offline, with a clear connectivity-required message and the settlement kept in draft.
- **FR-031**: Successful finalization MUST record who finalized, when, the finalized version/value snapshot, and dispatch outcome; MUST compile the tamper-proof settlement PDF and route it to the artist's management; and MUST roll the finalized expense up into the Master Festival Ledger.
- **FR-032**: Finalization authority MUST be limited to stage managers for their assigned Stage/Zone, venue/event managers with financial authority, and finance/admin roles with override access; general staff, artists, and schedule-only editors MUST NOT finalize.
- **FR-033**: Reopening or correcting a finalized settlement MUST require elevated financial permissions, prefer explicit adjustment entries over full reopen, require a reason code and freeform note, warn (with additional confirmation) when the document was already dispatched, create a new settlement revision rather than overwriting history, and audit who reopened, when, why, prior values, new values, re-dispatch outcome, and who re-finalized and when.
- **FR-034**: An artist-level rollup MUST show, across one festival, an artist's total appearances, total payouts, total allocated revenue, and activity by day or Stage/Zone, while each block settles independently.

#### Permissions & visibility

- **FR-035**: Financial visibility MUST follow least privilege with four tiers: full financial visibility (finance/admin, managers with full event financial authority, approved read-only executive roles), scoped settlement visibility (assigned Stage/Zone, blocks, or responsibilities only), external-party visibility (own finalized settlement artifact only — never festival gross, shared buckets, or others' terms), and no financial visibility (itinerary-only users). Finalization authority MUST NOT imply Master Festival Ledger access.
- **FR-036**: The permission model MUST distinguish scheduling permission, financial allocation permission, settlement adjustment permission, finalization permission, and override/reopen permission — with no implicit grants across layers. Programming Blocks are editable by managers, assigned stage managers, and authorized operations/schedulers; revenue allocations only by finance/admin, managers with explicit financial authority, and explicitly permissioned senior settlement operators; deductions by finance/admin and managers with settlement authority, with stage managers limited to proposing predefined deduction types.
- **FR-037**: Access to the Master Festival Ledger, settlement views, and external sharing actions MUST be logged for auditability.
- **FR-038**: All festival data MUST be isolated to the owning organization; every retrieval MUST be constrained to the authenticated user's organization and respect existing venue-access boundaries.

#### QBO integration & reconciliation

- **FR-039**: Each Festival Wrapper MUST generate a single unified QBO project tag (e.g., `#Fest-2026-KALISPELL`) as the external accounting key for the bookkeeper to apply in QBO; the system MUST NOT create per-artist or per-block QBO tags, and the integration MUST remain strictly read-only pull with no QBO mutations.
- **FR-040**: Imported tagged transactions MUST retain their original QBO transaction reference and master tag reference, and MUST support internal mapping — via the inline mapping tool — to festival overhead (a valid final state), a Day, a Stage/Zone, or one or more Programming Blocks/sub-settlements, including splits by percentage, fixed amount, or manual lines.
- **FR-041**: Each split MUST be stored as its own allocation line under the original transaction; split lines plus retained overhead MUST never exceed the original transaction amount, and remaining unallocated balances MUST stay visible until resolved or intentionally left at overhead.
- **FR-042**: Users MUST be able to trace from any settlement or block back to its source transactions and from any source transaction down to all related allocations, with each mapping recording amount or percentage, mapping user, and timestamp.
- **FR-043**: Transactions with missing, ambiguous, inconsistent, or changed tags MUST become review-required reconciliation exceptions (states: untagged, mismatched tag, changed tag after import, mapping stale after source change, reclassification required), excluded from automatic settlement-impacting allocation until resolved by a user with financial authority; reclassification MUST preserve original import state, original tag, prior mapping history, and reason, shown side by side with current mapping; finalized-settlement impacts MUST route through adjustment or controlled reopen.

#### Reporting

- **FR-044**: The system MUST provide festival-level P&L, day-level summaries, stage-level rollups, settlement status reporting (segmented by block status, with canceled/moved logs and partial-completion exceptions), unreconciled expense reporting (distinguishing unreconciled, partially allocated, fully allocated, overhead, and pushed-down expenses), and variance reporting between scheduled, completed, allocated, and settled outcomes — all supporting drill-down from festival totals to Days, Stages/Zones, blocks, settlements, and source transactions without losing traceability, and all segmentable by category.

#### Scale, devices & quality

- **FR-045**: The feature MUST perform fluidly at v1 scale targets — up to 3 Days, 5–8 Stages/Zones (1–4 as the effortless common case), 150–250 Programming Blocks per event, 50–100 per day, dozens of settlement-bearing blocks, and hundreds of mapped transactions/allocation lines — with immediate same-stage conflict checks, responsive drag-and-drop, near-instant filtering, and reporting fast enough for live operational use.
- **FR-046**: Settlement execution MUST be tablet-first (modern Safari/Chrome-class tablet browsers, portrait and landscape); phones MUST support schedule review, block details, notes/logistics, and settlement status visibility; desktop remains the environment for back-office allocation, reporting, reconciliation, and exception handling. Responsive web is sufficient — no native app.
- **FR-047**: System MUST achieve ≥80% line/branch coverage across backend and frontend for this feature (CI-enforced; Constitution III).

### Key Entities

- **Festival Wrapper**: Parent container binding multiple daily itineraries into a single financial entity; required fields: festival name, start date, end date (≤3 days in v1); owns the master QBO project tag; belongs to a venue/organization.
- **Day**: One calendar date within the festival range; organizational parent for that date's Stages/Zones and blocks; generated or represented for every date in range.
- **Stage/Zone**: Per-event sub-location (e.g., Main Stage, Rodeo Arena) bound to its Festival Wrapper; distinct name required when more than one exists; the axis for same-stage conflict validation and scoped stage-manager authority.
- **Programming Block**: Individual schedule item replacing the single "Event" inside festival mode; carries title/act, Day, Stage/Zone, start/end times, category, settlement-required flag, optional deal fields, status (active/canceled/delayed/partially completed/moved), and public visibility; links to one artist identity when applicable.
- **Category**: One of Standard (Bands/Music), Exhibition, Vendor, Experience; drives field presets, workflow weight, labeling, filtering, and report segmentation only.
- **Schedule Change Record**: Audit entry for a reschedule or status change — prior/new times or statuses, user, timestamp, optional reason.
- **Revenue Bucket**: Named festival-level revenue line (e.g., 3-day wristbands) with an allocable-to-sub-settlements flag and real-time total/allocated/remaining balances; locked before final settlement execution.
- **Revenue Allocation**: Link from a bucket to a sub-settlement recording allocation type (flat, % gross, % net, bonus, cap, floor, deduction context) and calculated amount; fully traceable and audit-trailed.
- **Shared Expense & Split**: Festival-level expense with optional rule-based splits (equal/percentage/fixed/manual) to Days, Stages/Zones, or blocks; must reconcile to the full amount; overhead is the default resting state.
- **Sub-Settlement**: Independent, isolated settlement sheet for one Programming Block; states draft → finalized, with revisions and adjustment entries; captures finalization actor, timestamp, value snapshot, PDF artifact, and dispatch outcome.
- **Imported QBO Transaction & Allocation Line**: Read-only imported transaction retaining original QBO reference and master tag, with zero or more internal allocation lines to overhead/Day/Stage/block/sub-settlement targets; carries a reconciliation state, including exception states.
- **Artist Rollup (view)**: Cross-block aggregation for one artist within one festival — appearances, payouts, allocated revenue, and day/stage activity.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A venue manager can set up a complete 2-day, 2-stage festival with 20 programming blocks — structure, itinerary, and categories — in under 30 minutes without training material.
- **SC-002**: 100% of attempted same-stage double-bookings are blocked before save in acceptance testing, with the conflicting block identified and a resolution path offered every time.
- **SC-003**: With a seeded festival at full v1 scale (3 days, 8 stages, 250 blocks), itinerary filtering, drag interactions, and view switches respond in under 1 second in user acceptance testing.
- **SC-004**: Zero partially finalized settlements across all finalization testing — every attempt ends either fully finalized or in unchanged draft with the failed step identified.
- **SC-005**: 100% of sub-settlement allocations trace to a named source bucket, and no settlement can finalize while any of its source buckets is over-allocated, across all tested scenarios.
- **SC-006**: In moderated sessions, finance users answer day-level questions — "what did Day 2 gross," "which stage is over budget," "which settlements are still open" — from festival views in under 60 seconds each, without exporting to spreadsheets (primary PRD metric: improved visibility across days).
- **SC-007**: Standard single-day event creation requires zero additional steps or new concepts after this feature ships, verified by an unchanged step count in the existing flow.
- **SC-008**: External settlement recipients receive only their own finalized settlement artifact — zero exposure of festival-wide gross, shared bucket details, or other participants' terms in 100% of dispatch tests.
- **SC-009**: A stage manager can complete an on-tablet settlement — review deal terms, enter deductions, resolve blockers, finalize — in under 5 minutes for a standard flat-guarantee deal in usability testing.
- **SC-010**: Every imported master-tagged transaction is visible with an explicit reconciliation state, and 100% of exception-state transactions are excluded from settlement-impacting allocation until resolved.
- **SC-011**: ≥80% line/branch coverage achieved across backend and frontend code for this feature (CI-enforced; Constitution III).

## Assumptions

- **3-day cap enforced in v1**: The PRD targets events of 3 days or fewer; v1 blocks longer ranges at creation/edit rather than allowing unoptimized longer events, while the underlying model avoids hard-coding limits that would block future extension.
- **Scale bounds**: v1 optimizes for 5–8 stages and 150–250 blocks per event (50–100/day); larger scales are out of scope for performance tuning and QA.
- **Progressive enhancement**: Standard events may be internally mapped to a lightweight equivalent structure for future extensibility, but their UI and workflow remain the traditional Event-centered experience unless festival mode is invoked.
- **Artist identity**: Existing artist records provide the single artist identity referenced by multiple Programming Blocks; no new artist-management surface is introduced.
- **Permissions build on existing RBAC**: The new permission layers (scheduling, allocation, adjustment, finalization, override/reopen, public publishing) extend the platform's existing role model rather than replacing it.
- **QBO stays read-only**: The master tag is generated by Split-Rail for the bookkeeper to apply inside QBO; the platform never writes to QBO (Constitution IV). Per-block attribution lives entirely inside Split-Rail.
- **Rounding alignment**: "Round half up to the nearest cent" aligns with the platform's established ledger rounding standard (away-from-zero at final payable lines) for the positive amounts settlements deal in.
- **Settlement immutability**: Existing settled/reconciled immutability guardrails and the atomic settle pipeline extend to festival sub-settlements; finalized festival settlements obey the same freeze rules.
- **Fixed category set**: The four categories (Standard, Exhibition, Vendor, Experience) are a fixed set in v1; custom categories are not supported.
- **Public view is in-product**: The Public Facing itinerary is a display mode within the application; standalone public microsites, embeds, or feeds are separate future work.
- **Offline behavior**: Responsive web only; no native app and no offline finalization. Draft work requires connectivity as elsewhere in the platform.
- **Date-range edits**: Shrinking a festival's range with blocks on removed Days requires explicit resolution (move or cancel) before the change applies — a reasonable default the PRD does not address directly.

## Dependencies

- Organization/tenant isolation and RBAC foundation (spec 001) — org scoping and role layers.
- Financial ledger grid and master matrix (spec 002) — the 5-column/3-block structure the Master Festival Ledger adapts.
- QBO pull cache, inline mapping, and sync (specs 003, 035, 076) — read-only import and the inline mapping tool extended to festival targets.
- Event workspace and event list (spec 015) — the standard event entry point festival mode branches from.
- Deal math rounding rules (spec 021) — established rounding behavior extended to allocation math.
- Atomic settlement pipeline and immutability coverage (specs 043, 044) — the all-or-nothing finalization pattern sub-settlements adopt.
- Unified booking calendar (spec 073) — calendar surface festival events appear on; multi-track itinerary is a new, separate view.

## Out of Scope

- Week-long or large-scale festival optimization (thousands of blocks, more than ~8 stages) — architecture must not preclude it, but no workflow, performance, or QA investment in v1.
- Native mobile applications and offline settlement finalization.
- Separate accounting engines, revenue logic, permission models, or finalization flows per category; custom or user-defined categories.
- Reusable cross-event stage/sub-location libraries (stages are per-event in v1).
- Additional per-artist or per-block QBO tags, or any QBO write operations (prohibited by Constitution IV).
- Standalone public festival websites, embeddable public itineraries, or external feeds.
- Ticketing-platform integrations for revenue import beyond the existing QBO pull model.
- Automated money movement — the system produces settlement documents and records payouts; it does not execute payments.
