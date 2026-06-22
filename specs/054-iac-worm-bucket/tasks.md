---
description: "Task list for Infrastructure-as-Code for Settlement Archive Storage (SPLR-47)"
---

# Tasks: Infrastructure-as-Code for Settlement Archive Storage

**Input**: Design documents from `/specs/054-iac-worm-bucket/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/settlement-buckets-provision.md, contracts/non-preview-deploy-wiring.md, quickstart.md

**Tests**: REQUIRED per Constitution III. Vitest contract tests in `apps/web/tests/deploy/` verify provision/validate script content, production deploy `SettlementArchive__*` wiring, and preview omitting bucket overrides. xUnit tests cover `Program.cs` archive backend selection and `SettlementArchiveStartupValidator` scope changes. Final Polish phase enforces ≥80.0% line/branch coverage on **new/modified** Vitest helpers/tests and touched backend files via `npm run test:coverage` (Vitest → lcov) and `dotnet test --collect:"XPlat Code Coverage"` (coverlet → cobertura). Missing or unparseable coverage reports FAIL.

**Organization**: Tasks grouped by user story (US1–US3). Shared contract helpers (Phase 2) unblock IaC scripts (US1), application/deploy wiring (US2), and environment isolation validation (US3).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1–US3 (maps to user stories in spec.md)
- All paths are repo-relative

## Path Conventions

- IaC provision (new): `deploy/infra/provision-settlement-buckets.sh`
- Validate lib (new): `deploy/lib/validate-settlement-buckets.sh`
- Production deploy (edit): `deploy/production/deploy-api.sh`
- Preview deploy (read-only contract): `deploy/preview/deploy-preview.sh`
- Backend options (edit): `apps/api/Configuration/SettlementArchiveOptions.cs`
- Backend DI (edit): `apps/api/Program.cs`
- Startup validator (edit): `apps/api/Services/SettlementArchiveStartupValidator.cs`
- App settings (edit): `apps/api/appsettings.json`, `apps/api/appsettings.Development.json`
- Contract helper (new): `apps/web/src/deploy/assertSettlementBucketContract.ts`
- Vitest tests (new/extend): `apps/web/tests/deploy/deploySettlementBuckets.test.ts`, `apps/web/tests/deploy/deployProductionApi.test.ts`, `apps/web/tests/deploy/deployPreviewDatabase.test.ts`
- xUnit tests (new/extend): `apps/api.tests/Unit/SettlementArchiveStartupValidatorTests.cs`, `apps/api.tests/Unit/ProgramSettlementArchiveRegistrationTests.cs` (or equivalent)
- Infra memory (edit): `.specify/memory/infrastructure.md`
- Contracts: `specs/054-iac-worm-bucket/contracts/settlement-buckets-provision.md`, `specs/054-iac-worm-bucket/contracts/non-preview-deploy-wiring.md`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm branch, feature pointer, and design artifacts before implementation.

- [x] T001 Verify branch `054-iac-worm-bucket` is checked out and `.specify/feature.json` points to `specs/054-iac-worm-bucket`
- [x] T002 [P] Review IaC contracts in `specs/054-iac-worm-bucket/contracts/settlement-buckets-provision.md` and `specs/054-iac-worm-bucket/contracts/non-preview-deploy-wiring.md`
- [x] T003 [P] Review bucket naming, IAM, and deploy wiring decisions in `specs/054-iac-worm-bucket/research.md` and validation scenarios in `specs/054-iac-worm-bucket/quickstart.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared `deploy/infra/` layout, contract assertion helpers, and Vitest skeletons. **Blocks all user stories.**

**⚠️ CRITICAL**: No user story work begins until helper module and test skeletons exist.

- [x] T004 Create `deploy/infra/` directory for settlement bucket provisioning scripts referenced by quickstart and contracts
- [x] T005 [P] Create `assertSettlementBucketContract.ts` exporting `readDeployScript`, `assertArchiveRetentionPeriod`, `assertStagingHasNoRetentionLock`, `assertProdBucketLockRequiresConfirm`, `assertSettlementArchiveEnvVars`, and `assertPreviewOmitsSettlementArchiveEnvVars` in `apps/web/src/deploy/assertSettlementBucketContract.ts`
- [x] T006 [P] Create Vitest skeleton importing contract helpers in `apps/web/tests/deploy/deploySettlementBuckets.test.ts`
- [x] T007 [P] Add Vitest skeleton describe block for settlement archive env vars in `apps/web/tests/deploy/deployProductionApi.test.ts` (extend existing production deploy tests file)

**Checkpoint**: Test harness and `deploy/infra/` layout ready — user story implementation can begin

---

## Phase 3: User Story 1 — Settlement Archive Buckets Provisioned via Repeatable Infrastructure (Priority: P1) 🎯 MVP

**Goal**: Idempotent gcloud scripts provision WORM archive bucket (7-year retention) and deletable staging bucket per `ENV=dev|preview|prod` (FR-001–FR-005).

**Independent Test**: `ENV=dev ./deploy/infra/provision-settlement-buckets.sh` then `ENV=dev ./deploy/lib/validate-settlement-buckets.sh` exits 0; archive has ≥2555d retention; staging has no retention lock.

### Tests for User Story 1 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T008 [P] [US1] Add failing test `provisionScript_existsAtExpectedPath` in `apps/web/tests/deploy/deploySettlementBuckets.test.ts` — assert file `deploy/infra/provision-settlement-buckets.sh` exists
- [x] T009 [P] [US1] Add failing test `provisionScript_setsArchiveRetention2555Days` in `apps/web/tests/deploy/deploySettlementBuckets.test.ts` — parse `deploy/infra/provision-settlement-buckets.sh` and assert `2555` retention period and archive bucket create/update commands per `contracts/settlement-buckets-provision.md`
- [x] T010 [P] [US1] Add failing test `provisionScript_stagingWithoutRetentionLock` in `apps/web/tests/deploy/deploySettlementBuckets.test.ts` — assert staging bucket provisioning does not invoke `--lock-retention-period` or retention on staging bucket name
- [x] T011 [P] [US1] Add failing test `validateScript_checksRetentionAndPublicAccess` in `apps/web/tests/deploy/deploySettlementBuckets.test.ts` — assert file `deploy/lib/validate-settlement-buckets.sh` exists and references archive retention validation plus public access prevention checks

### Implementation for User Story 1

- [x] T012 [US1] Implement `deploy/lib/validate-settlement-buckets.sh` — resolve bucket names from `ENV`; verify archive retention ≥ 2555 days, staging has no effective retention, public access prevention enforced; exit non-zero with actionable stderr on failure; never print credentials (Constitution VIII)
- [x] T013 [US1] Implement `deploy/infra/provision-settlement-buckets.sh` — idempotent create/update for archive + staging buckets in `us-central1` Standard class; set archive `--retention-period=2555d`; bind IAM `roles/storage.objectAdmin` for `RUNTIME_SA_EMAIL` (or project default); invoke validate script on success; require `CONFIRM_BUCKET_LOCK=true` before prod `--lock-retention-period` per contract
- [x] T014 [US1] Run Vitest until green: `cd apps/web && npm run test -- tests/deploy/deploySettlementBuckets.test.ts`

**Checkpoint**: MVP — repeatable IaC provision + validate scripts proven by contract tests; operator can provision dev buckets per quickstart Scenario A

---

## Phase 4: User Story 2 — Non-Preview Deployments Use Real Archive Storage (Priority: P1)

**Goal**: Development and Production use `GcsSettlementArchiveStore` with configured bucket names; preview stays in-memory; startup fails fast on misconfiguration; production deploy passes `SettlementArchive__*` env vars (FR-006–FR-009).

**Independent Test**: Vitest asserts production deploy sets bucket env vars; xUnit asserts `Development`/`Production` resolve GCS store and Preview resolves in-memory; validator runs when `EnforceRetentionValidation=true`.

### Tests for User Story 2 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T015 [P] [US2] Add failing test `deployProductionApi_settlementArchiveEnvVars` in `apps/web/tests/deploy/deployProductionApi.test.ts` — `assertSettlementArchiveEnvVars(readDeployScript('deploy/production/deploy-api.sh'))` expecting `split-rail-settlements-prod` and `split-rail-settlements-staging-prod` per `contracts/non-preview-deploy-wiring.md`
- [x] T016 [P] [US2] Add failing test `deployPreview_omitsSettlementArchiveBucketEnvVars` in `apps/web/tests/deploy/deployPreviewDatabase.test.ts` — `assertPreviewOmitsSettlementArchiveEnvVars` on `deploy/preview/deploy-preview.sh`
- [x] T017 [P] [US2] Add failing unit test `Program_UsesGcsStoreForDevelopmentAndProduction` in `apps/api.tests/Unit/ProgramSettlementArchiveRegistrationTests.cs` — verify DI resolves `GcsSettlementArchiveStore` when environment is Development or Production and `UseInMemoryStore` is false
- [x] T018 [P] [US2] Add failing unit test `Program_UsesInMemoryStoreForPreviewSeeding` in `apps/api.tests/Unit/ProgramSettlementArchiveRegistrationTests.cs` — verify Preview with seeding enabled resolves `InMemorySettlementArchiveStore`
- [x] T019 [P] [US2] Add failing unit test `StartupValidator_RunsWhenEnforceRetentionValidationTrue` in `apps/api.tests/Unit/SettlementArchiveStartupValidatorTests.cs` — assert validator executes for Development when `EnforceRetentionValidation=true` (not gated solely on `IsProduction()`)

### Implementation for User Story 2

- [x] T020 [US2] Extend `SettlementArchiveOptions` with `UseInMemoryStore` (default false) in `apps/api/Configuration/SettlementArchiveOptions.cs` per `contracts/non-preview-deploy-wiring.md`
- [x] T021 [US2] Refactor archive store registration in `apps/api/Program.cs` — select `InMemorySettlementArchiveStore` only for Preview seeding or explicit `UseInMemoryStore`; Development and Production MUST use `GcsSettlementArchiveStore`
- [x] T022 [US2] Update `SettlementArchiveStartupValidator` in `apps/api/Services/SettlementArchiveStartupValidator.cs` — run when `EnforceRetentionValidation=true` and `BucketName` is set (any environment), not only `IsProduction()`
- [x] T023 [P] [US2] Update bucket names in `apps/api/appsettings.json` — set `StagingBucketName` to `split-rail-settlements-staging-dev` (or env-appropriate default aligned with data-model.md)
- [x] T024 [P] [US2] Update `apps/api/appsettings.Development.json` — set `StagingBucketName` to `split-rail-settlements-staging-dev` and `EnforceRetentionValidation` to `true` after dev buckets provisioned
- [x] T025 [US2] Extend `deploy/production/deploy-api.sh` — invoke `ENV=prod deploy/lib/validate-settlement-buckets.sh` before deploy; add `--set-env-vars` for `SettlementArchive__BucketName`, `SettlementArchive__StagingBucketName`, `SettlementArchive__RetentionYears=7`, `SettlementArchive__EnforceRetentionValidation=true`
- [x] T026 [US2] Run Vitest until green: `cd apps/web && npm run test -- tests/deploy/deployProductionApi.test.ts tests/deploy/deployPreviewDatabase.test.ts`
- [x] T027 [US2] Run xUnit until green: `dotnet test apps/api.tests --filter "FullyQualifiedName~ProgramSettlementArchive|FullyQualifiedName~SettlementArchiveStartup"`

**Checkpoint**: Non-preview paths wired to GCS; production deploy contract complete; preview unchanged (in-memory)

---

## Phase 5: User Story 3 — Environment-Isolated Buckets with Consistent Security Baseline (Priority: P2)

**Goal**: Distinct archive/staging pairs per `dev|preview|prod`; prod lock guarded; deploy configs never cross-reference prod buckets in non-prod; validation fails on misconfigured buckets (FR-004, FR-010, FR-011; SC-005).

**Independent Test**: Contract tests assert ENV→bucket name map for all three environments; validate script fails on misconfigured bucket; `.specify/memory/infrastructure.md` documents prod staging bucket name.

### Tests for User Story 3 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T028 [P] [US3] Add failing test `provisionScript_resolvesDistinctBucketNamesPerEnv` in `apps/web/tests/deploy/deploySettlementBuckets.test.ts` — assert name table includes `split-rail-settlements-dev`, `split-rail-settlements-preview`, `split-rail-settlements-prod` and matching `-staging-{env}` suffixes per data-model.md
- [x] T029 [P] [US3] Add failing test `provisionScript_prodLockRequiresConfirmFlag` in `apps/web/tests/deploy/deploySettlementBuckets.test.ts` — `assertProdBucketLockRequiresConfirm` on provision script
- [x] T030 [P] [US3] Add failing test `validateScript_exitsNonZeroOnFailure` in `apps/web/tests/deploy/deploySettlementBuckets.test.ts` — assert validate script uses `set -euo pipefail` and explicit non-zero exit paths (grep/script structure contract)
- [x] T031 [P] [US3] Add failing test `deployProductionApi_doesNotReferenceDevBuckets` in `apps/web/tests/deploy/deployProductionApi.test.ts` — assert production script does not set `split-rail-settlements-dev` or `-staging-dev` as active targets

### Implementation for User Story 3

- [x] T032 [US3] Complete ENV→bucket name resolution table and uniform bucket-level access + public access prevention in `deploy/infra/provision-settlement-buckets.sh` for `dev`, `preview`, and `prod` per data-model.md
- [x] T033 [US3] Add IAM binding step for Cloud Run runtime SA on both buckets per environment in `deploy/infra/provision-settlement-buckets.sh` — parameterize `RUNTIME_SA_EMAIL`; no JSON key output
- [x] T034 [US3] Harden idempotency and conflict errors in `deploy/infra/provision-settlement-buckets.sh` — safe re-apply when buckets exist; fail with guidance when locked archive has insufficient retention (edge case from spec.md)
- [x] T035 [P] [US3] Update WORM bucket section in `.specify/memory/infrastructure.md` — document archive `gs://split-rail-settlements-prod`, staging `gs://split-rail-settlements-staging-prod`, 7-year lock, and dev/preview bucket names
- [x] T036 [US3] Run full Vitest deploy suite until green: `cd apps/web && npm run test -- tests/deploy/deploySettlementBuckets.test.ts tests/deploy/deployProductionApi.test.ts tests/deploy/deployPreviewDatabase.test.ts`
- [ ] T037 [US3] Optional GCP validation: run quickstart Scenarios A, B, and G (`ENV=dev` provision + validate; optional `ENV=prod` with `CONFIRM_BUCKET_LOCK=true`) when GCP credentials available

**Checkpoint**: All three environments provisionable with isolated namespaces; infra memory and contracts aligned

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Coverage gate, regression checks, and quickstart validation across all stories.

- [x] T038 [P] Run spec 050 regression suite: `dotnet test apps/api.tests --filter "FullyQualifiedName~SettlementArchiveImmutability|FullyQualifiedName~SettlementAtomicity"` — confirm no regressions from wiring changes
- [x] T039 Verify ≥80.0% line/branch coverage on new/modified Vitest files via `cd apps/web && npm run test:coverage -- tests/deploy/deploySettlementBuckets.test.ts tests/deploy/deployProductionApi.test.ts` and on touched backend files via `dotnet test apps/api.tests --filter "FullyQualifiedName~ProgramSettlementArchive|FullyQualifiedName~SettlementArchiveStartup" --collect:"XPlat Code Coverage"`; missing or unparseable reports FAIL (Constitution III)
- [x] T040 Run quickstart.md validation checklist — document results in PR description (Scenarios A, C, E minimum; B/G when creds available)
- [x] T041 [P] Confirm no service account keys or cleartext secrets added to `deploy/infra/provision-settlement-buckets.sh`, `deploy/lib/validate-settlement-buckets.sh`, or `deploy/production/deploy-api.sh` (Constitution VIII audit)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS all user stories**
- **User Story 1 (Phase 3)**: Depends on Foundational — **MVP**; no dependency on US2/US3
- **User Story 2 (Phase 4)**: Depends on Foundational; soft dependency on US1 for live GCS smoke (unit/contract tests run without GCP)
- **User Story 3 (Phase 5)**: Depends on US1 provision/validate scripts; extends ENV matrix and infra docs
- **Polish (Phase 6)**: Depends on US1–US3 completion (or MVP + agreed scope)

### User Story Dependencies

```text
Foundational (Phase 2)
        │
        ▼
   US1 (Phase 3) ──► MVP: IaC provision + validate
        │
        ├──────────────────┐
        ▼                  ▼
   US2 (Phase 4)      US3 (Phase 5)
   App/deploy wiring   Env isolation + docs
        │                  │
        └────────┬─────────┘
                 ▼
          Polish (Phase 6)
```

- **US1**: Independent after Foundational — delivers core IaC
- **US2**: Can start after Foundational in parallel with US1 (backend/deploy edits independent of bash scripts) but live finalize smoke needs US1 dev buckets
- **US3**: Builds on US1 scripts; audit tests can parallelize with US2

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Validate script (T012) before or alongside provision script (T013) — validate is invoked by provision
- Options (T020) before Program.cs DI (T021)
- Contract tests green before optional GCP validation (T037)

### Parallel Opportunities

- **Phase 1**: T002 ∥ T003
- **Phase 2**: T005 ∥ T006 ∥ T007 (after T004)
- **US1 tests**: T008 ∥ T009 ∥ T010 ∥ T011
- **US2 tests**: T015 ∥ T016 ∥ T017 ∥ T018 ∥ T019
- **US2 config**: T023 ∥ T024 (after T020)
- **US3 tests**: T028 ∥ T029 ∥ T030 ∥ T031
- **US3 + US2**: Different owners can work US2 backend while US1 bash scripts complete
- **Polish**: T038 ∥ T041

---

## Parallel Example: User Story 1

```bash
# Launch all US1 contract tests together (after T005–T007):
Task T008: provisionScript_existsAtExpectedPath in apps/web/tests/deploy/deploySettlementBuckets.test.ts
Task T009: provisionScript_setsArchiveRetention2555Days
Task T010: provisionScript_stagingWithoutRetentionLock
Task T011: validateScript_checksRetentionAndPublicAccess

# After tests fail, implement validate then provision:
Task T012: deploy/lib/validate-settlement-buckets.sh
Task T013: deploy/infra/provision-settlement-buckets.sh
```

---

## Parallel Example: User Story 2

```bash
# Launch US2 tests in parallel:
Task T015: deployProductionApi_settlementArchiveEnvVars
Task T016: deployPreview_omitsSettlementArchiveBucketEnvVars
Task T017–T019: xUnit Program/StartupValidator tests

# Backend wiring (sequential where noted):
Task T020 → T021 → T022; T023 ∥ T024; then T025 deploy script
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1 (provision + validate scripts + Vitest)
4. **STOP and VALIDATE**: Run `ENV=dev` provision + validate per quickstart Scenario A
5. Operator can provision dev buckets before app wiring lands

### Incremental Delivery

1. Setup + Foundational → test harness ready
2. **US1** → IaC MVP (core SPLR-47 gap)
3. **US2** → App + production deploy wiring (acceptance: non-preview uses real bucket)
4. **US3** → Full env matrix, prod lock guard, infra memory
5. **Polish** → coverage gate + regression + quickstart

### Parallel Team Strategy

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - **Developer A**: US1 bash IaC scripts
   - **Developer B**: US2 `Program.cs` / deploy-api.sh / xUnit
3. **US3** after US1 merges or shared contract for bucket name table
4. Polish and optional GCP validation together

---

## Notes

- Pairs with spec 050 — do **not** duplicate `GcsSettlementArchiveStore` retention-on-promote logic; this feature provisions buckets and wires configuration
- Preview intentionally keeps in-memory archive — do not add `SettlementArchive__*` to `deploy/preview/deploy-preview.sh`
- Production Bucket Lock is **irreversible** — require `CONFIRM_BUCKET_LOCK=true` and document in PR/operator runbook
- `[P]` tasks = different files, no incomplete-task dependencies
- Commit after each task or logical group; stop at any checkpoint to validate story independently

---

## Task Summary

| Phase | Story | Task IDs | Count |
|-------|-------|----------|-------|
| Setup | — | T001–T003 | 3 |
| Foundational | — | T004–T007 | 4 |
| US1 IaC provision | US1 | T008–T014 | 7 |
| US2 Non-preview wiring | US2 | T015–T027 | 13 |
| US3 Env isolation | US3 | T028–T037 | 10 |
| Polish | — | T038–T041 | 4 |
| **Total** | | **T001–T041** | **41** |

**Suggested MVP scope**: Phase 1 + Phase 2 + Phase 3 (User Story 1) — **14 tasks** (T001–T014)

**Independent test criteria**:

| Story | Verify independently via |
|-------|--------------------------|
| US1 | Vitest contract tests + `ENV=dev` provision/validate scripts |
| US2 | Vitest deploy env var tests + xUnit Program/StartupValidator tests |
| US3 | Vitest ENV name map + prod lock confirm + infra.md + optional GCP validate |
