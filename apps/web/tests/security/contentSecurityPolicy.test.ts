import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { PRODUCTION_CONTENT_SECURITY_POLICY } from '../../src/security/contentSecurityPolicy';

const contractLiteral =
  "default-src 'self'; script-src 'self'; connect-src 'self' *.quickbooks.com *.googleapis.com; object-src 'none';";

const testDir = dirname(fileURLToPath(import.meta.url));
const firebaseJsonPath = resolve(testDir, '../../firebase.json');

describe('contentSecurityPolicy', () => {
  it('ProductionPolicy_MatchesContractLiteral', () => {
    expect(PRODUCTION_CONTENT_SECURITY_POLICY).toBe(contractLiteral);
  });

  it("productionPolicy contains object-src 'none'", () => {
    expect(PRODUCTION_CONTENT_SECURITY_POLICY).toContain("object-src 'none'");
  });

  it('cross-artifact sync: TS, firebase.json match contract literal', () => {
    const firebase = JSON.parse(readFileSync(firebaseJsonPath, 'utf8')) as {
      hosting: { headers: Array<{ source: string; headers: Array<{ key: string; value: string }> }> };
    };
    const globalRule = firebase.hosting.headers.find((rule) => rule.source === '/**');
    const cspHeader = globalRule?.headers.find((h) => h.key === 'Content-Security-Policy');

    expect(cspHeader?.value).toBe(contractLiteral);
    expect(PRODUCTION_CONTENT_SECURITY_POLICY).toBe(contractLiteral);
  });
});
