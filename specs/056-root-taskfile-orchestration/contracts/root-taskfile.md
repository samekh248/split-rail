# Contract: Root Taskfile Developer Orchestration

**Feature**: 056-root-taskfile-orchestration (SPLR-50) | **Date**: 2026-06-22

Defines the required tasks, delegation rules, and verification contract for repository-root `Taskfile.yml`. Implements FR-001–FR-013.

## File contract

| Property | Value |
|----------|-------|
| Path | `Taskfile.yml` (repository root) |
| Schema | Taskfile v3 (`version: '3'`) |
| Placeholder | MUST NOT contain `Hello, world` or placeholder-only `default` greeting (FR-012) |

## Required tasks

Every task MUST be listable via `task --list` and include a `desc:` field.

### API stack

| Task | `dir` | Command(s) | Notes |
|------|-------|------------|-------|
| `api:build` | (root) | `dotnet build apps/api/split-rail-api.csproj -c Release` | FR-001 |
| `api:test` | (root) | `dotnet test apps/api.tests/split-rail-api.tests.csproj -c Release` | FR-002 |
| `api:dev` | (root) | `dotnet run --project apps/api/split-rail-api.csproj --urls http://localhost:5000` | Long-running; `ASPNETCORE_ENVIRONMENT=Development` |

### Web stack

| Task | `dir` | Command(s) | Notes |
|------|-------|------------|-------|
| `web:dev` | `apps/web` | `npm run dev` | FR-003; Vite port 5173 |
| `web:build` | `apps/web` | `npm run build` | FR-004 |
| `web:test` | `apps/web` | `npm run test` | FR-005 |

### Cross-stack

| Task | `dir` | Command(s) | Notes |
|------|-------|------------|-------|
| `gen:api` | `apps/web` | `npm run gen:api` | FR-006; env `OPENAPI_URL` default `http://localhost:5000/swagger/v1/swagger.json` |
| `e2e` | `tests/e2e` | `npx playwright test` | FR-007; env defaults `PREVIEW_BASE_URL=http://localhost:5173`, `API_BASE_URL=http://localhost:5000` |
| `dev` | (root) | `task: api:dev` + `task: web:dev` with `run: parallel` | FR-008 |
| `build` | (root) | `task: api:build` then `task: web:build` | Aggregate convenience |
| `test` | (root) | `task: api:test` then `task: web:test` | Aggregate convenience |
| `default` | (root) | `task --list` | Discoverability |

### Optional (recommended)

| Task | Purpose |
|------|---------|
| `e2e:install` | `npx playwright install` in `tests/e2e` — documented browser setup |

## Delegation rules (FR-009)

1. Root tasks MUST NOT inline duplicate build/test logic that diverges from package scripts or CI commands.
2. Web tasks MUST set `dir: apps/web` rather than `cd apps/web && ...` when possible.
3. E2E task MUST set `dir: tests/e2e`.
4. Environment-specific values MUST use Taskfile `vars:` with overridable defaults (e.g., `OPENAPI_URL`, `PREVIEW_BASE_URL`).

## Error semantics (FR-010)

| Failure | Expected behavior |
|---------|-------------------|
| Missing `task` binary | Shell error before Taskfile loads; README documents install link |
| Missing .NET SDK | `dotnet` command fails with SDK-not-found message |
| Missing Node/npm | `npm` command fails in `apps/web` or `tests/e2e` |
| API not reachable for `gen:api` | `gen-api.mjs` / `openapi-typescript` exits non-zero; stderr mentions URL |
| E2E target unreachable | Playwright fails fast with navigation/connection error |
| DB unavailable during `dev` | API `dotnet run` exits non-zero; parallel task group fails |

## README contract (FR-011)

Root `README.md` MUST include a section listing:

1. **Prerequisites**: Task runner, .NET 8 SDK, Node 22, PostgreSQL (for `dev`).
2. **Task table**: all required tasks above with one-line description and prerequisites column.
3. **Quick flows**:
   - First-time: `npm ci` in `apps/web` and `tests/e2e` (document paths).
   - Daily dev: `task dev`.
   - Verify all: `task build && task test`.
   - Type sync: `task gen:api` (with API running).
   - E2E: `task e2e:install` (once) then `task e2e` (with stack running).

## Automated verification contract (FR-013)

**Test file**: `apps/web/tests/deploy/taskfileContract.test.ts`  
**Helper**: `apps/web/src/deploy/assertTaskfileContract.ts`

### Required assertions

| ID | Assertion |
|----|-----------|
| C1 | `Taskfile.yml` exists at repository root |
| C2 | Placeholder greeting absent |
| C3 | Each required task name present (`api:build`, `api:test`, `api:dev`, `web:dev`, `web:build`, `web:test`, `gen:api`, `e2e`, `dev`) |
| C4 | `api:build` references `apps/api/split-rail-api.csproj` |
| C5 | `api:test` references `apps/api.tests/split-rail-api.tests.csproj` |
| C6 | `web:*` tasks set `dir: apps/web` and invoke `npm run` |
| C7 | `gen:api` sets `dir: apps/web` and invokes `gen:api` |
| C8 | `e2e` sets `dir: tests/e2e` and invokes `playwright test` |
| C9 | `dev` uses `run: parallel` and references `api:dev` and `web:dev` |
| C10 | `gen:api` defines `OPENAPI_URL` default pointing to port 5000 swagger |

### Coverage (FR-014, Constitution III)

- ≥80.0% line/branch coverage on `assertTaskfileContract.ts` and `taskfileContract.test.ts`.
- No backend C# changes expected; backend coverage gate unchanged.

## CI relationship

This contract does **not** modify `.github/workflows/ci.yml`. CI remains authoritative; root tasks mirror CI commands for local parity (spec Assumption).
