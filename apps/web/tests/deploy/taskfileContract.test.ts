import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  assertPlaceholderAbsent,
  assertReadmeDocumentsTasks,
  assertTaskBlockPresent,
  assertTaskContains,
  assertTaskDir,
  extractTaskBlock,
  readReadme,
  readTaskfile,
} from '../../src/deploy/assertTaskfileContract';

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(testDir, '../../../..');

const REQUIRED_TASKS = [
  'api:build',
  'api:test',
  'api:dev',
  'web:dev',
  'web:build',
  'web:test',
  'gen:api',
  'e2e',
  'dev',
] as const;

const README_TASKS = [
  'api:build',
  'api:test',
  'api:dev',
  'web:dev',
  'web:build',
  'web:test',
  'gen:api',
  'e2e',
  'dev',
  'build',
  'test',
  'e2e:install',
] as const;

describe('assertTaskfileContract helpers', () => {
  it('assertPlaceholderAbsent_throwsWhenGreetingPresent', () => {
    expect(() => assertPlaceholderAbsent('Hello, world')).toThrow(/placeholder greeting/);
  });

  it('extractTaskBlock_throwsWhenTaskMissing', () => {
    expect(() => extractTaskBlock('tasks:\n  default:\n    desc: x', 'missing:task')).toThrow(
      /not found/,
    );
  });

  it('assertTaskDir_throwsWhenDirMissing', () => {
    const content = readTaskfile(repoRoot);
    expect(() => assertTaskDir(content, 'api:build', 'apps/web')).toThrow(/dir: apps\/web/);
  });

  it('assertTaskContains_throwsWhenPatternMissing', () => {
    const content = readTaskfile(repoRoot);
    expect(() => assertTaskContains(content, 'api:build', 'npm run build')).toThrow(
      /npm run build/,
    );
  });

  it('assertReadmeDocumentsTasks_throwsWhenTaskMissing', () => {
    expect(() => assertReadmeDocumentsTasks('# readme', ['task:missing'])).toThrow(
      /task:missing/,
    );
  });
});

describe('root Taskfile contract', () => {
  const taskfile = () => readTaskfile(repoRoot);

  it('taskfile_existsAtRepoRoot', () => {
    expect(() => readTaskfile(repoRoot)).not.toThrow();
  });

  it('taskfile_placeholderAbsent', () => {
    assertPlaceholderAbsent(taskfile());
  });

  it('taskfile_requiredTasksPresent', () => {
    const content = taskfile();
    for (const name of REQUIRED_TASKS) {
      expect(() => assertTaskBlockPresent(content, name)).not.toThrow();
    }
  });

  it('taskfile_apiBuildReferencesProject', () => {
    const content = taskfile();
    expect(content).toContain('API_PROJECT: apps/api/split-rail-api.csproj');
    assertTaskContains(content, 'api:build', 'dotnet build', '{{.API_PROJECT}}');
  });

  it('taskfile_apiTestReferencesTestProject', () => {
    const content = taskfile();
    expect(content).toContain('API_TEST_PROJECT: apps/api.tests/split-rail-api.tests.csproj');
    assertTaskContains(content, 'api:test', 'dotnet test', '{{.API_TEST_PROJECT}}');
  });

  it('taskfile_webTasksDelegateToAppsWeb', () => {
    const content = taskfile();
    assertTaskDir(content, 'web:build', 'apps/web');
    assertTaskContains(content, 'web:build', 'npm run build');
    assertTaskDir(content, 'web:test', 'apps/web');
    assertTaskContains(content, 'web:test', 'npm run test');
  });

  it('taskfile_devRunsParallel', () => {
    const block = readTaskfile(repoRoot);
    const devBlock = block.split('\n').slice(
      block.split('\n').findIndex((l) => l === '  dev:'),
    ).join('\n');
    expect(devBlock).toContain('run: parallel');
    expect(devBlock).toContain('task: api:dev');
    expect(devBlock).toContain('task: web:dev');
  });

  it('taskfile_apiDevAndWebDevPresent', () => {
    const content = taskfile();
    assertTaskContains(content, 'api:dev', 'dotnet run', '--urls http://localhost:5000');
    assertTaskDir(content, 'web:dev', 'apps/web');
    assertTaskContains(content, 'web:dev', 'npm run dev');
  });

  it('taskfile_genApiDelegatesToAppsWeb', () => {
    const content = taskfile();
    assertTaskDir(content, 'gen:api', 'apps/web');
    assertTaskContains(content, 'gen:api', 'npm run gen:api');
  });

  it('taskfile_genApiOpenApiUrlDefault', () => {
    expect(taskfile()).toContain(
      'OPENAPI_URL: http://localhost:5000/swagger/v1/swagger.json',
    );
  });

  it('taskfile_e2eDelegatesToTestsE2e', () => {
    const content = taskfile();
    assertTaskDir(content, 'e2e', 'tests/e2e');
    assertTaskContains(content, 'e2e', 'playwright test');
  });

  it('taskfile_readmeDocumentsAllTasks', () => {
    assertReadmeDocumentsTasks(readReadme(repoRoot), [...README_TASKS]);
  });
});
