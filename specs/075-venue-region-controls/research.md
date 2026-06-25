# Phase 0 Research: Venue Page Region Controls

**Feature**: `075-venue-region-controls` | **Date**: 2026-06-25

## R1 — Backend changes required?

**Decision**: Frontend-only slice; no new API endpoints, DTOs, or migrations.

**Rationale**: Spec Assumptions and spec 073 already deliver `RegionResponse`, `VenueResponse.regionId`, region CRUD (`/api/regions`), and `RegionManagementPanel`. Filter/group/sort are client-side over existing list payloads.

**Alternatives considered**:
- Server-side `GET /api/venues?regionId=` — rejected: unnecessary round-trip; venue scope already applied server-side; filter is presentation-layer.
- Enrich `VenueResponse` with `regionName` — rejected: join `useRegions()` client-side for grouped headings.

## R2 — View preference persistence mechanism

**Decision**: Cookie-backed storage mirroring `bookingCalendarViewStorage.ts` — `venuesPageRegionFilter` and `venuesPageDisplayMode` cookies, `Max-Age` 1 year, `Path=/`, `SameSite=Lax`.

**Rationale**: Clarification session chose browser persistence; existing product pattern uses cookies (not `localStorage`) for booking calendar display mode; keeps SSR/test hooks consistent.

**Alternatives considered**:
- `localStorage` — rejected: diverges from booking calendar precedent in same codebase.
- URL query params — rejected: clarification chose browser storage; venues page is not shareable-filter use case.

## R3 — Filter/group/sort logic location

**Decision**: Pure functions in `apps/web/src/lib/venueListView.ts` with Vitest unit tests; React components consume outputs.

**Rationale**: Constitution III; clarifications define precise sort/filter/group rules testable without RTL; mirrors `bookingCalendar.ts` pattern.

**Alternatives considered**:
- Inline in `VenuesPage` — rejected: harder to reach coverage threshold and verify edge cases (scoped users, empty regions).
- Shared with booking calendar lib — rejected: different filter semantics (venues list vs calendar view modes).

## R4 — Grouped mode region section source

**Decision**: When filter is `all` and display is `grouped`, render a section for **every organization region** from `useRegions()` (alphabetical), plus `Unassigned` when at least one visible unassigned venue exists; sections with zero venues in the current view show inline "No venues" (clarification Q5).

**Rationale**: Filter dropdown intentionally omits empty regions (FR-003); grouped overview still exposes territory structure including newly created empty regions.

**Alternatives considered**:
- Only sections with ≥1 visible venue — rejected: contradicts Q5 empty-region headings requirement for org regions with no venues yet.

## R5 — Region management panel placement

**Decision**: Reuse existing `RegionManagementPanel` component on `VenuesPage`; remove `onManageRegions` prop and button from `BookingCalendarControls`; delete calendar page state `regionsOpen` wiring for manage entry (panel moves entirely).

**Rationale**: FR-001/FR-002; zero duplication of CRUD UI.

## R6 — Permissions

**Decision**: `useCanManageVenues()` gates "Manage regions" button; filter and display toggle visible to all users who can view the venue list.

**Rationale**: Matches FR-009 and spec 073 R8 (`ManagePermissions` for region CRUD).

## R7 — Styling & layout

**Decision**: New `VenuesPageControls` toolbar row under page header; reuse `team-section` / `team-table` for flat list; grouped sections use `venues-page__region-group` blocks with `h3` headings; responsive stack via existing `venues-page` CSS namespace.

**Rationale**: Aligns with spec 014 venue list patterns; minimal new CSS surface.

## R8 — Booking calendar contract amendment

**Decision**: Update spec 073 UI contract in implementation: remove `booking-manage-regions` from calendar header; document in `contracts/venues-page-ui.md` and note amendment in plan.

**Rationale**: FR-002; calendar retains regional *view* filter only.
