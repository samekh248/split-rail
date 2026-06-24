# Research: Root Taskfile Orchestrating Both Stacks

**Feature**: 056-root-taskfile-orchestration (SPLR-50) | **Date**: 2026-06-22

## R1 — Task runner technology

**Decision**: Use [Taskfile.dev](https://taskfile.dev/) v3 at repository root (`Taskfile.yml`), replacing the existing placeholder.

**Rationale**: SPLR-50 and TDD §10.1 explicitly require a root-level Taskfile. The repo already ships a placeholder with the Task schema comment. Task supports cross-platform orchestration, `dir:` for per-package working directories, parallel execution (`run: parallel`), and variable defaults — sufficient for monorepo glue without new dependencies.

**Alternatives considered**:
- **npm workspaces root scripts** — web and e2e are separate packages; API is .NET. Would require awkward `npm run` wrappers around `dotnet` and split orchestration across two ecosystems.
- **Makefile** — weaker Windows ergonomics; team already standardized on Task per TDD.
- **Just / Mage** — not referenced in project docs; Taskfile placeholder already present.

---

## R2 — Task naming and catalog layout

**Decision**: Colon-namespaced tasks mirroring stack ownership:

| Task | Delegates to |
|------|----------------|
| `api:build` | `dotnet build apps/api/split-rail-api.csproj -c Release` |
| `api:test` | `dotnet test apps/api.tests/split-rail-api.tests.csproj -c Release` |
| `api:dev` | `dotnet run --project apps/api/split-rail-api.csproj --urls http://localhost:5000` |
| `web:dev` | `npm run dev` in `apps/web` |
| `web:build` | `npm run build` in `apps/web` |
| `web:test` | `npm run test` in `apps/web` |
| `gen:api` | `npm run gen:api` in `apps/web` with `OPENAPI_URL` defaulting to `http://localhost:5000/swagger/v1/swagger.json` |
| `e2e` | `npx playwright test` in `tests/e2e` |
| `dev` | parallel `api:dev` + `web:dev` |
| `build` | sequential `api:build` then `web:build` |
| `test` | sequential `api:test` then `web:test` |
| `default` | `task --list` (discoverability) |

**Rationale**: Matches npm script colon conventions (`gen:api` already exists in `apps/web`). README table maps 1:1 to task names. Aggregate `build`/`test` tasks reduce command count for SC-001 without hiding individual stack entry points.

**Alternatives considered**:
- **Flat names** (`api-build`) — less consistent with existing `gen:api` naming.
- **Only aggregates, no per-stack tasks** — violates FR-001–FR-005 explicit per-stack commands.

---

## R3 — Combined local development (`dev`)

**Decision**: Parent task `dev` runs `api:dev` and `web:dev` with `run: parallel`.

**Rationale**: Task v3 native parallel mode keeps both long-running processes attached to one terminal session. Vite already proxies `/api` → `http://localhost:5000` (`apps/web/vite.config.ts`); API default URL matches existing quickstarts.

**Prerequisites documented in README**:
- PostgreSQL reachable with `DB_PASSWORD` / `ASPNETCORE_ENVIRONMENT=Development` (same as CI and existing quickstarts).
- `npm ci` run once in `apps/web` before first `web:dev`.

**Alternatives considered**:
- **Process manager (concurrently, foreman)** — extra dependency; Task parallel mode is built-in.
- **Docker Compose dev stack** — out of SPLR-50 scope; does not replace per-stack local dev.

---

## R4 — Type generation (`gen:api`)

**Decision**: Thin wrapper — `dir: apps/web`, env `OPENAPI_URL` defaulting to live swagger at port 5000, invokes existing `npm run gen:api` (`apps/web/scripts/gen-api.mjs`).

**Rationale**: FR-009 requires delegation, not duplication. CI `contract-type-drift` already assumes a running API exporting swagger; local workflow matches: start API (`task api:dev` or `task dev`) then `task gen:api`. Script fails with inherited stderr if swagger is unreachable (FR-010).

**Alternatives considered**:
- **Offline swagger export in Taskfile** (`dotnet swagger tofile` before gen) — mirrors Docker preview build but adds complexity and duplicates Dockerfile contract stage; defer to optional future `gen:api:offline` if needed.
- **Always start API inside gen:api** — background process management in YAML is fragile cross-platform; parallel `dev` is cleaner.

---

## R5 — End-to-end tests (`e2e`)

**Decision**: Root `e2e` task runs from `tests/e2e` with:
- `precondition` or documented prerequisite: `npm ci` in `tests/e2e` (first run) and `npx playwright install` (documented in README, optional `e2e:install` task).
- Env defaults: `PREVIEW_BASE_URL=http://localhost:5173`, `API_BASE_URL=http://localhost:5000` (matches `playwright.config.ts` and CI e2e-matrix).

**Rationale**: FR-007 requires root exposure only; SPLR-20 owns E2E scenarios and gates. Root task delegates to existing `playwright test` without provisioning preview infrastructure.

**Alternatives considered**:
- **Root task starts API + web + runs E2E** — duplicates CI e2e-matrix setup (~80 lines); out of scope for orchestration-only feature. Document that user runs `task dev` or CI preview first.

---

## R6 — Contract verification (Constitution III)

**Decision**: Vitest contract tests in `apps/web/tests/deploy/taskfileContract.test.ts` backed by `apps/web/src/deploy/assertTaskfileContract.ts` — parse/assert `Taskfile.yml` text for required task names, delegation targets (`dir`, `dotnet`, `npm run`), parallel `dev`, and absence of placeholder greeting.

**Rationale**: Follows established deploy contract pattern (`dockerfileContract.test.ts`, `assertCloudSqlDeployContract.ts`). Taskfile is YAML config, not product UI — frontend Vitest location matches other infra contract tests. No backend C# changes expected → backend coverage gate unchanged; ≥80% on new assertion helper + test file.

**Alternatives considered**:
- **Shell integration tests executing every task** — slow, requires full toolchain in unit test job; contract parsing is faster and deterministic.
- **Dedicated `tests/taskfile/` package** — unnecessary new package for one file.

---

## R7 — Constitution §X (dual-platform scripts)

**Decision**: No paired `.sh`/`.ps1` under `deploy/` for this feature. Taskfile is the cross-platform orchestration layer itself (Go binary, works on Windows/macOS/Linux).

**Rationale**: §X applies to operator scripts under `deploy/`. `Taskfile.yml` is root developer tooling, exempt per spec Assumptions.

---

## R8 — README documentation

**Decision**: Expand root `README.md` with:
1. Prerequisites (`task`, .NET 8, Node 22, PostgreSQL for dev).
2. Task catalog table (name, description, prerequisites).
3. Quick-start flows: first-time setup, daily dev (`task dev`), build/test all (`task build`, `task test`), type gen, E2E.

**Rationale**: FR-011 and SC-002 require README-only discoverability. Keep CI workflow files unchanged (spec Assumption).
