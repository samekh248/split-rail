---
description: "Task list for Managed Database Provisioning and Schema Migration in Deploy (SPLR-46)"
---

# Tasks: Managed Database Provisioning and Schema Migration in Deploy

**Input**: Design documents from `/specs/053-cloud-sql-ef-migrations/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/preview-database-deploy.md, contracts/production-api-deploy.md, quickstart.md

**Tests**: REQUIRED per Constitution III. Vitest contract tests in `apps/web/tests/deploy/` verify deploy script ordering (`migration-before-deploy`), Cloud SQL connector flags, teardown targets, and absence of hardcoded passwords. Optional shell smoke `deploy/preview/smoke-migrate-bundle.sh` validates EF migration bundle against local Docker Postgres. No backend domain C# changes expected — backend coverage gate runs for regression only; frontend ≥80.0% line/branch coverage required on new/modified helper and test files.

**Organization**: Tasks grouped by user story (US1–US3). Shared migration lib (Phase 2 + US1) unblocks preview (US2) and production (US3) deploy paths.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1–US3 (maps to user stories in spec.md)
- All paths are repo-relative

## Path Conventions

- Shared libs (new): `deploy/lib/migrate-bundle.sh`, `deploy/lib/provision-preview-db.sh`
- Preview scripts (edit): `deploy/preview/deploy-preview.sh`, `deploy/preview/teardown-preview.sh`
- Production script (new): `deploy/production/deploy-api.sh`
- Smoke script (new): `deploy/preview/smoke-migrate-bundle.sh`
- Contract helper (new): `apps/web/src/deploy/assertCloudSqlDeployContract.ts`
- Vitest tests (new): `apps/web/tests/deploy/deployPreviewDatabase.test.ts`, `apps/web/tests/deploy/deployProductionApi.test.ts`
- CI (edit): `.github/workflows/ci.yml`
- Contracts: `specs/053-cloud-sql-ef-migrations/contracts/preview-database-deploy.md`, `specs/053-cloud-sql-ef-migrations/contracts/production-api-deploy.md`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm branch, feature pointer, and design artifacts before implementation.

- [x] T001 Verify branch `053-cloud-sql-ef-migrations` is checked out and `.specify/feature.json` points to `specs/053-cloud-sql-ef-migrations`
- [x] T002 [P] Review deploy contracts in `specs/053-cloud-sql-ef-migrations/contracts/preview-database-deploy.md` and `specs/053-cloud-sql-ef-migrations/contracts/production-api-deploy.md`
- [x] T003 [P] Review migration bundle and Cloud SQL decisions in `specs/053-cloud-sql-ef-migrations/research.md` and validation scenarios in `specs/053-cloud-sql-ef-migrations/quickstart.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared `deploy/lib/` layout, contract assertion helpers, and test/smoke skeletons. **Blocks all user stories.**

**⚠️ CRITICAL**: No user story work begins until helper module and Vitest skeletons exist.

- [x] T004 Create `deploy/lib/` directory for shared deploy helpers referenced by preview and production scripts
- [x] T005 [P] Create `assertCloudSqlDeployContract.ts` exporting `readDeployScript`, `assertMigrationBeforeCloudRunDeploy`, `assertCloudSqlInstancesFlag`, `assertNoHardcodedDbPassword`, and `assertSecretManagerBinding` in `apps/web/src/deploy/assertCloudSqlDeployContract.ts`
- [x] T006 [P] Create Vitest skeleton importing contract helpers in `apps/web/tests/deploy/deployPreviewDatabase.test.ts`
- [x] T007 [P] Create Vitest skeleton importing contract helpers in `apps/web/tests/deploy/deployProductionApi.test.ts`
- [x] T008 [P] Create executable skeleton `deploy/preview/smoke-migrate-bundle.sh` with `set -euo pipefail`, local Postgres container lifecycle, and placeholder bundle build/apply steps per quickstart Scenario 2

**Checkpoint**: Test harness and `deploy/lib/` layout ready — user story implementation can begin

---

## Phase 3: User Story 1 — Deploy Applies Schema Migrations Before the App Serves Traffic (Priority: P1) 🎯 MVP

**Goal**: Shared `migrate-bundle.sh` builds and runs EF migration bundle via Cloud SQL Auth Proxy; deploy fails fast when migrations fail (FR-003, FR-004).

**Independent Test**: Run `deploy/preview/smoke-migrate-bundle.sh` against Docker Postgres — bundle applies with exit 0; Vitest asserts `migrate-bundle.sh` exists and references bundle execution with proxy pattern.

### Tests for User Story 1 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T009 [P] [US1] Add failing test `migrateBundleScript_existsAtExpectedPath` in `apps/web/tests/deploy/deployPreviewDatabase.test.ts` — assert file `deploy/lib/migrate-bundle.sh` exists
- [x] T010 [P] [US1] Add failing test `migrateBundleScript_usesProxyAndBundle` in `apps/web/tests/deploy/deployPreviewDatabase.test.ts` — parse `deploy/lib/migrate-bundle.sh` and assert Cloud SQL Auth Proxy usage and EF bundle execution with non-zero exit on failure
- [x] T011 [US1] Add failing local migration step to `deploy/preview/smoke-migrate-bundle.sh` — build bundle via `dotnet ef migrations bundle` and apply against `postgres:16` container (quickstart Scenario 2)

### Implementation for User Story 1

- [x] T012 [US1] Implement `deploy/lib/migrate-bundle.sh` — accept `INSTANCE_CONNECTION_NAME`, `DB_PASSWORD`, `GCP_PROJECT`; start Cloud SQL Auth Proxy on localhost; build or use pre-built bundle at `artifacts/efbundle`; execute bundle with TCP connection string; exit non-zero on proxy or bundle failure; never echo password (Constitution VIII)
- [x] T013 [US1] Run `deploy/preview/smoke-migrate-bundle.sh` until green — confirm exit 0 and application tables present in local Postgres
- [x] T014 [US1] Run Vitest until green: `cd apps/web && npm run test -- tests/deploy/deployPreviewDatabase.test.ts` (US1 migrate-bundle tests only)

**Checkpoint**: MVP — migration bundle mechanism proven locally; shared lib ready for preview/production orchestration

---

## Phase 4: User Story 2 — Preview Environments Connect to a Disposable Managed Database (Priority: P1)

**Goal**: Ephemeral Cloud SQL per `RUN_ID`, migrations before Cloud Run deploy, connector wiring, seeding succeeds (FR-001, FR-007, FR-008; spec 005 preview contract).

**Independent Test**: `deploy/preview/deploy-preview.sh` with GCP creds provisions DB, migrates, deploys with `--add-cloudsql-instances`, seed endpoint succeeds; `teardown-preview.sh` deletes Cloud SQL instance idempotently.

### Tests for User Story 2 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T015 [P] [US2] Add failing test `deployPreview_migrationBeforeCloudRunDeploy` in `apps/web/tests/deploy/deployPreviewDatabase.test.ts` — `assertMigrationBeforeCloudRunDeploy(readDeployScript('deploy/preview/deploy-preview.sh'))` per `contracts/preview-database-deploy.md`
- [x] T016 [P] [US2] Add failing test `deployPreview_cloudSqlConnectorWiring` in `apps/web/tests/deploy/deployPreviewDatabase.test.ts` — assert `add-cloudsql-instances`, socket `ConnectionStrings__DefaultConnection`, and preview env vars (`Preview__UseFakeQboConnector`, `Preview__EnableTestSeeding`)
- [x] T017 [P] [US2] Add failing test `teardownPreview_deletesCloudSqlInstance` in `apps/web/tests/deploy/deployPreviewDatabase.test.ts` — parse `deploy/preview/teardown-preview.sh` and assert `gcloud sql instances delete` for `splitrail-preview-${RUN_ID}` pattern; assert no reference to `split-rail-db-prod`
- [x] T018 [P] [US2] Add failing test `deployPreview_noHardcodedPassword` in `apps/web/tests/deploy/deployPreviewDatabase.test.ts` — `assertNoHardcodedDbPassword` on preview deploy and lib scripts

### Implementation for User Story 2

- [x] T019 [US2] Implement `deploy/lib/provision-preview-db.sh` — create `splitrail-preview-${RUN_ID}` (`db-f1-micro`, PostgreSQL 16), database `split-rail-db`, generated password (not logged); poll until `RUNNABLE`; export `INSTANCE_CONNECTION_NAME` and `DB_PASSWORD` for callers
- [x] T020 [US2] Extend `deploy/preview/deploy-preview.sh` — after image push: invoke `provision-preview-db.sh` → `dotnet ef migrations bundle` → `deploy/lib/migrate-bundle.sh` → `gcloud run deploy` with `--add-cloudsql-instances`, socket connection string, preview env vars, and `DB_PASSWORD` per `contracts/preview-database-deploy.md`
- [x] T021 [US2] Extend `deploy/preview/teardown-preview.sh` — idempotent delete of Cloud SQL instance `splitrail-preview-${RUN_ID}` after Cloud Run delete (FR-008)
- [x] T022 [US2] Run Vitest until green: `cd apps/web && npm run test -- tests/deploy/deployPreviewDatabase.test.ts`
- [ ] T023 [US2] Optional GCP validation: run `deploy/preview/deploy-preview.sh` then `teardown-preview.sh` with test `GCP_PROJECT`, `GCP_REGION`, `RUN_ID` when credentials available (quickstart Scenario 3)

**Checkpoint**: Preview pipeline provisions isolated DB, migrates before traffic, seeds successfully — spec 005 preview DB gap closed

---

## Phase 5: User Story 3 — Production Deploy Uses Managed Database with Secure Credentials (Priority: P2)

**Goal**: `deploy/production/deploy-api.sh` migrates against `split-rail-db-prod` then deploys Cloud Run with Secret Manager `DB_PASSWORD` (FR-002, FR-006).

**Independent Test**: Vitest contract tests pass; script uses `--set-secrets` not inline password; migration step precedes `gcloud run deploy`.

### Tests for User Story 3 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T024 [P] [US3] Add failing test `deployProductionApi_existsAtExpectedPath` in `apps/web/tests/deploy/deployProductionApi.test.ts` — assert `deploy/production/deploy-api.sh` exists
- [x] T025 [P] [US3] Add failing test `deployProductionApi_migrationBeforeDeploy` in `apps/web/tests/deploy/deployProductionApi.test.ts` — assert migrate-bundle invocation before `gcloud run deploy` per `contracts/production-api-deploy.md`
- [x] T026 [P] [US3] Add failing test `deployProductionApi_secretManagerAndConnector` in `apps/web/tests/deploy/deployProductionApi.test.ts` — assert `add-cloudsql-instances=split-rail:us-central1:split-rail-db-prod`, `--set-secrets=DB_PASSWORD=`, and `assertNoHardcodedDbPassword`

### Implementation for User Story 3

- [x] T027 [US3] Create `deploy/production/deploy-api.sh` — build migration bundle; invoke `deploy/lib/migrate-bundle.sh` against prod instance; `gcloud run deploy` with prod image, cloudsql connector, `ASPNETCORE_ENVIRONMENT=Production`, and Secret Manager binding per contract
- [x] T028 [US3] Run Vitest until green: `cd apps/web && npm run test -- tests/deploy/deployProductionApi.test.ts`

**Checkpoint**: Production API deploy path documented and contract-verified — TDD §7 backend connectivity wired

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: CI integration, documentation, coverage gate, and end-to-end validation.

- [x] T029 [P] Update `deploy/preview/README.md` with Cloud SQL provision/migrate/teardown steps, `smoke-migrate-bundle.sh` usage, and required env vars per quickstart
- [x] T030 Replace `deploy-preview` job stub in `.github/workflows/ci.yml` with invocation of `deploy/preview/deploy-preview.sh` when GCP credentials are configured (retain fallback or clear failure when creds missing); ensure `teardown-preview` remains `if: always()`
- [x] T031 Run quickstart Scenario 1 (Vitest contract tests) and Scenario 2 (local bundle smoke) from `specs/053-cloud-sql-ef-migrations/quickstart.md`
- [x] T032 Verify ≥80.0% line/branch coverage on new/modified frontend verification files via `cd apps/web && npm run test:coverage -- tests/deploy/deployPreviewDatabase.test.ts tests/deploy/deployProductionApi.test.ts` and `assertCloudSqlDeployContract.ts`; missing or unparseable lcov report FAILS (Constitution III)
- [x] T033 [P] Run full backend test suite for regression: `dotnet test apps/api.tests/split-rail-api.tests.csproj -c Release` (no new backend code expected; gate must remain green)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS all user stories**
- **User Story 1 (Phase 3)**: Depends on Foundational — delivers shared `migrate-bundle.sh`
- **User Story 2 (Phase 4)**: Depends on US1 (`migrate-bundle.sh` must exist)
- **User Story 3 (Phase 5)**: Depends on US1 (`migrate-bundle.sh` must exist); independent of US2
- **Polish (Phase 6)**: Depends on US2 + US3 (or at minimum US1 + desired story completion)

### User Story Dependencies

- **User Story 1 (P1)**: After Foundational — no dependency on US2/US3; **MVP slice**
- **User Story 2 (P1)**: After US1 — preview orchestration calls `migrate-bundle.sh`
- **User Story 3 (P2)**: After US1 — production orchestration calls `migrate-bundle.sh`; parallel with US2 after US1 complete

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- `migrate-bundle.sh` before preview/production script extensions
- Contract tests green before optional GCP validation

### Parallel Opportunities

- T002, T003 (Setup review docs)
- T005, T006, T007, T008 (Foundational helpers and skeletons)
- T009, T010 (US1 contract tests)
- T015, T016, T017, T018 (US2 contract tests)
- T024, T025, T026 (US3 contract tests)
- T029, T033 (Polish docs + backend regression)
- **After US1**: US2 and US3 can proceed in parallel on different scripts

---

## Parallel Example: User Story 2

```bash
# Launch all contract tests for User Story 2 together (after Foundational):
Task: "deployPreview_migrationBeforeCloudRunDeploy in apps/web/tests/deploy/deployPreviewDatabase.test.ts"
Task: "deployPreview_cloudSqlConnectorWiring in apps/web/tests/deploy/deployPreviewDatabase.test.ts"
Task: "teardownPreview_deletesCloudSqlInstance in apps/web/tests/deploy/deployPreviewDatabase.test.ts"
Task: "deployPreview_noHardcodedPassword in apps/web/tests/deploy/deployPreviewDatabase.test.ts"
```

---

## Parallel Example: After User Story 1

```bash
# Developer A — Preview path:
Task: "provision-preview-db.sh + deploy-preview.sh + teardown-preview.sh"

# Developer B — Production path:
Task: "deploy/production/deploy-api.sh + deployProductionApi.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1 (`migrate-bundle.sh` + local smoke)
4. **STOP and VALIDATE**: `smoke-migrate-bundle.sh` green; migrate-bundle contract tests green
5. Proceed to US2 for full preview pipeline value

### Incremental Delivery

1. Setup + Foundational → harness ready
2. User Story 1 → shared migration lib proven locally (**MVP**)
3. User Story 2 → preview Cloud SQL + E2E preview unblocked
4. User Story 3 → production deploy path complete
5. Polish → CI wiring + coverage gate

### Parallel Team Strategy

1. Team completes Setup + Foundational + US1 together
2. Once US1 is done:
   - Developer A: US2 (preview provision + deploy + teardown)
   - Developer B: US3 (production deploy-api.sh)
3. Polish phase after both paths merge

---

## Notes

- `deploy/lib/migrate-bundle.sh` is the single migration execution surface — preview and production MUST not duplicate proxy/bundle logic
- Preview instance names MUST sanitize `RUN_ID` for GCP Cloud SQL naming rules
- Never commit or log cleartext `DB_PASSWORD` (Constitution VIII, SC-004)
- `[P]` tasks = different files, no incomplete-task dependencies
- Optional GCP tasks (T023) require credentials — not blocking local/CI contract test path
- Web Firebase Hosting (`deploy/production/deploy-web-hosting.sh`) is out of scope
