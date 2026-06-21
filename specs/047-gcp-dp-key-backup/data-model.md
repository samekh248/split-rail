# Phase 1 Data Model: Back Data Protection Keys with Managed Cloud Secret Storage

**Feature**: 047-gcp-dp-key-backup (Linear SPLR-40)  
**Date**: 2026-06-21

This feature introduces **no PostgreSQL schema changes**. It configures how the ASP.NET Core Data Protection system persists and protects its key ring. Existing encrypted payload storage (`qbo_venue_credentials`) is unchanged.

## Configuration entity: `DataProtectionOptions`

New options class bound from `DataProtection` configuration section + environment variables.

| Property | Type | Required (Prod) | Default (Dev) | Notes |
|----------|------|-----------------|---------------|-------|
| `Bucket` | `string` | Yes | — | GCS bucket name (e.g. `split-rail-dp-keys-prod`) |
| `ObjectPrefix` | `string` | Yes | — | Object prefix for key ring XML files (e.g. `dp-keys/`) |
| `KmsKeyName` | `string` | Yes | — | Full KMS resource name (`projects/split-rail/locations/global/keyRings/dataprotection/cryptoKeys/masterkey`) |
| `ApplicationName` | `string` | No | `split-rail-api` | Passed to `SetApplicationName`; isolates key ring from other apps |

**Environment binding** (Production Cloud Run):

```jsonc
"DataProtection": {
  "Bucket": "split-rail-dp-keys-prod",
  "ObjectPrefix": "dp-keys/",
  "KmsKeyName": "projects/split-rail/locations/global/keyRings/dataprotection/cryptoKeys/masterkey",
  "ApplicationName": "split-rail-api"
}
```

Environment variable overrides follow standard ASP.NET Core `__` nesting (e.g. `DataProtection__Bucket`).

## Runtime entities (framework-managed, not application tables)

### Encryption Key Ring

- **Representation**: Collection of XML documents stored under `{Bucket}/{ObjectPrefix}*.xml` in GCS.
- **Lifecycle**: Created on first use; rotated automatically by Data Protection; old keys retained for decryption.
- **At-rest protection**: Each XML blob encrypted via Cloud KMS (`ProtectKeysWithGoogleKms`).
- **Sharing**: All Cloud Run instances read/write the same GCS prefix → cross-instance decrypt (FR-003).

### Encrypted QBO Token Record (existing — `qbo_venue_credentials`)

| Column | Relationship |
|--------|--------------|
| `encrypted_access_token` | Ciphertext produced by `IDataProtector` with purpose `QboOAuthTokens` |
| `encrypted_refresh_token` | Same protector |
| `venue_id` | FK → `venues`; tenant-isolated via existing global query filters |

**Invariant**: Decryptability of these columns depends entirely on stable access to the shared key ring. This feature does not alter columns or encryption purpose strings.

## Environment matrix

| Environment | Key persistence | KMS wrap | Startup if misconfigured |
|-------------|-----------------|----------|--------------------------|
| Development | Filesystem `apps/api/dp-keys/` | None | Warn + filesystem (current behavior) |
| Test (CI) | Ephemeral / shared temp directory in integration tests | None | N/A |
| Production | GCS bucket + prefix | Cloud KMS | **Fail startup** (no filesystem fallback) |

## State / behavior transitions

```
[App Start — Production]
  → Load DataProtectionOptions
  → Validate Bucket, ObjectPrefix, KmsKeyName present
  → Configure PersistKeysToGoogleCloudStorage + ProtectKeysWithGoogleKms
  → Verify GCS/KMS reachable (implicit on first key access or explicit health at startup)
  → If unreachable: startup failure (host unhealthy)

[App Start — Development]
  → PersistKeysToFileSystem(dp-keys/)
  → Continue (no GCS/KMS required)

[OAuth Token Store — unchanged flow]
  → IDataProtector.Protect(plaintext) → encrypted blob → qbo_venue_credentials

[OAuth Token Read — unchanged flow]
  → Load encrypted blob → IDataProtector.Unprotect → plaintext for Intuit API

[Key rotation — automatic]
  → Data Protection generates new key XML in GCS
  → Old keys remain for Unprotect of historical ciphertext
```

## Validation rules

- **Production config**: `Bucket`, `ObjectPrefix`, and `KmsKeyName` MUST be non-empty; empty → `InvalidOperationException` at startup with message identifying missing keys (no secret values in message).
- **Development**: Filesystem directory created if missing (`dp-keys/` already gitignored).
- **Logging**: On GCS/KMS failures, log error type + resource identifiers (bucket name, key name) — never log key XML, KMS plaintext, or decrypted tokens (Constitution VIII).
- **Tenant isolation**: Unchanged — `QboVenueCredential` queries remain venue/org scoped; key ring is **application-global** (not per-tenant), which is correct for Data Protection (same as current filesystem ring).

## New domain exception

| Exception | When | HTTP (if surfaced) |
|-----------|------|---------------------|
| `DataProtectionConfigurationException` | Production startup misconfiguration or GCS/KMS unreachable during initialization | N/A (process exit / unhealthy) |

Existing `QboTokenRefreshException` continues to surface when `Unprotect` fails at runtime (e.g. post-cutover tokens encrypted with old ring).

## Infrastructure dependencies (not EF entities)

| Resource | Purpose |
|----------|---------|
| GCS bucket `split-rail-dp-keys-prod` | Durable key ring XML storage |
| KMS key ring `dataprotection` / key `masterkey` | Encrypt key ring at rest |
| Cloud Run Workload Identity | ADC for GCS + KMS without key files |
| Secret Manager (existing) | JWT, QBO client secret, DB password — orthogonal to key ring |

## Files touched (reference for tasks phase)

- `apps/api/Configuration/DataProtectionOptions.cs` — NEW
- `apps/api/Program.cs` — EXTEND `AddDataProtection()` wiring
- `apps/api/Exceptions/ApiExceptions.cs` — EXTEND (optional config exception)
- No migrations
