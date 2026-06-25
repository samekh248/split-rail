# Phase 0 Research: Unified Booking Calendar Engine

**Feature**: `073-unified-booking-calendar` | **Date**: 2026-06-25

## R1 — Single Event entity vs separate holds table

**Decision**: Extend existing `Event` with `BookingPlacementStatus`; holds and confirmed bookings share one row per calendar entry.

**Rationale**: Clarification session 2026-06-25; ledger is lazy-loaded; promotion is a status transition; reuses existing venue-scoped event CRUD and immutability guards.

**Alternatives considered**:
- Separate `calendar_holds` table — rejected: duplicate venue/date linkage, harder promotion and workspace linking.
- Soft-delete only for all types — rejected: spec requires hard delete for released holds.

## R2 — Org-scoped calendar read API vs client fan-out

**Decision**: `GET /api/calendar/placements?from=&to=` single query joining venues, regions, events; filtered by org + user venue access.

**Rationale**: Global matrix needs all venues in one month; `useAllVenuesEvents` N-query pattern does not scale and causes waterfall loading.

**Alternatives considered**:
- Extend dashboard aggregate — rejected: wrong lifecycle window (30-day upcoming vs full month navigable).
- GraphQL — rejected: not in stack.

## R3 — Conflict validation location

**Decision**: `BookingConflictService` invoked from `EventService` on create, update, promote; returns 409 with `conflictingPlacementId` and `suggestedHoldTier`.

**Rationale**: FR-013/FR-014 require authoritative server rules; client mirrors for instant feedback only.

**Alternatives considered**:
- DB unique partial indexes only — rejected: cannot express Hold 2 on confirmed date rule cleanly.
- Client-only validation — rejected: unsafe for multi-user booking.

## R4 — Cancelled placement conflict treatment

**Decision**: `Cancelled` status excluded from active conflict set; slot treated as open for new placements.

**Rationale**: Clarification Q3; soft-cancel retains history without blocking re-booking.

## R5 — Hold promotion with sibling holds

**Decision**: Promotion allowed when no other **Confirmed** exists; sibling Hold 1/Hold 2 remain active (no auto-release).

**Rationale**: Clarification Q1 Option C; post-promotion state may be Confirmed + Hold 1 + Hold 2 concurrently.

## R6 — Financial workspace access for holds

**Decision**: Block navigation to `/venues/{id}/events/{id}` workspace when `bookingPlacementStatus` is `HOLD_1` or `HOLD_2`; calendar control panel is sole hold management surface until promotion.

**Rationale**: Clarification Q2 Option B; accounting-first separation.

**Implementation note**: Guard in `EventWorkspacePage` (redirect to `/booking` with toast) and hide workspace links in calendar drawer for holds.

## R7 — Default calendar session state

**Decision**: First open per browser session → Global view, current calendar month. View mode and month may be encoded in URL query (`/booking?view=global&month=2026-06`) for shareability; no cross-session persistence required for v1.

**Rationale**: Clarification Q4; URL state enables client-side filter without reload (FR-007).

## R8 — Permissions

**Decision**: Calendar access and create (hold + confirmed) require existing financial view permission (`ViewFinancials`); region CRUD requires `ManagePermissions` (same as venue management).

**Rationale**: Clarification Q5; aligns with `EventsController` permission model.

## R9 — Calendar UI architecture

**Decision**: Custom CSS grid (no third-party calendar library), mirroring spec 038 approach; desktop matrix columns = venues grouped by region; mobile `<768px` vertical stream.

**Rationale**: Constitution IX + existing mini-calendar patterns; full control over multi-venue column layout.

## R10 — Dashboard booking badge

**Decision**: Add `bookingPlacementStatus` to `EventCardDto` in dashboard partition mapping; replace `getBookingPreviewLabel` hash with real enum label.

**Rationale**: FR-025; single source of truth from event row.

## R11 — Indexing strategy

**Decision**: Composite index on `events (venue_id, event_date)`; index on `regions (organization_id, name)` unique; index on `venues (region_id)`.

**Rationale**: Month range query filters by venue set then date range; supports ≤30 venue orgs within SC-002.

## R12 — Time fields storage

**Decision**: `TimeOnly?` columns for `DoorsTime`, `LoadInTime`, `CurfewTime`; API serializes as `HH:mm` strings; daily agenda sorts by `DoorsTime` then venue name.

**Rationale**: Spec key entity schedule metadata; date remains `DateOnly EventDate`.
