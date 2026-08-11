# Quickstart & Validation Guide: Header Venue Dropdown Region Filter

How to validate the region filter/grouping added to the header venue switcher. References [contracts/venue-switcher-region-filter.md](./contracts/venue-switcher-region-filter.md) and [data-model.md](./data-model.md).

## Prerequisites

- Node 22 + `npm install` in `apps/web`
- Branch `080-header-venue-region-filter`
- A running API (or mocked `useVenues`/`useRegions`/`useActiveVenue` hooks in tests) with at least one test organization that has **zero** regions and one that has **two or more** regions with a mix of assigned/unassigned venues

## Run dev server

```bash
cd apps/web
npm run dev
```

Sign in and open the header venue dropdown (visible on the dashboard, event workspace, and accounting overview shells) for each scenario below.

## Automated tests (primary gate)

```bash
cd apps/web
npm run test -- tests/venue/VenueSwitcher.test.tsx tests/lib/venueListView.test.ts
npm run test:coverage
npm run build
```

**Expected**: Updated `VenueSwitcher.test.tsx` passes with new region filter/grouping coverage; `venueListView.test.ts` remains unchanged and passing (selectors untouched); coverage ≥80% on touched files; build succeeds.

---

## Manual validation checklist

### Zero-regions org

1. Sign in to an org with venues but zero regions.
2. Open the header venue dropdown.
3. Confirm **no** region filter control appears and the list looks exactly as it does today (flat, "All Venues" + venues).

### Multi-region org — filter (User Story 1)

1. Sign in to an org with venues across 2+ regions.
2. Open the header venue dropdown; confirm a region filter control is present.
3. Select a specific region; confirm only that region's venues (plus "All Venues") remain selectable.
4. Select a venue from the filtered list; confirm it becomes the active venue and downstream views reload for it, identically to selecting from the unfiltered list.
5. Reset the filter to "All regions"; confirm the full list returns.

### Multi-region org — grouping (User Story 2)

1. With no filter applied, open the header dropdown for the same org.
2. Confirm venues are grouped under region headings (alphabetical), plus an "Unassigned" group if any accessible venue lacks a region.
3. Confirm "All Venues" still renders first, outside any grouping.
4. Confirm region headings are visible but not selectable/keyboard-focusable (arrow keys skip over them).

### No-regions / empty-result edge cases (User Story 3)

1. Confirm the zero-regions org from above shows no region filter control at all (not a disabled/empty one).
2. In a multi-region org, filter to a region with no venues currently visible to the signed-in user; confirm an inline "no venues match" message appears instead of a blank list.
3. Reassign a venue to a different region (or delete its region) while signed in, then reopen the dropdown; confirm the grouping/filter reflects the current assignment (no stale grouping).

---

## Regression checks

- The active-venue scoping model is unchanged: selecting "All Venues" or a specific venue behaves identically to spec 009, whether or not a region filter was used to find it.
- The Venues admin page's own region filter/grouping (spec 075/079) is unaffected — `venueListView.ts` selectors are consumed, not modified.
- Reloading the page resets the header dropdown's region filter to "All regions" (not persisted), while the active venue itself still persists per spec 009's existing `sessionStorage` behavior.

---

## Related specs

- Spec: [spec.md](./spec.md)
- Plan: [plan.md](./plan.md)
