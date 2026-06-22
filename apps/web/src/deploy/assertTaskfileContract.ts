import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PLACEHOLDER_GREETING = 'Hello, world';

/** Read root Taskfile.yml relative to the repository root. */
export function readTaskfile(repoRoot: string): string {
  const path = resolve(repoRoot, 'Taskfile.yml');
  if (!existsSync(path)) {
    throw new Error('Taskfile.yml must exist at repository root');
  }
  return readFileSync(path, 'utf8');
}

/** Read root README.md relative to the repository root. */
export function readReadme(repoRoot: string): string {
  return readFileSync(resolve(repoRoot, 'README.md'), 'utf8');
}

/** Placeholder greeting must be removed (FR-012, contract C2). */
export function assertPlaceholderAbsent(content: string): void {
  if (content.includes(PLACEHOLDER_GREETING)) {
    throw new Error('Taskfile.yml must not contain placeholder greeting');
  }
}

/** Extract a task block body including the task header line. */
export function extractTaskBlock(content: string, taskName: string): string {
  const lines = content.split('\n');
  const header = `  ${taskName}:`;
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i] === header) {
      start = i;
      break;
    }
  }
  if (start < 0) {
    throw new Error(`task "${taskName}" not found in Taskfile.yml`);
  }
  const block: string[] = [lines[start]];
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    if (/^  [^\s#].+:$/.test(line)) {
      break;
    }
    block.push(line);
  }
  return block.join('\n');
}

/** Task block must exist under tasks:. */
export function assertTaskBlockPresent(content: string, taskName: string): void {
  extractTaskBlock(content, taskName);
}

/** Task block must set dir: to the expected working directory. */
export function assertTaskDir(content: string, taskName: string, dir: string): void {
  const block = extractTaskBlock(content, taskName);
  if (!block.includes(`dir: ${dir}`)) {
    throw new Error(`task "${taskName}" must set dir: ${dir}`);
  }
}

/** Task block must contain all expected substrings. */
export function assertTaskContains(content: string, taskName: string, ...patterns: string[]): void {
  const block = extractTaskBlock(content, taskName);
  for (const pattern of patterns) {
    if (!block.includes(pattern)) {
      throw new Error(`task "${taskName}" must contain "${pattern}"`);
    }
  }
}

/** README must document every required root task name (FR-011). */
export function assertReadmeDocumentsTasks(readme: string, taskNames: string[]): void {
  for (const name of taskNames) {
    if (!readme.includes(name)) {
      throw new Error(`README.md must document task "${name}"`);
    }
  }
}
