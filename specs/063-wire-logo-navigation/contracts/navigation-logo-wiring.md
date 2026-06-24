# Contract: Navigation Shell Logo Wiring (SPLR-84)

Runtime wiring of `BrandLogo` into navigation shell components. Depends on [062-brand-logo-component contract](../../062-brand-logo-component/contracts/brand-logo.md) for component API and asset rules.

**Scope**: `SidebarRail`, `MobileNavDrawer`, `TopBar`, and related CSS in `index.css`. Auth screens out of scope.

## Dependency

- `BrandLogo` from `apps/web/src/components/brand/BrandLogo.tsx`
- Asset paths ONLY in `apps/web/src/brand/assets.ts` (consumers use `<BrandLogo />` only)

## SidebarRail

**File**: `apps/web/src/components/shell/SidebarRail.tsx`

```tsx
const showLabels = pinnedExpanded || hoverExpanded;

<button
  type="button"
  className="sidebar-rail__brand-button"
  data-testid="sidebar-brand"
  aria-label="Split Rail home"
  onClick={handleBrandClick}  // navigateToDashboard + onNavigate
>
  <BrandLogo
    variant={showLabels ? 'text' : 'badge'}
    className="sidebar-rail__brand-logo"
  />
</button>
```

| Sidebar state | `showLabels` | `variant` | Expected `img` src |
|---------------|--------------|-----------|-------------------|
| Pinned expanded | true | `text` | `/brand/sr-text.png` |
| Hover overlay | true | `text` | `/brand/sr-text.png` |
| Collapsed | false | `badge` | `/brand/sr-badge.png` |

**CSS hooks**: `.sidebar-rail__brand-button`, `.sidebar-rail__brand-logo`, `.sidebar-rail--expanded`, `.sidebar-rail--collapsed` (existing `index.css` block).

## MobileNavDrawer

**File**: `apps/web/src/components/shell/MobileNavDrawer.tsx`

Replace static header title with:

```tsx
<BrandLogo variant="text" className="mobile-nav-drawer__brand" />
```

Header structure:

```text
.mobile-nav-drawer__header
  ├── BrandLogo (text, mobile-nav-drawer__brand)
  └── close button (mobile-nav-drawer__close)
```

| State | `variant` | Expected `img` src |
|-------|-----------|-------------------|
| Drawer open | `text` | `/brand/sr-text.png` |
| Drawer closed | (not rendered) | — |

**CSS hooks**: `.mobile-nav-drawer__header`, `.mobile-nav-drawer__brand` (existing).

## TopBar (mobile)

**File**: `apps/web/src/components/shell/TopBar.tsx`

When `showMobileMenu` is true, render center brand slot:

```tsx
{showMobileMenu ? (
  <div className="top-bar__brand-slot" data-testid="top-bar-brand">
    <BrandLogo variant="text" className="top-bar__brand" />
  </div>
) : null}
```

Layout (mobile `@media max-width: 768px`):

```text
.top-bar (grid: auto 1fr auto)
  ├── .top-bar__leading (menu + org name)
  ├── .top-bar__brand-slot (centered wordmark)
  └── .top-bar__context (contextual content, if any)
```

| Viewport | `showMobileMenu` | Center logo |
|----------|------------------|-------------|
| Desktop (>768px) | optional false | hidden |
| Mobile (≤768px) | true | `text` wordmark centered |

**CSS** (to add in `index.css`):

```css
.top-bar__brand-slot {
  display: none;
  justify-self: center;
  min-width: 0;
}

.top-bar__brand.brand-logo-wrapper {
  padding: 0;
}

.top-bar__brand .brand-logo--text {
  max-height: 2rem;
  width: auto;
}

@media (max-width: 768px) {
  .top-bar {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
  }

  .top-bar__brand-slot {
    display: flex;
    justify-content: center;
  }
}
```

Adjust `max-height` if overlap with org name occurs; wordmark MUST NOT obscure menu button.

## Padding contract

| Placement | ≥24px wordmark padding |
|-----------|------------------------|
| Sidebar expanded | Via sidebar header spacing + wordmark layout rules |
| Mobile drawer header | Drawer panel `padding: 1rem` + header margin |
| Mobile top bar | Shell row padding + compact wordmark `max-height` |

Shell-specific classes MAY zero `.brand-logo-wrapper` padding when outer chrome supplies spacing; effective padding audit required per SC-004.

## Accessibility

| Surface | Pattern |
|---------|---------|
| Sidebar | Interactive button wrapping logo; button carries `aria-label` |
| Drawer header | Logo decorative in header; close button labeled |
| Top bar | Logo decorative; menu button `aria-label="Open navigation menu"` |

## Forbidden

- Hardcoded `/brand/sr-*.png` in shell TSX files
- Importing `BRAND_LOGO_*` in shell components
- Font Awesome or Unicode substitutes for brand mark
- `auth` variant in navigation shell

## Tests

| File | Required cases |
|------|----------------|
| `tests/shell/SidebarRail.test.tsx` | Expanded → `sr-text.png`; collapsed → `sr-badge.png`; brand click → `/` |
| `tests/shell/MobileNavDrawer.test.tsx` | Open drawer → wordmark `img` with `sr-text.png` in header |
| `tests/shell/TopBar.test.tsx` (new or extend) | `showMobileMenu` → `top-bar-brand` with `sr-text.png` |

Run:

```bash
cd apps/web && npm run test -- tests/shell/SidebarRail.test.tsx tests/shell/MobileNavDrawer.test.tsx tests/shell/TopBar.test.tsx
```

## Out of scope

- `BrandLogo` component implementation (SPLR-83 / `062-brand-logo-component`)
- Mobile drawer / top bar color theming (SPLR-87)
- Auth layout logo (`auth` variant)
- Playwright E2E (optional follow-up)
