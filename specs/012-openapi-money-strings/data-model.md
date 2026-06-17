# Phase 1 Data Model: Emit Money Decimals as OpenAPI Strings

**Feature**: 012-openapi-money-strings | **Date**: 2026-06-16

This feature introduces **no new persisted entities** and **no database migrations**. It only changes how existing `decimal` money properties are *described* in the OpenAPI contract and *typed* in the generated frontend contract. The "entities" below are contract/serialization concepts.

## Concept: Money property

- **Definition**: Any DTO property whose CLR type is `decimal` or `decimal?`. Per Constitution I, `decimal` is used exclusively for monetary values.
- **Runtime representation** (unchanged): fixed-precision string, formatted `F2`, invariant culture, e.g. `"1250.00"`, `"0.00"`, `"-45.50"`; nullable money serializes to `null` when absent.
- **Contract representation** (changed by this feature): OpenAPI `type: string` with no numeric `format`. Optionality preserved — required money stays required; nullable money stays optional/nullable.
- **Generated TS representation** (changed by this feature): `string` (required) or `string` on an optional property (`?:`).

### Known money properties in scope (illustrative, not exhaustive — rule is type-based)

| DTO | Property | CLR type | Optionality |
|-----|----------|----------|-------------|
| `LineItemDto` | `proformaValue`, `settlementValue`, `qboActualValue`, `variance` | `decimal` | required |
| `BlockTotalsDto` | `proforma`, `settlement`, `qboActual` | `decimal` | required |
| `LedgerSummaryDto` | `grossRevenue`, `totalDeductions`, `netShowRevenue` | `decimal` | required |
| `EventArtistDto` | `baseGuarantee`, `backendPercentage`, `taxWithholdingPercentage`, `calculatedNetPayout` | `decimal` | required |
| `CreateLineItemRequest` / `UpdateLineItemRequest` | `proformaValue`, `settlementValue` | `decimal` | required |
| `CreateArtistRequest` / `UpdateArtistRequest` | `baseGuarantee`, `backendPercentage`, `taxWithholdingPercentage` | `decimal` | required |
| QBO DTOs (`apps/api/DTOs/Qbo`) | money/amount fields | `decimal` / `decimal?` | mixed |

> The schema filter applies to **all** `decimal`/`decimal?` schemas, so this table need not be maintained manually; new money fields are covered automatically.

## Concept: Non-money numeric property (must NOT change)

- **Definition**: Genuinely numeric DTO properties that are NOT `decimal` — e.g. `sortOrder` / `performanceOrder` (`int`), counts (`transactionsProcessed`, `unmappedCount`), `expiresIn` (seconds).
- **Contract representation**: remains `type: integer` / `type: number` as before.
- **Validation rule**: SC-005 — zero of these may be converted to `string`.

## Concept: Schema filter (`MoneyDecimalSchemaFilter`)

- **Role**: Swashbuckle `ISchemaFilter` applied during OpenAPI document generation.
- **Behavior**:
  - Input: a generated `OpenApiSchema` plus `SchemaFilterContext`.
  - If `context.Type` is `decimal` or `Nullable<decimal>` → set `schema.Type = "string"`, `schema.Format = null`.
  - Otherwise → leave schema unchanged.
- **Invariants**: idempotent; does not alter `Nullable`/required metadata; affects only schema typing, never runtime serialization.

## State transitions

None. This feature is stateless metadata configuration.
