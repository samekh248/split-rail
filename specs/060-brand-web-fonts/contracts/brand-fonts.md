# Contract: Brand Web Fonts (SPLR-80)

Font token, loading, and CSP contract for Montana High Country typography foundation. Runtime source of truth: `apps/web/src/index.css`. Test parity: `apps/web/src/theme/tokens.ts`. Production CSP: `apps/web/src/security/contentSecurityPolicy.ts`.

## Google Fonts import (sole loading mechanism)

First line of `apps/web/src/index.css`:

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&family=Zilla+Slab:wght@700&display=swap');
```

**Rules**:
1. MUST be the only font-loading declaration (no parallel `<link rel="stylesheet">` to Google Fonts in `index.html`).
2. `index.html` MAY retain `preconnect` hints for `fonts.googleapis.com` and `fonts.gstatic.com`.

## `:root` font tokens

```css
:root {
  --font-brand: 'Zilla Slab', 'Rokkitt', 'Roboto Slab', serif;
  --font-ui: 'Inter', 'Open Sans', 'Lato', sans-serif;

  font-family: var(--font-ui);
}
```

Font tokens MUST appear in the same `:root` block as color tokens from SPLR-79.

## `body` default

```css
body {
  font-family: var(--font-ui);
}
```

## Heading reference (rename only — rules expanded in SPLR-81)

Existing selectors (`h1`, `h2`, `.heading-brand`, etc.) MUST reference `var(--font-brand)`, not `var(--font-heading)`.

## TypeScript mirror contract

`src/theme/tokens.ts` MUST export:

```typescript
export const fonts = {
  brand: "'Zilla Slab', 'Rokkitt', 'Roboto Slab', serif",
  ui: "'Inter', 'Open Sans', 'Lato', sans-serif",
} as const;

export const requiredCssVariables = [
  // ...color tokens from SPLR-79...
  '--font-brand',
  '--font-ui',
] as const;
```

Stack strings MUST match `:root` declarations.

## Production CSP contract

`PRODUCTION_CONTENT_SECURITY_POLICY` MUST include (order of directives flexible; all required):

```
default-src 'self';
script-src 'self';
connect-src 'self' *.quickbooks.com *.googleapis.com;
object-src 'none';
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com;
```

**Cross-artifact sync** (existing test pattern):
- `firebase.json` `hosting.headers` CSP value MUST equal `PRODUCTION_CONTENT_SECURITY_POLICY`.
- `index.html` meta CSP SHOULD include equivalent `style-src` and `font-src` entries for local dev parity.

## Vitest contracts

### `tests/theme/typography.test.ts`

MUST assert:

| Check | Method |
|-------|--------|
| `@import` contains `fonts.googleapis.com` | `readFileSync(index.css)` |
| URL includes `Zilla+Slab:wght@700` and `Inter:wght@400;500;700` | string match |
| `--font-brand` and `--font-ui` present with brand-guide stacks | regex / `tokens.ts` parity |
| `body` uses `font-family: var(--font-ui)` | regex |
| `index.html` has no Google Fonts `<link rel="stylesheet">` | `readFileSync(index.html)` |

### `tests/security/contentSecurityPolicy.test.ts`

MUST assert:

| Check | Method |
|-------|--------|
| Policy contains `style-src` with `fonts.googleapis.com` | string match |
| Policy contains `font-src` with `fonts.gstatic.com` | string match |
| `firebase.json` CSP matches TS constant | existing cross-artifact test |

## Build contract

```bash
cd apps/web && npm run build
```

MUST succeed (FR-005). Font `@import` MUST resolve in production bundle (Vite passes through external URL).

## Manual validation (FR-009)

On login or registration screen:
1. Hard-refresh with cache disabled (optional).
2. Observe text for layout shift after fonts load.
3. **Pass**: no obvious reflow; **Fail**: headings or labels jump noticeably.

## Out of scope (deferred)

- Global typography mapping for all components — SPLR-81
- `font-weight` token variables — SPLR-81
- Self-hosted fonts — not in brand guide
- Playwright font computed-style E2E — optional future hardening

## Delta from current branch

| Current | Target |
|---------|--------|
| `--font-heading` | Rename to `--font-brand` |
| Incomplete fallback stacks | Full brand-guide stacks |
| Production CSP missing font directives | Add `style-src` + `font-src` |
| `tokens.ts` `fonts.heading` | Rename to `fonts.brand` |
