# Tasks: Emit Money Decimals as OpenAPI Strings + Regenerate TS Types

**Input**: Design documents from `/specs/012-openapi-money-strings/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/openapi-money-contract.md, quickstart.md

**Tests**: REQUIRED per Constitution III. Every user story phase includes automated test tasks (write tests first, ensure they fail before implementation). Final Polish phase includes ≥80.0% coverage gate.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story label (US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Backend**: `apps/api/`, `apps/api.tests/`
- **Frontend**: `apps/web/`
- **CI reference**: `.github/workflows/ci.yml` (`contract-type-drift` job)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm environment and design context before code changes

- [X] T001 Verify feature branch `012-openapi-money-strings` is checked out and `.specify/feature.json` points to `specs/012-openapi-money-strings`
- [X] T002 Review design artifacts in `specs/012-openapi-money-strings/` (plan.md, research.md, contracts/openapi-money-contract.md, quickstart.md)
- [X] T003 [P] Confirm runtime money serialization is unchanged in `apps/api/Serialization/DecimalStringJsonConverter.cs` and global registration in `apps/api/Program.cs` `AddJsonOptions`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Baseline verification — no user story work until runtime/contract gap is understood

**⚠️ CRITICAL**: No user story implementation until this phase is complete

- [X] T004 Run `dotnet build apps/api/split-rail-api.csproj -c Release` to confirm backend compiles before schema changes
- [X] T005 [P] Fetch live `swagger.json` from a running API (or inspect current committed state) and record at least one money field still typed as `number`/`format: double` (e.g. `LineItemDto.proformaValue`) per `specs/012-openapi-money-strings/contracts/openapi-money-contract.md`
- [X] T006 [P] Confirm `apps/web/scripts/gen-api.mjs` reads `OPENAPI_URL` (default `http://localhost:5000/swagger/v1/swagger.json`) and outputs `apps/web/src/types/generated-api.ts`

**Checkpoint**: Baseline gap documented — user story work can begin

---

## Phase 3: User Story 1 - Published contract describes money as strings (Priority: P1) 🎯 MVP

**Goal**: Every `decimal`/`decimal?` property in `/swagger/v1/swagger.json` is `type: string` with no `format: double`; non-money numerics unchanged

**Independent Test**: `dotnet test` with new `SwaggerMoneySchemaTests` passes; manual `curl` of `swagger.json` shows `proformaValue` as `"type": "string"`

### Tests for User Story 1 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T007 [P] [US1] Add failing integration test class `SwaggerMoneySchemaTests` in `apps/api.tests/Integration/SwaggerMoneySchemaTests.cs` extending `IntegrationTestBase` — GET `/swagger/v1/swagger.json`, assert `LineItemDto`/`LedgerSummaryDto` money properties are `type: string` with no `format: double`, nullable money stays nullable, and `sortOrder` remains integer/number (SC-001, SC-005, FR-004)
- [X] T008 [P] [US1] Add unit test `MoneyDecimalSchemaFilterTests` in `apps/api.tests/Unit/MoneyDecimalSchemaFilterTests.cs` — invoke `MoneyDecimalSchemaFilter` against `decimal` and `decimal?` schemas and assert `Type == "string"` and `Format == null` (coverage for filter logic)

### Implementation for User Story 1

- [X] T009 [US1] Create `MoneyDecimalSchemaFilter` implementing `ISchemaFilter` in `apps/api/Serialization/MoneyDecimalSchemaFilter.cs` — normalize `Nullable.GetUnderlyingType(context.Type)`; when `decimal`, set `schema.Type = "string"` and `schema.Format = null`; leave other types unchanged (FR-001, FR-003)
- [X] T010 [US1] Register schema filter in `apps/api/Program.cs` inside `AddSwaggerGen`: `c.SchemaFilter<MoneyDecimalSchemaFilter>()`
- [X] T011 [US1] Run `dotnet test apps/api.tests/split-rail-api.tests.csproj -c Release` and confirm `SwaggerMoneySchemaTests` and `MoneyDecimalSchemaFilterTests` pass

**Checkpoint**: User Story 1 complete — published OpenAPI contract describes all money as plain strings

---

## Phase 4: User Story 2 - Frontend contracts type money as strings (Priority: P1)

**Goal**: Regenerate `generated-api.ts` from corrected schema; frontend type-check and build pass with 0 money type errors

**Independent Test**: `npm run gen:api` produces money as `string`; `npm run build` in `apps/web` succeeds

**Depends on**: Phase 3 (corrected `swagger.json`)

### Tests for User Story 2 (REQUIRED) ⚠️

- [X] T012 [P] [US2] Run `npm run test` in `apps/web` before regen to capture baseline (existing ledger/money tests in `apps/web/tests/ledger/` and `apps/web/tests/lib/money.test.ts` should already use string literals)
- [X] T013 [US2] After regen, run `npm run build` in `apps/web` — if money-related tsc errors appear, fix usages in affected files under `apps/web/src/` (e.g. `apps/web/src/components/ledger/LedgerRow.tsx`, `apps/web/src/pages/EventLedgerPage.tsx`) without hand-editing `generated-api.ts` (Constitution VI)

### Implementation for User Story 2

- [X] T014 [US2] Start API locally (`dotnet run --project apps/api/split-rail-api.csproj --urls http://127.0.0.1:5000`) and regenerate types: `OPENAPI_URL=http://127.0.0.1:5000/swagger/v1/swagger.json npm run gen:api` in `apps/web/` → updates `apps/web/src/types/generated-api.ts` (FR-005)
- [X] T015 [US2] Verify regenerated `apps/web/src/types/generated-api.ts` — all money properties (e.g. `proformaValue`, `grossRevenue`, QBO amounts) typed as `string`; non-money fields like `sortOrder` remain `number` (SC-002, SC-005)
- [X] T016 [US2] Run `npm run build` in `apps/web` and confirm 0 money-related type errors (SC-003, FR-006)
- [X] T017 [US2] Run `npm run test` in `apps/web` and confirm ledger/money tests still pass

**Checkpoint**: User Story 2 complete — frontend contracts and build align with string money payloads

---

## Phase 5: User Story 3 - Contract/type drift guard passes in CI (Priority: P2)

**Goal**: Committed generated types stay synchronized with live OpenAPI; existing `contract-type-drift` CI job passes

**Independent Test**: Local drift check (`gen:api` then `git diff --exit-code apps/web/src/types/generated-api.ts`) exits 0

**Depends on**: Phase 4 (regenerated and build-clean `generated-api.ts`)

### Tests for User Story 3 (REQUIRED) ⚠️

- [X] T018 [US3] Re-run `OPENAPI_URL=http://127.0.0.1:5000/swagger/v1/swagger.json npm run gen:api` in `apps/web/` and execute `git diff --exit-code apps/web/src/types/generated-api.ts` — must exit 0 (mirrors `.github/workflows/ci.yml` `contract-type-drift` step, SC-004)
- [X] T019 [US3] Run full local drift pipeline: API running → `npm ci && npm run gen:api && npm run build` in `apps/web/` with `OPENAPI_URL` set — must succeed without diff (FR-007)

### Implementation for User Story 3

- [X] T020 [US3] Stage and commit `apps/web/src/types/generated-api.ts` plus backend changes (`apps/api/Serialization/MoneyDecimalSchemaFilter.cs`, `apps/api/Program.cs`, test files) so CI drift check has a committed baseline
- [X] T021 [US3] Confirm no manual edits to `apps/web/src/types/generated-api.ts` outside regeneration workflow (Constitution VI)

**Checkpoint**: User Story 3 complete — contract-type-drift gate will pass on PR

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Coverage gate, full validation, documentation alignment

- [X] T022 [P] Run backend coverage: `dotnet test apps/api.tests/split-rail-api.tests.csproj -c Release --collect:"XPlat Code Coverage" --results-directory coverage/backend --settings apps/api.tests/coverage.runsettings`
- [X] T023 [P] Run frontend coverage: `npm run test:coverage` in `apps/web/`
- [X] T024 Verify ≥80.0% line/branch coverage independently for backend (cobertura from T022) and frontend (lcov from T023); missing or unparseable reports FAIL (SC-006, FR-008, Constitution III)
- [X] T025 Execute end-to-end validation from `specs/012-openapi-money-strings/quickstart.md` (swagger inspect → gen:api → build → drift diff)
- [X] T026 [P] Update `specs/012-openapi-money-strings/quickstart.md` only if local commands differ from documented steps after implementation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — blocks user stories
- **User Story 1 (Phase 3)**: Depends on Foundational — **MVP**; blocks US2/US3
- **User Story 2 (Phase 4)**: Depends on US1 (needs corrected swagger)
- **User Story 3 (Phase 5)**: Depends on US2 (needs committed regenerated types)
- **Polish (Phase 6)**: Depends on US1–US3

### User Story Dependencies

```text
US1 (OpenAPI string money) → US2 (regen TS + build) → US3 (drift CI) → Polish
```

- **US1**: Independent after Foundational — no dependency on US2/US3
- **US2**: Requires US1 complete (schema filter registered and tests green)
- **US3**: Requires US2 complete (generated file committed and build-clean)

### Within Each User Story

- Tests written and failing **before** implementation (T007–T008 before T009–T010)
- Schema filter before swagger registration before test verification
- Regenerate types before build verification before drift check

### Parallel Opportunities

- **Phase 1**: T003 parallel with T001/T002
- **Phase 2**: T005 ∥ T006 (after T004)
- **Phase 3 tests**: T007 ∥ T008 (both fail before T009)
- **Phase 6**: T022 ∥ T023; T026 parallel with T024/T025 after core work done

---

## Parallel Example: User Story 1

```bash
# Launch failing tests together (before implementation):
# T007: apps/api.tests/Integration/SwaggerMoneySchemaTests.cs
# T008: apps/api.tests/Unit/MoneyDecimalSchemaFilterTests.cs

# Then sequentially:
# T009 → T010 → T011
```

---

## Parallel Example: User Story 2 + 3

```bash
# After US1 green:
dotnet run --project apps/api/split-rail-api.csproj --urls http://127.0.0.1:5000 &
cd apps/web && OPENAPI_URL=http://127.0.0.1:5000/swagger/v1/swagger.json npm run gen:api
npm run build && npm run test
git diff --exit-code src/types/generated-api.ts
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1 (schema filter + swagger tests)
4. **STOP and VALIDATE**: `SwaggerMoneySchemaTests` green; spot-check `swagger.json`
5. Demo: contract now correctly describes money as strings

### Incremental Delivery

1. Setup + Foundational → baseline documented
2. US1 → swagger money = string (**MVP**)
3. US2 → regen TS + build clean
4. US3 → drift check passes
5. Polish → coverage ≥80% + quickstart validation

### Suggested MVP Scope

**User Story 1 only** (Phase 3, tasks T007–T011) — fixes root cause in OpenAPI without frontend regen. Full feature completion requires US2 + US3.

---

## Notes

- Do **not** hand-edit `apps/web/src/types/generated-api.ts` except via `npm run gen:api`
- Do **not** add per-field Swagger attributes on DTOs — blanket `decimal` filter only (FR-003)
- Runtime JSON serialization unchanged — schema metadata only
- `contract-type-drift` CI job already exists in `.github/workflows/ci.yml` — no new CI authoring (FR-007)
- Commit after each phase checkpoint
