# Contract: BrandLogo Component

Dynamic logo component for navigation branding (SPLR-83, FR-007).

**Location**: `apps/web/src/components/brand/BrandLogo.tsx`

## Assets (SPLR-82)

| File | Path | Usage |
|------|------|-------|
| Wordmark | `apps/web/public/sr-text.png` | Expanded sidebar, mobile drawer/top |
| Badge | `apps/web/public/sr-badge.png` | Collapsed sidebar rail |

Assets MUST be optimized PNG/SVG with transparent backgrounds suitable for Lodgepole Brown nav chrome.

## Component API

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `variant` | `'text' \| 'badge'` | yes | Selects wordmark vs compact badge |
| `className` | `string` | no | Additional wrapper classes for layout (centering, padding) |
| `alt` | `string` | no | Default `"Split-Rail"` |

## Rendering contract

```tsx
// variant === 'text'  → <img src="/sr-text.png" alt={alt} className="brand-logo brand-logo--text" />
// variant === 'badge' → <img src="/sr-badge.png" alt={alt} className="brand-logo brand-logo--badge" />
```

- Single `<img>` per render; no inline SVG duplication.
- Wrapper: `<div className="brand-logo-wrapper">` for centering and min-height slot (prevents layout shift on variant swap).

## Layout rules (FR-007)

| Context | Variant | CSS requirements |
|---------|---------|------------------|
| Expanded sidebar | `text` | Centered; `padding ≥ 24px` on wrapper |
| Collapsed rail | `badge` | Centered; compact max-width fits rail |
| Mobile top bar / drawer | `text` | Centered; scales down below 360px if needed |
| Interim `app__header` | `text` | Leading or centered per header layout |

## Wiring contract (SPLR-84)

Parent components pass `variant` based on navigation state:

| Parent | State source | Variant |
|--------|--------------|---------|
| `SidebarRail` (when present) | `useSidebarState().collapsed` | `collapsed ? 'badge' : 'text'` |
| `MobileNavDrawer` | always top of drawer | `text` |
| `TopBar` | mobile persistent bar | `text` |
| `DashboardHome` (interim) | N/A | `text` |

## Accessibility

- Meaningful `alt` text always present.
- Decorative-only usage is NOT permitted — logo conveys brand identity.
- Focus: logo is not interactive unless wrapped in a link (future); no focus trap.

## Tests (`tests/theme/BrandLogo.test.tsx`)

1. `variant="text"` renders img with `src` containing `sr-text`.
2. `variant="badge"` renders img with `src` containing `sr-badge`.
3. Default `alt` is `"Split-Rail"`.
4. Custom `className` applied to wrapper.
