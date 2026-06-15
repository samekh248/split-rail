# Feature Specification: QuickBooks Online Pull Cache & Inline Mapping Engine

**Feature Branch**: `003-qbo-pull-cache-mapping`

**Created**: 2026-06-14

**Status**: Draft

**Input**: Linear SPLR-18 — Orchestrate the read-only QuickBooks Online (QBO) transaction integration framework that maps real-world cleared bank transactions natively to ledger line items via the platform's "Reverse-Sync" paradigm: QBO is the absolute Source of Truth, and this system reads from QBO using native QBO Tags (e.g., `Show-104`) to populate the QBO Actuals column and drive the Variance audit trail — without ever writing back into the customer's general ledger.

**Depends on**: SPLR-16 (Tenant Foundation & RBAC), SPLR-17 (Financial Ledger Grid & Math Engine)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ingest QBO transactions and populate actuals via tag-based sync (Priority: P1)

An accounting manager connects their venue's QuickBooks Online account through a secure OAuth flow. The system begins automatically syncing cleared transactions every 6 hours, filtering by native QBO Tags (e.g., `Show-104`) that match event tag names. Matched transactions aggregate into the `QBO Actuals` column of the corresponding ledger rows, giving the accountant a live view of real-world spend against the settlement.

**Why this priority**: Without the core ingestion pipeline, no QBO data enters the platform. This is the foundational read-only sync that everything else depends on.

**Independent Test**: Configure an event with a QBO tag, trigger a sync, and confirm matched transactions populate the QBO Actuals column with the correct aggregated amounts while the settlement and proforma values remain unchanged.

**Acceptance Scenarios**:

1. **Given** an event with `qbo_tag_name` set to `Show-104`, **When** the scheduled sync runs and QBO contains transactions tagged `Show-104`, **Then** matched transactions aggregate into the correct `financial_line_items.qbo_actual_value` rows via account mapping.
2. **Given** a sync has already run and cached actuals, **When** a subsequent sync runs and a previously-synced QBO item has been altered or removed upstream, **Then** the historical `qbo_actual_value` rows are NOT deleted or overwritten (append-only integrity).
3. **Given** the OAuth token has expired, **When** a sync attempt occurs, **Then** the system refreshes the token automatically; if refresh fails, a granular domain exception is thrown (not a generic `System.Exception` or empty catch).
4. **Given** the ingestion pipeline processes transactions, **When** any transaction bears a `qbo_account_id` with no mapping in `qbo_account_mappings`, **Then** the system caches the transaction, increments an unmapped item counter, and does NOT throw or halt the sync batch.

---

### User Story 2 - Resilient handling of unmapped transactions with inline mapping (Priority: P2)

When QBO transactions arrive with account IDs that have no mapping to ledger rows, the system surfaces them in a warning banner on the event dashboard (e.g., "4 unassigned transactions detected"). An accountant can select an unmapped transaction directly from the warning list and link it to a specific ledger line item on the active workspace, without leaving the grid. The mapping is persisted and automatically applied to all future transactions bearing that same account ID, across all events at the venue.

**Why this priority**: Unmapped transactions are inevitable during initial onboarding. Without a graceful inline mapping workflow, the sync pipeline would either crash or silently drop data — both unacceptable for an accounting tool.

**Independent Test**: Trigger a sync with transactions bearing an unmapped `qbo_account_id`, confirm the unmapped banner appears with the correct count, map the transaction to a ledger row via the inline dropdown, and confirm future syncs with that same account ID automatically route to the mapped row.

**Acceptance Scenarios**:

1. **Given** ingested QBO data contains a transaction with an unmapped `qbo_account_id`, **When** the event dashboard renders, **Then** an inline warning banner shows the count of unmapped transactions (e.g., "4 unassigned transactions detected").
2. **Given** a user clicks on the unmapped transaction banner, **When** the list expands, **Then** each unmapped transaction shows the QBO account name, amount, and date.
3. **Given** a user selects an unmapped transaction and chooses a target ledger row from the dropdown, **When** they confirm, **Then** a mapping rule is persisted in `qbo_account_mappings` (unique on `venue_id` + `qbo_account_id`) and the item is cleared from the unmapped list.
4. **Given** a mapping rule exists for `qbo_account_id = "ABC123"` at venue X, **When** any future event at venue X syncs a transaction with `qbo_account_id = "ABC123"`, **Then** the transaction automatically routes to the mapped category row with no human intervention (self-healing routing).

---

### User Story 3 - Manual "Sync Now" override for live auditing (Priority: P3)

During live auditing windows, an authorized manager can trigger an immediate QBO sync on demand, bypassing the 6-hour scheduled cycle. The UI shows a "Sync Now" button with in-progress and success/error states. The button is hidden for users without the `can_trigger_qbo_sync` permission.

**Why this priority**: The scheduled 6-hour cycle is sufficient for routine operations, but live auditing windows require immediate data refresh. This is a convenience feature that builds on the P1 ingestion pipeline.

**Independent Test**: As an authorized user, click "Sync Now" on an event, confirm the sync fires immediately and QBO actuals update. As an unauthorized user, confirm the button is hidden/disabled. Confirm the endpoint returns 403 for roles lacking `can_trigger_qbo_sync`.

**Acceptance Scenarios**:

1. **Given** a user with `can_trigger_qbo_sync` permission, **When** they click "Sync Now", **Then** the system fires an immediate transactional fetch to refresh actuals and shows success/error feedback.
2. **Given** a user without `can_trigger_qbo_sync` permission, **When** the dashboard renders, **Then** the "Sync Now" button is hidden or disabled.
3. **Given** an unauthorized user calls `POST /api/venues/{venueId}/events/{eventId}/sync` directly, **When** the endpoint processes the request, **Then** it returns HTTP 403.
4. **Given** a user triggers sync for a venue outside their scope, **When** the endpoint processes the request, **Then** it returns HTTP 403 or 404.

---

### Edge Cases

- **Token refresh failure**: Granular domain exception, never generic `System.Exception` or empty catch. Log the failure without exposing cleartext tokens.
- **Duplicate sync**: A sync triggered while another is in-flight for the same event should be debounced or queued, not executed concurrently.
- **Large transaction volumes**: The ingestion pipeline must handle events with hundreds of QBO transactions without timeout or memory issues.
- **Mapping conflicts**: Attempting to create a duplicate mapping for the same `(venue_id, qbo_account_id)` should upsert or return a clear conflict error.
- **QBO API rate limits**: The sync client must respect Intuit API rate limits and implement exponential backoff.
- **Cross-tenant access**: A user from one organization must never access another organization's QBO data, mappings, or sync endpoints.
- **Append-only violation**: No code path may delete or overwrite historical `qbo_actual_value` entries — corrections only via offset entries.
- **Write infiltration**: No code path may issue HTTP POST/PUT/DELETE to Intuit QBO endpoints — the integration is strictly read-only.

## Requirements *(mandatory)*

### Functional Requirements

#### OAuth & Token Management

- **FR-001**: System MUST implement encrypted Intuit OAuth 2.0 client credential cache using .NET Data Protection / AES-256-GCM, with key material sourced from GCP Secret Manager.
- **FR-002**: System MUST restrict the Intuit app registration scope strictly to `com.intuit.quickbooks.accounting` with no write privileges.
- **FR-003**: System MUST automatically refresh expired OAuth tokens and throw a granular domain exception on refresh failure (never generic `System.Exception`, never an empty catch).
- **FR-004**: System MUST NOT log cleartext QBO access tokens, refresh tokens, client secrets, or raw cryptographic connection strings to any logging output.

#### Ingestion Pipeline

- **FR-005**: System MUST implement a scheduled `IHostedService` background cron that queries the QBO Transaction API every 6 hours, filtering by native tags matching `events.qbo_tag_name`.
- **FR-006**: System MUST use `IHttpClientFactory` for all outbound Intuit API calls.
- **FR-007**: System MUST aggregate matched transactions into the correct `financial_line_items.qbo_actual_value` based on `qbo_account_mappings` for the venue.
- **FR-008**: System MUST operate on an append-only ledger schema: if a QBO item is altered or removed upstream after a sync, the system MUST NOT drop or overwrite cached values in `qbo_actual_value`. Corrections are reflected only via additional offsetting entries.
- **FR-009**: System MUST NOT generate any C# method, route, or utility that performs HTTP POST/PUT/DELETE mutations against Intuit QBO endpoints. The integration is strictly read-only.

#### Unmapped Transaction Handling

- **FR-010**: System MUST NOT throw or halt the sync batch when a transaction bears an unmapped `qbo_account_id`. The system MUST cache the transaction and increment an unmapped item counter for the affected event/venue.
- **FR-011**: System MUST surface an inline warning banner on the event dashboard showing the live unmapped transaction count.
- **FR-012**: System MUST provide an inline mapping component that lets the user assign an unmapped QBO account to a specific ledger line item on the active workspace without leaving the grid.
- **FR-013**: System MUST persist mapping rules in `qbo_account_mappings` with a unique constraint on `(venue_id, qbo_account_id)`.
- **FR-014**: System MUST auto-route future transactions bearing a previously-mapped `qbo_account_id` to the mapped category row with no human intervention (self-healing routing).

#### Manual Sync

- **FR-015**: System MUST expose `POST /api/venues/{venueId}/events/{eventId}/sync` for manual sync override.
- **FR-016**: System MUST gate the manual sync endpoint by `can_trigger_qbo_sync` permission AND venue scope enforcement.
- **FR-017**: System MUST return HTTP 403 for unauthorized users and for out-of-scope venues.

#### Tenant Isolation

- **FR-018**: All sync and mapping queries MUST be constrained to the authenticated `organization_id` derived from JWT claims, joining `Event → Venue → OrganizationId`.
- **FR-019**: System MUST never trust client-supplied org/venue IDs for data access decisions.
- **FR-020**: System MUST use eager loading via `.Include()` / `.ThenInclude()` and append `.AsNoTracking()` on read paths.

#### Frontend

- **FR-021**: Frontend MUST render an inline operational alert banner on the event dashboard showing the live unmapped count.
- **FR-022**: Frontend MUST provide a drop-down component for inline mapping of unmapped QBO accounts to ledger line items.
- **FR-023**: Frontend MUST expose a "Sync Now" button with in-progress and success/error states, hidden/disabled for roles lacking `can_trigger_qbo_sync`.
- **FR-024**: Frontend MUST NOT hand-write TypeScript interfaces mirroring API payloads. All contracts imported from auto-generated `generated-api.ts`.

#### Contracts & Quality

- **FR-025**: System MUST include automated tests covering append-only safety, read-only enforcement (no POST/PUT/DELETE to QBO), unmapped transaction resilience, mapping auto-routing, and permission gating.
- **FR-026**: System MUST achieve ≥80% line/branch coverage for backend and frontend (CI-enforced).
- **FR-027**: System MUST enforce TLS 1.3 for all client/server traffic; `connect-src` CSP allows `*.quickbooks.com` and `*.googleapis.com` only.

### Key Entities *(include if feature involves data)*

- **QboAccountMapping**: Persistent mapping rule linking a QBO account to a ledger category at the venue level. Fields: `id` (UUID PK), `venue_id` (FK → venues), `qbo_account_id` (VARCHAR 100), `qbo_account_name` (VARCHAR 255), `mapped_category_label` (VARCHAR 255). Unique constraint on `(venue_id, qbo_account_id)`.
- **Event** (extended): Uses `qbo_tag_name` (VARCHAR 100) as the native QBO Tag string for ingestion filtering.
- **FinancialLineItem** (consumed): `qbo_actual_value` (NUMERIC 12,2) updated via append-only sync only.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After a sync, `qbo_actual_value` rows for matched transactions are populated with correct aggregated amounts and remain unaltered by subsequent syncs where the upstream QBO item is changed or deleted (append-only proven by tests).
- **SC-002**: 100% of sync batches containing unmapped `qbo_account_id` values complete without throwing or halting — unmapped items are counted and surfaced in the UI.
- **SC-003**: Once a mapping rule is saved for a `qbo_account_id`, 100% of future transactions with that ID at the same venue auto-route to the mapped row with no human intervention.
- **SC-004**: 0 programmatic paths exist that issue HTTP POST/PUT/DELETE to Intuit QBO endpoints (proven by mocked HTTP client tests asserting no write verbs).
- **SC-005**: 100% of attempts to access sync/mapping endpoints for another organization's data are rejected with 403/404.
- **SC-006**: No cleartext QBO tokens, refresh tokens, or client secrets appear in any log output (proven by log sanitization tests).
- **SC-007**: ≥80% line/branch coverage achieved across backend and frontend code for this feature.
- **SC-008**: The inline mapping dropdown allows accountants to map unmapped QBO accounts to ledger rows without leaving the grid.

## Assumptions

- The Financial Ledger Grid feature (SPLR-17 / feature 002) is complete, providing the `events`, `financial_line_items`, and `event_artists` entities, the ledger grid UI, and the `qbo_actual_value` column.
- The Tenant Foundation & RBAC feature (SPLR-16 / feature 001) is complete, providing `ITenantContext`, permission enforcement, and EF Core global query filters.
- A QBO developer app registration with `com.intuit.quickbooks.accounting` scope exists and credentials are available in GCP Secret Manager.
- The `events.qbo_tag_name` column is available from the ledger feature (SPLR-17).
- In production, the 6-hour `IHostedService` cron is triggered by Cloud Scheduler via an authenticated OIDC HTTP POST to the Cloud Run service.
- Settlement freeze/PDF generation (SPLR-19) and full E2E lifecycle testing (SPLR-20) are out of scope.
- Any write-back to QuickBooks is permanently out of scope per Constitution §IV.
