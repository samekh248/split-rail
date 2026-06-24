# Data Model: Always-On QuickBooks Egress Write Guard

**Feature**: 048-qbo-egress-write-guard (SPLR-41)  
**Date**: 2026-06-21

## Overview

This feature introduces **no database schema changes**. The data model documents runtime policy entities, HTTP client channels, and classification rules governing outbound QuickBooks traffic.

## Runtime Entities

### Egress Write Guard (`QboEgressRecordingHandler`)

| Attribute | Description |
|-----------|-------------|
| Channel | `QboApi` named `HttpClient` only |
| Mutating verbs | `POST`, `PUT`, `DELETE`, `PATCH` (case-insensitive) |
| Permitted verbs | `GET` (and any non-mutating method) toward accounting hosts |
| Rejection exception | `QboSyncException` with `ErrorCode = zero_write_infiltration` |
| Log payload | HTTP verb + destination host (debug on all egress; violation on block) |
| Recording | In-memory `QboEgressRecord { Method, Host, Timestamp }` per request |

### HTTP Client Channels

| Named client | Purpose | Handler attached | Typical hosts |
|--------------|---------|------------------|---------------|
| `QboApi` | Accounting data reads (query API) | **Yes** (after this feature) | `quickbooks.api.intuit.com`, sandbox equivalents via `IntuitApiBaseUrl` |
| `QboOAuth` | Token exchange, refresh, revocation | **No** | `oauth.platform.intuit.com`, `developer.api.intuit.com` |

### Endpoint Classification

| Class | Host examples | Mutating verbs on `QboApi` | Mutating verbs on `QboOAuth` |
|-------|---------------|---------------------------|------------------------------|
| Accounting API | `quickbooks.api.intuit.com` | **Blocked** | N/A (not routed here) |
| OAuth token | `oauth.platform.intuit.com` | N/A | **Permitted** (required by OAuth2) |
| OAuth revoke | `developer.api.intuit.com` | N/A | **Permitted** |
| Non-Intuit | Any other host | Pass through (not evaluated as Intuit) | Pass through |

### Configuration (`QboSyncOptions`)

| Property | Default | Role in guard |
|----------|---------|---------------|
| `IntuitApiBaseUrl` | `https://quickbooks.api.intuit.com/v3/company` | Prefix match for accounting endpoint detection |
| `IntuitTokenUrl` | `https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer` | Used by `QboOAuth` client only |
| `IntuitRevokeUrl` | `https://developer.api.intuit.com/v2/oauth2/tokens/revoke` | Used by `QboOAuth` client only |

### Integration Mode (`PreviewOptions`)

| Flag | Effect on guard |
|------|-----------------|
| `UseFakeQboConnector = true` | Fake connector + egress handler + seeding egress API (unchanged preview behavior) |
| `UseFakeQboConnector = false` | Real connector + **egress handler still active** (new production behavior) |

## State Transitions

Not applicable — the guard is stateless per request. No persisted state transitions.

## Validation Rules

1. **VR-001**: Any mutating request on `QboApi` whose URI contains `intuit.com` or starts with `IntuitApiBaseUrl` MUST be rejected before network I/O.
2. **VR-002**: Read-only (`GET`) accounting requests on `QboApi` MUST reach the inner handler.
3. **VR-003**: All OAuth lifecycle POSTs on `QboOAuth` MUST NOT pass through the egress write guard.
4. **VR-004**: Blocked requests MUST NOT log authorization headers, tokens, secrets, or request bodies (Constitution VIII).
5. **VR-005**: Handler MUST be registered when `UseFakeQboConnector=false` (production configuration).

## Relationships

```text
Program.cs
  ├── HttpClient "QboApi" ──► QboEgressRecordingHandler ──► QboTransactionClient (query reads)
  └── HttpClient "QboOAuth" ──► (no handler) ──► QboTokenService (token/revoke)

Preview-only:
  TestSeedingController.GetQboEgress() ──► QboEgressRecordingHandler.GetRecords()
```

## Out of Scope

- Database tables, migrations, EF entities
- Local ledger field write rules (covered by specs 045, 041)
- QuickBooks sync recompute immutability (spec 045)
