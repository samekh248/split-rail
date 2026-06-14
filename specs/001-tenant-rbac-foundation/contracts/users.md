# API Contract: Users & Team Management

**Base Path**: `/api/users`
**Auth**: All endpoints require `Authorization: Bearer <accessToken>`
**Tenant Scope**: All operations are scoped to the authenticated user's Organization.

## GET /api/users

List all users in the authenticated user's Organization, including their role and venue scopes.

**Responses**:

| Status | Body | Description |
|--------|------|-------------|
| 200 | `[ { "id": "uuid", "email": "string", "role": { "id": "uuid", "roleName": "string" }, "venueScopes": [ { "venueId": "uuid", "venueName": "string" } ] }, ... ]` | Org members |
| 401 | `{ "type": "authentication", "detail": "..." }` | Not authenticated |

---

## GET /api/users/me

Get the authenticated user's profile, role, and venue scopes for the current Organization.

**Responses**:

| Status | Body | Description |
|--------|------|-------------|
| 200 | `{ "id": "uuid", "email": "string", "organization": { "id": "uuid", "name": "string" }, "role": { "id": "uuid", "roleName": "string", "permissions": { ... } }, "venueScopes": [ ... ] }` | Current user profile |
| 401 | `{ "type": "authentication", "detail": "..." }` | Not authenticated |

---

## PATCH /api/users/{userId}/role

Change a user's role within the Organization.

**Required Permission**: `can_manage_permissions`

**Request Body**:
```json
{
  "roleId": "uuid (required)"
}
```

**Responses**:

| Status | Body | Description |
|--------|------|-------------|
| 200 | `{ "userId": "uuid", "roleId": "uuid", "roleName": "string" }` | Role updated |
| 400 | `{ "type": "validation", "detail": "Cannot remove the last Admin" }` | Last admin protection (FR-013) |
| 401 | `{ "type": "authentication", "detail": "..." }` | Not authenticated |
| 403 | `{ "type": "authorization", "detail": "..." }` | Missing permission |
| 404 | `{ "type": "not_found", "detail": "..." }` | User or role not found in org |

---

## PUT /api/users/{userId}/venue-scopes

Replace a user's venue scopes. Send an empty array to grant access to all venues.

**Required Permission**: `can_manage_permissions`

**Request Body**:
```json
{
  "venueIds": ["uuid", "uuid"]
}
```

**Responses**:

| Status | Body | Description |
|--------|------|-------------|
| 200 | `{ "userId": "uuid", "venueScopes": [ { "venueId": "uuid", "venueName": "string" } ] }` | Scopes replaced |
| 400 | `{ "type": "validation", "errors": [...] }` | Invalid venue IDs |
| 401 | `{ "type": "authentication", "detail": "..." }` | Not authenticated |
| 403 | `{ "type": "authorization", "detail": "..." }` | Missing permission |
| 404 | `{ "type": "not_found", "detail": "..." }` | User not found in org |

---

## DELETE /api/users/{userId}

Remove a user from the Organization. Does not delete their account — only the organization mapping and venue scopes.

**Required Permission**: `can_manage_permissions`

**Responses**:

| Status | Body | Description |
|--------|------|-------------|
| 204 | (empty) | User removed from org |
| 400 | `{ "type": "validation", "detail": "Cannot remove the last Admin" }` | Last admin protection (FR-013) |
| 401 | `{ "type": "authentication", "detail": "..." }` | Not authenticated |
| 403 | `{ "type": "authorization", "detail": "..." }` | Missing permission |
| 404 | `{ "type": "not_found", "detail": "..." }` | User not found in org |
