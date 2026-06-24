import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const srcRoot = resolve(__dirname, '../../src');
const assetsPath = join(srcRoot, 'brand/assets.ts');
const BRAND_SR_PATH = /\/brand\/sr-/;

function collectSourceFiles(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      files.push(...collectSourceFiles(fullPath));
    } else if (/\.(ts|tsx)$/.test(entry)) {
      files.push(fullPath);
    }
  }
  return files;
}

describe('brand asset path centralization', () => {
  it('defines logo paths only in apps/web/src/brand/assets.ts', () => {
    const offenders: string[] = [];
    for (const file of collectSourceFiles(srcRoot)) {
      if (file === assetsPath) continue;
      const content = readFileSync(file, 'utf-8');
      if (BRAND_SR_PATH.test(content)) {
        offenders.push(relative(srcRoot, file));
      }
    }
    expect(offenders, `hardcoded /brand/sr- paths outside assets.ts: ${offenders.join(', ')}`).toEqual(
      [],
    );
  });
});
