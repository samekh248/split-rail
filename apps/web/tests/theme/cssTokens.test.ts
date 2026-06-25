import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { extractRootBlock } from '@/theme/parseCssRoot';
import { requiredCssVariables } from '@/theme/tokens';

const indexCssPath = resolve(__dirname, '../../src/index.css');

function readIndexCss(): string {
  return readFileSync(indexCssPath, 'utf-8');
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

  it('defines layout and shadow tokens in :root', () => {
    const css = readIndexCss();
    expect(css).toMatch(/--radius-button:\s*6px/);
    expect(css).toMatch(/--shadow-card:\s*0 2px 5px rgba\(0,\s*0,\s*0,\s*0\.05\)/);
  });

  it('defines success semantic tokens in :root (SPLR-91)', () => {
    const root = extractRootBlock(readIndexCss());
    expect(root).toMatch(/--color-success:\s*#15803d/i);
    expect(root).toMatch(/--color-success-bg:\s*#f0fdf4/i);
    expect(root).toMatch(/--color-success-border:\s*#86efac/i);
  });
});
