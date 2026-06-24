# Phase 1 Data Model: Montana High Country Branding & Theming

This feature introduces **no persisted entities, API payloads, or database tables**. The "data model" is the **design token catalog**, **typography role mapping**, **navigation layout state**, and **logo variant selection** — all client-side and CSS-driven. No types mirror API contracts (Constitution VI N/A).

## Brand color tokens

Canonical values exported from `src/theme/tokens.ts` for test parity; runtime styling reads CSS custom properties from `:root`.

| Token | CSS variable | Hex | Brand name | Primary surfaces |
|-------|--------------|-----|------------|------------------|
| `primaryBrown` | `--color-primary-brown` | `#3E2723` | Lodgepole Brown | Nav background, headings, body on light bg, subtle borders |
| `accentOrange` | `--color-accent-orange` | `#E65100` | Alpine Sunset | Primary CTAs, active nav indicator, alert badges |
| `bgCream` | `--color-bg-cream` | `#F4F1EA` | Canvas Cream | App background, nav text on brown |
| `surfaceWhite` | `--color-surface-white` | `#FFFFFF` | Pure White | Cards, tables, modals |

### Derived tokens (computed or documented in CSS)

| Token | CSS variable | Derivation | Usage |
|-------|--------------|------------|-------|
| `accentOrangeHover` | `--color-accent-orange-hover` | ~10% darker than accent | Primary button hover |
| `navHoverOverlay` | `--color-nav-hover-overlay` | `rgba(255,255,255,0.1)` | Sidebar link hover |
| `borderSubtle` | `--color-border-subtle` | brown @ 15% opacity | Card/table borders |
| `shadowSoft` | `--shadow-soft` | `0 2px 5px rgba(0,0,0,0.05)` | Card elevation |
| `focusRing` | `--color-focus-ring` | accent or high-contrast alternate | `:focus-visible` outlines |

## Typography roles

| Role | Font family | Weight | Color rule | Elements |
|------|-------------|--------|------------|----------|
| `heading` | Zilla Slab | 700 | `primaryBrown` on light; `bgCream` on brown | `<h1>`, modal titles, event card headliner |
| `body` | Inter | 400 | `primaryBrown` on cream/white | Paragraphs, table cells, metrics |
| `uiLabel` | Inter | 500 | context-dependent | Nav links, form labels |
| `buttonLabel` | Inter | 700 | `bgCream` or `surfaceWhite` on orange; `bgCream` on brown | CTAs, secondary buttons |
| `badgeLabel` | Inter | 700 | `surfaceWhite` on orange | Action-required pills |

Global rules in `index.css`:
- `body { font-family: var(--font-ui); color: var(--color-primary-brown); background: var(--color-bg-cream); }`
- `h1, h2, .heading-brand { font-family: var(--font-heading); font-weight: 700; }`

## UI surface tiers

Maps spec entity **UI surface tier** to token application:

| Tier | Background token | Text token | Examples |
|------|------------------|------------|----------|
| `canvas` | `bgCream` | `primaryBrown` | Main app area, auth page backdrop |
| `container` | `surfaceWhite` | `primaryBrown` | Cards, tables, modals, auth card |
| `navChrome` | `primaryBrown` | `bgCream` | Sidebar, mobile drawer, top bar |
| `accent` | `accentOrange` | `bgCream` or `surfaceWhite` | Primary buttons, active indicator, badges |

## Logo variant model

| Field | Type | Values | Rule |
|-------|------|--------|------|
| `variant` | `'text' \| 'badge'` | wordmark / compact | Selected by navigation layout |
| `assetPath` | `string` | `/brand/sr-text.png` or `/brand/sr-badge.png` | Public URL |
| `alt` | `string` | `"Split-Rail"` | Constant for a11y |

### Selection rules (Navigation state → Logo variant)

| Navigation state | Logo variant | Placement |
|------------------|--------------|-----------|
| `sidebarExpanded` | `text` | Centered top of sidebar, ≥24px padding |
| `sidebarCollapsed` | `badge` | Centered top of minimized rail |
| `mobileDrawerOpen` | `text` | Top of fly-out drawer |
| `mobileTopBar` | `text` | Centered in persistent top bar |
| `headerOnly` (interim) | `text` | Centered or leading in `app__header` when shell absent |

## Navigation layout state (client UI)

Not persisted; derived from viewport + user preference.

| State | Trigger | Theming notes |
|-------|---------|---------------|
| `sidebarExpanded` | Desktop, pin expanded | Full nav labels + text logo |
| `sidebarCollapsed` | Desktop, rail collapsed | Icons only + badge logo |
| `mobileDrawerClosed` | `<768px`, drawer shut | Top bar visible |
| `mobileDrawerOpen` | Hamburger toggled | Drawer with brown bg + text logo |

When shell components are absent, only `headerOnly` + `mobileTopBar` equivalents apply via `DashboardHome` header styling.

## Legacy palette denylist

Values forbidden in `index.css` after M4 migration (see `src/theme/legacyPalette.ts`):

| Hex | Former usage |
|-----|--------------|
| `#1e293b` | Header, submit buttons |
| `#2563eb` | Links, focus rings |
| `#64748b` | Muted text |
| `#e2e8f0` | Borders |
| `#f8fafc` | Table header bg |
| `#cbd5e1` | Input borders |
| `#475569` | Modal body text |
| `#f6f7f9` | Page background |

## WCAG contrast pairings (test model)

| Pairing ID | Foreground | Background | Min ratio | WCAG level |
|------------|------------|------------|-----------|------------|
| `brown-on-cream` | `primaryBrown` | `bgCream` | 4.5:1 | AA normal text |
| `cream-on-brown` | `bgCream` | `primaryBrown` | 4.5:1 | AA normal text |
| `cta-label-on-orange` | `bgCream` or `surfaceWhite` | `accentOrange` | 4.5:1 | AA normal text |
| `white-on-orange` | `surfaceWhite` | `accentOrange` | 4.5:1 | AA (fallback if cream fails) |

## State transitions (logo variant)

```
sidebarExpanded  --(collapse)--> sidebarCollapsed   [text → badge]
sidebarCollapsed --(expand)----> sidebarExpanded     [badge → text]
mobileDrawerClosed --(open)----> mobileDrawerOpen    [top bar → drawer text logo]
```

## Relationships

- **Brand color tokens** are the single source of truth; all surface tiers and typography roles reference them.
- **Logo variant** depends on **Navigation layout state**; `BrandLogo` receives `variant` as a prop from shell or header container.
- **Legacy denylist** is the inverse of accepted tokens — regression tests ensure global CSS never reintroduces off-palette hex values.
