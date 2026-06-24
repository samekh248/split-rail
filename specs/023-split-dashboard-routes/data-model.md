# Data Model: Split Dashboard Routes and Event Workspace

**Feature**: `023-split-dashboard-routes` | **Date**: 2026-06-18

No database schema or API changes. Describes client routing types, URL parameters, navigation state, and validation rules.

## API entities (existing, read-only)

### `VenueResponse`

| Field | Type | Routing use |
|-------|------|-------------|
| `id` | string (UUID) | `venueId` URL segment; validated against `useVenues()` list |

### `EventResponse`

| Field | Type | Routing use |
|-------|------|-------------|
| `eventId` | string (UUID) | `eventId` URL segment; validated against `useEvents(venueId)` list |
| `status` | enum string | Unchanged — edit/delete gating in workspace (SPLR-58) |
| `isBudgetLocked` | boolean | Unchanged — delete gating |

No new fields. Types imported from `generated-api.ts` only (Constitution VI).

## Client type: `EventWorkspaceParams`

| Field | Type | Source | Rules |
|-------|------|--------|-------|
| `venueId` | string | URL path segment | Must match accessible venue `id` |
| `eventId` | string | URL path segment | Must exist in venue's event list, or fallback applied |
| `focus` | string \| null | Optional query `?focus=` | Accepted by navigation helper; scroll behavior deferred (SPLR-67) |

### Path format

```text
/venues/{venueId}/events/{eventId}[?focus={segment}]
```

- Segments are opaque UUID strings (no slug encoding).
- Parse fails if segments missing, empty, or path structure wrong.

## Client configuration: `GlobalNavItem` (extended)

| Field | Type | Change |
|-------|------|--------|
| `matchPaths` | `AppPath[]` | Still lists static paths (`/`, `/venues/new`) |
| `matchPathPattern` | RegExp \| predicate \| optional | NEW for dashboard item: matches `/venues/*/events/*` |

### Dashboard active paths (v1)

| Pattern | Active id |
|---------|-----------|
| `/` | `dashboard` |
| `/venues/new` | `dashboard` |
| `/venues/{uuid}/events/{uuid}` | `dashboard` |
| `/settings/*` | `null` (unchanged) |

## Client state: URL vs session precedence

| State store | Key / location | When written | When read |
|-------------|----------------|--------------|-----------|
| URL path | `venueId`, `eventId` | `navigateToEventWorkspace`, venue-switch effect, create/delete success | `EventWorkspacePage` mount, `popstate` |
| `activeVenueStorage` | `split-rail:active-venue-id` | `activateVenueId`, URL sync | `/` entry redirect defaulting |
| `activeEventStorage` | per-venue event id | `setActiveEventId`, URL sync | `resolveActiveEventId` fallback |
| `settingsReturnStorage` | `split-rail:settings-return-path` | `captureSettingsReturnPath` on settings nav | `navigateReturnToApp` |

### Precedence rules

```text
On EventWorkspacePage mount:
  1. Parse URL → if valid venue + event → activate venue, select event, persist both
  2. If venue invalid → fallback to Dashboard entry
  3. If event invalid for venue → resolveActiveEventId → replace URL

On in-app event select:
  navigateToEventWorkspace → pushState → setActiveEventId

On venue switch (context id ≠ URL venue):
  load events → resolveActiveEventId → navigateToEventWorkspace (new pair)

On Dashboard entry (/):
  resolve venue from storage → resolve event → redirect to workspace URL OR show empty state
```

## Client state: `DashboardEntryState` (interim `/` page)

| Condition | Outcome |
|-----------|---------|
| Venues loading | Loading indicator |
| Venues error | Error + retry |
| Zero venues | No-venue empty state (unchanged) |
| Venue resolved, events loading | Loading indicator |
| Zero events | No-events empty state (unchanged) |
| ≥1 event | Redirect to `buildEventWorkspacePath(venueId, resolvedEventId)` |

## Validation matrix

| Input condition | User-visible outcome | URL action |
|-----------------|---------------------|------------|
| Valid venue + valid event | Full workspace + ledger | unchanged |
| Valid venue + missing event | Workspace with default event | `replaceState` to default |
| Valid venue + zero events | No-events empty state | stay or redirect to `/` |
| Invalid venue id | Access message | `pushState` to `/` |
| Malformed workspace path | Safe fallback | `pushState` to `/` |
| Event from other venue in URL | Treated as missing event | `replaceState` to default |

## Transitions (navigation events)

```text
/  --[has events]-->  /venues/{v}/events/{e}
/  --[no events]-->   / (empty state UI)
/venues/{v}/events/{e1}  --[select e2]-->  /venues/{v}/events/{e2}
/venues/{v1}/events/{e}  --[switch venue v2]-->  /venues/{v2}/events/{e'}
/venues/{v}/events/{e}  --[create event]-->  /venues/{v}/events/{eNew}
/venues/{v}/events/{e}  --[delete e, others remain]-->  /venues/{v}/events/{eOther}
/venues/{v}/events/{e}  --[navigateToDashboard]-->  /
*  --[navigateToSettings]-->  /settings/*  (return path captured)
```
