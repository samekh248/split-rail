# Data Model: Event Pin API Endpoints

**Feature**: 030-event-pin-endpoints  
**Date**: 2026-06-18

## Existing entity (unchanged)

This feature consumes the `UserEventPin` entity defined in [029-user-event-pin-entity/data-model.md](../029-user-event-pin-entity/data-model.md). No schema migration required.

| Field | Type | Notes |
|-------|------|-------|
| `UserId` | `Guid` | Composite PK; FK → `users.id` CASCADE |
| `EventId` | `Guid` | Composite PK; FK → `events.id` CASCADE |
| `PinnedAt` | `DateTimeOffset` | Set on insert by API service |

**Table**: `user_event_pins`  
**Tenant path**: `UserEventPin → Event → Venue → Organization`

## API-driven state transitions

| Trigger | HTTP action | Effect on `user_event_pins` |
|---------|-------------|------------------------------|
| User pins event | `PUT .../pin` | Insert row `(authenticatedUserId, eventId)` with `PinnedAt = UtcNow` if absent |
| User re-pins event | `PUT .../pin` | No-op; existing row unchanged (idempotent) |
| User unpins event | `DELETE .../pin` | Delete row for `(authenticatedUserId, eventId)` if present |
| User unpins non-pinned event | `DELETE .../pin` | No-op (idempotent) |
| Event deleted | Existing `DELETE .../events/{eventId}` | Cascade removes all pins for that event (FK) |
| User deleted | Platform user removal | Cascade removes all pins for that user (FK) |

## Validation rules (API layer)

| Rule | Source | Enforcement |
|------|--------|-------------|
| Caller must be authenticated | FR-003 | `ITenantContext.UserId`; 401 via middleware |
| Caller must have `can_view_financials` | FR-004 | `[RequirePermission]`; 403 |
| Venue must be accessible to caller | FR-006 | `VenueService.IsVenueAccessibleAsync`; 404 |
| Event must exist in specified venue | FR-005 | `eventId + venueId` match query; 404 |
| Pin scoped to authenticated user only | FR-003 | Service uses `ITenantContext.UserId`, never request body user id |
| At most one pin per user per event | FR-007 | Check-before-insert + composite PK |
| Org isolation | FR-005, FR-009 | EF global filters on `Events`/`UserEventPin` |

## Service: `EventPinService`

| Method | Input | Output | Side effects |
|--------|-------|--------|--------------|
| `PinEventAsync(venueId, eventId, ct)` | Route params | void | Insert pin row or no-op |
| `UnpinEventAsync(venueId, eventId, ct)` | Route params | void | Delete pin row or no-op |

**Dependencies**: `ApplicationDbContext`, `ITenantContext`, `VenueService`

## Out of scope (this feature)

- New entities, columns, or migrations
- Read/query endpoints for pins (SPLR-72)
- Denormalized `venue_id` on pin rows
- Pin ordering or limit enforcement
