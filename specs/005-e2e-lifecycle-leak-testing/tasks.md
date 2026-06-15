---
description: "Task list for Full-Scale E2E Lifecycle & Cross-Tenant Leak Testing (SPLR-20)"
---

# Tasks: Full-Scale E2E Lifecycle & Cross-Tenant Leak Testing

**Input**: Design documents from `/specs/005-e2e-lifecycle-leak-testing/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Organization**: Tasks grouped by user story to enable independent implementation and testing. E2E specs are the primary deliverable for US1–US3 (explicitly required by spec + Constitution III). Backend unit tests cover new preview seams only.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Maps to user stories from spec.md (US1–US5)
- Include exact file paths in every task description

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize the Playwright E2E workspace and frontend coverage tooling required by the quality gates.

- [x] T001 Create `tests/e2e/` workspace scaffold (`package.json`, `tsconfig.json`, `.gitignore`) per plan.md structure
- [x] T002 [P] Add `@playwright/test` dependency and npm scripts (`test`, `test:shard`) in `tests/e2e/package.json`
- [x] T003 [P] Configure Playwright projects (chromium, firefox, webkit, touch mobile), `retries: 2`, trace/screenshot/video-on-failure, and sharding support in `tests/e2e/playwright.config.ts`
- [x] T004 [P] Add `@vitest/coverage-v8` dev dependency and `test:coverage` script in `apps/web/package.json`
- [x] T005 [P] Configure Vitest coverage provider (`v8`), `lcov` reporter, and 80% thresholds in `apps/web/vite.config.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Hermetic preview backend seams, deterministic seeding surface, deploy scripts, and shared E2E fixtures. **No user story work can begin until this phase is complete.**

- [x] T006 [P] Create `PreviewOptions` configuration class (`UseFakeQboConnector`, `EnableTestSeeding`) in `apps/api/Configuration/PreviewOptions.cs`
- [x] T007 [P] Extract `IQboTransactionClient` interface from existing `QboTransactionClient` in `apps/api/Services/IQboTransactionClient.cs`
- [x] T008 Update `QboTransactionClient` to implement `IQboTransactionClient` in `apps/api/Services/QboTransactionClient.cs` (no behavior change)
- [x] T009 Update `QboSyncService` to depend on `IQboTransactionClient` instead of concrete client in `apps/api/Services/QboSyncService.cs`
- [x] T010 [P] Implement deterministic read-only `FakeQboTransactionClient` seeded with fixed actuals in `apps/api/Services/FakeQboTransactionClient.cs`
- [x] T011 [P] Implement `QboEgressRecordingHandler` (`DelegatingHandler` recording verb+host, rejecting POST/PUT/DELETE to Intuit) in `apps/api/Http/QboEgressRecordingHandler.cs`
- [x] T012 [P] Create seeding DTOs (reset response, lifecycle-event request/response with decimal-string money fields) in `apps/api/DTOs/Seeding/SeedingDtos.cs`
- [x] T013 Implement env-gated `TestSeedingController` (`POST /api/test-seed/reset`, `POST /api/test-seed/lifecycle-event`) in `apps/api/Controllers/TestSeedingController.cs` per `contracts/seeding-api.md`
- [x] T014 Extend `Program.cs` to conditionally register fake QBO connector, egress handler, and seeding controller when `PreviewOptions` flags are set in `apps/api/Program.cs`
- [x] T015 [P] Add unit tests for `FakeQboTransactionClient` deterministic actuals and read-only behavior in `apps/api.tests/Unit/FakeQboTransactionClientTests.cs`
- [x] T016 [P] Add unit tests for `QboEgressRecordingHandler` mutating-verb rejection and egress recording in `apps/api.tests/Unit/QboEgressRecordingHandlerTests.cs`
- [x] T017 Create ephemeral preview deploy script (build/push images, provision DB, deploy Cloud Run, migrate, seed, emit `PREVIEW_BASE_URL`) in `deploy/preview/deploy-preview.sh`
- [x] T018 [P] Create idempotent preview teardown script (delete Cloud Run service, ephemeral DB, bucket; `if: always()` safe) in `deploy/preview/teardown-preview.sh`
- [x] T019 [P] Implement parallel two-org authenticated session fixture in `tests/e2e/fixtures/auth.ts`
- [x] T020 [P] Implement seeding API client fixture calling `/api/test-seed/*` in `tests/e2e/fixtures/seed.ts`
- [x] T021 [P] Implement request capture/replay helpers for cross-tenant attack simulation in `tests/e2e/fixtures/api-intercept.ts`
- [x] T022 Regenerate frontend contract types from updated swagger (includes seeding DTOs) in `apps/web/src/types/generated-api.ts` via `apps/web/scripts/gen-api.mjs`

**Checkpoint**: Preview can deploy with fake QBO + seeding; E2E fixtures can authenticate and seed deterministic data.

---

## Phase 3: User Story 1 — Cross-Tenant Leak Prevention (Priority: P1) 🎯 MVP

**Goal**: Prove one organization can never reach another organization's data via automated browser tests with parallel sessions, direct navigation, and replayed requests.

**Independent Test**: Run `tests/e2e/specs/isolation/` alone — two org admins in parallel sessions; every cross-org attempt denied with zero foreign sentinels in responses (SC-001).

- [x] T023 [P] [US1] Implement direct-navigation cross-org denial spec in `tests/e2e/specs/isolation/cross-tenant-direct-nav.spec.ts`
- [x] T024 [P] [US1] Implement intercepted-request replay cross-org denial spec in `tests/e2e/specs/isolation/cross-tenant-replay.spec.ts`
- [x] T025 [P] [US1] Implement venue-scoped user out-of-scope denial spec in `tests/e2e/specs/isolation/venue-scope.spec.ts`

**Checkpoint**: Isolation suite passes independently against a seeded preview; 100% cross-org attempts denied (SC-001).

---

## Phase 4: User Story 2 — Full Lifecycle State Machine (Priority: P1)

**Goal**: Automated end-to-end walkthrough of planning → budget lock → settlement → touch signature finalize → read-only → reconciliation variance.

**Independent Test**: Run `tests/e2e/specs/lifecycle/full-lifecycle.spec.ts` alone against a freshly seeded event — full traversal completes with exact base-10 math and retrievable settlement document (SC-002).

- [x] T026 [US2] Implement planning and budget-lock field editability assertions in `tests/e2e/specs/lifecycle/full-lifecycle.spec.ts`
- [x] T027 [US2] Implement night-of settlement value entry and exact base-10 payout/total assertions (decimal-string literals) in `tests/e2e/specs/lifecycle/full-lifecycle.spec.ts`
- [x] T028 [US2] Implement touch-signature simulation (pointer/drag on canvas under mobile project) and finalize flow in `tests/e2e/specs/lifecycle/full-lifecycle.spec.ts`
- [x] T029 [US2] Implement post-finalize absolute read-only lock, settlement document retrieval, and variance display assertions in `tests/e2e/specs/lifecycle/full-lifecycle.spec.ts`

**Checkpoint**: Lifecycle suite passes independently; signature exercised under touch-enabled viewport (FR-001a).

---

## Phase 5: User Story 3 — Write-Infiltration & Audit Immutability (Priority: P2)

**Goal**: Prove zero QBO writes and byte-for-byte settlement document immutability after underlying data mutation.

**Independent Test**: Run `tests/e2e/specs/integrity/` alone — zero mutating QBO egress recorded; settlement document hash unchanged after DB mutation (SC-003, SC-004).

- [x] T030 [P] [US3] Implement zero write-infiltration spec asserting no POST/PUT/DELETE to Intuit via egress recorder in `tests/e2e/specs/integrity/zero-write-infiltration.spec.ts`
- [x] T031 [US3] Implement audit immutability spec (hash document pre/post DB mutation, verify frozen-record edit rejection) in `tests/e2e/specs/integrity/audit-immutability.spec.ts`

**Checkpoint**: Integrity suite passes independently; settlement document byte-for-byte unchanged after mutation (SC-003).

---

## Phase 6: User Story 4 — Quality Gates Block Unsafe Merges (Priority: P2)

**Goal**: Wire coverage and E2E gates as required merge blockers on `main`; ephemeral preview always torn down; failure artifacts captured.

**Independent Test**: Submit a PR that drops coverage or breaks an E2E scenario → merge blocked; submit a passing PR → merge allowed (SC-008).

- [x] T032 Create GitHub Actions workflow skeleton with stage graph per `contracts/ci-pipeline.md` in `.github/workflows/ci.yml`
- [x] T033 [P] Add parallel backend build + xUnit + coverlet cobertura job in `.github/workflows/ci.yml`
- [x] T034 [P] Add parallel frontend build + Vitest + lcov coverage job in `.github/workflows/ci.yml`
- [x] T035 Add contract type-drift job (build API → export swagger → `gen:api` → `git diff --exit-code`) in `.github/workflows/ci.yml`
- [x] T036 Add `coverage-gate` required-check job (≥80.0% both sides; missing/unparseable report ⇒ fail) in `.github/workflows/ci.yml`
- [x] T037 Add `deploy-preview` job invoking `deploy/preview/deploy-preview.sh` and emitting `PREVIEW_BASE_URL` in `.github/workflows/ci.yml`
- [x] T038 Add sharded `e2e-matrix` job (`{project} × {shard}`, Playwright against preview URL, failure artifacts upload) in `.github/workflows/ci.yml`
- [x] T039 Add `e2e-gate` required-check job aggregating all matrix shards in `.github/workflows/ci.yml`
- [x] T040 Add `teardown-preview` job with `if: always()` invoking `deploy/preview/teardown-preview.sh` in `.github/workflows/ci.yml`
- [x] T041 Document and apply branch protection requiring `coverage-gate` and `e2e-gate` on `main` in `deploy/preview/README.md`

**Checkpoint**: Full PR pipeline runs; failing coverage or E2E blocks merge; preview always torn down (SC-005, SC-006, SC-008).

---

## Phase 7: User Story 5 — Integration Seams Stabilized (Priority: P3)

**Goal**: Verify consistent route/error contracts, zero type drift, and deployable build artifacts.

**Independent Test**: Inspect API surface for uniform `api/` prefix and `ErrorResponse` shape; regenerate types with no drift; production build succeeds (SC-007).

- [x] T042 [P] [US5] Audit all controllers for consistent route prefix, `ErrorResponse` contract shape, and status codes; document findings in `specs/005-e2e-lifecycle-leak-testing/contracts/route-audit.md`
- [x] T043 [US5] Fix any route prefix, error-contract, or status-code inconsistencies found across `apps/api/Controllers/*.cs`
- [x] T044 [P] [US5] Verify `apps/web` build succeeds against regenerated `apps/web/src/types/generated-api.ts` with zero manual drift
- [x] T045 [US5] Optimize and verify deployable build artifacts (API Docker image + static web bundle) suitable for preview deploy in `apps/api/Dockerfile` and `apps/web/vite.config.ts`

**Checkpoint**: API surface consistent; frontend types match backend; build artifacts deploy successfully to preview (FR-018/019/020).

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, time-budget validation, and end-to-end acceptance proof.

- [x] T046 [P] Write E2E workspace run instructions (local + CI, suite filtering, env vars) in `tests/e2e/README.md`
- [x] T047 Run full local validation sequence from `specs/005-e2e-lifecycle-leak-testing/quickstart.md`
- [x] T048 Verify full PR pipeline completes within ≈30-minute wall-clock budget with sharded E2E matrix (SC-009)
- [x] T049 Demonstrate SC-008 enforcement: one intentionally failing PR (coverage drop) and one passing PR both behave correctly against gates

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — **BLOCKS all user stories**
- **US1 (Phase 3)**: Depends on Foundational — no dependency on US2/US3
- **US2 (Phase 4)**: Depends on Foundational — no dependency on US1/US3 (uses same seeding fixture)
- **US3 (Phase 5)**: Depends on Foundational — lifecycle finalize from US2 is exercised internally but integrity specs can seed+finalize independently
- **US4 (Phase 6)**: Depends on US1 + US2 + US3 (E2E gate needs all suites); coverage/type-drift jobs can be built in parallel during US1–US3
- **US5 (Phase 7)**: Depends on Foundational; best completed before or alongside US4 final wiring
- **Polish (Phase 8)**: Depends on US4 completion

### User Story Dependencies

| Story | Priority | Depends On | Can Parallelize With |
|-------|----------|------------|----------------------|
| US1 | P1 | Foundational | US2, US3 (after Foundational) |
| US2 | P1 | Foundational | US1, US3 |
| US3 | P2 | Foundational | US1, US2 |
| US4 | P2 | US1–US3 suites exist | US5 (partial) |
| US5 | P3 | Foundational | US1–US3, US4 (partial) |

### Within Each User Story

- Foundational backend seams (T006–T014) before E2E specs
- Seeding DTOs + controller before fixture `seed.ts` and before E2E specs
- Deploy scripts before CI `deploy-preview` job
- All three isolation specs (T023–T025) can run in parallel
- Lifecycle spec tasks (T026–T029) are sequential within the same file
- CI workflow jobs T033–T034 can be built in parallel; T037–T039 depend on T032–T037

### Parallel Opportunities

- **Phase 1**: T002, T003, T004, T005 in parallel after T001
- **Phase 2**: T006+T007+T010+T011+T012 in parallel; T015+T016 in parallel; T018+T019+T020+T021 in parallel
- **Phase 3**: T023, T024, T025 fully parallel
- **Phase 5**: T030 can start while T031 waits for lifecycle finalize helper (or seeds independently)
- **Phase 6**: T033+T034 in parallel; US1–US3 spec work can proceed while T032–T036 are built
- **Phase 7**: T042+T044 in parallel

---

## Parallel Example: User Story 1

```bash
# After Foundational checkpoint, launch all isolation specs together:
Task T023: "Implement direct-navigation cross-org denial spec in tests/e2e/specs/isolation/cross-tenant-direct-nav.spec.ts"
Task T024: "Implement intercepted-request replay cross-org denial spec in tests/e2e/specs/isolation/cross-tenant-replay.spec.ts"
Task T025: "Implement venue-scoped user out-of-scope denial spec in tests/e2e/specs/isolation/venue-scope.spec.ts"
```

## Parallel Example: Foundational Backend Seams

```bash
# These touch different files and can run concurrently:
Task T006: PreviewOptions.cs
Task T007: IQboTransactionClient.cs
Task T010: FakeQboTransactionClient.cs
Task T011: QboEgressRecordingHandler.cs
Task T012: SeedingDtos.cs
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1 (isolation suite)
4. **STOP and VALIDATE**: Run isolation specs against local/preview — SC-001
5. Demo cross-tenant leak prevention proof

### Incremental Delivery

1. Setup + Foundational → hermetic preview + fixtures ready
2. US1 → isolation proven (MVP release criterion #2: Zero Cross-Tenant Contamination)
3. US2 → lifecycle proven (operational assembly verification)
4. US3 → integrity proven (Zero Write Infiltration + Audit Immutability)
5. US4 → gates enforce all proofs on every PR
6. US5 → integration seams polished
7. Polish → full quickstart + SC-008/SC-009 validation

### Parallel Team Strategy

With multiple developers after Foundational:

- **Developer A**: US1 isolation specs (T023–T025)
- **Developer B**: US2 lifecycle spec (T026–T029)
- **Developer C**: US3 integrity specs (T030–T031) + US4 CI wiring (T032–T041)
- **Developer D**: US5 seam audit (T042–T045)

---

## Notes

- [P] tasks = different files, no incomplete-task dependencies
- [Story] label maps task to spec user story for traceability
- No new domain schema/migrations in this milestone (FR-022)
- Seeding controller and fake QBO connector MUST remain disabled outside Preview/Test environments
- Money assertions in E2E specs MUST use decimal-string literals, never JS `number` (Constitution I)
- E2E diagnostic artifacts (trace/screenshot/video) captured only after retry budget exhausted (FR-016a)
- Commit after each task or logical group; stop at any checkpoint to validate story independently
