# Data Model: Header Venue Dropdown Region Filter

This feature introduces **no persisted entities, API payloads, database tables, or DTO changes**. `Venue` and `Region` are unchanged (see `apps/api/Controllers/VenuesController.cs`/region model and `apps/web/src/types/generated-api.ts` `VenueResponse`/`RegionResponse`). The model below covers the **client-side presentation/view state** this feature adds to `VenueSwitcher.tsx`.

## Existing entities (consumed, unchanged)

### Venue (`VenueResponse`)

| Attribute | Notes |
|---|---|
| `id` | Unique identifier |
| `name` | Display name, used as option label and grouping sort key |
| `regionId` | Optional — `null`/undefined means unassigned |

### Region (`RegionResponse`)

| Attribute | Notes |
|---|---|
| `id` | Unique identifier |
| `name` | Display name; used for section headings and filter options |

## New client-side view state (transient, not persisted)

### Region filter selection

| Field | Type | Notes |
|---|---|---|
| `regionFilter` | `VenueRegionFilter` (`'all' \| 'unassigned' \| string` region id) — existing type from `venueListViewStorage.ts`, reused | Local `VenueSwitcher` component state, default `'all'`; resets on full page reload (no storage write) — see [research.md](./research.md) D5 |

### Header dropdown option (`VenueOption`, extended)

Existing discriminated union in `VenueSwitcher.tsx`, extended with one new non-selectable variant:

| Variant | `kind` | Selectable? | Notes |
|---|---|---|---|
| All Venues | `'all'` | Yes | Unchanged; always first, unaffected by `regionFilter` |
| Venue | `'venue'` | Yes | Unchanged; now derived from the filtered/grouped venue set instead of the raw `venues` array |
| *(new)* Section header | `'header'` | No | Renders a region (or "Unassigned") heading; excluded from `ArrowUp`/`ArrowDown`/`Enter` traversal |

### Region grouping (`VenueRegionSection`, existing type, reused unmodified)

| Attribute | Notes |
|---|---|
| `sectionKey` | Region `id`, or the literal `'unassigned'` |
| `title` | Region `name`, or `'Unassigned'` |
| `venues` | Venues in this group, sorted by name |

Consumed via `buildGroupedSections(venues, regions, regionFilter)`; header-view rendering additionally drops sections with zero venues when `regionFilter === 'all'` (see research.md D3) — this filtering happens in `VenueSwitcher.tsx`, not in `venueListView.ts`, so the Venues admin page's own use of `buildGroupedSections` (which intentionally keeps empty sections) is unaffected.

## Validation rules

| ID | Rule |
|---|---|
| VR-001 | The region filter control MUST NOT render when `regions.length === 0` (spec FR-007); the dropdown behaves exactly as it does today. |
| VR-002 | "All Venues" MUST always render first and MUST NOT be affected by `regionFilter` (spec FR-003, Edge Cases). |
| VR-003 | When `regionFilter === 'all'`, region sections with zero venues MUST be omitted from the grouped view (research.md D3). |
| VR-004 | When `regionFilter` is a specific region or `'unassigned'` and the resulting venue set is empty, the dropdown MUST show an inline empty-state message instead of an empty/blank list (spec FR-008). |
| VR-005 | The "Unassigned" filter/grouping option MUST only appear when at least one accessible venue has no `regionId` (spec FR-005), per `buildRegionFilterOptions`'s existing rule. |
| VR-006 | Selecting a `kind: 'venue'` option, regardless of `regionFilter` value, MUST call `setActiveVenue`/`activateVenueId` exactly as the unfiltered path does today (spec FR-006) — no new selection code path. |
| VR-007 | `kind: 'header'` options MUST be excluded from keyboard traversal (`ArrowUp`/`ArrowDown`) and MUST NOT be selectable via `Enter` or click. |
| VR-008 | No new hand-written TypeScript interfaces may mirror `VenueResponse`/`RegionResponse` (Constitution VI) — all types continue to import from `generated-api.ts`; `VenueRegionFilter`/`VenueRegionSection` continue to be imported from `venueListView.ts`/`venueListViewStorage.ts`. |

## Out of scope

| Item | Reason |
|---|---|
| Persisting `regionFilter` across sessions | Explicit spec Assumption — this is a lightweight browsing aid, distinct from the Venues admin page's cookie-persisted preference (spec 075). |
| A new "active region" scope | Explicit spec clarification — region selection only narrows/groups the list; it does not change what "active venue" means (spec 009 unchanged). |
| Region management (create/edit/delete) | Out of scope per spec Assumptions; already exists on the Venues admin page (spec 075). |
| Backend region/venue query changes | No new data is needed; existing `useVenues`/`useRegions` hooks already return everything required. |
