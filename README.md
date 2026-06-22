# split-rail

Accounting-first venue platform monorepo (`apps/api` + `apps/web`).

## Prerequisites

Install before using root tasks:

| Tool | Version | Notes |
|------|---------|-------|
| [Task](https://taskfile.dev/installation/) | 3.x | Root command runner (`task --version`) |
| .NET SDK | 8.0 | API build, test, and dev |
| Node.js | 22 | Web and E2E packages |
| PostgreSQL | 16+ | Required for `task dev` / `task api:dev` (`DB_PASSWORD`, `ASPNETCORE_ENVIRONMENT=Development`) |

First-time package install:

```bash
npm ci --prefix apps/web
npm ci --prefix tests/e2e
```

## Task catalog

Run `task` or `task --list` from the repository root to see all commands.

| Task | Description | Prerequisites |
|------|-------------|---------------|
| `api:build` | Build the API (Release) | .NET 8 SDK |
| `api:test` | Run API xUnit test suite | .NET 8 SDK |
| `api:dev` | Run API at http://localhost:5000 | PostgreSQL, `DB_PASSWORD` |
| `web:dev` | Run Vite dev server at http://localhost:5173 | `npm ci` in `apps/web` |
| `web:build` | Typecheck and build web app | `npm ci` in `apps/web` |
| `web:test` | Run Vitest unit tests | `npm ci` in `apps/web` |
| `gen:api` | Regenerate `generated-api.ts` from OpenAPI | API running and exporting swagger |
| `e2e` | Run Playwright browser tests | `npm ci` in `tests/e2e`, browsers installed, stack or preview URL |
| `e2e:install` | Install Playwright browsers (one-time) | Node.js |
| `dev` | Start API + web dev servers in parallel | PostgreSQL, `npm ci` in `apps/web` |
| `build` | Build API then web | .NET SDK, `npm ci` in `apps/web` |
| `test` | Run API then web test suites | .NET SDK, `npm ci` in `apps/web` |

## Quick flows

**Daily development** (API + Vite with `/api` proxy):

```bash
task dev
```

**Verify both stacks**:

```bash
task build
task test
```

**Sync frontend API types** (with API already running on port 5000):

```bash
task gen:api
```

**End-to-end tests** (with local stack running):

```bash
task e2e:install   # once per machine
task e2e
```

Override targets when needed:

```bash
task gen:api OPENAPI_URL=http://127.0.0.1:5000/swagger/v1/swagger.json
task e2e PREVIEW_BASE_URL=http://127.0.0.1:5173 API_BASE_URL=http://127.0.0.1:5000
```
