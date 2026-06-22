# Contract: Committed Configuration Must Not Contain Production Secrets

Defines repository hygiene rules for SPLR-48 acceptance criteria ("no plaintext secrets in the repo").

## Files in scope

| File | Rule |
|------|------|
| `apps/api/appsettings.json` | `Jwt:Secret` MUST be empty string. `QboSync:ClientId` and `QboSync:ClientSecret` MUST be empty. `QboSync:InternalTriggerKey` MUST NOT contain a usable dev default. |
| `deploy/production/deploy-api.sh` | MUST reference secret IDs only in `--set-secrets`; no JWT/QBO/DB password literals. |
| `deploy/lib/migrate-bundle.sh` | MUST NOT log connection strings with passwords (existing spec 053 rule). |

## Files explicitly allowed to contain dev secrets

| File | Purpose |
|------|---------|
| `apps/api/appsettings.Development.json` | Local dev JWT and connection strings |
| `deploy/preview/*` | Ephemeral preview credentials |
| `apps/api.tests/**` | Test fixtures with disposable secrets |
| `deploy/preview/Dockerfile.web` | Build-time placeholder (not production API) |

## Placeholder patterns that MUST NOT appear in production config

- `replace-with-production-secret`
- `dev-secret-key-at-least-32-characters-long` in `appsettings.json`
- `dev-internal-sync-key` in base `appsettings.json`
- Any string ≥ 16 chars in `Jwt:Secret` or `QboSync:ClientSecret` in `appsettings.json`

## Verification

Vitest helper `assertProductionAppsettingsHygiene(repoRoot)`:

1. Parse `apps/api/appsettings.json`
2. Assert `Jwt.Secret === ""`
3. Assert `QboSync.ClientId === ""` and `QboSync.ClientSecret === ""`
4. Assert `QboSync.InternalTriggerKey` is empty or absent in base config

CI MUST fail if hygiene checks fail on `main` branch PRs touching these files.

## Success criteria mapping

| Criterion | Contract |
|-----------|----------|
| SC-002 | Zero cleartext production credentials in committed files |
| FR-006 | No secrets in deploy script literals |
| FR-008 | Automated hygiene assertions in Vitest |
