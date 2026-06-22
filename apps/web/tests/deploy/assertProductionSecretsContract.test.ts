import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  assertAppsettingsHygieneConfig,
  assertNoHardcodedJwtOrQboSecrets,
  assertProductionAppsettingsHygiene,
  assertProductionSecretBindings,
  PRODUCTION_SECRET_BINDINGS,
} from '../../src/deploy/assertProductionSecretsContract';

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(testDir, '../../../..');

const validDeployScript = `
gcloud run deploy split-rail-api \\
  --set-secrets="DB_PASSWORD=db-password:latest,Jwt__Secret=jwt-signing-key:latest,QBO_CLIENT_ID=qbo-client-id:latest,QBO_CLIENT_SECRET=qbo-client-secret:latest"
`;

describe('assertProductionSecretsContract', () => {
  it('assertProductionSecretBindings_requiresAllBindings', () => {
    expect(() => assertProductionSecretBindings(validDeployScript)).not.toThrow();
    expect(() => assertProductionSecretBindings('--set-secrets=DB_PASSWORD=db-password:latest')).toThrow(
      /Jwt__Secret/,
    );
  });

  it('assertProductionSecretBindings_requiresSetSecretsFlag', () => {
    expect(() => assertProductionSecretBindings('gcloud run deploy')).toThrow(/must include --set-secrets/);
  });

  it('assertProductionSecretBindings_useLatestVersions', () => {
    for (const { envVar, secretId } of PRODUCTION_SECRET_BINDINGS) {
      expect(validDeployScript).toContain(`${envVar}=${secretId}:latest`);
    }
    expect(() =>
      assertProductionSecretBindings(
        '--set-secrets="DB_PASSWORD=db-password:1,Jwt__Secret=jwt-signing-key:latest,QBO_CLIENT_ID=qbo-client-id:latest,QBO_CLIENT_SECRET=qbo-client-secret:latest"',
      ),
    ).toThrow(/DB_PASSWORD=db-password:latest/);
  });

  it('assertNoHardcodedJwtOrQboSecrets_rejectsPlaceholders', () => {
    expect(() => assertNoHardcodedJwtOrQboSecrets(validDeployScript)).not.toThrow();
    expect(() =>
      assertNoHardcodedJwtOrQboSecrets('Jwt__Secret=replace-with-production-secret-at-least-32-chars'),
    ).toThrow(/JWT/);
    expect(() =>
      assertNoHardcodedJwtOrQboSecrets('Jwt__Secret=dev-secret-key-at-least-32-characters-long'),
    ).toThrow(/JWT/);
    expect(() =>
      assertNoHardcodedJwtOrQboSecrets('QBO_CLIENT_SECRET=super-secret-value-here'),
    ).toThrow(/QBO_CLIENT_SECRET/);
    expect(() =>
      assertNoHardcodedJwtOrQboSecrets('QBO_INTERNAL_TRIGGER_KEY=dev-internal-sync-key'),
    ).toThrow(/QBO secret/);
    expect(() => assertNoHardcodedJwtOrQboSecrets('# Jwt__Secret=dev-secret-key')).not.toThrow();
    expect(() =>
      assertNoHardcodedJwtOrQboSecrets('--set-secrets=Jwt__Secret=dev-secret-key-at-least-32-characters-long'),
    ).not.toThrow();
  });

  it('assertAppsettingsHygieneConfig_rejectsNonEmptySecrets', () => {
    expect(() => assertAppsettingsHygieneConfig({ Jwt: { Secret: 'x' } })).toThrow(/Jwt\.Secret/);
    expect(() =>
      assertAppsettingsHygieneConfig({ QboSync: { ClientId: 'id', ClientSecret: '' } }),
    ).toThrow(/ClientId and ClientSecret/);
    expect(() =>
      assertAppsettingsHygieneConfig({ QboSync: { InternalTriggerKey: 'dev-internal-sync-key' } }),
    ).toThrow(/InternalTriggerKey/);
    expect(() =>
      assertAppsettingsHygieneConfig({ Jwt: { Secret: '' }, QboSync: { ClientId: '', ClientSecret: '' } }),
    ).not.toThrow();
  });

  it('assertProductionAppsettingsHygiene_passesOnRepoConfig', () => {
    expect(() => assertProductionAppsettingsHygiene(repoRoot)).not.toThrow();
  });
});
