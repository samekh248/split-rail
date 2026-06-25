# Phase 1 Data Model: Unified Booking Calendar

**Feature**: `073-unified-booking-calendar` | **Date**: 2026-06-25

## Entity: Region (new)

| Field | Type | Constraints |
|-------|------|-------------|
| `Id` | `uuid` | PK, default `gen_random_uuid()` |
| `OrganizationId` | `uuid` | FK → `organizations`, CASCADE DELETE, NOT NULL |
| `Name` | `varchar(255)` | NOT NULL |
| `Notes` | `text` | NULL |
| `CreatedAt` | `timestamptz` | NOT NULL, default `NOW()` |

**Uniqueness**: `(organization_id, name)` unique index.

**Relationships**: One organization has many regions; one region has many venues.

## Entity: Venue (extended)

| Field | Type | Constraints |
|-------|------|-------------|
| `RegionId` | `uuid` | FK → `regions`, NULL allowed (legacy/unassigned) |

**Validation**:
- On create/update: if organization has ≥1 region, `RegionId` REQUIRED.
- Region must belong to same organization as venue.

## Entity: Event / Show Placement (extended)

| Field | Type | Constraints |
|-------|------|-------------|
| `BookingPlacementStatus` | enum | `HOLD_1`, `HOLD_2`, `CONFIRMED`, `CANCELLED`; NOT NULL; default `CONFIRMED` for new confirmed creates |
| `DoorsTime` | `time` | NULL |
| `LoadInTime` | `time` | NULL |
| `CurfewTime` | `time` | NULL |
| `SupportLineup` | `varchar(2000)` | NULL |

**Existing fields reused**: `Title` (act/event name), `EventDate`, `VenueId`, `Status` (financial lifecycle), `QboTagName`, `IsBudgetLocked`, settlement columns.

**Migration**: All existing rows → `booking_placement_status = CONFIRMED`.

### BookingPlacementStatus state machine

```text
                    ┌─────────────┐
         create     │   HOLD_1    │◄──── default hold create (open slot)
         ─────────►│             │
                    └──────┬──────┘
                           │ second hold / explicit tier
                    ┌──────▼──────┐
                    │   HOLD_2    │
                    └──────┬──────┘
                           │ promote (no Confirmed conflict)
                    ┌──────▼──────┐     cancel confirmed
         create     │  CONFIRMED  │──────────────────► CANCELLED
         ─────────►│             │      (soft)
                    └─────────────┘

HOLD_* ──hard delete──► (removed)
CANCELLED ──excluded from active conflicts──► slot open for new placements
```

**Promotion rules** (clarified):
- `HOLD_*` → `CONFIRMED`: allowed if no other **active** `CONFIRMED` on same `venue_id` + `event_date`.
- Sibling holds remain after promotion.
- `CONFIRMED` → `CANCELLED`: soft cancel; record retained.

**Workspace access**:
- `HOLD_1`, `HOLD_2`: workspace navigation blocked.
- `CONFIRMED`, `CANCELLED`: workspace allowed (cancelled may be read-only per financial state).

## Entity: CalendarPlacement (read DTO, not persisted)

Projection for calendar matrix rendering. See [contracts/calendar-placements-api.md](./contracts/calendar-placements-api.md).

## Active placement conflict set

For a given `(venue_id, event_date)`, consider only rows where `booking_placement_status IN (HOLD_1, HOLD_2, CONFIRMED)`.

| Active state | New Hold | New Confirmed | Promote hold |
|--------------|----------|---------------|--------------|
| (none) | → HOLD_1 | → CONFIRMED | — |
| HOLD_1 only | → HOLD_2 | → CONFIRMED (reject if would duplicate Confirmed) | HOLD_1 → CONFIRMED |
| HOLD_2 only | reject | → CONFIRMED | HOLD_2 → CONFIRMED |
| HOLD_1 + HOLD_2 | reject | → CONFIRMED | either → CONFIRMED (sibling stays) |
| CONFIRMED | HOLD_2 only if no HOLD_2 | reject | reject |
| CONFIRMED + HOLD_2 | reject | reject | reject |
| CANCELLED present | same as open slot | same as open slot | — |

## Entity: CalendarViewContext (client)

| Field | Type | Default (session first open) |
|-------|------|------------------------------|
| `viewMode` | `global` \| `regional` \| `venue` | `global` |
| `regionId` | `uuid?` | null |
| `venueId` | `uuid?` | null |
| `month` | `YYYY-MM` | current local month |
| `showCancelled` | `boolean` | `false` |

**Client filter**: After fetching placements for `month` bounds, filter by `viewMode` + `regionId`/`venueId` without refetch (FR-007).

## Entity: EventCardDto (extended for dashboard)

Add optional `bookingPlacementStatus` string enum mirroring API for FR-025 badge replacement.

## Indexes

```sql
CREATE UNIQUE INDEX ix_regions_organization_id_name ON regions (organization_id, name);
CREATE INDEX ix_venues_region_id ON venues (region_id);
CREATE INDEX ix_events_venue_id_event_date ON events (venue_id, event_date);
```

## Tenant isolation

All queries:
1. Filter `organization_id` via venue join or region join.
2. Intersect with `VenueService.GetAccessibleVenueQuery(userId)` (respects `user_venue_scopes`).

## Immutability interaction

| Financial `Status` | Calendar edit | Hold delete | Confirmed cancel |
|--------------------|---------------|-------------|------------------|
| `PRE_SHOW` | allowed (conflict-checked) | allowed | allowed (soft) |
| `PRE_SHOW` + budget locked | metadata per existing rules | hold delete allowed | cancel with warning |
| `SETTLED` / `RECONCILED` | blocked (`FrozenEventMutationAuditor`) | blocked | blocked |
