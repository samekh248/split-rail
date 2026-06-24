# Data Model: Vertical Navigation Architecture

**Feature**: `022-vertical-navigation` | **Date**: 2026-06-18

No database schema or API changes. Describes client navigation configuration, shell state, and UI-derived display values.

## API entities (existing, read-only)

### `UserProfileResponse`

| Field | Type | Shell use |
|-------|------|-----------|
| `email` | string | Profile badge initials + display name fallback |
| `organization.name` | string | Top bar organization label (FR-004a) |
| `role.permissions.*` | booleans | Unchanged — workspace/settings gating unchanged (FR-021) |

No avatar URL exists; initials derived client-side (see research D6).

## Client configuration: `GlobalNavItem`

| Field | Type | Rules |
|-------|------|-------|
| `id` | string | Stable key (`dashboard`, `booking`, `accounting`) |
| `label` | string | Visible nav label |
| `icon` | React component or icon id | Shown in collapsed rail |
| `href` | AppPath \| null | Navigation target; `null` when disabled |
| `disabled` | boolean | When true, `Coming soon` suffix; click no-op (FR-020) |
| `matchPaths` | AppPath[] | Routes that activate this item (excludes settings paths) |

### Static items (v1)

| id | label | href | disabled | matchPaths |
|----|-------|------|----------|------------|
| `dashboard` | Dashboard | `/` | false | `/`, `/venues/new` |
| `booking` | Booking Calendar | null | true | — |
| `accounting` | Settlements / Accounting Sync | null | true | — |

Settings paths (`/settings`, `/settings/team`, etc.) → **no** active global id.

## Client state: `SidebarState`

| Field | Type | Persistence | Description |
|-------|------|-------------|-------------|
| `pinnedExpanded` | boolean | `sessionStorage` | User chose expanded (true) or collapsed (false) rail |
| `hoverExpanded` | boolean | ephemeral | True while collapsed rail hover overlay open |
| `effectiveWidth` | number | derived | 240 expanded, 64 collapsed; overlay uses 240 without reflow |

### Transitions

```text
pinnedExpanded=true  → collapse control → pinnedExpanded=false
pinnedExpanded=false → pin control      → pinnedExpanded=true
pinnedExpanded=false → hover 250ms     → hoverExpanded=true (overlay)
hoverExpanded=true   → pointer leave   → hoverExpanded=false
hoverExpanded=true   → pin click       → pinnedExpanded=true, hoverExpanded=false
```

## Client state: `MobileDrawerState`

| Field | Type | Description |
|-------|------|-------------|
| `open` | boolean | Drawer visible |
| `returnFocusRef` | Ref | Focus restore target on close |

## Client state: `ProfileMenuState`

| Field | Type | Description |
|-------|------|-------------|
| `open` | boolean | Dropdown visible |
| `anchorRef` | Ref | Profile badge button |

## Layout CSS variables (shell)

| Variable | Expanded | Collapsed |
|----------|----------|-----------|
| `--sidebar-width` | 240px | 64px |
| `--sidebar-z-overlay` | — | elevated z-index when hover-expanded |

## Top bar composition slots

| Slot | Owner | Content by route |
|------|-------|------------------|
| Leading | `TopBar` (shell) | Organization name |
| Contextual | Page via `AppShell` slot | Dashboard: venue switcher, event combobox, add venue; Settings: `SettingsNav` tabs; Create venue: page title or empty |
| Mobile menu | `TopBar` (shell) | Hamburger when `<768px` |

## Removed legacy UI (migration)

| Removed element | Replacement |
|-----------------|-------------|
| `DashboardHome` Settings / Sign out buttons | Profile menu |
| `DashboardHome` org subtitle in header | Top bar org name |
| `SettingsLayout` back to dashboard | Global Dashboard nav item |
| Vertical `settings-nav` in content column | Horizontal settings tabs in top bar |
