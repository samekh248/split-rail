# Persistence Schema Contract: User Event Pin

**Feature**: 029-user-event-pin-entity  
**Date**: 2026-06-18  
**Status**: Complete (2026-06-19 implementation)

Maps functional requirements to backend verification targets. No public API contract in this phase.

## Coverage matrix

| ID | Requirement | Verification target | Suite | Key assertions | Status |
|----|-------------|---------------------|-------|----------------|--------|
| P1 | FR-001 persist user–event pin | `UserEventPin` entity + DbContext | `Integration/UserEventPinPersistenceTests.cs` | Row exists after `SaveChanges` | ✓ |
| P2 | FR-002 `PinnedAt` timestamp | Same | same | `PinnedAt` not default/min value | ✓ |
| P3 | FR-003 uniqueness per user+event | DB constraint | same | second insert throws / fails | ✓ |
| P4 | FR-004 org-scoped visibility | Global query filter | same | Org B pin invisible in Org A context | ✓ |
| P5 | FR-005 cascade on event delete | FK cascade | same | Zero pins after `Events.Remove` | ✓ |
| P6 | FR-006 migration on fresh DB | `MigrateAsync` | `IntegrationTestBase` + same | App starts; table exists | ✓ |
| P7 | FR-006 migration on populated DB | Sequential migrate | same | Pre-existing rows intact | ✓ |
| P8 | FR-007 EF conventions | Model + `ConfigureUserEventPin` | code review + tests | snake_case table, composite PK, filter | ✓ |
| P9 | User delete cascade | FK cascade | same | Zero pins after user removed | ✓ |
| P10 | SC-005 ≥80% backend coverage | xUnit + coverage collector | `dotnet test --collect:"XPlat Code Coverage"` | Touched files ≥80% | ✓ |

## Contract rules

1. **Direct DbContext seeding**: Tests use scoped `ITenantContext.SetContext` + `ApplicationDbContext` (no HTTP endpoints).
2. **Tenant fidelity**: Cross-org tests create two orgs with separate users/events; never use `IgnoreQueryFilters` in positive-path assertions.
3. **Migration is source of truth**: Table shape must match [data-model.md](../data-model.md); hand-edited migration only for indexes if EF omits them.
4. **No API leakage**: Zero new controllers, routes, or DTOs in this feature branch.
5. **Downstream readiness**: SPLR-70 may `PUT/DELETE` against this table; SPLR-72 may `Include(e => e.UserEventPins)` — schema must not require revision.

## Definition of Done (verification)

- All matrix rows P1–P10 have at least one passing test or measurable coverage outcome.
- `dotnet ef migrations add AddUserEventPin` produces a migration that applies on Testcontainers PostgreSQL.
- `dotnet test` in `apps/api.tests` passes with no regressions.
