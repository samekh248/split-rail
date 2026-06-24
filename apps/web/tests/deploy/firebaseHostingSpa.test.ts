import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  assertGlobalCspHeader,
  assertGlobalHeaderRule,
  assertPublicRoot,
  assertSpaRewrite,
  parseFirebaseHostingConfig,
} from '../../src/deploy/parseFirebaseHostingConfig';
import { PRODUCTION_CONTENT_SECURITY_POLICY } from '../../src/security/contentSecurityPolicy';

const testDir = dirname(fileURLToPath(import.meta.url));
const firebaseJsonPath = resolve(testDir, '../../firebase.json');

function readFirebaseConfig(): string {
  return readFileSync(firebaseJsonPath, 'utf8');
}

function readParsedFirebaseConfig() {
  return parseFirebaseHostingConfig(readFirebaseConfig());
}

describe('firebase hosting SPA routing', () => {
  it('firebaseJson_hasSpaRewrite', () => {
    expect(() => assertSpaRewrite(readParsedFirebaseConfig())).not.toThrow();
  });

  it('firebaseJson_publicRootIsDist', () => {
    expect(() => assertPublicRoot(readParsedFirebaseConfig())).not.toThrow();
  });

  it('firebaseJson_hasGlobalHeaderRule', () => {
    expect(() => assertGlobalHeaderRule(readParsedFirebaseConfig())).not.toThrow();
  });

  it('firebaseJson_cspIncludesObjectSrcNone', () => {
    const config = readParsedFirebaseConfig();
    const rule = config.hosting.headers!.find((headerRule) => headerRule.source === '/**')!;
    const csp = rule.headers.find((header) => header.key === 'Content-Security-Policy');
    expect(csp?.value).toContain("object-src 'none'");
  });

  it('firebaseJson_globalCspMatchesCanonicalPolicy', () => {
    expect(() =>
      assertGlobalCspHeader(readParsedFirebaseConfig(), PRODUCTION_CONTENT_SECURITY_POLICY),
    ).not.toThrow();
  });
});
