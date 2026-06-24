# Phase 1 Data Model: Brand Logo Component

This feature introduces **no persisted entities, API payloads, or database tables**. The data model is the **component prop contract**, **asset registry entries**, and **CSS presentation classes** — client-side presentation state only.

## Brand asset registry

Canonical public URL paths; runtime source is `apps/web/src/brand/assets.ts`. Files live under `apps/web/public/brand/`.

| Constant | Public path | Asset file | Variant | FR |
|----------|-------------|------------|---------|-----|
| `BRAND_LOGO_TEXT` | `/brand/sr-text.png` | `sr-text.png` | `text` (wordmark) | FR-002 |
| `BRAND_LOGO_BADGE` | `/brand/sr-badge.png` | `sr-badge.png` | `badge` | FR-003 |

### Validation rules

- Path strings MUST NOT be duplicated outside `assets.ts` (FR-009, SC-005).
- PNG assets MUST have transparent backgrounds suitable for Lodgepole Brown nav chrome (SPLR-82).
- `BRAND_LOGO_AUTH` exists for epic auth work but is **out of SPLR-83 scope**.

## Component props (`BrandLogoProps`)

| Field | Type | Required | Default | Description | FR |
|-------|------|----------|---------|-------------|-----|
| `variant` | `'text' \| 'badge'` | yes | — | Selects wordmark vs compact badge | FR-001 |
| `className` | `string` | no | — | Merged onto wrapper element | FR-008 |
| `alt` | `string` | no | `'Split-Rail'` | Accessible image label | FR-007 |

### Validation rules

- `variant` MUST be exactly `text` or `badge` for SPLR-83 acceptance (TypeScript union enforces at compile time).
- When `alt` is omitted, rendered `<img>` MUST expose `alt="Split-Rail"`.
- Custom `alt` MUST override default for screen readers.

## Rendered DOM structure

| Element | Classes | Attributes | FR |
|---------|---------|------------|-----|
| Wrapper `<div>` | `brand-logo-wrapper` + optional `className` | — | FR-004, FR-008 |
| Image `<img>` | `brand-logo brand-logo--{variant}` | `src` from registry, `alt` from props/default | FR-002, FR-003 |

### State transitions

| From | To | Trigger | Expected behavior |
|------|-----|---------|-------------------|
| `text` | `badge` | Parent passes new `variant` (e.g. sidebar collapse) | Single `<img>` re-renders with badge `src`; wrapper slot stable |
| `badge` | `text` | Parent passes new `variant` (e.g. sidebar expand) | Wordmark `src`; ≥24px wrapper padding visible |

## CSS presentation classes

Defined in `apps/web/src/index.css`.

| Class | Rules | FR |
|-------|-------|-----|
| `.brand-logo-wrapper` | `display: flex`; `justify-content: center`; `align-items: center`; `padding: 1.5rem` (24px) | FR-004, FR-005 |
| `.brand-logo--text` | `max-width: 100%`; `height: auto`; `max-height: 2.5rem` | FR-005 |
| `.brand-logo--badge` | `width: 2.5rem`; `height: 2.5rem`; `object-fit: contain` | FR-006 |

### Validation rules

- Wordmark wrapper padding MUST be ≥ 24px (1.5rem) on all sides in default styles.
- Badge dimensions MUST fit collapsed rail width without overflow.

## Test contract entities

Vitest cases in `apps/web/tests/theme/BrandLogo.test.tsx` (SPLR-83 scope):

| Test case | Assertion | FR |
|-----------|-----------|-----|
| Text variant | `src === BRAND_LOGO_TEXT`; class `brand-logo--text`; default alt | FR-002, FR-010 |
| Badge variant | `src === BRAND_LOGO_BADGE`; class `brand-logo--badge`; default alt | FR-003, FR-010 |
| Custom alt | `getByRole('img', { name: custom })` | FR-007, FR-010 |
| Wrapper className | `.brand-logo-wrapper.{custom}` present | FR-008, FR-010 |

## Relationships

```text
assets.ts (BRAND_LOGO_*)
    ↓ imported by
BrandLogo.tsx (variant → src map)
    ↓ renders
<img> + wrapper (CSS classes from index.css)
    ↑ consumed by (SPLR-84, out of scope)
SidebarRail | TopBar | MobileNavDrawer | DashboardHome
```

## Out of scope (documented)

| Item | Owner |
|------|-------|
| Navigation shell wiring | SPLR-84 |
| Auth logo variant (`auth`) | Separate epic milestone |
| Logo PNG creation/optimization | SPLR-82 |
