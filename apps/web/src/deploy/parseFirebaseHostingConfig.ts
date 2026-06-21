import { PRODUCTION_CONTENT_SECURITY_POLICY } from '@/security/contentSecurityPolicy';

export interface FirebaseHostingConfig {
  hosting: {
    public: string;
    ignore?: string[];
    rewrites?: Array<{ source: string; destination: string }>;
    headers?: Array<{
      source: string;
      headers: Array<{ key: string; value: string }>;
    }>;
  };
}

export function parseFirebaseHostingConfig(configText: string): FirebaseHostingConfig {
  return JSON.parse(configText) as FirebaseHostingConfig;
}

export function assertSpaRewrite(config: FirebaseHostingConfig): void {
  const rewrite = config.hosting.rewrites?.find(
    (rule) => rule.source === '**' && rule.destination === '/index.html',
  );
  if (!rewrite) {
    throw new Error(
      'firebase.json must include SPA rewrite: { source: "**", destination: "/index.html" }',
    );
  }
}

export function assertPublicRoot(config: FirebaseHostingConfig, expected = 'dist'): void {
  if (config.hosting.public !== expected) {
    throw new Error(
      `firebase.json hosting.public must be "${expected}", got "${config.hosting.public}"`,
    );
  }
}

export function assertGlobalHeaderRule(config: FirebaseHostingConfig): void {
  const rule = config.hosting.headers?.find((headerRule) => headerRule.source === '/**');
  if (!rule) {
    throw new Error('firebase.json must include global header rule with source "/**"');
  }
}

export function assertGlobalCspHeader(
  config: FirebaseHostingConfig,
  expectedPolicy: string = PRODUCTION_CONTENT_SECURITY_POLICY,
): void {
  assertGlobalHeaderRule(config);
  const rule = config.hosting.headers!.find((headerRule) => headerRule.source === '/**')!;
  const csp = rule.headers.find((header) => header.key === 'Content-Security-Policy');
  if (!csp) {
    throw new Error('firebase.json global headers must include Content-Security-Policy');
  }
  if (csp.value !== expectedPolicy) {
    throw new Error('firebase.json CSP does not match canonical production policy');
  }
  if (!csp.value.includes("object-src 'none'")) {
    throw new Error("firebase.json CSP must include object-src 'none'");
  }
}
