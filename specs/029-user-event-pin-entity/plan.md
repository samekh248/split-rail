# Implementation Plan: User Event Pin Persistence

**Branch**: `029-user-event-pin-entity` | **Date**: 2026-06-18 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/029-user-event-pin-entity/spec.md` (Linear SPLR-69)

## Summary

Add **server-side persistence** for per-user event pins so the dashboard can eventually sync pin state across devices. Deliver a `UserEventPin` entity (composite key `UserId` + `EventId`, `PinnedAt` timestamp), register it in `ApplicationDbContext` with an **organization-scoped global query filter** (`Event.Venue.OrganizationId`), generate an **EF Core migration**, and verify behavior with **xUnit integration tests** (migration apply, tenant isolation, cascade delete on event removal, user cascade). **Backend-only** — no API endpoints (SPLR-70), no dashboard service (SPLR-72), no frontend changes.

## Technical Context

**Language/Version**: C# / .NET 8.0 (`apps/api`)

**Primary Dependencies**: ASP.NET Core 8, Entity Framework Core 8, Npgsql.EntityFrameworkCore.PostgreSQL

**Storage**: PostgreSQL 16 — table `user_event_pins` via EF migration

**Testing**: xUnit + WebApplicationFactory + Testcontainers.PostgreSql (`apps/api.tests/Integration/`); direct `ApplicationDbContext` seeding pattern from `IntegrationTestBase`; ≥80.0% line/branch coverage on **backend** touched files (Constitution III); no frontend changes — frontend coverage gate N/A for this feature

**Target Platform**: GCP Cloud Run API + local Docker PostgreSQL

**Project Type**: Web application monorepo — this feature touches **backend data layer only**

**Performance Goals**: Pin table queries are low-volume bookmark lookups; no latency SLA beyond standard EF read patterns used by downstream dashboard aggregation

**Constraints**: Constitution II — tenant filter via `Event.Venue.OrganizationId`; Constitution VII — explicit FK configuration, no lazy loading; cascade delete on event FK per Linear issue; follow `UserVenueScope` composite-key conventions; ≥80.0% backend coverage on new model + DbContext + integration test file; missing/unparseable coverage reports treated as failing

**Scale/Scope**: 1 new entity, 1 migration, ~1 integration test file (~4–6 cases), minor navigation property additions on `User` and `Event`; 0 API controllers, 0 DTOs, 0 frontend files

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Relevance | Status |
|-----------|-----------|--------|
| I. Core Mathematical Axioms | No monetary fields on pin entity. | N/A |
| II. Multi-Tenant Isolation | **Yes** — global query filter on `UserEventPin` via `Event.Venue.OrganizationId`. | PASS |
| III. Engineering Rigor | **Yes** — integration tests via Testcontainers; ≥80% on touched backend files. | PASS (primary driver) |
| IV. QBO Integration | No QBO interaction. | N/A |
| V. Ledger State Machine | Pin records are not financial mutations; event delete cascade is allowed. | PASS |
| VI. Polyglot Contract | No new API surface; no TypeScript types required this phase. | N/A |
| VII. EF Core Axioms | **Yes** — explicit `ConfigureUserEventPin`, `.Include()` when downstream reads pins with event; `.AsNoTracking()` on read queries in future services. | PASS |
| VIII. Exception Governance | No new user-facing exception paths; DB constraint violations surface as EF exceptions in tests only. | PASS |
| IX. UI Iconography | No UI changes. | N/A |

**Post-design re-check (Phase 1)**: [research.md](./research.md) and [data-model.md](./data-model.md) confirm tenant filter path, cascade semantics, and test strategy. Gates remain PASS. No Complexity Tracking entries required.

## Project Structure

### Documentation (this feature)

```text
specs/029-user-event-pin-entity/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── persistence-schema.md  # FR → verification mapping
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
apps/api/
├── Models/
│   ├── UserEventPin.cs              # NEW
│   ├── User.cs                      # MODIFY — add EventPins navigation
│   └── Event.cs                     # MODIFY — add UserEventPins navigation
├── Data/
│   ├── ApplicationDbContext.cs      # MODIFY — DbSet, Configure, query filter
│   └── Migrations/
│       └── {timestamp}_AddUserEventPin.cs  # NEW (generated)

apps/api.tests/
└── Integration/
    └── UserEventPinPersistenceTests.cs  # NEW — migration, isolation, cascade
```

**Structure Decision**: Single vertical slice in `apps/api` data layer plus one integration test file. Mirrors `UserVenueScope` junction-entity pattern. No controllers or services until SPLR-70.

## Implementation Phases

### Phase A — Model & DbContext (blocking)

1. Add `UserEventPin.cs` per [data-model.md](./data-model.md).
2. Add `DbSet<UserEventPin>` and `ConfigureUserEventPin` in `ApplicationDbContext.cs`.
3. Add tenant query filter: `e.Event.Venue.OrganizationId == _tenantContext.OrganizationId`.
4. Add navigation collections on `User` (`EventPins`) and `Event` (`UserEventPins`).

### Phase B — Migration

```bash
cd apps/api
dotnet ef migrations add AddUserEventPin
dotnet ef database update   # local dev validation
```

Verify migration creates `user_event_pins` with composite PK, FKs, and indexes per research decisions.

### Phase C — Integration tests (Constitution III)

Add `UserEventPinPersistenceTests.cs` covering [contracts/persistence-schema.md](./contracts/persistence-schema.md):

1. Migration applies on fresh Testcontainers DB (inherited from `IntegrationTestBase.InitializeAsync`).
2. Seed pin via direct DbContext → query returns pin with `PinnedAt`.
3. Duplicate `(UserId, EventId)` insert fails (unique constraint).
4. Org A context cannot see Org B pins.
5. Event delete cascades pin removal.
6. User delete cascades pin removal (follows `UserVenueScope` pattern).

### Phase D — Coverage gate

```bash
cd apps/api.tests
dotnet test --collect:"XPlat Code Coverage"
```

Verify ≥80% on `UserEventPin`, `ApplicationDbContext` delta, and integration test file.

## Complexity Tracking

No constitution violations to justify.
