# Phase 0 Research: Emit Money Decimals as OpenAPI Strings

**Feature**: 012-openapi-money-strings | **Date**: 2026-06-16

This feature has no open `NEEDS CLARIFICATION` items (resolved during `/speckit-clarify`). Research below records the technical decisions that shape Phase 1 design.

## Decision 1 — Mechanism for mapping `decimal` to OpenAPI `string`

**Decision**: Implement a Swashbuckle `ISchemaFilter` (`MoneyDecimalSchemaFilter`) that, when the schema's underlying CLR type is `decimal` or `decimal?`, sets `schema.Type = "string"` and clears `schema.Format` (removing `double`). Register it in `Program.cs` via `c.SchemaFilter<MoneyDecimalSchemaFilter>()` inside `AddSwaggerGen`.

**Rationale**:
- Matches the approach named in the source issue (SPLR-27) and is robust against both required and nullable decimals because the filter inspects `context.Type` (using `Nullable.GetUnderlyingType` to normalize `decimal?`).
- Blanket "every `decimal` → string" rule was chosen in clarification (Constitution I guarantees money is the only use of `decimal`), so no allow-list or naming heuristic is needed; future money fields are covered automatically (FR-003).
- Keeps runtime serialization untouched — the filter only affects the published schema metadata.

**Alternatives considered**:
- `c.MapType<decimal>(() => new OpenApiSchema { Type = "string" })` (+ `MapType<decimal?>`): simpler, but requires registering two type maps and is slightly less explicit about intent; `MapType` also short-circuits schema generation which can interact awkwardly with nullability. Kept as a fallback if the schema filter proves insufficient.
- Per-property `[SwaggerSchema]` or custom attributes on each DTO: rejected — violates FR-003 (manual per-field annotation) and is error-prone for future fields.

## Decision 2 — Plain `string` with no format/pattern/example

**Decision**: Emit `type: string` only; do not add `format`, `pattern`, or `example` to money schemas.

**Rationale**: Clarification selected the minimal change. The acceptance criteria only require `type: string`; the frontend treats money as opaque decimal strings parsed via existing `money` helpers. Adding a regex/pattern risks over-constraining the contract and creating drift if the serialization format changes.

**Alternatives considered**: Adding `example: "1250.00"` and a decimal `pattern` for integrator clarity — deferred; not required and increases surface area.

## Decision 3 — Backend verification strategy

**Decision**: Add an xUnit integration test (`SwaggerMoneySchemaTests`) using the existing `WebApplicationFactory<Program>` + Testcontainers base to GET `/swagger/v1/swagger.json`, parse it, and assert that representative money fields (e.g. `LineItemDto.proformaValue`, `LedgerSummaryDto.grossRevenue`, QBO amount fields) are `type: string` and carry no numeric `format`, while a known numeric field (e.g. `sortOrder`) remains `type: integer`/`number`.

**Rationale**:
- Exercises the real Swashbuckle pipeline end-to-end (same JSON the `gen:api` step consumes), directly validating FR-001, FR-002, FR-004 and SC-001/SC-005.
- Reuses the established integration-test harness (`IntegrationTestBase`), keeping coverage within the CI-enforced ≥80% gate.
- A lighter-weight unit test that resolves `ISwaggerProvider` and inspects the `OpenApiDocument` is an acceptable alternative if container startup cost is a concern.

**Alternatives considered**: Snapshot-testing the entire `swagger.json` — rejected as brittle (unrelated schema churn breaks it).

## Decision 4 — Frontend type regeneration and drift

**Decision**: Regenerate `apps/web/src/types/generated-api.ts` via `npm run gen:api` against the running API, commit the result, and confirm `npm run build` (tsc `--noEmit` + vite) passes. The existing `contract-type-drift` CI job (start API → `gen:api` → `build` → `git diff --exit-code generated-api.ts`) then validates synchronization (FR-005, FR-006, FR-007).

**Rationale**:
- Constitution VI mandates types flow from `swagger.json`; the drift job already enforces this and is the SC-004 gate. No new CI authoring is needed (clarification).
- The frontend code/tests already use string money literals, so regeneration should resolve type errors rather than require source edits; any residual usage that assumed `number` will be fixed minimally.

**Alternatives considered**: Hand-editing `generated-api.ts` — strictly prohibited by Constitution VI.

## Open Risks

- **Nullable decimal handling**: confirm the filter normalizes `decimal?` (via `Nullable.GetUnderlyingType`) so nullable money fields become optional strings, not numbers (Edge Case: nullable money fields).
- **Non-money decimals**: none expected in the API surface (Constitution I), but the backend test should assert at least one genuine numeric field stays numeric to catch over-conversion (SC-005).
- **Committed vs untracked generated file**: `generated-api.ts` is currently untracked; it must be committed so the drift `git diff` is meaningful and the frontend build resolves imports.
