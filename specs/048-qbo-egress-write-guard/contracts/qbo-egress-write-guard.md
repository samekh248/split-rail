# Contract: QBO Egress Write Guard (Always-On)

**Feature**: 048-qbo-egress-write-guard (SPLR-41)  
**Date**: 2026-06-21  
**Type**: Internal HTTP client policy (not a new public API)

## Purpose

Define the outbound traffic contract for the `QboApi` named `HttpClient`, ensuring the zero write infiltration guarantee (Constitution IV, PRD §6) is enforced at runtime in **all** environments including production.

## Scope

Applies to:
- `QboEgressRecordingHandler` (`DelegatingHandler` on `QboApi`)
- `Program.cs` `HttpClient` registration for `QboApi`

Does **not** apply to:
- `QboOAuth` named client (OAuth lifecycle — structurally excluded)
- Local database mutations (`financial_line_items`, sync recompute — specs 045/041)
- Preview-only `TestSeedingController.GetQboEgress()` inventory surface

## Verb matrix (`QboApi` channel)

| HTTP verb | Target: accounting host (`quickbooks.api.intuit.com` / `IntuitApiBaseUrl`) | Target: non-Intuit host |
|-----------|---------------------------------------------------------------------------|-------------------------|
| `GET` | **Permit** — proceed to inner handler | **Permit** |
| `POST` | **Reject** — `QboSyncException` / `zero_write_infiltration` | **Permit** |
| `PUT` | **Reject** | **Permit** |
| `DELETE` | **Reject** | **Permit** |
| `PATCH` | **Reject** | **Permit** |

## Registration contract

| Environment | `UseFakeQboConnector` | `QboApi` handler | `IQboTransactionClient` |
|-------------|-------------------------|------------------|-------------------------|
| Production | `false` | `QboEgressRecordingHandler` **required** | `QboTransactionClient` (real) |
| Preview / test | `true` | `QboEgressRecordingHandler` **required** | `FakeQboTransactionClient` |
| Integration test (production-like) | `false` | `QboEgressRecordingHandler` **required** | `QboTransactionClient` or stub handler |

**Invariant**: `QboEgressRecordingHandler` MUST be registered on `QboApi` regardless of `UseFakeQboConnector`.

## Rejection contract

When a mutating accounting request is intercepted:

1. **Before** `base.SendAsync` — no outbound network I/O occurs
2. Throw `QboSyncException` with message containing verb + URI and `ErrorCode = "zero_write_infiltration"`
3. Log at appropriate level: verb + host only (no auth headers, tokens, body)
4. Record egress entry in handler's in-memory bag (method, host, timestamp)

## OAuth exclusion contract

OAuth operations MUST use `CreateClient("QboOAuth")` exclusively:

| Operation | URL config key | Client |
|-----------|----------------|--------|
| Token exchange / refresh | `IntuitTokenUrl` | `QboOAuth` |
| Token revocation | `IntuitRevokeUrl` | `QboOAuth` |

These POST requests MUST NOT be routed through `QboApi` and therefore MUST NOT be subject to the accounting write guard.

## Exception mapping

| Exception | HTTP status (if surfaced via API) | Error code |
|-----------|-----------------------------------|------------|
| `QboSyncException` (`zero_write_infiltration`) | 502 Bad Gateway (`qbo_sync`) | `zero_write_infiltration` |

Existing `ExceptionHandlerMiddleware` mapping applies when sync paths surface the exception.

## Verification obligations

| ID | Test type | Assertion |
|----|-----------|-----------|
| V-001 | Unit | POST/PATCH to accounting URL → `QboSyncException` |
| V-002 | Unit | GET to accounting URL → inner handler invoked |
| V-003 | Integration | `UseFakeQboConnector=false` factory → POST blocked on `QboApi` |
| V-004 | Integration | `UseFakeQboConnector=false` factory → GET reaches stub handler |
| V-005 | E2E (existing) | Preview zero-write-infiltration suite still passes (regression) |

## Regression: Preview parity

- `FakeQboTransactionClient` performs no HTTP — egress guard remains passive for fake connector reads
- `GET /api/test-seeding/qbo-egress` (preview-gated) continues to expose recorded egress for E2E assertions
- No weakening of specs 005 zero-write-infiltration E2E contract
