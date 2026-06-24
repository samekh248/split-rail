import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const shellRoot = resolve(__dirname, '../../src/components/shell');
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

describe('navigation shell logo path centralization', () => {
  it('does not hardcode /brand/sr- paths in apps/web/src/components/shell', () => {
    const offenders: string[] = [];
    for (const file of collectSourceFiles(shellRoot)) {
      const content = readFileSync(file, 'utf-8');
      if (BRAND_SR_PATH.test(content)) {
        offenders.push(relative(shellRoot, file));
      }
    }
    expect(
      offenders,
      `hardcoded /brand/sr- paths in shell components: ${offenders.join(', ')}`,
    ).toEqual([]);
  });
});
