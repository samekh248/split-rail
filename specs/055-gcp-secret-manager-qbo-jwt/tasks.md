---
description: "Task list for Centralized Secret Management for Production Credentials (SPLR-48)"
---

# Tasks: Centralized Secret Management for Production Credentials

**Input**: Design documents from `/specs/055-gcp-secret-manager-qbo-jwt/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/production-secret-bindings.md, contracts/committed-config-hygiene.md, quickstart.md

**Tests**: REQUIRED per Constitution III. Vitest contract tests in `apps/web/tests/deploy/` verify all `--set-secrets` bindings, appsettings hygiene, and absence of hardcoded JWT/QBO secrets in deploy scripts. xUnit `WebApplicationFactory` integration tests verify production startup fail-fast and success with injected secrets. Backend ≥80.0% line/branch coverage on new `ProductionSecretConfigurationTests.cs` and any new validation code; frontend ≥80.0% on `assertProductionSecretsContract.ts` and related Vitest files.

**Organization**: Tasks grouped by user story (US1–US3). US1 and US2 are both P1; US1 delivers deploy/runtime wiring (MVP); US2 delivers repository hygiene. US3 validates rotation semantics.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1–US3 (maps to user stories in spec.md)
- All paths are repo-relative

## Path Conventions

- Provision script (new): `deploy/infra/provision-app-secrets.sh`
- Production deploy (edit): `deploy/production/deploy-api.sh`
- API config (edit): `apps/api/appsettings.json`, `apps/api/appsettings.Development.json`, `apps/api/Program.cs`
- Contract helper (new): `apps/web/src/deploy/assertProductionSecretsContract.ts`
- Vitest tests (new/edit): `apps/web/tests/deploy/deployProductionApi.test.ts`, `apps/web/tests/deploy/assertProductionSecretsContract.test.ts`
- xUnit tests (new): `apps/api.tests/Integration/ProductionSecretConfigurationTests.cs`
- Contracts: `specs/055-gcp-secret-manager-qbo-jwt/contracts/production-secret-bindings.md`, `specs/055-gcp-secret-manager-qbo-jwt/contracts/committed-config-hygiene.md`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm branch, feature pointer, and design artifacts before implementation.

- [x] T001 Verify branch `055-gcp-secret-manager-qbo-jwt` is checked out and `.specify/feature.json` points to `specs/055-gcp-secret-manager-qbo-jwt`
- [x] T002 [P] Review secret binding contract in `specs/055-gcp-secret-manager-qbo-jwt/contracts/production-secret-bindings.md`
- [x] T003 [P] Review config hygiene contract in `specs/055-gcp-secret-manager-qbo-jwt/contracts/committed-config-hygiene.md`
- [x] T004 [P] Review secret naming and validation decisions in `specs/055-gcp-secret-manager-qbo-jwt/research.md` and validation scenarios in `specs/055-gcp-secret-manager-qbo-jwt/quickstart.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared Vitest assertion helpers and test skeletons. **Blocks all user stories.**

**⚠️ CRITICAL**: No user story work begins until assertion module and test skeletons exist.

- [x] T005 [P] Create `assertProductionSecretsContract.ts` exporting `assertProductionSecretBindings`, `assertNoHardcodedJwtOrQboSecrets`, and `assertProductionAppsettingsHygiene` in `apps/web/src/deploy/assertProductionSecretsContract.ts`
- [x] T006 [P] Create Vitest skeleton importing production secret helpers in `apps/web/tests/deploy/assertProductionSecretsContract.test.ts`
- [x] T007 [P] Extend Vitest skeleton in `apps/web/tests/deploy/deployProductionApi.test.ts` to import helpers from `apps/web/src/deploy/assertProductionSecretsContract.ts`

**Checkpoint**: Test harness ready — user story implementation can begin

---

## Phase 3: User Story 1 — Production Service Boots with All Sensitive Credentials from Managed Secret Storage (Priority: P1) 🎯 MVP

**Goal**: Cloud Run production deploy binds all five secrets via `--set-secrets`; API validates and resolves JWT, QBO, and DB credentials at startup (FR-001, FR-005).

**Independent Test**: Vitest asserts full `--set-secrets` list in `deploy/production/deploy-api.sh`; xUnit confirms `WebApplicationFactory` starts in Production only when `Jwt__Secret`, `QBO_CLIENT_ID`, `QBO_CLIENT_SECRET`, and `DB_PASSWORD` env vars are set.

### Tests for User Story 1 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T008 [P] [US1] Add failing unit tests for `assertProductionSecretBindings` in `apps/web/tests/deploy/assertProductionSecretsContract.test.ts` — require `Jwt__Secret`, `QBO_CLIENT_ID`, `QBO_CLIENT_SECRET`, `QBO_INTERNAL_TRIGGER_KEY` alongside existing `DB_PASSWORD` in sample script text
- [x] T009 [P] [US1] Add failing test `deployProductionApi_allSecretBindings` in `apps/web/tests/deploy/deployProductionApi.test.ts` — parse `deploy/production/deploy-api.sh` and call `assertProductionSecretBindings`
- [x] T010 [P] [US1] Add failing integration test `ProductionStartup_FailsWhenSecretsMissing` in `apps/api.tests/Integration/ProductionSecretConfigurationTests.cs` — `WebApplicationFactory<Program>` with `ASPNETCORE_ENVIRONMENT=Production` and no secret env vars must fail host build/startup
- [x] T011 [P] [US1] Add failing integration test `ProductionStartup_SucceedsWithInjectedSecrets` in `apps/api.tests/Integration/ProductionSecretConfigurationTests.cs` — set `Jwt__Secret`, `QBO_CLIENT_ID`, `QBO_CLIENT_SECRET`, `QBO_INTERNAL_TRIGGER_KEY`, `DB_PASSWORD` via `WithWebHostBuilder` and assert host starts

### Implementation for User Story 1

- [x] T012 [US1] Extend `deploy/production/deploy-api.sh` — add comma-separated `--set-secrets` bindings for `Jwt__Secret=jwt-signing-key:latest`, `QBO_CLIENT_ID=qbo-client-id:latest`, `QBO_CLIENT_SECRET=qbo-client-secret:latest`, `QBO_INTERNAL_TRIGGER_KEY=qbo-internal-trigger-key:latest` alongside existing `DB_PASSWORD=db-password:latest` per `specs/055-gcp-secret-manager-qbo-jwt/contracts/production-secret-bindings.md`
- [x] T013 [US1] Extend `apps/api/Program.cs` — add production-only startup validation: after config binding, fail fast when `Jwt:Secret`, `QboSync:ClientId`, or `QboSync:ClientSecret` is null/empty or matches known placeholder strings; ensure error messages do not log secret values (Constitution VIII)
- [x] T014 [P] [US1] Create `deploy/infra/provision-app-secrets.sh` — idempotent `gcloud secrets describe || gcloud secrets create` for `jwt-signing-key`, `qbo-client-id`, `qbo-client-secret`, `qbo-internal-trigger-key` (and document `db-password` as pre-existing); never echo or commit secret values
- [x] T015 [US1] Run Vitest until green: `cd apps/web && npm run test -- tests/deploy/deployProductionApi.test.ts tests/deploy/assertProductionSecretsContract.test.ts` (US1 binding tests)
- [x] T016 [US1] Run xUnit until green: `cd apps/api.tests && dotnet test --filter "FullyQualifiedName~ProductionSecretConfiguration"` (US1 startup tests)

**Checkpoint**: MVP — production deploy contract and startup validation proven by automated tests

---

## Phase 4: User Story 2 — Repository and Deploy Artifacts Contain No Production Plaintext Secrets (Priority: P1)

**Goal**: Remove production credential placeholders from committed config; CI contract tests reject cleartext JWT/QBO secrets in repo and deploy scripts (FR-002, FR-003, FR-004, FR-008, SC-002).

**Independent Test**: Vitest `assertProductionAppsettingsHygiene` passes on `apps/api/appsettings.json`; `assertNoHardcodedJwtOrQboSecrets` passes on `deploy/production/deploy-api.sh`.

### Tests for User Story 2 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T017 [P] [US2] Add failing unit tests for `assertProductionAppsettingsHygiene` in `apps/web/tests/deploy/assertProductionSecretsContract.test.ts` — assert `Jwt.Secret`, `QboSync.ClientId`, `QboSync.ClientSecret` are empty in `apps/api/appsettings.json` and `InternalTriggerKey` has no dev default
- [x] T018 [P] [US2] Add failing unit tests for `assertNoHardcodedJwtOrQboSecrets` in `apps/web/tests/deploy/assertProductionSecretsContract.test.ts` — reject scripts containing JWT/QBO literal patterns outside variable references
- [x] T019 [P] [US2] Add failing test `deployProductionApi_noHardcodedJwtOrQboSecrets` in `apps/web/tests/deploy/deployProductionApi.test.ts` — call `assertNoHardcodedJwtOrQboSecrets` on `deploy/production/deploy-api.sh`
- [x] T020 [P] [US2] Add failing test `deployProductionApi_appsettingsHygiene` in `apps/web/tests/deploy/deployProductionApi.test.ts` — call `assertProductionAppsettingsHygiene` against repo root

### Implementation for User Story 2

- [x] T021 [US2] Update `apps/api/appsettings.json` — set `Jwt:Secret` to empty string; ensure `QboSync:ClientId` and `QboSync:ClientSecret` are empty; remove `QboSync:InternalTriggerKey` dev default from base config per `specs/055-gcp-secret-manager-qbo-jwt/contracts/committed-config-hygiene.md`
- [x] T022 [P] [US2] Update `apps/api/appsettings.Development.json` — add `QboSync` section with `InternalTriggerKey` and any dev-only QBO defaults moved from base `apps/api/appsettings.json`
- [x] T023 [US2] Implement `assertProductionAppsettingsHygiene` and `assertNoHardcodedJwtOrQboSecrets` in `apps/web/src/deploy/assertProductionSecretsContract.ts` to satisfy T017–T020
- [x] T024 [US2] Run Vitest until green: `cd apps/web && npm run test -- tests/deploy/deployProductionApi.test.ts tests/deploy/assertProductionSecretsContract.test.ts` (US2 hygiene tests)

**Checkpoint**: Repository and deploy scripts pass automated secret-hygiene contract tests

---

## Phase 5: User Story 3 — Operators Can Rotate Secrets Without Application Code Changes (Priority: P2)

**Goal**: Deploy bindings use `:latest` secret versions; rotation workflow documented and verifiable without source changes (SC-005, User Story 3).

**Independent Test**: Contract tests confirm all secret bindings reference `:latest` (or documented pinned alias); quickstart Scenario 6 steps are accurate.

### Tests for User Story 3 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T025 [P] [US3] Add failing test `assertProductionSecretBindings_useLatestVersions` in `apps/web/tests/deploy/assertProductionSecretsContract.test.ts` — each binding in `assertProductionSecretBindings` must reference `:latest` unless contract documents pinned version
- [x] T026 [P] [US3] Add failing integration test `ProductionStartup_ReadsQboOptionsFromEnvironment` in `apps/api.tests/Integration/ProductionSecretConfigurationTests.cs` — assert `IOptions<QboSyncOptions>` resolves `ClientId`/`ClientSecret` from `QBO_CLIENT_ID`/`QBO_CLIENT_SECRET` env overrides when set

### Implementation for User Story 3

- [x] T027 [US3] Extend `assertProductionSecretBindings` in `apps/web/src/deploy/assertProductionSecretsContract.ts` — validate `:latest` suffix on all five secret bindings per research.md rotation semantics
- [x] T028 [P] [US3] Add JWT rotation note and secret version update commands to `specs/055-gcp-secret-manager-qbo-jwt/quickstart.md` Scenario 6 if not already complete (immediate cutover policy)
- [x] T029 [US3] Run Vitest and xUnit until green for US3 tests: `cd apps/web && npm run test -- tests/deploy/` and `cd apps/api.tests && dotnet test --filter "FullyQualifiedName~ProductionSecretConfiguration"`

**Checkpoint**: Rotation contract verified; operators can roll secrets via Secret Manager + service redeploy only

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: CI integration, coverage gate, and end-to-end validation.

- [x] T030 [P] Ensure `.github/workflows/ci.yml` runs Vitest deploy tests including `apps/web/tests/deploy/deployProductionApi.test.ts` and `apps/web/tests/deploy/assertProductionSecretsContract.test.ts` on PRs touching `deploy/` or `apps/api/appsettings.json`
- [x] T031 [P] Add inline comment in `deploy/production/deploy-api.sh` documenting that `DB_PASSWORD` for migration step must be fetched via `gcloud secrets versions access` before script run (no literal password) per contract migration step
- [x] T032 Verify ≥80.0% line/branch coverage for new backend code via `cd apps/api.tests && dotnet test /p:CollectCoverage=true /p:CoverletOutputFormat=cobertura` on `ProductionSecretConfigurationTests.cs` and any new validation paths in `apps/api/Program.cs`; missing or unparseable cobertura report FAIL
- [x] T033 Verify ≥80.0% line/branch coverage for new frontend code via `cd apps/web && npm run test:coverage -- tests/deploy/deployProductionApi.test.ts tests/deploy/assertProductionSecretsContract.test.ts`; missing or unparseable lcov report FAIL
- [x] T034 Run quickstart.md Scenario 1 locally (contract tests, no GCP) and document any deviations in PR description

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS all user stories**
- **User Story 1 (Phase 3)**: Depends on Foundational — **MVP**
- **User Story 2 (Phase 4)**: Depends on Foundational; logically follows US1 deploy extension but hygiene tests can be written in parallel with US1 tests (different files)
- **User Story 3 (Phase 5)**: Depends on US1 deploy bindings and US2 config hygiene being in place
- **Polish (Phase 6)**: Depends on US1–US3 complete

### User Story Dependencies

```text
Phase 1 Setup
    ↓
Phase 2 Foundational (assertProductionSecretsContract.ts + skeletons)
    ↓
    ├── Phase 3 US1 (deploy bindings + Program.cs validation + startup tests) 🎯 MVP
    ├── Phase 4 US2 (appsettings hygiene + repo audit tests) — can overlap US1 after T005
    └── Phase 5 US3 (rotation contract + QBO env resolution test) — after US1+US2
            ↓
    Phase 6 Polish (CI + coverage + quickstart)
```

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Contract assertions before deploy/config edits
- Story checkpoint before next priority

### Parallel Opportunities

- T002, T003, T004 (Setup reviews) — parallel
- T005, T006, T007 (Foundational) — parallel after T001
- T008–T011 (US1 tests) — parallel
- T010, T011 (xUnit) parallel with T008, T009 (Vitest)
- T014 (provision script) parallel with T012–T013 after tests written
- T017–T020 (US2 tests) — parallel
- T021, T022 (config files) — parallel after US2 tests written
- T025, T026 (US3 tests) — parallel
- T030, T031 (Polish) — parallel

---

## Parallel Example: User Story 1

```bash
# Launch all US1 tests together (different files):
Task T008: assertProductionSecretBindings unit tests in apps/web/tests/deploy/assertProductionSecretsContract.test.ts
Task T009: deployProductionApi_allSecretBindings in apps/web/tests/deploy/deployProductionApi.test.ts
Task T010: ProductionStartup_FailsWhenSecretsMissing in apps/api.tests/Integration/ProductionSecretConfigurationTests.cs
Task T011: ProductionStartup_SucceedsWithInjectedSecrets in apps/api.tests/Integration/ProductionSecretConfigurationTests.cs

# After tests fail, implement in order:
Task T012: deploy/production/deploy-api.sh
Task T013: apps/api/Program.cs
Task T014: deploy/infra/provision-app-secrets.sh (parallel with T012/T013)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1 (deploy bindings + startup validation)
4. **STOP and VALIDATE**: Vitest deploy contract + xUnit startup tests green
5. Demo production deploy dry-run (script parse only) or staging deploy if credentials available

### Incremental Delivery

1. Setup + Foundational → test harness ready
2. US1 → production secret bindings + fail-fast startup → **MVP**
3. US2 → remove placeholders from repo → hygiene CI gate
4. US3 → rotation contract + QBO env resolution verification
5. Polish → coverage gate + quickstart validation

### Parallel Team Strategy

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: US1 (deploy + Program.cs + xUnit)
   - Developer B: US2 (appsettings + hygiene Vitest)
3. Developer A or B: US3 rotation tests after US1 bindings land
4. Either: Polish phase

---

## Notes

- Builds on spec 053 `DB_PASSWORD` binding — do not regress `assertSecretManagerBinding` from `apps/web/src/deploy/assertCloudSqlDeployContract.ts`
- Data Protection GCS/KMS key ring (spec 047) is orthogonal — do not conflate with boot secrets
- Preview deploy (`deploy/preview/deploy-preview.sh`) intentionally uses ephemeral credentials — out of scope (FR-007)
- Secret **values** are never committed; `provision-app-secrets.sh` creates resources only
- JWT rotation invalidates existing tokens (immediate cutover) — document for operators in quickstart Scenario 6
