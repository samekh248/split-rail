import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { requiredCssVariables } from '@/theme/tokens';

const indexCssPath = resolve(__dirname, '../../src/index.css');

function readIndexCss(): string {
  return readFileSync(indexCssPath, 'utf-8');
}

function extractRootBlock(css: string): string {
  const match = css.match(/:root\s*\{([\s\S]*?)\n\}/);
  expect(match, ':root block').toBeTruthy();
  return match![1];
}

function extractBodyBlock(css: string): string {
  const match = css.match(/body\s*\{([\s\S]*?)\n\}/);
  expect(match, 'body block').toBeTruthy();
  return match![1];
}

describe('cssTokens', () => {
  it('defines required :root CSS custom properties in index.css', () => {
    const css = readIndexCss();
    for (const variable of requiredCssVariables) {
      expect(css).toContain(`${variable}:`);
    }
  });

  it('uses Montana High Country hex values for core color tokens', () => {
    const css = readIndexCss();
    expect(css).toMatch(/--color-primary-brown:\s*#3e2723/i);
    expect(css).toMatch(/--color-accent-orange:\s*#e65100/i);
    expect(css).toMatch(/--color-bg-cream:\s*#f4f1ea/i);
    expect(css).toMatch(/--color-surface-white:\s*#ffffff/i);
  });

  it('wires :root background and color to token variables', () => {
    const root = extractRootBlock(readIndexCss());
    expect(root).toMatch(/background:\s*var\(--color-bg-cream\)/);
    expect(root).toMatch(/color:\s*var\(--color-primary-brown\)/);
    expect(root).not.toMatch(/background:\s*#[0-9a-f]{3,8}/i);
    expect(root).not.toMatch(/color:\s*#[0-9a-f]{3,8}/i);
  });

  it('wires body background and color to token variables', () => {
    const body = extractBodyBlock(readIndexCss());
    expect(body).toMatch(/background:\s*var\(--color-bg-cream\)/);
    expect(body).toMatch(/color:\s*var\(--color-primary-brown\)/);
    expect(body).not.toMatch(/background:\s*#[0-9a-f]{3,8}/i);
    expect(body).not.toMatch(/color:\s*#[0-9a-f]{3,8}/i);
  });

  it('defines M1 semantic derived tokens', () => {
    const css = readIndexCss();
    expect(css).toMatch(/--color-text-on-light:\s*var\(--color-primary-brown\)/);
    expect(css).toMatch(/--color-text-on-dark:\s*var\(--color-bg-cream\)/);
    expect(css).toMatch(/--color-text-on-accent:\s*var\(--color-surface-white\)/);
    expect(css).toMatch(/--color-border-subtle:\s*rgba\(62,\s*39,\s*35,\s*0\.52\)/);
    expect(css).toMatch(/--radius-button:\s*6px/);
    expect(css).toMatch(/--shadow-card:\s*0 2px 5px rgba\(0,\s*0,\s*0,\s*0\.05\)/);
  });

  it('defines SPLR-94 accessibility contrast tokens in :root', () => {
    const root = extractRootBlock(readIndexCss());
    expect(root).toMatch(/--color-accent-orange-disabled:\s*#d97b4a/i);
    expect(root).toMatch(/--color-text-on-accent-disabled:\s*var\(--color-surface-white\)/);
  });

  it('defines success semantic tokens in :root (SPLR-91)', () => {
    const root = extractRootBlock(readIndexCss());
    expect(root).toMatch(/--color-success:\s*#15803d/i);
    expect(root).toMatch(/--color-success-bg:\s*#f0fdf4/i);
    expect(root).toMatch(/--color-success-border:\s*#86efac/i);
  });
});
