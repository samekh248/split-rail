# Contract: Production Application Secret Bindings

Defines Secret Manager → Cloud Run → application env resolution for production API deploy (TDD §7, SPLR-48).

## Scope

Production Cloud Run API service only. Preview and local development are exempt (FR-007).

## Required Secret Manager secrets

| Secret ID | Purpose | Min length / format |
|-----------|---------|---------------------|
| `db-password` | PostgreSQL `postgres` user password | Strong password (existing) |
| `jwt-signing-key` | HMAC signing key for JWT access/refresh tokens | ≥ 32 characters |
| `qbo-client-id` | Intuit developer app client ID | Non-empty string |
| `qbo-client-secret` | Intuit developer app client secret | Non-empty string |
| `qbo-internal-trigger-key` | Authenticates internal QBO sync trigger requests | Non-empty string |

Secret **values** are created by operators via `gcloud secrets versions add` or console — never committed.

## Cloud Run binding contract

`deploy/production/deploy-api.sh` step 3 (`gcloud run deploy`) MUST include `--set-secrets` with all bindings:

| Env var | Secret ID | Version |
|---------|-----------|---------|
| `DB_PASSWORD` | `db-password` | `latest` (or pinned) |
| `Jwt__Secret` | `jwt-signing-key` | `latest` |
| `QBO_CLIENT_ID` | `qbo-client-id` | `latest` |
| `QBO_CLIENT_SECRET` | `qbo-client-secret` | `latest` |
| `QBO_INTERNAL_TRIGGER_KEY` | `qbo-internal-trigger-key` | `latest` |

**MUST NOT** supply the above values via `--set-env-vars` with inline cleartext.

Non-sensitive configuration (issuer, audience, QBO redirect URI, settlement archive bucket names) MAY remain in `--set-env-vars`.

## Application resolution contract

At startup the API MUST resolve secrets in this order (later wins):

1. `appsettings.json` / environment-specific JSON (non-secret defaults only)
2. Environment variables injected by Cloud Run (`DB_PASSWORD`, `Jwt__Secret`, `QBO_*`)

When `ASPNETCORE_ENVIRONMENT=Production`:

- `Jwt:Secret`, `QboSync:ClientId`, `QboSync:ClientSecret` MUST be non-empty after resolution.
- Application MUST NOT start if any required secret is missing or matches a known placeholder string.
- Logs MUST NOT contain cleartext secret values (Constitution VIII).

## IAM contract

Cloud Run API runtime service account MUST have `roles/secretmanager.secretAccessor` on each secret (or equivalent project-level grant documented in quickstart).

## Migration step contract

The migration step (before `gcloud run deploy`) requires `DB_PASSWORD` in the **deploy runner** environment:

```bash
export DB_PASSWORD="$(gcloud secrets versions access latest --secret=db-password --project="${GCP_PROJECT}")"
```

The deploy script MUST NOT embed the password literal. This extends spec 053 `production-api-deploy.md` without changing ordering.

## Verification

| Requirement | Enforcement |
|-------------|-------------|
| FR-001 | Vitest `assertProductionSecretBindings` on `deploy-api.sh` |
| FR-002 | Vitest audit of `appsettings.json` JWT field + xUnit production startup test |
| FR-003 | Vitest audit + xUnit QBO options resolution test |
| FR-004 | Existing `assertSecretManagerBinding` for `DB_PASSWORD` |
| FR-005 | xUnit startup failure when production secrets missing |
| FR-008 | Combined deploy + appsettings contract tests in CI |
| SC-002 | `assertNoHardcodedJwtOrQboSecrets` on deploy scripts |

## Out of scope

- Provisioning Secret Manager secret **values** in CI
- Preview deploy production secret reuse
- Data Protection GCS/KMS key ring (spec 047)
- Per-venue QBO OAuth tokens (database-encrypted)
