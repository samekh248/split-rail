# Data Model: Venue Page Region Controls

**Feature**: `075-venue-region-controls` | **Date**: 2026-06-25

No database schema changes. Client view model and existing API entities from spec 073.

## API entities (existing, generated types)

### `RegionResponse`

| Field | Type | UI use |
|-------|------|--------|
| `id` | `string` (uuid) | Filter value; section key in grouped mode |
| `name` | `string` | Filter label; grouped section heading |
| `notes` | `string?` | Region panel only |
| `venueCount` | `number?` | Region panel list |

Source: `generated-api.ts` ← `apps/api/DTOs/Regions/`

### `VenueResponse` (extended in 073)

| Field | Type | UI use |
|-------|------|--------|
| `id` | `string` (uuid) | Row key |
| `name` | `string` | Display; flat sort key |
| `regionId` | `string?` | Filter match; group assignment (`null` → Unassigned) |
| `createdAt` | `string` | Flat table column (unchanged) |
| `organizationId` | `string` | Unchanged |

### `UserProfileResponse.role.permissions`

| Field | Type | UI use |
|-------|------|--------|
| `canManagePermissions` | `boolean` | Gates "Manage regions" via `useCanManageVenues()` |

## Client view state

### `VenueListViewPreferences` (cookie-backed)

| Field | Type | Default | Persistence |
|-------|------|---------|-------------|
| `regionFilter` | `'all' \| 'unassigned' \| string` | `'all'` | Cookie `venuesPageRegionFilter` |
| `displayMode` | `'flat' \| 'grouped'` | `'flat'` | Cookie `venuesPageDisplayMode` |

Read on mount; write on change. Invalid cookie values fall back to defaults.

### `VenuesPage` local state

| Field | Type | Notes |
|-------|------|-------|
| `regionsPanelOpen` | `boolean` | Controls `RegionManagementPanel` |
| `editingVenue` | `VenueResponse \| null` | Unchanged |
| `deletingVenue` | `VenueResponse \| null` | Unchanged |

### Derived view model (`venueListView.ts`)

#### `buildRegionFilterOptions(venues, regions)`

Returns select options:

| Option | Included when |
|--------|----------------|
| `All regions` | Always (when regions exist) |
| One per region | Region has ≥1 visible venue |
| `Unassigned` | ≥1 visible venue with `regionId == null` |

Hidden entirely when `regions.length === 0`.

#### `filterVenues(venues, regionFilter)`

| `regionFilter` | Result |
|----------------|--------|
| `'all'` | All visible venues |
| `'unassigned'` | `regionId == null` |
| `uuid` | `regionId === uuid` |

#### `sortVenuesByName(venues)`

Alphabetical by `name` (locale-aware `localeCompare`).

#### `buildGroupedSections(venues, regions, regionFilter)`

| `regionFilter` | Sections |
|----------------|----------|
| `'all'` | All org regions (alpha) + `Unassigned` if applicable; empty sections include `venueCount: 0` |
| `'unassigned'` | Single `Unassigned` section |
| `uuid` | Single section for that region |

Each section: `{ regionId, title, venues: VenueResponse[], isEmpty: boolean }`.

## State transitions

```text
[VenuesPage load]
  → read cookies → apply filter + displayMode
  → fetch venues (VenueContext) + regions (useRegions)
  → derive filtered/sorted/grouped view

[User changes region filter]
  → update state + write cookie
  → re-derive list (no navigation)

[User toggles grouped/flat]
  → update state + write cookie
  → swap VenueList vs VenueListGrouped

[User clicks Manage regions]
  → regionsPanelOpen = true
  → RegionManagementPanel (reuse 073 component)

[Region CRUD success]
  → invalidate ['regions']; refetch venues if needed
  → grouped sections refresh

[Booking Calendar]
  → no manage-regions entry (FR-002)
```

## Query keys

| Key | Endpoint | Notes |
|-----|----------|-------|
| `['venues']` | `GET /api/venues` | Scoped by user access |
| `['regions']` | `GET /api/regions` | `skipVenueContext: true` |
