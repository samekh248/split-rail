import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const packageJsonPath = resolve(__dirname, '../../package.json');

describe('brand package scripts (SPLR-95)', () => {
  it('defines test:brand script targeting tests/brand', () => {
    const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf-8')) as {
      scripts?: Record<string, string>;
    };
    expect(pkg.scripts?.['test:brand']).toBe('vitest run tests/brand');
  });
});
