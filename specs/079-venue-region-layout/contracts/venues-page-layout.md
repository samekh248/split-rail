# Contract: Venues Page Region/Venue Layout (079)

Component prop and CSS class contract for the Venues page's region-vs-venue visual organization. Runtime source of truth: `apps/web/src/pages/VenuesPage.tsx`, `apps/web/src/components/venue/VenuesPageControls.tsx`, `apps/web/src/components/venue/VenueListGrouped.tsx`, `apps/web/src/index.css`. Test parity: `apps/web/tests/pages/VenuesPage.test.tsx`, `apps/web/tests/components/venue/VenuesPageControls.test.tsx`, `apps/web/tests/components/venue/VenueListGrouped.test.tsx`.

No backend/API contract changes — this feature is presentation-only (see [data-model.md](../data-model.md)).

## `VenuesPage` layout decision (internal contract)

`VenuesPage.tsx` MUST compute an effective layout mode from existing data, not introduce new API calls:

```ts
const hasRegions = !regionsLoading && regions.length > 0;
const isUnified = !regionsLoading && regions.length === 0;
// isUnified takes precedence over any persisted `displayMode` preference.
```

| Condition | `data-testid="venues-page-body"` content |
|---|---|
| `isUnified` | `<VenueList>` only |
| `hasRegions && displayMode === 'flat'` | `<VenueList>` |
| `hasRegions && displayMode === 'grouped'` | `<VenueListGrouped>` |

## `VenuesPageControls` contract

| Prop | Behavior change |
|---|---|
| `showRegionFilter` | MUST be computed as `regions.length > 0` (unchanged computation, now also directly gates the whole "region affordances" block below) |
| `showDisplayToggle` | MUST be `false` whenever `regions.length === 0`, even if `venues.length > 0` (previously toggled on `venues.length > 0` alone) |
| create-regions prompt | Replaces the separate `manage-regions` button + `noRegionsHelperText` paragraph combination with **one** element when `regions.length === 0 && canManageVenues`. Keep `data-testid="venues-manage-regions"` on this single element so existing click-handling tests keep working; drop the now-redundant `data-testid="venues-no-regions-helper"` paragraph in this state. |
| (no props removed) | `onManageRegions` callback contract unchanged — still opens `RegionManagementPanel`. |

**Rule**: When `regions.length > 0`, existing behavior (separate region filter, display toggle, "Manage regions" button, no helper text) is unchanged.

## `VenueListGrouped` contract

| Element | Class contract |
|---|---|
| `.venues-group` (named region) | Unchanged base styling |
| `.venues-group.venues-group--unassigned` | New modifier applied when `section.sectionKey === 'unassigned'`; MUST visually distinguish the heading (e.g., muted color/weight) from named-region headings |
| `.venues-group__empty` | Unchanged element/behavior; CSS visual weight aligned with `.dashboard-empty__text` family (no new class name required) |
| Consecutive `.venues-group` siblings | MUST have a consistent divider/spacing rule between them (CSS-only) |

`VenueListGrouped` MUST NOT be used to render the zero-regions "unified" case — that case renders `VenueList` directly (see [research.md](../research.md) D3).

## Test id stability

| `data-testid` | Status |
|---|---|
| `venues-page-controls` | Unchanged |
| `venues-region-filter` | Only rendered when `regions.length > 0` (unchanged condition, now also the sole gate for the toggle) |
| `venues-display-mode` | Only rendered when `regions.length > 0` (changed condition — previously `venues.length > 0`) |
| `venues-manage-regions` | Now serves double duty as the single create-regions prompt when `regions.length === 0` |
| `venues-no-regions-helper` | Removed when `regions.length === 0` (folded into `venues-manage-regions` element); MUST NOT coexist with it |
| `venues-grouped-list`, `venues-region-section-{key}`, `venues-region-empty-{key}` | Unchanged, still only rendered when `hasRegions && displayMode === 'grouped'` |

## Validation checklist (maps to [data-model.md](../data-model.md) VR-001..VR-007)

- [ ] `regions.length === 0` → no `venues-region-filter`, no `venues-display-mode`, exactly one `venues-manage-regions` prompt for managers, zero region elements for non-managers.
- [ ] `regions.length === 0` → venue list renders without any "Unassigned" heading.
- [ ] `regions.length > 0` grouped view → `.venues-group--unassigned` present only on the unassigned section; named-region sections never carry it.
- [ ] Region with zero visible venues still renders `.venues-group__empty`.
- [ ] Regions count transitioning to zero while mounted re-renders to the unified layout without a manual refresh.
