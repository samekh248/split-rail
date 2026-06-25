# Data Model: Automated Design Token and Color Regression Tests (SPLR-95)

This feature introduces **no persisted entities, API payloads, or database tables**. The model covers **canonical token definitions**, **CSS runtime values**, **parity mappings**, **legacy denylist entries**, and **validation rules** — all client-side CSS, TypeScript modules, and Vitest contracts.

## Canonical token (`tokens.ts` `colors`)

Primary brand palette literals — the Expected Value Record for primitive `:root` properties:

| Field key | CSS variable | Expected literal | Role |
|-----------|--------------|------------------|------|
| `primaryBrown` | `--color-primary-brown` | `#3E2723` | Primary text on light surfaces |
| `accentOrange` | `--color-accent-orange` | `#E65100` | CTA/badge backgrounds |
| `accentOrangeHover` | `--color-accent-orange-hover` | `#CC4900` | CTA hover |
| `accentOrangeDisabled` | `--color-accent-orange-disabled` | `#D97B4A` | Disabled CTA background |
| `bgCream` | `--color-bg-cream` | `#F4F1EA` | Page background |
| `surfaceWhite` | `--color-surface-white` | `#FFFFFF` | Data containers |
| `textOnAccent` | `--color-text-on-accent` | `var(--color-surface-white)` | Alias — validated separately |
| `textOnAccentDisabled` | `--color-text-on-accent-disabled` | `var(--color-surface-white)` | Alias — validated separately |
| `error` | `--color-error` | `#B91C1C` | Error text |
| `errorBg` | `--color-error-bg` | `#FEF2F2` | Error banner background |
| `success` | `--color-success` | `#15803D` | Success text |
| `successBg` | `--color-success-bg` | `#F0FDF4` | Success banner background |
| `warningBg` | `--color-warning-bg` | `#FFF3E0` | Warning banner background |

Rgba primitives (`textMutedRgba`, `borderSubtleRgba`) map to `--color-text-muted` and `--color-border-subtle` with normalized `rgba(r, g, b, a)` string comparison.

## Root token parity entry

Runtime comparison unit between expected record and parsed CSS:

| Field | Type | Description |
|-------|------|-------------|
| `cssVariable` | string | e.g. `--color-primary-brown` |
| `expected` | string | Hex (`#RRGGBB`) or normalized `rgba(...)` |
| `compareMode` | enum | `hex` \| `rgba` \| `exact` (for `var(...)` alias strings) |

Source: new `rootTokenParity` export in `tokens.ts` (derived from `colors` to avoid drift).

## Parsed CSS root property

Output of `parseRootCustomProperties(indexCss)`:

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Custom property name including `--` prefix |
| `value` | string | Trimmed declaration value |

## Required CSS variable registry

Existing `requiredCssVariables` in `tokens.ts` — names that MUST appear in `:root`:

| Variable | Category |
|----------|----------|
| `--color-primary-brown` | core palette |
| `--color-accent-orange` | core palette |
| `--color-accent-orange-hover` | core palette |
| `--color-accent-orange-disabled` | accessibility (SPLR-94) |
| `--color-bg-cream` | core palette |
| `--color-surface-white` | core palette |
| `--color-text-on-light` | semantic alias |
| `--color-text-on-dark` | semantic alias |
| `--color-text-on-accent` | semantic alias |
| `--color-text-on-accent-disabled` | semantic alias |
| `--color-success` | semantic feedback |
| `--color-success-bg` | semantic feedback |
| `--color-success-border` | semantic feedback |
| `--color-border-subtle` | UI component |
| `--radius-button` | layout |
| `--shadow-card` | layout |
| `--font-brand` | typography |
| `--font-heading` | typography |
| `--font-ui` | typography |

Validation rule **VR-001**: every entry present in parsed `:root` map.

## Banned legacy color (`legacyPalette.ts`)

| Hex | Notes |
|-----|-------|
| `#1e293b` | Slate-800 — **FR-004 minimum** |
| `#2563eb` | Blue-600 — **FR-004 minimum** |
| `#64748b` … `#0f172a` | Additional migration-era slate/blue tones |

Validation rule **VR-002**: lowercased full `index.css` MUST NOT contain any denylist hex unless listed in `LEGACY_HEX_EXCEPTIONS` (empty by default).

## Legacy hex exception (optional)

| Field | Type | Description |
|-------|------|-------------|
| `hex` | string | Lowercase hex allowed once |
| `reason` | string | Documented justification |
| `context` | string? | Selector or comment anchor for audit |

Default: **zero exceptions**. Add only with design-system approval.

## Regression failure record (test output)

| Field | Description |
|-------|-------------|
| `rule` | `parity` \| `missing-variable` \| `legacy-hex` |
| `token` | CSS variable name or denylist hex |
| `expected` | Expected value (parity failures) |
| `actual` | Parsed CSS value (parity failures) |

Tests MUST populate Vitest `expect` messages with `token` (FR-008).

## Validation rules summary

| ID | Rule | Enforcement |
|----|------|-------------|
| VR-001 | All `requiredCssVariables` defined in `:root` | `designTokens.test.ts` |
| VR-002 | No `LEGACY_HEX_DENYLIST` hex in `index.css` (minus exceptions) | `designTokens.test.ts` |
| VR-003 | Every `rootTokenParity` primitive matches parsed `:root` value | `designTokens.test.ts` |
| VR-004 | Hex comparison case-insensitive | `parseCssRoot` normalizer |
| VR-005 | Rgba comparison normalizes whitespace | `parseCssRoot` normalizer |
| VR-006 | Brand suite runs without jsdom | Vitest config / no RTL in brand tests |
| VR-007 | New/modified source ≥80% line/branch coverage | `npm run test:coverage` |

## State transitions

N/A — static assets only. "State change" is an intentional maintainer edit to `tokens.ts` + `index.css` followed by passing `test:brand`.
