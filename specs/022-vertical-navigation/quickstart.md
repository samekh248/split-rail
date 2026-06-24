# Quickstart & Validation: Vertical Navigation Architecture

**Feature**: `022-vertical-navigation` | **Date**: 2026-06-18

Manual and automated validation for the two-tier navigation shell. See [contracts/vertical-navigation-ui.md](./contracts/vertical-navigation-ui.md) and [data-model.md](./data-model.md).

## Prerequisites

- Node 20+, .NET 8 SDK (API running for authenticated flows).
- Features 014–016 (dashboard routing, settings hub, team UI) implemented.
- Admin user with at least one venue and one event for ledger scroll test.

```bash
# API
dotnet run --project apps/api/split-rail-api.csproj

# Web (separate terminal)
cd apps/web && npm run dev
```

## Automated tests

```bash
cd apps/web
npm run test -- tests/shell
npm run test -- tests/pages/DashboardHome
npm run test -- tests/components/settings
```

**Expected**: All shell and updated page tests pass; coverage ≥80% on `src/components/shell/**` and touched page files.

## Scenario A — Shell layout and org name (User Story 1, P1)

1. Sign in as any org member.
2. Land on dashboard.

**Expected**: Left rail visible full height; top bar shows organization name; venue switcher and event controls in top bar (not left rail); no standalone Settings or Sign out in header area.

3. Open an event ledger and scroll vertically.

**Expected**: Left rail fixed; top bar remains sticky at viewport top.

## Scenario B — Sidebar collapse and hover (User Story 2, P2)

1. On desktop width (≥768px), click collapse on left rail.

**Expected**: Rail narrows to icons only; main content widens.

2. Rest pointer on collapsed rail for ~250ms.

**Expected**: Rail expands as overlay without shifting page content.

3. Move pointer away.

**Expected**: Rail retracts immediately.

4. Hover-expand again; click pin/expand.

**Expected**: Rail locks open; content reflows to narrower canvas.

## Scenario C — Active highlighting (User Story 3, P3)

1. On dashboard with ledger open, confirm **Dashboard** item highlighted in left rail.

2. Open profile menu → **Settings** → Team (if permitted).

**Expected**: No global left-rail item highlighted on settings pages; settings section tabs in top bar.

3. Click **Dashboard** in left rail.

**Expected**: Return to workspace; Dashboard item active again.

## Scenario D — Profile menu (User Story 4, P4)

1. Click profile badge at bottom of rail (expanded state shows name).

**Expected**: Menu with Settings and Sign out.

2. Choose Settings.

**Expected**: Navigate to settings hub; menu closes.

3. Open menu again; choose Sign out.

**Expected**: Session ends; redirected to login.

4. Sign in again; collapse rail.

**Expected**: Profile badge shows avatar only; menu still works.

## Scenario E — Placeholder global modules (FR-020)

1. In left rail, locate Booking Calendar and Settlements / Accounting Sync.

**Expected**: Visible with "Coming soon"; clicks do nothing; no navigation.

## Scenario F — Settings without back button (clarify Q4-A)

1. Navigate to `/settings/team` (admin).

**Expected**: No "Back to dashboard" control; settings tabs in top bar; Dashboard left-rail item navigates home.

## Scenario G — Create venue in shell (FR-001)

1. As user with venue permission, open create venue from dashboard.

**Expected**: Same left rail + top bar shell; org name in top bar; form in main content.

## Scenario H — Mobile drawer (User Story 5, P5)

1. Resize viewport to &lt;768px (or use device toolbar).

**Expected**: Desktop rail hidden; hamburger in top bar.

2. Tap hamburger.

**Expected**: Drawer slides from left with global nav and profile actions.

3. Tap outside drawer or close control.

**Expected**: Drawer dismisses.

4. Open drawer; tap Dashboard.

**Expected**: Drawer closes; navigates to dashboard.

## Scenario I — Session sidebar preference

1. Collapse sidebar; navigate to Settings and back to Dashboard.

**Expected**: Sidebar remains collapsed within same browser session.

2. Open new browser session (or clear session storage) and sign in.

**Expected**: Sidebar defaults to expanded (pinned).

## Regression checks

- Team permission gating unchanged: non-admin direct `/settings/team` → redirect to settings landing.
- Venue/event permission controls unchanged in dashboard top bar.
- Auth, register, onboarding, accept-invite pages do **not** show new shell.
