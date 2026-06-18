# Phase 1 Data Model: Test Fixtures & Entities

**Feature**: 017-vitest-workspace-navigation
**Date**: 2026-06-17

This feature adds verification for workspace/tenant UI. The "data model" is the set of **test fixtures and the entities they represent**. All fixture shapes are imported from `@/types/generated-api` (Constitution VI).

## Entity: Permission Context

Drives conditional UI visibility. Sourced from `UserProfileResponse.role.permissions` (`PermissionsDto`).

| Permission flag (generated) | Hook | Gated surface | Assertion |
|-----------------------------|------|---------------|-----------|
| `canManagePermissions` | `useCanManageVenues`, `useCanManageTeam` | Venue create CTA, create-venue page, Team card, team settings page | absent/redirect when false |
| `canViewFinancials` | `useCanManageEvents` | Event create CTA, inline create panel | absent when false |

**Fixture variants**:
- `adminProfile` = `{ role: { permissions: { canManagePermissions: true, canViewFinancials: true } } }`
- `memberProfile` = `{ role: { permissions: { canManagePermissions: false, canViewFinancials: false } } }`
- `venueManagerProfile` = manage venues only (if needed for narrow scenarios)

## Entity: Accessible-Venues List

Scope-correct venues the backend returns; client renders verbatim.

| Field | Type (generated) | Notes |
|-------|------------------|-------|
| `id` | `VenueResponse.id` | active venue key |
| `name` | `VenueResponse.name` | switcher label |
| `organizationId` | `VenueResponse.organizationId` | tenant association |

**Fixture variants**:
- `noVenues` = `[]` (empty state)
- `singleVenue` = `[VENUE_A]`
- `multiVenue` = `[VENUE_A, VENUE_B]` (switching, venue-switch event reset)

## Entity: Active Venue / Event Selection

| Aspect | Mechanism | Assertion |
|--------|-----------|-----------|
| active venue | `activeVenueStorage` | restored after create; fallback when stale |
| active event | `activeEventStorage` | updates on combobox select; cleared on venue switch |
| ledger host | `EventLedgerPage` props | `venueId:eventId` reflects selection |

## Entity: Create-Venue Form Input

| Field | Validation under test |
|-------|----------------------|
| `name` | Required (non-empty after trim); max length enforced |

**Fixture variants**:
- `validName` = `'Main Hall'`
- `emptyName` = `''` or whitespace
- `overMaxName` = string exceeding max length (match `CreateVenuePage` validation constant)

## Entity: Event List / Selection

| Field | Type (generated) | Notes |
|-------|------------------|-------|
| `eventId` | `EventListItem.eventId` | combobox value |
| `venueId` | `EventListItem.venueId` | must match active venue |
| `title` | `EventListItem.title` | combobox label |
| `eventDate` | `EventListItem.eventDate` | visible in list |

**Fixture variants**:
- `eventsForVenueA` = `[EVENT_A, EVENT_A2]` (combobox switching)
- `noEvents` = `[]` (no-events empty state)
- `newlyCreatedEvent` = POST response stub for inline create flow

## Entity: Settings Navigation State

| Route | Expected render |
|-------|-----------------|
| `/settings` | Landing with org + integrations cards; Team card if `canManagePermissions` |
| `/settings/team` | Team page if permitted; else silent redirect to `/settings` |
| `/settings/organization` | Placeholder copy |
| `/settings/integrations` | Placeholder copy |

## Entity: Team Invite Form Input

| Field | Validation under test |
|-------|----------------------|
| `email` | Required; valid email format |
| `roleId` | Required selection |
| `venueScopes` | Optional; subset or all venues |

## Entity: Member / Invitation Row

| Field | Type (generated) | Display assertion |
|-------|------------------|-------------------|
| `email` | `UserListResponse.email` / `InvitationResponse.email` | row text |
| `role.roleName` | nested role | role column |
| `venueScopes` | `VenueScopeDto[]` | "all venues" or named venues |
| `status` | `InvitationResponse.status` | pending/expired/accepted |
| `expiresAt` | `InvitationResponse.expiresAt` | invitation list |

## Entity: Auth Result / Form Error (workspace forms)

| State | Source | Assertion |
|-------|--------|-----------|
| field validation | client validation | inline message; submit blocked |
| form/banner error | API rejection | distinct from field errors; entered data retained where applicable |
| pending | mutation in flight | submit disabled |

## Fixture Conventions

- Reuse `tests/fixtures/auth.ts`, `tests/fixtures/venues.ts` where possible; extend with event/team fixtures rather than duplicating per file.
- Stable UUID constants for venues, events, users, invitations.
- Reset `localStorage`/`sessionStorage` and `vi.unstubAllGlobals()` in `beforeEach`.
- Mock `EventLedgerPage` in dashboard tests to isolate navigation assertions from ledger internals.
