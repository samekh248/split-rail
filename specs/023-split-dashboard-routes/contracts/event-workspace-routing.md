# Contract: Event Workspace Routing

**Feature**: `023-split-dashboard-routes` | **Date**: 2026-06-18

Client routing and page contracts. Types from `generated-api.ts` only (Constitution VI). No REST changes.

## Path helpers (`appRoute.ts` extensions) — FR-001, FR-008

```text
WORKSPACE_PATH_PATTERN = /^\/venues\/([^/]+)\/events\/([^/]+)\/?$/

buildEventWorkspacePath(venueId: string, eventId: string, focus?: string): string
  → `/venues/${venueId}/events/${eventId}` + optional `?focus=${encodeURIComponent(focus)}`

parseEventWorkspacePath(pathname: string): { venueId: string; eventId: string } | null

isEventWorkspacePath(pathname: string): boolean

getAppPath(): AppPath | string
  → returns workspace pathname string when isEventWorkspacePath; existing static paths unchanged

useEventWorkspaceRoute(): { venueId: string; eventId: string; focus: string | null } | null
  → null when not on workspace path; updates on popstate
```

## Navigation module (`eventWorkspaceRoute.ts`) — FR-003, FR-004, FR-007

```text
navigateToEventWorkspace(venueId: string, eventId: string, focus?: string): void
  → pushPath(buildEventWorkspacePath(...))
  → does NOT implement focus scroll (SPLR-67)

navigateToDashboard(): void
  → pushPath('/')  (re-export from appRoute.ts)
```

## `matchesDashboardNavPath(pathname: string): boolean` — FR-006

Returns `true` when:

| Path | Match |
|------|-------|
| `/` | yes |
| `/venues/new` | yes |
| `/venues/{id}/events/{id}` | yes |
| `/settings/*` | no |
| other | no |

## `resolveActiveGlobalNavId(path)` (MODIFIED) — FR-006

Uses `matchesDashboardNavPath` for dashboard item instead of exact `matchPaths.includes` only.

## Settings return path (`settingsReturnStorage.ts`) — FR-008 adjacent

```text
captureSettingsReturnPath(currentPath):
  if settings path → no-op
  if isEventWorkspacePath(currentPath) → store full pathname
  if currentPath === '/venues/new' → store '/venues/new'
  else → store '/'

readSettingsReturnPath():
  return stored path if valid workspace, '/venues/new', or '/'; default '/'
```

## `EventWorkspacePage` (NEW) — FR-002, FR-003–FR-005, FR-009

| Concern | Behavior |
|---------|----------|
| Route params | From `useEventWorkspaceRoute()` |
| Venue sync | On mount, `activateVenueId(urlVenueId)` if accessible |
| Event selection | URL `eventId` canonical; combobox `onSelect` → `navigateToEventWorkspace` |
| Venue switch | Effect: when `activeVenueId` changes vs URL → navigate to resolved event for new venue |
| Create success | `navigateToEventWorkspace(venueId, created.eventId)` |
| Delete success | Navigate to `resolveActiveEventId(remaining, venueId)` |
| Invalid venue | Alert region + `navigateToDashboard()` |
| Invalid event | `resolveActiveEventId` + `replaceState` to corrected path |
| Workspace bar | Same slot content as pre-split `DashboardHome` (`useShellWorkspaceBar`) |
| Ledger | `EventLedgerPage` when `venueId` + `eventId` valid and panels closed |

**Empty states** (no events for valid venue): render in workspace page at workspace URL (not redirect to `/`).

## `DashboardHome` (MODIFIED interim entry) — FR-007

| Concern | Behavior |
|---------|----------|
| Scope | Entry only — NO ledger, NO combobox |
| Redirect | When `activeVenueId` + resolved event exist → `navigateToEventWorkspace` once |
| Empty states | No-venue and no-events UI unchanged from pre-split copy |
| Loading | Brief loading while venues/events resolve before redirect |

## `App.tsx` routing (MODIFIED)

```text
if parseEventWorkspacePath(appPath) → AuthenticatedShell → EventWorkspacePage
else if appPath === '/venues/new'     → AuthenticatedShell → CreateVenuePage
else default authenticated            → AuthenticatedShell → DashboardHome (/)
```

Settings and auth routes unchanged.

## Test contracts

| Suite | Covers |
|-------|--------|
| `eventWorkspaceRoute.test.ts` | build/parse/navigate helpers |
| `appRoute.test.ts` | extended path recognition + hook |
| `EventWorkspacePage.test.tsx` | migrated SPLR-58 scenarios at workspace URL |
| `DashboardHome.test.tsx` | redirect + empty states at `/` |
| `GlobalNav.test.tsx` | active highlight on `/venues/{v}/events/{e}` |
| `settingsReturnStorage.test.ts` | workspace return capture/restore |

## Out of scope (deferred)

| Item | Issue |
|------|-------|
| Multi-zone overview at `/` | SPLR-66 |
| `?focus=` scroll targets | SPLR-67 |
| Playwright overview → workspace E2E | SPLR-68 |
