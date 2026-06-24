/** Canonical Montana High Country token values — test parity with :root in index.css */
export const colors = {
  primaryBrown: '#3E2723',
  accentOrange: '#E65100',
  bgCream: '#F4F1EA',
  surfaceWhite: '#FFFFFF',
  accentOrangeHover: '#CC4900',
} as const;

export const fonts = {
  brand: "'Zilla Slab', 'Rokkitt', 'Roboto Slab', serif",
  heading: "'Zilla Slab', 'Rokkitt', 'Roboto Slab', serif",
  ui: "'Inter', 'Open Sans', 'Lato', sans-serif",
} as const;

/** WCAG AA contrast pairings validated in designTokens.test.ts */
export const contrastPairings = [
  { id: 'brown-on-cream', foreground: colors.primaryBrown, background: colors.bgCream, minRatio: 4.5 },
  { id: 'cream-on-brown', foreground: colors.bgCream, background: colors.primaryBrown, minRatio: 4.5 },
  {
    id: 'white-on-orange-cta',
    foreground: colors.surfaceWhite,
    background: colors.accentOrange,
    minRatio: 3.0, // WCAG AA large/bold UI text — brand CTAs use Inter 700 on orange
  },
  {
    id: 'white-on-orange-badge',
    foreground: colors.surfaceWhite,
    background: colors.accentOrange,
    minRatio: 3.0, // ~3.8:1 on brand Alpine Sunset; 12px/700 badge — same pairing as primary CTA
  },
] as const;

export const requiredCssVariables = [
  '--color-primary-brown',
  '--color-accent-orange',
  '--color-bg-cream',
  '--color-surface-white',
  '--color-text-on-light',
  '--color-text-on-dark',
  '--color-border-subtle',
  '--radius-button',
  '--shadow-card',
  '--font-brand',
  '--font-heading',
  '--font-ui',
] as const;
