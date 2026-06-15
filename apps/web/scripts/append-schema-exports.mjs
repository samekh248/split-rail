import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const decimalFieldNames = new Set([
  'proforma',
  'settlement',
  'qboActual',
  'proformaValue',
  'settlementValue',
  'qboActualValue',
  'variance',
  'baseGuarantee',
  'backendPercentage',
  'taxWithholdingPercentage',
  'calculatedNetPayout',
  'grossRevenue',
  'totalDeductions',
  'netShowRevenue',
  'amount',
  'newSettlementValue',
  'computedNetPayout',
]);

function normalizeDecimalStringFields(content) {
  const schemasStart = content.indexOf('    schemas: {');
  const schemasEnd = content.indexOf('    responses: never;');
  if (schemasStart < 0 || schemasEnd < 0) {
    return content;
  }

  const before = content.slice(0, schemasStart);
  let schemas = content.slice(schemasStart, schemasEnd);
  const after = content.slice(schemasEnd);

  const replaceDecimalNumber = (match, indent, fieldName, optional) =>
    decimalFieldNames.has(fieldName)
      ? `${indent}${fieldName}${optional} string;`
      : match;

  schemas = schemas.replace(
    /\/\*\* Format: double \*\/\r?\n(\s+)([A-Za-z0-9_]+)(\?:|:) number;/g,
    replaceDecimalNumber,
  );

  schemas = schemas.replace(
    /^(\s+)([A-Za-z0-9_]+)(\?:|:) number;/gm,
    replaceDecimalNumber,
  );

  return before + schemas + after;
}

export function appendSchemaExports(content) {
  const normalized = normalizeDecimalStringFields(content);
  const schemasMatch = normalized.match(
    /schemas:\s*\{([\s\S]*?)\n\s*\};\s*\n\s*responses:\s*never;/,
  );
  if (!schemasMatch) {
    throw new Error('Could not find OpenAPI schema block in generated-api.ts');
  }

  const schemaNames = [...schemasMatch[1].matchAll(/^        (\w+): \{/gm)].map(
    (match) => match[1],
  );

  const schemaExports = schemaNames
    .map((name) => `export type ${name} = components['schemas']['${name}'];`)
    .join('\n');

  const syntheticExports = [
    "export type DealType = 'guarantee' | 'door_split' | 'custom';",
    "export type EventStatus = 'PRE_SHOW' | 'SETTLED' | 'RECONCILED';",
  ].join('\n');

  const withoutTrailingExports = normalized
    .replace(/\n*export type \w+ = components\['schemas'\]\['\w+'\];\n*/g, '\n')
    .replace(
      /\n*export type DealType = [^\n]+\nexport type EventStatus = [^\n]+\n?/g,
      '\n',
    )
    .trimEnd();

  return `${withoutTrailingExports}\n\n${schemaExports}\n${syntheticExports}\n`;
}

export function appendSchemaExportsFile(outFile) {
  const generated = readFileSync(outFile, 'utf8');
  writeFileSync(outFile, appendSchemaExports(generated));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const outFile = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    '..',
    'src',
    'types',
    'generated-api.ts',
  );
  appendSchemaExportsFile(outFile);
  console.log(`Appended schema exports to ${outFile}`);
}
