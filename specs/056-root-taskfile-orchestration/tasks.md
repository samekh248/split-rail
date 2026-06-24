---
description: "Task list for Root Taskfile Orchestrating Both Stacks (SPLR-50)"
---

# Tasks: Root Task Runner Orchestrating Both Stacks

**Input**: Design documents from `/specs/056-root-taskfile-orchestration/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/root-taskfile.md, quickstart.md

**Tests**: REQUIRED per Constitution III. Vitest contract tests in `apps/web/tests/deploy/taskfileContract.test.ts` backed by `apps/web/src/deploy/assertTaskfileContract.ts` verify `Taskfile.yml` task catalog (assertions C1–C10). Manual validation via `specs/056-root-taskfile-orchestration/quickstart.md`. No backend C# changes expected — backend coverage gate runs for regression only; frontend ≥80.0% line/branch coverage required on new/modified helper and test files.

**Organization**: Tasks grouped by user story (US1–US5). Primary deliverable is a rewritten root `Taskfile.yml` plus README task catalog.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1–US5 (maps to user stories in spec.md)
- All paths are repo-relative

## Path Conventions

- Root orchestration (rewrite): `Taskfile.yml`
- Documentation (extend): `README.md`
- Contract helper (new): `apps/web/src/deploy/assertTaskfileContract.ts`
- Vitest contract tests (new): `apps/web/tests/deploy/taskfileContract.test.ts`
- Contract: `specs/056-root-taskfile-orchestration/contracts/root-taskfile.md`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm branch, feature pointer, and design artifacts before implementation.

- [x] T001 Verify branch `056-root-taskfile-orchestration` is checked out and `.specify/feature.json` points to `specs/056-root-taskfile-orchestration`
- [x] T002 [P] Review task catalog contract in `specs/056-root-taskfile-orchestration/contracts/root-taskfile.md` (required tasks, delegation rules, C1–C10 assertions)
- [x] T003 [P] Review Taskfile design decisions in `specs/056-root-taskfile-orchestration/research.md` and validation scenarios in `specs/056-root-taskfile-orchestration/quickstart.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared contract-test infrastructure and Taskfile scaffolding. **Blocks all user stories.**

**⚠️ CRITICAL**: No user story work begins until assertion helper, test skeleton, and Taskfile v3 scaffold exist.

- [x] T004 Create `readTaskfile`, `assertPlaceholderAbsent`, `assertTaskBlockPresent`, `assertTaskDir`, and `assertTaskContains` helpers in `apps/web/src/deploy/assertTaskfileContract.ts` per contract C1–C3 patterns
- [x] T005 [P] Create Vitest skeleton importing helper from `apps/web/src/deploy/assertTaskfileContract.ts` in `apps/web/tests/deploy/taskfileContract.test.ts`
- [x] T006 Replace placeholder greeting in `Taskfile.yml` with Taskfile v3 scaffold — `version: '3'`, shared `vars:` (`API_PROJECT`, `API_TEST_PROJECT`, `OPENAPI_URL`, `PREVIEW_BASE_URL`, `API_BASE_URL`), and `default` task running `task --list` (FR-012)

**Checkpoint**: Contract test harness and Taskfile scaffold ready — user story implementation can begin

---

## Phase 3: User Story 1 — Build and Test Both Stacks from the Root (Priority: P1) 🎯 MVP

**Goal**: Developers run `task api:build`, `task api:test`, `task web:build`, `task web:test`, and aggregates `task build` / `task test` from repository root (FR-001, FR-002, FR-004, FR-005, SC-001).

**Independent Test**: From repo root, `task build` and `task test` exit 0; outcomes match `dotnet build/test` and `npm run build/test` in respective packages.

### Tests for User Story 1 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T007 [P] [US1] Add failing test `taskfile_existsAtRepoRoot` in `apps/web/tests/deploy/taskfileContract.test.ts` — assert C1: `Taskfile.yml` exists at repository root
- [x] T008 [P] [US1] Add failing test `taskfile_placeholderAbsent` in `apps/web/tests/deploy/taskfileContract.test.ts` — assert C2: content does not contain `Hello, world`
- [x] T009 [P] [US1] Add failing test `taskfile_apiBuildReferencesProject` in `apps/web/tests/deploy/taskfileContract.test.ts` — assert C4: `api:build` block references `apps/api/split-rail-api.csproj` and `dotnet build`
- [x] T010 [P] [US1] Add failing test `taskfile_apiTestReferencesTestProject` in `apps/web/tests/deploy/taskfileContract.test.ts` — assert C5: `api:test` block references `apps/api.tests/split-rail-api.tests.csproj` and `dotnet test`
- [x] T011 [P] [US1] Add failing test `taskfile_webTasksDelegateToAppsWeb` in `apps/web/tests/deploy/taskfileContract.test.ts` — assert C6: `web:build` and `web:test` set `dir: apps/web` and invoke `npm run build` / `npm run test`

### Implementation for User Story 1

- [x] T012 [US1] Implement `api:build` and `api:test` tasks in `Taskfile.yml` — `dotnet build apps/api/split-rail-api.csproj -c Release` and `dotnet test apps/api.tests/split-rail-api.tests.csproj -c Release` with `desc:` fields
- [x] T013 [US1] Implement `web:build` and `web:test` tasks in `Taskfile.yml` — `dir: apps/web`, `npm run build` and `npm run test` with `desc:` fields
- [x] T014 [US1] Implement aggregate `build` and `test` tasks in `Taskfile.yml` — sequential `task: api:build` → `task: web:build` and `task: api:test` → `task: web:test`
- [x] T015 [US1] Run Vitest until US1 assertions green: `cd apps/web && npm run test -- tests/deploy/taskfileContract.test.ts`
- [x] T016 [US1] Manual smoke from repo root: `task api:build`, `task web:build`, `task test` per quickstart Scenarios 2–3

**Checkpoint**: MVP — build and test both stacks from root without `cd` into package folders

---

## Phase 4: User Story 2 — Run Both Stacks for Local Development (Priority: P2)

**Goal**: `task dev` starts API and Vite dev servers in parallel (FR-003, FR-008, SC-003).

**Independent Test**: `task dev` exposes API on port 5000 and web on port 5173; browser loads UI and `/api` proxy works.

### Tests for User Story 2 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T017 [P] [US2] Add failing test `taskfile_devRunsParallel` in `apps/web/tests/deploy/taskfileContract.test.ts` — assert C9: `dev` task uses `run: parallel` and references `api:dev` and `web:dev`
- [x] T018 [P] [US2] Add failing test `taskfile_apiDevAndWebDevPresent` in `apps/web/tests/deploy/taskfileContract.test.ts` — assert C3 subset: `api:dev` runs `dotnet run` with `--urls http://localhost:5000`; `web:dev` has `dir: apps/web` and `npm run dev`

### Implementation for User Story 2

- [x] T019 [US2] Implement `api:dev` task in `Taskfile.yml` — `dotnet run --project apps/api/split-rail-api.csproj --urls http://localhost:5000` with `ASPNETCORE_ENVIRONMENT: Development` in `env:`
- [x] T020 [US2] Implement `web:dev` task in `Taskfile.yml` — `dir: apps/web`, `npm run dev`, with `desc:`
- [x] T021 [US2] Implement `dev` task in `Taskfile.yml` — `run: parallel`, `cmds` invoking `task: api:dev` and `task: web:dev`
- [x] T022 [US2] Run Vitest until US2 assertions green: `cd apps/web && npm run test -- tests/deploy/taskfileContract.test.ts`

**Checkpoint**: Combined local development available via single root command

---

## Phase 5: User Story 3 — Regenerate API Types from the Root (Priority: P2)

**Goal**: `task gen:api` delegates to `apps/web` `npm run gen:api` with `OPENAPI_URL` defaulting to live swagger (FR-006, SC-003).

**Independent Test**: With API running, `task gen:api` regenerates `apps/web/src/types/generated-api.ts`; without API, command fails with clear stderr.

### Tests for User Story 3 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T023 [P] [US3] Add failing test `taskfile_genApiDelegatesToAppsWeb` in `apps/web/tests/deploy/taskfileContract.test.ts` — assert C7: `gen:api` has `dir: apps/web` and invokes `npm run gen:api`
- [x] T024 [P] [US3] Add failing test `taskfile_genApiOpenApiUrlDefault` in `apps/web/tests/deploy/taskfileContract.test.ts` — assert C10: `OPENAPI_URL` var defaults to `http://localhost:5000/swagger/v1/swagger.json`

### Implementation for User Story 3

- [x] T025 [US3] Add `OPENAPI_URL` to `vars:` in `Taskfile.yml` with default `http://localhost:5000/swagger/v1/swagger.json`
- [x] T026 [US3] Implement `gen:api` task in `Taskfile.yml` — `dir: apps/web`, `env: OPENAPI_URL: '{{.OPENAPI_URL}}'`, `cmds: [npm run gen:api]`, with `desc:`
- [x] T027 [US3] Run Vitest until US3 assertions green: `cd apps/web && npm run test -- tests/deploy/taskfileContract.test.ts`

**Checkpoint**: Contract type regeneration exposed at repository root

---

## Phase 6: User Story 4 — Run End-to-End Tests from the Root (Priority: P3)

**Goal**: `task e2e` runs Playwright from `tests/e2e`; optional `task e2e:install` installs browsers (FR-007, SC-003).

**Independent Test**: With stack running, `task e2e` executes Playwright suite from root; env defaults match `tests/e2e/playwright.config.ts`.

### Tests for User Story 4 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T028 [P] [US4] Add failing test `taskfile_e2eDelegatesToTestsE2e` in `apps/web/tests/deploy/taskfileContract.test.ts` — assert C8: `e2e` has `dir: tests/e2e` and invokes `playwright test`
- [x] T029 [P] [US4] Add failing test `taskfile_requiredTasksPresent` in `apps/web/tests/deploy/taskfileContract.test.ts` — assert C3: all required task names exist (`api:build`, `api:test`, `api:dev`, `web:dev`, `web:build`, `web:test`, `gen:api`, `e2e`, `dev`)

### Implementation for User Story 4

- [x] T030 [US4] Add `PREVIEW_BASE_URL` and `API_BASE_URL` to `vars:` in `Taskfile.yml` with defaults `http://localhost:5173` and `http://localhost:5000`
- [x] T031 [US4] Implement `e2e` task in `Taskfile.yml` — `dir: tests/e2e`, `npx playwright test`, pass env vars, with `desc:`
- [x] T032 [US4] Implement optional `e2e:install` task in `Taskfile.yml` — `dir: tests/e2e`, `npx playwright install`, with `desc:`
- [x] T033 [US4] Run Vitest until all C1–C10 assertions green: `cd apps/web && npm run test -- tests/deploy/taskfileContract.test.ts`

**Checkpoint**: E2E suite runnable from repository root

---

## Phase 7: User Story 5 — Discover Commands via README (Priority: P1)

**Goal**: Root `README.md` documents prerequisites, full task catalog, and quick-start flows (FR-011, SC-002).

**Independent Test**: New contributor reads README only and successfully runs documented `task` commands per quickstart.

### Tests for User Story 5 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T034 [P] [US5] Add failing test `taskfile_readmeDocumentsAllTasks` in `apps/web/tests/deploy/taskfileContract.test.ts` — assert `README.md` contains each required task name from contract (`api:build`, `api:test`, `api:dev`, `web:dev`, `web:build`, `web:test`, `gen:api`, `e2e`, `dev`, `build`, `test`, `e2e:install`)

### Implementation for User Story 5

- [x] T035 [US5] Extend `README.md` with **Prerequisites** section — Task runner install link, .NET 8 SDK, Node 22, PostgreSQL for `task dev`, first-time `npm ci` paths for `apps/web` and `tests/e2e`
- [x] T036 [US5] Extend `README.md` with **Task catalog** table — task name, description, prerequisites column for every task in `specs/056-root-taskfile-orchestration/contracts/root-taskfile.md`
- [x] T037 [US5] Extend `README.md` with **Quick flows** — daily dev (`task dev`), verify all (`task build && task test`), type sync (`task gen:api`), E2E (`task e2e:install` then `task e2e`)
- [x] T038 [US5] Run Vitest until US5 README assertion green: `cd apps/web && npm run test -- tests/deploy/taskfileContract.test.ts`

**Checkpoint**: Full command discoverability without reading CI or asking teammates

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Coverage gate, full quickstart validation, and final contract verification.

- [x] T039 Run full quickstart validation from `specs/056-root-taskfile-orchestration/quickstart.md` Scenarios 1–8 (contract tests, build, test, dev, gen:api, e2e, README, `task --list`)
- [x] T040 Verify `task --list` from repository root shows all tasks with descriptions and no placeholder greeting (FR-012, quickstart Scenario 8)
- [x] T041 [P] Verify ≥80.0% line/branch coverage on `apps/web/src/deploy/assertTaskfileContract.ts` and `apps/web/tests/deploy/taskfileContract.test.ts` via `cd apps/web && npm run test:coverage -- tests/deploy/taskfileContract.test.ts src/deploy/assertTaskfileContract.ts`; missing or unparseable lcov FAIL (FR-014, Constitution III)
- [x] T042 Confirm no backend C# files modified; if none, note backend coverage gate unchanged (regression-only `dotnet test` on `apps/api.tests/split-rail-api.tests.csproj`)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS all user stories**
- **User Stories (Phases 3–7)**: Depend on Foundational completion
  - US1 (Phase 3): No dependency on other stories — **MVP**
  - US2 (Phase 4): Independent; needs `api:dev`/`web:dev` only
  - US3 (Phase 5): Independent; `gen:api` does not require US2
  - US4 (Phase 6): Independent; `e2e` does not require US2/US3 implementation
  - US5 (Phase 7): Depends on all tasks existing in `Taskfile.yml` (Phases 3–6) for complete README catalog
- **Polish (Phase 8)**: Depends on US1–US5 complete

### User Story Dependencies

| Story | Priority | Depends on | Independent test |
|-------|----------|------------|------------------|
| US1 | P1 | Foundational | `task build` + `task test` from root |
| US2 | P2 | Foundational | `task dev` — both servers reachable |
| US3 | P2 | Foundational | `task gen:api` with API running |
| US4 | P3 | Foundational | `task e2e` with stack running |
| US5 | P1 | US1–US4 tasks defined | README-only onboarding |

### Within Each User Story

- Contract tests MUST be written and FAIL before `Taskfile.yml` changes for that story
- Run Vitest after each story's implementation tasks
- US5 README documents tasks from prior phases

### Parallel Opportunities

- **Phase 1**: T002 ∥ T003
- **Phase 2**: T005 ∥ T006 (after T004 helper exists)
- **Phase 3**: T007–T011 all parallel (different test cases, same file — sequence if merge conflicts)
- **Phase 4**: T017 ∥ T018
- **Phase 5**: T023 ∥ T024
- **Phase 6**: T028 ∥ T029
- **Phase 7**: T034 standalone; T035–T037 sequential on `README.md`
- **Phase 8**: T041 ∥ T042
- **Cross-story**: After Phase 2, US1–US4 can proceed in parallel across developers; US5 waits for task names

---

## Parallel Example: User Story 1

```bash
# Launch all failing contract tests for US1 together (after T004–T006):
# In apps/web/tests/deploy/taskfileContract.test.ts add:
#   taskfile_existsAtRepoRoot
#   taskfile_placeholderAbsent
#   taskfile_apiBuildReferencesProject
#   taskfile_apiTestReferencesTestProject
#   taskfile_webTasksDelegateToAppsWeb

cd apps/web && npm run test -- tests/deploy/taskfileContract.test.ts
# Expected: FAIL until T012–T014 implement Taskfile.yml tasks
```

---

## Parallel Example: User Story 4

```bash
# After US1–US3 merged, developer B can add US4 while developer C starts US5 README draft:
# US4: T028–T032 in Taskfile.yml
# US5: T035–T037 in README.md (finalize T034 after all task names land)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: `task build && task test` from repository root
5. Demo: developer workflow without per-package `cd`

### Incremental Delivery

1. Setup + Foundational → contract harness ready
2. US1 → build/test from root (MVP)
3. US2 → `task dev` for daily work
4. US3 → `task gen:api` for contract sync
5. US4 → `task e2e` for integration verification
6. US5 → README discoverability
7. Polish → coverage + quickstart

### Parallel Team Strategy

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: US1 (MVP)
   - Developer B: US2 + US3 (Taskfile.yml — coordinate merges)
   - Developer C: US4 (`e2e` tasks)
3. US5 after Taskfile.yml stabilizes
4. Polish together

---

## Task Summary

| Phase | Story | Tasks | Count |
|-------|-------|-------|-------|
| 1 Setup | — | T001–T003 | 3 |
| 2 Foundational | — | T004–T006 | 3 |
| 3 US1 Build/Test | P1 🎯 | T007–T016 | 10 |
| 4 US2 Dev | P2 | T017–T022 | 6 |
| 5 US3 gen:api | P2 | T023–T027 | 5 |
| 6 US4 E2E | P3 | T028–T033 | 6 |
| 7 US5 README | P1 | T034–T038 | 5 |
| 8 Polish | — | T039–T042 | 4 |
| **Total** | | **T001–T042** | **42** |

---

## Notes

- Do **not** duplicate build/test logic inline in `Taskfile.yml` — delegate to same commands CI uses (FR-009)
- Do **not** modify `.github/workflows/ci.yml` in this feature
- `Taskfile.yml` is cross-platform dev tooling — Constitution §X paired `deploy/` scripts N/A
- US5 README test (T034) is optional strictness; remove if brittle — manual quickstart Scenario 7 remains authoritative
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
