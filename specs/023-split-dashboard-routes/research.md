# Phase 0 Research: Split Dashboard Routes and Event Workspace

**Feature**: `023-split-dashboard-routes` | **Date**: 2026-06-18

Resolves technical unknowns for SPLR-63. Spec assumptions (interim `/` redirect, no overview page, no focus scroll, no E2E in this slice) are incorporated.

## D1. Frontend-only feature; no backend or API changes

- **Decision**: Implement entirely in `apps/web`. No C# DTO, endpoint, migration, or swagger changes. Venue/event data continues via existing `useVenues` and `useEvents` hooks.
- **Rationale**: Spec FR-011 and assumptions state no new data model. Constitution III backend coverage applies to touched backend files — none expected.
- **Alternatives considered**:
  - *Server-side redirect endpoint for workspace URLs*: rejected — SPA already owns routing via History API.
  - *React Router migration*: rejected — 022-vertical-navigation explicitly chose History API (`appRoute.ts`); adding a router dependency for one dynamic segment is unnecessary churn.

## D2. Workspace URL pattern and History API extension

- **Decision**: Canonical workspace path: `/venues/{venueId}/events/{eventId}` where IDs are UUID strings from existing API responses. Helpers: `buildEventWorkspacePath`, `parseEventWorkspacePath`, `isEventWorkspacePath`. Navigation uses existing `pushPath` + `popstate` dispatch pattern from `appRoute.ts`.
- **Rationale**: Matches Linear SPLR-63 scope and TDD §3.1/§6.1 intent. Keeps URLs human-readable and consistent with `/venues/new` prefix convention.
- **Alternatives considered**:
  - *Query params `/?venue=&event=`*: rejected — not bookmark-friendly; contradicts TDD route split.
  - *Hash routing `#/venues/...`*: rejected — inconsistent with existing path-based History API.

## D3. URL as source of truth on workspace load; session storage on navigation

- **Decision**: On `EventWorkspacePage` mount, URL `venueId`/`eventId` take precedence over `activeVenueStorage` / `activeEventStorage`. In-app event/venue changes call `navigateToEventWorkspace` which updates URL **and** persists to session storage via existing `setActiveVenueId` / `setActiveEventId`.
- **Rationale**: FR-009 edge case ("URL takes precedence on initial load"); FR-003/FR-004 require URL sync on interaction. Reuses `resolveActiveEventId` for fallback when URL event is missing or invalid.
- **Alternatives considered**:
  - *Session storage only with cosmetic URL update*: rejected — breaks refresh and share-link scenarios (User Story 1).
  - *Drop session storage entirely*: rejected — still needed for `/` entry redirect defaulting before URL exists.

## D4. Extract `EventWorkspacePage`; slim `DashboardHome` as interim entry

- **Decision**: Move today's full workspace UI (venue bar, combobox, panels, ledger) from `DashboardHome.tsx` to new `EventWorkspacePage.tsx`. `DashboardHome` becomes entry-only: resolve venue + event, `pushState` redirect to workspace when events exist, otherwise render existing no-venue / no-events empty states at `/`.
- **Rationale**: Spec FR-007 and assumption "interim `/` redirects when events exist." Separates concerns for SPLR-66 (overview replaces entry) without blocking this slice.
- **Alternatives considered**:
  - *Keep workspace at `/` and add workspace route as alias*: rejected — contradicts TDD two-route model and blocks overview page.
  - *Single page with internal route mode flag*: rejected — harder to test, doesn't produce shareable URLs.

## D5. Dedicated `eventWorkspaceRoute.ts` navigation module

- **Decision**: New `lib/eventWorkspaceRoute.ts` exports `navigateToEventWorkspace(venueId, eventId, focus?)` and re-exports `navigateToDashboard` from `appRoute.ts`. Optional `focus` appends `?focus={segment}` to the path but scroll targeting is a no-op until SPLR-67.
- **Rationale**: Linear issue scope; isolates workspace navigation from generic `appRoute.ts` settings/auth paths. `dashboardRoute.ts` re-exports for backward-compatible imports in tests.
- **Alternatives considered**:
  - *Inline navigation in page components only*: rejected — duplicates URL building; harder to unit test.

## D6. Global nav active matching via path patterns

- **Decision**: Extend `resolveActiveGlobalNavId` and `GLOBAL_NAV_ITEMS` matching to treat any path matching `/venues/*/events/*` as Dashboard-active alongside `/` and `/venues/new`. Implement `matchesDashboardNavPath(pathname)` rather than extending static `AppPath` union with infinite workspace variants.
- **Rationale**: FR-006; `AppPath` union cannot enumerate dynamic UUID segments. Pattern match is testable and matches SPLR-63 acceptance criteria.
- **Alternatives considered**:
  - *Add every workspace path to `matchPaths` array*: rejected — impossible for dynamic IDs.
  - *No highlight on workspace routes*: rejected — violates User Story 3.

## D7. Settings return path captures workspace URLs

- **Decision**: Extend `settingsReturnStorage.ts` to store full pathname for workspace routes (and `/venues/new`), not only `/`. `readSettingsReturnPath` returns stored workspace path when valid.
- **Rationale**: Users deep-linked into a ledger who open Settings must return to the same event workspace, not bare `/` which would redirect elsewhere.
- **Alternatives considered**:
  - *Always return `/` from settings*: rejected — regresses wayfinding for workspace users.

## D8. Invalid and mismatched URL resolution

- **Decision**:
  - Venue not in user's list → non-destructive alert + `navigateToDashboard()`.
  - Event not in venue's event list → `resolveActiveEventId(events, venueId)` + `replaceState` to corrected URL (no misleading ledger).
  - Event belongs to different venue than URL venueId → treat as unknown event for that venue (resolve default).
  - Malformed path (failed parse) → `navigateToDashboard()`.
- **Rationale**: FR-009 and spec edge cases. Client-side validation only — server already scopes events by venue via API.
- **Alternatives considered**:
  - *Render ledger with URL ids without validation*: rejected — cross-venue mismatch risk.
  - *Hard 404 page*: rejected — SPA has no server router; soft fallback matches existing empty-state tone.

## D9. Test migration strategy

- **Decision**: Rename/migrate bulk of `DashboardHome.test.tsx` to `EventWorkspacePage.test.tsx` with workspace URL seeded via `window.history.pushState` before render. New slim `DashboardHome.test.tsx` covers redirect and empty states at `/`. Add dedicated `eventWorkspaceRoute.test.ts` and extend `appRoute.test.ts`, `GlobalNav.test.tsx`, `settingsReturnStorage.test.ts`.
- **Rationale**: FR-010; preserves SPLR-58 behavioral coverage while aligning tests with new page boundaries.
- **Alternatives considered**:
  - *Keep all tests on DashboardHome*: rejected — component split makes tests misleading.
