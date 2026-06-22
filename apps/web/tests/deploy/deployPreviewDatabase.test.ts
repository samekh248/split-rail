import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  assertCloudSqlInstancesFlag,
  assertMigrateBundleScript,
  assertMigrationBeforeCloudRunDeploy,
  assertNoHardcodedDbPassword,
  assertPreviewCloudSqlWiring,
  assertTeardownDeletesPreviewInstance,
  readDeployScript,
} from '../../src/deploy/assertCloudSqlDeployContract';

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(testDir, '../../../..');
const migrateBundlePath = resolve(repoRoot, 'deploy/lib/migrate-bundle.sh');
const deployPreviewPath = resolve(repoRoot, 'deploy/preview/deploy-preview.sh');
const teardownPreviewPath = resolve(repoRoot, 'deploy/preview/teardown-preview.sh');
const provisionPreviewDbPath = resolve(repoRoot, 'deploy/lib/provision-preview-db.sh');

describe('preview database deploy contract', () => {
  it('migrateBundleScript_existsAtExpectedPath', () => {
    expect(existsSync(migrateBundlePath)).toBe(true);
  });

  it('migrateBundleScript_usesProxyAndBundle', () => {
    const script = readDeployScript('deploy/lib/migrate-bundle.sh', repoRoot);
    assertMigrateBundleScript(script);
  });

  it('deployPreview_migrationBeforeCloudRunDeploy', () => {
    const script = readDeployScript('deploy/preview/deploy-preview.sh', repoRoot);
    assertMigrationBeforeCloudRunDeploy(script);
  });

  it('deployPreview_cloudSqlConnectorWiring', () => {
    const script = readDeployScript('deploy/preview/deploy-preview.sh', repoRoot);
    assertCloudSqlInstancesFlag(script);
    assertPreviewCloudSqlWiring(script);
  });

  it('teardownPreview_deletesCloudSqlInstance', () => {
    const script = readDeployScript('deploy/preview/teardown-preview.sh', repoRoot);
    assertTeardownDeletesPreviewInstance(script);
  });

  it('deployPreview_noHardcodedPassword', () => {
    assertNoHardcodedDbPassword(readDeployScript('deploy/preview/deploy-preview.sh', repoRoot));
    assertNoHardcodedDbPassword(readDeployScript('deploy/lib/migrate-bundle.sh', repoRoot));
    assertNoHardcodedDbPassword(readDeployScript('deploy/lib/provision-preview-db.sh', repoRoot));
  });

  it('provisionPreviewDb_targetsEphemeralInstance', () => {
    const script = readDeployScript('deploy/lib/provision-preview-db.sh', repoRoot);
    expect(script).toContain('db-f1-micro');
    expect(script).toContain('POSTGRES_16');
    expect(script).toContain('splitrail-preview');
  });
});
