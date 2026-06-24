# Implementation Plan: Back Data Protection Keys with Managed Cloud Secret Storage

**Branch**: `047-gcp-dp-key-backup` | **Date**: 2026-06-21 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/047-gcp-dp-key-backup/spec.md` (Linear SPLR-40)

## Summary

Replace filesystem Data Protection key persistence (`dp-keys/` in `Program.cs`) with **Google Cloud Storage + Cloud KMS** in Production so QBO OAuth tokens encrypted via `IDataProtector` remain decryptable across Cloud Run restarts and multiple instances. Development keeps local filesystem keys; Production fails startup if GCS/KMS is misconfigured (no silent fallback). Uses official `Google.Cloud.AspNetCore.DataProtection.Storage` and `Google.Cloud.AspNetCore.DataProtection.Kms` packages with Workload Identity (same ADC pattern as settlement GCS). No database migrations, no new HTTP endpoints, no frontend UI changes — configuration + tests only.

## Technical Context

**Language/Version**: C# / .NET 8.0 (backend `apps/api` only; no frontend changes).

**Primary Dependencies**: ASP.NET Core 8 (existing); `Microsoft.AspNetCore.DataProtection.Extensions` (existing); **NEW** `Google.Cloud.AspNetCore.DataProtection.Storage`, `Google.Cloud.AspNetCore.DataProtection.Kms`; existing `Google.Cloud.Storage.V1` (settlement — separate concern). Tests: xUnit + WebApplicationFactory + Testcontainers.PostgreSql (existing).

**Storage**: GCS bucket `split-rail-dp-keys-prod` (key ring XML); Cloud KMS crypto key (key ring encryption at rest). PostgreSQL unchanged — `qbo_venue_credentials` encrypted blobs remain in Cloud SQL.

**Testing**: xUnit unit (configuration branching, Production guard); xUnit integration (shared temp key directory restart + cross-instance decrypt via `QboTokenService`); existing `QboTokenServiceTests` unchanged. Optional manual staging smoke against real GCS/KMS per quickstart. ≥80.0% line/branch coverage on touched backend files (Constitution III).

**Target Platform**: GCP Cloud Run (Linux, .NET 8) with Workload Identity; local Development on Windows/macOS/Linux.

**Project Type**: Web application — backend infrastructure hardening within existing REST API (`apps/api`).

**Performance Goals**: Data Protection key load adds negligible startup latency (<2s for GCS list + KMS unwrap on cold start); no per-request overhead beyond existing `Protect`/`Unprotect`.

**Constraints**: Production MUST NOT use `PersistKeysToFileSystem`; fail fast on misconfiguration (FR-006); no cleartext tokens/keys in logs (Constitution VIII); QBO integration remains read-only (Constitution IV — untouched); no new EF queries without tenant scope (N/A — no new queries); ≥80.0% coverage on backend changes; frontend gate unchanged.

**Scale/Scope**: Single application-global key ring shared by all tenants/instances; MVP Cloud Run concurrency; coordinates with infra milestone for bucket/KMS/IAM.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Applicable? | Status | Notes |
|---|-----------|-------------|--------|-------|
| I | Core Mathematical Axioms | **No** | N/A | No monetary computation. |
| II | Multi-Tenant Isolation | **No (unchanged)** | PASS | Key ring is app-global by design (same as today). `QboVenueCredential` tenant filters unchanged. |
| III | Engineering Rigor | **Yes** | PASS | Unit + integration tests for restart/cross-instance decrypt and Production config guard; ≥80% coverage on touched files. |
| IV | QBO Integration | **No (unchanged)** | PASS | Read-only QBO client untouched; only key persistence location changes. |
| V | Ledger State Machine | **No** | N/A | No ledger/event mutations. |
| VI | Polyglot Contracts | **No** | N/A | No API DTO changes; no frontend type regeneration. |
| VII | EF Core Axioms | **No (unchanged)** | PASS | No new EF queries. |
| VIII | Exception Governance | **Yes** | PASS | Startup misconfig → explicit exception; runtime decrypt failures use existing `QboTokenRefreshException`; logs sanitized (bucket/KMS names only, never key XML or tokens). |

**Gate result**: All applicable gates PASS. No violations. Complexity Tracking not required.

## Project Structure

### Documentation (this feature)

```text
specs/047-gcp-dp-key-backup/
├── plan.md              # This file
├── research.md          # Phase 0 — GCS+KMS decisions
├── data-model.md        # Phase 1 — DataProtectionOptions, environment matrix
├── quickstart.md        # Phase 1 — validation guide
├── contracts/
│   ├── data-protection-config.md
│   └── data-protection-key-ring.md
├── checklists/
│   └── requirements.md  # From /speckit-specify
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
apps/
├── api/
│   ├── Configuration/
│   │   └── DataProtectionOptions.cs           # NEW — Bucket, ObjectPrefix, KmsKeyName, ApplicationName
│   ├── Extensions/
│   │   └── DataProtectionServiceExtensions.cs # NEW — env-aware AddSplitRailDataProtection()
│   ├── Program.cs                             # EXTEND — replace inline PersistKeysToFileSystem
│   └── split-rail-api.csproj                  # EXTEND — Google DP Storage + KMS packages
│
└── api.tests/
    ├── Unit/
    │   ├── DataProtectionConfigurationTests.cs    # NEW — Production guard, option binding
    │   └── QboTokenServiceTests.cs                  # UNCHANGED — isolated test provider
    └── Integration/
        └── DataProtectionKeyPersistenceTests.cs   # NEW — shared dir restart + cross-instance decrypt
```

**Structure Decision**: Minimal diff focused on `Program.cs` wiring extracted to a testable extension method. Reuse existing `QboTokenService` and `IntegrationTestBase` patterns. No new controllers, migrations, or web changes. Infra provisioning (bucket, KMS, IAM, Cloud Run env vars) documented in contracts/quickstart for the security milestone — not application code.

## Complexity Tracking

No constitution violations to justify.

## Post-Design Constitution Re-Check

*Re-evaluated after Phase 1 design artifacts (research.md, data-model.md, contracts/, quickstart.md).*

| # | Principle | Re-Check | Notes |
|---|-----------|----------|-------|
| I | Core Mathematical Axioms | N/A | No money path. |
| II | Multi-Tenant Isolation | PASS | Tenant-scoped token records unchanged; global key ring is intentional. |
| III | Engineering Rigor | PASS | Test matrix in quickstart: config unit tests, shared-directory integration, existing QBO tests regression. |
| IV | QBO Integration | PASS | Read-only; token encrypt/decrypt path preserved. |
| V | Ledger State Machine | N/A | — |
| VI | Polyglot Contracts | N/A | No API surface change. |
| VII | EF Core Axioms | N/A | No query changes. |
| VIII | Exception Governance | PASS | Logging contract in `data-protection-config.md`; no secret leakage. |

**Re-check result**: All applicable gates PASS post-design. Ready for `/speckit-tasks`.
