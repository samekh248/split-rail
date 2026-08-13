# Contract: Header Venue Dropdown Region Filter (080)

Component behavior and `data-testid` contract for the region filter/grouping added to the header venue switcher. Runtime source of truth: `apps/web/src/components/venue/VenueSwitcher.tsx`, consuming `apps/web/src/lib/venueListView.ts` (unmodified) and `apps/web/src/api/regions.ts` (unmodified). Test parity: `apps/web/tests/venue/VenueSwitcher.test.tsx`.

No backend/API contract changes — this feature is presentation-only (see [data-model.md](../data-model.md)).

## Rendering decision (internal contract)

`VenueSwitcher.tsx` MUST compute the dropdown's option list from existing data, not introduce new API calls:

```ts
const showRegionFilter = !regionsLoading && regions.length > 0;
const filteredVenues = filterVenuesByRegion(venues, regionFilter);
const groupedSections = regionFilter === 'all'
  ? buildGroupedSections(venues, regions, 'all').filter((section) => section.venues.length > 0)
  : buildGroupedSections(venues, regions, regionFilter); // single section, may be empty
```

| Condition | Dropdown body |
|---|---|
| `!showRegionFilter` | Existing flat, ungrouped venue list — unchanged from today (spec FR-007) |
| `showRegionFilter && regionFilter === 'all'` | Grouped list: non-empty region sections + "Unassigned" (if applicable), each as a `kind: 'header'` entry followed by its `kind: 'venue'` entries |
| `showRegionFilter && regionFilter !== 'all'` | Single filtered section; if empty, render the empty-state message instead of a section |

## Filter control contract

| Prop/behavior | Requirement |
|---|---|
| Visibility | Rendered only when `regions.length > 0` (spec FR-007); `data-testid="venue-switcher-region-filter"` |
| Options | Built via `buildRegionFilterOptions(venues, regions)` — "All regions" always first, named regions with at least one visible venue, "Unassigned" last only if applicable (spec FR-005) |
| Default value | `'all'` on every mount (no persisted read) |
| On change | Updates local `regionFilter` state only; does not call `setActiveVenue`/`activateVenueId` |

## Option list contract

| `data-testid` | Status |
|---|---|
| `venue-option-all` | Unchanged — always present, always first, unaffected by `regionFilter` |
| `venue-option-{venueId}` | Unchanged selection behavior; now sourced from the filtered/grouped set instead of the raw `venues` array |
| `venue-switcher-section-{sectionKey}` | New — non-interactive heading row (`sectionKey` is a region `id` or `'unassigned'`); excluded from keyboard traversal and click selection |
| `venue-switcher-empty` | New — rendered only when `regionFilter !== 'all'` and the filtered venue set is empty (spec FR-008) |

## Keyboard/interaction contract

- `ArrowDown`/`ArrowUp` traversal and `Enter` selection MUST skip `kind: 'header'` entries (research.md D4); behavior for `kind: 'all'`/`kind: 'venue'` entries is unchanged.
- Selecting a `kind: 'venue'` option MUST call the same `setActiveVenue`/`activateVenueId` path used today, regardless of `regionFilter` value (spec FR-006) — no new selection code path.
- Closing/reopening the dropdown (without a full page reload) preserves the current `regionFilter` value; a full page reload resets it to `'all'` (research.md D5).

## Validation checklist (maps to [data-model.md](../data-model.md) VR-001..VR-008)

- [ ] `regions.length === 0` → no `venue-switcher-region-filter`, dropdown identical to pre-feature behavior.
- [ ] `regions.length > 0`, `regionFilter === 'all'` → region sections with venues render as headings, empty regions are omitted, "Unassigned" appears only when at least one venue lacks a region.
- [ ] `regions.length > 0`, `regionFilter` set to a specific region/`'unassigned'` with venues → only that section's venues are selectable.
- [ ] `regions.length > 0`, `regionFilter` set to a region with zero matching venues → `venue-switcher-empty` message renders, no stale/blank list.
- [ ] "All Venues" option always present and selectable regardless of `regionFilter`.
- [ ] Selecting any venue option (filtered or not) results in the identical active-venue state change as the unfiltered dropdown today.
- [ ] Keyboard navigation never highlights or selects a `kind: 'header'` entry.
