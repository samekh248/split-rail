# Implementation Plan: Event Pin API Endpoints

**Branch**: `030-event-pin-endpoints` | **Date**: 2026-06-18 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/030-event-pin-endpoints/spec.md` (Linear SPLR-70)

## Summary

Expose **write-only pin/unpin HTTP actions** on the existing venue-nested events route so authenticated users can persist personal event bookmarks server-side. Add `PUT` and `DELETE` handlers on `EventsController`, implement pin logic in a dedicated **`EventPinService`** (venue access + event ownership validation, idempotent insert/delete against `UserEventPin`), and verify with **xUnit integration tests** covering pin lifecycle, authorization, tenant isolation, venue scoping, per-user isolation, and event-delete cascade. **Backend-only** — no frontend changes, no dashboard aggregation (SPLR-72), no new migration (entity exists from SPLR-69).

## Technical Context

**Language/Version**: C# / .NET 8.0 (`apps/api`)

**Primary Dependencies**: ASP.NET Core 8, Entity Framework Core 8, existing `UserEventPin` entity and `ApplicationDbContext` configuration from spec 029

**Storage**: PostgreSQL 16 — `user_event_pins` table (already migrated)

**Testing**: xUnit + WebApplicationFactory + Testcontainers.PostgreSql (`apps/api.tests/Integration/`); new `EventPinControllerTests.cs`; ≥80.0% line/branch coverage on **backend** touched files (Constitution III); no frontend changes — frontend coverage gate N/A for this feature

**Target Platform**: GCP Cloud Run API + local Docker PostgreSQL

**Project Type**: Web application monorepo — this feature touches **backend API layer only**

**Performance Goals**: Pin/unpin are low-frequency bookmark writes; no latency SLA beyond standard EF insert/delete patterns used elsewhere on `EventsController`

**Constraints**: Constitution II — org scoping via existing `UserEventPin` global query filter + venue access via `VenueService.IsVenueAccessibleAsync`; Constitution V N/A (pin does not mutate `events`, `event_artists`, or `financial_line_items`); Constitution VI — no response body DTOs required (204 responses); ≥80.0% backend coverage on new service, controller actions, and integration tests; missing/unparseable coverage reports treated as failing

**Scale/Scope**: 1 new service, 2 controller actions, ~1 integration test file (~10–12 cases), 0 migrations, 0 DTOs, 0 frontend files

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Relevance | Status |
|-----------|-----------|--------|
| I. Core Mathematical Axioms | No monetary fields; pin is a bookmark. | N/A |
| II. Multi-Tenant Isolation | **Yes** — venue access check + event belongs to venue in org; existing `UserEventPin` query filter. | PASS |
| III. Engineering Rigor | **Yes** — integration tests via Testcontainers; ≥80% on touched backend files. | PASS (primary driver) |
| IV. QBO Integration | No QBO interaction. | N/A |
| V. Ledger State Machine | Pin/unpin does not alter ledger entities; no state guard required. | PASS |
| VI. Polyglot Contract | 204 No Content responses; no new TypeScript types until frontend consumes endpoints (SPLR-71). | PASS |
| VII. EF Core Axioms | Pin writes use tracked insert/delete; reads in tests use `.AsNoTracking()`. | PASS |
| VIII. Exception Governance | Use existing `NotFoundException`, `AuthenticationException`; no empty catch blocks. | PASS |
| IX. UI Iconography | No UI changes. | N/A |

**Post-design re-check (Phase 1)**: [research.md](./research.md), [data-model.md](./data-model.md), and [contracts/event-pin-api.md](./contracts/event-pin-api.md) confirm service placement, idempotent semantics, and test matrix. Gates remain PASS. No Complexity Tracking entries required.

## Project Structure

### Documentation (this feature)

```text
specs/030-event-pin-endpoints/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── event-pin-api.md # Phase 1 output
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
apps/api/
├── Controllers/
│   └── EventsController.cs          # MODIFY — add PUT/DELETE pin routes
├── Services/
│   └── EventPinService.cs           # NEW — PinEventAsync, UnpinEventAsync
└── Program.cs                         # MODIFY — register EventPinService

apps/api.tests/
└── Integration/
    └── EventPinControllerTests.cs   # NEW — pin lifecycle, auth, isolation
```

**Structure Decision**: Extend the existing `EventsController` route tree (`api/venues/{venueId}/events/{eventId}/pin`) rather than a standalone controller — matches Linear SPLR-70 and keeps venue/event nesting consistent with all other event operations. Pin business logic lives in `EventPinService` to keep `EventService` focused on event CRUD/lifecycle.

## Implementation Phases

### Phase A — EventPinService (blocking)

1. Add `EventPinService.cs` per [data-model.md](./data-model.md) and [research.md](./research.md).
2. `PinEventAsync(venueId, eventId)`:
   - Resolve authenticated `UserId` from `ITenantContext`.
   - Call `VenueService.IsVenueAccessibleAsync`.
   - Load event where `Id == eventId && VenueId == venueId` (404 if missing).
   - If pin exists for `(userId, eventId)` → return (idempotent).
   - Else insert `UserEventPin` with `PinnedAt = DateTimeOffset.UtcNow`.
3. `UnpinEventAsync(venueId, eventId)`:
   - Same venue/event validation.
   - Delete pin row for `(userId, eventId)` if exists; no-op if absent.
4. Register `EventPinService` in `Program.cs`.

### Phase B — Controller endpoints

Add to `EventsController.cs` per [contracts/event-pin-api.md](./contracts/event-pin-api.md):

```csharp
[HttpPut("{eventId:guid}/pin")]
[RequirePermission(PermissionNames.ViewFinancials)]
public async Task<IActionResult> Pin(...)

[HttpDelete("{eventId:guid}/pin")]
[RequirePermission(PermissionNames.ViewFinancials)]
public async Task<IActionResult> Unpin(...)
```

Both return `NoContent()` (204) on success.

### Phase C — Integration tests (Constitution III)

Add `EventPinControllerTests.cs` covering [contracts/event-pin-api.md](./contracts/event-pin-api.md):

1. Pin → verify row exists via scoped DbContext query.
2. Pin → unpin → verify row removed.
3. Re-pin idempotent (single row, no duplicate).
4. Unpin when not pinned → 204.
5. User A pin invisible to User B queries (per-user isolation).
6. Cross-org pin attempt → 404.
7. Scoped user cannot pin event in out-of-scope venue → 404.
8. Wrong `venueId` for existing event → 404.
9. Missing `can_view_financials` → 403.
10. Event delete cascades pin removal (API pin then delete event via existing DELETE).
11. Two users pin same event; one unpins; other's pin remains.

### Phase D — Coverage gate

```bash
cd apps/api.tests
dotnet test --filter "FullyQualifiedName~EventPinControllerTests"
dotnet test --collect:"XPlat Code Coverage"
```

Verify ≥80% on `EventPinService`, `EventsController` pin actions, and integration test file.

## Complexity Tracking

No constitution violations to justify.
