# Research: Event Pin API Endpoints

**Feature**: 030-event-pin-endpoints  
**Date**: 2026-06-18

## 1. Controller placement

**Decision**: Add `PUT` and `DELETE` pin routes to existing `EventsController` at `api/venues/{venueId}/events/{eventId}/pin`.

**Rationale**: Linear SPLR-70 specifies this route shape. All event operations already live under the same controller with `[RequirePermission(PermissionNames.ViewFinancials)]`. Nesting pin under venue/event preserves tenant and venue-scoping conventions used by `EventService`.

**Alternatives considered**:
- Dedicated `EventPinController` — rejected; adds routing fragmentation for a two-action feature.
- Top-level `/api/events/{eventId}/pin` — rejected; breaks venue-scoping URL pattern and complicates venue access validation.

## 2. Service layer split

**Decision**: New `EventPinService` with `PinEventAsync` and `UnpinEventAsync`; inject `VenueService` for access checks.

**Rationale**: Pin logic (idempotent junction insert/delete) is distinct from event CRUD and lifecycle guards in `EventService`. Keeps each service focused while reusing `VenueService.IsVenueAccessibleAsync` — the same gate used by `EventService.CreateEventAsync`, `ListEventsAsync`, etc.

**Alternatives considered**:
- Methods on `EventService` — acceptable but bloats an already large service; rejected for clarity.
- Direct DbContext in controller — rejected; violates existing service-layer pattern.

## 3. HTTP semantics and idempotency

**Decision**:
- `PUT .../pin` → **204 No Content** on success (create or already pinned).
- `DELETE .../pin` → **204 No Content** on success (removed or never pinned).
- No request or response body.

**Rationale**: Spec FR-007/FR-008 require idempotent pin/unpin. Empty 204 matches `DELETE` event pattern on `EventsController` and avoids unnecessary DTO/OpenAPI surface (Constitution VI — no frontend types needed until SPLR-71).

**Alternatives considered**:
- `201 Created` on first pin — rejected; inconsistent with idempotent re-pin returning different status.
- Return pin DTO with `PinnedAt` — rejected; out of scope (read path is SPLR-72 dashboard aggregation).

## 4. Authorization gate

**Decision**: `[RequirePermission(PermissionNames.ViewFinancials)]` on both actions.

**Rationale**: Linear issue and spec FR-004 tie pin to users who can view financial dashboard data. Matches TDD §5.2 personal preference model. Permission denial returns 403 via existing authorization middleware.

**Alternatives considered**:
- New `can_pin_events` permission — rejected; YAGNI for a personal bookmark tied to financial overview.
- No permission (auth only) — rejected; spec explicitly requires financial-view permission.

## 5. Venue and event validation

**Decision**: Validation sequence mirrors `EventService.GetEventAsync` / `DeleteEventAsync`:

1. Authenticated user required (`ITenantContext.UserId`).
2. `VenueService.IsVenueAccessibleAsync(userId, venueId)` → `NotFoundException` if false.
3. Event query: `Events.FirstOrDefault(e => e.Id == eventId && e.VenueId == venueId)` → `NotFoundException` if null.

**Rationale**: Constitution II — org isolation is enforced by EF global filters on `Events` and `Venues`; venue scope enforced by `IsVenueAccessibleAsync`. Cross-org and out-of-scope attempts surface as 404 (existing platform pattern per spec assumptions).

**Alternatives considered**:
- 403 for cross-org — rejected; platform uses 404 to avoid tenant enumeration (see `TenantIsolationTests`).

## 6. Ledger state machine applicability

**Decision**: No `LedgerStateException` guard on pin/unpin.

**Rationale**: Constitution V applies only when altering `events`, `event_artists`, or `financial_line_items`. Pin writes only touch `user_event_pins`. Users may pin settled events for dashboard visibility.

**Alternatives considered**:
- Block pin on SETTLED/RECONCILED events — rejected; not in spec; pinning is non-financial.

## 7. Verification strategy

**Decision**: New `EventPinControllerTests.cs` using HTTP client against Testcontainers DB; assert pin state via scoped `ApplicationDbContext` (pattern from `UserEventPinPersistenceTests`).

**Rationale**: SPLR-70 explicitly requires integration tests in `apps/api.tests/`. HTTP-level tests prove controller + service + auth + tenant filters end-to-end. Direct DbContext assertions for pin row presence/absence.

**Alternatives considered**:
- Extend `UserEventPinPersistenceTests` — rejected; persistence tests are DbContext-level; API tests belong in controller test file.
- Unit tests only on service — rejected; Constitution III prefers WebApplicationFactory integration loops.

## 8. Frontend / coverage scope

**Decision**: No frontend changes; backend-only ≥80% coverage on touched files.

**Rationale**: SPLR-71 wires frontend; SPLR-72 adds read aggregation. Constitution III applies per stack independently.

**Alternatives considered**: Regenerate `generated-api.ts` preemptively — rejected; no response body types needed until frontend consumes endpoints.
