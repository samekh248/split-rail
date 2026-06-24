# Phase 0 Research: Brand Web Fonts (SPLR-80)

All Technical Context items resolved. Decisions grounded in Linear SPLR-80, spec `060-brand-web-fonts`, parent specs `058-brand-theming-mhc` / `059-mhc-design-tokens`, and current `apps/web` codebase on branch `060-brand-web-fonts`.

## D1. Font loading mechanism — `@import` in `index.css`

**Decision**: Keep the existing `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&family=Zilla+Slab:wght@700&display=swap')` as the **sole** font-loading declaration. Do **not** add a parallel `<link rel="stylesheet">` for Google Fonts in `index.html`.

**Rationale**:
- Already present at line 1 of `index.css`; satisfies FR-001 weights and `display=swap` for FOUT mitigation.
- Linear SPLR-80: "choose one, not both" — `@import` vs `<link>`; CSS import is the active path.
- `main.tsx` imports `index.css` before React mount; fonts begin loading with stylesheet parse.
- `index.html` preconnect hints (`fonts.googleapis.com`, `fonts.gstatic.com`) are performance-only and do not constitute a second loading mechanism.

**Alternatives considered**:
- **`<link>` in `index.html` only**: earlier first paint for fonts but requires removing `@import` and duplicating URL maintenance; rejected — current import works and matches SPLR-79 repo path list.
- **Self-hosted font files**: out of scope; brand guide specifies Google Fonts.

## D2. Font token naming — `--font-brand` canonical

**Decision**: Rename `--font-heading` to `--font-brand` per SPLR-80 acceptance criteria. Update all `var(--font-heading)` references in `index.css` to `var(--font-brand)`. Update `tokens.ts` to export `fonts.brand` (remove or alias `fonts.heading` in tests only if needed for one release).

**Rationale**:
- Linear SPLR-80 explicitly names `--font-brand` and `--font-ui`.
- Spec FR-002 describes "brand heading font token" with Zilla Slab stack; `--font-brand` is the canonical CSS name.
- Only ~6 references in `index.css`; rename is low-risk and avoids dual-token confusion.
- SPLR-81 (typography rules) will reference `--font-brand` for headings.

**Alternatives considered**:
- **Keep `--font-heading` as canonical**: conflicts with SPLR-80 acceptance checklist.
- **Dual tokens (`--font-brand` + `--font-heading` alias)**: adds maintenance burden; rejected unless rename breaks external docs (internal epic contracts updated in implementation).

## D3. Fallback stacks — brand guide compliance

**Decision**: Set token values exactly per SPLR-80 / brand guide:

```css
--font-brand: 'Zilla Slab', 'Rokkitt', 'Roboto Slab', serif;
--font-ui: 'Inter', 'Open Sans', 'Lato', sans-serif;
```

Replace current stacks (`'Zilla Slab', serif` and `'Inter', system-ui, -apple-system, sans-serif`).

**Rationale**:
- FR-006 and SC-002 require brand-guide fallback stacks.
- System UI fonts are acceptable emergency fallbacks but are not listed in the brand guide; Open Sans/Lato/Rokkitt/Roboto Slab are the approved degradation path.

**Alternatives considered**:
- **Append system-ui after brand fallbacks**: slightly better OS fallback but diverges from spec; rejected.

## D4. Production CSP — add Google Fonts directives

**Decision**: Extend `PRODUCTION_CONTENT_SECURITY_POLICY` in `contentSecurityPolicy.ts` (and synced `firebase.json` + `index.html` meta) with:

- `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`
- `font-src 'self' https://fonts.gstatic.com`

Append to existing PRD §5.2 directives (`default-src`, `script-src`, `connect-src`, `object-src 'none'`).

**Rationale**:
- Current production CSP (`contentSecurityPolicy.test.ts` contract literal) lacks `style-src` and `font-src`; HTTP header CSP in Firebase Hosting would block Google Fonts `@import` and font files.
- `index.html` meta tag already allowlists these domains for dev — production must match (FR-008, SC-005).
- `'unsafe-inline'` required for Vite dev HMR and existing inline styles; already present in dev meta CSP.

**Alternatives considered**:
- **Nonce-based style-src**: out of scope for typography milestone; would require broader CSP refactor.
- **Rely on meta CSP only in production**: rejected — SPLR-42 mandates HTTP header CSP; meta is dev fallback only.

## D5. TypeScript mirror and test scope

**Decision**: Extend `tokens.ts` `fonts` object and `requiredCssVariables` with `--font-brand` and `--font-ui`. Extend `typography.test.ts` to assert:
- Google Fonts URL contains `Zilla+Slab:wght@700` and `Inter:wght@400;500;700`
- Token stacks match `tokens.ts`
- `body` uses `var(--font-ui)`
- No duplicate font `<link rel="stylesheet">` in `index.html`

Do **not** add Playwright E2E for font loading in this milestone — Vitest file contracts + manual auth FOUT check satisfy FR-009/SC-004.

**Rationale**:
- Mirrors M1 color token test pattern from `059-mhc-design-tokens`.
- Constitution III requires automated verification; font rendering in real browsers is manual spot-check per quickstart.

**Alternatives considered**:
- **Playwright computed-style assertion**: heavier; defer unless manual FOUT check fails repeatedly.

## D6. Heading typography rules — defer to SPLR-81

**Decision**: Do not change `h1, h2, .heading-brand` selector blocks beyond renaming `var(--font-heading)` → `var(--font-brand)`. Do not add new global typography rules (button font weights, table metrics, etc.).

**Rationale**:
- Spec scope boundary: SPLR-81 owns "Apply global typography rules."
- Existing heading rules from epic branch remain; SPLR-80 only ensures tokens and font files exist.

**Alternatives considered**:
- **Bundle SPLR-81 into this PR**: rejected — violates spec dependencies and milestone tracking.

## D7. Dependency on SPLR-79 (design tokens)

**Decision**: Font tokens are added to the existing `:root` block in `index.css` immediately after color tokens. No separate file. Assumes `059-mhc-design-tokens` color token names/values are merged or present on branch.

**Rationale**:
- FR-004 requires font tokens alongside color tokens in the centralized layer.
- SPLR-80 is blocked-by SPLR-79; implementation proceeds once color foundation is on branch (already present from epic work).

**Alternatives considered**:
- **Separate `fonts.css`**: rejected — splits token layer against FR-004 intent.
