# API Contract: Roles & Permissions

**Base Path**: `/api/roles`
**Auth**: All endpoints require `Authorization: Bearer <accessToken>`
**Tenant Scope**: All operations are scoped to the authenticated user's Organization.

## GET /api/roles

List all roles in the authenticated user's Organization.

**Responses**:

| Status | Body | Description |
|--------|------|-------------|
| 200 | `[ { "id": "uuid", "roleName": "string", "canManagePermissions": bool, "canLockBudget": bool, "canEditSettlement": bool, "canSignSettlement": bool, "canTriggerQboSync": bool, "canMapQboAccounts": bool, "canViewFinancials": bool }, ... ]` | All org roles |
| 401 | `{ "type": "authentication", "detail": "..." }` | Not authenticated |

---

## PATCH /api/roles/{roleId}

Update permission flags on a role. Only toggleable boolean fields are accepted.

**Required Permission**: `can_manage_permissions`

**Request Body** (partial — only include fields to change):
```json
{
  "canManagePermissions": true,
  "canLockBudget": false
}
```

**Responses**:

| Status | Body | Description |
|--------|------|-------------|
| 200 | `{ "id": "uuid", "roleName": "string", ... }` | Updated role |
| 400 | `{ "type": "validation", "errors": [...] }` | Invalid field values |
| 401 | `{ "type": "authentication", "detail": "..." }` | Not authenticated |
| 403 | `{ "type": "authorization", "detail": "..." }` | Missing permission |
| 404 | `{ "type": "not_found", "detail": "..." }` | Role not found in org |
