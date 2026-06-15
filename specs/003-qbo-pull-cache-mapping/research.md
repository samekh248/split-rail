# Research: QuickBooks Online Pull Cache & Inline Mapping Engine

**Feature**: 003-qbo-pull-cache-mapping
**Date**: 2026-06-14

Technical decisions framing the design for the read-only QBO integration pipeline.

## 1. Encrypted OAuth 2.0 Token Cache

**Decision**: Use `.NET Data Protection` APIs for encrypting Intuit OAuth 2.0 access and refresh tokens at rest. Store a `QboVenueCredential` entity per venue containing `encrypted_access_token`, `encrypted_refresh_token`, `token_expires_at`, and `realm_id` (QBO company ID). Data Protection keys are backed by GCP Secret Manager via `Google.Cloud.SecretManager.V1` (production) or local file-system key ring (development).

Token encryption flow:
1. On OAuth callback, receive `access_token` + `refresh_token` from Intuit.
2. Call `IDataProtector.Protect(token)` to encrypt; store encrypted blob in PostgreSQL.
3. On sync, call `IDataProtector.Unprotect(blob)` to decrypt; use token for API call.
4. On token expiry, refresh via Intuit's OAuth 2.0 refresh endpoint; re-encrypt and store new tokens.
5. On refresh failure, throw `QboTokenRefreshException` with context (venue ID, realm ID) — never log the token value itself (Constitution VIII).

Key rotation: Data Protection handles automatic key rotation; old keys remain available for decryption. No manual rotation logic needed.

**Rationale**: `.NET Data Protection` is the framework-standard approach for protecting sensitive data in ASP.NET Core. AES-256-GCM is the default algorithm. GCP Secret Manager provides the key persistence layer without custom crypto. This avoids rolling custom encryption and is auditable.

**Alternatives considered**: Azure Key Vault (rejected — GCP stack); raw `AesGcm` class (rejected — Data Protection abstracts key management, rotation, and algorithm negotiation); storing tokens in GCP Secret Manager directly (rejected — per-venue tokens in Secret Manager would create ~1000 secrets at scale; better to store encrypted blobs in the database with keys managed by Secret Manager).

## 2. QBO Transaction API Client

**Decision**: Build a `QboTransactionClient` class that uses `IHttpClientFactory` (named client `"QboApi"`) to issue read-only GET requests to the QuickBooks Online Accounting API. The client queries the `TransactionList` report or the `Purchase`/`Bill`/`Deposit` endpoints filtered by the native QBO `Tag` matching `events.qbo_tag_name`.

Intuit API specifics:
- **Base URL**: `https://quickbooks.api.intuit.com/v3/company/{realmId}/`
- **Auth header**: `Authorization: Bearer {access_token}` (decrypted from `QboVenueCredential`)
- **Tag filtering**: Use the `query` endpoint with a SQL-like query: `SELECT * FROM Purchase WHERE MetaData.Tag = '{tagName}'` (and similarly for other transaction types: `Bill`, `Deposit`, `JournalEntry`).
- **Scope**: `com.intuit.quickbooks.accounting` (read-only). The Intuit app registration MUST NOT include any write scopes.
- **Deserialization**: Parse JSON responses into internal DTOs (`QboTransactionDto`); monetary values parsed as `decimal` via `decimal.Parse(value, CultureInfo.InvariantCulture)`.

Read-only enforcement: The `QboTransactionClient` has no methods accepting HTTP POST/PUT/DELETE. The `IHttpClientFactory` named client is configured with a base address but no convenience methods for write operations. Integration tests mock the HTTP pipeline via `MockHttpMessageHandler` and assert no write verbs are ever issued.

Rate limiting: Intuit enforces ~500 requests per minute per realm. The sync client includes exponential backoff with jitter (initial 1s, max 60s, 3 retries) via Polly retry policies attached to the named HttpClient.

**Rationale**: `IHttpClientFactory` is the ASP.NET Core standard for outbound HTTP; named clients allow per-endpoint configuration (base address, default headers, timeout, retry policy). Read-only by construction — no write methods exist in the client class. Polly provides resilient retry without custom loop logic.

**Alternatives considered**: Intuit .NET SDK (rejected — adds a heavyweight dependency, limited tag-filtering support, and couples to Intuit's SDK release cycle; raw HTTP via IHttpClientFactory is simpler and fully controllable); direct `HttpClient` (rejected — lifetime management issues without IHttpClientFactory).

## 3. Append-Only Cache Strategy

**Decision**: Track synced transactions via a `qbo_sync_ledger` table that records each individual QBO transaction ID, amount, account ID, and the sync batch it arrived in. The `financial_line_items.qbo_actual_value` is computed as the SUM of all matching `qbo_sync_ledger` entries for that line item. This approach is inherently append-only: new sync batches INSERT new rows into the ledger; no existing rows are ever UPDATE'd or DELETE'd.

Sync flow:
1. Fetch QBO transactions for the event's tag.
2. For each transaction, check if `qbo_transaction_id` already exists in `qbo_sync_ledger` for this event.
3. If not, INSERT a new row. If the transaction is already recorded, skip it (idempotent).
4. For each mapped account, recompute `qbo_actual_value` on the target `financial_line_item` as `SUM(amount)` from `qbo_sync_ledger` where `mapped_line_item_id` matches.
5. If a QBO transaction was altered upstream (different amount), the original cached amount is preserved. Corrections appear as new entries with offsetting amounts in future syncs (if the bookkeeper creates a correcting journal entry in QBO).

**Rationale**: A dedicated sync ledger provides a full audit trail of every QBO transaction ever ingested, proving the append-only guarantee. Recomputing `qbo_actual_value` as a SUM eliminates any overwrite risk. The idempotent insert-or-skip prevents duplicate aggregation on re-sync.

**Alternatives considered**: Directly increment `qbo_actual_value` on each sync (rejected — no audit trail, can't detect duplicates, can't reconstruct history); store transactions in a JSON column (rejected — harder to query, index, and enforce uniqueness); use a separate materialized view (rejected — over-engineering for the current scale).

## 4. IHostedService Cron Pattern

**Decision**: Implement `QboSyncHostedService : BackgroundService` that runs on a configurable interval (default 6 hours). In development, the service runs in-process via `Task.Delay`. In production, the service is triggered by **Cloud Scheduler** sending an authenticated OIDC HTTP POST to a dedicated `POST /api/internal/qbo-sync-trigger` endpoint on the Cloud Run service. The `IHostedService` remains registered but its timer is disabled in production (the trigger endpoint invokes `QboSyncService` directly).

Configuration:
- `QboSyncOptions.IntervalHours` (default: 6) — configurable via `appsettings.json`.
- `QboSyncOptions.EnableInProcessTimer` (default: true in Development, false in Production) — controls whether the background timer is active.
- The internal trigger endpoint is authenticated via GCP OIDC service account tokens (not user JWT), using a dedicated authorization policy.

**Rationale**: Separating the timer from the sync logic allows the same `QboSyncService` to serve both scheduled and manual triggers. Cloud Scheduler provides more reliable scheduling than an in-process timer in a containerized environment where instances may scale to zero. The in-process timer provides convenience for local development.

**Alternatives considered**: Cloud Scheduler only (rejected — no local development story without emulation); in-process timer only (rejected — unreliable in Cloud Run where instances scale to zero); Cloud Tasks (rejected — higher complexity for a simple periodic job).

## 5. Unmapped Transaction Storage

**Decision**: Introduce an `unmapped_qbo_transactions` staging table that holds transactions whose `qbo_account_id` has no matching row in `qbo_account_mappings` for the venue. Each row records the QBO transaction ID, account ID, account name, amount, date, and the event it was ingested against. On inline mapping, the system:

1. Creates the mapping rule in `qbo_account_mappings`.
2. Re-processes all unmapped transactions for that `qbo_account_id` at the venue, routing them to the correct `qbo_sync_ledger` entries and recomputing `qbo_actual_value`.
3. Deletes the now-resolved rows from `unmapped_qbo_transactions`.

The unmapped count surfaced in the UI banner is a simple `COUNT(*)` on `unmapped_qbo_transactions` filtered by event/venue.

**Rationale**: Persisting unmapped transactions in the database (rather than only in memory) ensures they survive service restarts and are visible across all users and sessions. The staging table provides a clear lifecycle: ingested → unmapped → mapped (re-processed) → deleted from staging.

**Alternatives considered**: In-memory cache (rejected — lost on restart, not shared across instances); flag column on a generic transactions table (rejected — couples unmapped tracking to the sync ledger, complicates queries); JSON blob on the event (rejected — poor queryability).

## 6. API Route Convention

**Decision**: Follow the existing convention `api/venues/{venueId}/events/{eventId}/…` for QBO sync and mapping routes. Do NOT introduce a `/v1/` segment. Specific routes:

- `POST /api/venues/{venueId}/events/{eventId}/sync` — manual sync
- `GET /api/venues/{venueId}/events/{eventId}/unmapped-transactions` — list unmapped
- `GET /api/venues/{venueId}/mappings` — list venue mappings
- `POST /api/venues/{venueId}/mappings` — create mapping
- `DELETE /api/venues/{venueId}/mappings/{mappingId}` — remove mapping

**Rationale**: Consistent with the convention established in features 001 and 002 (see 002 research §3). The Linear issue proposed `/api/v1/…` but matching the existing surface avoids a mixed scheme. Mappings are scoped at the venue level (not event level) because they apply across all events at a venue (self-healing routing).

**Alternatives considered**: `/api/v1/…` segment (rejected — inconsistent with existing controllers); event-level mapping routes (rejected — mappings are venue-scoped per the spec's self-healing requirement).

## 7. Frontend Inline Mapping UX

**Decision**: Implement three new components in `apps/web/src/components/qbo/`:

1. **`UnmappedBanner`**: Inline alert banner showing unmapped count (e.g., "4 unassigned transactions detected"). Clicking expands a collapsible list of unmapped transactions (QBO account name, amount, date). Uses TanStack Query to poll `GET /unmapped-transactions`.

2. **`InlineMappingDropdown`**: Each unmapped transaction row includes a dropdown populated with the event's existing ledger line items (row labels). On selection and confirm, calls `POST /mappings` → optimistically removes the item from the unmapped list and triggers a refetch of the ledger grid to update `QBO Actuals` cells.

3. **`SyncNowButton`**: Button that calls `POST /sync`. Shows loading spinner during the request, success/error toast on completion. Hidden via conditional render when the user lacks `can_trigger_qbo_sync` (permission surfaced in the existing user context from feature 001).

All components import types from `generated-api.ts` only (Constitution VI). Monetary values displayed using the existing `money.ts` formatting helpers from feature 002.

**Rationale**: Inline components keep the accountant in the ledger grid context during mapping — no modal interruption. Optimistic updates provide immediate feedback. TanStack Query handles cache invalidation and background refetching after mutations.

**Alternatives considered**: Modal-based mapping wizard (rejected — interrupts workflow, more complex UX); separate mapping admin page (rejected — spec requires "on the active workspace layout" inline experience).

## 8. OAuth 2.0 Authorization Code Flow

**Decision**: Implement the standard Intuit OAuth 2.0 authorization code grant for connecting a venue's QBO account. The flow:

1. `GET /api/venues/{venueId}/qbo/connect` — redirects to Intuit's authorization URL with `scope=com.intuit.quickbooks.accounting` (read-only), `redirect_uri`, and a CSRF `state` token.
2. Intuit redirects back to `GET /api/venues/{venueId}/qbo/callback` with an authorization `code`.
3. The callback exchanges the code for `access_token` + `refresh_token` via Intuit's token endpoint.
4. Tokens are encrypted via Data Protection and stored in `QboVenueCredential`.
5. The `realm_id` (QBO company ID) is extracted from the callback and stored for API calls.

Disconnect: `POST /api/venues/{venueId}/qbo/disconnect` revokes the token at Intuit and deletes the `QboVenueCredential` record.

**Rationale**: Standard OAuth 2.0 authorization code grant is the Intuit-required flow for server-side applications. The venue-level connection scope aligns with the data model (mappings are per-venue, credentials are per-venue).

**Alternatives considered**: OAuth client credentials (rejected — Intuit does not support client credentials for accounting data access); per-organization connection (rejected — different venues at the same org may connect to different QBO companies).
