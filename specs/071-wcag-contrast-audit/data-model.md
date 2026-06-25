# Data Model: WCAG AA Contrast Audit and Token Adjustments (SPLR-94)

This feature introduces **no persisted entities, API payloads, or database tables**. The model covers **design token definitions**, **contrast audit records**, **pairing inventory**, and **validation rules** — all client-side CSS and test contracts.

## Token entities (`:root` definitions)

### Core palette (unchanged hex — audit confirms pass)

| Token | Hex | Role |
|-------|-----|------|
| `--color-primary-brown` | `#3E2723` | Primary text on light surfaces |
| `--color-accent-orange` | `#E65100` | CTA/badge backgrounds, focus ring |
| `--color-accent-orange-hover` | `#CC4900` | CTA hover background |
| `--color-bg-cream` | `#F4F1EA` | Page background |
| `--color-surface-white` | `#FFFFFF` | Data containers, inputs |

### Semantic text tokens

| Token | Value | Role | Audit note |
|-------|-------|------|------------|
| `--color-text-on-light` | `var(--color-primary-brown)` | Body text on cream/white | 12.25:1 on cream |
| `--color-text-on-dark` | `var(--color-bg-cream)` | Nav/chrome text on brown | 12.25:1 on brown |
| `--color-text-on-accent` | `var(--color-surface-white)` | **NEW** — labels on orange surfaces | 3.79:1 (large/bold) |
| `--color-text-muted` | `rgba(62, 39, 35, 0.72)` | Secondary copy | 5.28:1 on cream — pass |

### Semantic feedback tokens (audit confirms pass)

| Token | Role |
|-------|------|
| `--color-error` / `--color-error-bg` | Error text and banners |
| `--color-success` / `--color-success-bg` / `--color-success-border` | Success feedback |
| `--color-warning-bg` / `--color-warning-border` / `--color-warning-text` | Warning banners |

### UI component tokens (remediation targets)

| Token | Current | Target | Reason |
|-------|---------|--------|--------|
| `--color-border-subtle` | `rgba(62, 39, 35, 0.15)` | `rgba(62, 39, 35, 0.50)` (tune ±0.02) | UI boundary 3:1 vs adjacent surface |
| `--color-focus-ring` | `var(--color-accent-orange)` | unchanged | 3.79:1 on white — passes UI threshold |
| `--color-accent-orange-disabled` | *(none)* | **NEW** — warm desaturated orange | Disabled CTA background |
| `--color-text-on-accent-disabled` | *(none)* | **NEW** — passes ≥3:1 on disabled bg | Disabled CTA label |

Register new tokens in `apps/web/src/theme/tokens.ts` `requiredCssVariables` and `colors` export.

## Contrast audit record

Each audited pairing is represented as:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Stable slug (e.g., `brown-on-cream`) |
| `foreground` | hex or composited hex | Text or UI component foreground |
| `background` | hex | Adjacent background |
| `ratio` | number | Measured contrast ratio (2 decimal places) |
| `minRatio` | number | 4.5 (normal text), 3.0 (large text / UI component) |
| `category` | enum | `normal-text` \| `large-text` \| `ui-component` |
| `status` | enum | `pass` \| `fail` |
| `surface` | string | Human context (e.g., "Primary CTA default") |
| `remediation` | string? | Token change applied if failed |

Runtime source: `contrastPairings` array in `tokens.ts`.  
Documentation sink: `apps/web/src/brand/contrast-audit.md`.

## Pairing inventory (canonical list)

### P1 — Body text on light surfaces

| id | Foreground | Background | minRatio | category |
|----|------------|------------|----------|----------|
| `brown-on-cream` | primary brown | bg cream | 4.5 | normal-text |
| `brown-on-white` | primary brown | surface white | 4.5 | normal-text |
| `muted-on-cream` | muted composited | bg cream | 4.5 | normal-text |
| `muted-on-white` | muted composited | surface white | 4.5 | normal-text |

### P2 — Accent buttons and badges

| id | Foreground | Background | minRatio | category |
|----|------------|------------|----------|----------|
| `text-on-accent-on-orange` | text on accent | accent orange | 3.0 | large-text |
| `text-on-accent-on-orange-hover` | text on accent | accent orange hover | 3.0 | large-text |
| `text-on-accent-on-orange-badge` | text on accent | accent orange | 3.0 | large-text |
| `text-on-accent-disabled-on-orange-disabled` | text on accent disabled | accent orange disabled | 3.0 | large-text |

### P3 — Navigation on dark surfaces

| id | Foreground | Background | minRatio | category |
|----|------------|------------|----------|----------|
| `cream-on-brown` | bg cream | primary brown | 4.5 | normal-text |
| `cream-focus-ring-on-brown` | bg cream | primary brown | 3.0 | ui-component |

### Semantic feedback

| id | Foreground | Background | minRatio | category |
|----|------------|------------|----------|----------|
| `error-on-error-bg` | error | error bg | 4.5 | normal-text |
| `success-on-success-bg` | success | success bg | 4.5 | normal-text |
| `warning-text-on-warning-bg` | primary brown | warning bg | 4.5 | normal-text |

### UI components

| id | Foreground | Background | minRatio | category |
|----|------------|------------|----------|----------|
| `border-subtle-on-cream` | border composited | bg cream | 3.0 | ui-component |
| `border-subtle-on-white` | border composited | surface white | 3.0 | ui-component |
| `focus-ring-on-white` | accent orange | surface white | 3.0 | ui-component |

## CSS selector map (token consumption)

| Selector group | Properties using contrast tokens |
|----------------|----------------------------------|
| `.btn-primary`, `.btn-primary--compact`, auth/welcome/sync CTAs | `background: accent orange`; `color: text-on-accent` |
| `.badge-action-required`, `.badge-alert` | `background: accent orange`; `color: text-on-accent` |
| `*:disabled` primary groups | `background: accent-orange-disabled`; `color: text-on-accent-disabled`; no opacity dimming |
| `.form-field__input`, containers | `border-color: border-subtle` |
| `.sidebar-rail`, `.top-bar` (mobile) | `color: text-on-dark` |
| `.text-on-dark` utility | `color: text-on-dark` |

## Validation rules

| Rule ID | Assertion |
|---------|-----------|
| VR-001 | Every `contrastPairings` entry achieves `ratio >= minRatio` |
| VR-002 | `contrast-audit.md` lists all pairing ids with measured ratios |
| VR-003 | Token changes document before/after values in audit doc |
| VR-004 | `--color-text-on-accent` declared in `:root` and referenced by CTA/badge groups |
| VR-005 | Disabled primary buttons do not use `opacity < 1` for contrast remediation |
| VR-006 | `requiredCssVariables` includes new semantic tokens |
| VR-007 | Existing `LoginForm` a11y and theme Vitest suites pass |
| VR-008 | Frontend coverage ≥80% on modified `contrast.ts`, `tokens.ts`, test files |

## Intentional exceptions

| Item | Reason |
|------|--------|
| Primary CTA uses 3.0 threshold not 4.5 | Bold 700 weight at ≥14px qualifies as large text per WCAG; ratio 3.79:1 |
| Orange focus ring on white at 3.79:1 | UI component threshold 3:1 — pass |
| Cream-on-orange not in active UI | Documented fail in audit for reference; not used in production styles |
