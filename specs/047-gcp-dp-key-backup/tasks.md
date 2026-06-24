---
description: "Task list for Back Data Protection Keys with GCP Secret Manager / KMS (SPLR-40)"
---

# Tasks: Back Data Protection Keys with Managed Cloud Secret Storage

**Input**: Design documents from `/specs/047-gcp-dp-key-backup/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/data-protection-config.md, contracts/data-protection-key-ring.md, quickstart.md

**Tests**: REQUIRED per Constitution III. Each user story phase adds xUnit tests in `apps/api.tests/` (write failing tests first, then implement until green). Final Polish phase enforces ≥80.0% line/branch coverage on **backend touched files** via `dotnet test --collect:"XPlat Code Coverage"` (coverlet → cobertura). No frontend changes — frontend coverage gate N/A unless files are touched.

**Organization**: Tasks grouped by user story (US1–US3). Backend slice through `apps/api/Configuration/DataProtectionOptions.cs`, `apps/api/Extensions/DataProtectionServiceExtensions.cs`, and `apps/api/Program.cs`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1–US3 (maps to user stories in spec.md)
- All paths are repo-relative

## Path Conventions

- Options: `apps/api/Configuration/DataProtectionOptions.cs`
- Extension: `apps/api/Extensions/DataProtectionServiceExtensions.cs`
- Host wiring: `apps/api/Program.cs`
- Project packages: `apps/api/split-rail-api.csproj`
- Exceptions: `apps/api/Exceptions/ApiExceptions.cs`
- Unit tests: `apps/api.tests/Unit/DataProtectionConfigurationTests.cs`, `apps/api.tests/Unit/DataProtectionKeyPersistenceTests.cs`
- Test base: `apps/api.tests/Integration/IntegrationTestBase.cs`
- QBO token service: `apps/api/Services/QboTokenService.cs` (unchanged purpose string)
- Contracts: `specs/047-gcp-dp-key-backup/contracts/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Branch verification, design review, and NuGet dependencies.

- [x] T001 Verify branch `047-gcp-dp-key-backup` and design docs in `specs/047-gcp-dp-key-backup/` per plan.md
- [x] T002 [P] Review startup contract in `specs/047-gcp-dp-key-backup/contracts/data-protection-config.md` (Production vs Development matrix, IAM, logging rules)
- [x] T003 [P] Review operational contract in `specs/047-gcp-dp-key-backup/contracts/data-protection-key-ring.md` (O1–O6 operations mapped to acceptance criteria)
- [x] T004 [P] Add NuGet packages `Google.Cloud.AspNetCore.DataProtection.Storage` and `Google.Cloud.AspNetCore.DataProtection.Kms` to `apps/api/split-rail-api.csproj`; run `dotnet restore` in `apps/api/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Configuration model and testable extension method skeleton. **Blocks all user stories.**

**⚠️ CRITICAL**: No user story work begins until T005–T008 compile and `Program.cs` delegates to the extension.

- [x] T005 Create `DataProtectionOptions` in `apps/api/Configuration/DataProtectionOptions.cs` with `SectionName`, `ApplicationName` (default `split-rail-api`), `Bucket`, `ObjectPrefix`, `KmsKeyName` per `specs/047-gcp-dp-key-backup/data-model.md`
- [x] T006 [P] Create `AddSplitRailDataProtection` extension skeleton in `apps/api/Extensions/DataProtectionServiceExtensions.cs` — accept `IServiceCollection`, `IConfiguration`, `IWebHostEnvironment`; branch on `IsProduction()` with TODO throws for missing options (no GCS wiring yet)
- [x] T007 Replace inline `AddDataProtection().PersistKeysToFileSystem(...)` in `apps/api/Program.cs` with `builder.Services.AddSplitRailDataProtection(builder.Configuration, builder.Environment)` and `builder.Services.Configure<DataProtectionOptions>(builder.Configuration.GetSection(DataProtectionOptions.SectionName))`
- [x] T008 [P] Add non-secret Production placeholder section to `apps/api/appsettings.Production.json` (commented or empty `DataProtection` keys documenting `DataProtection__Bucket`, `DataProtection__ObjectPrefix`, `DataProtection__KmsKeyName` env var injection for Cloud Run)

**Checkpoint**: Project builds; Development still uses filesystem via extension stub

---

## Phase 3: User Story 1 — QBO Connections Survive Service Restarts (Priority: P1) 🎯 MVP

**Goal**: Encrypted QBO tokens decrypt after process restart without re-authentication (SC-001).

**Independent Test**: `dotnet test apps/api.tests --filter "FullyQualifiedName~DataProtectionKeyPersistenceTests&FullyQualifiedName~Restart"` — store tokens, dispose factory, new factory with same key directory, `GetValidAccessTokenAsync` returns original access token.

### Tests for User Story 1 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T009 [P] [US1] Add failing integration test `Restart_DecryptsQboTokensAfterFactoryDispose` in `apps/api.tests/Integration/DataProtectionKeyPersistenceTests.cs` — shared temp `dp-keys` directory, `QboTokenService.StoreTokensAsync`, dispose `WebApplicationFactory`, second factory same path, assert `GetValidAccessTokenAsync` matches original per quickstart Scenario A
- [x] T010 [P] [US1] Extend `apps/api.tests/Integration/IntegrationTestBase.cs` with helper `CreateFactoryWithSharedDataProtectionPath(string sharedKeyDirectory)` configuring `ContentRoot` + custom `DataProtection:KeyDirectory` override (or env) so integration tests control key ring location

### Implementation for User Story 1

- [x] T011 [US1] Implement Development/non-Production branch in `apps/api/Extensions/DataProtectionServiceExtensions.cs` — `SetApplicationName`, `PersistKeysToFileSystem` to `{ContentRoot}/dp-keys` (or test override path from configuration)
- [x] T012 [US1] Wire integration test factory helper in `IntegrationTestBase.cs` to pass shared temp directory into Data Protection configuration used by `AddSplitRailDataProtection`
- [x] T013 [US1] Run US1 tests until green: `dotnet test apps/api.tests --filter "FullyQualifiedName~DataProtectionKeyPersistenceTests&FullyQualifiedName~Restart"`

**Checkpoint**: MVP — encrypt/decrypt round-trip survives simulated restart via shared key directory

---

## Phase 4: User Story 2 — Multiple Instances Share One Encryption Key Ring (Priority: P2)

**Goal**: Instance B decrypts tokens encrypted by Instance A concurrently (SC-002).

**Independent Test**: `dotnet test apps/api.tests --filter "FullyQualifiedName~DataProtectionKeyPersistenceTests&FullyQualifiedName~CrossInstance"` — two live factories, same key path, B reads A's ciphertext.

### Tests for User Story 2 (REQUIRED) ⚠️

- [x] T014 [P] [US2] Add failing integration test `CrossInstance_InstanceBDecryptsTokensEncryptedByInstanceA` in `apps/api.tests/Integration/DataProtectionKeyPersistenceTests.cs` — factory A stores tokens, factory B (same shared key directory, both alive) calls `GetValidAccessTokenAsync` per quickstart Scenario B and contract O4

### Implementation for User Story 2

- [x] T015 [US2] Verify `SetApplicationName("split-rail-api")` is consistent across factory instances in `DataProtectionServiceExtensions.cs` so key ring identity matches (no host-name-based drift)
- [x] T016 [US2] Run US2 tests until green: `dotnet test apps/api.tests --filter "FullyQualifiedName~DataProtectionKeyPersistenceTests&FullyQualifiedName~CrossInstance"`

**Checkpoint**: Cross-instance decrypt proven — shared GCS prefix behavior validated via shared directory simulation

---

## Phase 5: User Story 3 — Production Excludes Keys from Ephemeral Local Disk (Priority: P3)

**Goal**: Production uses GCS + KMS only; missing config fails startup; no filesystem fallback (SC-003, SC-004).

**Independent Test**: `dotnet test apps/api.tests --filter "FullyQualifiedName~DataProtectionConfigurationTests"` — Production guard tests pass; `DataProtectionServiceExtensions` Production branch has no `PersistKeysToFileSystem`.

### Tests for User Story 3 (REQUIRED) ⚠️

- [x] T017 [P] [US3] Add failing unit test `Production_MissingBucket_ThrowsOnStartup` in `apps/api.tests/Unit/DataProtectionConfigurationTests.cs` per contract Production startup behavior
- [x] T018 [P] [US3] Add failing unit test `Production_MissingKmsKeyName_ThrowsOnStartup` in `apps/api.tests/Unit/DataProtectionConfigurationTests.cs`
- [x] T019 [P] [US3] Add failing unit test `Production_DoesNotUseFileSystemPersistence` in `apps/api.tests/Unit/DataProtectionConfigurationTests.cs` — assert Production code path registers GCS/KMS only (no `dp-keys` filesystem registration)
- [x] T020 [P] [US3] Add unit test `Development_MissingCloudOptions_UsesFileSystem` in `apps/api.tests/Unit/DataProtectionConfigurationTests.cs` — Development host builds successfully without Bucket/KmsKeyName

### Implementation for User Story 3

- [x] T021 [US3] Implement Production branch in `apps/api/Extensions/DataProtectionServiceExtensions.cs` — validate `Bucket`, `ObjectPrefix`, `KmsKeyName`; `PersistKeysToGoogleCloudStorage` + `ProtectKeysWithGoogleKms`; throw `InvalidOperationException` or `DataProtectionConfigurationException` when required options missing (no filesystem fallback)
- [x] T022 [P] [US3] Add `DataProtectionConfigurationException` to `apps/api/Exceptions/ApiExceptions.cs` if used for startup misconfiguration (Constitution VIII — message lists missing option names only)
- [x] T023 [US3] Run US3 tests until green: `dotnet test apps/api.tests --filter "FullyQualifiedName~DataProtectionConfigurationTests"`

**Checkpoint**: Production wiring complete; fail-fast guard proven without live GCP in CI

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Logging privacy, regression suite, coverage gate, quickstart validation.

- [x] T024 [P] Add unit or integration test `UnprotectFailure_DoesNotLogCleartextTokens` in `apps/api.tests/Unit/DataProtectionConfigurationTests.cs` or `apps/api.tests/Integration/DataProtectionKeyPersistenceTests.cs` — corrupt ciphertext, assert log output lacks token substrings per SC-005
- [x] T025 Run QBO token regression: `dotnet test apps/api.tests --filter "FullyQualifiedName~QboTokenService"` — confirm existing tests still use isolated `DataProtectionProvider.Create("test")` and pass (quickstart Scenario E)
- [x] T026 Verify ≥80.0% line/branch coverage on touched backend files (`DataProtectionOptions`, `DataProtectionServiceExtensions`, `Program.cs` wiring, new test files) via `dotnet test apps/api.tests --collect:"XPlat Code Coverage"`; missing or unparseable cobertura report FAILs
- [x] T027 Run full quickstart validation per `specs/047-gcp-dp-key-backup/quickstart.md` Scenarios A–E; document optional manual GCS/KMS smoke steps for staging in task notes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (T004 packages) — **BLOCKS all user stories**
- **User Story 1 (Phase 3)**: Depends on Foundational — **MVP**
- **User Story 2 (Phase 4)**: Depends on US1 shared-key infrastructure (T010–T012)
- **User Story 3 (Phase 5)**: Depends on Foundational; independent of US1/US2 tests but should land after US1 proves dev path works
- **Polish (Phase 6)**: Depends on US1–US3 complete

### User Story Dependencies

| Story | Depends on | Independent test filter |
|-------|------------|-------------------------|
| US1 (P1) | Phase 2 | `~Restart` |
| US2 (P2) | US1 key-path helper | `~CrossInstance` |
| US3 (P3) | Phase 2 | `~DataProtectionConfigurationTests` |

### Within Each User Story

- Tests MUST be written and FAIL before implementation (TDD)
- Extension method before Program.cs changes (already in Foundational)
- Story checkpoint before next priority

### Parallel Opportunities

- Phase 1: T002, T003, T004 in parallel after T001
- Phase 2: T006 and T008 parallel after T005
- US1 tests: T009, T010 in parallel
- US3 tests: T017–T020 all parallel
- US3 impl: T022 parallel with T021 if exception type agreed upfront

---

## Parallel Example: User Story 3

```bash
# Launch all US3 unit tests together (before implementation):
Task T017: Production_MissingBucket_ThrowsOnStartup in apps/api.tests/Unit/DataProtectionConfigurationTests.cs
Task T018: Production_MissingKmsKeyName_ThrowsOnStartup in apps/api.tests/Unit/DataProtectionConfigurationTests.cs
Task T019: Production_DoesNotUseFileSystemPersistence in apps/api.tests/Unit/DataProtectionConfigurationTests.cs
Task T020: Development_MissingCloudOptions_UsesFileSystem in apps/api.tests/Unit/DataProtectionConfigurationTests.cs
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1 (restart survival)
4. **STOP and VALIDATE**: `dotnet test --filter "~Restart"`
5. Deploy to Development — manual restart test per quickstart

### Incremental Delivery

1. Setup + Foundational → extension compiles
2. US1 → restart decrypt proven (MVP)
3. US2 → cross-instance decrypt proven
4. US3 → Production GCS/KMS + fail-fast guard
5. Polish → coverage + regression + quickstart

### Parallel Team Strategy

1. Team completes Setup + Foundational together
2. Developer A: US1 + US2 (integration tests, shared key path)
3. Developer B: US3 (unit tests + Production GCS/KMS branch) — can start test authoring after Phase 2

---

## Notes

- Infrastructure provisioning (GCS bucket, KMS key, Cloud Run IAM, env vars) is **out of repo scope** — coordinate via security milestone; document env vars in T008 only
- No EF migrations, no new HTTP endpoints, no frontend changes
- `QboTokenService` purpose string `"QboOAuthTokens"` MUST remain unchanged
- Production cutover may require one-time QBO re-auth for venues with tokens encrypted under old ephemeral filesystem keys
- Commit after each task or logical group; stop at any checkpoint to validate story independently
