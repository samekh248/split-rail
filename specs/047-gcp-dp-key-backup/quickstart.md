# Quickstart & Validation Guide: Data Protection Key Backup

This guide proves SPLR-40 end-to-end. See [data-model.md](data-model.md) and [contracts/](contracts/) for configuration and behavior details.

## Prerequisites

- .NET 8 SDK; Docker (Testcontainers for integration tests).
- Existing SPLR-18 QBO token encryption (`QboTokenService`, `qbo_venue_credentials`).
- New NuGet packages (implementation phase): `Google.Cloud.AspNetCore.DataProtection.Storage`, `Google.Cloud.AspNetCore.DataProtection.Kms`.
- For **manual GCP validation** (optional, staging): GCS bucket, KMS key, ADC or Workload Identity, IAM per [data-protection-config.md](contracts/data-protection-config.md).

## Local development setup

```bash
cd apps/api
dotnet restore
dotnet build
dotnet run
```

Development uses filesystem `apps/api/dp-keys/` (gitignored) — unchanged developer experience.

Connect a venue to QBO via OAuth, then restart the API:

```bash
# After OAuth connect, stop and restart dotnet run
dotnet run
```

**Expect**: Manual sync or scheduled sync decrypts stored tokens without re-authorization.

## Configuration (Production-like local test — optional)

Set environment variables before `dotnet run`:

```powershell
$env:ASPNETCORE_ENVIRONMENT = "Production"
$env:DataProtection__Bucket = "split-rail-dp-keys-prod"
$env:DataProtection__ObjectPrefix = "dp-keys/"
$env:DataProtection__KmsKeyName = "projects/split-rail/locations/global/keyRings/dataprotection/cryptoKeys/masterkey"
```

Ensure ADC is configured (`gcloud auth application-default login`) and IAM allows your user/service account access to the bucket and KMS key.

**Expect**: No files created under `apps/api/dp-keys/`; key objects appear in GCS; QBO encrypt/decrypt works.

## Automated validation scenarios

### Scenario A — Restart survival (User Story 1 / SC-001)

1. Integration test: start WebApplicationFactory instance with shared temp `dp-keys` directory.
2. Store encrypted QBO tokens via `QboTokenService.StoreTokensAsync`.
3. Dispose factory; create second factory pointing at **same** temp directory.
4. Call `GetValidAccessTokenAsync`.
5. **Expect**: Decrypted access token matches original; no exception.

### Scenario B — Cross-instance decrypt (User Story 2 / SC-002)

Same as Scenario A — the shared temp directory simulates shared GCS prefix. Two factory instances represent Instance A and Instance B.

### Scenario C — Production config guard (User Story 3 / SC-004)

1. Unit test: `WebApplicationFactory` or host builder with `Environment=Production` and missing `DataProtection:Bucket`.
2. **Expect**: Host fails to start or throws configuration exception; no filesystem fallback.

### Scenario D — No cleartext in logs (SC-005)

1. Force `Unprotect` failure (corrupt ciphertext or wrong key ring).
2. **Expect**: Logs contain venue ID / error type only; no token substrings.

### Scenario E — Existing QBO tests remain green

```bash
cd apps/api.tests
dotnet test --filter "FullyQualifiedName~QboTokenService"
```

**Expect**: All existing token encryption unit tests pass (use isolated `DataProtectionProvider.Create("test")`).

## Test commands

```bash
# Full backend suite
cd apps/api.tests && dotnet test

# Targeted (after implementation)
dotnet test --filter "FullyQualifiedName~DataProtection"
```

## Expected coverage gates

- New/changed backend files (`DataProtectionOptions`, `Program.cs` wiring, configuration tests, integration restart test) ≥ **80%** line/branch coverage.
- **No frontend changes** expected; global frontend coverage gate unchanged.

## Production deployment checklist (operators)

1. Provision GCS bucket + KMS key (infra milestone).
2. Bind Cloud Run SA IAM (storage + kms decrypt/encrypt).
3. Set `DataProtection__*` env vars on Cloud Run service.
4. Deploy API; verify `/health` succeeds.
5. Confirm `gs://{bucket}/{prefix}` contains key XML objects.
6. Confirm container has **no** `dp-keys/` directory with key files.
7. Verify existing connected venues sync successfully; re-auth any venue failing decrypt after cutover.

## Rollback

Revert Cloud Run revision to prior deployment. Note: tokens encrypted under GCS key ring will not decrypt under filesystem ring — venues may need QBO re-auth after rollback.
