# Implementation Plan: Venue Page Region Controls

**Branch**: `075-venue-region-controls` | **Date**: 2026-06-25 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/075-venue-region-controls/spec.md`

## Summary

Relocate **Manage regions** from the Booking Calendar to the Venues page; add client-side **region filter** and **flat/grouped display toggle** with cookie-backed preference persistence. Reuse spec 073 `RegionManagementPanel` and existing `/api/regions` + `VenueResponse.regionId`. Pure `venueListView.ts` lib handles filter, sort, and grouped sections; no backend changes.

## Technical Context

**Language/Version**: TypeScript 5.7 + React 18 (`apps/web`); C# / .NET 8 API unchanged

**Primary Dependencies**: TanStack Query (`useVenues`, `useRegions`); existing `RegionManagementPanel`; `useCanManageVenues`; cookie helpers pattern from `bookingCalendarViewStorage.ts`

**Storage**: PostgreSQL unchanged; browser cookies for view preferences (`venuesPageRegionFilter`, `venuesPageDisplayMode`)

**Testing**: Vitest + React Testing Library for lib, components, and page; ≥80.0% line/branch coverage on `apps/web` for touched files; no new xUnit tests (zero backend delta)

**Target Platform**: Vite SPA — `/venues` route inside `AppShell`

**Project Type**: Web application (`apps/api` + `apps/web`)

**Performance Goals**: Filter/toggle update &lt;1s without navigation (SC-003); client-side derive over ≤50 venues

**Constraints**: No hand-written API types (Constitution VI); Font Awesome for any new icons (Constitution IX); ≥80.0% frontend coverage on changed code; no deploy script changes (§X N/A)

**Scale/Scope**: ~10 new/modified frontend files; 0 backend files; 5 test files added/extended

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Relevance | Status |
|-----------|-----------|--------|
| I. Core Mathematical Axioms | No monetary fields. | N/A |
| II. Multi-Tenant Isolation | Uses existing scoped venue/region APIs. | PASS |
| III. Engineering Rigor & Quality Gates | Vitest for lib + page + components; coverage gate. | PASS (with tests) |
| IV. QBO Integration Boundaries | No QBO interaction. | N/A |
| V. Ledger State Machine | No ledger mutations. | N/A |
| VI. Polyglot Contract & Serialization | `VenueResponse`, `RegionResponse` from `generated-api.ts` only. | PASS |
| VII. EF Core Axioms | No new EF code. | N/A |
| VIII. Exception Governance & Logging | Region panel errors unchanged; venue list error states preserved. | PASS |
| IX. UI Iconography | Use Font Awesome if adding icons to toolbar. | PASS |
| X. Dual-Platform Operator Scripts | No deploy scripts in scope. | N/A |

**Post-design re-check**: PASS. No violations; Complexity Tracking not required.

## Project Structure

### Documentation (this feature)

```text
specs/075-venue-region-controls/
├── plan.md              # This file
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/
│   └── venues-page-ui.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
apps/web/src/
├── lib/
│   ├── venueListView.ts              # NEW: filter, sort, buildGroupedSections
│   └── venueListViewStorage.ts       # NEW: cookie persistence
├── components/
│   └── venue/
│       ├── VenuesPageControls.tsx    # NEW: filter, toggle, manage regions btn
│       ├── VenueListGrouped.tsx      # NEW: grouped sections + empty message
│       └── VenueList.tsx             # MODIFIED: accept pre-sorted venues
├── pages/
│   └── VenuesPage.tsx                # MODIFIED: wire controls, panel, modes
└── components/booking/
    └── BookingCalendarControls.tsx   # MODIFIED: remove manage regions

apps/web/src/pages/
└── BookingCalendarPage.tsx           # MODIFIED: remove RegionManagementPanel wiring

apps/web/tests/
├── lib/
│   ├── venueListView.test.ts         # NEW
│   └── venueListViewStorage.test.ts  # NEW
├── components/venue/
│   └── VenueListGrouped.test.tsx     # NEW
├── pages/
│   └── VenuesPage.test.tsx           # MODIFIED
└── booking/
    └── BookingCalendarControls.test.tsx  # MODIFIED (if exists) or page test
```

**Structure Decision**: Frontend vertical slice only. Reuse booking region panel component without relocation to `components/venue/` (minimize diff).

## Implementation Phases

### Phase A — Pure lib & storage

1. `venueListView.ts` — `buildRegionFilterOptions`, `filterVenuesByRegion`, `sortVenuesByName`, `buildGroupedSections`.
2. `venueListViewStorage.ts` — cookie read/write mirroring booking calendar pattern.
3. Unit tests with edge cases: scoped subset, empty regions, unassigned visibility rules.

### Phase B — UI components

1. `VenuesPageControls` — region `<select>`, display mode toggle, manage regions button.
2. `VenueListGrouped` — section headings, empty "No venues", per-section table with edit/delete.
3. CSS additions under `venues-page` namespace in `index.css`.

### Phase C — Page integration

1. `VenuesPage` — load preferences on mount; derive filtered view; swap list components; wire `RegionManagementPanel`.
2. Empty states: org empty vs filter empty vs load error (FR-010).
3. Invalidate/refetch on region panel success.

### Phase D — Calendar cleanup (FR-002)

1. Remove manage regions button and `onManageRegions` from `BookingCalendarControls`.
2. Remove panel state from `BookingCalendarPage`.
3. Update booking calendar tests.

### Phase E — Verification

1. Run quickstart scenarios A–F.
2. `npm run test:coverage` in `apps/web`.
3. Confirm ≥80% on new/changed modules.

## Complexity Tracking

> Not required — no constitution violations.
