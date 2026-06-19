# Quickstart & Validation: Workspace Focus Scroll Targets

**Feature**: `027-workspace-focus-scroll` | **Date**: 2026-06-18 | **Linear**: SPLR-67

Manual and automated validation for workspace `?focus=` scroll behavior. See [contracts/workspace-focus-scroll-ui.md](./contracts/workspace-focus-scroll-ui.md) and [data-model.md](./data-model.md).

## Prerequisites

- Node 20+
- **023 merged**: workspace routes, `buildEventWorkspacePath`, `useEventWorkspaceRoute`
- **025 merged**: `WorkspaceFocus`, event card quick links
- **026 merged** (recommended): dashboard overview quick links navigate with focus

```bash
cd apps/web
npm install
```

## Automated tests

```bash
cd apps/web
npm run test -- tests/lib/workspaceFocusScroll.test.ts
npm run test -- tests/pages/EventLedgerPage.test.tsx
npm run test -- tests/pages/EventWorkspacePage.test.tsx
npm run test -- tests/lib/appRoute.test.ts
```

**Expected**: All scenarios pass; ≥80% line/branch coverage on touched frontend files (FR-009 / SC-005). No backend tests required.

## Scenario A — Deal focus from URL (User Story 1, P1)

1. Sign in; open workspace URL directly:

   `/venues/{venueId}/events/{eventId}?focus=deal`

2. Wait for ledger to load.

**Expected**: Viewport scrolls to artist deal panel (`data-testid="artist-deal-panel"`); keyboard focus on first focusable control in that panel.

## Scenario B — Settlement and signature (User Story 2, P2)

1. Use an event in Night Of phase (or fixture with settlement UI visible).

2. Open `?focus=settlement` then `?focus=signature` (separate navigations).

**Expected**:
- `settlement` → ledger grid region in view; focus on first focusable in grid (e.g. lock budget or settlement input when present).
- `signature` → finalize settlement panel in view; focus on signature controls when panel rendered.

## Scenario C — Variance and sync (User Story 3, P3)

1. Use event with non-zero variances for variance test; any event for sync.

2. Open `?focus=variance` and `?focus=sync`.

**Expected**:
- `variance` → variance banner scrolled into view when present; no error when banner absent.
- `sync` → sync region (`workspace-focus-sync`) in view; focus on `sync-now-button`.

## Scenario D — Invalid / missing focus (User Story 4, P4)

1. Open workspace without query param.

2. Open `?focus=invalid` and `?focus=`.

**Expected**: Normal workspace load; default scroll position; no error alerts.

## Scenario E — Combobox strips focus (Clarification Q1)

1. Open workspace with `?focus=deal`.

2. Select a different event from the event combobox.

**Expected**: URL path updates to new event **without** `?focus=`; no automatic scroll to deal panel.

## Scenario F — Venue switch strips focus (Clarification Q2)

1. Open workspace with `?focus=sync`.

2. Switch venue via venue switcher.

**Expected**: URL for new venue's event has no `?focus=`; default scroll position.

## Scenario G — Re-navigation same event (Clarification Q4)

1. Open workspace for event X with `?focus=deal`.

2. Scroll away manually.

3. From dashboard overview, click a deal quick link for the **same** event X.

**Expected**: Scroll and keyboard focus re-apply to deal panel (FR-005a).

## Scenario H — Overview quick link (integration smoke)

1. Navigate to `/` (dashboard overview).

2. Click **Edit Deal Builder** quick link on a Pre-Show event card.

**Expected**: URL includes `?focus=deal`; Scenario A scroll behavior after ledger loads.

(Full Playwright coverage deferred to SPLR-68.)

## Coverage gate

```bash
cd apps/web
npm run test -- --coverage
```

**Expected**: Touched files ≥80% line/branch (Constitution III).
