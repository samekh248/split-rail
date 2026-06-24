# Phase 0 Research: Montana High Country Branding & Theming

All Technical Context items are resolved. Decisions are grounded in the Linear SPLR-96 epic, the "Branding and theming" project description, and the current `apps/web` codebase on branch `058-brand-theming-mhc`.

## D1. Styling mechanism — CSS custom properties in `index.css`

**Decision**: Define Montana High Country tokens as `:root` CSS custom properties in `apps/web/src/index.css`. Refactor existing rules to consume `var(--color-*)`, `var(--font-*)`, and shared radius/shadow tokens. Do not introduce Tailwind or CSS-in-JS.

**Rationale**:
- Linear implementation notes explicitly state plain CSS concentrated in `index.css` with no Tailwind in `apps/web` today.
- The codebase already uses a single global stylesheet with BEM-style class names (`.auth-layout`, `.ledger-grid__summary`, `.app__header`).
- Custom properties propagate globally so M4 hex migration and M6 contrast adjustments require editing token definitions once.

**Alternatives considered**:
- **Tailwind + tailwind.config theme extension**: rejected — out of scope per epic notes; would introduce a new dependency and diverge from project convention.
- **CSS Modules per component**: rejected — would fragment the token layer and increase migration cost for ~20 legacy hex occurrences already in `index.css`.

## D2. Web font loading — Google Fonts (Zilla Slab + Inter)

**Decision**: Import `Zilla Slab` (700) and `Inter` (400, 500, 700) via `@import` at the top of `index.css` or via `<link rel="preconnect">` + stylesheet in `index.html`. Set `font-display: swap` on font faces.

**Rationale**:
- Brand guide specifies Zilla Slab + Inter as primary choices with slab/sans alternates only if unavailable.
- Google Fonts is zero-build-step and matches Vite SPA deployment (Firebase Hosting).
- Inter covers all UI weights; Zilla Slab 700 covers headings only — minimal payload.

**Alternatives considered**:
- **Self-hosted woff2 in `public/fonts/`**: better privacy/offline, but adds asset pipeline work; defer unless CSP or performance requires it.
- **System font stack only**: rejected — fails brand spec (FR-002).

## D3. Canonical token values

**Decision**: Adopt the Linear project palette exactly:

| Token | Hex | Brand name |
|-------|-----|------------|
| `--color-primary-brown` | `#3E2723` | Lodgepole Brown |
| `--color-accent-orange` | `#E65100` | Alpine Sunset |
| `--color-bg-cream` | `#F4F1EA` | Canvas Cream |
| `--color-surface-white` | `#FFFFFF` | Pure White |

Derived tokens (documented in contracts/design-tokens.md): hover orange (`color-mix` or precomputed darken), nav hover overlay `rgba(255,255,255,0.1)`, faint brown border at 15% opacity, focus ring color.

**Rationale**: Matches authoritative brand guide; satisfies FR-001 and SC-001.

## D4. Legacy palette denylist for regression tests

**Decision**: Maintain `src/theme/legacyPalette.ts` with hex values to forbid in global CSS after migration, including at minimum: `#1e293b`, `#2563eb`, `#64748b`, `#e2e8f0`, `#f8fafc`, `#cbd5e1`, `#475569`, `#f6f7f9`. Vitest reads `index.css` as text and fails if any denylisted value appears (case-insensitive).

**Rationale**:
- Current `index.css` contains ~20 legacy slate/blue literals (grep-confirmed).
- FR-014 and SC-005 require automated detection of palette regression.
- File-text scan is simple, fast, and does not require a CSS parser.

**Alternatives considered**:
- **Stylelint custom rule**: powerful but adds tooling config; Vitest scan is sufficient for MVP and runs in existing `npm test`.
- **Visual snapshot testing only**: catches regressions late and flakes on font rendering; complement with hex scan.

## D5. Navigation shell dependency

**Decision**: Implement theming in **token-first layers** that work on the current branch's `app__header` chrome and automatically apply when vertical-navigation shell components merge:
1. M1 establishes global tokens and typography — works immediately on all pages.
2. M2 ships `BrandLogo` and wires it into whatever top chrome exists (`DashboardHome` header today; `SidebarRail`/`TopBar` when merged).
3. M3 adds shell-specific rules (`.sidebar-rail`, `.mobile-nav-drawer`, etc.) using the same tokens; if shell files are absent, theme `app__header` as interim navigation chrome and document full sidebar rules in contracts for post-merge application.

**Rationale**:
- Branch `058-brand-theming-mhc` currently has no `components/shell/` directory; spec assumes vertical nav may be on another branch.
- Token-based CSS avoids rework when shell lands.
- SPLR-84 acceptance can be partially satisfied on current header while sidebar wiring completes after merge.

**Alternatives considered**:
- **Block M2–M3 until vertical nav merges**: delays entire epic; rejected — M1, M4, M5, M6 deliver value independently.
- **Duplicate minimal shell in this feature**: rejected — violates spec edge case guidance to reuse existing shell components.

## D6. WCAG AA contrast verification

**Decision**: Encode primary pairings in `src/theme/tokens.ts` with expected minimum ratios. Vitest tests compute contrast using relative luminance (WCAG 2.1 formula) for:
- Brown on cream (normal text ≥ 4.5:1)
- Cream on brown (normal text ≥ 4.5:1)
- Cream or white on orange (normal text ≥ 4.5:1 — default CTA label to white if cream fails)

Manual spot-check with browser DevTools or axe DevTools during M6 sign-off.

**Rationale**: FR-013 and SC-002 require measurable compliance; automated tests prevent silent token drift.

## D7. Button and badge class strategy

**Decision**: Introduce shared utility classes in `index.css`:
- `.btn-primary`, `.btn-secondary` for CTAs (SPLR-88)
- `.badge-action-required` for orange pills (SPLR-90)
- Extend existing `.auth-form__submit` to compose `.btn-primary` or replace with shared class

Migrate component-specific rules incrementally in M4 (SPLR-91) rather than one big-bang rewrite.

**Rationale**: Matches existing BEM + global CSS pattern; minimizes JSX churn.

## D8. Testing and coverage strategy

**Decision**:
- `tests/theme/designTokens.test.ts` — contrast ratios + token object parity with `:root` declarations
- `tests/theme/legacyPalette.test.ts` — denylist scan
- `tests/theme/BrandLogo.test.tsx` — variant prop renders correct `img` src/alt
- Extend existing `AuthLayout.test.tsx`, `WelcomeModal.test.tsx`, `DashboardHome.test.tsx` with token/class assertions where meaningful
- Run `npm run test:coverage` after each milestone; maintain ≥80% gate

**Rationale**: Constitution III; no backend tests needed.

## Summary of resolved unknowns

| Unknown | Resolution |
|---------|------------|
| CSS framework approach | Plain CSS custom properties in `index.css` (D1) |
| Font delivery | Google Fonts Zilla Slab + Inter (D2) |
| Token hex values | Linear brand guide palette (D3) |
| Regression detection | Legacy hex denylist Vitest scan (D4) |
| Shell not on branch | Token-first layering; interim header theming (D5) |
| WCAG verification | Luminance tests in Vitest + manual axe (D6) |
| Component styling pattern | Shared `.btn-*` / `.badge-*` classes (D7) |
| Test strategy | `tests/theme/**` + extended component tests (D8) |
