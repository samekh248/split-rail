# Data Model: Venues Page Region/Venue Visual Organization

This feature introduces **no persisted entities, API payloads, database tables, or DTO changes**. `Venue` and `Region` are unchanged (see `apps/api/Models/Venue.cs`, region model, and `apps/web/src/types/generated-api.ts` `VenueResponse`/`RegionResponse`). The model below covers the **client-side presentation/view state** this feature adds or reorganizes.

## Existing entities (consumed, unchanged)

### Venue (`VenueResponse`)

| Attribute | Notes |
|---|---|
| `id` | Unique identifier |
| `name` | Display name, used for sort order (`sortVenuesByName`) |
| `regionId` | Optional — `null`/undefined means unassigned |
| `createdAt` | Displayed in list/table views |

### Region (`RegionResponse`)

| Attribute | Notes |
|---|---|
| `id` | Unique identifier |
| `name` | Display name; used for section headings and filter options |

## New/reorganized client-side view state

### Page layout mode (derived, not persisted)

A computed value — not a new stored entity — determining what the Venues page renders:

| Value | Condition | Rendering |
|---|---|---|
| `loading` | Venues or regions still fetching (`isPending \|\| regionsLoading`) | `LoadingPlaceholder` only |
| `error` | Venue fetch failed (`isError`) | Error state + retry (unchanged) |
| `unified` | Not loading/error AND `regions.length === 0` | Single `VenueList` (flat), no region filter, no display-mode toggle, at most one create-regions prompt (managers only) |
| `grouped-eligible` | Not loading/error AND `regions.length > 0` | Region filter + display-mode toggle shown; venue list renders via `VenueList` (flat) or `VenueListGrouped` per the user's saved/selected `displayMode` |

**Rule**: `unified` always wins over any persisted `displayMode` preference — the saved preference is only consulted when `grouped-eligible`.

### Region group (`VenueRegionSection`, existing type, reused)

| Attribute | Notes |
|---|---|
| `sectionKey` | Region `id`, or the literal `'unassigned'` |
| `title` | Region `name`, or `'Unassigned'` |
| `venues` | Venues in this group, sorted by name |
| *(new)* `isUnassigned` semantics | Derived at render time from `sectionKey === 'unassigned'` — used only to apply the `venues-group--unassigned` CSS modifier (see [contracts](./contracts/venues-page-layout.md)); not a new stored field |

## Validation rules

| ID | Rule |
|---|---|
| VR-001 | The region filter control and display-mode toggle MUST NOT render when `regions.length === 0`. |
| VR-002 | The venue list MUST render via the flat, heading-only-once `VenueList` component (no "Unassigned" section heading) when `regions.length === 0`. |
| VR-003 | Exactly one create-regions prompt MUST render when `regions.length === 0 && canManageVenues`; zero region-related elements MUST render when `regions.length === 0 && !canManageVenues`. |
| VR-004 | The `'unassigned'` group in grouped view MUST carry a distinct CSS modifier class from named-region groups. |
| VR-005 | A region with zero visible venues MUST render the existing `venues-group__empty` indicator, never an unlabeled blank area. |
| VR-006 | If `regions.length` transitions to `0` while the page is mounted (e.g., last region deleted), the page MUST re-render into the `unified` mode without a manual refresh. |
| VR-007 | No new hand-written TypeScript interfaces may mirror `VenueResponse`/`RegionResponse` (Constitution VI) — all types continue to import from `generated-api.ts`. |

## Out of scope

| Item | Reason |
|---|---|
| New region-creation flow/fields | Reuses existing `RegionManagementPanel`; only its entry point's placement/labeling on the Venues page changes. |
| Backend region/venue query changes | No new data is needed; existing `useRegions`/`useActiveVenue` hooks already return everything required. |
| Region hierarchy / nested regions | Not requested; regions remain a flat list per existing model. |
