# Contract: Organizations API (list / update / delete)

Base route: `/api/organizations` — `[Authorize]` (authenticated). All responses use the shared error envelope (see Error Contract). The C# DTOs are the source of truth; the TypeScript types are generated into `apps/web/src/types/generated-api.ts`.

## Existing endpoints (unchanged, for reference)

- `POST /api/organizations` → 201 `OrganizationResponse` (create; now also enforces ≤200-char trimmed name).
- `GET /api/organizations/current` → 200 `OrganizationResponse` (active org; excludes archived).

## NEW: GET /api/organizations — list caller's organizations

Returns the organizations the authenticated user is a member of, excluding archived organizations.

- **Auth**: authenticated user (any role).
- **Request**: none.
- **Response 200**: `OrganizationResponse[]`

```json
[
  { "id": "3f...", "name": "Acme Venues", "createdAt": "2026-06-16T00:00:00+00:00" }
]
```

- Empty membership → `200 []` (never an error).
- Only the caller's memberships are returned; organizations the user does not belong to are never included; archived orgs excluded.

| Scenario | Result |
|----------|--------|
| Member of ≥1 active org | 200 with those orgs (FR-006, SC-003) |
| No active membership | 200 `[]` |
| Unauthenticated | 401 `authentication` |

## NEW: PUT /api/organizations/{organizationId} — update organization

Updates the organization's name. Admin-only.

- **Auth**: `[RequirePermission(can_manage_permissions)]`.
- **Path**: `organizationId: guid`.
- **Request body**: `UpdateOrganizationRequest`

```json
{ "name": "New Org Name" }
```

- **Response 200**: `OrganizationResponse` (updated entity, FR-014).

| Scenario | Result |
|----------|--------|
| Admin, valid name, own org | 200 updated `OrganizationResponse` (FR-001) |
| Same name as current (no-op) | 200 current details (idempotent, edge case) |
| Non-admin member | 403 `authorization` (FR-002) |
| Empty/whitespace name | 400 `validation` (FR-010) |
| Name > 200 chars | 400 `validation` (FR-010) |
| Different org B (cross-tenant id) | 404 `not_found` (FR-013, SC-005) |
| Unknown/archived org id | 404 `not_found` |
| Unauthenticated | 401 `authentication` |

Name is trimmed before persistence (FR-011). Concurrency: last-write-wins; no version/ETag, no conflict on concurrent updates (FR-012).

## NEW: DELETE /api/organizations/{organizationId} — soft-delete (archive)

Archives an empty organization (sets `archived_at`). Admin-only. Blocked when the org still owns venues or financial data.

- **Auth**: `[RequirePermission(can_manage_permissions)]`.
- **Path**: `organizationId: guid`.
- **Request**: none.
- **Response 204**: no content (archived; excluded from subsequent reads, records retained — FR-007).

| Scenario | Result |
|----------|--------|
| Admin, empty org | 204; org archived, absent from reads, records retained (FR-007, SC-004) |
| Admin, org owns venues or financial data | 409 `conflict`; org stays active (FR-008, SC-004) |
| Non-admin member | 403 `authorization` (FR-009) |
| Different org B (cross-tenant id) | 404 `not_found` (FR-013, SC-005) |
| Already-archived / unknown id | 404 `not_found` (edge case) |
| Unauthenticated | 401 `authentication` |

## Error Contract (shared `ErrorResponse`)

Produced by `ExceptionHandlerMiddleware`; identical shape across all tenant endpoints (FR-015, SC-006):

```json
{ "type": "validation", "detail": "Organization name is required.", "errors": null }
```

| Domain exception | HTTP | `type` |
|------------------|------|--------|
| (unauthenticated) | 401 | `authentication` |
| `AuthorizationException` / failed `RequirePermission` | 403 | `authorization` |
| `ValidationException` | 400 | `validation` |
| `NotFoundException` | 404 | `not_found` |
| `ConflictException` | 409 | `conflict` |

No cross-tenant existence is leaked: out-of-tenant ids resolve to `not_found` rather than `forbidden`.
