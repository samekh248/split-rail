# Contract: BrandLogo Component (SPLR-83)

Dynamic logo component for navigation branding. Runtime source: `apps/web/src/components/brand/BrandLogo.tsx`. Asset paths: `apps/web/src/brand/assets.ts`. Styles: `apps/web/src/index.css`.

**Scope**: `text` and `badge` variants only. `auth` variant is out of SPLR-83 scope but may exist in the component for epic continuity.

## Asset registry (SPLR-82 dependency)

`apps/web/src/brand/assets.ts`:

```typescript
export const BRAND_LOGO_TEXT = '/brand/sr-text.png';
export const BRAND_LOGO_BADGE = '/brand/sr-badge.png';
```

| File | Public path | Usage |
|------|-------------|-------|
| `apps/web/public/brand/sr-text.png` | `/brand/sr-text.png` | Wordmark (`text` variant) |
| `apps/web/public/brand/sr-badge.png` | `/brand/sr-badge.png` | Badge (`badge` variant) |

**Rules**:
1. Image path strings MUST appear only in `assets.ts`.
2. Assets MUST be PNG with transparent backgrounds.

## Component API

```typescript
export interface BrandLogoProps {
  variant: 'text' | 'badge';
  className?: string;
  alt?: string;
}
```

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `variant` | `'text' \| 'badge'` | yes | — | Wordmark vs compact badge |
| `className` | `string` | no | — | Additional wrapper classes |
| `alt` | `string` | no | `'Split-Rail'` | Image accessible name |

## Rendering contract

```tsx
// variant === 'text'  → <img src={BRAND_LOGO_TEXT}  alt={alt} className="brand-logo brand-logo--text" />
// variant === 'badge' → <img src={BRAND_LOGO_BADGE} alt={alt} className="brand-logo brand-logo--badge" />
```

- Single `<img>` per render; no inline SVG duplication.
- Wrapper: `<div className={['brand-logo-wrapper', className].filter(Boolean).join(' ')}>`.

## CSS contract (`index.css`)

```css
.brand-logo-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1.5rem; /* 24px — FR-005 */
}

.brand-logo--text {
  max-width: 100%;
  height: auto;
  max-height: 2.5rem;
}

.brand-logo--badge {
  width: 2.5rem;
  height: 2.5rem;
  object-fit: contain;
}
```

Optional: `transition: opacity 150ms ease` on `.brand-logo` — not required for acceptance.

## Layout rules

| Variant | Context (SPLR-84 wires) | Requirements |
|---------|-------------------------|--------------|
| `text` | Expanded sidebar, mobile drawer/top | Centered; wrapper padding ≥ 24px |
| `badge` | Collapsed sidebar rail | Centered; fits narrow rail width |

## Accessibility

- Meaningful `alt` always present; default `"Split-Rail"`.
- Decorative-only `alt=""` is NOT permitted for brand logo usage.
- Logo is non-interactive unless parent wraps in a link (future).

## Tests (`apps/web/tests/theme/BrandLogo.test.tsx`)

SPLR-83 required cases:

1. `variant="text"` → `src` is `/brand/sr-text.png`; class `brand-logo--text`; role `img` name `Split-Rail`.
2. `variant="badge"` → `src` is `/brand/sr-badge.png`; class `brand-logo--badge`; role `img` name `Split-Rail`.
3. Custom `alt` prop honored.
4. `className` merged on `.brand-logo-wrapper`.

Run:

```bash
cd apps/web && npm run test -- tests/theme/BrandLogo.test.tsx
```

## Out of scope

- Wiring into `SidebarRail`, `TopBar`, `MobileNavDrawer` → SPLR-84
- `auth` variant tests → separate milestone
- Hardcoded paths in consumers → forbidden; use `<BrandLogo variant="..." />` only
