# Research: User Event Pin Persistence

**Feature**: 029-user-event-pin-entity  
**Date**: 2026-06-18

## 1. Junction entity pattern

**Decision**: Model `UserEventPin` as a composite-key junction entity mirroring `UserVenueScope`.

**Rationale**: Platform convention for user–entity associations uses `(user_id, entity_id)` composite PK, snake_case table names, explicit `Configure*` methods, and cascade deletes on both FKs. Linear SPLR-69 specifies the same shape.

**Alternatives considered**:
- Surrogate `Id` PK with unique index on `(UserId, EventId)` — rejected; inconsistent with `UserVenueScope`.
- Store pins as JSON on `User` — rejected; breaks queryability and tenant filters.

## 2. Table and column naming

**Decision**: Table `user_event_pins`; columns `user_id`, `event_id`, `pinned_at`.

**Rationale**: Matches existing snake_case convention (`user_venue_scopes`, `refresh_tokens`).

**Alternatives considered**: `event_pins` — rejected; ambiguous (could imply org-wide pins).

## 3. Timestamp semantics

**Decision**: `PinnedAt` as `DateTimeOffset` with database default `NOW()`.

**Rationale**: All platform timestamps use `DateTimeOffset` (`RefreshToken.CreatedAt`, `Event.CreatedAt`). Default captures server time at insert; re-pin semantics deferred to SPLR-70 API.

**Alternatives considered**: `DateOnly` — rejected; pin time-of-day may matter for ordering in dashboard.

## 4. Foreign key delete behaviors

**Decision**:
- `Event` FK → `DeleteBehavior.Cascade` (required by SPLR-69).
- `User` FK → `DeleteBehavior.Cascade` (matches `UserVenueScope`, `RefreshToken`).

**Rationale**: Prevents orphaned pin rows when parent user or event is removed. Spec FR-005 requires event-delete cleanup.

**Alternatives considered**: `SetNull` on user delete — rejected; composite PK requires user to exist.

## 5. Tenant isolation filter

**Decision**: Global query filter:

```csharp
modelBuilder.Entity<UserEventPin>().HasQueryFilter(e =>
    _tenantContext.OrganizationId == null ||
    e.Event.Venue.OrganizationId == _tenantContext.OrganizationId);
```

**Rationale**: Constitution II mandates org scoping. Pin entity has no direct `OrganizationId`; isolation path is `Event → Venue → Organization`, same as `FinancialLineItem` and `EventArtist`.

**Alternatives considered**: Denormalized `OrganizationId` column — rejected; adds drift risk and redundant data.

## 6. Verification strategy (no API)

**Decision**: Integration tests seed pins via scoped `ApplicationDbContext` (pattern from `SetEventStatusDirectAsync` / `SeedLineItemDirectAsync` in `IntegrationTestBase`).

**Rationale**: SPLR-69 explicitly excludes API endpoints. Direct DbContext tests still prove migration, constraints, tenant filters, and cascades — satisfying FR-001–FR-007 and SC-001–SC-003.

**Alternatives considered**: Defer all tests to SPLR-70 — rejected; Constitution III requires verification with the entity addition.

## 7. Frontend / coverage scope

**Decision**: No frontend changes; backend-only ≥80% coverage on touched files.

**Rationale**: Feature is persistence foundation only. `pinnedEventStorage.ts` (localStorage) remains interim until SPLR-70/frontend migration. Constitution III applies per stack independently — untouched frontend files do not block this feature.

**Alternatives considered**: Stub Vitest file with zero assertions — rejected; adds noise without value.
