# Quickstart & Validation: Emit Money Decimals as OpenAPI Strings

**Feature**: 012-openapi-money-strings | **Date**: 2026-06-16

This guide validates the feature end-to-end. It mirrors the CI `contract-type-drift` and `coverage-gate` jobs. See [contracts/openapi-money-contract.md](./contracts/openapi-money-contract.md) for the exact expected shapes and [data-model.md](./data-model.md) for the schema-filter behavior.

## Prerequisites

- .NET 8 SDK, Node 22, and a local PostgreSQL (or Docker for Testcontainers).
- From repo root: `c:\Users\dusti\split-rail`.

## 1. Backend: schema filter produces string money

Run the backend test suite (includes the new `SwaggerMoneySchemaTests`):

```bash
dotnet test apps/api.tests/split-rail-api.tests.csproj -c Release
```

**Expected**: `SwaggerMoneySchemaTests` passes — money fields in `/swagger/v1/swagger.json` are `type: string` with no `format: double`; nullable money stays nullable; `sortOrder` remains an integer.

## 2. Inspect the live OpenAPI schema (manual spot-check)

Start the API and fetch the schema:

```bash
dotnet run --project apps/api/split-rail-api.csproj --urls http://127.0.0.1:5000
# in another shell:
curl -s http://127.0.0.1:5000/swagger/v1/swagger.json | grep -A1 '"proformaValue"'
```

**Expected**: `proformaValue` shows `"type": "string"` (not `"number"`/`"format":"double"`).

## 3. Regenerate frontend types from the corrected schema

With the API running (step 2):

```bash
cd apps/web
npm ci
OPENAPI_URL=http://127.0.0.1:5000/swagger/v1/swagger.json npm run gen:api
```

**Expected**: `src/types/generated-api.ts` now types every money property as `string` (e.g. `proformaValue?: string`). Non-money numerics (e.g. `sortOrder?: number`) are unchanged.

## 4. Frontend type-check + build pass

```bash
cd apps/web
npm run build   # tsc -p tsconfig.app.json --noEmit && vite build
npm run test:coverage
```

**Expected**: build completes with 0 money-related type errors; Vitest suite passes with ≥80% coverage.

## 5. Drift check (matches CI)

Commit the regenerated types, then confirm no drift:

```bash
git add apps/web/src/types/generated-api.ts
# regenerate again against the running API, then:
git diff --exit-code apps/web/src/types/generated-api.ts
```

**Expected**: exit code 0 — committed types match a fresh regeneration (CI `contract-type-drift` passes).

## Success checklist

- [ ] `SwaggerMoneySchemaTests` passes (SC-001, SC-005)
- [ ] `swagger.json` money fields are `type: string` (SC-001)
- [ ] Regenerated `generated-api.ts` types money as `string` (SC-002)
- [ ] `npm run build` passes with no money type errors (SC-003)
- [ ] `git diff --exit-code generated-api.ts` is clean (SC-004)
- [ ] Backend + frontend coverage ≥80% (SC-006)
