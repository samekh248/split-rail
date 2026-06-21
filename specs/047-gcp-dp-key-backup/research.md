# Phase 0 Research: Back Data Protection Keys with Managed Cloud Secret Storage

**Feature**: 047-gcp-dp-key-backup (Linear SPLR-40)  
**Date**: 2026-06-21

Resolves technical unknowns for moving ASP.NET Core Data Protection key persistence from local filesystem (`dp-keys/`) to durable GCP-backed storage suitable for Cloud Run scale-to-zero and multi-instance deployments.

## 1. Key ring persistence provider

- **Decision**: In **Production**, persist the Data Protection key ring to **Google Cloud Storage (GCS)** using `Google.Cloud.AspNetCore.DataProtection.Storage` (`PersistKeysToGoogleCloudStorage(bucket, objectPrefix)`). In **Development** and automated tests, retain **filesystem** persistence (`dp-keys/` under content root) or ephemeral in-memory providers in unit tests.
- **Rationale**: ASP.NET Core Data Protection stores multiple rotating XML key files. GCS provides the same shared, durable, multi-writer semantics as Azure Blob Storage (the Microsoft-documented cloud pattern). This matches TDD §5 intent, SPLR-40 acceptance criteria (no ephemeral disk in prod, cross-instance sharing), and the deferred decision from 003-qbo-pull-cache-mapping research ("GCP Secret Manager via Google.Cloud.SecretManager.V1" — clarified below as GCS for key *files*, Secret Manager for boot-time *secrets*).
- **Alternatives considered**:
  - **Secret Manager as IXmlRepository**: rejected — Data Protection expects list/read/write of multiple XML blobs; cramming the key ring into one Secret Manager secret fights rotation/concurrency and exceeds size/update patterns.
  - **PostgreSQL `PersistKeysToDbContext`**: rejected — couples encryption keys to the same database holding encrypted payloads; weaker blast-radius separation than object storage + KMS.
  - **Filesystem on Cloud Run with mounted volume**: rejected — Cloud Run has ephemeral filesystem; not production-grade.
  - **Keep filesystem in prod**: rejected — current gap; keys lost on restart/scale-to-zero.

## 2. Key ring encryption at rest (master key)

- **Decision**: Wrap persisted key XML with **Google Cloud KMS** via `Google.Cloud.AspNetCore.DataProtection.Kms` (`ProtectKeysWithGoogleKms(kmsKeyName)`). KMS key in project `split-rail`, location `global` or `us-central1` (align with infra milestone).
- **Rationale**: Microsoft docs require explicit at-rest protection when using custom persistence; KMS provides auditable, IAM-gated envelope encryption without shipping master key material in the container. Satisfies Constitution VIII (no raw key material in logs/config) and operator audit requirements.
- **Alternatives considered**:
  - **X509 certificate in container**: rejected — certificate files on disk recreate the ephemeral-storage problem.
  - **Unencrypted GCS objects**: rejected — fails security review; keys at rest would be readable to anyone with bucket read access.

## 3. Authentication to GCP services

- **Decision**: Use **Application Default Credentials (ADC)** with **Cloud Run Workload Identity** (same pattern as `GcsSettlementArchiveStore` in 004). No long-lived service-account JSON keys in container images. IAM grants on the Cloud Run runtime service account:
  - `roles/storage.objectAdmin` (or tighter custom role) on the DP keys bucket
  - `roles/cloudkms.cryptoKeyEncrypterDecrypter` on the KMS crypto key
- **Rationale**: Consistent with existing settlement archive integration; eliminates credential files on ephemeral disk.
- **Alternatives considered**:
  - **Service account key from Secret Manager mounted at boot**: workable fallback for local prod-like testing but rejected as primary — Workload Identity is the Cloud Run standard.

## 4. Boot-time secrets vs. key ring storage

- **Decision**: **Secret Manager** remains the channel for **other** boot secrets (JWT signing secret, QBO client secret, DB password env injection) per existing patterns. **Data Protection key ring XML** lives in **GCS + KMS**, not Secret Manager. Infrastructure milestone provisions both bucket/KMS IAM and Secret Manager secret references on the Cloud Run service.
- **Rationale**: SPLR-40 mentions "Secret Manager / KMS" collectively; each GCP service fits a distinct role. Secret Manager is ideal for named secrets consumed once at startup; GCS is ideal for the rotating multi-file key ring.
- **Alternatives considered**:
  - **Secret Manager only for everything**: rejected for key ring (see §1).

## 5. Production startup failure mode

- **Decision**: When `ASPNETCORE_ENVIRONMENT=Production` and Data Protection cloud options are missing or GCS/KMS is unreachable at startup, **fail application startup** (host does not enter healthy state). No silent fallback to `PersistKeysToFileSystem` in Production.
- **Rationale**: FR-006 / SC-004 — silent fallback would recreate the production bug and mask misconfiguration.
- **Alternatives considered**:
  - **Fallback to ephemeral keys with warning**: rejected — would break token decryption after restart and violate spec.

## 6. Key ring migration / cutover

- **Decision**: **No automatic migration** from filesystem key ring to GCS. Production cutover is a one-time operational event: deploy GCS-backed keys; venues with tokens encrypted under the old ring **re-authenticate QBO OAuth** if decryption fails (`QboTokenRefreshException` path already exists).
- **Rationale**: Spec assumption; filesystem keys on ephemeral Cloud Run instances are likely already lost; migration tooling adds complexity for little value.
- **Alternatives considered**:
  - **One-time key export/import script**: deferred to ops runbook if a stable filesystem ring exists in a non-prod environment.

## 7. Application name / purpose isolation

- **Decision**: Set a fixed application name on the Data Protection builder (`SetApplicationName("split-rail-api")`) so all instances derive compatible key rings. Existing `QboTokenService` uses purpose `"QboOAuthTokens"` — unchanged.
- **Rationale**: Prevents key ring isolation bugs when multiple apps share the same GCS prefix.
- **Alternatives considered**: Default host-based name — rejected; unstable across Cloud Run revisions/instances.

## 8. Testing strategy

- **Decision**:
  - **Unit**: configuration extension tests (Production vs Development branches, missing config throws).
  - **Integration**: shared temp directory simulating GCS (two WebApplicationFactory instances, same `dp-keys` path) proving encrypt-on-A / decrypt-on-B for QBO tokens via existing `QboTokenService` + Testcontainers.
  - **Optional manual**: quickstart scenario against real GCS/KMS with ADC (not required in CI).
- **Rationale**: Constitution III; avoids CI dependency on live GCP while proving restart/cross-instance semantics. Real GCS integration can be a staging smoke test.
- **Alternatives considered**:
  - **Testcontainers GCS emulator**: rejected — no official lightweight emulator; temp shared directory is sufficient for behavioral proof.

## 9. NuGet packages

- **Decision**: Add to `apps/api/split-rail-api.csproj`:
  - `Google.Cloud.AspNetCore.DataProtection.Storage`
  - `Google.Cloud.AspNetCore.DataProtection.Kms`
  (Pin to latest stable compatible with .NET 8; verify non-alpha release at implementation time.)
- **Rationale**: Official Google Cloud .NET extensions matching documented Cloud Run pattern.
- **Alternatives considered**:
  - **Custom `IXmlRepository`**: rejected — reinvents tested GCS list/read/write and KMS encryptor wiring.

## 10. Infrastructure artifacts (out of app repo scope, documented for coordination)

- **Decision**: Infra milestone provisions:
  - GCS bucket `split-rail-dp-keys-prod` (uniform access, no public access)
  - KMS key ring `dataprotection` + crypto key `masterkey`
  - Cloud Run env vars / Secret Manager references: `DataProtection__Bucket`, `DataProtection__ObjectPrefix`, `DataProtection__KmsKeyName`
  - IAM bindings for Cloud Run service account
- **Rationale**: FR-005 coordination with "Gap: Security, Secrets & Transport Hardening" milestone.

**All NEEDS CLARIFICATION items resolved.** Ready for Phase 1 design.
