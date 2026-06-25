import type { RgbaColor } from '@/theme/contrast';

/** Canonical Montana High Country token values — test parity with :root in index.css */
export const colors = {
  primaryBrown: '#3E2723',
  accentOrange: '#E65100',
  accentOrangeHover: '#CC4900',
  accentOrangeDisabled: '#D97B4A',
  bgCream: '#F4F1EA',
  surfaceWhite: '#FFFFFF',
  textOnAccent: '#FFFFFF',
  textOnAccentDisabled: '#FFFFFF',
  textMutedRgba: { r: 62, g: 39, b: 35, a: 0.72 } satisfies RgbaColor,
  borderSubtleRgba: { r: 62, g: 39, b: 35, a: 0.52 } satisfies RgbaColor,
  error: '#B91C1C',
  errorBg: '#FEF2F2',
  success: '#15803D',
  successBg: '#F0FDF4',
  warningBg: '#FFF3E0',
} as const;

export const fonts = {
  brand: "'Zilla Slab', 'Rokkitt', 'Roboto Slab', serif",
  heading: "'Zilla Slab', 'Rokkitt', 'Roboto Slab', serif",
  ui: "'Inter', 'Open Sans', 'Lato', sans-serif",
} as const;

export type ContrastCategory = 'normal-text' | 'large-text' | 'ui-component';

export type ContrastPairing = {
  id: string;
  foreground: string;
  background: string;
  minRatio: number;
  category: ContrastCategory;
  foregroundRgba?: RgbaColor;
};

/** WCAG AA contrast pairings validated in designTokens.test.ts */
export const contrastPairings: readonly ContrastPairing[] = [
  {
    id: 'brown-on-cream',
    foreground: colors.primaryBrown,
    background: colors.bgCream,
    minRatio: 4.5,
    category: 'normal-text',
  },
  {
    id: 'brown-on-white',
    foreground: colors.primaryBrown,
    background: colors.surfaceWhite,
    minRatio: 4.5,
    category: 'normal-text',
  },
  {
    id: 'muted-on-cream',
    foreground: colors.primaryBrown,
    background: colors.bgCream,
    minRatio: 4.5,
    category: 'normal-text',
    foregroundRgba: colors.textMutedRgba,
  },
  {
    id: 'muted-on-white',
    foreground: colors.primaryBrown,
    background: colors.surfaceWhite,
    minRatio: 4.5,
    category: 'normal-text',
    foregroundRgba: colors.textMutedRgba,
  },
  {
    id: 'border-subtle-on-cream',
    foreground: colors.primaryBrown,
    background: colors.bgCream,
    minRatio: 3.0,
    category: 'ui-component',
    foregroundRgba: colors.borderSubtleRgba,
  },
  {
    id: 'border-subtle-on-white',
    foreground: colors.primaryBrown,
    background: colors.surfaceWhite,
    minRatio: 3.0,
    category: 'ui-component',
    foregroundRgba: colors.borderSubtleRgba,
  },
  {
    id: 'text-on-accent-on-orange',
    foreground: colors.textOnAccent,
    background: colors.accentOrange,
    minRatio: 3.0,
    category: 'large-text',
  },
  {
    id: 'text-on-accent-on-orange-hover',
    foreground: colors.textOnAccent,
    background: colors.accentOrangeHover,
    minRatio: 3.0,
    category: 'large-text',
  },
  {
    id: 'text-on-accent-on-orange-badge',
    foreground: colors.textOnAccent,
    background: colors.accentOrange,
    minRatio: 3.0,
    category: 'large-text',
  },
  {
    id: 'text-on-accent-disabled-on-orange-disabled',
    foreground: colors.textOnAccentDisabled,
    background: colors.accentOrangeDisabled,
    minRatio: 3.0,
    category: 'large-text',
  },
  {
    id: 'cream-on-brown',
    foreground: colors.bgCream,
    background: colors.primaryBrown,
    minRatio: 4.5,
    category: 'normal-text',
  },
  {
    id: 'cream-focus-ring-on-brown',
    foreground: colors.bgCream,
    background: colors.primaryBrown,
    minRatio: 3.0,
    category: 'ui-component',
  },
  {
    id: 'error-on-error-bg',
    foreground: colors.error,
    background: colors.errorBg,
    minRatio: 4.5,
    category: 'normal-text',
  },
  {
    id: 'success-on-success-bg',
    foreground: colors.success,
    background: colors.successBg,
    minRatio: 4.5,
    category: 'normal-text',
  },
  {
    id: 'warning-text-on-warning-bg',
    foreground: colors.primaryBrown,
    background: colors.warningBg,
    minRatio: 4.5,
    category: 'normal-text',
  },
  {
    id: 'focus-ring-on-white',
    foreground: colors.accentOrange,
    background: colors.surfaceWhite,
    minRatio: 3.0,
    category: 'ui-component',
  },
] as const;

export const tokenChanges = [
  {
    token: '--color-border-subtle',
    before: 'rgba(62, 39, 35, 0.15)',
    after: 'rgba(62, 39, 35, 0.52)',
    reason: 'UI boundary contrast below 3:1 on cream and white surfaces',
  },
  {
    token: '--color-text-on-accent',
    before: '(not defined — used --color-surface-white directly)',
    after: 'var(--color-surface-white)',
    reason: 'Formalize semantic role for orange-surface labels',
  },
  {
    token: '--color-accent-orange-disabled',
    before: '(not defined — disabled CTAs used opacity: 0.6)',
    after: '#D97B4A',
    reason: 'Disabled CTA labels must meet 3:1 large-text AA',
  },
  {
    token: '--color-text-on-accent-disabled',
    before: '(not defined)',
    after: 'var(--color-surface-white)',
    reason: 'Paired disabled label token for primary CTAs',
  },
] as const;

export const requiredCssVariables = [
  '--color-primary-brown',
  '--color-accent-orange',
  '--color-accent-orange-hover',
  '--color-accent-orange-disabled',
  '--color-bg-cream',
  '--color-surface-white',
  '--color-text-on-light',
  '--color-text-on-dark',
  '--color-text-on-accent',
  '--color-text-on-accent-disabled',
  '--color-success',
  '--color-success-bg',
  '--color-success-border',
  '--color-border-subtle',
  '--radius-button',
  '--shadow-card',
  '--font-brand',
  '--font-heading',
  '--font-ui',
] as const;
