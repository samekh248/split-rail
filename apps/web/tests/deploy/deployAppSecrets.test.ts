import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  assertNoHardcodedJwtOrQboSecrets,
  assertProductionSecretBindings,
} from '../../src/deploy/assertProductionSecretsContract';
import { readDeployScript } from '../../src/deploy/assertCloudSqlDeployContract';

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(testDir, '../../../..');

describe('application secrets provision contract', () => {
  it('provisionAppSecrets_bashAndPowerShellExist', () => {
    expect(existsSync(resolve(repoRoot, 'deploy/infra/provision-app-secrets.sh'))).toBe(true);
    expect(existsSync(resolve(repoRoot, 'deploy/infra/provision-app-secrets.ps1'))).toBe(true);
  });

  it('provisionAppSecrets_bash_declaresAllSecretIds', () => {
    const script = readDeployScript('deploy/infra/provision-app-secrets.sh', repoRoot);
    for (const secretId of [
      'jwt-signing-key',
      'qbo-client-id',
      'qbo-client-secret',
      'qbo-internal-trigger-key',
      'db-password',
    ]) {
      expect(script).toContain(secretId);
    }
  });

  it('provisionAppSecrets_ps1_declaresAllSecretIds', () => {
    const script = readDeployScript('deploy/infra/provision-app-secrets.ps1', repoRoot);
    expect(script).toContain('gcloud-invoke.ps1');
    for (const secretId of [
      'jwt-signing-key',
      'qbo-client-id',
      'qbo-client-secret',
      'qbo-internal-trigger-key',
      'db-password',
    ]) {
      expect(script).toContain(secretId);
    }
  });
});

describe('production API deploy contract (PowerShell)', () => {
  it('deployProductionApi_ps1_existsAtExpectedPath', () => {
    expect(existsSync(resolve(repoRoot, 'deploy/production/deploy-api.ps1'))).toBe(true);
  });

  it('deployProductionApi_ps1_allSecretBindings', () => {
    const script = readDeployScript('deploy/production/deploy-api.ps1', repoRoot);
    assertProductionSecretBindings(script);
    assertNoHardcodedJwtOrQboSecrets(script);
    expect(script).toContain('migrate-bundle.ps1');
    expect(script).toContain('validate-settlement-buckets.ps1');
  });
});
