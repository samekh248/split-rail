# Quickstart & Validation: Complete Organization & Venue CRUD

Runnable validation guide proving the new organization list/update/delete and venue update endpoints work end-to-end with consistent error contracts and tenant isolation. Implementation details live in `tasks.md` (Phase 2) and the source.

## Prerequisites

- .NET 9 SDK; Node 20+ with the `apps/web` toolchain installed.
- Docker running (Testcontainers spins up `postgres:16` for integration tests).
- Repo restored/built: `dotnet restore` and `dotnet build` from repo root; `npm install` in `apps/web`.

## Contract regeneration workflow (do this after adding/altering DTOs)

1. Add `UpdateOrganizationRequest` and `UpdateVenueRequest` to the C# DTOs and the new endpoints.
2. Run the API locally so swagger is served:

```bash
dotnet run --project apps/api
```

3. In another shell, regenerate the frontend contract types:

```bash
cd apps/web
npm run gen:api    # reads http://localhost:5000/swagger/v1/swagger.json → src/types/generated-api.ts
```

4. Confirm `OrganizationResponse`, `UpdateOrganizationRequest`, `VenueResponse`, `UpdateVenueRequest` appear in `apps/web/src/types/generated-api.ts`. Do not hand-edit (Constitution VI).

## Apply the migration

```bash
dotnet ef migrations add AddOrganizationArchivedAt --project apps/api
dotnet ef database update --project apps/api    # or applied automatically by tests via Database.MigrateAsync()
```

## Backend validation (xUnit + Testcontainers)

Run the integration suite:

```bash
dotnet test apps/api.tests
```

Key scenarios to confirm green (see `contracts/organizations.md` and `contracts/venues.md` for full matrices):

- **Org update**: admin renames own org → 200 updated; non-admin → 403; empty/whitespace name → 400; >200 chars → 400; cross-tenant/unknown id → 404; same-name no-op → 200.
- **Org list**: member sees only their active orgs; non-member orgs absent; no membership → 200 `[]`; archived org excluded.
- **Org delete**: empty org by admin → 204 and absent from `GET /api/organizations` and `GET /api/organizations/current` afterward (records retained); org with a venue or financial data → 409; non-admin → 403; cross-tenant/already-archived → 404.
- **Venue update**: permitted in-scope user → 200 updated; missing permission → 403; out-of-scope venue → 404; cross-tenant/unknown → 404; invalid name → 400.
- **Consistency**: every failure returns the shared `ErrorResponse` shape with the expected `type` and HTTP status.

Reuse existing helpers in `IntegrationTestBase`: `SetupAdminClientAsync`, `CreateScopedVenueUserAsync`, `SetupFinancialAdminAsync`, `CreateEventViaApiAsync`/`SeedLineItemDirectAsync` (to make an org non-empty for the delete-block test).

## Frontend validation (Vitest + RTL)

```bash
cd apps/web
npm run test           # or: npm run test:coverage
```

Confirm the new hooks (`useOrganizations`, `useUpdateOrganization`, `useDeleteOrganization`, `useUpdateVenue`) resolve on success and surface errors via the shared `apiFetch` error mapping (stubbed `fetch`).

## Coverage gate (Constitution III)

- Backend: `dotnet test apps/api.tests` with coverage ≥ 80.0% line/branch.
- Frontend: `npm run test:coverage` in `apps/web` with thresholds ≥ 80%.
- CI enforces both independently; missing/unparseable coverage reports are treated as failing.

## Manual smoke (optional, with API running)

```bash
# List orgs the user belongs to
curl -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/organizations

# Rename an org (admin)
curl -X PUT -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"Renamed Org"}' http://localhost:5000/api/organizations/$ORG_ID

# Archive an empty org (admin) → 204
curl -X DELETE -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/organizations/$ORG_ID

# Rename a venue (manage permission + in scope)
curl -X PUT -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"Renamed Venue"}' http://localhost:5000/api/venues/$VENUE_ID
```

Expected: 200/204 on success; 400/403/404/409 with the shared error envelope on the failure paths above.
