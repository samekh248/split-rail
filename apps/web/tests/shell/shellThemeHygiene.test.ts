import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const shellRoot = resolve(__dirname, '../../src/components/shell');
const UNICODE_MENU_GLYPHS = /[☰×]/;
const HARDCODED_BRAND_HEX = /#3[eE]2723|#f4[fF]1[eE][aA]/;

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

describe('navigation shell theme hygiene', () => {
  it('does not use Unicode menu or close glyphs in shell components', () => {
    const offenders: string[] = [];
    for (const file of collectSourceFiles(shellRoot)) {
      const content = readFileSync(file, 'utf-8');
      if (UNICODE_MENU_GLYPHS.test(content)) {
        offenders.push(relative(shellRoot, file));
      }
    }
    expect(
      offenders,
      `Unicode menu/close glyphs in shell components: ${offenders.join(', ')}`,
    ).toEqual([]);
  });

  it('does not hardcode Montana High Country hex values in shell TSX', () => {
    const offenders: string[] = [];
    for (const file of collectSourceFiles(shellRoot)) {
      const content = readFileSync(file, 'utf-8');
      if (HARDCODED_BRAND_HEX.test(content)) {
        offenders.push(relative(shellRoot, file));
      }
    }
    expect(
      offenders,
      `hardcoded brand hex in shell components: ${offenders.join(', ')}`,
    ).toEqual([]);
  });
});
