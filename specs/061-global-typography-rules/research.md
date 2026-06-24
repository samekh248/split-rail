# Phase 0 Research: Global Typography Rules

## R1 — Canonical font token names

**Decision**: Reference `--font-heading` for brand/slab-serif headings and `--font-ui` for operational UI text. Do **not** introduce a parallel `--font-brand` custom property.

**Rationale**: Upstream feature `060-brand-web-fonts` (SPLR-80) and `apps/web/src/theme/tokens.ts` already register `--font-heading` and `--font-ui` as the font token pair. The Linear issue (SPLR-81) used `--font-brand` colloquially; the implementation maps the same semantic role to `--font-heading` so typography rules compose with the existing token registry and any `cssTokens` / `typography` Vitest suites that assert on `--font-heading`.

**Alternatives considered**:
- **Add `--font-brand` as alias in `:root`** — rejected; duplicates the heading token and splits the design-system surface.
- **Hard-code `Zilla Slab` / `Inter` in typography rules** — rejected; violates token-first branding and breaks when font loading strategy changes.

## R2 — Global rule placement and specificity

**Decision**: Add a single **Typography** section near the top of `apps/web/src/index.css` (after `:root` token declarations from upstream features, before component blocks). Use element selectors (`h1`–`h3`, `body`, `p`, `label`, `button`, `input`, `td`, `th`) plus utility classes `.heading-brand` and `.text-on-dark`.

**Rationale**: Global element defaults satisfy FR-001/FR-002 with minimal per-screen work. Placing the block early makes the comment reference (FR-004) easy to find. Element selectors keep specificity low so layout classes (margins, sizes) on components like `.auth-layout__title` continue to work; only conflicting `font-family` / `color` / `font-weight` overrides in legacy rules should be removed or narrowed.

**Alternatives considered**:
- **CSS `@layer` reset** — rejected for v1; the app has no layer convention yet and this adds indirection for a small rule set.
- **Tailwind `@apply` plugin** — rejected; project uses plain CSS in `index.css`, not Tailwind.

## R3 — Heading color and dark-surface utility

**Decision**: Brand headings use `color: var(--color-primary-brown)` and `font-weight: 700`. Dark brown surfaces (e.g. `.app__header`) apply `.text-on-dark` to child text that must read in cream: `color: var(--color-bg-cream)`.

**Rationale**: Matches Montana High Country palette tokens from `059-mhc-design-tokens` (SPLR-79). The existing `.app__header` uses legacy slate (`#1e293b`) and white text; this feature applies typography globals first. Full header **background** recolor to Lodgepole Brown is downstream shell/theming work — typography only ensures the utility exists and header title/subtitle can adopt cream text without ad hoc hex values.

**Alternatives considered**:
- **Auto-invert all text inside `.app__header`** — rejected; risks unintended contrast on nested components and couples typography to layout structure.
- **Set cream on `h1` inside `.app__header` only** — rejected; too narrow; modals and nav will need the same utility.

## R4 — Component override cleanup scope

**Decision**: Remove or stop adding **font-family**, **font-weight**, and **heading color** overrides on semantic elements targeted by globals. Preserve **font-size**, **margin**, and layout rules on classes such as `.auth-layout__title` and `.app__header h1`.

**Rationale**: FR-008 requires no regressions on login, dashboard home, and event ledger. Size and spacing tweaks remain component-local; typeface and heading color come from globals. `AuthLayout` already renders `<h1 className="auth-layout__title">` — the global `h1` rule applies without markup changes.

**Alternatives considered**:
- **Refactor every page to use `.heading-brand` instead of `h1`** — rejected; redundant when semantic headings already match the rule set.
- **Leave all legacy overrides** — rejected; `.auth-layout__title` and similar would fight globals and fail SC-001.

## R5 — Verification strategy

**Decision**: Primary verification is **static CSS contract tests** in `apps/web/tests/theme/typography.test.ts` (read `index.css`, assert selectors and `var(--font-*)` / `var(--color-*)` references). Run full `npm test` in `apps/web` for regression (FR-009). No new Playwright E2E for this slice — typography is not multi-user or tenant-isolated.

**Rationale**: Constitution III requires automated verification; CSS parsing tests are fast, deterministic, and match the pattern used by other theme tests in the repo. Component RTL tests already cover page render smoke; this feature does not add new React logic. Backend coverage is unchanged (no C# edits).

**Alternatives considered**:
- **Computed-style RTL assertions on every page** — rejected; jsdom computed styles are unreliable for `font-family` resolution.
- **Visual regression screenshots** — rejected; out of scope and not established in CI for this repo.

## R6 — Dependency ordering

**Decision**: Implementation **requires** merged `059-mhc-design-tokens` and `060-brand-web-fonts` so `:root` exposes `--font-heading`, `--font-ui`, `--color-primary-brown`, and `--color-bg-cream` before typography rules are added.

**Rationale**: Linear marks SPLR-81 blocked by SPLR-79 and SPLR-80. Typography rules reference tokens only; without them, rules compile but fail token tests and brand acceptance.

**Alternatives considered**:
- **Ship typography with fallback hex/fonts in the same PR** — rejected; duplicates upstream work and violates milestone ordering (M1 foundation).
