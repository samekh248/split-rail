# API Contract: Regions

**Base Path**: `/api/regions`  
**Auth**: Bearer token required  
**Tenant Scope**: Organization from JWT `org_id`

## GET /api/regions

List regions for the authenticated organization.

| Status | Body |
|--------|------|
| 200 | `RegionResponse[]` |
| 401 | authentication error |

**RegionResponse**:
```json
{
  "id": "uuid",
  "name": "string",
  "notes": "string | null",
  "organizationId": "uuid",
  "createdAt": "ISO 8601",
  "venueCount": 0
}
```

## POST /api/regions

**Permission**: `ManagePermissions`

**Request**:
```json
{
  "name": "string (required, max 255, unique per org)",
  "notes": "string | null"
}
```

| Status | Body |
|--------|------|
| 201 | `RegionResponse` |
| 400 | validation error |
| 409 | duplicate name |

## PATCH /api/regions/{regionId}

**Permission**: `ManagePermissions`

**Request**: `{ "name": "string", "notes": "string | null" }`

| Status | Body |
|--------|------|
| 200 | `RegionResponse` |
| 404 | not found |

## DELETE /api/regions/{regionId}

**Permission**: `ManagePermissions`

| Status | Description |
|--------|-------------|
| 204 | Deleted |
| 409 | Region has assigned venues — must reassign first |
| 404 | Not found |

## Venue assignment (via existing venues API)

`CreateVenueRequest` / `UpdateVenueRequest` gain optional/required `regionId`:

```json
{
  "name": "string",
  "regionId": "uuid"
}
```

Required when organization has ≥1 region.
