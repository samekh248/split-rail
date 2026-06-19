# Data Model: User Event Pin Persistence

**Feature**: 029-user-event-pin-entity  
**Date**: 2026-06-18

## Entity: `UserEventPin`

Per-user bookmark linking a user to a pinned event.

| Field | Type | DB Column | Constraints | Notes |
|-------|------|-----------|-------------|-------|
| `UserId` | `Guid` | `user_id` | PK (composite), FK → `users.id`, CASCADE delete | Part of composite key |
| `EventId` | `Guid` | `event_id` | PK (composite), FK → `events.id`, CASCADE delete | Part of composite key |
| `PinnedAt` | `DateTimeOffset` | `pinned_at` | NOT NULL, default `NOW()` | Server timestamp at pin creation |

### Table

- **Name**: `user_event_pins`
- **Primary key**: `(user_id, event_id)`

### Relationships

```text
User 1──* UserEventPin *──1 Event
                │
                └── Event.Venue.Organization (tenant scope path)
```

| Navigation | Location | Cardinality |
|------------|----------|-------------|
| `User.EventPins` | `User.cs` | One user, many pins |
| `Event.UserEventPins` | `Event.cs` | One event, many pins (one per user) |
| `UserEventPin.User` | `UserEventPin.cs` | Required |
| `UserEventPin.Event` | `UserEventPin.cs` | Required |

### Validation rules

| Rule | Source | Enforcement |
|------|--------|-------------|
| At most one pin per user per event | FR-003 | Composite PK |
| Pin scoped to org of event's venue | FR-004 | EF global query filter |
| Pins removed when event deleted | FR-005 | FK `ON DELETE CASCADE` |
| Pins removed when user deleted | Assumption / platform pattern | FK `ON DELETE CASCADE` |
| `PinnedAt` set on insert | FR-002 | DB default + explicit set on seed |

### State transitions

| Trigger | Effect |
|---------|--------|
| Pin created | Row inserted with `PinnedAt` |
| Event deleted | All pins for that `event_id` deleted (cascade) |
| User deleted | All pins for that `user_id` deleted (cascade) |
| Re-pin same event | Not applicable until SPLR-70 API; PK prevents duplicate row |

### DbContext registration

| Concern | Implementation |
|---------|----------------|
| `DbSet` | `public DbSet<UserEventPin> UserEventPins => Set<UserEventPin>();` |
| Configuration | `ConfigureUserEventPin(modelBuilder)` — table, keys, FKs, column names |
| Tenant filter | `e.Event.Venue.OrganizationId == _tenantContext.OrganizationId` |

### Out of scope (this entity)

- REST DTOs / OpenAPI types (SPLR-70)
- Pin ordering index beyond PK (dashboard sort uses `PinnedAt` in SPLR-72)
- Venue-level RBAC validation at insert (SPLR-70 API concern)
- `venue_id` denormalization (not required; event already carries venue)
