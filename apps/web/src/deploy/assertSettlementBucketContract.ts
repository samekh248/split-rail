import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/** Read a deploy script relative to the repository root. */
export function readDeployScript(repoRelativePath: string, repoRoot: string): string {
  return readFileSync(resolve(repoRoot, repoRelativePath), 'utf8');
}

/** Archive bucket must enforce 7-year (2555 day) retention per FR-001. */
export function assertArchiveRetentionPeriod(scriptText: string): void {
  if (!scriptText.includes('2555')) {
    throw new Error('provision script must set archive retention period to 2555 days (7 years)');
  }
  if (!/retention-period=2555d|--retention-period=2555d/.test(scriptText)) {
    throw new Error('provision script must include --retention-period=2555d for archive bucket');
  }
}

/** Staging bucket must not receive retention lock (spec 043 orphan cleanup). */
export function assertStagingHasNoRetentionLock(scriptText: string, stagingBucketPattern: RegExp): void {
  const lines = scriptText.split('\n');
  for (const line of lines) {
    if (stagingBucketPattern.test(line) && /--lock-retention-period|--retention-period=/.test(line)) {
      throw new Error('staging bucket provisioning must not set retention or bucket lock');
    }
  }
}

/** Production bucket lock requires explicit operator confirmation (irreversible). */
export function assertProdBucketLockRequiresConfirm(scriptText: string): void {
  if (!scriptText.includes('CONFIRM_BUCKET_LOCK')) {
    throw new Error('provision script must require CONFIRM_BUCKET_LOCK for production bucket lock');
  }
  if (!/ENV.*prod|prod.*CONFIRM_BUCKET_LOCK/s.test(scriptText)) {
    throw new Error('provision script must gate prod --lock-retention-period on CONFIRM_BUCKET_LOCK');
  }
}

/** Production deploy must wire SettlementArchive env vars for real GCS backend. */
export function assertSettlementArchiveEnvVars(
  scriptText: string,
  archiveBucket: string,
  stagingBucket: string,
): void {
  if (!scriptText.includes('SettlementArchive__BucketName')) {
    throw new Error('production deploy must set SettlementArchive__BucketName');
  }
  if (!scriptText.includes('SettlementArchive__StagingBucketName')) {
    throw new Error('production deploy must set SettlementArchive__StagingBucketName');
  }
  if (!scriptText.includes(archiveBucket)) {
    throw new Error(`production deploy must reference archive bucket ${archiveBucket}`);
  }
  if (!scriptText.includes(stagingBucket)) {
    throw new Error(`production deploy must reference staging bucket ${stagingBucket}`);
  }
  if (!scriptText.includes('SettlementArchive__EnforceRetentionValidation=true')) {
    throw new Error('production deploy must set SettlementArchive__EnforceRetentionValidation=true');
  }
}

/** Preview deploy must not override settlement archive bucket configuration. */
export function assertPreviewOmitsSettlementArchiveEnvVars(scriptText: string): void {
  if (/SettlementArchive__/.test(scriptText)) {
    throw new Error('preview deploy must not set SettlementArchive__ env vars (in-memory archive)');
  }
}

/** Production deploy must not target dev bucket names. */
export function assertProductionDoesNotReferenceDevBuckets(scriptText: string): void {
  if (scriptText.includes('split-rail-settlements-dev')) {
    throw new Error('production deploy must not reference split-rail-settlements-dev');
  }
  if (scriptText.includes('split-rail-settlements-staging-dev')) {
    throw new Error('production deploy must not reference split-rail-settlements-staging-dev');
  }
}

/** Validate script must check retention and public access prevention. */
export function assertValidateScriptStructure(scriptText: string): void {
  if (!scriptText.includes('set -euo pipefail')) {
    throw new Error('validate script must use set -euo pipefail');
  }
  if (!/retention|RetentionPeriod|2555/.test(scriptText)) {
    throw new Error('validate script must check archive retention policy');
  }
  if (!/publicAccessPrevention|public.access/i.test(scriptText)) {
    throw new Error('validate script must check public access prevention');
  }
  if (!/exit 1|exit \$\?/.test(scriptText)) {
    throw new Error('validate script must exit non-zero on validation failure');
  }
}

/** Provision script must define distinct bucket names per environment. */
export function assertDistinctBucketNamesPerEnv(scriptText: string): void {
  const required = [
    'split-rail-settlements-dev',
    'split-rail-settlements-preview',
    'split-rail-settlements-prod',
    'split-rail-settlements-staging-dev',
    'split-rail-settlements-staging-preview',
    'split-rail-settlements-staging-prod',
  ];
  for (const name of required) {
    if (!scriptText.includes(name)) {
      throw new Error(`provision script must define bucket name ${name} for environment isolation`);
    }
  }
}
