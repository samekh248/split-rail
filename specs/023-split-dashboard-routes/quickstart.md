# Quickstart & Validation: Split Dashboard Routes and Event Workspace

**Feature**: `023-split-dashboard-routes` | **Date**: 2026-06-18

Manual and automated validation for URL-addressable event workspaces. See [contracts/event-workspace-routing.md](./contracts/event-workspace-routing.md) and [data-model.md](./data-model.md).

## Prerequisites

- Node 20+, .NET 8 SDK (API running for authenticated flows).
- SPLR-58 (event list/selection) and SPLR-62 (vertical navigation shell) merged.
- Admin user with **two venues**, each with **at least two events**, for switch/URL tests.

```bash
# API
dotnet run --project apps/api/split-rail-api.csproj

# Web (separate terminal)
cd apps/web && npm run dev
```

## Automated tests

```bash
cd apps/web
npm run test -- tests/lib/appRoute.test.ts tests/lib/eventWorkspaceRoute.test.ts tests/lib/settingsReturnStorage.test.ts
npm run test -- tests/pages/EventWorkspacePage.test.tsx tests/pages/DashboardHome.test.tsx
npm run test -- tests/shell/GlobalNav.test.tsx
```

**Expected**: All routing and workspace tests pass; coverage ≥80% on touched `src/lib/**` and `src/pages/**` files.

## Scenario A — Deep link to workspace (User Story 1, P1)

1. Sign in as a user with access to venue A and event X.
2. Note event X's `venueId` and `eventId` from the network tab or fixtures.
3. Navigate directly to `/venues/{venueId}/events/{eventId}` (paste in address bar).

**Expected**: Venue switcher shows venue A; event combobox shows event X selected; ledger loads for event X without manual selection.

4. Refresh the browser.

**Expected**: Same venue and event restored from URL.

## Scenario B — Event switch updates URL (User Story 2, P2)

1. Open a workspace for event X.
2. Select event Y from the combobox.

**Expected**: URL changes to event Y's path; ledger reloads; no full page reload flash.

3. Press browser **Back**.

**Expected**: Returns to event X URL and ledger.

## Scenario C — Venue switch updates URL (User Story 2, P2)

1. On venue A / event X workspace, switch venue to venue B via venue switcher.

**Expected**: URL updates to venue B with a resolved default event; event A is not shown; ledger reflects venue B.

## Scenario D — Global nav highlight (User Story 3, P3)

1. On any workspace URL, inspect left rail.

**Expected**: **Dashboard** item is highlighted.

2. Navigate to `/settings/team`.

**Expected**: No global item highlighted.

3. Click **Dashboard** in left rail.

**Expected**: Navigates to `/`; if events exist, redirects to workspace URL; Dashboard highlighted again.

## Scenario E — Dashboard entry interim behavior (User Story 4, P4)

1. Sign in and navigate to `/` with at least one event available.

**Expected**: Brief load then redirect to `/venues/{venueId}/events/{eventId}`.

2. Use a venue with zero events; navigate to `/`.

**Expected**: No-events empty state at `/` with create CTA (if permitted); no redirect.

3. Use an org with zero venues; navigate to `/`.

**Expected**: No-venue empty state unchanged.

## Scenario F — Invalid URL fallback (FR-009)

1. Navigate to `/venues/00000000-0000-0000-0000-000000000099/events/00000000-0000-0000-0000-000000000099` (inaccessible IDs).

**Expected**: Clear feedback; safe navigation to `/` or allowed entry — no ledger with wrong data.

2. Navigate to workspace URL with valid venue but deleted/unknown event id.

**Expected**: URL corrects to default event for that venue; ledger shows default event.

## Scenario G — Settings return path

1. Open a workspace for event X.
2. Open profile menu → **Settings** → Team.
3. Use return navigation (profile → return or settings flow).

**Expected**: Returns to the same workspace URL for event X, not bare `/`.

## Scenario H — Create and delete event URL updates (FR-005)

1. From workspace, create a new event.

**Expected**: URL updates to new event; ledger visible.

2. Delete the active event when another remains.

**Expected**: URL updates to a remaining event.

## Regression checks

- Create-venue flow at `/venues/new` still works; Dashboard nav active.
- Event edit/delete permission rules unchanged (planning-only delete; edit metadata when budget locked).
- No new hand-written TypeScript API interfaces in `apps/web/src`.
