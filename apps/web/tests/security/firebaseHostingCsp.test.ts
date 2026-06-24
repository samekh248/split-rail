import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { PRODUCTION_CONTENT_SECURITY_POLICY } from '../../src/security/contentSecurityPolicy';

const testDir = dirname(fileURLToPath(import.meta.url));
const firebaseJsonPath = resolve(testDir, '../../firebase.json');

describe('firebaseHostingCsp', () => {
  it('firebaseJson_HostingHeaders_MatchesCanonicalPolicy', () => {
    const firebase = JSON.parse(readFileSync(firebaseJsonPath, 'utf8')) as {
      hosting: { headers: Array<{ source: string; headers: Array<{ key: string; value: string }> }> };
    };

    const globalRule = firebase.hosting.headers.find((rule) => rule.source === '/**');
    expect(globalRule).toBeDefined();

    const cspHeader = globalRule!.headers.find((h) => h.key === 'Content-Security-Policy');
    expect(cspHeader?.value).toBe(PRODUCTION_CONTENT_SECURITY_POLICY);
  });
});
