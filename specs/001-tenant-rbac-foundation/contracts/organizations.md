# API Contract: Organizations

**Base Path**: `/api/organizations`
**Auth**: All endpoints require `Authorization: Bearer <accessToken>`

## POST /api/organizations

Create a new Organization. The authenticated user becomes the Admin.

**Request Body**:
```json
{
  "name": "string (required, max 255)"
}
```

**Responses**:

| Status | Body | Description |
|--------|------|-------------|
| 201 | `{ "id": "uuid", "name": "string", "createdAt": "ISO 8601" }` | Org created, caller assigned Admin role, four default roles seeded |
| 400 | `{ "type": "validation", "errors": [...] }` | Validation failure |
| 401 | `{ "type": "authentication", "detail": "..." }` | Not authenticated |

---

## GET /api/organizations/current

Get the authenticated user's current Organization (derived from JWT `org_id` claim).

**Responses**:

| Status | Body | Description |
|--------|------|-------------|
| 200 | `{ "id": "uuid", "name": "string", "createdAt": "ISO 8601" }` | Current org |
| 401 | `{ "type": "authentication", "detail": "..." }` | Not authenticated |
| 403 | `{ "type": "authorization", "detail": "..." }` | User not a member of the org in the token |
