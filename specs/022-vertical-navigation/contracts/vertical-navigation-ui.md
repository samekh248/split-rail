# Contract: Vertical Navigation Shell UI

**Feature**: `022-vertical-navigation` | **Date**: 2026-06-18

UI component and hook contracts. Types from `generated-api.ts` only (Constitution VI). No REST changes.

## `useSidebarState()` (NEW) — FR-005–FR-011

```text
useSidebarState(): {
  pinnedExpanded: boolean
  hoverExpanded: boolean
  effectiveMode: 'pinned-expanded' | 'collapsed' | 'hover-overlay'
  pinNavigation(): void
  unpinNavigation(): void
  onRailPointerEnter(): void   // starts 250ms hover timer when collapsed
  onRailPointerLeave(): void   // clears hover immediately
}
```

Persistence: `sessionStorage['split-rail:sidebar-pinned']` = `'true' | 'false'`. Default `true` when unset.

## `resolveActiveGlobalNavId(path: AppPath): string | null` (NEW) — FR-012

| Path | Active id |
|------|-----------|
| `/` | `dashboard` |
| `/venues/new` | `dashboard` |
| `/settings`, `/settings/team`, `/settings/organization`, `/settings/integrations` | `null` |
| (future booking routes) | `booking` |

## `AppShell` (NEW) — FR-001, FR-002, FR-003

| Region | Behavior |
|--------|----------|
| Left rail | Fixed `100vh`; contains `GlobalNav`, collapse/pin control, `ProfileBadge` |
| Top bar | Sticky; org name leading; `topBarContent` slot; mobile hamburger when `<768px` |
| Main | Scrollable content area; width adjusts with `--sidebar-width` unless hover overlay |

**Props**:

| Prop | Type | Description |
|------|------|-------------|
| `topBarContent` | `ReactNode` | Contextual controls (optional) |
| `children` | `ReactNode` | Page body |

Routes **outside** shell: login, register, onboarding, accept-invite.

## `GlobalNav` (NEW) — FR-012, FR-020

| Item | Click when enabled | Click when disabled |
|------|-------------------|---------------------|
| Dashboard | `navigateToDashboard()` | — |
| Booking Calendar | — | no-op |
| Settlements / Accounting Sync | — | no-op |

Disabled items: `aria-disabled="true"`, visible "Coming soon" badge, `tabIndex={-1}` or prevent default.

Active item: `global-nav__item--active` when `resolveActiveGlobalNavId(path) === item.id`.

## `SidebarRail` (NEW) — FR-006, FR-007, FR-008–FR-011

| Control | Visibility | Icon (Font Awesome Free) | Action |
|---------|------------|--------------------------|--------|
| Unpin navigation | pinned expanded | `faThumbtackSlash` | `unpinNavigation()` |
| Pin navigation | hover-expanded overlay | `faThumbtack` | `pinNavigation()` |

Collapsed (icon rail): no pin control; show `sidebar-brand-mark` only.

Icons MUST use `@fortawesome/react-fontawesome` per Constitution IX (`.specify/memory/iconography.md`). Component: `NavPinButton`.

Collapsed: labels hidden (`aria-hidden` or visually hidden), icons centered.

## `ProfileBadge` + menu (NEW) — FR-014–FR-017

| State | Display |
|-------|---------|
| Rail expanded | Avatar circle + display name |
| Rail collapsed | Avatar circle only |
| Mobile drawer | Avatar + display name |

| Menu item | Action |
|-----------|--------|
| Settings | `navigateToSettings()`; close menu |
| Sign out | `logout()`; close menu |

Dismiss: outside click, Escape, any item select (FR-017).

## `TopBar` (NEW) — FR-003, FR-004, FR-004a

| Element | Source | All shell pages |
|---------|--------|-----------------|
| Organization name | `useUserProfile().data.organization.name` | yes |
| `topBarContent` | page slot | per route |

**Dashboard slot** (`DashboardHome`):

| Element | Visibility | Action |
|---------|------------|--------|
| Add venue | `canManageVenues` | `navigateToCreateVenue()` |
| VenueSwitcher | venues loaded | existing behavior |
| EventCombobox | events exist | existing behavior |

**Settings slot** (`SettingsNav` horizontal):

| Item | Visibility | Action |
|------|------------|--------|
| Overview | always | `navigateToSettings()` |
| Team | `canManageTeam` | `navigateToTeamSettings()` |
| Organization | always | `navigateToOrganizationSettings()` |
| Integrations | always | `navigateToIntegrationsSettings()` |

No "Back to dashboard" control (clarify Q4-A).

## `MobileNavDrawer` (NEW) — FR-018, FR-019

| Trigger | Top bar hamburger (`<768px`) |
|---------|-------------------------------|
| Content | `GlobalNav` + `ProfileBadge` menu actions |
| Close | overlay tap, close button, nav selection, Escape |
| Focus | trap while open; restore to hamburger on close |

## `DashboardHome` (MODIFY) — FR-004, FR-016

Remove: `app__header` block, Settings button, Sign out button, org subtitle.

Wrap body in `AppShell` with dashboard `topBarContent` (or render inside page that App wraps).

## `SettingsLayout` (MODIFY) — FR-013

Remove: `settings-layout__back`, vertical nav column, duplicate header.

Retain: content area only; shell provides top bar settings tabs.

## `CreateVenuePage` (MODIFY) — FR-001

Replace `AuthLayout` wrapper with content inside `AppShell` (via `App.tsx` wrapper). Form unchanged; cancel still `navigateToDashboard()`.

## `App.tsx` (MODIFY)

Authenticated routes render:

```text
<VenueProvider>
  <AppShell topBarContent={routeSpecific}>
    {page}
  </AppShell>
</VenueProvider>
```

## Test contracts (Vitest + RTL)

| Suite | Asserts |
|-------|---------|
| `SidebarRail.test.tsx` | collapse reflow; hover delay; overlay no reflow; pin from hover |
| `GlobalNav.test.tsx` | active dashboard; null active on settings; disabled placeholders no navigation |
| `ProfileBadge.test.tsx` | menu items; dismiss; no legacy header buttons |
| `MobileNavDrawer.test.tsx` | open/close; focus trap |
| `AppShell.test.tsx` | org name in top bar; sticky regions present |

Coverage: ≥80% line/branch on `apps/web/src/components/shell/**` and modified pages.
