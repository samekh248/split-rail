# Data Model: Dynamic Logo in Navigation Shell (SPLR-84)

This feature introduces **no persisted entities, API payloads, or database tables**. The model covers **navigation layout state**, **logo variant selection rules**, and **shell placement contracts** — all client-side.

## Navigation layout state (from `useSidebarState`)

| State field | Values | Logo impact |
|-------------|--------|-------------|
| `pinnedExpanded` | `true` / `false` | When `true`, sidebar shows labels → wordmark |
| `hoverExpanded` | `true` / `false` | When `true` (and not pinned), overlay shows labels → wordmark |
| `effectiveMode` | `pinned-expanded` \| `collapsed` \| `hover-overlay` | Diagnostic; variant follows `showLabels` |
| `showLabels` (derived) | `pinnedExpanded \|\| hoverExpanded` | `text` if true, `badge` if false |

**Rule**: Desktop sidebar logo variant = `showLabels ? 'text' : 'badge'`.

## Viewport mode

| Mode | Detection | Logo placements active |
|------|-----------|------------------------|
| Desktop shell | Sidebar slot visible (viewport > 768px) | Sidebar rail only (dynamic variant) |
| Mobile shell | Sidebar slot hidden (`@media max-width: 768px`) | Top bar centered wordmark + drawer header wordmark when open |

**Rule**: Mobile and desktop placements MUST NOT render duplicate logos in the same viewport (sidebar hidden on mobile → top bar + drawer only).

## Shell placement entities

### Sidebar brand control

| Attribute | Value |
|-----------|-------|
| Component | `SidebarRail` header |
| Variant | Dynamic (`text` / `badge`) |
| Interactive | Yes — button navigates to dashboard (`navigateToDashboard`) |
| Test id | `sidebar-brand` |
| Wrapper class | `sidebar-rail__brand-logo` |
| Accessibility | Button `aria-label="Split Rail home"`; image `alt` from BrandLogo default |

### Mobile drawer brand

| Attribute | Value |
|-----------|-------|
| Component | `MobileNavDrawer` header |
| Variant | Fixed `text` |
| Interactive | No (decorative in header; close button separate) |
| Wrapper class | `mobile-nav-drawer__brand` |
| Position | Left side of header row; close button right |

### Mobile top bar brand

| Attribute | Value |
|-----------|-------|
| Component | `TopBar` center zone |
| Variant | Fixed `text` |
| Condition | `showMobileMenu === true` |
| Wrapper class | `top-bar__brand` |
| Test id | `top-bar-brand` (recommended) |
| Position | Center column of mobile grid layout |

## BrandLogo consumption (external dependency)

Imported from `062-brand-logo-component` / SPLR-83:

```typescript
<BrandLogo variant="text" | "badge" className?: string alt?: string />
```

Shell files MUST NOT import `BRAND_LOGO_*` constants directly.

## Validation rules

| ID | Rule |
|----|------|
| VR-001 | Sidebar `variant` MUST equal `text` when `showLabels` is true |
| VR-002 | Sidebar `variant` MUST equal `badge` when `showLabels` is false |
| VR-003 | Mobile drawer MUST always use `variant="text"` |
| VR-004 | Mobile top bar MUST use `variant="text"` only when `showMobileMenu` |
| VR-005 | Wordmark placements MUST maintain ≥24px effective padding from adjacent chrome |
| VR-006 | No `/brand/` path strings in shell component source files |

## State transitions (logo variant — desktop)

```text
collapsed --(pin or hover+intent)--> labels visible --> text variant
labels visible --(unpin, hover end)--> collapsed --> badge variant
```

Mobile: variant is always `text` in top bar and drawer; independent of sidebar pin state.

## Relationships

```text
useSidebarState
    └──> SidebarRail.showLabels ──> BrandLogo.variant (text|badge)

AppShell.showMobileMenu (via TopBar prop)
    └──> TopBar center ──> BrandLogo.variant (text)

MobileNavDrawer.open
    └──> drawer header ──> BrandLogo.variant (text)
```
