# UI Contract: Venues Page Region Controls

**Feature**: `075-venue-region-controls` | **Date**: 2026-06-25  
**Route**: `/venues`  
**See also**: [data-model.md](../data-model.md), spec 073 `RegionManagementPanel`

## Page regions

| Region | `data-testid` | Description |
|--------|---------------|-------------|
| Page root | `venues-page` | Existing |
| Toolbar | `venues-page-controls` | Filter, display toggle, manage regions |
| Flat list | `venue-list-table` | Existing flat table |
| Grouped list | `venues-grouped-list` | Region sections container |
| Region section | `venues-region-section-{regionId\|unassigned}` | Grouped heading + table |
| Empty section | `venues-region-empty-{regionId\|unassigned}` | "No venues" inline message |
| Region panel | `booking-region-panel` | Reused modal (unchanged testid) |

## Toolbar controls (`VenuesPageControls`)

| Control | `data-testid` | Visibility | Behavior |
|---------|---------------|------------|----------|
| Region filter | `venues-region-filter` | `regions.length > 0` | `all` \| region uuid \| `unassigned` |
| Display toggle | `venues-display-mode` | `venues.length > 0` | `flat` \| `grouped` |
| Manage regions | `venues-manage-regions` | `canManageVenues` | Opens `RegionManagementPanel` |

Filter hidden/disabled with helper text when `regions.length === 0` and `canManageVenues` (prompt to create regions).

## Region filter options

| Value | Label | Shown when |
|-------|-------|------------|
| `all` | All regions | Always (when filter visible) |
| `{regionId}` | `{region.name}` | Region has ≥1 visible venue |
| `unassigned` | Unassigned | ≥1 visible venue with null `regionId` |

## Display toggle

| Value | Label | List component |
|-------|-------|----------------|
| `flat` | List (default) | `VenueList` — single table, A–Z by name, no region column |
| `grouped` | By region | `VenueListGrouped` — sections per data-model rules |

## Flat list (`VenueList` extend)

- Input: pre-filtered, pre-sorted venues.
- Columns: Name, Created, Actions (if `canManage`) — **no Region column** (clarification Q1).
- Sort: alphabetical by name (caller responsibility).

## Grouped list (`VenueListGrouped` NEW)

| Prop | Type |
|------|------|
| `sections` | `VenueRegionSection[]` from `buildGroupedSections` |
| `canManage` | `boolean` |
| `onEdit` / `onDelete` | Same as `VenueList` |

Per section:

- `h3` with region name or "Unassigned"
- If `venues.length === 0`: `venues-region-empty-*` with text "No venues"
- Else: `team-table` with same columns as flat (no region column)

## `venueListViewStorage.ts` (NEW)

| Function | Behavior |
|----------|----------|
| `readVenuesPageRegionFilter()` | Cookie → `'all' \| 'unassigned' \| uuid` or null |
| `writeVenuesPageRegionFilter(value)` | Persist cookie |
| `readVenuesPageDisplayMode()` | Cookie → `'flat' \| 'grouped'` or null |
| `writeVenuesPageDisplayMode(value)` | Persist cookie |

Defaults when null: `all`, `flat`.

## `venueListView.ts` (NEW)

| Export | Contract |
|--------|----------|
| `buildRegionFilterOptions` | See data-model |
| `filterVenuesByRegion` | See data-model |
| `sortVenuesByName` | Stable alphabetical |
| `buildGroupedSections` | See data-model + R4 in research |

## `VenuesPage` (EXTEND)

| Addition | Notes |
|----------|-------|
| `VenuesPageControls` | Toolbar between header and list |
| `useRegions()` | Region names for grouped headings + filter |
| `RegionManagementPanel` | Moved from `BookingCalendarPage` |
| Conditional render | `displayMode === 'flat'` → `VenueList`; else `VenueListGrouped` |
| Empty states | Distinct copy for no venues / no filter matches |

## `BookingCalendarControls` (MODIFY) — FR-002

**Remove**:

| Control | `data-testid` |
|---------|---------------|
| Manage regions button | `booking-manage-regions` |

Remove `onManageRegions` from props interface. Update spec 073 contract reference during implementation.

## Accessibility

- Filter and toggle: native `<select>` or radiogroup with visible labels.
- Manage regions: opens `role="dialog"` panel (existing).
- Empty section message: associated with section heading via `aria-labelledby`.

## Regression guards (tests)

| Test file | Covers |
|-----------|--------|
| `tests/lib/venueListView.test.ts` | Filter, sort, grouped sections, empty regions |
| `tests/lib/venueListViewStorage.test.ts` | Cookie read/write defaults |
| `tests/pages/VenuesPage.test.tsx` | Toolbar, filter, toggle, manage regions, persistence |
| `tests/components/venue/VenueListGrouped.test.tsx` | Section headings, empty message |
| `tests/booking/BookingCalendarControls.test.tsx` | Assert no manage-regions button |
