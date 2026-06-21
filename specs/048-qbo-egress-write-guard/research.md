# Research: Always-On QuickBooks Egress Write Guard

**Feature**: 048-qbo-egress-write-guard (SPLR-41)  
**Date**: 2026-06-21

## R1: Production gap — handler registration scope

**Decision**: Register `QboEgressRecordingHandler` on the `QboApi` named `HttpClient` in **all** environments; remove the `Preview:UseFakeQboConnector` conditional that currently gates handler attachment in `Program.cs`.

**Rationale**: The handler implementation already blocks POST/PUT/DELETE/PATCH toward Intuit accounting hosts and throws `QboSyncException` with error code `zero_write_infiltration`. The gap is purely DI wiring — production registers `QboApi` without the `DelegatingHandler`, so mutating calls could reach Intuit if introduced by a future code defect.

**Alternatives considered**:

| Alternative | Rejected because |
|-------------|------------------|
| New production-only handler class | Duplicates tested logic; violates spec assumption to extend existing preview guard |
| Static analysis / CI grep for mutating QBO calls | Catches source patterns but not runtime; does not satisfy SPLR-41 acceptance criteria |
| Middleware on outgoing requests globally | Over-broad; OAuth and unrelated HTTP clients would need exclusion logic |

## R2: OAuth allowlist strategy

**Decision**: Rely on **structural client separation** — OAuth token exchange, refresh, and revocation use the `QboOAuth` named client (no egress handler); accounting reads use `QboApi` (with handler). No host allowlist logic is required inside the handler for OAuth endpoints.

**Rationale**: `QboTokenService` exclusively calls `_httpClientFactory.CreateClient("QboOAuth")` for `IntuitTokenUrl` and `IntuitRevokeUrl`. `QboTransactionClient` uses `CreateClient("QboApi")` for query-only accounting fetches. The two channels are already isolated at the factory level.

**Alternatives considered**:

| Alternative | Rejected because |
|-------------|------------------|
| Host allowlist inside handler (oauth.platform.intuit.com, developer.api.intuit.com) | Unnecessary on `QboApi` channel; OAuth never routes through it |
| Single client with per-request allowlist | Higher regression risk; breaks existing separation |

## R3: Accounting host matching precision

**Decision**: Keep existing `IsMutatingIntuitRequest` logic (mutating verb + `intuit.com` host or `IntuitApiBaseUrl` prefix). Optionally document that `QboApi` must only target accounting hosts; no handler change required for MVP unless tests expose a false-positive on GET.

**Rationale**: Current implementation blocks PATCH (already in `MutatingVerbs`). GET accounting queries pass through. The broad `intuit.com` match on the accounting-only client is acceptable defense-in-depth — any accidental OAuth URL on `QboApi` would also be blocked, which is desirable.

**Alternatives considered**:

| Alternative | Rejected because |
|-------------|------------------|
| Restrict to `quickbooks.api.intuit.com` only | Sandbox URLs (`sandbox-quickbooks.api.intuit.com`) must remain covered; `IntuitApiBaseUrl` config already handles this |

## R4: Egress recording in production

**Decision**: Retain in-memory egress recording (`ConcurrentBag<QboEgressRecord>`) in production; keep `TestSeedingController.GetQboEgress()` preview-gated. Production guard enforcement does not expose egress inventory to operators.

**Rationale**: Recording is lightweight (method + host + timestamp). Preview E2E zero-write-infiltration suite continues to use the same handler instance. Production benefits from guard rejection without new observability surfaces.

**Alternatives considered**:

| Alternative | Rejected because |
|-------------|------------------|
| Disable recording outside preview | Would diverge handler behavior between environments |
| Cloud Logging export of every egress | Out of scope; spec requires log on **blocked** attempts only |

## R5: Verification strategy (FR-008–FR-010)

**Decision**: Add an integration test using `WebApplicationFactory<Program>` with `Preview:UseFakeQboConnector=false` and a stub `HttpMessageHandler` on `QboApi`. Assert: (1) POST to accounting URL throws `QboSyncException` / `zero_write_infiltration` before inner handler invoked; (2) GET proceeds to inner handler. Extend unit tests for PUT/DELETE if branch coverage gaps remain.

**Rationale**: SPLR-41 explicitly requires a test proving the guard is active **outside preview mode**. Unit tests alone instantiate the handler directly and do not prove `Program.cs` registration. Integration test closes the wiring gap.

**Alternatives considered**:

| Alternative | Rejected because |
|-------------|------------------|
| Reflection on handler chain | Fragile across `IHttpClientFactory` versions |
| Production smoke test only | Not CI-enforceable |

## R6: Retry policy interaction

**Decision**: No change. `QboSyncException` thrown in `SendAsync` before `base.SendAsync` — Polly retry policy on `QboApi` never receives a transient failure for blocked writes; the exception propagates immediately.

**Rationale**: Confirmed by handler flow: throw occurs pre-delegation. Meets edge case "retry policies must not re-attempt blocked mutating requests."
