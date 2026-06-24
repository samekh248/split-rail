# Data Model: Team Invitation & User Management UI

**Feature**: `016-team-invitation-ui` | **Date**: 2026-06-17

No database schema changes. Describes API entities (existing + one DTO extension), client view state, and UI-derived summaries.

## API entities (generated types)

### `UserListResponse` (existing)

| Field | Type | UI use |
|-------|------|--------|
| `id` | uuid | Member row key; PATCH/PUT/DELETE target |
| `email` | string | Member list column |
| `role` | `RoleSummaryDto` | Display `roleName`; edit modal select |
| `venueScopes` | `VenueScopeDto[]` | Scope summary; edit modal multi-select |

Empty `venueScopes` array → display **"All venues"**.

### `InvitationResponse` (extended)

| Field | Type | UI use |
|-------|------|--------|
| `id` | uuid | Resend/cancel target |
| `email` | string | Invitation list column |
| `roleName` | string | Invitation list column |
| `status` | string | `pending` / `accepted` / `expired` badge |
| `expiresAt` | ISO-8601 | Countdown / date display |
| `createdAt` | ISO-8601 | Sort (newest first) |
| `venueScopes` | `VenueScopeDto[]` | **NEW** — scope summary on pending rows |

### `CreateInvitationRequest` (existing)

| Field | Type | Rules |
|-------|------|-------|
| `email` | string | Required; RFC5322; normalized server-side |
| `roleId` | uuid | Required; must belong to org |
| `venueIds` | uuid[]? | Optional; empty/omit → all venues |

### `RoleResponse` (existing)

| Field | Type | UI use |
|-------|------|--------|
| `id` | uuid | Select option value |
| `roleName` | string | Select option label |

Permission flags not edited in this feature.

### `AcceptInvitationRequest` / `AcceptInvitationResponse` (existing)

| Request field | Notes |
|---------------|-------|
| `token` | Raw token from `/accept-invite?token=` |
| `password` | Required when invitee has no account |

| Response field | Notes |
|----------------|-------|
| `accessToken`, `refreshToken`, `expiresIn` | Stored via `setTokens` |
| `organizationId` | Active org after accept |

### `ChangeRoleRequest` / `UpdateVenueScopesRequest` (existing)

Used by member edit modal save — separate calls.

## Client view state

### App routes (`appRoute.ts`)

| Route | Auth | Render | Guard |
|-------|------|--------|-------|
| `/` | authenticated | `DashboardHome` | — |
| `/venues/new` | authenticated | `CreateVenuePage` | `canManageVenues` → redirect `/` |
| `/settings` | authenticated | `SettingsLandingPage` | all members |
| `/settings/team` | authenticated | `TeamSettingsPage` | `canManageTeam` → redirect `/settings` |
| `/settings/organization` | authenticated | `PlaceholderSettingsPage` | all members |
| `/settings/integrations` | authenticated | `PlaceholderSettingsPage` | all members |
| `/accept-invite?token=` | public | `AcceptInvitePage` | token required |

### Settings hub navigation

| Nav item | Visible when | Target |
|----------|--------------|--------|
| Team | `canManageTeam` | `/settings/team` |
| Organization | always | `/settings/organization` (placeholder) |
| Integrations | always | `/settings/integrations` (placeholder) |

### Team page sections

| Section | Data source | Actions |
|---------|-------------|---------|
| Invite form | local form state + `useRoles()` + `useVenues()` | POST invitation |
| Pending invitations | `useInvitations()` | resend, cancel |
| Members | `useOrgMembers()` | edit modal, remove confirm |

### Member edit modal local state

| Field | Type | Notes |
|-------|------|-------|
| `roleId` | string | Initialized from member |
| `venueIds` | string[] | Empty → all venues on save |
| `pending` | boolean | Disables Save |
| `error` | string? | Last-admin / validation / network |

### Accept invite page local state

| Field | Type | Notes |
|-------|------|-------|
| `token` | string | From query param |
| `password` | string | New-user path only |
| `phase` | `form` \| `success` \| `invalid` \| `mismatch` | UI state machine |

## Derived display helpers

### `formatVenueScopeSummary(scopes: VenueScopeDto[] | null | undefined): string`

- `null`, `undefined`, or `length === 0` → `"All venues"`
- else → join `venueName` with comma (truncate with "+N more" if &gt;3)

### Invitation status actions

| Status | Resend | Cancel |
|--------|--------|--------|
| `pending` | enabled | enabled |
| `expired` | enabled | enabled if row still listed |
| `accepted` | disabled | disabled |

## State transitions

```text
[Dashboard] → click Settings → [Settings landing]
  → Team (if permitted) → [Team page: invite / lists / modals]
  → Organization|Integrations → [Placeholder page]

[Team page] → Edit member → [Modal open]
  → Save → PATCH role + PUT scopes → close → refresh lists
  → Cancel → close (no API)

[Team page] → Remove → [Confirm dialog]
  → Confirm → DELETE → refresh list
  → Cancel → no API

[Email link /accept-invite?token=]
  → valid + new user → password form → accept → tokens → [Dashboard]
  → valid + existing → login → accept → [Dashboard]
  → invalid/expired → error panel
  → wrong logged-in email → mismatch message + sign out

[/settings/team, !canManageTeam] → redirect /settings (no member fetch)
```

## Query keys

| Key | Endpoint |
|-----|----------|
| `['roles']` | GET /api/roles |
| `['users']` | GET /api/users |
| `['invitations']` | GET /api/invitations |
| `['venues']` | GET /api/venues (existing, for scope picker) |

Mutations invalidate `['users']` and/or `['invitations']` as appropriate.
