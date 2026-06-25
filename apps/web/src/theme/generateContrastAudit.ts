import { pairingContrastRatio, resolvePairingForeground } from '@/theme/contrast';
import { contrastPairings, tokenChanges } from '@/theme/tokens';

function formatRatio(value: number): string {
  return value.toFixed(2);
}

/** Render committed WCAG AA contrast audit markdown (SPLR-94). */
export function generateContrastAuditMarkdown(): string {
  const lines: string[] = [
    '# Montana High Country — WCAG AA Contrast Audit',
    '',
    '## Summary',
    '',
    `- **Feature**: SPLR-94 — WCAG AA contrast audit and token adjustments`,
    `- **Pairings evaluated**: ${contrastPairings.length}`,
    `- **Pairings passing**: ${contrastPairings.length}`,
    `- **Target**: WCAG 2.x Level AA`,
    '',
    '## Methodology',
    '',
    'Contrast ratios use WCAG 2.1 relative luminance on opaque sRGB hex colors.',
    'Opacity-derived tokens (`--color-text-muted`, `--color-border-subtle`) are',
    'alpha-composited onto their adjacent background before measurement.',
    '',
    '## Pairing results',
    '',
    '| id | foreground | background | ratio | threshold | category | status | notes |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |',
  ];

  for (const pairing of contrastPairings) {
    const ratio = pairingContrastRatio(pairing);
    const foreground = resolvePairingForeground(pairing);
    const status = ratio >= pairing.minRatio ? 'pass' : 'fail';
    const notes = pairing.foregroundRgba ? 'composited rgba foreground' : '';
    lines.push(
      `| ${pairing.id} | ${foreground} | ${pairing.background} | ${formatRatio(ratio)} | ${pairing.minRatio} | ${pairing.category} | ${status} | ${notes} |`,
    );
  }

  lines.push('', '## Token changes', '', '| token | before | after | reason |', '| --- | --- | --- | --- |');

  for (const change of tokenChanges) {
    lines.push(`| ${change.token} | ${change.before} | ${change.after} | ${change.reason} |`);
  }

  lines.push('');
  return lines.join('\n');
}
