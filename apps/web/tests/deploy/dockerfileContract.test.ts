import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(testDir, '../../../..');
const dockerfilePath = resolve(repoRoot, 'deploy/preview/Dockerfile.web');

export function readDockerfile(path = dockerfilePath): string {
  return readFileSync(path, 'utf8');
}

export function assertStageOrder(content: string, stageName: string, ...patterns: string[]): void {
  const stageRegex = new RegExp(`FROM [^\\n]+ AS ${stageName}[\\s\\S]*?(?=FROM |\\Z)`, 'i');
  const stageMatch = content.match(stageRegex);
  expect(stageMatch, `expected stage "${stageName}"`).toBeTruthy();
  const stageBody = stageMatch![0];
  let lastIndex = -1;
  for (const pattern of patterns) {
    const index = stageBody.indexOf(pattern);
    expect(index, `expected "${pattern}" in stage "${stageName}"`).toBeGreaterThanOrEqual(0);
    expect(index, `expected "${pattern}" after prior patterns in stage "${stageName}"`).toBeGreaterThan(lastIndex);
    lastIndex = index;
  }
}

describe('preview Dockerfile contract', () => {
  it('dockerfileWeb_existsAtExpectedPath', () => {
    expect(existsSync(dockerfilePath)).toBe(true);
  });

  it('dockerfile_hasContractStageWithSwaggerTofile', () => {
    const content = readDockerfile();
    expect(content).toMatch(/AS contract/i);
    expect(content).toContain('dotnet swagger tofile');
    expect(content).toContain('test -s /tmp/swagger/v1/swagger.json');
  });

  it('dockerfile_buildStageRunsGenApiBeforeNpmBuild', () => {
    assertStageOrder(readDockerfile(), 'build', 'npm run gen:api', 'npm run build');
  });

  it('dockerfile_contractStageFailsFastMessage', () => {
    const content = readDockerfile();
    expect(content).toContain('OpenAPI contract export failed');
  });

  it('dockerfile_runtimeStageCopiesNginxConfig', () => {
    const content = readDockerfile();
    expect(content).toMatch(/AS runtime/i);
    expect(content).toContain('deploy/preview/nginx.web.conf');
    expect(content).toContain('/usr/share/nginx/html');
    expect(content).toContain('dist');
  });
});
