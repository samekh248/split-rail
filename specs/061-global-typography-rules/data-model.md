# Phase 1 Data Model: Global Typography Rules

This feature introduces **no persisted entities, API payloads, or database schema**. The "data" is the **typography rule set** — a declarative mapping from content roles to design tokens — expressed in global CSS and documented in a comment reference.

## Design tokens consumed (from upstream `059` / `060`)

| Token | Semantic role | Used by |
|-------|---------------|---------|
| `--font-heading` | Brand slab-serif (Zilla Slab stack) | `h1`–`h3`, `.heading-brand` |
| `--font-ui` | Sans-serif UI stack (Inter) | `body`, `p`, `label`, `button`, `input`, `td`, `th` |
| `--color-primary-brown` | Lodgepole Brown — heading ink on light surfaces | `h1`–`h3`, `.heading-brand` |
| `--color-bg-cream` | Canvas Cream — text on dark brown surfaces | `.text-on-dark` |

> Token names and values are owned by upstream specs; this feature **references** them only.

## Typography rule set (logical model)

### BrandHeadingRule

| Attribute | Value | Applies to |
|-----------|-------|------------|
| `fontFamily` | `var(--font-heading)` | `h1`, `h2`, `h3`, `.heading-brand` |
| `fontWeight` | `700` | same |
| `color` | `var(--color-primary-brown)` | same |

**Validation**: On light/cream/white surfaces, heading text MUST meet brand contrast expectations (verified manually on representative pages per quickstart.md).

### UiTextRule

| Attribute | Value | Applies to |
|-----------|-------|------------|
| `fontFamily` | `var(--font-ui)` | `body`, `p`, `label`, `button`, `input`, `td`, `th` |

**Validation**: No element in the UI text set may declare a competing `font-family` in component CSS unless documented as an exception (e.g. monospace formula editor — out of scope).

### TextOnDarkUtility

| Class | Attribute | Value |
|-------|-----------|-------|
| `.text-on-dark` | `color` | `var(--color-bg-cream)` |

**Usage rule**: Apply to text nodes on dark brown brand surfaces (navigation, app header) rather than baking cream hex into component rules.

## Documentation reference (FR-004)

A comment block at the top of the Typography section in `index.css` MUST list:

| Symbol | Role |
|--------|------|
| `h1`, `h2`, `h3` | Semantic brand headings |
| `.heading-brand` | Non-semantic brand heading hook (modals, cards) |
| `body`, `p`, `label`, `button`, `input`, `td`, `th` | UI / body text |
| `.text-on-dark` | Cream text on dark brand backgrounds |

## Representative surfaces (regression scope)

| Surface | Heading element | UI text elements |
|---------|-----------------|------------------|
| Login / Register (`AuthLayout`) | `h1.auth-layout__title` | `label`, `input`, `button` in auth forms |
| Dashboard home (`DashboardHome`) | `h1` in `.app__header` | subtitle `p`, sign-out `button`, ledger content |
| Event ledger (`EventLedgerPage`) | section `h2`/`h3` if present | table `th`/`td`, form controls |

## State transitions

Not applicable — typography rules are static presentation defaults with no runtime state machine.

## Client / API types

None. Constitution VI is satisfied by not introducing TypeScript payload types.
