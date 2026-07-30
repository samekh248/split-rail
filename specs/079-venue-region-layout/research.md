# Phase 0 Research: Venues Page Region/Venue Visual Organization

All Technical Context items resolved — no `NEEDS CLARIFICATION` markers remain. Decisions grounded in the current `apps/web` Venues page implementation (`VenuesPage.tsx`, `VenuesPageControls.tsx`, `VenueListGrouped.tsx`, `venueListView.ts`) on branch `079-venue-region-layout`.

## D1. How to detect the "zero regions" state

**Decision**: Gate all region-grouping UI (region filter, "By region"/"List" toggle, "Manage regions" button, create-regions prompt) behind `!regionsLoading && regions.length === 0`, using the already-fetched `useRegions()` result — the same signal `VenuesPage.tsx` already uses for `noRegionsHelperText`.

**Rationale**: `regions.length === 0` is the authoritative, tenant-scoped signal for "this organization has no regions at all." It already exists in `VenuesPage.tsx` and is what `buildRegionFilterOptions` effectively keys off of (returns `[]` when `regions.length === 0`).

**Alternatives considered**:
- Infer "no regions" from whether any venue currently has a `regionId` — rejected: an org could have created a region with zero venues assigned yet, which per spec Edge Cases must still show grouping controls (regions exist, they're just all empty).
- Only suppress the display-mode toggle, leaving the region filter as-is — rejected: `buildRegionFilterOptions` already returns an empty option list in this case, so the filter dropdown is effectively dead UI; spec FR-001 requires it not render at all.

## D2. Reconciling the zero-regions state with a saved display-mode preference

**Decision**: Keep `venueListViewStorage` reading/writing exactly as today (unchanged persistence), but at render time in `VenuesPage.tsx`, treat the *effective* display mode as `'flat'` whenever `regions.length === 0`, regardless of the stored `displayMode` value. Do not mutate or clear the stored preference.

**Rationale**: Satisfies FR-002 (unified list, no exceptions) and FR-010 (automatic fallback if regions are deleted down to zero while the page is open) and the spec Assumption that a saved "grouped" preference should be honored again once regions exist, without adding a new persistence branch or storage migration.

**Alternatives considered**:
- Clear the persisted preference when regions hits zero — rejected: loses user intent and adds an extra write path for no behavioral gain.
- Force-navigate or remount the page when the count changes — unnecessary; a derived value recomputed from existing React Query data (`regions.length`) already re-renders reactively (satisfies FR-010) without extra effects.

## D3. Rendering the unified list (no "Unassigned" heading) when zero regions

**Decision**: When `regions.length === 0`, render the existing flat `VenueList` component (already used for the `'flat'` display mode) instead of routing through `VenueListGrouped` with a single synthetic "Unassigned" section.

**Rationale**: `VenueList` is already fully built, tested, and heading-free apart from its own "Your venues" heading — reusing it exactly matches FR-002 with no new component and no branching inside `VenueListGrouped` for a case that doesn't involve grouping at all.

**Alternatives considered**:
- Add a "hide heading when the only section is 'unassigned' and it's the sole section" flag to `VenueListGrouped` — rejected: conflates two different concerns (real grouping vs. no grouping) inside one component, adding conditional complexity where a plain reuse of `VenueList` is simpler.

## D4. Collapsing the "Manage regions" button and helper text into one integrated prompt

**Decision**: When `regions.length === 0` and `canManageVenues` is true, render a single combined call-to-action (the existing "Manage regions" action, re-labeled/re-styled as the create-regions prompt) inside `VenuesPageControls`, and remove the separate floating `noRegionsHelperText` paragraph. When `canManageVenues` is false, render nothing region-related.

**Rationale**: Directly resolves FR-003/FR-004 and the spec's called-out symptom — today's page can simultaneously show a "Manage regions" button *and* a separate sentence telling the user to "Create regions with Manage regions," which is redundant, disconnected messaging (the literal "disjointed" complaint).

**Alternatives considered**:
- Keep both elements, only restyle via CSS spacing — rejected: doesn't remove the redundant duplicate messaging the spec explicitly calls out; a CSS-only fix wouldn't satisfy FR-003's "exactly one" requirement.

## D5. Preventing a loading-state flash of the wrong layout

**Decision**: Continue to gate the entire controls/list region on `!isPending && !isError` (venues) as today, and additionally require `!regionsLoading` before deciding between the unified-list and grouped-list branches; show the existing `LoadingPlaceholder` until both resolve.

**Rationale**: Reuses the two booleans already present in `VenuesPage.tsx` (`isPending` for venues, `regionsLoading` for regions) — no new loading-state abstraction needed to satisfy FR-009/SC-004.

**Alternatives considered**:
- Introduce a combined `isPageReady` hook/selector — rejected as an unnecessary abstraction over two existing booleans already colocated in the same component.

## D6. Visual distinction between region groups and the "Unassigned" group

**Decision**: Add a CSS modifier class `venues-group--unassigned` applied to the existing `.venues-group` `<section>` in `VenueListGrouped.tsx` when `sectionKey === 'unassigned'`, giving it a muted/secondary heading treatment (e.g., lighter heading color, "Unassigned" label styled as a status rather than a place name) while keeping the same structural markup as named-region sections. Named-region sections get a consistent divider/spacing rule between consecutive `.venues-group` instances.

**Rationale**: Minimal, CSS-only change on top of the existing `venues-grouped-list` / `venues-group` structure already in `index.css`; satisfies FR-005/FR-006 without new components or markup patterns.

**Alternatives considered**:
- Separate React components per group kind (`RegionGroup` vs `UnassignedGroup`) — rejected: unnecessary duplication: the spec only requires visual (not structural/behavioral) differentiation.

## D7. Empty-region indicator consistency

**Decision**: Keep the existing `VenueListGrouped.tsx` behavior of rendering `<p className="venues-group__empty">No venues</p>` for a region with zero currently-visible venues; only adjust `.venues-group__empty` CSS so its visual weight matches the page's other empty-state treatments (`.dashboard-empty__text` styling family).

**Rationale**: The functional behavior already satisfies FR-007 ("consistent, clearly-labeled empty indicator"); the gap is purely visual consistency with the rest of the page's empty-state language, not new logic.

**Alternatives considered**: None needed — no functional gap identified here, confirmed by reading `VenueListGrouped.tsx` directly.

## D8. Test strategy

**Decision**: Three-layer verification, consistent with existing test patterns in `apps/web/tests`:
1. **Selector/logic unit tests** (`tests/lib/venueListView.test.ts`): cover the zero-regions vs. has-regions branching logic if any new pure helper is extracted (e.g., an `shouldUseGroupedView(regions)` predicate) — or, if the branching stays inline in `VenuesPage.tsx`, cover it via the page-level tests below.
2. **Component tests** (`tests/pages/VenuesPage.test.tsx`, `tests/components/venue/VenuesPageControls.test.tsx`, `tests/components/venue/VenueListGrouped.test.tsx`): assert the absence of the region filter/toggle/duplicate helper text when `regions` is empty, presence of exactly one create-regions prompt for managers, and correct grouped rendering/visual classes when regions exist.
3. **Regression**: existing `VenueList.test.tsx`, `venueListViewStorage.test.ts`, and `useCanManageVenues.test.ts` remain unchanged and passing, since none of their contracts change.

**Rationale**: Matches Constitution III (Vitest + RTL for frontend) and the project's established per-component test layout; ≥80% coverage is achievable by testing the new conditional branches directly where they're introduced.

**Alternatives considered**:
- Playwright E2E for this — rejected as unnecessary; this is a single-user, single-tenant-view presentational change with no multi-user workflow, so Constitution III's Playwright requirement (multi-user workflows/tenant isolation) doesn't apply.

## D9. Backend/API scope

**Decision**: No backend, DTO, or `generated-api.ts` changes. `RegionResponse`/`VenueResponse` already carry everything needed (`regionId`, region `id`/`name`).

**Rationale**: Confirmed by reading `apps/api/Controllers/VenuesController.cs` region/venue DTOs indirectly via existing frontend usage — the page already has all data it needs; this is purely a presentation reorganization per the spec's Assumptions section.

**Alternatives considered**: None — no data gap identified.
