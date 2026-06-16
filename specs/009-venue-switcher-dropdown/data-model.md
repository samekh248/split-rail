# Phase 1 Data Model: Dashboard Tenant/Venue Switching Dropdown

**Feature**: `009-venue-switcher-dropdown` | **Date**: 2026-06-16

This feature introduces **no persisted database entities** and **no DTO changes**. The "data model" here is the frontend view-model/state derived from existing generated API types plus a single browser-session value. All payload types are imported from `apps/web/src/types/generated-api.ts` (Constitution VI).

## Source types (existing, generated — do not redefine)

```ts
// from generated-api.ts
type VenueResponse = {
  id?: string;            // uuid
  name?: string | null;
  organizationId?: string;// uuid
  createdAt?: string;     // date-time
};

type VenueScopeDto = {
  venueId?: string;       // uuid
  venueName?: string | null;
};

type UserProfileResponse = {
  // ...
  organization?: OrganizationSummaryDto;
  role?: RoleDetailDto;
  venueScopes?: VenueScopeDto[] | null;  // present, but NOT used to build the list (see research D1)
};
```

## Persisted browser state

| Key | Store | Value | Lifetime | Notes |
|-----|-------|-------|----------|-------|
| `activeVenueId` | `sessionStorage` | venue `id` (uuid string) | Per-tab; cleared on tab/session close | Written on selection and on default resolution; read on load and by `apiFetch` to attach `X-Active-Venue-Id`. No cross-tab/cross-device sync. |

`activeVenueStorage.ts` exposes: `getActiveVenueId(): string | null`, `setActiveVenueId(id: string): void`, `clearActiveVenueId(): void`.

## Venue context view model

```ts
interface VenueContextValue {
  venues: VenueResponse[];          // server-scoped accessible venues (rendered verbatim)
  activeVenueId: string | null;     // resolved active venue
  activeVenue: VenueResponse | null;// convenience lookup
  isLoading: boolean;               // venue list loading
  isError: boolean;                 // venue list failed to load
  refetch: () => void;              // retry venue list load
  setActiveVenue: (id: string) => void; // select + persist + drive downstream refetch
}
```

### Active-venue resolution (on list load / change) — see research D5

```
given scopedVenues = venues from GET /api/venues (header omitted)
let remembered = getActiveVenueId()
if remembered != null AND scopedVenues contains remembered:
    activeVenueId = remembered
elif scopedVenues is non-empty:
    activeVenueId = scopedVenues[0].id          // deterministic default (FR-010)
    setActiveVenueId(activeVenueId)             // persist the resolved default
else:
    activeVenueId = null                        // empty state (no accessible venues)
    clearActiveVenueId()
```

A remembered id absent from the freshly fetched list (scope changed / venue removed) is discarded and replaced by the default (FR-011).

### Selection transition (`setActiveVenue(id)`)

```
precondition: id ∈ scopedVenues (the dropdown only offers scoped venues)
1. setActiveVenueId(id)                          // persist (sessionStorage)
2. update context activeVenueId = id             // re-render consumers
3. downstream venue-scoped queries refetch with X-Active-Venue-Id = id (via apiFetch)
4. DashboardHome resets the open event to the new venue's default (research D6)
postcondition on server rejection (403, out-of-scope race): prior activeVenueId retained (FR-008)
```

## State / validation rules mapped to requirements

| Rule | Requirement |
|------|-------------|
| List is the server-scoped `GET /api/venues` response, rendered verbatim | FR-002, FR-003, FR-004 |
| Selecting sets the active venue | FR-005 |
| Downstream views refresh to the new venue; prior event not carried over | FR-006 |
| Every venue-scoped request carries `X-Active-Venue-Id` from the active venue | FR-007 |
| Out-of-scope activation/access rejected; prior venue retained | FR-008 |
| Selection persists across navigation + reload within the session | FR-009 |
| Default active venue chosen on first load | FR-010 |
| Remembered-but-inaccessible selection falls back to default | FR-011 |
| Empty state (no venues) and error-with-retry (load failure) | FR-012 |
| Keyboard operable + accessible labelling/state | FR-013 |

## Relationships

```
UserProfileResponse.venueScopes ──(authorizes, server-side)──► GET /api/venues (scoped list)
GET /api/venues ──► VenueContextValue.venues ──► VenueSwitcher (render)
VenueSwitcher.select ──► setActiveVenue ──► activeVenueStorage (sessionStorage) ──► apiFetch header
activeVenueId ──► DashboardHome ──► EventLedgerPage(venueId = activeVenueId, eventId = venue default)
```

No new database tables, columns, migrations, or server DTOs.
