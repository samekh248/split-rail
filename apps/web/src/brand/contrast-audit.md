# Montana High Country — WCAG AA Contrast Audit

## Summary

- **Feature**: SPLR-94 — WCAG AA contrast audit and token adjustments
- **Pairings evaluated**: 16
- **Pairings passing**: 16
- **Target**: WCAG 2.x Level AA

## Methodology

Contrast ratios use WCAG 2.1 relative luminance on opaque sRGB hex colors.
Opacity-derived tokens (`--color-text-muted`, `--color-border-subtle`) are
alpha-composited onto their adjacent background before measurement.

## Pairing results

| id | foreground | background | ratio | threshold | category | status | notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| brown-on-cream | #3E2723 | #F4F1EA | 12.25 | 4.5 | normal-text | pass |  |
| brown-on-white | #3E2723 | #FFFFFF | 13.82 | 4.5 | normal-text | pass |  |
| muted-on-cream | #71605B | #F4F1EA | 5.28 | 4.5 | normal-text | pass | composited rgba foreground |
| muted-on-white | #746361 | #FFFFFF | 5.68 | 4.5 | normal-text | pass | composited rgba foreground |
| border-subtle-on-cream | #958883 | #F4F1EA | 3.04 | 3 | ui-component | pass | composited rgba foreground |
| border-subtle-on-white | #9B8F8D | #FFFFFF | 3.13 | 3 | ui-component | pass | composited rgba foreground |
| text-on-accent-on-orange | #FFFFFF | #E65100 | 3.79 | 3 | large-text | pass |  |
| text-on-accent-on-orange-hover | #FFFFFF | #CC4900 | 4.65 | 3 | large-text | pass |  |
| text-on-accent-on-orange-badge | #FFFFFF | #E65100 | 3.79 | 3 | large-text | pass |  |
| text-on-accent-disabled-on-orange-disabled | #FFFFFF | #D97B4A | 3.05 | 3 | large-text | pass |  |
| cream-on-brown | #F4F1EA | #3E2723 | 12.25 | 4.5 | normal-text | pass |  |
| cream-focus-ring-on-brown | #F4F1EA | #3E2723 | 12.25 | 3 | ui-component | pass |  |
| error-on-error-bg | #B91C1C | #FEF2F2 | 5.91 | 4.5 | normal-text | pass |  |
| success-on-success-bg | #15803D | #F0FDF4 | 4.79 | 4.5 | normal-text | pass |  |
| warning-text-on-warning-bg | #3E2723 | #FFF3E0 | 12.60 | 4.5 | normal-text | pass |  |
| focus-ring-on-white | #E65100 | #FFFFFF | 3.79 | 3 | ui-component | pass |  |

## Token changes

| token | before | after | reason |
| --- | --- | --- | --- |
| --color-border-subtle | rgba(62, 39, 35, 0.15) | rgba(62, 39, 35, 0.52) | UI boundary contrast below 3:1 on cream and white surfaces |
| --color-text-on-accent | (not defined — used --color-surface-white directly) | var(--color-surface-white) | Formalize semantic role for orange-surface labels |
| --color-accent-orange-disabled | (not defined — disabled CTAs used opacity: 0.6) | #D97B4A | Disabled CTA labels must meet 3:1 large-text AA |
| --color-text-on-accent-disabled | (not defined) | var(--color-surface-white) | Paired disabled label token for primary CTAs |
