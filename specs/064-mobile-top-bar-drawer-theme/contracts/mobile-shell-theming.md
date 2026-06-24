# Contract: Mobile Shell Theming (SPLR-87)

Runtime theming of mobile navigation chrome (`TopBar`, `MobileNavDrawer`) to match desktop sidebar brown-and-cream palette. Depends on M1 tokens (`059-mhc-design-tokens`) and logo placements from [063-wire-logo-navigation](../../063-wire-logo-navigation/contracts/navigation-logo-wiring.md).

**Scope**: `TopBar`, `MobileNavDrawer`, and related CSS in `apps/web/src/index.css`. Desktop sidebar, workspace bar, and auth screens out of scope.

## Token dependency

All colors MUST reference named CSS custom properties from `:root`:

| Surface | Background | Text / icons |
|---------|------------|--------------|
| Mobile top bar (≤768px) | `var(--color-primary-brown)` | `var(--color-text-on-dark)` |
| Mobile drawer panel | `var(--color-primary-brown)` | `var(--color-bg-cream)` (via `color` + `inherit`) |
| Nav link hover (drawer) | `var(--color-nav-hover-overlay)` | inherited cream |
| Focus ring (brown chrome) | — | `2px solid var(--color-bg-cream)` |

**Prohibited**: Hardcoded hex in shell TSX files. Hex only in `:root` token definitions.

## TopBar

**File**: `apps/web/src/components/shell/TopBar.tsx`

### Icon swap (Constitution IX)

Replace Unicode menu glyph with Font Awesome:

```tsx
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars } from '@fortawesome/free-solid-svg-icons';

<button
  className="top-bar__menu-button"
  data-testid="mobile-nav-open"
  ...
>
  <FontAwesomeIcon icon={faBars} className="top-bar__menu-icon" aria-hidden="true" />
</button>
```

### CSS (mobile only — inside `@media (max-width: 768px)`)

```css
.top-bar {
  background: var(--color-primary-brown);
  color: var(--color-text-on-dark);
}

.top-bar__org-name {
  color: var(--color-text-on-dark);
}

.top-bar__menu-button {
  color: var(--color-text-on-dark);
  border-color: rgba(244, 241, 234, 0.25); /* match sidebar pin button border */
  min-width: 2.75rem;
  min-height: 2.75rem;
}

.top-bar__menu-button:focus-visible {
  outline: 2px solid var(--color-bg-cream);
  outline-offset: 2px;
}
```

| Viewport | Background | Org name color | Menu visible |
|----------|------------|----------------|--------------|
| > 768px | transparent | `var(--color-primary-brown)` | hidden (`display: none`) |
| ≤ 768px | `var(--color-primary-brown)` | `var(--color-text-on-dark)` | visible, cream icon |

**Logo slot**: Unchanged from SPLR-84 — `BrandLogo variant="text"` in `.top-bar__brand-slot`.

## MobileNavDrawer

**File**: `apps/web/src/components/shell/MobileNavDrawer.tsx`

### Icon swap

```tsx
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';

<button className="mobile-nav-drawer__close" data-testid="mobile-nav-close" ...>
  <FontAwesomeIcon icon={faXmark} className="mobile-nav-drawer__close-icon" aria-hidden="true" />
</button>
```

### CSS (existing + extensions)

Panel (verify present):

```css
.mobile-nav-drawer__panel {
  background: var(--color-primary-brown);
  color: var(--color-bg-cream);
}
```

Close button touch target:

```css
.mobile-nav-drawer__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2.75rem;
  min-height: 2.75rem;
  color: inherit;
}

.mobile-nav-drawer__close:focus-visible {
  outline: 2px solid var(--color-bg-cream);
  outline-offset: 2px;
  border-radius: 6px;
}
```

| State | Panel background | Text color |
|-------|------------------|------------|
| Closed | not rendered | — |
| Open | `var(--color-primary-brown)` | cream (inherited) |

**GlobalNav inside drawer**: Inherits `color` from panel; no component changes expected.

## Test matrix

| Test file | Assertion |
|-----------|-----------|
| `TopBar.test.tsx` | Menu button renders when `showMobileMenu`; FA bars icon present |
| `MobileNavDrawer.test.tsx` | Open drawer panel has `.mobile-nav-drawer__panel`; FA xmark on close |
| `mobileShellTheming.test.ts` (optional) | `@media (max-width: 768px)` block sets `.top-bar` background/color to token vars |
| `npm run test:coverage` | ≥80% on modified shell files |

### CSS contract regex (for `mobileShellTheming.test.ts`)

Within the mobile media block, assert:

- `.top-bar` rules include `background: var(--color-primary-brown)`
- `.top-bar` or `.top-bar__org-name` rules include `var(--color-text-on-dark)`
- `.mobile-nav-drawer__panel` includes `background: var(--color-primary-brown)`

## Desktop regression guard

Above 768px:

- `.top-bar` MUST retain `background: transparent` (base rule outside mobile overrides or not overridden)
- `.sidebar-rail` brown/cream unchanged
- No duplicate mobile theming classes applied via JS

## Files touched (expected)

| File | Change type |
|------|-------------|
| `apps/web/src/components/shell/TopBar.tsx` | Icon swap |
| `apps/web/src/components/shell/MobileNavDrawer.tsx` | Icon swap |
| `apps/web/src/index.css` | Mobile top-bar theming, touch targets, focus rings |
| `apps/web/tests/shell/TopBar.test.tsx` | Theme/icon assertions |
| `apps/web/tests/shell/MobileNavDrawer.test.tsx` | Theme/icon assertions |
| `apps/web/tests/theme/mobileShellTheming.test.ts` | CSS contract (new) |
