import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const defaultUrl = 'http://localhost:5000/swagger/v1/swagger.json';
const openApiUrl = process.env.OPENAPI_URL ?? defaultUrl;
const outFile = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'src',
  'types',
  'generated-api.ts',
);

console.log(`Generating API types from ${openApiUrl} → ${outFile}`);
execSync(`npx openapi-typescript "${openApiUrl}" -o "${outFile}"`, {
  stdio: 'inherit',
  shell: true,
});
