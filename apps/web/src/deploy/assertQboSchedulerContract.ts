import { existsSync } from 'node:fs';

/** Scheduler job must fire every 6 hours (FR-001). */
export function assertSchedulerCronSchedule(scriptText: string): void {
  if (!scriptText.includes('0 */6 * * *') && !scriptText.includes('SCHEDULER_CRON')) {
    throw new Error('scheduler provision script must use cron schedule 0 */6 * * *');
  }
}

/** Scheduler job must authenticate with OIDC service account (FR-011). */
export function assertSchedulerOidcFlags(scriptText: string): void {
  if (!scriptText.includes('--oidc-service-account-email')) {
    throw new Error('scheduler provision script must set --oidc-service-account-email');
  }
  if (!scriptText.includes('--oidc-token-audience')) {
    throw new Error('scheduler provision script must set --oidc-token-audience');
  }
}

/** Paired deploy scripts must both exist (Constitution §X). */
export function assertSchedulerScriptParity(repoRoot: string, shRelative: string, ps1Relative: string): void {
  const shPath = `${repoRoot}/${shRelative}`.replace(/\//g, '/');
  const ps1Path = `${repoRoot}/${ps1Relative}`.replace(/\//g, '/');
  if (!existsSync(shPath)) {
    throw new Error(`missing bash script: ${shRelative}`);
  }
  if (!existsSync(ps1Path)) {
    throw new Error(`missing PowerShell script: ${ps1Relative}`);
  }
}

/** Validate script must check schedule, URI, and OIDC configuration (FR-013). */
export function assertValidateSchedulerScriptStructure(scriptText: string): void {
  if (!scriptText.includes('SCHEDULER_CRON') && !scriptText.includes('0 */6 * * *')) {
    throw new Error('validate-qbo-scheduler script must reference 6-hour schedule');
  }
  if (!scriptText.includes('oidc') && !scriptText.includes('OIDC')) {
    throw new Error('validate-qbo-scheduler script must validate OIDC configuration');
  }
  if (!scriptText.includes('qbo-sync-trigger') && !scriptText.includes('SCHEDULER_TRIGGER_PATH')) {
    throw new Error('validate-qbo-scheduler script must validate qbo-sync-trigger URI');
  }
}

/** Production deploy must wire scheduler OIDC configuration (spec 057). */
export function assertProductionSchedulerEnvVars(scriptText: string): void {
  if (!scriptText.includes('QboSync__SchedulerServiceAccountEmail')) {
    throw new Error('production deploy must set QboSync__SchedulerServiceAccountEmail');
  }
  if (!scriptText.includes('QboSync__SchedulerTokenAudience')) {
    throw new Error('production deploy must set QboSync__SchedulerTokenAudience');
  }
  if (!scriptText.includes('validate-qbo-scheduler')) {
    throw new Error('production deploy must invoke validate-qbo-scheduler before deploy');
  }
}

/** Production deploy must not bind shared-key internal trigger secret (supersedes spec 055). */
export function assertNoInternalTriggerKeySecret(scriptText: string): void {
  if (/QBO_INTERNAL_TRIGGER_KEY\s*=/.test(scriptText)) {
    throw new Error('production deploy must not bind QBO_INTERNAL_TRIGGER_KEY (use scheduler OIDC)');
  }
  if (/qbo-internal-trigger-key:latest/.test(scriptText)) {
    throw new Error('production deploy must not reference qbo-internal-trigger-key secret');
  }
}
