---
description: "Task list for Preview Web Frontend Container Build (SPLR-44)"
---

# Tasks: Preview Web Frontend Container Build

**Input**: Design documents from `/specs/051-preview-dockerfile-web/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/preview-web-container.md, quickstart.md

**Tests**: REQUIRED per Constitution III. Vitest unit tests in `apps/web/tests/deploy/` verify nginx SPA routing rules and Dockerfile contract structure. Shell smoke script `deploy/preview/smoke-web-image.sh` validates container build and deep-link serve behavior. No backend C# changes expected — backend coverage gate runs for regression only; frontend ≥80.0% line/branch coverage required on new/modified helper and test files.

**Organization**: Tasks grouped by user story (US1–US3). Primary deliverable is a self-contained multi-stage `deploy/preview/Dockerfile.web` plus aligned `deploy-preview.sh`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1–US3 (maps to user stories in spec.md)
- All paths are repo-relative

## Path Conventions

- Web Dockerfile (new): `deploy/preview/Dockerfile.web`
- nginx SPA config (new): `deploy/preview/nginx.web.conf`
- Smoke script (new): `deploy/preview/smoke-web-image.sh`
- Deploy orchestrator (edit): `deploy/preview/deploy-preview.sh`
- Docker ignore (edit): `.dockerignore`
- nginx parser helper (new): `apps/web/src/deploy/parseNginxSpaConfig.ts`
- Vitest deploy tests (new): `apps/web/tests/deploy/nginxSpaRouting.test.ts`, `apps/web/tests/deploy/dockerfileContract.test.ts`
- Contract: `specs/051-preview-dockerfile-web/contracts/preview-web-container.md`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm branch, feature pointer, and design artifacts before implementation.

- [x] T001 Verify branch `051-preview-dockerfile-web` is checked out and `.specify/feature.json` points to `specs/051-preview-dockerfile-web`
- [x] T002 [P] Review build/serve/deploy contract in `specs/051-preview-dockerfile-web/contracts/preview-web-container.md`
- [x] T003 [P] Review Dockerfile/nginx/OpenAPI export decisions in `specs/051-preview-dockerfile-web/research.md` and validation scenarios in `specs/051-preview-dockerfile-web/quickstart.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared infrastructure for repo-root Docker context and automated verification. **Blocks all user stories.**

**⚠️ CRITICAL**: No user story work begins until `.dockerignore`, test skeletons, and smoke script shell exist.

- [x] T004 Extend `.dockerignore` at repository root to exclude `**/node_modules`, `**/bin`, `**/obj`, `.git`, `coverage`, `TestResults` while retaining `apps/api`, `apps/web`, and `deploy/preview` for efficient repo-root build context
- [x] T005 [P] Create `parseNginxSpaConfig` helper exporting `assertSpaFallback`, `assertStaticRoot`, and `parseListenPort` in `apps/web/src/deploy/parseNginxSpaConfig.ts`
- [x] T006 [P] Create Vitest skeleton importing parser helper in `apps/web/tests/deploy/nginxSpaRouting.test.ts`
- [x] T007 [P] Create Vitest skeleton with Dockerfile read helpers (`readDockerfile`, `assertStageOrder`) in `apps/web/tests/deploy/dockerfileContract.test.ts`
- [x] T008 [P] Create executable skeleton `deploy/preview/smoke-web-image.sh` with `set -euo pipefail`, local image tag `splitrail-web-smoke:local`, and teardown trap per contract smoke section

**Checkpoint**: Test harness and Docker context prerequisites ready — user story implementation can begin

---

## Phase 3: User Story 1 — Preview Pipeline Builds the Web Frontend Successfully (Priority: P1) 🎯 MVP

**Goal**: `deploy/preview/Dockerfile.web` exists and `docker build` completes; `deploy-preview.sh` web step uses repo-root self-contained build.

**Independent Test**: `docker build -t splitrail-web:local -f deploy/preview/Dockerfile.web .` exits 0 from repository root; `deploy/preview/smoke-web-image.sh` build step passes (SC-001, FR-001).

### Tests for User Story 1 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T009 [P] [US1] Add failing test `dockerfileWeb_existsAtExpectedPath` in `apps/web/tests/deploy/dockerfileContract.test.ts` — assert file `deploy/preview/Dockerfile.web` exists
- [x] T010 [US1] Add failing build step to `deploy/preview/smoke-web-image.sh` — `docker build -t splitrail-web-smoke:local -f deploy/preview/Dockerfile.web .` must exit 0 (will fail until Dockerfile implemented)

### Implementation for User Story 1

- [x] T011 [US1] Create multi-stage `deploy/preview/Dockerfile.web` with `contract`, `build`, and `runtime` stage scaffolding per `specs/051-preview-dockerfile-web/contracts/preview-web-container.md`
- [x] T012 [US1] Update `deploy/preview/deploy-preview.sh` — remove host-side `pushd apps/web; npm ci; npm run build; popd` block; replace web docker invocation with `docker build -t "${WEB_IMAGE}" -f deploy/preview/Dockerfile.web .` (FR-005, FR-006)
- [x] T013 [US1] Run `docker build -t splitrail-web:local -f deploy/preview/Dockerfile.web .` from repo root until exit 0; confirm image tags remain `{GCP_REGION}-docker.pkg.dev/{GCP_PROJECT}/split-rail/web:{RUN_ID}` via unchanged `deploy-preview.sh` push step

**Checkpoint**: MVP — missing Dockerfile gap closed; preview script web build step no longer fails on file-not-found

---

## Phase 4: User Story 2 — Preview Web App Serves Single-Page Application Routing (Priority: P1)

**Goal**: nginx serves static bundle with SPA fallback so deep links return the application shell (FR-003, SC-002).

**Independent Test**: `deploy/preview/smoke-web-image.sh` curl assertions return HTTP 200 for `/`, `/settings/team`, and `/venues/{uuid}/events/{uuid}`; Vitest nginx parser tests green.

### Tests for User Story 2 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T014 [P] [US2] Add failing test `nginxConfig_hasSpaFallback` in `apps/web/tests/deploy/nginxSpaRouting.test.ts` — parse `deploy/preview/nginx.web.conf` and assert `try_files $uri $uri/ /index.html` (contract C2–C3)
- [x] T015 [P] [US2] Add failing test `nginxConfig_servesFromHtmlRoot` in `apps/web/tests/deploy/nginxSpaRouting.test.ts` — assert `root /usr/share/nginx/html` and `index index.html`
- [x] T016 [P] [US2] Add failing test `dockerfile_runtimeStageCopiesNginxConfig` in `apps/web/tests/deploy/dockerfileContract.test.ts` — assert runtime stage COPY of `deploy/preview/nginx.web.conf` and `dist/`

### Implementation for User Story 2

- [x] T017 [US2] Create `deploy/preview/nginx.web.conf` with `location /` SPA `try_files` fallback, static root, and port 8080 listener per contract
- [x] T018 [US2] Update runtime stage in `deploy/preview/Dockerfile.web` — COPY `deploy/preview/nginx.web.conf` → `/etc/nginx/conf.d/default.conf`, COPY build-stage `dist/` → `/usr/share/nginx/html`, `EXPOSE 8080`, `CMD ["nginx", "-g", "daemon off;"]`
- [x] T019 [US2] Extend `deploy/preview/smoke-web-image.sh` with container run on port 18080 and curl assertions for contract C1 (`/`), C2 (`/settings/team`), C3 (workspace deep link) plus teardown
- [x] T020 [US2] Run Vitest until green: `cd apps/web && npm run test -- tests/deploy/nginxSpaRouting.test.ts`

**Checkpoint**: Built web image serves SPA shell on representative deep links — E2E navigation paths unblocked at static-server layer

---

## Phase 5: User Story 3 — Frontend Contract Types Synchronized at Build Time (Priority: P2)

**Goal**: Docker build exports OpenAPI from compiled API and runs `npm run gen:api` before `vite build` (Constitution VI, FR-004, FR-007, SC-003).

**Independent Test**: `docker build --progress=plain` log shows `Generating API types from file://` before Vite build; Dockerfile contract tests assert stage order and fail-fast swagger check.

### Tests for User Story 3 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T021 [P] [US3] Add failing test `dockerfile_hasContractStageWithSwaggerTofile` in `apps/web/tests/deploy/dockerfileContract.test.ts` — assert `dotnet swagger tofile` and non-empty swagger validation
- [x] T022 [P] [US3] Add failing test `dockerfile_buildStageRunsGenApiBeforeNpmBuild` in `apps/web/tests/deploy/dockerfileContract.test.ts` — assert stage order: `npm run gen:api` before `npm run build`
- [x] T023 [P] [US3] Add failing test `dockerfile_contractStageFailsFastMessage` in `apps/web/tests/deploy/dockerfileContract.test.ts` — assert RUN step emits `OpenAPI contract export failed` on missing swagger (FR-007)

### Implementation for User Story 3

- [x] T024 [US3] Implement contract stage in `deploy/preview/Dockerfile.web` — `dotnet restore && dotnet build -c Release`, install `Swashbuckle.AspNetCore.Cli`, `dotnet swagger tofile` to `/tmp/swagger/v1/swagger.json`, fail if missing or zero bytes
- [x] T025 [US3] Implement build stage in `deploy/preview/Dockerfile.web` — copy swagger from contract stage, `npm ci`, `OPENAPI_URL=file:///tmp/swagger/v1/swagger.json npm run gen:api`, `npm run build`, verify `dist/index.html` exists
- [x] T026 [US3] If `dotnet swagger tofile` fails without database, add build-arg `CONNECTIONSTRINGS__DEFAULTCONNECTION` dummy override in contract stage only in `deploy/preview/Dockerfile.web` (document in comment; no `apps/api` source change unless unavoidable)
- [x] T027 [US3] Re-run `docker build --progress=plain -t splitrail-web:local -f deploy/preview/Dockerfile.web .` and confirm log contains `Generating API types from file://` before Vite build; run `cd apps/web && npm run test -- tests/deploy/dockerfileContract.test.ts` until green

**Checkpoint**: Preview web image build regenerates frontend contract types from backend OpenAPI before bundle compile

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, quickstart validation, coverage gate, regression checks.

- [x] T028 [P] Update `deploy/preview/README.md` with repo-root Docker build command, `smoke-web-image.sh` usage, and note that web Cloud Run deploy remains future work (spec Out of Scope)
- [x] T029 Run full quickstart validation from `specs/051-preview-dockerfile-web/quickstart.md` Scenarios 1–4 (Docker build, deep links, static assets, gen:api log)
- [x] T030 Run `cd apps/web && npm run test:coverage -- tests/deploy/` — verify ≥80.0% line/branch coverage on `apps/web/src/deploy/parseNginxSpaConfig.ts` and new files under `apps/web/tests/deploy/` (Constitution III); missing or unparseable lcov FAIL
- [x] T031 Run `dotnet test apps/api.tests/split-rail-api.tests.csproj --configuration Release` — confirm no backend regressions (no API source changes expected)
- [ ] T032 [P] Optional GCP validation: run `deploy/preview/deploy-preview.sh` web build/push step with test `GCP_PROJECT`, `GCP_REGION`, `RUN_ID` when credentials available (SC-004); run `deploy/preview/teardown-preview.sh` afterward

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS all user stories**
- **User Story 1 (Phase 3)**: Depends on Foundational — delivers MVP Dockerfile + script alignment
- **User Story 2 (Phase 4)**: Depends on US1 runtime stage scaffolding — nginx config and smoke deep links
- **User Story 3 (Phase 5)**: Depends on US1 Dockerfile skeleton — fills in contract/build stage details (can parallelize test writing with US2 after T011)
- **Polish (Phase 6)**: Depends on US1–US3 completion

### User Story Dependencies

| Story | Priority | Depends on | Independent test |
|-------|----------|------------|------------------|
| US1 | P1 | Foundational | `docker build` exit 0 |
| US2 | P1 | US1 runtime scaffold | smoke curl C1–C3 + Vitest nginx tests |
| US3 | P2 | US1 Dockerfile scaffold | Dockerfile contract tests + build log gen:api |

US2 and US3 can proceed in parallel **after T011** (Dockerfile skeleton exists) if different developers own nginx vs contract stages.

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- US1 before US2/US3 implementation (shared `Dockerfile.web`)
- Story complete before Polish phase

### Parallel Opportunities

- **Phase 1**: T002 ∥ T003
- **Phase 2**: T005 ∥ T006 ∥ T007 ∥ T008 (after T004)
- **Phase 3 tests**: T009 ∥ (T010 after T008)
- **Phase 4 tests**: T014 ∥ T015 ∥ T016
- **Phase 5 tests**: T021 ∥ T022 ∥ T023
- **Polish**: T028 ∥ T032

---

## Parallel Example: User Story 2

```bash
# Launch all US2 tests together (after T006 parser skeleton exists):
Task T014: nginxConfig_hasSpaFallback in apps/web/tests/deploy/nginxSpaRouting.test.ts
Task T015: nginxConfig_servesFromHtmlRoot in apps/web/tests/deploy/nginxSpaRouting.test.ts
Task T016: dockerfile_runtimeStageCopiesNginxConfig in apps/web/tests/deploy/dockerfileContract.test.ts

# Then implement nginx config and wire runtime stage:
Task T017: deploy/preview/nginx.web.conf
Task T018: deploy/preview/Dockerfile.web runtime stage
Task T019: deploy/preview/smoke-web-image.sh deep-link curls
```

---

## Parallel Example: User Story 3

```bash
# Launch all US3 contract tests together:
Task T021: dockerfile_hasContractStageWithSwaggerTofile
Task T022: dockerfile_buildStageRunsGenApiBeforeNpmBuild
Task T023: dockerfile_contractStageFailsFastMessage

# Then implement contract + build stages:
Task T024: contract stage with swagger tofile
Task T025: build stage with gen:api + vite build
Task T026: dummy connection string build-arg if needed
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1 (T009–T013)
4. **STOP and VALIDATE**: `docker build -f deploy/preview/Dockerfile.web .` succeeds
5. Preview script no longer blocked on missing file

### Incremental Delivery

1. Setup + Foundational → test harness ready
2. US1 → Docker build green → **MVP for SPLR-44 root cause**
3. US2 → SPA deep links verified → E2E static routing ready
4. US3 → Contract sync in Docker → Constitution VI compliant preview builds
5. Polish → quickstart + coverage gate

### Parallel Team Strategy

1. Team completes Setup + Foundational together
2. Developer A: US1 Dockerfile skeleton + deploy-preview.sh (T009–T013)
3. After T011:
   - Developer B: US2 nginx + smoke deep links (T014–T020)
   - Developer C: US3 contract/build stages (T021–T027)
4. Merge and run Polish phase

---

## Notes

- Do **not** hand-edit `apps/web/src/types/generated-api.ts` — only regenerate via `npm run gen:api` inside Docker build stage (Constitution VI)
- Do **not** redesign Cloud Run web deploy in this feature — web image push only (spec Out of Scope)
- `deploy-preview.sh` currently deploys API image only; web image push unblocks future wiring
- Vitest Dockerfile tests parse file content — they verify structure/order without requiring Docker in CI unit-test job
- Shell smoke script requires local Docker; optional in CI but mandatory for quickstart Scenario 1–3 validation
