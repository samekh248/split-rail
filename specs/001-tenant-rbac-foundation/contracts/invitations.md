# API Contract: Invitations

**Base Path**: `/api/invitations`
**Auth**: Authenticated endpoints require `Authorization: Bearer <accessToken>`. Acceptance endpoint is unauthenticated.
**Tenant Scope**: Authenticated operations are scoped to the authenticated user's Organization.

## POST /api/invitations

Send an invitation to join the Organization.

**Required Permission**: `can_manage_permissions`

**Request Body**:
```json
{
  "email": "string (required, RFC 5322)",
  "roleId": "uuid (required)",
  "venueIds": ["uuid"] 
}
```

`venueIds` is optional — omitting it or sending an empty array grants the invitee access to all venues.

**Responses**:

| Status | Body | Description |
|--------|------|-------------|
| 201 | `{ "id": "uuid", "email": "string", "roleName": "string", "status": "pending", "expiresAt": "ISO 8601" }` | Invitation sent |
| 400 | `{ "type": "validation", "errors": [...] }` | Invalid email, role, or venue IDs |
| 401 | `{ "type": "authentication", "detail": "..." }` | Not authenticated |
| 403 | `{ "type": "authorization", "detail": "..." }` | Missing permission |
| 409 | `{ "type": "conflict", "detail": "User is already a member of this organization" }` | Already a member |

---

## GET /api/invitations

List all invitations for the Organization (pending, accepted, expired).

**Required Permission**: `can_manage_permissions`

**Responses**:

| Status | Body | Description |
|--------|------|-------------|
| 200 | `[ { "id": "uuid", "email": "string", "roleName": "string", "status": "string", "expiresAt": "ISO 8601", "createdAt": "ISO 8601" }, ... ]` | All invitations |
| 401 | `{ "type": "authentication", "detail": "..." }` | Not authenticated |
| 403 | `{ "type": "authorization", "detail": "..." }` | Missing permission |

---

## POST /api/invitations/{invitationId}/resend

Re-send an expired or pending invitation. Generates a new token and resets expiration to 7 days.

**Required Permission**: `can_manage_permissions`

**Responses**:

| Status | Body | Description |
|--------|------|-------------|
| 200 | `{ "id": "uuid", "email": "string", "status": "pending", "expiresAt": "ISO 8601" }` | Invitation re-sent |
| 400 | `{ "type": "validation", "detail": "Cannot resend an accepted invitation" }` | Already accepted |
| 401 | `{ "type": "authentication", "detail": "..." }` | Not authenticated |
| 403 | `{ "type": "authorization", "detail": "..." }` | Missing permission |
| 404 | `{ "type": "not_found", "detail": "..." }` | Invitation not found |

---

## POST /api/invitations/accept

Accept an invitation. This is an unauthenticated endpoint. If the user doesn't have an account, they must register first. If they do, they are mapped to the org.

**Request Body**:
```json
{
  "token": "string (required, raw invitation token)",
  "password": "string (required only if user has no account — creates account)"
}
```

**Responses**:

| Status | Body | Description |
|--------|------|-------------|
| 200 | `{ "accessToken": "string", "refreshToken": "string", "expiresIn": 3600, "organizationId": "uuid" }` | Invitation accepted, user is now a member |
| 400 | `{ "type": "validation", "errors": [...] }` | Invalid token format or weak password |
| 404 | `{ "type": "not_found", "detail": "Invitation not found or expired" }` | Token invalid or expired |
| 409 | `{ "type": "conflict", "detail": "User is already a member of this organization" }` | Already a member |

---

## DELETE /api/invitations/{invitationId}

Cancel a pending invitation.

**Required Permission**: `can_manage_permissions`

**Responses**:

| Status | Body | Description |
|--------|------|-------------|
| 204 | (empty) | Invitation cancelled |
| 400 | `{ "type": "validation", "detail": "Cannot cancel an accepted invitation" }` | Already accepted |
| 401 | `{ "type": "authentication", "detail": "..." }` | Not authenticated |
| 403 | `{ "type": "authorization", "detail": "..." }` | Missing permission |
| 404 | `{ "type": "not_found", "detail": "..." }` | Not found |
