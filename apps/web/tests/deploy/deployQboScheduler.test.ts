import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { readDeployScript } from '../../src/deploy/assertSettlementBucketContract';
import {
  assertProductionSchedulerEnvVars,
  assertSchedulerCronSchedule,
  assertSchedulerOidcFlags,
  assertSchedulerScriptParity,
  assertValidateSchedulerScriptStructure,
} from '../../src/deploy/assertQboSchedulerContract';

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(testDir, '../../../..');
const provisionPath = resolve(repoRoot, 'deploy/infra/provision-qbo-scheduler.sh');
const validatePath = resolve(repoRoot, 'deploy/lib/validate-qbo-scheduler.sh');

describe('QBO scheduler IaC contract', () => {
  it('provisionScript_existsAtExpectedPath', () => {
    expect(existsSync(provisionPath)).toBe(true);
    expect(existsSync(resolve(repoRoot, 'deploy/infra/provision-qbo-scheduler.ps1'))).toBe(true);
  });

  it('provisionScript_setsSixHourCronAndOidc', () => {
    const script = readDeployScript('deploy/infra/provision-qbo-scheduler.sh', repoRoot);
    assertSchedulerCronSchedule(script);
    assertSchedulerOidcFlags(script);
    expect(script).toContain('SCHEDULER_TRIGGER_PATH');
    expect(script).toContain('qbo-scheduler-names.sh');
  });

  it('validateScript_checksScheduleUriAndOidc', () => {
    expect(existsSync(validatePath)).toBe(true);
    const script = readDeployScript('deploy/lib/validate-qbo-scheduler.sh', repoRoot);
    assertValidateSchedulerScriptStructure(script);
  });

  it('schedulerScripts_pairedShAndPs1', () => {
    assertSchedulerScriptParity(repoRoot, 'deploy/infra/provision-qbo-scheduler.sh', 'deploy/infra/provision-qbo-scheduler.ps1');
    assertSchedulerScriptParity(repoRoot, 'deploy/lib/validate-qbo-scheduler.sh', 'deploy/lib/validate-qbo-scheduler.ps1');
    assertSchedulerScriptParity(repoRoot, 'deploy/lib/qbo-scheduler-names.sh', 'deploy/lib/qbo-scheduler-names.ps1');
  });
});
