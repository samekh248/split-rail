import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const indexCssPath = resolve(__dirname, '../../src/index.css');

describe('badge-action-required', () => {
  it('defines pill-shaped orange badge with white bold text', () => {
    const css = readFileSync(indexCssPath, 'utf-8');
    expect(css).toMatch(/\.badge-action-required[\s\S]*background:\s*var\(--color-accent-orange\)/);
    expect(css).toMatch(/\.badge-action-required[\s\S]*color:\s*var\(--color-surface-white\)/);
    expect(css).toMatch(/\.badge-action-required[\s\S]*border-radius:\s*9999px/);
    expect(css).toMatch(/\.badge-action-required[\s\S]*font-weight:\s*700/);
    expect(css).toMatch(/\.badge-action-required[\s\S]*font-size:\s*0\.75rem/);
  });

  it('groups .badge-alert with .badge-action-required using identical rules', () => {
    const css = readFileSync(indexCssPath, 'utf-8');
    expect(css).toMatch(/\.badge-action-required,\s*\n\.badge-alert\s*\{/);
    expect(css).toMatch(/\.badge-alert[\s\S]*background:\s*var\(--color-accent-orange\)/);
  });

  it('uses warning tokens for event-card variance badge without legacy hex', () => {
    const css = readFileSync(indexCssPath, 'utf-8');
    const varianceBlock = css.match(/\.event-card__variance-badge\s*\{[^}]+\}/)?.[0] ?? '';
    expect(varianceBlock).toContain('var(--color-warning-bg)');
    expect(varianceBlock).not.toMatch(/#fee2e2/i);
    expect(varianceBlock).not.toMatch(/#991b1b/i);
  });

  it('uses shared badge utility for event-card alert chips without legacy amber hex', () => {
    const css = readFileSync(indexCssPath, 'utf-8');
    const alertBlock = css.match(/\.event-card__alert-chip\s*\{[^}]+\}/)?.[0] ?? '';
    expect(alertBlock).not.toMatch(/#fef3c7/i);
    expect(alertBlock).not.toMatch(/#92400e/i);
  });
});
