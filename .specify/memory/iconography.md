# UI Iconography Standard

**Status**: Active | **Applies to**: `apps/web` (and future UI surfaces)

## Requirement

Use **Font Awesome Free** icons wherever a standard icon is available. Do not hand-draw SVG icons, Unicode symbols, or letter placeholders when a suitable free Font Awesome icon exists.

## Package stack

| Package | Purpose |
|---------|---------|
| `@fortawesome/fontawesome-svg-core` | Core config (import once in `apps/web/src/lib/fontAwesome.ts`) |
| `@fortawesome/free-solid-svg-icons` | Primary icon set (`fas`) |
| `@fortawesome/react-fontawesome` | `<FontAwesomeIcon />` component |

**Prohibited without approval**: `@fortawesome/pro-*` packages (paid license).

**Optional when needed**: `@fortawesome/free-regular-svg-icons` (`far`), `@fortawesome/free-brands-svg-icons` (`fab`).

## Implementation rules

1. Import icons individually from the free package for tree-shaking (e.g. `import { faThumbtack } from '@fortawesome/free-solid-svg-icons'`).
2. Bootstrap Font Awesome once via `import '@/lib/fontAwesome'` in `main.tsx`.
3. Prefer semantic `aria-label` on the interactive control; set `aria-hidden="true"` on decorative `<FontAwesomeIcon />` children.
4. Style icons with existing component CSS (e.g. `.nav-pin-button__icon`); avoid inline dimensions unless necessary.
5. When replacing legacy symbols (chevrons, emoji, initials-as-icons), migrate to Font Awesome in the same change or a immediate follow-up for that surface.

## Navigation pin/unpin (reference)

| UI state | Font Awesome icon | Solid name |
|----------|-------------------|------------|
| Pin navigation open | `faThumbtack` | `thumbtack` |
| Unpin navigation | `faThumbtackSlash` | `thumbtack-slash` |

Component: `apps/web/src/components/shell/NavPinButton.tsx`.

## Exceptions

- User avatar initials in `ProfileBadge` (identity, not iconography).
- Generated or brand-specific assets (e.g. org logos) when no Font Awesome equivalent exists.
- Chart/data visualizations that require custom graphics.
