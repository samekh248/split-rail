# Phase 1 Data Model: Brand Web Fonts

This feature introduces **no persisted entities, API payloads, or database tables**. The data model is the **typography token catalog** and **font-loading declaration** — client-side CSS custom properties with a TypeScript mirror for automated tests, plus CSP allowlist entries for external font delivery.

## Font family tokens

Canonical values per Montana High Country brand guide / SPLR-80; runtime source is `:root` in `index.css`; test parity in `src/theme/tokens.ts`.

| Field | CSS variable | Stack value | Role | FR |
|-------|--------------|-------------|------|-----|
| `brand` | `--font-brand` | `'Zilla Slab', 'Rokkitt', 'Roboto Slab', serif` | Headings, titles, headliner names | FR-002 |
| `ui` | `--font-ui` | `'Inter', 'Open Sans', 'Lato', sans-serif` | Body, navigation, buttons, inputs, tables, metrics | FR-002, FR-003 |

### Validation rules

- Each font token MUST be declared exactly once in the `:root` token block alongside color tokens (FR-004).
- Fallback family names MUST match brand guide order (SC-002).
- `--font-heading` MUST NOT remain as the canonical name (renamed to `--font-brand` per research D2).

## Font weight set

Loaded via single Google Fonts `@import` URL; not stored as separate CSS variables in this milestone.

| Family | Weights loaded | Usage (SPLR-81+) |
|--------|----------------|------------------|
| Zilla Slab | 700 | Headings, bold display |
| Inter | 400, 500, 700 | Body, medium labels, bold buttons/metrics |

### Validation rules

- `@import` URL MUST include `Zilla+Slab:wght@700` and `Inter:wght@400;500;700` (FR-001).
- URL SHOULD include `display=swap` for FOUT mitigation (FR-009).

## Document defaults

| Element | Property | Token reference | FR |
|---------|----------|-----------------|-----|
| `:root` | `font-family` | `var(--font-ui)` | FR-003 |
| `body` | `font-family` | `var(--font-ui)` | FR-003 |

### Validation rules

- `body` MUST use `var(--font-ui)`, not a raw font-family string (SC-003).
- Default interface text inherits UI stack before component overrides.

## Font loading declaration

| Field | Location | Value |
|-------|----------|-------|
| `googleFontsImport` | First line of `index.css` | `https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&family=Zilla+Slab:wght@700&display=swap` |

### Validation rules

- Exactly one font-loading mechanism (FR-007): `@import` in CSS **xor** `<link rel="stylesheet">` in HTML — not both.
- `index.html` MAY include `preconnect` hints only.

## Font provider allowlist (CSP)

| Directive | Allowed origins | FR |
|-----------|-----------------|-----|
| `style-src` | `'self'`, `'unsafe-inline'`, `https://fonts.googleapis.com` | FR-008 |
| `font-src` | `'self'`, `https://fonts.gstatic.com` | FR-008 |

Synced across:
- `src/security/contentSecurityPolicy.ts` (`PRODUCTION_CONTENT_SECURITY_POLICY`)
- `firebase.json` hosting headers
- `index.html` meta CSP (dev parity)

### Validation rules

- Production contract literal in `contentSecurityPolicy.test.ts` MUST include both directives.
- `firebase.json` CSP header MUST match TS constant (existing cross-artifact sync test).

## Relationships

```text
GoogleFontsCDN
├── stylesheet (fonts.googleapis.com) ──► @import in index.css
└── font files (fonts.gstatic.com) ──► browser cache

TokenDefinitionBlock (:root in index.css)
├── FontFamilyToken (2)
│   ├── --font-brand ──► heading selectors (SPLR-81 expands)
│   └── --font-ui ──► :root + body defaults
└── ColorTokens (from SPLR-79) — sibling in same block

contentSecurityPolicy.ts
└── FontProviderAllowlist
        └── permits GoogleFontsCDN origins

tokens.ts (test mirror)
└── mirrors font stacks + exports requiredCssVariables[]
```

## State transitions

Not applicable — font tokens and CSP allowlists are static declarations until the brand guide or font provider changes.

## Out of scope entities

The following are **not** part of this data model (deferred to SPLR-81+):

- Typography role mapping (button label weight, table numerals, event card headliners)
- `font-weight` / `line-height` semantic tokens
- Self-hosted font binaries
- `size-adjust` / `font-display` per-element overrides beyond `display=swap` on import URL
