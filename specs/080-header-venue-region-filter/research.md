# Phase 0 Research: Header Venue Dropdown Region Filter

All Technical Context items resolved — no `NEEDS CLARIFICATION` markers remain. Decisions grounded in the current `apps/web` header switcher implementation (`VenueSwitcher.tsx`, `VenueContext.tsx`, `useActiveVenue.ts`, `activeVenueStorage.ts`) and the region-grouping selectors already built for the Venues admin page (`venueListView.ts`, `venueListViewStorage.ts`) on branch `080-header-venue-region-filter`.

## D1. Where region data comes from for the header dropdown

**Decision**: Call `useRegions()` (from `src/api/regions.ts`) directly inside `VenueSwitcher.tsx`, alongside the existing `useActiveVenue()` venues. Do not add region data to `VenueContext`.

**Rationale**: `useRegions()` is already a tenant-scoped, cached React Query hook (`staleTime: 30_000`) used elsewhere; `VenueContext` is deliberately scoped to venue/active-venue concerns (spec 009) and other consumers of `useActiveVenue()` don't need region data, so widening the context would be an unused-surface-area increase for no benefit.

**Alternatives considered**:
- Add `regions` to `VenueContextValue` — rejected: every consumer of `useActiveVenue()` (workspace, dashboard, accounting pages) would re-render on region query changes even though only `VenueSwitcher` needs it.

## D2. Reusing vs. duplicating the region filter/grouping logic

**Decision**: Import `filterVenuesByRegion`, `buildRegionFilterOptions`, and `buildGroupedSections` from `apps/web/src/lib/venueListView.ts` unchanged. No new selector module.

**Rationale**: These are pure functions already covering exactly the transformations this feature needs (filter by region/unassigned, build filter option list gated on "has at least one visible venue," build region-grouped sections). Reusing them satisfies the spec's assumption of reusing spec 075/079's logic and avoids a second implementation of region-bucketing rules (e.g., "Unassigned" only appears when applicable) that would need to be kept in sync.

**Alternatives considered**:
- Fork a header-specific copy of the selectors — rejected: duplicates logic with no behavioral difference needed, risking drift (e.g., the "Unassigned" visibility rule changing in one place but not the other).

## D3. Handling empty region sections in the grouped (unfiltered) view

**Decision**: When browsing with no region filter applied ("All regions"), filter `buildGroupedSections(...)` output down to sections with at least one venue before rendering — the header popover has limited vertical space, so regions with zero currently-visible venues are omitted rather than shown with an empty-state line (unlike the Venues admin page's grouped table, which has room for that). When a user explicitly selects a specific region via the filter control and it has zero venues, render the FR-008 inline empty message instead (a single result, not a list of mostly-empty sections).

**Rationale**: Directly satisfies spec FR-008 (explicit empty-state only when a specific filter yields nothing) while keeping the default browse view (User Story 2) free of clutter that would be disproportionately expensive in a small dropdown compared to a full admin table page.

**Alternatives considered**:
- Always show empty sections with "No venues" (matching `VenueListGrouped` exactly) — rejected: multiple near-empty region headers in a compact popover directly conflicts with the scanability goal (SC-001) that motivated this feature.

## D4. Extending keyboard navigation for grouped/filtered options

**Decision**: Extend the existing `VenueOption` union in `VenueSwitcher.tsx` with a non-selectable `{ kind: 'header'; label: string }` variant used for region section headings. The existing `options` array (already the source for both rendering and `ArrowUp`/`ArrowDown`/`Enter` handling) includes header entries for rendering, but arrow-key traversal and `Enter` selection skip `kind: 'header'` entries (mirroring how `kind: 'all'` is already a distinct, always-selectable entry).

**Rationale**: `VenueSwitcher`'s keyboard handling already operates over a flat `options` array; adding one more discriminated variant is the smallest change that preserves existing `ArrowDown`/`ArrowUp`/`Enter`/`Escape` behavior (unchanged for the ungrouped case, since no `header` entries exist without regions) while making section headings render as non-interactive list items.

**Alternatives considered**:
- Nested list/sub-menu per region — rejected: much larger change to markup, ARIA roles (`listbox`/`option` semantics), and keyboard handling than the flat-list-with-skippable-headers approach for no added user value.

## D5. Region filter persistence

**Decision**: Hold the selected region filter in local `VenueSwitcher` component state (`useState<VenueRegionFilter>('all')`), not written to `sessionStorage` or cookies. It naturally resets to `'all'` on a full page reload (React tree remount) and stays put across in-app navigation for as long as the header stays mounted.

**Rationale**: Matches the spec Assumption directly: the filter should behave like the session-scoped active-venue selection in spirit (ephemeral, not cross-session), but is explicitly *not* meant to adopt the Venues admin page's cookie-based cross-session persistence (spec 075), since it's a lightweight browsing aid rather than a durable admin preference.

**Alternatives considered**:
- Reuse `venueListViewStorage.ts` cookie persistence — rejected: spec Assumptions explicitly distinguish this feature's filter from the admin page's persisted preference; reusing it would silently couple two independent UI surfaces' state.

## D6. "All Venues" option placement relative to the filter

**Decision**: The synthetic "All Venues" option (`ALL_VENUES_LABEL`) always renders first, outside/above any region grouping or filter effect, exactly as today.

**Rationale**: Directly satisfies spec FR-003/User Story 2 Acceptance Scenario 4 — "All Venues" represents a scope broader than any single region, so it must stay visible and unaffected regardless of the region filter's value.

**Alternatives considered**:
- Hide "All Venues" while a region filter is active — rejected: spec explicitly calls this out as required behavior (Edge Cases: "All Venues" always shown, unaffected by the region filter).

## D7. Test strategy

**Decision**: Extend the existing `apps/web/tests/venue/VenueSwitcher.test.tsx` (component tests, Vitest + RTL) to cover: region filter control visibility (hidden with zero regions), filtering narrows the option list, grouped headings render and are keyboard-skippable, "Unassigned" section appears only when applicable, empty-filter-result message, and that selecting a venue through a filtered/grouped view still calls `setActiveVenue` exactly as the unfiltered path does today. No new Playwright E2E spec — this remains a single-user, single-tenant-view UI change with no multi-user workflow (Constitution III's Playwright requirement targets multi-user/tenant-isolation flows).

**Rationale**: Matches Constitution III (Vitest + RTL for frontend) and the existing per-component test layout; `venueListView.ts`'s own selectors already have dedicated unit test coverage (`tests/lib/venueListView.test.ts`) from spec 075/079 and need no new tests since they're unmodified.

**Alternatives considered**: None — no new pure logic is introduced that isn't already covered by existing `venueListView.test.ts` coverage; the only new logic (header-skipping keyboard nav, empty-section filtering) lives in `VenueSwitcher.tsx` and is covered by its component tests.

## D8. Backend/API scope

**Decision**: No backend, DTO, or `generated-api.ts` changes. `RegionResponse`/`VenueResponse` already carry everything needed (`regionId`, region `id`/`name`), and `useRegions()`/`useVenues()` are already tenant-scoped.

**Rationale**: Confirmed by reading the existing hooks and types used by the Venues admin page, which already solves the identical data-shape problem; this feature only changes where/how that data is rendered (header popover vs. full page).

**Alternatives considered**: None — no data gap identified.
