import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/** Read a deploy script relative to the repository root. */
export function readDeployScript(repoRelativePath: string, repoRoot: string): string {
  return readFileSync(resolve(repoRoot, repoRelativePath), 'utf8');
}

/** Migrations must run before Cloud Run deploy (FR-003). */
export function assertMigrationBeforeCloudRunDeploy(scriptText: string): void {
  const migratePattern = /migrate-bundle|efbundle|migrations bundle/i;
  const migrateIdx = scriptText.search(migratePattern);
  const deployIdx = scriptText.search(/gcloud run deploy/i);
  if (migrateIdx < 0) {
    throw new Error('deploy script must invoke migration bundle before Cloud Run deploy');
  }
  if (deployIdx < 0) {
    throw new Error('deploy script must include gcloud run deploy');
  }
  if (migrateIdx >= deployIdx) {
    throw new Error('migration step must appear before gcloud run deploy in deploy script');
  }
}

/** Cloud Run must wire the Cloud SQL connector (FR-005). */
export function assertCloudSqlInstancesFlag(scriptText: string): void {
  if (!scriptText.includes('add-cloudsql-instances')) {
    throw new Error('deploy script must include --add-cloudsql-instances for Cloud SQL connector');
  }
}

/**
 * Reject cleartext database passwords in committed scripts (FR-006, SC-004).
 * Allows variable references like ${DB_PASSWORD} and connection templates without literal secrets.
 */
export function assertNoHardcodedDbPassword(scriptText: string): void {
  const lines = scriptText.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#')) continue;
    if (trimmed.includes('--set-secrets')) continue;

    if (/Password\s*=\s*[^$\s"']{6,}/i.test(trimmed) && !trimmed.includes('${')) {
      throw new Error(`Possible hardcoded DB password in deploy script: ${trimmed}`);
    }
    if (/DB_PASSWORD\s*=\s*[^$\s"']{6,}/.test(trimmed) && !trimmed.includes('${')) {
      throw new Error(`Possible hardcoded DB_PASSWORD in deploy script: ${trimmed}`);
    }
  }
}

/** Production deploy must bind DB_PASSWORD via Secret Manager (FR-006). */
export function assertSecretManagerBinding(scriptText: string): void {
  if (!/--set-secrets=.*DB_PASSWORD=/s.test(scriptText)) {
    throw new Error('production deploy script must bind DB_PASSWORD via --set-secrets');
  }
}

/** Preview deploy must wire socket connection string and preview flags. */
export function assertPreviewCloudSqlWiring(scriptText: string): void {
  if (!scriptText.includes('ConnectionStrings__DefaultConnection')) {
    throw new Error('preview deploy must set ConnectionStrings__DefaultConnection');
  }
  if (!scriptText.includes('/cloudsql/')) {
    throw new Error('preview deploy connection string must use Cloud SQL socket path');
  }
  if (!scriptText.includes('Preview__UseFakeQboConnector')) {
    throw new Error('preview deploy must set Preview__UseFakeQboConnector');
  }
  if (!scriptText.includes('Preview__EnableTestSeeding')) {
    throw new Error('preview deploy must set Preview__EnableTestSeeding');
  }
}

/** Teardown must delete preview Cloud SQL instance, not production. */
export function assertTeardownDeletesPreviewInstance(scriptText: string): void {
  if (!/gcloud sql instances delete/i.test(scriptText)) {
    throw new Error('teardown script must delete Cloud SQL preview instance');
  }
  if (!/splitrail-preview/i.test(scriptText)) {
    throw new Error('teardown script must target splitrail-preview instance pattern');
  }
  if (scriptText.includes('split-rail-db-prod')) {
    throw new Error('teardown script must not reference production instance split-rail-db-prod');
  }
}

/** migrate-bundle.sh must use proxy + bundle execution. */
export function assertMigrateBundleScript(scriptText: string): void {
  if (!/cloud-sql-proxy|cloud_sql_proxy/i.test(scriptText)) {
    throw new Error('migrate-bundle.sh must use Cloud SQL Auth Proxy');
  }
  if (!/efbundle|migrations bundle/i.test(scriptText)) {
    throw new Error('migrate-bundle.sh must execute EF migration bundle');
  }
  if (!scriptText.includes('set -e')) {
    throw new Error('migrate-bundle.sh must fail fast (set -e)');
  }
}
