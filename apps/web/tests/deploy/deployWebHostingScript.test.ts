import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(testDir, '../../../..');
const deployScriptPath = resolve(repoRoot, 'deploy/production/deploy-web-hosting.sh');
const firebasercPath = resolve(repoRoot, 'apps/web/.firebaserc');
const packageJsonPath = resolve(repoRoot, 'apps/web/package.json');

export function readDeployScript(path = deployScriptPath): string {
  return readFileSync(path, 'utf8');
}

export function assertDeployScriptPrerequisites(scriptText: string): void {
  expect(scriptText).toContain('firebase');
  expect(scriptText).toMatch(/deploy.*hosting|firebase deploy --only hosting/);
  expect(scriptText).toContain('dist/index.html');
}

describe('production web hosting deploy contract', () => {
  it('deployScript_existsAtExpectedPath', () => {
    expect(existsSync(deployScriptPath)).toBe(true);
  });

  it('deployScript_validatesPrerequisites', () => {
    assertDeployScriptPrerequisites(readDeployScript());
  });

  it('firebaserc_bindsSplitRailProject', () => {
    const firebaserc = JSON.parse(readFileSync(firebasercPath, 'utf8')) as {
      projects: { default: string };
    };
    expect(firebaserc.projects.default).toBe('split-rail');
  });

  it('packageJson_hasDeployHostingScript', () => {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
      scripts: Record<string, string>;
    };
    expect(packageJson.scripts['deploy:hosting']).toBe('firebase deploy --only hosting');
  });
});
