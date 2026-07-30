# Quickstart & Validation Guide: Venues Page Region/Venue Visual Organization

How to validate the reorganized Venues page. References [contracts/venues-page-layout.md](./contracts/venues-page-layout.md) and [data-model.md](./data-model.md).

## Prerequisites

- Node 22 + `npm install` in `apps/web`
- Branch `079-venue-region-layout`
- A running API (or mocked `useRegions`/`useActiveVenue` hooks in tests) with at least one test organization that has **zero** regions and one that has **two or more** regions with a mix of assigned/unassigned venues

## Run dev server

```bash
cd apps/web
npm run dev
```

Sign in and navigate to `/venues` (Venues page) for each scenario below.

## Automated tests (primary gate)

```bash
cd apps/web
npm run test -- tests/pages/VenuesPage.test.tsx tests/components/venue/VenuesPageControls.test.tsx tests/components/venue/VenueListGrouped.test.tsx tests/lib/venueListView.test.ts
npm run test:coverage
npm run build
```

**Expected**: All updated component/page tests pass; existing `VenueList.test.tsx`, `venueListViewStorage.test.ts`, `useCanManageVenues.test.ts` remain unchanged and passing; coverage ≥80% on touched files; build succeeds.

---

## Manual validation checklist

### Zero-regions org (User Story 1)

1. Open `/venues` for an org with venues but zero regions.
2. Confirm **no** region filter dropdown and **no** "List"/"By region" toggle appear.
3. Confirm the venue list renders as a single list with **no** "Unassigned" heading.
4. As a venue-manager user: confirm exactly **one** clearly-placed prompt/action to create regions appears, visually grouped with the page's other controls (not a floating disconnected sentence).
5. As a non-manager user: confirm **no** region-related prompt, filter, or toggle appears at all.
6. Refresh the page and confirm no flash of region controls before settling into the unified layout.

### Multi-region org (User Story 2)

1. Open `/venues` for an org with 2+ regions and some unassigned venues; switch display mode to "By region".
2. Confirm each region renders as its own clearly-headed group with visible separation from the next region's group.
3. Confirm a region with zero currently-visible venues shows a clear "No venues" indicator, not a blank gap.
4. Confirm the "Unassigned" group is visually distinguishable from named-region groups (e.g., muted heading treatment).

### Mode switching (User Story 3)

1. For the multi-region org, toggle between "List" and "By region" repeatedly.
2. Confirm the page header, filter/toggle controls, and overall spacing stay visually stable — only the venue-listing area changes.

### Edge cases

1. Org with regions defined but every venue unassigned: grouped view shows only the "Unassigned" group (each named region shows its empty indicator) and still reads as intentional.
2. Org with exactly one region containing all venues: grouped view for that single region looks no sparser/more awkward than the unified list.
3. While regions/venues are loading, confirm the existing `LoadingPlaceholder` shows — not a partial or incorrect layout.
4. Delete the last region for a test org while the Venues page (in grouped mode) is open; confirm it falls back to the unified list without a manual refresh (VR-006).

---

## Regression checks

- Existing venue CRUD flows (add/edit/delete venue) unaffected — modals and mutations unchanged.
- `RegionManagementPanel` open/close behavior unchanged; only its entry point's labeling/placement on this page changes.
- Saved display-mode/region-filter preferences (`venueListViewStorage`) still persist and are honored again once an org's region count returns above zero.

---

## Related specs

- Spec: [spec.md](./spec.md)
- Plan: [plan.md](./plan.md)
