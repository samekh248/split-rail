# Feature Specification: Enforce State Guard on Ledger Recalculate

**Feature Branch**: `046-ledger-recalculate-state-guard`

**Created**: 2026-06-20

**Status**: Draft

**Input**: Linear [SPLR-34](https://linear.app/audiodex/issue/SPLR-34/enforce-state-guard-on-ledgerservicerecalculateasync) — Enforce state guard on LedgerService.RecalculateAsync

**Linear Issue**: [SPLR-34](https://linear.app/audiodex/issue/SPLR-34/enforce-state-guard-on-ledgerservicerecalculateasync)

**Depends on**: Night-of settlement freeze pipeline (SPLR-19 / specs 004), frozen-mutation audit logging (SPLR-36 / specs 039), immutability verification after full settle (SPLR-39 / specs 044)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Recalculate on settled events is rejected before payout mutation (Priority: P1)

As a compliance stakeholder, I need the ledger recalculate operation to validate event lifecycle state before recomputing and persisting artist payout values, so that `calculated_net_payout` on artist records cannot drift after a show has been frozen at settlement.

**Why this priority**: The recalculate path recomputes deal math and persists payout values onto artist records. Without the same frozen-state guard used by line-item and artist mutation paths, this operation bypasses settlement immutability and can alter financial records that are embedded in the archived settlement document.

**Independent Test**: Finalize an event through the complete settlement workflow, invoke the recalculate operation, and confirm the request is rejected with an explicit client error, a structured immutability audit entry is recorded, artist payout values remain unchanged, and the archived settlement document is byte-identical.

**Acceptance Scenarios**:

1. **Given** an event in `SETTLED` state with stored artist payout values and an archived settlement document, **When** an authorized user triggers recalculate, **Then** the operation is rejected before any artist payout values are persisted, an immutability audit entry identifies the recalculate operation class, and the archived settlement document remains unchanged.
2. **Given** an event in `RECONCILED` state reached through the sanctioned reconciliation workflow, **When** an authorized user triggers recalculate, **Then** the operation is rejected with the same immutability enforcement as other frozen-state mutation paths and artist payout values remain unchanged.
3. **Given** an event in `PRE_SHOW` or other editable lifecycle state, **When** an authorized user triggers recalculate, **Then** payout values are recomputed and persisted normally without frozen-state rejection.

---

### User Story 2 - Recalculate rejection is proven across all deal types (Priority: P1)

As an audit reviewer, I need automated verification that recalculate rejection on frozen events holds regardless of artist deal configuration (guarantee, door-percentage, or custom formula), so the guard cannot be bypassed by deal-math code paths that only execute for specific deal types.

**Why this priority**: Recalculate internally branches on deal type when computing payouts. A guard placed only on one deal path—or verified by a single-deal test—would leave other configurations exposed to the same immutability bypass.

**Independent Test**: Finalize one event per deal type (guarantee, door, custom formula), trigger recalculate on each, and confirm every attempt is rejected, logged, and leaves artist payout values unchanged.

**Acceptance Scenarios**:

1. **Given** a finalized `SETTLED` event whose artist uses a guarantee deal, **When** recalculate is invoked, **Then** the request is rejected, an immutability audit entry is logged, and `calculated_net_payout` remains unchanged.
2. **Given** a finalized `SETTLED` event whose artist uses a door-percentage deal, **When** recalculate is invoked, **Then** the request is rejected, an immutability audit entry is logged, and `calculated_net_payout` remains unchanged.
3. **Given** a finalized `SETTLED` event whose artist uses a custom-formula deal, **When** recalculate is invoked, **Then** the request is rejected, an immutability audit entry is logged, and `calculated_net_payout` remains unchanged.

---

### User Story 3 - Rejected recalculate attempts are auditable and user-visible (Priority: P2)

As a support engineer investigating a blocked recalculate request, I need the rejection to surface a clear client error and emit a structured immutability audit log entry with event, venue, user, and operation context, so the block is distinguishable from unrelated failures.

**Why this priority**: Constitution immutability rules require explicit, logged rejection—not silent no-ops. Operators triggering recalculate from the ledger workspace must understand why the action failed.

**Independent Test**: Trigger recalculate on a frozen event and confirm the response indicates a ledger-state violation (HTTP 400 equivalent), a structured audit log entry is searchable by event id, and no partial payout persistence occurs.

**Acceptance Scenarios**:

1. **Given** a recalculate attempt on a `SETTLED` or `RECONCILED` event, **When** the guard rejects the operation, **Then** the client receives an explicit error indicating the event cannot be modified in its current state.
2. **Given** a rejected recalculate on a frozen event, **When** operational logs are queried by event id, **Then** at least one structured immutability audit entry identifies the recalculate operation class and the event lifecycle state.
3. **Given** a rejected recalculate on a frozen event, **When** artist payout records are inspected, **Then** no artist on that event has an updated payout value from the rejected attempt.

---

### Edge Cases

- **Recalculate after reconcile**: Reconciled events remain fully frozen for payout recalculation; only sanctioned reconciliation workflows may update permitted fields elsewhere—recalculate must still reject on `RECONCILED`.
- **Multi-artist events**: Events with multiple artists must reject recalculate without updating any artist's payout, even when deal types differ within the same event.
- **Concurrent recalculate and read**: A rejected recalculate must not alter payout values while concurrent authorized read operations return the frozen grid.
- **Indirect recalculate via other mutations**: Line-item and artist mutations that internally trigger recalculation on editable events must continue to work; this feature governs only the explicit recalculate entry point and ensures it cannot run on frozen events.
- **Repeated recalculate attempts**: Each rejected attempt on a frozen event produces its own audit log entry (no deduplication).
- **Unauthenticated or out-of-scope access**: Authorization failures follow existing patterns; immutability audit entries apply when an in-scope frozen event is targeted.

## Requirements *(mandatory)*

### Functional Requirements

#### State Validation on Recalculate Path

- **FR-001**: The ledger recalculate entry path MUST validate the target event's lifecycle state before recomputing or persisting any change to artist payout values on `event_artists` records.
- **FR-002**: When the target event is in `SETTLED` or `RECONCILED` state, the recalculate path MUST reject the operation with an explicit, unswallowed ledger-state error (HTTP 400 equivalent) before persisting payout changes.
- **FR-003**: When recalculate is rejected on a frozen event, the system MUST NOT persist changes to `calculated_net_payout` or any other artist financial fields on that event.
- **FR-004**: Recalculate on non-frozen lifecycle states MUST continue to recompute and persist artist payout values using existing deal-math rules without regression.

#### Audit and Observability

- **FR-005**: Rejected recalculate attempts on frozen events MUST emit a structured immutability audit log entry identifying event id, venue id, acting user id (when authenticated), event lifecycle state, and the recalculate operation class—consistent with the frozen-mutation audit contract in specs 039.
- **FR-006**: Rejected recalculate attempts MUST use the same frozen-state rejection mechanism as other guarded ledger mutation paths (line-item create/update/delete), ensuring consistent error semantics and logging taxonomy.

#### Verification

- **FR-007**: Automated verification MUST prove recalculate rejection on finalized `SETTLED` events with an immutability audit entry and unchanged artist payout values.
- **FR-008**: Automated verification MUST prove recalculate rejection on `RECONCILED` events with an immutability audit entry and unchanged artist payout values.
- **FR-009**: Automated verification MUST prove recalculate rejection on finalized events independently for guarantee, door-percentage, and custom-formula deal configurations.
- **FR-010**: Automated verification MUST confirm the archived settlement document bytes remain unchanged after a rejected recalculate attempt on a finalized event.
- **FR-011**: System MUST achieve ≥80% line/branch coverage across backend and frontend for this feature (CI-enforced; Constitution III).

### Key Entities

- **Event (lifecycle state)**: A show record with lifecycle states including `SETTLED` (settlement frozen, archived document stored) and `RECONCILED` (post-settlement reconciliation complete). State determines whether payout recalculation may persist.
- **Event Artist**: An artist configuration on an event carrying deal type, deal parameters, and the computed `calculated_net_payout` value that recalculate would overwrite.
- **Recalculate Operation**: An explicit ledger action that reloads line items and artists, recomputes show revenue summaries, runs deal math per artist, and persists updated payout values.
- **Deal Type**: The artist compensation model (guarantee, door-percentage, or custom formula) that determines which deal-math branch executes during recalculate—each must be guarded equally on frozen events.
- **Immutability Audit Entry**: A structured log record emitted when a frozen-state mutation is rejected, capturing event context and operation classification for compliance review.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of automated verification cases confirm recalculate on `SETTLED` events is rejected with zero change to artist payout values.
- **SC-002**: 100% of automated verification cases confirm recalculate on `RECONCILED` events is rejected with zero change to artist payout values.
- **SC-003**: 100% of automated verification cases confirm recalculate rejection on finalized events for guarantee, door-percentage, and custom-formula deal types each produce an immutability audit entry and unchanged payout values.
- **SC-004**: 100% of rejected recalculate attempts on frozen events produce a structured immutability audit entry within the same request lifecycle.
- **SC-005**: Zero production incidents of post-settlement `calculated_net_payout` drift caused by the recalculate entry path after this feature ships (measured over first 90 days via immutability audit log review).
- **SC-006**: ≥80% line/branch coverage achieved across backend and frontend code for this feature (CI-enforced; Constitution III).

## Assumptions

- Event lifecycle states `SETTLED` and `RECONCILED` and their immutability semantics are already defined (specs 004, 033); this feature closes the audit gap on the explicit recalculate entry path identified in SPLR-19 immutability review.
- Other ledger mutation paths (line-item CRUD, artist CRUD, budget lock) already enforce frozen-state guards; recalculate must align with that pattern.
- The existing frozen-mutation audit logging infrastructure (specs 039) will classify recalculate rejections under a dedicated operation label consistent with other ledger operations.
- Frontend changes are limited to surfacing the same ledger-state error if recalculate is exposed in the UI; the primary enforcement is on the recalculate write path.
- Deal types in scope for verification are guarantee, door-percentage, and custom-formula—the three standard compensation models supported by the deal math engine.
- This feature does not change deal-math formulas or editable-state recalculate behavior; it only blocks persistence on frozen events.
