# Contract: Data Protection Key Ring Operational Behavior

**Feature**: 047-gcp-dp-key-backup (Linear SPLR-40)  
**Type**: Internal cryptographic infrastructure contract

## Purpose

Specifies observable behavior of the shared Data Protection key ring that backs QBO OAuth token encryption. Validates SPLR-40 acceptance criteria without exposing implementation types.

## Actors

| Actor | Role |
|-------|------|
| Application instance | Reads/writes key ring via Data Protection APIs |
| Platform operator | Provisions GCS bucket, KMS key, IAM |
| Accounting manager | Indirect beneficiary — QBO connection persists across restarts |

## Operations

### O1 — Initialize key ring (first production deploy)

**Precondition**: GCS bucket and KMS key exist; Cloud Run SA has IAM.  
**Action**: First instance starts; Data Protection creates initial key XML in GCS.  
**Postcondition**: Key objects exist under `{ObjectPrefix}`; no local `dp-keys/` files in container.

### O2 — Encrypt QBO tokens (existing)

**Precondition**: Valid key ring loaded.  
**Action**: `QboTokenService.StoreTokensAsync` calls `IDataProtector.Protect`.  
**Postcondition**: Ciphertext stored in `qbo_venue_credentials`; no cleartext in logs.

### O3 — Decrypt after restart (P1 acceptance)

**Precondition**: Encrypted tokens exist; application restarted (new process, same config).  
**Action**: `QboTokenService.GetValidAccessTokenAsync` calls `Unprotect`.  
**Postcondition**: Valid access token returned; sync proceeds without OAuth redirect.

### O4 — Cross-instance decrypt (P2 acceptance)

**Precondition**: Instance A stored tokens; Instance B starts with same GCS/KMS config.  
**Action**: Instance B calls `Unprotect` on Instance A ciphertext.  
**Postcondition**: Successful decrypt; identical plaintext to Instance A encryption.

### O5 — Startup failure when backing store unavailable (SC-004)

**Precondition**: Production config points to invalid bucket or KMS key, or IAM denied.  
**Action**: Application starts.  
**Postcondition**: Host fails health check within one probe cycle; no fallback to filesystem.

### O6 — Key rotation (automatic)

**Precondition**: Key ring age triggers rotation policy (framework default).  
**Action**: New key XML written to GCS; old keys retained.  
**Postcondition**: New `Protect` uses new key; old ciphertext still `Unprotect`-able.

## Verification mapping

| Spec requirement | Contract operation |
|------------------|-------------------|
| FR-001, FR-004 | O1, O5 |
| FR-002 | O3 |
| FR-003 | O4 |
| FR-006 | O5 |
| FR-007 | O2 |
| FR-009 | O3, O4 (automated tests) |

## Out of scope

- Per-tenant key rings (application uses one global ring)
- Migrating filesystem keys to GCS automatically
- New public HTTP endpoints
- Changes to QBO sync read-only API behavior (Constitution IV)
