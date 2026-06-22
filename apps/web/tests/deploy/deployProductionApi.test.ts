import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  assertCloudSqlInstancesFlag,
  assertMigrationBeforeCloudRunDeploy,
  assertNoHardcodedDbPassword,
  assertSecretManagerBinding,
  readDeployScript,
} from '../../src/deploy/assertCloudSqlDeployContract';
import {
  assertProductionDoesNotReferenceDevBuckets,
  assertSettlementArchiveEnvVars,
} from '../../src/deploy/assertSettlementBucketContract';

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(testDir, '../../../..');
const deployApiPath = resolve(repoRoot, 'deploy/production/deploy-api.sh');

describe('production API deploy contract', () => {
  it('deployProductionApi_existsAtExpectedPath', () => {
    expect(existsSync(deployApiPath)).toBe(true);
  });

  it('deployProductionApi_migrationBeforeDeploy', () => {
    const script = readDeployScript('deploy/production/deploy-api.sh', repoRoot);
    assertMigrationBeforeCloudRunDeploy(script);
    expect(script).toContain('migrate-bundle.sh');
  });

  it('deployProductionApi_secretManagerAndConnector', () => {
    const script = readDeployScript('deploy/production/deploy-api.sh', repoRoot);
    assertCloudSqlInstancesFlag(script);
    assertSecretManagerBinding(script);
    expect(script).toContain('split-rail:us-central1:split-rail-db-prod');
    assertNoHardcodedDbPassword(script);
  });

  it('deployProductionApi_settlementArchiveEnvVars', () => {
    const script = readDeployScript('deploy/production/deploy-api.sh', repoRoot);
    assertSettlementArchiveEnvVars(
      script,
      'split-rail-settlements-prod',
      'split-rail-settlements-staging-prod',
    );
    expect(script).toContain('validate-settlement-buckets.sh');
  });

  it('deployProductionApi_doesNotReferenceDevBuckets', () => {
    const script = readDeployScript('deploy/production/deploy-api.sh', repoRoot);
    assertProductionDoesNotReferenceDevBuckets(script);
  });
});
