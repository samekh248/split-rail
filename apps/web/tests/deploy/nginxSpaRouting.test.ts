import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  assertSpaFallback,
  assertStaticRoot,
  parseListenPort,
} from '../../src/deploy/parseNginxSpaConfig';

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(testDir, '../../../..');
const nginxConfigPath = resolve(repoRoot, 'deploy/preview/nginx.web.conf');

function readNginxConfig(): string {
  return readFileSync(nginxConfigPath, 'utf8');
}

describe('preview nginx SPA routing', () => {
  it('nginxConfig_hasSpaFallback', () => {
    expect(() => assertSpaFallback(readNginxConfig())).not.toThrow();
  });

  it('nginxConfig_servesFromHtmlRoot', () => {
    expect(() => assertStaticRoot(readNginxConfig())).not.toThrow();
  });

  it('nginxConfig_listensOn8080', () => {
    expect(parseListenPort(readNginxConfig())).toBe(8080);
  });
});
