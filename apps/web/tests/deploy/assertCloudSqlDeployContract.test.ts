import { describe, expect, it } from 'vitest';
import {
  assertCloudSqlInstancesFlag,
  assertMigrateBundleScript,
  assertMigrationBeforeCloudRunDeploy,
  assertNoHardcodedDbPassword,
  assertPreviewCloudSqlWiring,
  assertSecretManagerBinding,
  assertTeardownDeletesPreviewInstance,
  readDeployScript,
} from '../../src/deploy/assertCloudSqlDeployContract';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(testDir, '../../../..');

describe('assertCloudSqlDeployContract helpers', () => {
  it('readDeployScript_readsRepoFile', () => {
    const content = readDeployScript('deploy/lib/migrate-bundle.sh', repoRoot);
    expect(content).toContain('migrate-bundle');
  });

  it('assertMigrationBeforeCloudRunDeploy_passesWhenOrdered', () => {
    const script = 'migrate-bundle.sh\ngcloud run deploy service';
    expect(() => assertMigrationBeforeCloudRunDeploy(script)).not.toThrow();
  });

  it('assertMigrationBeforeCloudRunDeploy_failsWhenDeployFirst', () => {
    const script = 'gcloud run deploy\nmigrate-bundle';
    expect(() => assertMigrationBeforeCloudRunDeploy(script)).toThrow();
  });

  it('assertMigrationBeforeCloudRunDeploy_failsWhenNoMigrate', () => {
    expect(() => assertMigrationBeforeCloudRunDeploy('gcloud run deploy only')).toThrow(
      'migration bundle',
    );
  });

  it('assertMigrationBeforeCloudRunDeploy_failsWhenNoDeploy', () => {
    expect(() => assertMigrationBeforeCloudRunDeploy('migrate-bundle only')).toThrow(
      'gcloud run deploy',
    );
  });

  it('assertCloudSqlInstancesFlag_requiresFlag', () => {
    expect(() => assertCloudSqlInstancesFlag('no connector')).toThrow();
    expect(() => assertCloudSqlInstancesFlag('--add-cloudsql-instances=foo')).not.toThrow();
  });

  it('assertNoHardcodedDbPassword_rejectsLiteralSecrets', () => {
    expect(() => assertNoHardcodedDbPassword('DB_PASSWORD=supersecret123')).toThrow();
    expect(() => assertNoHardcodedDbPassword('DB_PASSWORD=${DB_PASSWORD}')).not.toThrow();
    expect(() => assertNoHardcodedDbPassword('Password=hardcodedsecret')).toThrow();
    expect(() => assertNoHardcodedDbPassword('# Password=ignored')).not.toThrow();
  });

  it('assertSecretManagerBinding_requiresSetSecrets', () => {
    expect(() => assertSecretManagerBinding('--set-env-vars=DB_PASSWORD=x')).toThrow();
    expect(() => assertSecretManagerBinding('--set-secrets=DB_PASSWORD=db-password:latest')).not.toThrow();
  });

  it('assertPreviewCloudSqlWiring_requiresPreviewFlags', () => {
    const good =
      'ConnectionStrings__DefaultConnection=Host=/cloudsql/proj:us:inst Preview__UseFakeQboConnector Preview__EnableTestSeeding';
    expect(() => assertPreviewCloudSqlWiring(good)).not.toThrow();
    expect(() => assertPreviewCloudSqlWiring('missing flags')).toThrow();
    expect(() => assertPreviewCloudSqlWiring('ConnectionStrings__DefaultConnection only')).toThrow(
      'socket path',
    );
  });

  it('assertTeardownDeletesPreviewInstance_targetsPreviewOnly', () => {
    const good = 'gcloud sql instances delete splitrail-preview-${RUN_ID}';
    expect(() => assertTeardownDeletesPreviewInstance(good)).not.toThrow();
    expect(() => assertTeardownDeletesPreviewInstance('split-rail-db-prod')).toThrow();
    expect(() => assertTeardownDeletesPreviewInstance('no sql delete')).toThrow(
      'delete Cloud SQL',
    );
    expect(() => assertTeardownDeletesPreviewInstance('gcloud sql instances delete other')).toThrow(
      'splitrail-preview',
    );
  });

  it('assertMigrateBundleScript_requiresProxyAndBundle', () => {
    const good = 'set -euo pipefail\ncloud-sql-proxy\nefbundle';
    expect(() => assertMigrateBundleScript(good)).not.toThrow();
    expect(() => assertMigrateBundleScript('no proxy')).toThrow('Auth Proxy');
    expect(() => assertMigrateBundleScript('cloud-sql-proxy only')).toThrow('migration bundle');
    expect(() => assertMigrateBundleScript('cloud-sql-proxy efbundle no set')).toThrow('set -e');
  });
});
