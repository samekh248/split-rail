import { describe, expect, it } from 'vitest';
import { PRODUCTION_CONTENT_SECURITY_POLICY } from '../../src/security/contentSecurityPolicy';
import {
  assertGlobalCspHeader,
  assertGlobalHeaderRule,
  assertPublicRoot,
  assertSpaRewrite,
  parseFirebaseHostingConfig,
} from '../../src/deploy/parseFirebaseHostingConfig';

const validConfig = {
  hosting: {
    public: 'dist',
    rewrites: [{ source: '**', destination: '/index.html' }],
    headers: [
      {
        source: '/**',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: PRODUCTION_CONTENT_SECURITY_POLICY,
          },
        ],
      },
    ],
  },
};

describe('parseFirebaseHostingConfig', () => {
  it('parseFirebaseHostingConfig_parsesJson', () => {
    const parsed = parseFirebaseHostingConfig(JSON.stringify(validConfig));
    expect(parsed.hosting.public).toBe('dist');
  });

  it('assertSpaRewrite_throwsWhenMissing', () => {
    expect(() =>
      assertSpaRewrite({ hosting: { public: 'dist', rewrites: [] } }),
    ).toThrow('SPA rewrite');
  });

  it('assertPublicRoot_throwsWhenWrong', () => {
    expect(() => assertPublicRoot({ hosting: { public: 'build' } })).toThrow(
      'hosting.public',
    );
  });

  it('assertGlobalHeaderRule_throwsWhenMissing', () => {
    expect(() => assertGlobalHeaderRule({ hosting: { public: 'dist' } })).toThrow(
      'global header rule',
    );
  });

  it('assertGlobalCspHeader_throwsWhenPolicyMismatch', () => {
    expect(() =>
      assertGlobalCspHeader({
        hosting: {
          public: 'dist',
          headers: [
            {
              source: '/**',
              headers: [{ key: 'Content-Security-Policy', value: 'default-src none' }],
            },
          ],
        },
      }),
    ).toThrow('canonical production policy');
  });

  it('assertGlobalCspHeader_throwsWhenObjectSrcMissing', () => {
    const policyWithoutObjectSrc = "default-src 'self'; script-src 'self'";
    expect(() =>
      assertGlobalCspHeader(
        {
          hosting: {
            public: 'dist',
            headers: [
              {
                source: '/**',
                headers: [
                  {
                    key: 'Content-Security-Policy',
                    value: policyWithoutObjectSrc,
                  },
                ],
              },
            ],
          },
        },
        policyWithoutObjectSrc,
      ),
    ).toThrow("object-src 'none'");
  });
});
