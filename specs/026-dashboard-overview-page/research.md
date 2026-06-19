# Research: Dashboard Overview Page with Priority Zones

**Feature**: `026-dashboard-overview-page` | **Date**: 2026-06-18

## 1. Tonight hero: one event vs all today-dated events

**Decision**: `TonightHeroBanner` renders **all** events whose `eventDate` matches local calendar today, sorted by lifecycle phase priority (`NightOf` > `PreShow` > `PostShow` > `Unknown`) then `eventDate` ascending.

**Rationale**: Spec acceptance scenario 2.3 requires multiple today events in the hero. Existing `selectTonightHero()` returns a single “priority” event (SPLR-64) for other use cases; overview needs `filterTonightEvents()` instead.

**Alternatives considered**:
- Reuse `selectTonightHero` only → rejected; shows one card, fails FR-005 multi-event case.
- Show only highest-priority today event → rejected; contradicts clarified spec.

## 2. Zone partition module location

**Decision**: New pure module `apps/web/src/lib/partitionOverviewZones.ts` exporting `partitionOverviewZones()` and focused helpers.

**Rationale**: Keeps `eventLifecycle.ts` focused on phase/bottleneck derivation; partition rules are overview-specific (7d/30d windows, pin overlap, today exclusivity). Easier to test SC-003 matrix in isolation.

**Alternatives considered**:
- Extend `eventLifecycle.ts` → rejected; mixes lifecycle phase logic with calendar window partitioning.
- Inline partition in page component → rejected; harder to test and reuse.

## 3. Pin persistence mechanism

**Decision**: Reuse `pinnedEventStorage.ts` (**localStorage**, keyed `venueId:eventId`) from SPLR-65/025.

**Rationale**: Already implemented and tested; spec “browser session” clarification means Phase 1 client-side persistence without API, not strictly `sessionStorage`. Linear issue mentioned `sessionStorage` but shipped 025 helper uses `localStorage` with cross-reload persistence—acceptable for pin UX.

**Alternatives considered**:
- New `sessionStorage` adapter → rejected; duplicates 025 work; pins would not survive refresh within “session” definition users expect.
- Server pin API → out of scope (Phase 2).

## 4. Inter-zone overlap rules

**Decision**: Implement clarified rules exactly:
- Today → hero only (+ pinned if pinned); excluded from recent/upcoming.
- Pinned → always in pinned zone; **also** in recent/upcoming when dates match those windows.
- Hero + pinned duplicate allowed; hero does not duplicate into recent/upcoming.

**Rationale**: Recorded in spec clarifications session 2026-06-18; drives acceptance tests.

**Alternatives considered**:
- Deduplicate pinned from date zones → rejected in clarification Q4.

## 5. DashboardHome retirement

**Decision**: Replace `DashboardHome` in `App.tsx` with `DashboardOverviewPage`; delete `DashboardHome.tsx` and migrate tests.

**Rationale**: FR-001 explicitly ends auto-redirect behavior. Keeping `DashboardHome` creates dead code and dual entry paths.

**Alternatives considered**:
- Rename `DashboardHome` in place → acceptable shortcut but current file is redirect-only; cleaner to new page component.

## 6. Create-event on overview

**Decision**: No create-event CTA or `EventFormPanel` on overview; no-events empty state is informational only. Creation remains on `EventWorkspacePage`.

**Rationale**: Clarification Q5 — “create event only shows in the event management page.”

**Alternatives considered**:
- Retain interim `DashboardHome` create CTA → rejected per clarification.

## 7. Workspace bar composition

**Decision**: Overview uses `useShellWorkspaceBar` with `VenueSwitcher` and optional “Add venue” button (when `canManageVenues`); **no** `EventCombobox` on overview.

**Rationale**: Matches spec FR-003; event selection happens via overview cards or workspace URL, not combobox on landing page.

**Alternatives considered**:
- Include EventCombobox on overview → rejected; wrong mental model for zone-based landing.

## 8. Line items / variance badges on overview

**Decision**: Overview does **not** fetch per-event ledger rows; `EventCard` rendered without `lineItems` prop → variance badge suppressed (025 contract).

**Rationale**: Avoids N+1 ledger fetches on landing page; bottleneck chips and quick links still work from `EventResponse` alone.

**Alternatives considered**:
- Batch-fetch line items for all visible events → rejected; scope/performance cost for v1.

## 9. Zone display order and empty states

**Decision**: Vertical order: **Pinned → Tonight hero → Upcoming → Recent**. Pinned/upcoming/recent always show section heading; empty zones show minimal message (e.g. “No upcoming events”). Tonight hero hidden entirely when no today events.

**Rationale**: Clarifications Q2 and Q3.

**Alternatives considered**:
- Hide empty zones → rejected in clarification Q2 (user chose B).
