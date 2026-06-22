# Data Model: Root Task Runner Orchestrating Both Stacks

**Feature**: 056-root-taskfile-orchestration (SPLR-50) | **Date**: 2026-06-22

This feature is **developer-tooling only** — no database tables, API DTOs, or domain entities. The model describes the **root command catalog** and its relationships to existing per-package workflows.

## Entities

### RootTaskCatalog

| Field | Type | Description |
|-------|------|-------------|
| `taskfilePath` | path | `Taskfile.yml` at repository root |
| `version` | string | Taskfile schema version (`'3'`) |
| `defaultTask` | string | `default` → lists available tasks |
| `tasks` | TaskDefinition[] | All exposed root commands |

**Validation**:
- MUST NOT contain placeholder greeting content after feature completion (FR-012).
- MUST include every task listed in SPLR-50 scope (SC-003).

---

### TaskDefinition

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Colon-namespaced identifier (e.g., `api:build`, `gen:api`) |
| `description` | string | Short human-readable purpose (shown by `task --list`) |
| `workingDirectory` | path? | Optional `dir:` override (`apps/web`, `tests/e2e`) |
| `commands` | string[] | Underlying shell commands or nested `task:` references |
| `runMode` | enum | `default` (sequential) or `parallel` |
| `environment` | map | Optional env vars (e.g., `OPENAPI_URL`, `PREVIEW_BASE_URL`) |

**Relationships**: Each TaskDefinition delegates to exactly one StackWorkflow or CrossStackWorkflow (FR-009).

**State transitions** (invocation):

```text
[idle] → invoked → [running] → succeeded | failed
```

Failure MUST propagate non-zero exit code with stderr from delegated command (FR-010).

---

### StackWorkflow

| Field | Type | Description |
|-------|------|-------------|
| `stack` | enum | `api` \| `web` |
| `packagePath` | path | `apps/api`, `apps/api.tests`, or `apps/web` |
| `canonicalCommand` | string | Existing script or CLI invocation used by CI |

**Instances**:

| Stack | Workflow | Canonical source |
|-------|----------|------------------|
| api | build | `dotnet build apps/api/split-rail-api.csproj` (CI backend-test restore/build) |
| api | test | `dotnet test apps/api.tests/split-rail-api.tests.csproj` (CI backend-test) |
| api | dev | `dotnet run --urls http://localhost:5000` (CI e2e-matrix, quickstarts) |
| web | dev | `npm run dev` (Vite port 5173) |
| web | build | `npm run build` (CI contract-type-drift, frontend-test) |
| web | test | `npm run test` / `test:coverage` (CI frontend-test) |

**Validation**: Root task outcome MUST match canonical package-level outcome (SC-004).

---

### CrossStackWorkflow

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | `gen:api`, `e2e`, `dev`, `build`, `test` |
| `dependsOn` | string[] | Task names or package workflows |
| `prerequisites` | string[] | Documented external requirements |

**Instances**:

| Workflow | Package / behavior | Prerequisites |
|----------|-------------------|-----------------|
| `gen:api` | `apps/web` → `npm run gen:api` | API exporting swagger at `OPENAPI_URL` (default port 5000) |
| `e2e` | `tests/e2e` → `playwright test` | Target URLs (`PREVIEW_BASE_URL`, `API_BASE_URL`); Playwright browsers installed |
| `dev` | parallel `api:dev` + `web:dev` | PostgreSQL + dev env vars |
| `build` | `api:build` then `web:build` | .NET SDK + Node |
| `test` | `api:test` then `web:test` | .NET SDK + Node |

---

### CommandCatalog (README artifact)

| Field | Type | Description |
|-------|------|-------------|
| `sectionPath` | path | `README.md` → "Development" or "Task runner" section |
| `entries` | { name, description, prerequisites }[] | One row per TaskDefinition |

**Validation** (FR-011):
- Every TaskDefinition in RootTaskCatalog MUST appear in CommandCatalog.
- Prerequisites for `dev`, `gen:api`, and `e2e` MUST be stated explicitly.

---

## Entity Relationship Diagram

```text
RootTaskCatalog
  ├── TaskDefinition (api:build) ──delegates──► StackWorkflow (api/build)
  ├── TaskDefinition (api:test)  ──delegates──► StackWorkflow (api/test)
  ├── TaskDefinition (api:dev)   ──delegates──► StackWorkflow (api/dev)
  ├── TaskDefinition (web:dev)   ──delegates──► StackWorkflow (web/dev)
  ├── TaskDefinition (web:build) ──delegates──► StackWorkflow (web/build)
  ├── TaskDefinition (web:test)  ──delegates──► StackWorkflow (web/test)
  ├── TaskDefinition (gen:api)   ──delegates──► CrossStackWorkflow (gen:api)
  ├── TaskDefinition (e2e)       ──delegates──► CrossStackWorkflow (e2e)
  ├── TaskDefinition (dev)       ──delegates──► CrossStackWorkflow (dev)
  ├── TaskDefinition (build)     ──aggregates──► api:build + web:build
  └── TaskDefinition (test)      ──aggregates──► api:test + web:test

CommandCatalog (README) ──documents──► all TaskDefinitions
```
