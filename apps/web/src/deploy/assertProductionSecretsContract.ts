import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/** Required Cloud Run secret bindings for production API deploy (SPLR-48, SPLR-49). */
export const PRODUCTION_SECRET_BINDINGS = [
  { envVar: 'DB_PASSWORD', secretId: 'db-password' },
  { envVar: 'Jwt__Secret', secretId: 'jwt-signing-key' },
  { envVar: 'QBO_CLIENT_ID', secretId: 'qbo-client-id' },
  { envVar: 'QBO_CLIENT_SECRET', secretId: 'qbo-client-secret' },
] as const;

const PLACEHOLDER_JWT_PATTERNS = [
  /replace-with-production-secret/i,
  /dev-secret-key-at-least-32-characters-long/i,
];

const PLACEHOLDER_QBO_PATTERNS = [/dev-internal-sync-key/i];

/** Production deploy must bind all managed secrets via --set-secrets (FR-001). */
export function assertProductionSecretBindings(scriptText: string): void {
  if (!/--set-secrets=/s.test(scriptText)) {
    throw new Error('production deploy script must include --set-secrets');
  }

  for (const { envVar, secretId } of PRODUCTION_SECRET_BINDINGS) {
    const escapedEnv = envVar.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`${escapedEnv}\\s*=\\s*${secretId}:latest`);
    if (!pattern.test(scriptText)) {
      throw new Error(
        `production deploy script must bind ${envVar}=${secretId}:latest via --set-secrets`,
      );
    }
  }
}

function isSecretManagerBindingReference(line: string): boolean {
  if (line.includes('--set-secrets')) return true;
  if (!line.includes(':latest')) return false;
  return PRODUCTION_SECRET_BINDINGS.every(({ secretId }) => line.includes(`${secretId}:latest`));
}

/** Reject cleartext JWT/QBO credentials in committed deploy scripts (FR-006, SC-002). */
export function assertNoHardcodedJwtOrQboSecrets(scriptText: string): void {
  const lines = scriptText.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#')) continue;
    if (isSecretManagerBindingReference(trimmed)) continue;

    for (const pattern of PLACEHOLDER_JWT_PATTERNS) {
      if (pattern.test(trimmed) && !trimmed.includes('${')) {
        throw new Error(`Possible hardcoded JWT secret in deploy script: ${trimmed}`);
      }
    }

    if (/Jwt__Secret\s*=\s*[^$\s"']{8,}/.test(trimmed) && !trimmed.includes('${')) {
      throw new Error(`Possible hardcoded Jwt__Secret in deploy script: ${trimmed}`);
    }

    if (/QBO_CLIENT_SECRET\s*=\s*[^$\s"']{6,}/.test(trimmed) && !trimmed.includes('${')) {
      throw new Error(`Possible hardcoded QBO_CLIENT_SECRET in deploy script: ${trimmed}`);
    }

    for (const pattern of PLACEHOLDER_QBO_PATTERNS) {
      if (pattern.test(trimmed) && !trimmed.includes('${')) {
        throw new Error(`Possible hardcoded QBO secret in deploy script: ${trimmed}`);
      }
    }
  }
}

type AppsettingsJson = {
  Jwt?: { Secret?: string };
  QboSync?: {
    ClientId?: string;
    ClientSecret?: string;
    InternalTriggerKey?: string;
  };
};

/** Committed production base config must not contain usable secret literals (FR-002, FR-003). */
export function assertAppsettingsHygieneConfig(config: AppsettingsJson): void {
  const jwtSecret = config.Jwt?.Secret ?? '';
  if (jwtSecret.length > 0) {
    throw new Error('apps/api/appsettings.json Jwt.Secret must be empty (production uses Secret Manager)');
  }

  const clientId = config.QboSync?.ClientId ?? '';
  const clientSecret = config.QboSync?.ClientSecret ?? '';
  if (clientId.length > 0 || clientSecret.length > 0) {
    throw new Error(
      'apps/api/appsettings.json QboSync.ClientId and ClientSecret must be empty in base config',
    );
  }

  const triggerKey = config.QboSync?.InternalTriggerKey ?? '';
  if (triggerKey.length > 0) {
    throw new Error(
      'apps/api/appsettings.json QboSync.InternalTriggerKey must not contain a dev default',
    );
  }
}

/** Committed production base config must not contain usable secret literals (FR-002, FR-003). */
export function assertProductionAppsettingsHygiene(repoRoot: string): void {
  const path = resolve(repoRoot, 'apps/api/appsettings.json');
  const raw = readFileSync(path, 'utf8');
  const config = JSON.parse(raw) as AppsettingsJson;
  assertAppsettingsHygieneConfig(config);
}
