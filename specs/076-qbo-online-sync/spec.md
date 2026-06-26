# Feature Specification: QuickBooks Online Core Integration

**Feature Branch**: `076-qbo-online-sync`

**Created**: 2026-06-26

**Status**: Draft

**Input**: Linear project [QuickBooks Online Sync](https://linear.app/audiodex/project/quickbooks-online-sync-9e3cb33ef2a2/overview) — The integrations page in Settings should let organization Admins connect and manage a read-only QuickBooks Online integration. In local development, the integration uses Intuit's sandbox environment. Source documents: [Product Requirements Document (PRD)](https://linear.app/audiodex/document/product-requirements-document-prd-0ccc1e195549), [Technical Design Document (TDD)](https://linear.app/audiodex/document/technical-design-document-tdd-752d8b26d83f).

**Depends on**: QuickBooks pull cache and inline account mapping (spec 003), global navigation and accounting views (spec 037), QBO egress write guard (spec 048), scheduled QBO sync trigger (spec 057), organization and venue foundation (spec 001), region entities (spec 073)

## Overview

Split-Rail is an accounting-first venue platform: show planning, night-of settlement, and post-show auditing. This feature completes the **QuickBooks Online (QBO) core integration** by delivering the Admin-facing Settings workspace, Class/Tag tracking mappings, connection lifecycle controls, tenant-timezone nightly sync, and state-aware financial views when no integration is active.

The integration follows a strict **read-only reverse-sync pull model**: Split-Rail pulls cleared banking records and transaction groups from the venue's QuickBooks company using Classes or Tags, then matches them against locked proforma projections and settlement actuals. Split-Rail **never writes to or modifies** the venue's live QuickBooks books.

The backend pull pipeline, OAuth token handling, account-to-ledger mapping, inline unmapped resolution, egress write guard, and scheduled sync infrastructure were delivered in prior specs. This feature closes the product gaps defined in the PRD: the Integrations settings workspace, Admin-only access, Class/Tag hierarchy mapping, disconnect and optional purge, 3:00 AM tenant-local sync cadence, environment-aware sandbox routing for non-production, and degraded UI when disconnected.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Admin connects QuickBooks from Settings Integrations (Priority: P1)

As an organization Admin, I need to connect my venue's QuickBooks Online account from a dedicated Integrations page in Settings, so I can begin pulling cleared bank data for variance auditing without leaving the application's configuration workflow.

**Why this priority**: Without a discoverable connect flow in Settings, the existing sync pipeline delivers no user-facing value. This is the entry point for the entire integration.

**Independent Test**: Sign in as an Admin, navigate Profile Badge → Settings → Integrations, complete the QuickBooks authorization flow, and confirm the integration card shows a connected state with company name, company identifier, and last sync timestamp.

**Acceptance Scenarios**:

1. **Given** an Admin on the Integrations page with no active connection for the selected venue, **When** the page loads, **Then** a disconnected-state card displays the QuickBooks logo, a read-only pull explainer, and a primary **Connect to QuickBooks** action.
2. **Given** an Admin clicks **Connect to QuickBooks**, **When** authorization completes successfully, **Then** the user returns to the Integrations page and the card shows a connected state with company identity, company identifier, and most recent sync timestamp.
3. **Given** an organization manages multiple venues, **When** the Admin opens Integrations, **Then** they can select which venue the connection applies to before connecting or viewing status.
4. **Given** an active connection whose authorization has been revoked upstream, **When** the Integrations page loads, **Then** the card shows a **Connection Expired** state with a **Reconnect** action (same flow as initial connect).
5. **Given** a connected venue, **When** the Admin views the Integrations card, **Then** a secondary **Disconnect Account** action is available.

---

### User Story 2 - Only Admins can access integration management (Priority: P1)

As the platform owner, I need QuickBooks setup, mapping, sync triggers, and disconnect actions restricted to Admins, so financial integration credentials and configuration cannot be altered by venue managers, promoters, or external bookkeepers.

**Why this priority**: The PRD mandates strict isolation of financial integration controls. Without Admin-only enforcement, unauthorized users could connect, disconnect, or trigger syncs affecting ledger integrity.

**Independent Test**: Sign in as a non-Admin role; confirm the Integrations navigation item is hidden and direct navigation to the Integrations path is blocked with an appropriate denial. Sign in as Admin; confirm full access.

**Acceptance Scenarios**:

1. **Given** a user without the Admin role, **When** they open Settings, **Then** the Integrations tab or menu item is not visible.
2. **Given** a non-Admin user attempts to navigate directly to the Integrations settings path, **When** the request is processed, **Then** they are redirected away with a clear message and no integration controls are rendered.
3. **Given** a non-Admin user attempts any integration management action (connect, disconnect, purge, mapping changes, manual sync), **When** the server processes the request, **Then** access is denied and the attempt is recorded for audit monitoring.
4. **Given** a user with financial viewing permission but not Admin, **When** they view ledgers or dashboards, **Then** they may see QBO-derived data when connected but cannot access integration configuration.

---

### User Story 3 - Admin maps QuickBooks Classes and Tags to Region, Venue, or Event (Priority: P2)

As an Admin, I need to bind QuickBooks Classes and Tags to Split-Rail Region, Venue, or Event tiers in a unified mapping console, so incoming transactions route to the correct shows and territories regardless of whether my accountant uses Classes or Tags in QuickBooks.

**Why this priority**: Account-to-ledger mapping exists from prior work, but event scoping currently relies on free-text tag names. Structured Class/Tag hierarchy mapping is required for accurate multi-tier routing.

**Independent Test**: With an active connection, open the mapping console on Integrations, bind a QuickBooks Class to an Event, run a sync, and confirm transactions tagged with that Class update variance for that event only.

**Acceptance Scenarios**:

1. **Given** an active QuickBooks connection, **When** the Admin opens the Integrations mapping console, **Then** a filterable list of Classes and Tags from the connected QuickBooks company is displayed.
2. **Given** the Admin selects a Class or Tag, **When** they assign a Split-Rail target, **Then** they may bind it to exactly one of: Region, Venue, or Event tier.
3. **Given** mappings exist at multiple tiers for the same event (Region, Venue, and Event), **When** sync resolves tracking for that event, **Then** the most specific tier wins (Event over Venue over Region).
4. **Given** the Admin edits or removes a tracking mapping, **When** the next sync runs, **Then** transaction routing reflects the updated binding.
5. **Given** legacy events still use free-text tag names, **When** sync runs before migration, **Then** existing tag-name matching continues to work until superseded by structured mappings.

---

### User Story 4 - Admin uses Quick Assign during Event, Venue, or Region setup (Priority: P2)

As an Admin managing a heavy touring schedule, I need to assign a QuickBooks Class or Tag while creating or editing an Event, Venue, or Region, so I do not have to leave my operational workflow to visit Settings.

**Why this priority**: Reduces configuration friction for operators who create many calendar entries and territories. Builds on the mapping console but delivers value in day-to-day workflows.

**Independent Test**: Create a new event, use Quick Assign to pick a Class from the typeahead list, save the event, and confirm a tracking mapping exists without visiting Integrations.

**Acceptance Scenarios**:

1. **Given** an active QuickBooks connection, **When** the Admin creates or edits an Event, **Then** a **Quick Assign Tracking** selector is available with typeahead search against cached Classes and Tags.
2. **Given** the Admin selects a Class or Tag in Quick Assign on an Event form, **When** they save, **Then** an Event-tier tracking mapping is created automatically.
3. **Given** the Admin creates or edits a Venue or Region, **When** they use Quick Assign, **Then** a Venue-tier or Region-tier mapping is created respectively.
4. **Given** no active connection, **When** the Event, Venue, or Region form renders, **Then** Quick Assign is hidden or disabled with explanatory copy.

---

### User Story 5 - Admin disconnects and optionally purges cached QuickBooks data (Priority: P3)

As an Admin, I need to disconnect QuickBooks while preserving historical variance snapshots by default, and optionally purge all cached QuickBooks data when I want a clean baseline, so I control credential lifecycle and data retention explicitly.

**Why this priority**: Disconnect without purge preserves audit history; purge is destructive and secondary. Required for credential rotation and offboarding but not for initial connect value.

**Independent Test**: Disconnect a connected venue; confirm sync stops and cached variance data remains visible. Then use Clear Cached QBO Data; confirm variance metrics are removed while settlement PDF archives remain.

**Acceptance Scenarios**:

1. **Given** a connected venue, **When** the Admin confirms **Disconnect Account**, **Then** active credentials are revoked, scheduled sync is suspended, and cached transaction feeds and variance logs remain as frozen snapshots.
2. **Given** a disconnected venue with cached data, **When** the Integrations page loads, **Then** a **Clear Cached QBO Data** action is visible.
3. **Given** the Admin triggers **Clear Cached QBO Data**, **When** they confirm the warning that historical variance metrics will be permanently removed, **Then** all locally cached QuickBooks deposit metrics, mappings, and sync artifacts for that venue are purged while settlement PDF archives are untouched.
4. **Given** a venue is still connected, **When** the Admin views Integrations, **Then** **Clear Cached QBO Data** is not available (purge requires disconnect first).

---

### User Story 6 - Nightly sync and Admin Force Pull keep data current (Priority: P3)

As an Admin, I need QuickBooks data to sync automatically every night at 3:00 AM in my organization's local timezone and to trigger an immediate pull on demand when auditing, so ledger actuals stay current without waiting for the nightly cycle.

**Why this priority**: Automated sync is essential for ongoing value; Force Pull supports live auditing. Depends on connection (P1) being in place.

**Independent Test**: Configure an organization timezone; verify sync eligibility at local 3:00 AM. As Admin, click **Force Pull Latest QBO Data** and confirm updated sync timestamp and refreshed variance within one minute, with debounce preventing rapid repeat clicks.

**Acceptance Scenarios**:

1. **Given** active connections and valid credentials, **When** the organization's local time reaches 3:00 AM, **Then** an automated sync ingests QuickBooks entries from the previous 48 hours for eligible events.
2. **Given** an Admin on the Integrations card or event workspace, **When** they click **Force Pull Latest QBO Data**, **Then** an immediate sync runs for that venue's data with a visible in-progress indicator.
3. **Given** the Admin clicked Force Pull within the last 60 seconds, **When** they attempt another click, **Then** the action is debounced and a progress indicator reflects the in-flight sync.
4. **Given** a non-Admin user, **When** they view event or Integrations surfaces, **Then** Force Pull controls are not visible.
5. **Given** development or staging environments, **When** sync or connect runs, **Then** all QuickBooks interactions route to Intuit's sandbox environment; production routes to live QuickBooks only.

---

### User Story 7 - Financial views adapt when QuickBooks is not connected (Priority: P4)

As any user viewing financial data, I need ledgers, dashboards, and event cards to hide QuickBooks-specific columns and actions when no integration is active, so I see a clean proforma-and-settlement view without empty or misleading QBO fields.

**Why this priority**: Polishes the experience across the app after connection management exists. Prevents confusion from blank variance columns and false alerts.

**Independent Test**: Disconnect all venues in an organization; open an event ledger, dashboard, and post-show event card; confirm QBO columns, variance links, sync buttons, and QBO-specific alerts are suppressed per PRD §8.

**Acceptance Scenarios**:

1. **Given** no active QuickBooks connection for the venue, **When** a user views an event ledger, **Then** columns for Actual QBO Deposits, QBO Cleared Banking Feed, and Variance are omitted; only Proforma and Night-of Settlement columns remain.
2. **Given** no active connection and the viewer is an Admin, **When** they view the dashboard financial widget, **Then** QBO trend data is omitted and an onboarding callout with a link to Settings → Integrations is shown.
3. **Given** no active connection and the viewer is not an Admin, **When** they view the dashboard, **Then** QBO trend data and the onboarding callout are both hidden; adjacent layout expands to fill the space.
4. **Given** no active connection, **When** a post-show event card renders, **Then** the **View QBO Variance** link is removed and sync is shown as unavailable with explanatory copy.
5. **Given** no active connection, **When** background monitoring evaluates event health, **Then** alerts for unsettled QBO sync or variance review are suppressed to avoid false positives.
6. **Given** no active connection, **When** financial data is delivered to the client, **Then** QuickBooks-specific fields are omitted from responses rather than returned as empty placeholders.

---

### Edge Cases

- **Token refresh failure**: When upstream authorization fails, the connection state transitions to Expired without crashing; the user sees Reconnect on Integrations and degraded views elsewhere.
- **Concurrent sync requests**: A sync already in progress for the same scope must not run a duplicate batch; debounce or queue safely.
- **Disconnect during active sync**: Disconnect should wait for or safely cancel in-flight sync without corrupting partial state.
- **Purge with settled events**: Purging cached data resets variance metrics but must not alter locked settlement PDF snapshots or proforma/settlement actuals entered manually.
- **Multi-venue organizations**: Each venue maintains its own connection; org-level summary reflects whether any venue is connected for dashboard gating.
- **QuickBooks API rate limits**: Scheduled and manual syncs must respect vendor rate limits with backoff; failures produce structured, sanitized logs without exposing credentials.
- **Cross-tenant isolation**: No user may view or modify another organization's integration credentials, mappings, or sync data.
- **Read-only guardrail**: No user action or background job may create, update, or delete records in the customer's QuickBooks company; all integration behavior is inquiry-only.
- **Append-only ledger integrity**: Sync must not delete or overwrite historical actual values; corrections follow offset-entry semantics from prior specs.
- **Organization without timezone**: Default to a sensible regional timezone until the organization sets one explicitly.
- **Classes unavailable in QuickBooks edition**: Catalog and mapping console handle editions where only Tags (or only Classes) exist gracefully.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The application MUST provide a Settings → Integrations workspace reachable from the Profile Badge flyout → Settings navigation path.
- **FR-002**: Only users with the Admin role MUST be able to view, connect, disconnect, purge, configure tracking mappings, or trigger manual QuickBooks sync; non-Admins MUST be denied with audit logging on forced access attempts.
- **FR-003**: The Integrations workspace MUST display a QuickBooks integration card with three distinguishable states: Disconnected, Connected, and Connection Expired.
- **FR-004**: The Disconnected state MUST explain the read-only pull model and offer a primary **Connect to QuickBooks** action styled per brand guidelines (Alpine Sunset primary tone).
- **FR-005**: The Connected state MUST show company identity name, company identifier, last sync timestamp, **Disconnect Account**, and **Force Pull Latest QBO Data** for Admins.
- **FR-006**: The Connection Expired state MUST explain the authorization failure and offer **Reconnect** using the same flow as initial connect.
- **FR-007**: Multi-venue organizations MUST allow Admins to select the target venue on the Integrations page before connect, disconnect, mapping, or sync actions.
- **FR-008**: **Disconnect Account** MUST revoke credentials, suspend scheduled sync, and retain cached transaction feeds and variance logs as frozen snapshots by default.
- **FR-009**: After disconnect, Admins MUST be offered **Clear Cached QBO Data** with a confirmation warning that variance metrics will be permanently removed; confirmed purge MUST remove locally cached QuickBooks metrics and mappings while preserving settlement PDF archives.
- **FR-010**: The Integrations mapping console MUST list Classes and Tags from the connected QuickBooks company in a filterable table and allow binding each to Region, Venue, or Event tier.
- **FR-011**: Sync routing MUST resolve the effective tracking reference for an event using most-specific-tier-wins: Event, then Venue, then Region, then legacy free-text tag name fallback.
- **FR-012**: Event, Venue, and Region create/edit forms MUST offer **Quick Assign Tracking** typeahead against cached Classes and Tags when a connection is active.
- **FR-013**: Automated sync MUST run nightly at 3:00 AM in the organization's configured local timezone and ingest entries from the previous 48-hour window.
- **FR-014**: **Force Pull Latest QBO Data** MUST be available to Admins on Integrations and event workspaces, enforce a minimum 60-second debounce between triggers, and show in-progress feedback.
- **FR-015**: Non-production environments (local development and staging) MUST route all QuickBooks authorization and data queries to Intuit's sandbox; production MUST route to live QuickBooks only.
- **FR-016**: Production MUST NOT expose any user-facing control to switch a live organization to sandbox QuickBooks (explicit MVP out-of-scope boundary).
- **FR-017**: When no venue in scope has an active connection, event ledgers MUST omit QBO Actual, Cleared Feed, and Variance columns.
- **FR-018**: When no connection is active, the dashboard MUST omit QBO data series; Admins MUST see an onboarding callout linking to Integrations; non-Admins MUST NOT see the callout.
- **FR-019**: When no connection is active, post-show event cards MUST remove QBO variance links, show sync as unavailable, and suppress QBO-dependent health alerts.
- **FR-020**: When no connection is active, client-facing financial payloads MUST omit QuickBooks-specific fields rather than returning null placeholders.
- **FR-021**: OAuth tokens MUST be encrypted at rest before persistence; token values MUST never appear in logs or user-visible error messages.
- **FR-022**: The integration MUST operate read-only against QuickBooks: inquiry privileges only; no writes, updates, or deletes to the customer's QuickBooks records.
- **FR-023**: Historical synced actual values MUST remain append-only until an Admin explicitly purges cached data; corrections follow offset-entry rules from prior specs.
- **FR-024**: The feature MUST achieve ≥80% line/branch coverage across backend and frontend for changed code (CI-enforced; Constitution III).

### Key Entities

- **QuickBooks Connection (per venue)**: Represents an authorized read-only link between one Split-Rail venue and one QuickBooks company; holds encrypted credentials and connection state (Disconnected, Connected, Expired).
- **Tracking Mapping**: Binds a QuickBooks Class or Tag to a Split-Rail Region, Venue, or Event for transaction routing during sync.
- **Account Mapping**: Existing binding of QuickBooks account to ledger line category (from spec 003); retained alongside tracking mappings in the Integrations console.
- **Organization Timezone**: The IANA timezone used to determine when nightly 3:00 AM sync runs for that tenant.
- **Cached QuickBooks Data**: Locally stored sync artifacts including mapped transactions, unmapped transaction queue, account and tracking mappings, and variance actuals derived from QuickBooks — distinct from settlement PDF archives.
- **Organization QBO Summary**: Aggregate view of whether any venue in the organization has an active connection, used for dashboard and navigation gating.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of Admin test users can complete connect → view connected status → disconnect from Settings → Integrations in under 5 minutes without support.
- **SC-002**: 100% of non-Admin role attempts to reach integration management paths are blocked with no configuration controls rendered.
- **SC-003**: After binding a Class or Tag to an Event, sync updates variance for that event within one Force Pull cycle (under 2 minutes for typical event scope).
- **SC-004**: Nightly sync runs at 3:00 AM local time ±15 minutes for organizations across at least three different timezones in acceptance testing.
- **SC-005**: When all venues are disconnected, 100% of sampled ledger, dashboard, and event card views omit QBO-specific columns and actions per acceptance scenarios in User Story 7.
- **SC-006**: Zero write operations to customer QuickBooks companies occur during connect, sync, disconnect, mapping, or purge flows in integration test suites.
- **SC-007**: Confirmed purge removes cached variance metrics while settlement PDF archives remain retrievable in 100% of test cases.
- **SC-008**: ≥80% line/branch coverage achieved across backend and frontend code changed for this feature (CI-enforced; Constitution III).

## Assumptions

- One QuickBooks company connection applies per venue; multi-venue organizations manage connections independently via venue selector on Integrations.
- Backend pull pipeline, OAuth token service, account mapping, inline unmapped resolution, egress write guard, and Cloud Scheduler infrastructure from specs 003, 037, 048, and 057 are available and will be extended—not replaced—by this feature.
- Classes and Tags are treated interchangeably for mapping purposes; both normalize to a unified tracking reference in the product.
- Token encryption at rest uses the platform's existing data-protection and key-management approach, satisfying the PRD intent for secure credential storage.
- Intuit does not offer a narrower read-only OAuth scope; behavioral read-only enforcement (no mutating vendor calls) satisfies the security requirement.
- Organization timezone defaults to a sensible value (e.g., America/Denver) when not explicitly configured at org creation.
- Production sandbox toggles for customer testing are out of MVP scope per PRD §7.2.
- Settlement PDF archives in WORM storage (spec 050) are never deleted by disconnect or purge operations.
- Phased delivery may split Integrations shell, RBAC, tracking mappings, scheduler timezone, and disconnected UI across implementation tasks, but this specification defines the complete target behavior.

## Out of Scope (MVP)

- User-facing sandbox toggle on production allowing customers to connect live Split-Rail to Intuit sandbox ledgers.
- Writing or modifying any data in the customer's QuickBooks company.
- Replacing or duplicating the existing account-to-ledger inline mapping workflow from spec 003 (extended, not removed).
