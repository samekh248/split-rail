# Phase 1 Data Model: Test Fixtures & Routing Entities

**Feature**: 028-dashboard-routing-tests  
**Date**: 2026-06-18

This feature adds no product data model. The "data model" is **test fixtures and routing entities** used to verify overview ↔ workspace navigation. All API fixture shapes import from `@/types/generated-api` (Constitution VI).

## Entity: Dashboard Entry Path

Root URL where the priority-zone overview renders.

| Aspect | Value / rule | Assertion |
|--------|--------------|-----------|
| Path | `/` | `window.location.pathname === '/'` after overview load |
| Renders | `dashboard-overview` testid | Present when events exist |
| Does not render | `event-ledger-page`, `mock-ledger-page` | Absent on overview tests |
| Create event CTA | Absent | `empty-state-create-event` not in overview no-events state |

## Entity: Event Workspace Path

URL identifying venue + event for ledger workspace.

| Aspect | Value / rule | Assertion |
|--------|--------------|-----------|
| Pattern | `/venues/{venueId}/events/{eventId}` | Built via `buildEventWorkspacePath` |
| Optional query | `?focus={WorkspaceFocus}` | Quick links from overview cards |
| Parses to | `{ venueId, eventId, focus? }` | `parseEventWorkspacePath` / `useEventWorkspaceRoute` |
| Hosts | Ledger workspace, event combobox, create-event empty state | `EventWorkspacePage` tests |

**Fixture constants** (from existing tests):

- `VENUE_A`, `VENUE_B` — `tests/fixtures/venues.ts`
- `EVENT_A`, `EVENT_B`, `EVENT_C`, `newlyCreatedEvent`, `noEvents` — `tests/fixtures/events.ts`

## Entity: Workflow Focus Indicator

Optional query param from overview quick links (feature 027).

| Value | Origin | Test layer |
|-------|--------|------------|
| `deal` | Pre-show quick link | Overview page test mocks `navigateToEventWorkspace(..., 'deal')` |
| `settlement`, `signature`, `variance`, `sync` | Event card quick links | Workspace page test passes focus prop to mocked ledger |
| Invalid / unknown | Malformed URL | Workspace strips to empty focus prop |

**Strip rules** (027 clarifications):

- Event combobox switch → URL loses `?focus=`
- Venue switch → URL loses `?focus=`

## Entity: Active Venue / Event Selection

| Mechanism | Storage | Assertion |
|-----------|---------|-----------|
| Active venue | `sessionStorage` via `activeVenueStorage` | Updated on `navigateToEventWorkspace` |
| Active event | `sessionStorage` via `activeEventStorage` | Per-venue event id |
| URL sync | `history.pushState` | Combobox/venue switch updates pathname |

## Entity: Priority Zone Partition

Client-side overview grouping (feature 026). Used in overview page tests with date helpers (`offsetDate`, `eventOn`).

| Zone | testid | Partition rule under test |
|------|--------|---------------------------|
| Pinned | `dashboard-zone-pinned` | Pin toggle persistence |
| Tonight | `dashboard-zone-tonight` | Events dated local today only |
| Upcoming | (heading) | Future window; excludes today |
| Recent | (heading) | Past window; excludes today |

## Entity: Permission Context

Same as feature 017 — drives create-venue / create-event affordances.

| Profile fixture | File | Used for |
|-----------------|------|----------|
| `workspaceAdminProfile` | `mockWorkspaceFetch.ts` | Create CTAs visible on workspace |
| `workspaceMemberProfile` | `mockWorkspaceFetch.ts` | CTAs hidden |

## Entity: E2E Seed Personas

Playwright scenarios use seeded users from E2E fixtures:

| User | Purpose |
|------|---------|
| `alpha-admin@e2e.test` | Full access; overview with events; create flows |
| `alpha-scoped@e2e.test` | Venue scope restriction |

**E2E bootstrap**: inject tokens via `addInitScript`; `page.goto(WEB_BASE_URL + '/')`; wait for `venue-switcher`.

## Entity: Legacy Combined Dashboard Page

Obsolete module superseded by overview + workspace.

| Artifact | Expected state |
|----------|----------------|
| `DashboardHome.tsx` | Deleted |
| `DashboardHome.test.tsx` | Deleted |
| `App.tsx` route at `/` | `DashboardOverviewPage` |

## Validation rules (test data)

1. **Scope fidelity**: Stubbed venue/event lists rendered verbatim (Constitution II).
2. **Date helpers**: Use local calendar `offsetDate(n)` for zone tests; avoid UTC drift in tonight hero cases.
3. **No hand-written API types**: Import `EventResponse`, `VenueResponse` from generated types only.
