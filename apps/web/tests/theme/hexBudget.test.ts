import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const indexCssPath = resolve(__dirname, '../../src/index.css');
const HEX_PATTERN = /#[0-9a-fA-F]{3,8}\b/g;
const MAX_INTENTIONAL_HEX = 5;

function readIndexCss(): string {
  return readFileSync(indexCssPath, 'utf-8');
}

function cssOutsideRoot(css: string): string {
  return css.replace(/:root\s*\{[\s\S]*?\n\}/, '');
}

function hexMatchesOutsideRoot(css: string): string[] {
  return cssOutsideRoot(css).match(HEX_PATTERN) ?? [];
}

describe('hexBudget (SPLR-91 FR-002)', () => {
  it('contains at most five hardcoded hex literals outside :root (target zero)', () => {
    const css = readIndexCss();
    const matches = hexMatchesOutsideRoot(css);
    expect(
      matches.length,
      `found ${matches.length} hex literal(s) outside :root: ${matches.join(', ')}`,
    ).toBeLessThanOrEqual(MAX_INTENTIONAL_HEX);
  });

  it('documents any remaining hex outside :root with intentional hex comment', () => {
    const css = readIndexCss();
    const outside = cssOutsideRoot(css);
    const lines = outside.split('\n');

    for (let i = 0; i < lines.length; i += 1) {
      if (!HEX_PATTERN.test(lines[i])) continue;
      HEX_PATTERN.lastIndex = 0;

      const sameLine = lines[i].includes('intentional hex');
      const prevLine = i > 0 && lines[i - 1].includes('intentional hex');
      expect(
        sameLine || prevLine,
        `hex on line without intentional hex comment: ${lines[i].trim()}`,
      ).toBe(true);
    }
  });
});
