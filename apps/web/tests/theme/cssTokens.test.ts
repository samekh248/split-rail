import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { requiredCssVariables } from '@/theme/tokens';

const indexCssPath = resolve(__dirname, '../../src/index.css');

describe('cssTokens', () => {
  it('defines required :root CSS custom properties in index.css', () => {
    const css = readFileSync(indexCssPath, 'utf-8');
    for (const variable of requiredCssVariables) {
      expect(css).toContain(`${variable}:`);
    }
  });

  it('uses Montana High Country hex values for core color tokens', () => {
    const css = readFileSync(indexCssPath, 'utf-8');
    expect(css).toMatch(/--color-primary-brown:\s*#3e2723/i);
    expect(css).toMatch(/--color-accent-orange:\s*#c45100/i);
    expect(css).toMatch(/--color-bg-cream:\s*#f4f1ea/i);
    expect(css).toMatch(/--color-surface-white:\s*#ffffff/i);
  });
});
