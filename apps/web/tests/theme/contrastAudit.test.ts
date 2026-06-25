import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { generateContrastAuditMarkdown } from '@/theme/generateContrastAudit';
import { contrastPairings } from '@/theme/tokens';

const auditPath = resolve(__dirname, '../../src/brand/contrast-audit.md');

describe('contrast audit artifact', () => {
  it('commits contrast-audit.md with every pairing id', () => {
    const markdown = readFileSync(auditPath, 'utf-8');
    for (const pairing of contrastPairings) {
      expect(markdown).toContain(pairing.id);
    }
  });

  it('documents token before/after changes', () => {
    const markdown = readFileSync(auditPath, 'utf-8');
    expect(markdown).toContain('## Token changes');
    expect(markdown).toContain('--color-border-subtle');
    expect(markdown).toContain('--color-text-on-accent');
    expect(markdown).toContain('--color-accent-orange-disabled');
  });

  it('generates markdown that matches the committed audit file', () => {
    expect(generateContrastAuditMarkdown()).toBe(readFileSync(auditPath, 'utf-8'));
  });
});

/** Regenerate audit file when pairings or token values change. */
export function writeContrastAuditFile(): void {
  writeFileSync(auditPath, generateContrastAuditMarkdown(), 'utf-8');
}
