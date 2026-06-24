import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const indexCssPath = resolve(__dirname, '../../src/index.css');

function sharedButtonBlock(css: string): string {
  const start = css.indexOf('/* Shared buttons */');
  const end = css.indexOf('/* Brand logo */');
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return css.slice(start, end);
}

describe('button theme classes', () => {
  it('defines .btn-primary with accent orange background token', () => {
    const css = readFileSync(indexCssPath, 'utf-8');
    const block = sharedButtonBlock(css);
    expect(block).toMatch(/\.btn-primary[\s\S]*background:\s*var\(--color-accent-orange\)/);
    expect(block).toMatch(/\.btn-primary[\s\S]*color:\s*var\(--color-surface-white\)/);
  });

  it('defines .btn-primary interaction states with design tokens', () => {
    const css = readFileSync(indexCssPath, 'utf-8');
    const block = sharedButtonBlock(css);
    expect(block).toMatch(
      /\.btn-primary:hover:not\(:disabled\)[\s\S]*background:\s*var\(--color-accent-orange-hover\)/,
    );
    expect(block).toMatch(/\.btn-primary:disabled[\s\S]*opacity:\s*0\.6/);
    expect(block).toMatch(
      /\.btn-primary:focus-visible[\s\S]*outline:\s*2px solid var\(--color-focus-ring\)/,
    );
  });

  it('defines .btn-primary--compact with accent orange tokens', () => {
    const css = readFileSync(indexCssPath, 'utf-8');
    const block = sharedButtonBlock(css);
    expect(block).toMatch(
      /\.btn-primary--compact[\s\S]*background:\s*var\(--color-accent-orange\)/,
    );
    expect(block).toMatch(/\.btn-primary--compact[\s\S]*color:\s*var\(--color-surface-white\)/);
    expect(block).toMatch(/\.btn-primary--compact[\s\S]*font-size:\s*0\.875rem/);
  });

  it('defines .btn-secondary for light surfaces with brown label and token border', () => {
    const css = readFileSync(indexCssPath, 'utf-8');
    const block = sharedButtonBlock(css);
    expect(block).toMatch(/\.btn-secondary[\s\S]*background:\s*transparent/);
    expect(block).toMatch(/\.btn-secondary[\s\S]*color:\s*var\(--color-primary-brown\)/);
    expect(block).toMatch(/\.btn-secondary[\s\S]*border:\s*1px solid var\(--color-border-subtle\)/);
  });

  it('defines .btn-secondary--on-dark with cream label for dark chrome', () => {
    const css = readFileSync(indexCssPath, 'utf-8');
    const block = sharedButtonBlock(css);
    expect(block).toMatch(/\.btn-secondary--on-dark[\s\S]*color:\s*var\(--color-bg-cream\)/);
    expect(block).toMatch(/\.btn-secondary--on-dark[\s\S]*background:\s*transparent/);
  });

  it('defines secondary interaction states with design tokens', () => {
    const css = readFileSync(indexCssPath, 'utf-8');
    const block = sharedButtonBlock(css);
    expect(block).toMatch(
      /\.btn-secondary:hover:not\(:disabled\)[\s\S]*background:\s*var\(--color-bg-cream\)/,
    );
    expect(block).toMatch(/\.btn-secondary:disabled[\s\S]*opacity:\s*0\.6/);
    expect(block).toMatch(
      /\.btn-secondary:focus-visible[\s\S]*outline:\s*2px solid var\(--color-focus-ring\)/,
    );
    expect(block).toMatch(
      /\.btn-secondary--on-dark:hover:not\(:disabled\)[\s\S]*background:\s*var\(--color-nav-hover-overlay\)/,
    );
    expect(block).toMatch(
      /\.btn-secondary--on-dark:focus-visible[\s\S]*outline:\s*2px solid var\(--color-bg-cream\)/,
    );
  });
});
