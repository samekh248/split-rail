/** Canonical Montana High Country token values — test parity with :root in index.css */
export const colors = {
  primaryBrown: '#3E2723',
  accentOrange: '#C45100',
  bgCream: '#F4F1EA',
  surfaceWhite: '#FFFFFF',
  accentOrangeHover: '#A04300',
} as const;

export const fonts = {
  heading: "'Zilla Slab', serif",
  ui: "'Inter', system-ui, sans-serif",
} as const;

/** WCAG AA contrast pairings validated in designTokens.test.ts */
export const contrastPairings = [
  { id: 'brown-on-cream', foreground: colors.primaryBrown, background: colors.bgCream, minRatio: 4.5 },
  { id: 'cream-on-brown', foreground: colors.bgCream, background: colors.primaryBrown, minRatio: 4.5 },
  {
    id: 'white-on-orange',
    foreground: colors.surfaceWhite,
    background: colors.accentOrange,
    minRatio: 4.5,
  },
] as const;

export const requiredCssVariables = [
  '--color-primary-brown',
  '--color-accent-orange',
  '--color-bg-cream',
  '--color-surface-white',
  '--font-heading',
  '--font-ui',
] as const;
