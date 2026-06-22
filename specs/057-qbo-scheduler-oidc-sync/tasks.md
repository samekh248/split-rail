---
description: "Task list for Scheduled QBO Sync Trigger for Deployed Environments (SPLR-49)"
---

# Tasks: Scheduled QBO Sync Trigger for Deployed Environments

**Input**: Design documents from `/specs/057-qbo-scheduler-oidc-sync/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/qbo-scheduler-provision.md, contracts/internal-sync-trigger-auth.md, quickstart.md

**Tests**: REQUIRED per Constitution III. xUnit integration tests verify OIDC accept/reject matrix and production startup validation. Vitest contract tests in `apps/web/tests/deploy/` verify provision/validate scripts (paired `.sh`/`.ps1`), cron schedule, OIDC flags, and deploy env vars. Backend ≥80.0% line/branch coverage on new auth, concurrency, and validator code; frontend ≥80.0% on `assertQboSchedulerContract.ts` and related Vitest files.

**Organization**: Tasks grouped by user story (US1–US3). US1 and US2 are both P1; **recommended implementation order** is US2 (auth) → US3 (IaC) → US1 deploy integration, because production automated sync requires OIDC auth and a provisioned scheduler job. US1 concurrency/logging tasks can start after Foundational.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1–US3 (maps to user stories in spec.md)
- All paths are repo-relative
- Operator/deploy scripts: when adding a runnable `deploy/**/*.sh`, also add the paired `deploy/**/*.ps1` (Constitution §X)

## Path Conventions

- Provision script (new): `deploy/infra/provision-qbo-scheduler.sh`, `deploy/infra/provision-qbo-scheduler.ps1`
- Name resolution (new): `deploy/lib/qbo-scheduler-names.sh`, `deploy/lib/qbo-scheduler-names.ps1`
- Validate script (new): `deploy/lib/validate-qbo-scheduler.sh`, `deploy/lib/validate-qbo-scheduler.ps1`
- Production deploy (edit): `deploy/production/deploy-api.sh`, `deploy/production/deploy-api.ps1`
- API auth/config (edit): `apps/api/Program.cs`, `apps/api/Configuration/QboSyncOptions.cs`, `apps/api/Configuration/ProductionSecretConfigurationValidator.cs`, `apps/api/Controllers/QboSyncController.cs`, `apps/api/Services/QboSyncService.cs`
- Contract helper (new): `apps/web/src/deploy/assertQboSchedulerContract.ts`
- Vitest tests (new/edit): `apps/web/tests/deploy/deployQboScheduler.test.ts`, `apps/web/tests/deploy/deployProductionApi.test.ts`
- xUnit tests (edit/new): `apps/api.tests/Integration/QboInternalSyncControllerTests.cs`, `apps/api.tests/Unit/ProductionSecretConfigurationValidatorTests.cs`, `apps/api.tests/Unit/QboSyncServiceConcurrencyTests.cs`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm branch, feature pointer, and design artifacts before implementation.

- [x] T001 Verify branch `057-qbo-scheduler-oidc-sync` is checked out and `.specify/feature.json` points to `specs/057-qbo-scheduler-oidc-sync`
- [x] T002 [P] Review scheduler provisioning contract in `specs/057-qbo-scheduler-oidc-sync/contracts/qbo-scheduler-provision.md`
- [x] T003 [P] Review internal trigger auth contract in `specs/057-qbo-scheduler-oidc-sync/contracts/internal-sync-trigger-auth.md`
- [x] T004 [P] Review OIDC and scheduler decisions in `specs/057-qbo-scheduler-oidc-sync/research.md` and validation scenarios in `specs/057-qbo-scheduler-oidc-sync/quickstart.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared configuration fields, Vitest assertion helpers, and test skeletons. **Blocks all user stories.**

**⚠️ CRITICAL**: No user story work begins until assertion module and `QboSyncOptions` extensions exist.

- [x] T005 [P] Extend `QboSyncOptions` with `SchedulerServiceAccountEmail` and `SchedulerTokenAudience` in `apps/api/Configuration/QboSyncOptions.cs`
- [x] T006 [P] Add empty scheduler config placeholders to `apps/api/appsettings.json` (`QboSync:SchedulerServiceAccountEmail`, `QboSync:SchedulerTokenAudience`)
- [x] T007 [P] Create `assertQboSchedulerContract.ts` exporting `assertSchedulerCronSchedule`, `assertSchedulerOidcFlags`, `assertSchedulerScriptParity`, `assertProductionSchedulerEnvVars`, and `assertNoInternalTriggerKeySecret` in `apps/web/src/deploy/assertQboSchedulerContract.ts`
- [x] T008 [P] Create Vitest skeleton importing scheduler helpers in `apps/web/tests/deploy/deployQboScheduler.test.ts`

**Checkpoint**: Shared config and test harness ready — user story implementation can begin

---

## Phase 3: User Story 2 — Internal Sync Trigger Rejects Unauthorized Callers (Priority: P1)

**Goal**: Replace production shared-key auth with Google OIDC service-account JWT validation; reject anonymous, user JWT, wrong SA, and shared-key callers in production (FR-005–FR-008, SC-002).

**Independent Test**: xUnit matrix — anonymous → 401, wrong key → 401 (Production), wrong SA JWT → 403, valid scheduler SA JWT → 202; production startup fails without scheduler config.

> **Implement this phase before US1 deploy validation tasks** — scheduler OIDC tokens require the auth gate.

### Tests for User Story 2 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T009 [P] [US2] Add failing test `TriggerSync_WithoutAuth_Returns401` in `apps/api.tests/Integration/QboInternalSyncControllerTests.cs` — Production host, no `Authorization` header
- [x] T010 [P] [US2] Add failing test `TriggerSync_WithSharedKeyInProduction_Returns401` in `apps/api.tests/Integration/QboInternalSyncControllerTests.cs` — `ASPNETCORE_ENVIRONMENT=Production`, `X-Internal-Sync-Key` header present
- [x] T011 [P] [US2] Add failing test `TriggerSync_WithWrongServiceAccountJwt_Returns403` in `apps/api.tests/Integration/QboInternalSyncControllerTests.cs` — Bearer JWT with mismatched `email` claim
- [x] T012 [P] [US2] Add failing test `TriggerSync_WithValidSchedulerJwt_ReturnsAccepted` in `apps/api.tests/Integration/QboInternalSyncControllerTests.cs` — Bearer JWT with correct `email` and `aud` claims
- [x] T013 [P] [US2] Add failing test `Validate_rejectsMissingSchedulerServiceAccountEmail` in `apps/api.tests/Unit/ProductionSecretConfigurationValidatorTests.cs`
- [x] T014 [P] [US2] Add failing test `Validate_noLongerRequiresInternalTriggerKey` in `apps/api.tests/Unit/ProductionSecretConfigurationValidatorTests.cs`

### Implementation for User Story 2

- [x] T015 [US2] Register `GoogleScheduler` JWT bearer scheme (`Authority=https://accounts.google.com`, audience from `QboSync:SchedulerTokenAudience`) and `SchedulerTrigger` authorization policy in `apps/api/Program.cs`
- [x] T016 [P] [US2] Create `SchedulerTriggerRequirement` and `SchedulerTriggerAuthorizationHandler` in `apps/api/Authorization/SchedulerTriggerAuthorization.cs` — validate `email` claim equals `QboSync:SchedulerServiceAccountEmail`
- [x] T017 [US2] Update `QboInternalSyncController.TriggerSync` in `apps/api/Controllers/QboSyncController.cs` — apply `[Authorize(AuthenticationSchemes = "GoogleScheduler", Policy = "SchedulerTrigger")]` in Production; retain dev shared-key fallback when `EnableInProcessTimer=true` in Development
- [x] T018 [US2] Update `ProductionSecretConfigurationValidator.Validate` in `apps/api/Configuration/ProductionSecretConfigurationValidator.cs` — require `SchedulerServiceAccountEmail` and `SchedulerTokenAudience`; remove `InternalTriggerKey` requirement
- [x] T019 [US2] Extend `Program.cs` production startup block to validate scheduler config via updated `ProductionSecretConfigurationValidator`
- [x] T020 [US2] Run xUnit until green: `dotnet test apps/api.tests --filter "FullyQualifiedName~QboInternalSync|FullyQualifiedName~ProductionSecretConfigurationValidator"`

**Checkpoint**: Internal trigger accepts only authorized scheduler OIDC identity in production

---

## Phase 4: User Story 3 — Scheduler Job Provisioned via Repeatable Infrastructure (Priority: P2)

**Goal**: Idempotent paired provision/validate scripts create scheduler SA + 6-hour Cloud Scheduler job with OIDC auth (FR-009–FR-013, SC-003, SC-004).

**Independent Test**: Vitest asserts both `.sh`/`.ps1` exist, cron `0 */6 * * *`, OIDC flags, distinct job/SA names per `ENV=dev|prod`; `validate-qbo-scheduler` script structure passes contract tests.

### Tests for User Story 3 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T021 [P] [US3] Add failing test `provisionScript_existsAtExpectedPath` in `apps/web/tests/deploy/deployQboScheduler.test.ts` — assert `deploy/infra/provision-qbo-scheduler.sh` and `.ps1` exist
- [x] T022 [P] [US3] Add failing test `provisionScript_setsSixHourCronAndOidc` in `apps/web/tests/deploy/deployQboScheduler.test.ts` — call `assertSchedulerCronSchedule` and `assertSchedulerOidcFlags` on bash script
- [x] T023 [P] [US3] Add failing test `validateScript_checksScheduleUriAndOidc` in `apps/web/tests/deploy/deployQboScheduler.test.ts` — parse `deploy/lib/validate-qbo-scheduler.sh`
- [x] T024 [P] [US3] Add failing test `schedulerScripts_pairedShAndPs1` in `apps/web/tests/deploy/deployQboScheduler.test.ts` — call `assertSchedulerScriptParity` for provision, validate, and names libs

### Implementation for User Story 3

- [x] T025 [P] [US3] Create `deploy/lib/qbo-scheduler-names.sh` — resolve job name, SA ID, and SA email per `ENV=dev|prod` per `specs/057-qbo-scheduler-oidc-sync/contracts/qbo-scheduler-provision.md`
- [x] T026 [P] [US3] Create `deploy/lib/qbo-scheduler-names.ps1` — PowerShell parity for name resolution (Constitution §X)
- [x] T027 [US3] Create `deploy/infra/provision-qbo-scheduler.sh` — idempotent SA create + `gcloud scheduler jobs create http` / `update http` with `0 */6 * * *`, POST to `{CLOUD_RUN_URL}/api/internal/qbo-sync-trigger`, OIDC SA + audience; invoke validate on success
- [x] T028 [US3] Create `deploy/infra/provision-qbo-scheduler.ps1` — PowerShell parity using `deploy/lib/gcloud-invoke.ps1` (Constitution §X)
- [x] T029 [US3] Create `deploy/lib/validate-qbo-scheduler.sh` — verify job exists, schedule, URI suffix, OIDC SA email, and audience; exit non-zero on failure
- [x] T030 [US3] Create `deploy/lib/validate-qbo-scheduler.ps1` — PowerShell parity for validate script
- [x] T031 [US3] Implement `assertSchedulerCronSchedule`, `assertSchedulerOidcFlags`, `assertSchedulerScriptParity`, and validate-script helpers in `apps/web/src/deploy/assertQboSchedulerContract.ts` to satisfy T021–T024
- [x] T032 [US3] Run Vitest until green: `cd apps/web && npm run test -- tests/deploy/deployQboScheduler.test.ts`

**Checkpoint**: Scheduler job can be provisioned and validated via version-controlled scripts on both platforms

---

## Phase 5: User Story 1 — Automated QBO Sync Runs Every 6 Hours in Deployed Environments (Priority: P1) 🎯 MVP

**Goal**: Scheduled trigger invokes `SyncAllEligibleEventsAsync` safely; production deploy wires scheduler config and validates job before deploy; overlapping triggers debounced (FR-001–FR-004, FR-014, SC-001).

**Independent Test**: xUnit confirms concurrent triggers do not double-sync; Vitest confirms `deploy/production/deploy-api.sh` sets `QboSync__SchedulerServiceAccountEmail` and `QboSync__SchedulerTokenAudience` and removes `QBO_INTERNAL_TRIGGER_KEY` from `--set-secrets`; manual `gcloud scheduler jobs run` triggers sync per quickstart Scenario B.

> **Depends on**: US2 (OIDC auth) and US3 (provision/validate scripts) for production deploy validation.

### Tests for User Story 1 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T033 [P] [US1] Add failing test `SyncAllEligibleEventsAsync_overlappingCalls_serialized` in `apps/api.tests/Unit/QboSyncServiceConcurrencyTests.cs` — concurrent calls must not run overlapping sync batches
- [x] T034 [P] [US1] Add failing test `TriggerSync_logsStructuredOutcome` in `apps/api.tests/Integration/QboInternalSyncControllerTests.cs` — assert log scope contains `triggerSource` and `eventsSynced` without token values
- [x] T035 [P] [US1] Add failing test `deployProductionApi_schedulerEnvVars` in `apps/web/tests/deploy/deployProductionApi.test.ts` — call `assertProductionSchedulerEnvVars` on `deploy/production/deploy-api.sh`
- [x] T036 [P] [US1] Add failing test `deployProductionApi_noInternalTriggerKeySecret` in `apps/web/tests/deploy/deployProductionApi.test.ts` — call `assertNoInternalTriggerKeySecret` on `deploy/production/deploy-api.sh`

### Implementation for User Story 1

- [x] T037 [US1] Add `SemaphoreSlim(1,1)` guard around `SyncAllEligibleEventsAsync` in `apps/api/Services/QboSyncService.cs` — return or await in-flight batch; log `outcome=skipped-concurrent` when debounced
- [x] T038 [US1] Add structured logging to `QboInternalSyncController.TriggerSync` in `apps/api/Controllers/QboSyncController.cs` — log `triggerSource`, `eventsSynced`, `durationMs`, `outcome`; never log JWT or keys (Constitution VIII)
- [x] T039 [US1] Extend `deploy/production/deploy-api.sh` — add pre-deploy `validate-qbo-scheduler.sh` with `ENV=prod`; set `QboSync__SchedulerServiceAccountEmail` and `QboSync__SchedulerTokenAudience` in `--set-env-vars`; remove `QBO_INTERNAL_TRIGGER_KEY` from `--set-secrets` per `specs/057-qbo-scheduler-oidc-sync/contracts/qbo-scheduler-provision.md`
- [x] T040 [US1] Extend `deploy/production/deploy-api.ps1` — PowerShell parity for validate step, scheduler env vars, and removed trigger-key secret (Constitution §X)
- [x] T041 [US1] Implement `assertProductionSchedulerEnvVars` and `assertNoInternalTriggerKeySecret` in `apps/web/src/deploy/assertQboSchedulerContract.ts` to satisfy T035–T036
- [x] T042 [US1] Run xUnit until green: `dotnet test apps/api.tests --filter "FullyQualifiedName~QboSyncServiceConcurrency|FullyQualifiedName~QboInternalSync"`
- [x] T043 [US1] Run Vitest until green: `cd apps/web && npm run test -- tests/deploy/deployProductionApi.test.ts tests/deploy/deployQboScheduler.test.ts`

**Checkpoint**: MVP — production deploy contract, sync concurrency, and scheduler wiring proven by automated tests

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, infrastructure memory, coverage gate, and quickstart validation.

- [x] T044 [P] Update scheduler job and SA references in `.specify/memory/infrastructure.md`
- [x] T045 [P] Update `apps/web/tests/deploy/assertProductionSecretsContract.test.ts` if it still asserts `QBO_INTERNAL_TRIGGER_KEY` binding — align with spec 057 superseding spec 055 trigger-key path
- [x] T046 Verify ≥80.0% line/branch coverage for new backend code via `dotnet test apps/api.tests /p:CollectCoverage=true /p:CoverletOutputFormat=cobertura` and new frontend modules via `cd apps/web && npm run test:coverage`; missing or unparseable reports FAIL (Constitution III)
- [x] T047 Run quickstart validation scenarios A–F in `specs/057-qbo-scheduler-oidc-sync/quickstart.md` (automated CI scenarios required; GCP live scenarios optional with credentialed operator)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS all user stories**
- **US2 (Phase 3)**: Depends on Foundational — **implement before US1 deploy tasks**
- **US3 (Phase 4)**: Depends on Foundational — can parallel with US2 after T007–T008
- **US1 (Phase 5)**: Depends on Foundational; deploy tasks (T039–T040) depend on US2 + US3
- **Polish (Phase 6)**: Depends on all user stories

### User Story Dependencies

```text
Foundational (T005–T008)
    ├── US2 Auth (T009–T020) ──────────────┐
    └── US3 IaC Scripts (T021–T032) ───────┤
                                            ▼
                              US1 Deploy + Sync (T033–T043)
                                            ▼
                                    Polish (T044–T047)
```

- **US2 (P1)**: No story dependencies; provides OIDC gate for production scheduler
- **US3 (P2)**: No story dependencies; provides provision/validate scripts
- **US1 (P1)**: Concurrency/logging (T033–T034, T037–T038) can start after Foundational; deploy wiring (T035–T036, T039–T043) requires US2 + US3

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Auth policy before controller attribute changes
- Name-resolution libs before provision scripts
- Provision scripts before validate scripts reference them
- Story complete before Polish phase

### Parallel Opportunities

- T002, T003, T004 (Setup reviews)
- T005, T006, T007, T008 (Foundational)
- T009–T014 (US2 tests)
- T021–T024 (US3 tests)
- T025, T026 (names libs)
- T033–T036 (US1 tests)
- T044, T045 (Polish docs/tests alignment)
- US2 and US3 can proceed in parallel after Foundational (different file sets)

---

## Parallel Example: User Story 3

```bash
# Launch all US3 tests together:
# T021 provisionScript_existsAtExpectedPath
# T022 provisionScript_setsSixHourCronAndOidc
# T023 validateScript_checksScheduleUriAndOidc
# T024 schedulerScripts_pairedShAndPs1

# Launch name-resolution libs together:
# T025 deploy/lib/qbo-scheduler-names.sh
# T026 deploy/lib/qbo-scheduler-names.ps1
```

---

## Parallel Example: User Story 2

```bash
# Launch all US2 auth tests together:
dotnet test apps/api.tests --filter "FullyQualifiedName~QboInternalSync"
dotnet test apps/api.tests --filter "FullyQualifiedName~ProductionSecretConfigurationValidator"
```

---

## Implementation Strategy

### MVP First (US2 + US3 + US1)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: US2 (OIDC auth gate)
4. Complete Phase 4: US3 (scheduler IaC scripts)
5. Complete Phase 5: US1 (deploy wiring + sync reliability)
6. **STOP and VALIDATE**: Run quickstart Scenario B (`gcloud scheduler jobs run`) against dev
7. Complete Phase 6: Polish + coverage gate

### Incremental Delivery

1. Foundational → US2 → unauthorized callers blocked in production
2. US3 → scheduler job provisionable via scripts
3. US1 → full automated 6-hour sync path in deployed environments

### Parallel Team Strategy

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: US2 (API auth)
   - Developer B: US3 (deploy scripts + Vitest)
3. Merge US2 + US3, then Developer A or B completes US1 deploy integration

---

## Notes

- US1 and US2 are both P1 in the spec; implementation order US2 → US3 → US1 avoids rework on deploy bindings
- Preview environments intentionally omit scheduler provisioning (spec FR-003)
- Spec 057 supersedes spec 055 `QBO_INTERNAL_TRIGGER_KEY` production binding — update any conflicting contract tests in Polish phase
- Local development continues using in-process timer; no scheduler required locally
- Verify tests fail before implementing; commit after each task or logical group

---

## Task Summary

| Phase | Story | Task IDs | Count |
|-------|-------|----------|-------|
| 1 Setup | — | T001–T004 | 4 |
| 2 Foundational | — | T005–T008 | 4 |
| 3 US2 Auth | US2 | T009–T020 | 12 |
| 4 US3 IaC | US3 | T021–T032 | 12 |
| 5 US1 Sync | US1 | T033–T043 | 11 |
| 6 Polish | — | T044–T047 | 4 |
| **Total** | | **T001–T047** | **47** |

**MVP scope**: Phases 1–5 (US2 + US3 + US1) — 43 tasks  
**Independent test criteria**:
- US2: xUnit OIDC accept/reject matrix + production startup validation
- US3: Vitest provision/validate script contracts (paired platforms)
- US1: Concurrency unit test + deploy env var contracts + optional live scheduler run
