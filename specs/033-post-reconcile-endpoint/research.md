# Research: Post-Show Event Reconciliation Transition

**Feature**: 033-post-reconcile-endpoint  
**Date**: 2026-06-18

## 1. Controller placement

**Decision**: Add `POST reconcile` to existing `SettlementController` at `api/venues/{venueId}/events/{eventId}/reconcile`.

**Rationale**: Linear SPLR-73 specifies this route. `SettlementController` already owns `settle`, `reverse-settlement`, and `settlement-pdf` on the same venue/event route prefix. Reconcile is the next lifecycle step after settlement freeze.

**Alternatives considered**:
- `EventsController` — rejected; settlement lifecycle actions are grouped under `SettlementController`.
- Dedicated `ReconciliationController` — rejected; single-action feature; adds routing fragmentation.

## 2. Service layer placement

**Decision**: Add `ReconcileAsync` to existing `SettlementService`.

**Rationale**: Service already implements `FinalizeAsync` (PRE_SHOW → SETTLED) and `ReverseAsync` (SETTLED → editable). Reconcile (SETTLED → RECONCILED) is adjacent lifecycle logic with identical venue/event loading and row-lock patterns (`LoadEventForFinalizeWithLockAsync`).

**Alternatives considered**:
- New `ReconciliationService` — acceptable but duplicates loading/locking code; rejected for YAGNI.
- Method on `EventService` — rejected; `EventService` guards against SETTLED/RECONCILED mutations for metadata CRUD.

## 3. HTTP semantics

**Decision**:
- `POST .../reconcile` → **200 OK** with `EventResponse` body (empty request body).
- Invalid state (not SETTLED) → **400 Bad Request** (`SettlementStateException`).
- Concurrent loser → **409 Conflict** (`ConcurrencyConflictException`).
- Missing permission → **403 Forbidden**.
- Cross-org / inaccessible venue / wrong venue → **404 Not Found**.

**Rationale**: Mirrors `lock-budget` (200 + `EventResponse`) for lifecycle transitions that return updated event state. Settlement finalize returns `SettlementResultDto` because it includes signature/PDF-specific fields; reconcile only advances status + audit metadata, so `EventResponse` is sufficient and consistent with GET/list endpoints.

**Alternatives considered**:
- 204 No Content — rejected; spec FR-007 requires metadata visible in response and subsequent reads.
- Dedicated `ReconcileResultDto` — rejected; extending `EventResponse` avoids parallel DTO maintenance (Constitution VI).

## 4. Authorization gate

**Decision**: `[RequirePermission(PermissionNames.TriggerQboSync)]` (`can_trigger_qbo_sync`).

**Rationale**: Linear SPLR-73 and spec FR-003 tie reconcile to accounting-sync-capable operators. Post-show reconciliation follows QBO variance review workflows.

**Alternatives considered**:
- `can_view_financials` — rejected; too permissive for lifecycle state change.
- `can_sign_settlement` — rejected; signing freezes settlement; reconciling is a distinct post-show accounting step.
- New `can_reconcile_events` permission — rejected; YAGNI; sync permission is the established gate.

## 5. Persistence: reconciliation metadata

**Decision**: Add nullable columns `reconciled_at` (`timestamptz`) and `reconciled_by_user_id` (`uuid` FK → `users.id` ON DELETE SET NULL) on `events`, mirroring `settled_at` / `settled_by_user_id`.

**Rationale**: Clarification session 2026-06-18 chose audit metadata parity with settlement pattern. Supports dashboard/event reads without join-heavy audit tables.

**Alternatives considered**:
- Status-only update — rejected per clarification.
- Separate `event_reconciliations` audit table — rejected; over-engineered for v1 single transition.

## 6. Constitution V: sanctioned events mutation

**Decision**: `ReconcileAsync` is an explicit, sanctioned mutation of the `events` row that updates only `status`, `reconciled_at`, and `reconciled_by_user_id`. It does not modify `financial_line_items`, `event_artists`, settlement snapshot fields, or PDF reference.

**Rationale**: Constitution V blocks generic mutations when status is SETTLED/RECONCILED. Reconcile is the designated SETTLED → RECONCILED transition (spec 004 FR-002 noted this milestone). Generic guards in `EventService`/`LedgerService` remain unchanged; reconcile bypasses them via dedicated service path (same pattern as `FinalizeAsync` updating a PRE_SHOW event to SETTLED).

**Alternatives considered**:
- Relax immutability guards globally — rejected; violates Constitution V.

## 7. Concurrency control

**Decision**: Reuse `SELECT ... FOR UPDATE` row lock before status check (pattern from `LoadEventForFinalizeWithLockAsync`). If status is no longer SETTLED at commit time, throw `ConcurrencyConflictException` → 409.

**Rationale**: Spec FR-010 requires first-wins semantics for concurrent reconcile requests.

**Alternatives considered**:
- Optimistic concurrency via `xmin` only — acceptable fallback; row lock is proven in settlement finalize.

## 8. DTO and dashboard propagation

**Decision**: Add `ReconciledAt` and `ReconciledByUserId` to both `EventResponse` and `EventCardDto`; map in `EventService.ToEventResponse` and `DashboardService.ToEventCardDto`.

**Rationale**: Spec FR-007 and SC-001 require metadata in event retrieval and dashboard aggregation responses.

**Alternatives considered**:
- EventResponse only — rejected; dashboard spec 031 already exposes `settledAt`; reconciled metadata belongs on `EventCardDto` for parity.

## 9. Verification strategy

**Decision**: New `ReconcileControllerTests.cs` using HTTP client against Testcontainers DB. Seed settled events via `SetEventStatusDirectAsync` (pattern from `LedgerStateMachineTests`) or full settle flow when PDF support available.

**Rationale**: SPLR-73 explicitly requires integration tests: happy path, invalid state, tenant isolation. HTTP-level tests prove controller + service + auth + migration end-to-end.

**Alternatives considered**:
- Unit tests only on service — rejected; Constitution III prefers WebApplicationFactory integration loops.
- Extend `LedgerStateMachineTests` — rejected; reconcile is a distinct API surface deserving its own test file.

## 10. Frontend / coverage scope

**Decision**: No frontend changes; backend-only ≥80% coverage on touched files.

**Rationale**: Clarification session confirmed backend/API-only v1. Post-Show quick-link UI wiring is a separate feature. `generated-api.ts` updates automatically on build for future consumers.

**Alternatives considered**:
- Preemptive frontend API client — rejected; no UI consumer in this feature.
