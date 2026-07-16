import { PRODUCTION_CONTENT_SECURITY_POLICY } from '@/security/contentSecurityPolicy';

export interface FirebaseHostingDestinationRewrite {
  source: string;
  destination: string;
}

export interface FirebaseHostingCloudRunRewrite {
  source: string;
  run: {
    serviceId: string;
    region: string;
  };
}

export type FirebaseHostingRewrite =
  | FirebaseHostingDestinationRewrite
  | FirebaseHostingCloudRunRewrite;

export interface FirebaseHostingConfig {
  hosting: {
    public: string;
    ignore?: string[];
    rewrites?: FirebaseHostingRewrite[];
    headers?: Array<{
      source: string;
      headers: Array<{ key: string; value: string }>;
    }>;
  };
}

export const PRODUCTION_API_CLOUD_RUN_SERVICE_ID = 'split-rail-api';
export const PRODUCTION_API_CLOUD_RUN_REGION = 'us-central1';
export const PRODUCTION_API_REWRITE_SOURCE = '/api/**';

export function parseFirebaseHostingConfig(configText: string): FirebaseHostingConfig {
  return JSON.parse(configText) as FirebaseHostingConfig;
}

function isDestinationRewrite(
  rule: FirebaseHostingRewrite,
): rule is FirebaseHostingDestinationRewrite {
  return 'destination' in rule;
}

function isCloudRunRewrite(rule: FirebaseHostingRewrite): rule is FirebaseHostingCloudRunRewrite {
  return 'run' in rule;
}

export function assertSpaRewrite(config: FirebaseHostingConfig): void {
  const rewrite = config.hosting.rewrites?.find(
    (rule) => isDestinationRewrite(rule) && rule.source === '**' && rule.destination === '/index.html',
  );
  if (!rewrite) {
    throw new Error(
      'firebase.json must include SPA rewrite: { source: "**", destination: "/index.html" }',
    );
  }
}

export function assertApiCloudRunRewrite(
  config: FirebaseHostingConfig,
  expectedServiceId: string = PRODUCTION_API_CLOUD_RUN_SERVICE_ID,
  expectedRegion: string = PRODUCTION_API_CLOUD_RUN_REGION,
): void {
  const rewrites = config.hosting.rewrites ?? [];
  const apiIndex = rewrites.findIndex(
    (rule) =>
      isCloudRunRewrite(rule) &&
      rule.source === PRODUCTION_API_REWRITE_SOURCE &&
      rule.run.serviceId === expectedServiceId &&
      rule.run.region === expectedRegion,
  );
  if (apiIndex < 0) {
    throw new Error(
      `firebase.json must rewrite ${PRODUCTION_API_REWRITE_SOURCE} to Cloud Run ` +
        `{ serviceId: "${expectedServiceId}", region: "${expectedRegion}" }`,
    );
  }

  const spaIndex = rewrites.findIndex(
    (rule) => isDestinationRewrite(rule) && rule.source === '**' && rule.destination === '/index.html',
  );
  if (spaIndex >= 0 && apiIndex > spaIndex) {
    throw new Error(
      `firebase.json must place ${PRODUCTION_API_REWRITE_SOURCE} Cloud Run rewrite before SPA "**" rewrite`,
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
