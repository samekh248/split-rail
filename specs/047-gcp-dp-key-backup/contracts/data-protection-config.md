# Contract: Data Protection Configuration

**Feature**: 047-gcp-dp-key-backup (Linear SPLR-40)  
**Type**: Application startup configuration (not a public HTTP API)

## Purpose

Defines the configuration surface and environment-specific behavior for ASP.NET Core Data Protection key persistence. Consumers are the API host (`Program.cs`), Cloud Run deployment manifests, and the infrastructure milestone provisioning GCS/KMS resources.

## Configuration schema

Section name: `DataProtection` (class: `DataProtectionOptions`)

| Key | Type | Dev default | Prod required | Description |
|-----|------|-------------|---------------|-------------|
| `ApplicationName` | string | `split-rail-api` | Recommended | Isolates key ring identity across deployments |
| `Bucket` | string | — | **Yes** | GCS bucket hosting key ring XML objects |
| `ObjectPrefix` | string | — | **Yes** | Prefix for key files (e.g. `dp-keys/`) |
| `KmsKeyName` | string | — | **Yes** | Full Cloud KMS crypto key resource name |

Environment variable equivalents: `DataProtection__Bucket`, `DataProtection__ObjectPrefix`, `DataProtection__KmsKeyName`, `DataProtection__ApplicationName`.

## Startup behavior contract

### Production (`ASPNETCORE_ENVIRONMENT=Production`)

1. Register `AddDataProtection()` with:
   - `SetApplicationName(options.ApplicationName)`
   - `PersistKeysToGoogleCloudStorage(options.Bucket, options.ObjectPrefix)`
   - `ProtectKeysWithGoogleKms(options.KmsKeyName)`
2. If any required option is missing → throw `DataProtectionConfigurationException` (or `InvalidOperationException`) → process does not become healthy.
3. MUST NOT call `PersistKeysToFileSystem`.
4. ADC (Workload Identity) MUST authenticate GCS and KMS calls — no JSON key file path in configuration.

### Development / Staging (non-Production)

1. Register `AddDataProtection()` with:
   - `SetApplicationName(options.ApplicationName)`
   - `PersistKeysToFileSystem({ContentRoot}/dp-keys)`
2. GCS/KMS options MAY be absent.
3. KMS wrapping MAY be omitted in Development.

### Test (CI)

1. Integration tests MAY use a shared temporary directory or `DataProtectionProvider.Create("test")` for isolated unit tests.
2. Production GCS/KMS wiring MUST be covered by unit tests on the configuration extension without live GCP.

## IAM contract (infrastructure)

Cloud Run runtime service account MUST have:

| Permission | Resource |
|------------|----------|
| `storage.objects.create`, `storage.objects.get`, `storage.objects.list`, `storage.objects.update` | `gs://{Bucket}/{ObjectPrefix}*` |
| `cloudkms.cryptoKeyVersions.useToEncrypt`, `cloudkms.cryptoKeyVersions.useToDecrypt` | `{KmsKeyName}` |

## Logging contract

| Event | Logged | MUST NOT log |
|-------|--------|--------------|
| Startup misconfiguration | Missing option names | Secret values, key XML |
| GCS/KMS access failure | Bucket name, object prefix, KMS key name, exception type | Key material, decrypted payloads |
| Runtime Unprotect failure | Venue ID, exception type | Cleartext tokens |

## Compatibility

- **Unchanged**: `IDataProtector` purpose string `"QboOAuthTokens"` in `QboTokenService`.
- **Unchanged**: `qbo_venue_credentials` encrypted column format.
- **Breaking cutover**: Tokens encrypted under a prior filesystem key ring are not decryptable after cutover unless keys were migrated (not in scope).
