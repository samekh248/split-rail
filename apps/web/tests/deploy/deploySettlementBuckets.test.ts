import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  assertArchiveRetentionPeriod,
  assertDistinctBucketNamesPerEnv,
  assertProdBucketLockRequiresConfirm,
  assertStagingHasNoRetentionLock,
  assertValidateScriptStructure,
  readDeployScript,
} from '../../src/deploy/assertSettlementBucketContract';

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(testDir, '../../../..');
const provisionPath = resolve(repoRoot, 'deploy/infra/provision-settlement-buckets.sh');
const validatePath = resolve(repoRoot, 'deploy/lib/validate-settlement-buckets.sh');

describe('settlement bucket IaC contract', () => {
  it('provisionScript_existsAtExpectedPath', () => {
    expect(existsSync(provisionPath)).toBe(true);
  });

  it('provisionScript_setsArchiveRetention2555Days', () => {
    const script = readDeployScript('deploy/infra/provision-settlement-buckets.sh', repoRoot);
    assertArchiveRetentionPeriod(script);
    expect(script).toMatch(/gcloud storage buckets (create|update)/);
  });

  it('provisionScript_stagingWithoutRetentionLock', () => {
    const script = readDeployScript('deploy/infra/provision-settlement-buckets.sh', repoRoot);
    assertStagingHasNoRetentionLock(script, /STAGING_BUCKET|staging-/);
    expect(script).not.toMatch(/STAGING_BUCKET.*--retention-period/s);
  });

  it('validateScript_checksRetentionAndPublicAccess', () => {
    expect(existsSync(validatePath)).toBe(true);
    const script = readDeployScript('deploy/lib/validate-settlement-buckets.sh', repoRoot);
    assertValidateScriptStructure(script);
  });

  it('provisionScript_resolvesDistinctBucketNamesPerEnv', () => {
    const script = readDeployScript('deploy/infra/provision-settlement-buckets.sh', repoRoot);
    expect(script).toContain('settlement-bucket-names.sh');
    const namesScript = readDeployScript('deploy/lib/settlement-bucket-names.sh', repoRoot);
    assertDistinctBucketNamesPerEnv(namesScript);
  });

  it('provisionScript_prodLockRequiresConfirmFlag', () => {
    const script = readDeployScript('deploy/infra/provision-settlement-buckets.sh', repoRoot);
    assertProdBucketLockRequiresConfirm(script);
  });

  it('validateScript_exitsNonZeroOnFailure', () => {
    const script = readDeployScript('deploy/lib/validate-settlement-buckets.sh', repoRoot);
    assertValidateScriptStructure(script);
    expect(script).toContain('exit 1');
  });
});
