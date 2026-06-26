# Research: QuickBooks Online Core Integration

**Feature**: 076-qbo-online-sync | **Date**: 2026-06-26

Consolidates technical decisions for Phase 0. Source: [spec.md](./spec.md), Linear [PRD](https://linear.app/audiodex/document/product-requirements-document-prd-0ccc1e195549), [TDD](https://linear.app/audiodex/document/technical-design-document-tdd-752d8b26d83f), and existing codebase (specs 003, 037, 048, 057).

## 1. OAuth credential scope

**Decision**: Per-venue credentials (`QboVenueCredential`) — one Intuit realm per venue.

**Rationale**: Matches existing schema and multi-venue org model. Integrations page uses venue selector when org has multiple venues.

**Alternatives considered**:
- Org-level single credential — rejected; venues may use different QuickBooks companies.
- Per-event credentials — rejected; excessive OAuth overhead.

## 2. Integration RBAC model

**Decision**: Admin-only via new `[RequireAdminRole]` authorization attribute checking `RoleNames.Admin` on the current org mapping. Remove `can_trigger_qbo_sync` and `can_map_qbo_accounts` from default Venue Manager and External Bookkeeper role seeds; retain `can_view_financials` for read-only ledger access.

**Rationale**: PRD §2 mandates Admin-only integration management. Permission flags alone allow custom roles to grant QBO access; role-name gate is explicit and auditable.

**Alternatives considered**:
- Keep permission flags, document Admin-only in UI — rejected; non-Admin API calls would still succeed if role flags set.
- New dedicated permission `can_manage_qbo_integration` — rejected; adds matrix complexity without benefit over Admin role check.

## 3. Class vs Tag abstraction

**Decision**: Unified `QboTrackingRef` record (`Type`, `Id`, `Name`) with values `Class` | `Tag`. New `QboMetadataClient` queries both Intuit entity types and normalizes to the same shape.

**Rationale**: PRD §5 treats Classes and Tags interchangeably. Venues use different QBO editions; normalization hides API differences.

**Alternatives considered**:
- Tags only (current free-text `Event.QboTagName`) — rejected; does not support Region/Venue tiers or Class-based orgs.
- Separate mapping tables for Class and Tag — rejected; duplicate CRUD and UI.

## 4. Tracking resolution precedence

**Decision**: Most-specific-tier-wins: Event-tier mapping → Venue-tier → Region-tier → legacy `Event.QboTagName` string match.

**Rationale**: Aligns with PRD §5.1 hierarchy and preserves backward compatibility during migration.

**Alternatives considered**:
- Event-only mappings — rejected; PRD requires Region and Venue tiers.
- Region overrides Event — rejected; contradicts operational expectation that show-level tags are most specific.

## 5. Nightly sync scheduler pattern

**Decision**: Replace 6-hour UTC cron (`0 */6 * * *`) with a **15-minute UTC dispatcher** (`*/15 * * * *`) that selects organizations where local time is 03:00–03:14 (using `Organization.TimeZoneId`). Extend internal trigger with optional `?mode=nightly` and `?organizationId=` query params.

**Rationale**: Single Cloud Scheduler job scales to many orgs without per-tenant job proliferation (TDD risk mitigation). 15-minute window tolerates dispatcher latency.

**Alternatives considered**:
- Per-org Cloud Scheduler jobs — rejected for MVP; operational complexity and GCP quota concerns.
- Keep 6-hour UTC — rejected; fails PRD §6.1 tenant-local 3:00 AM requirement.

## 6. Sync lookback window

**Decision**: 48-hour lookback from sync start time (verify/update in `QboSyncService`).

**Rationale**: PRD §6.1 explicit requirement; catches late-posted bank clearings without full history replay.

**Alternatives considered**:
- 24-hour lookback — rejected; may miss weekend-posted transactions before Monday 3 AM sync.
- Full history on nightly — rejected; API rate limit and performance risk.

## 7. Token encryption at rest

**Decision**: Continue ASP.NET Core Data Protection in `QboTokenService` with KMS-backed key ring in production (spec 047). Document as satisfying PRD at-rest encryption intent.

**Rationale**: Already implemented and tested. PRD AES-256-GCM wording is intent-level; framework encryption meets security goal unless compliance audit requires explicit GCM.

**Alternatives considered**:
- Explicit AES-256-GCM column encryption — rejected unless audit mandates; larger migration scope.

## 8. Connection Expired state

**Decision**: Derive `Expired` when credential row exists but token refresh returns 401/403 from Intuit. Optionally persist `IsExpired` flag on credential for stable UI without refresh attempt on every page load.

**Rationale**: PRD §4.1 and §9 require graceful expired UI distinct from Disconnected.

**Alternatives considered**:
- Delete credential on refresh failure — rejected; loses reconnect context and company name display.

## 9. Environment routing

**Decision**: Extend `QboSyncOptions` with `EnvironmentProfile` (`development` | `staging` | `production`). Development and Staging use sandbox Intuit URLs and sandbox app keys; Production uses production URLs and Secret Manager keys. Wire from `ASPNETCORE_ENVIRONMENT` at startup.

**Rationale**: PRD §7.1. Existing `IntuitApiBaseUrl` is configurable but not environment-profile-driven.

**Alternatives considered**:
- Manual env var per URL — rejected; error-prone for operators.

## 10. Purge cascade scope

**Decision**: `QboPurgeService` deletes venue-scoped rows from `qbo_sync_ledger`, `unmapped_qbo_transactions`, `qbo_account_mappings`, `qbo_tracking_mappings`; sets `financial_line_items.qbo_actual_value` to null for venue events. Does not touch settlement PDF archives (GCS WORM, spec 050) or proforma/settlement manual actuals.

**Rationale**: PRD §4.2 explicit destructive scope with audit PDF preservation.

**Alternatives considered**:
- Purge including sync ledger offset audit rows — accepted for MVP; document in release notes (TDD §5.4).

## 11. Disconnected payload stripping

**Decision**: Dedicated `IQboPayloadFilter` (or equivalent mapper layer) omits QBO-specific DTO fields when venue connection state is not `Connected`. Frontend treats missing fields as disconnected.

**Rationale**: PRD §8 and §9; cleaner than sending null placeholders. Centralizes logic vs per-controller conditionals.

**Alternatives considered**:
- Frontend-only column hiding — rejected; fails FR-020 API stripping requirement and leaks data shape.

## 12. Force Pull debounce

**Decision**: 60-second client debounce + server-side per-venue rate limit (1 request/minute) on venue sync endpoint.

**Rationale**: PRD §6.2; defense in depth against double-clicks and scripted abuse.

**Alternatives considered**:
- Client-only debounce — rejected; bypassable via direct API calls.

## 13. OAuth callback redirect

**Decision**: Change post-auth redirect from `/?venueId=…&qboConnected=true` to `/settings/integrations?venueId=…&qboConnected=true`.

**Rationale**: TDD §3.1; user lands on Integrations card after connect.

## 14. Legacy tag migration

**Decision**: Phase 3 includes optional data migration mapping existing non-empty `Event.QboTagName` values to Event-tier `QboTrackingMapping` rows where resolvable against catalog.

**Rationale**: Preserves sync behavior for existing events without manual re-mapping.

**Alternatives considered**:
- Hard cutover — rejected; breaks existing connected venues.
