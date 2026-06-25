import { describe, expect, it } from 'vitest';
import {
  compareRootTokenValue,
  extractRootBlock,
  normalizeHex,
  normalizeRgba,
  parseRootCustomProperties,
} from '@/theme/parseCssRoot';

const SAMPLE_CSS = `
:root {
  --color-primary-brown: #3e2723;
  --color-accent-orange: #E65100;
  --color-text-muted: rgba(62, 39, 35, 0.72);
  --color-text-on-light: var(--color-primary-brown);
  font-family: sans-serif;
}
body { margin: 0; }
`;

describe('parseCssRoot', () => {
  it('extracts :root block content', () => {
    const root = extractRootBlock(SAMPLE_CSS);
    expect(root).toContain('--color-primary-brown: #3e2723');
  });

  it('throws when :root is missing', () => {
    expect(() => extractRootBlock('body { color: red; }')).toThrow(':root block not found');
  });

  it('parses custom properties into a map', () => {
    const props = parseRootCustomProperties(SAMPLE_CSS);
    expect(props.get('--color-primary-brown')).toBe('#3e2723');
    expect(props.get('--color-accent-orange')).toBe('#E65100');
    expect(props.get('--color-text-muted')).toBe('rgba(62, 39, 35, 0.72)');
    expect(props.get('--color-text-on-light')).toBe('var(--color-primary-brown)');
  });

  it('normalizes hex case and short form', () => {
    expect(normalizeHex('#3E2723')).toBe('#3e2723');
    expect(normalizeHex('#fff')).toBe('#ffffff');
  });

  it('rejects invalid hex', () => {
    expect(() => normalizeHex('not-a-hex')).toThrow('invalid hex value');
  });

  it('normalizes rgba whitespace', () => {
    expect(normalizeRgba('rgba(62,39,35,0.72)')).toBe('rgba(62, 39, 35, 0.72)');
    expect(normalizeRgba('RGBA(62, 39, 35, 0.52)')).toBe('rgba(62, 39, 35, 0.52)');
  });

  it('compares token values by mode', () => {
    expect(compareRootTokenValue('#3e2723', '#3E2723', 'hex')).toBe(true);
    expect(compareRootTokenValue('#3e2724', '#3E2723', 'hex')).toBe(false);
    expect(
      compareRootTokenValue('rgba(62, 39, 35, 0.72)', 'rgba(62,39,35,0.72)', 'rgba'),
    ).toBe(true);
    expect(
      compareRootTokenValue('var(--color-primary-brown)', 'var(--color-primary-brown)', 'exact'),
    ).toBe(true);
  });
});
