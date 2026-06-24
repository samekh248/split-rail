# Contract: Global Typography CSS Rules

**Feature**: `061-global-typography-rules` (SPLR-81)  
**Consumer**: All `apps/web` screens via `apps/web/src/index.css`  
**Depends on**: `059-mhc-design-tokens`, `060-brand-web-fonts`

## Purpose

Define the **global typography contract** — which semantic elements and utility classes receive brand heading vs. UI text styling, and which design tokens they reference. Implementations MUST match this contract so pages inherit typography without per-component font declarations.

## Typography section location

Rules live in `apps/web/src/index.css` under a clearly labeled `/* Typography */` section with a documentation comment block (see FR-004).

## Heading rules

**Selectors**: `h1`, `h2`, `h3`, `.heading-brand`

| Property | Required value |
|----------|----------------|
| `font-family` | `var(--font-heading)` |
| `font-weight` | `700` |
| `color` | `var(--color-primary-brown)` |

### Acceptance

- Dashboard home page title (`h1` in app header) matches this contract.
- Auth card title (`h1.auth-layout__title`) matches this contract.
- Modal titles using `h1`–`h3` or `.heading-brand` match without extra `font-family` rules.

## UI text rules

**Selectors**: `body`, `p`, `label`, `button`, `input`, `td`, `th`

| Property | Required value |
|----------|----------------|
| `font-family` | `var(--font-ui)` |

### Acceptance

- Login/register form labels, inputs, and buttons use `var(--font-ui)`.
- Ledger table `th` and `td` cells use `var(--font-ui)`.
- Body copy and paragraphs default to `var(--font-ui)`.

## Dark-surface utility

**Selector**: `.text-on-dark`

| Property | Required value |
|----------|----------------|
| `color` | `var(--color-bg-cream)` |

### Usage

Apply `.text-on-dark` to text that sits on dark brown brand backgrounds (navigation, headers). Do not hard-code cream hex in component CSS.

## Explicit non-goals (this contract)

| Item | Reason |
|------|--------|
| Font loading (`@font-face`, preconnect) | Owned by `060-brand-web-fonts` |
| Color token definitions in `:root` | Owned by `059-mhc-design-tokens` |
| Component spacing, font-size scales | Remain in component CSS |
| Monospace formula editor styling | Separate domain; not part of UI text set |
| Full shell/header background recolor | Downstream branding milestone |

## Override policy

| Allowed in component CSS | Disallowed on governed selectors |
|--------------------------|----------------------------------|
| `font-size`, `margin`, `padding`, `line-height` | `font-family` (unless documented exception) |
| Layout (`display`, `flex`, `grid`) | `font-weight` on headings |
| Surface colors on containers | `color` on headings that contradicts brand brown |

## Test contract (`typography.test.ts`)

The Vitest suite MUST assert `index.css` contains:

1. `--font-heading` and `--font-ui` references in typography rules.
2. `h1` (or grouped `h1, h2, h3`) rule with `font-family: var(--font-heading)`.
3. `body` rule with `font-family: var(--font-ui)`.
4. `.heading-brand` with heading font family and primary brown color.
5. `.text-on-dark` with `color: var(--color-bg-cream)`.
6. Documentation comment listing governed selectors/classes.

Full `npm test` in `apps/web` MUST pass with no new failures.
