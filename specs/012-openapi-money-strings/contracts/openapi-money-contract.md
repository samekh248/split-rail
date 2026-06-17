# Contract: Money Fields in OpenAPI / Generated Types

**Feature**: 012-openapi-money-strings | **Date**: 2026-06-16

This feature does not add or change any HTTP endpoint. Its "contract" is the **shape of money fields** in the published OpenAPI document (`/swagger/v1/swagger.json`) and the resulting generated TypeScript types. This document specifies the expected before/after shapes and the verifiable assertions.

## 1. OpenAPI schema shape

### Money field — required (e.g. `LineItemDto.proformaValue`)

Before (incorrect):

```json
"proformaValue": { "type": "number", "format": "double" }
```

After (required by this feature):

```json
"proformaValue": { "type": "string" }
```

### Money field — nullable/optional (e.g. a nullable QBO amount)

Before:

```json
"qboActualValue": { "type": "number", "format": "double", "nullable": true }
```

After:

```json
"qboActualValue": { "type": "string", "nullable": true }
```

### Non-money numeric field — UNCHANGED (e.g. `sortOrder`)

```json
"sortOrder": { "type": "integer", "format": "int32" }
```

**Rules**:
- Every schema whose underlying CLR type is `decimal`/`decimal?` MUST have `type: "string"` and MUST NOT carry `format: "double"` (or any numeric `format`).
- Nullability (`nullable: true`) and required-array membership MUST be preserved exactly as before.
- No `pattern`, `example`, or custom `format` is added (plain string).
- No `int`/`long`/`double`/`float` (non-decimal) field may be converted to `string`.

## 2. Generated TypeScript shape (`apps/web/src/types/generated-api.ts`)

After regeneration via `npm run gen:api`:

```ts
// required money
proformaValue?: string;   // (optional marker reflects schema requiredness; type is string, never number)
// nullable money
qboActualValue?: string | null;
// non-money numeric (unchanged)
sortOrder?: number;
```

**Rules**:
- 0 money properties typed as `number`.
- Non-money numeric properties remain `number`.
- File is generated only (no manual edits) — Constitution VI.

## 3. Verifiable assertions (map to Success Criteria)

| Assertion | Verified by | Maps to |
|-----------|-------------|---------|
| All `decimal` schemas are `type: string` (no `format: double`) | Backend xUnit test against `/swagger/v1/swagger.json` | SC-001, FR-001 |
| Nullable money stays nullable + string | Backend xUnit test | FR-002 |
| Non-money numeric fields unchanged | Backend xUnit test (e.g. `sortOrder` is integer) | SC-005, FR-004 |
| Generated TS types money = `string` | `npm run gen:api` output inspection | SC-002, FR-005 |
| Frontend type-check + build clean | `npm run build` (tsc `--noEmit` + vite) | SC-003, FR-006 |
| Contract/types stay in sync | CI `contract-type-drift` (`git diff --exit-code generated-api.ts`) | SC-004, FR-007 |
| ≥80% coverage (backend + frontend) | CI `coverage-gate` | SC-006, FR-008 |
