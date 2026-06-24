# Implementation Plan: Explicit Audit Logging for Rejected Frozen-Event Mutations

**Branch**: `039-log-frozen-mutation-rejections` | **Date**: 2026-06-19 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/039-log-frozen-mutation-rejections/spec.md` (Linear SPLR-36)

## Summary

Close the **audit observability gap** in the settlement immutability guardrails: when a mutation against `events`, `event_artists`, or `financial_line_items` is rejected because the target event is `SETTLED` or `RECONCILED`, emit a structured warning-level audit log at the rejection point with event id, venue id, acting user id, event status, and attempted-operation label — without logging signatures, tokens, PII, or request payloads (Constitution §V/§VIII). Consolidate scattered inline status checks (`LedgerService.AssertNotSettledOrReconciled`, `EventService` update/delete guards, `LockBudgetAsync` guard, `AssertArtistEditable` for frozen states) behind a shared `FrozenEventMutationAuditor` service. Verify with **xUnit unit tests** (auditor log emission + sanitization) and **integration tests** (HTTP rejection paths on SETTLED and RECONCILED events with log capture). **Backend-only** — no API contract or frontend changes.

## Technical Context

**Language/Version**: C# / .NET 8.0 (`apps/api`)

**Primary Dependencies**: ASP.NET Core 8 structured logging (`ILogger<T>`), existing `LedgerService`, `EventService`, `ITenantContext`, `LedgerStateException`, `ExceptionHandlerMiddleware`

**Storage**: No schema changes — logs flow to existing GCP Cloud Logging via ASP.NET Core logging pipeline

**Testing**: xUnit unit tests for `FrozenEventMutationAuditor`; xUnit + WebApplicationFactory + Testcontainers integration tests with a test `ILoggerProvider` capturing log entries; extend existing `SettlementImmutabilityTests` patterns; ≥80.0% line/branch coverage on **backend touched files** (Constitution III); no frontend changes — frontend coverage gate N/A for this feature

**Target Platform**: GCP Cloud Run API + local Docker PostgreSQL

**Project Type**: Web application monorepo — this feature touches **backend observability layer only**

**Performance Goals**: Negligible — one structured log write per rejected mutation attempt (same order as existing exception throw)

**Constraints**: Constitution V — user-facing HTTP 400 responses and error messages unchanged; Constitution VIII — audit logs contain IDs and operation labels only (no signature payloads, tokens, secrets, cleartext PII, or financial field values); log at rejection point before exception propagates to middleware; sanctioned paths (settlement reversal, reconcile, successful PRE_SHOW mutations) must not emit false-positive audit entries; ≥80.0% backend coverage on touched files; missing/unparseable coverage reports treated as failing

**Scale/Scope**: 1 new service + operation enum/constants, refactors in `LedgerService` and `EventService`, DI registration, ~2 test files (~15 cases), 0 migrations, 0 API routes, 0 frontend files

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Relevance | Status |
|-----------|-----------|--------|
| I. Core Mathematical Axioms | No monetary math. | N/A |
| II. Multi-Tenant Isolation | **Yes** — audit entries include venue/event IDs resolved from tenant-scoped loads; no cross-org data in logs. | PASS |
| III. Engineering Rigor | **Yes** — unit + integration tests with log capture; ≥80% on touched backend files. | PASS (primary driver) |
| IV. QBO Integration | No QBO interaction. | N/A |
| V. Ledger State Machine | **Yes — primary** | PASS | Immutability rejections remain explicit 400-class errors; this feature adds the constitution-mandated explicit audit logging without weakening guards or adding drift paths. |
| VI. Polyglot Contract | No DTO or OpenAPI changes. | N/A |
| VII. EF Core Axioms | No new queries; existing eager-loaded mutation paths unchanged. | PASS |
| VIII. Exception Governance | **Yes — primary** | PASS | Structured logs sanitized per §VIII; rejection still throws granular `LedgerStateException`; no empty catches. |
| IX. UI Iconography | No UI changes. | N/A |

**Post-design re-check (Phase 1)**: [research.md](./research.md), [data-model.md](./data-model.md), and [contracts/frozen-event-mutation-audit-log.md](./contracts/frozen-event-mutation-audit-log.md) confirm centralized auditor placement, log schema, covered mutation paths, and test matrix. Gates remain PASS. No Complexity Tracking entries required.

## Project Structure

### Documentation (this feature)

```text
specs/039-log-frozen-mutation-rejections/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── frozen-event-mutation-audit-log.md  # Phase 1 output — structured log contract
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
apps/api/
├── Services/
│   ├── FrozenEventMutationAuditor.cs       # NEW — centralized log + throw for frozen rejections
│   ├── FrozenEventMutationOperation.cs     # NEW — stable operation label constants
│   ├── LedgerService.cs                    # MODIFY — replace static AssertNotSettledOrReconciled; inject auditor; cover LockBudget + AssertArtistEditable frozen paths
│   └── EventService.cs                     # MODIFY — replace inline settled/reconciled checks with auditor
├── Program.cs                              # MODIFY — register FrozenEventMutationAuditor (scoped)
└── Middleware/ExceptionHandlerMiddleware.cs # NO CHANGE — generic {ExceptionType} logging remains; audit entry emitted upstream

apps/api.tests/
├── Unit/
│   └── FrozenEventMutationAuditorTests.cs  # NEW — log emission, field presence, sanitization, throw behavior
├── Integration/
│   ├── FrozenEventMutationAuditTests.cs    # NEW — SETTLED + RECONCILED HTTP rejection paths with log capture
│   └── SettlementImmutabilityTests.cs      # UNCHANGED behavior — existing 400 assertions still pass
└── TestSupport/
    └── TestLogCollector.cs                 # NEW — ILoggerProvider capturing structured log entries for assertions
```

**Structure Decision**: Follow the backend-only pattern from spec 033. Centralize audit emission in one injectable service rather than enhancing `ExceptionHandlerMiddleware` (which lacks mutation-path context and would log all `LedgerStateException` types, including non-frozen state rules). `LedgerService.AssertNotSettledOrReconciled` becomes an instance method delegating to the auditor so all line-item paths share one implementation. `EventService` receives the same auditor via DI for event metadata update/delete guards.

## Complexity Tracking

No constitution violations to justify.
