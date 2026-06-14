# API Contract: Venues

**Base Path**: `/api/venues`
**Auth**: All endpoints require `Authorization: Bearer <accessToken>`
**Tenant Scope**: All operations are scoped to the authenticated user's Organization via JWT `org_id` claim.

## GET /api/venues

List venues accessible to the authenticated user. Respects venue scoping rules (no scope rows = all venues; specific scope rows = only those venues).

**Responses**:

| Status | Body | Description |
|--------|------|-------------|
| 200 | `[ { "id": "uuid", "name": "string", "createdAt": "ISO 8601" }, ... ]` | Accessible venues |
| 401 | `{ "type": "authentication", "detail": "..." }` | Not authenticated |

---

## POST /api/venues

Create a new Venue under the authenticated user's Organization.

**Required Permission**: `can_manage_permissions` (Admin-only by default)

**Request Body**:
```json
{
  "name": "string (required, max 255)"
}
```

**Responses**:

| Status | Body | Description |
|--------|------|-------------|
| 201 | `{ "id": "uuid", "name": "string", "organizationId": "uuid", "createdAt": "ISO 8601" }` | Venue created |
| 400 | `{ "type": "validation", "errors": [...] }` | Validation failure |
| 401 | `{ "type": "authentication", "detail": "..." }` | Not authenticated |
| 403 | `{ "type": "authorization", "detail": "..." }` | Missing permission |

---

## GET /api/venues/{venueId}

Get a specific venue. Returns 404 if the venue belongs to a different organization or the user doesn't have venue scope access.

**Responses**:

| Status | Body | Description |
|--------|------|-------------|
| 200 | `{ "id": "uuid", "name": "string", "organizationId": "uuid", "createdAt": "ISO 8601" }` | Venue details |
| 401 | `{ "type": "authentication", "detail": "..." }` | Not authenticated |
| 404 | `{ "type": "not_found", "detail": "..." }` | Not found or not accessible |

---

## DELETE /api/venues/{venueId}

Delete a venue. Cascading delete removes associated user venue scopes (per FR-014).

**Required Permission**: `can_manage_permissions` (Admin-only by default)

**Responses**:

| Status | Body | Description |
|--------|------|-------------|
| 204 | (empty) | Venue deleted, venue scopes cleaned up |
| 401 | `{ "type": "authentication", "detail": "..." }` | Not authenticated |
| 403 | `{ "type": "authorization", "detail": "..." }` | Missing permission |
| 404 | `{ "type": "not_found", "detail": "..." }` | Not found |
