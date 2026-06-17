# Data Model: Venue Creation UI

**Feature**: `014-venue-creation-ui` | **Date**: 2026-06-17

No database schema changes. This document describes the client-side view model and the existing API entities consumed by the feature.

## API entities (existing, generated types)

### `CreateVenueRequest`

| Field | Type | Rules |
|-------|------|-------|
| `name` | `string` | Required; trimmed; 1–200 chars after trim; duplicates allowed within org |

Source: `apps/api/DTOs/Venues/VenueDtos.cs` → `generated-api.ts`

### `VenueResponse`

| Field | Type | Notes |
|-------|------|-------|
| `id` | `string` (uuid) | Assigned server-side |
| `name` | `string` | Normalized trimmed value |
| `organizationId` | `string` (uuid) | Caller’s active org |
| `createdAt` | `string` (ISO-8601) | Audit |

### `UserProfileResponse.role.permissions`

| Field | Type | UI use |
|-------|------|--------|
| `canManagePermissions` | `boolean` | Gates all create-venue affordances (FR-008) |

## Client view state

### Dashboard route

| Value | Path | Render |
|-------|------|--------|
| `workspace` | `/` | `DashboardHome` inside `VenueProvider` |
| `create-venue` | `/venues/new` | `CreateVenuePage` inside `VenueProvider` |

Synced via History API (`dashboardRoute.ts`).

### `VenueContext` (extended)

| Field | Type | Notes |
|-------|------|-------|
| `activeVenueId` | `string \| null` | sessionStorage-backed |
| `activateVenueId(id)` | method | Sets active id + storage without requiring id ∈ current `venues` (post-create) |

Existing fields unchanged (`venues`, `setActiveVenue`, `refetch`, …).

### Create form local state (`CreateVenuePage`)

| Field | Type | Validation |
|-------|------|------------|
| `name` | `string` | `validateVenueName` on blur/submit |
| `pending` | `boolean` | Disables submit (FR-009) |
| `fieldError` | `string?` | Inline under input |
| `submitError` | `string?` | Banner for network/403/5xx |

## State transitions

```text
[Dashboard, 0 venues, permitted]
  → click CTA or header "Add venue"
  → [CreateVenuePage]
  → submit valid name → POST 201
  → upsert cache, activateVenueId, navigate /
  → [Dashboard, ledger visible, new venue active]

[Dashboard, N venues, permitted]
  → header "Add venue"
  → [CreateVenuePage]
  → cancel → navigate / (prior active venue unchanged)

[Direct /venues/new, not permitted]
  → silent redirect /
```

## Query keys

| Key | Endpoint | Notes |
|-----|----------|-------|
| `['venues']` | `GET /api/venues` | `skipVenueContext: true` (009 D2) |
| `['user', 'me']` | `GET /users/me` | Permission flags |

Mutations invalidate `['venues']` on create success.
