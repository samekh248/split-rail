# Quickstart Validation Guide: Root Taskfile Orchestration

**Feature**: 056-root-taskfile-orchestration (SPLR-50) | **Date**: 2026-06-22

Validates that root `task` commands orchestrate both stacks per [contracts/root-taskfile.md](./contracts/root-taskfile.md). See [research.md](./research.md) for design decisions.

## Prerequisites

- [Task](https://taskfile.dev/installation/) installed (`task --version`)
- .NET 8 SDK (`dotnet --version`)
- Node 22 + npm (`node --version`)
- PostgreSQL running locally for `dev` / `api:dev` (same as existing quickstarts: `DB_PASSWORD`, `ASPNETCORE_ENVIRONMENT=Development`)
- One-time package install:
  ```bash
  npm ci --prefix apps/web
  npm ci --prefix tests/e2e
  ```

## Scenario 1: Contract tests pass (FR-013)

From repository root:

```bash
cd apps/web && npm run test -- tests/deploy/taskfileContract.test.ts
```

**Expected**:
- All contract assertions C1–C10 pass
- Confirms placeholder greeting removed from `Taskfile.yml`

---

## Scenario 2: Build both stacks from root (FR-001, FR-004, SC-001)

```bash
task api:build
task web:build
# or aggregate:
task build
```

**Expected**:
- Exit code 0 for each command
- API Release build succeeds
- Web `tsc` + Vite build succeeds

**Failure indicators**:
- `dotnet: command not found` → install .NET 8 SDK
- `npm ERR!` in web build → run `npm ci --prefix apps/web`

---

## Scenario 3: Test both stacks from root (FR-002, FR-005, SC-001)

```bash
task api:test
task web:test
# or aggregate:
task test
```

**Expected**:
- API xUnit suite completes with pass/fail summary
- Web Vitest suite completes with pass/fail summary

---

## Scenario 4: Combined local development (FR-008, SC-003)

Terminal 1 — start both stacks:

```bash
task dev
```

**Expected**:
- API listening on `http://localhost:5000`
- Vite dev server on `http://localhost:5173`
- Browser loads UI at `http://localhost:5173` and API proxy works (`/api` → port 5000)

Stop with `Ctrl+C`; both processes terminate.

**Failure indicators**:
- API exits immediately → check PostgreSQL and `DB_PASSWORD`
- Web fails → run `npm ci --prefix apps/web`

---

## Scenario 5: Regenerate API types from root (FR-006, SC-003)

With API running (from Scenario 4 or `task api:dev` in another terminal):

```bash
task gen:api
```

**Expected**:
- Console shows `Generating API types from http://localhost:5000/swagger/v1/swagger.json`
- `apps/web/src/types/generated-api.ts` updates (or unchanged if already current)

Without API running:

```bash
task gen:api
```

**Expected**:
- Non-zero exit code
- Error output references unreachable OpenAPI URL (FR-010)

---

## Scenario 6: End-to-end tests from root (FR-007, SC-003)

One-time browser install:

```bash
task e2e:install
```

With API + web running locally (Scenario 4):

```bash
task e2e
```

**Expected**:
- Playwright executes from `tests/e2e`
- Uses default `PREVIEW_BASE_URL=http://localhost:5173`

**Note**: Full cross-browser CI matrix is unchanged; root `e2e` runs default local project set.

---

## Scenario 7: README discoverability (FR-011, SC-002)

1. Open `README.md` at repository root.
2. Locate the task runner / development section.
3. Confirm every task from [contracts/root-taskfile.md](./contracts/root-taskfile.md) appears with description and prerequisites.

**Expected**: New contributor can run Scenarios 2–6 using README alone.

---

## Scenario 8: Task discoverability

```bash
task
# or
task --list
```

**Expected**:
- Lists all documented tasks with descriptions
- No placeholder "Hello, world" default task

---

## Coverage gate (FR-014)

After implementation:

```bash
cd apps/web && npm run test:coverage -- tests/deploy/taskfileContract.test.ts src/deploy/assertTaskfileContract.ts
```

**Expected**: ≥80% line/branch coverage on new assertion helper and contract test files.
