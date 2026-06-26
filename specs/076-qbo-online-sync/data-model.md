# Data Model: QuickBooks Online Core Integration

**Feature**: 076-qbo-online-sync | **Date**: 2026-06-26

See [research.md](./research.md) for design rationale. Builds on entities from spec 003 (`QboVenueCredential`, `QboAccountMapping`, `QboSyncLedger`, `UnmappedQboTransaction`).

## New entities

### QboTrackingMapping

Binds a QuickBooks Class or Tag to a Split-Rail Region, Venue, or Event for sync routing.

| Field | Type | Constraints |
|-------|------|-------------|
| `Id` | uuid | PK |
| `OrganizationId` | uuid | FK → Organization; required; global query filter |
| `VenueId` | uuid | FK → Venue; required |
| `QboTrackingType` | string | `"Class"` \| `"Tag"` |
| `QboTrackingId` | string | Intuit entity id; required |
| `QboTrackingName` | string | Display name snapshot; required |
| `TargetTier` | string | `"Region"` \| `"Venue"` \| `"Event"` |
| `TargetEntityId` | uuid | FK to Region, Venue, or Event id per tier |
| `CreatedAt` | timestamptz | Required |

**Indexes**:
- Unique: `(VenueId, QboTrackingId, TargetTier, TargetEntityId)`
- Index: `(OrganizationId, VenueId)`

**Validation**:
- `TargetEntityId` MUST belong to the same organization as `VenueId`.
- Event-tier target MUST reference an event at `VenueId`.
- Venue-tier target MUST equal `VenueId`.
- Region-tier target MUST be a region in the venue's organization.

**Relationships**:
- Many mappings per venue; each mapping binds one QBO tracking ref to one Split-Rail entity.

---

### QboTrackingRef (value object / DTO)

Normalized catalog and API shape for Classes and Tags.

| Field | Type | Description |
|-------|------|-------------|
| `Type` | string | `Class` \| `Tag` |
| `Id` | string | Intuit id |
| `Name` | string | Display name |

Not persisted independently; used in catalog responses and mapping DTOs.

---

## Extended entities

### Organization

| New field | Type | Default | Description |
|-----------|------|---------|-------------|
| `TimeZoneId` | string | `America/Denver` | IANA timezone for nightly 3:00 AM sync dispatch |

**Validation**: MUST be a valid IANA timezone id resolvable by `TimeZoneInfo.FindSystemTimeZoneById`.

---

### QboVenueCredential (extend)

| New field | Type | Default | Description |
|-----------|------|---------|-------------|
| `CompanyName` | string? | null | Cached from Intuit company info on connect |
| `IsExpired` | bool | false | Set true when refresh fails with 401/403 |

**State derivation**:

| `QboConnectionState` | Condition |
|----------------------|-----------|
| `Disconnected` | No credential row |
| `Connected` | Credential exists AND `IsExpired == false` AND refresh succeeds |
| `Expired` | Credential exists AND (`IsExpired == true` OR refresh returns 401/403) |

---

## DTOs (API layer — not persisted)

### VenueQboIntegrationDto

| Field | Type | Notes |
|-------|------|-------|
| `VenueId` | uuid | |
| `QboConnected` | bool | `true` only when state is Connected |
| `ConnectionState` | string | `Disconnected` \| `Connected` \| `Expired` |
| `CompanyName` | string? | Omitted when Disconnected |
| `RealmId` | string? | Intuit company id |
| `LastSyncedAt` | timestamptz? | From latest sync batch |
| `CanPurgeCache` | bool | `true` when disconnected AND cached rows exist |

---

### OrganizationQboSummaryDto

| Field | Type | Notes |
|-------|------|-------|
| `OrganizationId` | uuid | |
| `IsQboConnected` | bool | Any venue Connected |
| `ConnectedVenueCount` | int | |
| `TotalVenueCount` | int | Accessible venues in org |

---

### QboTrackingCatalogDto

| Field | Type |
|-------|------|
| `Items` | `QboTrackingRef[]` |

Catalog cached in memory 15 minutes per venue (not a DB table in MVP).

---

## Existing entities (unchanged schema, behavior extended)

### QboAccountMapping

Retained from spec 003. Surfaced in Integrations mapping console **Account Mappings** tab alongside tracking mappings.

### FinancialLineItem.qbo_actual_value

Append-only until Admin purge; purge sets to null for venue events (decimal, Constitution I).

### QboSyncLedger / UnmappedQboTransaction

Purge deletes venue-scoped rows. Disconnect retains rows (snapshot freeze).

---

## Purge cascade (transactional)

Scoped to `venueId` + organization filter:

| Target | Action on purge |
|--------|-----------------|
| `qbo_sync_ledger` | DELETE |
| `unmapped_qbo_transactions` | DELETE |
| `qbo_account_mappings` | DELETE |
| `qbo_tracking_mappings` | DELETE |
| `financial_line_items.qbo_actual_value` | SET NULL |
| `qbo_venue_credentials` | Precondition: already absent |
| Settlement PDF archives (GCS) | **NO ACTION** |

---

## Tracking resolution (runtime)

For event `E` at venue `V` in region `R` (nullable):

```text
1. QboTrackingMapping where TargetTier=Event AND TargetEntityId=E.Id
2. Else QboTrackingMapping where TargetTier=Venue AND TargetEntityId=V.Id
3. Else QboTrackingMapping where TargetTier=Region AND TargetEntityId=R.Id
4. Else legacy E.QboTagName string match against transaction Class/Tag name
```

---

## Scheduler dispatch (logical — no DB table)

**NightlyDispatchWindow**: org eligible when `TimeZoneInfo.ConvertTimeFromUtc(UtcNow, org.TimeZoneId).Hour == 3` AND `Minute < 15`.

Internal trigger accepts optional `organizationId` to sync single org; default syncs all eligible orgs in window.
