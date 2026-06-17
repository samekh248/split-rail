# Implementation Plan: Emit Money Decimals as OpenAPI Strings + Regenerate TS Types

**Branch**: `012-openapi-money-strings` | **Date**: 2026-06-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/012-openapi-money-strings/spec.md`

## Summary

Runtime JSON already serializes money as fixed-precision decimal strings (via `DecimalStringJsonConverter` / `NullableDecimalStringJsonConverter`), but Swashbuckle still describes `decimal` DTO properties as `type: number, format: double` in `swagger.json`. This causes the generated frontend contract (`apps/web/src/types/generated-api.ts`) to type money as `number`, contradicting the string payloads and breaking the type-check. The fix registers a Swashbuckle schema customization that maps every `decimal`/`decimal?` schema to OpenAPI `type: string` (blanket rule, per clarification), regenerates the frontend types from the corrected schema, and ensures the project builds and the existing `contract-type-drift` CI job passes.

## Technical Context

**Language/Version**: C# / .NET 8 (backend `apps/api`); TypeScript 5.7 + React 18 (frontend `apps/web`)

**Primary Dependencies**: Swashbuckle.AspNetCore 6.x (OpenAPI schema generation), `openapi-typescript` 7.4.4 (TS type generation via `npm run gen:api`)

**Storage**: PostgreSQL via EF Core 8 (not modified by this feature)

**Testing**: xUnit + `WebApplicationFactory<Program>` + Testcontainers (backend); Vitest + React Testing Library (frontend); ≥80.0% line/branch coverage enforced independently per stack via CI (missing/unparseable coverage reports treated as failing)

**Target Platform**: Linux server (containerized API) + modern browsers (SPA)

**Project Type**: Web application (separate backend + frontend)

**Performance Goals**: N/A — contract/serialization metadata change; no runtime hot path affected

**Constraints**: No floating-point types for money (Constitution I); frontend data contracts MUST be imported only from generated `generated-api.ts` (Constitution VI); ≥80.0% line/branch coverage on backend and frontend independently

**Scale/Scope**: ~10 DTO records containing `decimal`/`decimal?` money properties across Ledger and QBO contracts; one schema filter class; one regenerated type file

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Relevance | Status |
|-----------|-----------|--------|
| I. Core Mathematical Axioms | Reinforces: money described as `decimal`→`string`, never float/`number`. No floating-point math introduced. | PASS |
| II. Multi-Tenant Isolation | No new data queries or persistence access. | N/A |
| III. Engineering Rigor & Quality Gates | New backend code (schema filter) accompanied by xUnit tests asserting `swagger.json` types; frontend covered by existing Vitest suites that already consume string money; ≥80% coverage per stack. | PASS (with tests) |
| IV. QBO Integration Boundaries | No QBO HTTP mutations; QBO DTOs only have their schema type relabeled. | N/A |
| V. Ledger State Machine & Immutability | No changes to event/line-item state or settlement snapshots. | N/A |
| VI. Polyglot Contract & Serialization | Core of the feature: DTO change is contract-only, types regenerated from `swagger.json`, no hand-authored TS mirrors. | PASS |
| VII. EF Core Axioms | No EF query changes. | N/A |
| VIII. Exception Governance & Logging | No new exception paths or logging; no PII/secrets. | N/A |

**Result**: PASS. No violations; Complexity Tracking not required.

## Project Structure

### Documentation (this feature)

```text
specs/012-openapi-money-strings/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── openapi-money-contract.md
├── checklists/
│   └── requirements.md  # Spec quality checklist (from /speckit-specify)
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
apps/api/
├── Serialization/
│   ├── DecimalStringJsonConverter.cs        # existing runtime converters (unchanged)
│   └── MoneyDecimalSchemaFilter.cs          # NEW: ISchemaFilter mapping decimal → string
├── Program.cs                               # MODIFIED: register .SchemaFilter<MoneyDecimalSchemaFilter>()
└── DTOs/                                    # unchanged (decimal money props already use runtime converter)

apps/api.tests/
└── Integration/
    └── SwaggerMoneySchemaTests.cs           # NEW: assert swagger.json money fields are type:string

apps/web/
└── src/types/generated-api.ts              # REGENERATED via npm run gen:api (money → string)
```

**Structure Decision**: Existing two-app web layout (`apps/api` backend, `apps/web` frontend). The change is localized to the backend OpenAPI configuration (one new schema filter + one-line registration), a new backend test, and the regenerated frontend type file. No new projects or directories beyond the single filter and test file.

## Complexity Tracking

> No Constitution Check violations. Section intentionally empty.
