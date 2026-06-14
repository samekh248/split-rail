# Data Model: Top-Level Tenant Foundation & Granular RBAC

**Feature**: 001-tenant-rbac-foundation
**Date**: 2026-06-13

## Entity Relationship Diagram

```
┌──────────────────────┐       ┌──────────────────────────┐
│    organizations     │       │          venues           │
├──────────────────────┤       ├──────────────────────────┤
│ id          UUID PK  │──┐    │ id               UUID PK │
│ name        VARCHAR  │  │    │ organization_id  UUID FK  │──┐
│ created_at  TIMESTZ  │  │    │ name             VARCHAR  │  │
└──────────────────────┘  │    │ created_at       TIMESTZ  │  │
                          │    └──────────────────────────┘  │
    ┌─────────────────────┤                                  │
    │                     │                                  │
    ▼                     ▼                                  │
┌──────────────────────────────┐                             │
│     organization_roles       │                             │
├──────────────────────────────┤                             │
│ id                   UUID PK │                             │
│ organization_id      UUID FK │                             │
│ role_name            VARCHAR │                             │
│ can_manage_permissions BOOL  │                             │
│ can_lock_budget        BOOL  │                             │
│ can_edit_settlement    BOOL  │                             │
│ can_sign_settlement    BOOL  │                             │
│ can_trigger_qbo_sync   BOOL  │                             │
│ can_map_qbo_accounts   BOOL  │                             │
│ can_view_financials    BOOL  │                             │
└──────────────┬───────────────┘                             │
               │                                             │
               │         ┌──────────────────┐                │
               │         │      users       │                │
               │         ├──────────────────┤                │
               │         │ id        UUID PK│                │
               │         │ email     VARCHAR│                │
               │         │ pwd_hash  TEXT   │                │
               │         │ created_at TIMESTZ│               │
               │         └──────┬───────────┘                │
               │                │                            │
               ▼                ▼                            │
┌──────────────────────────────────────┐                     │
│    user_organization_mappings        │                     │
├──────────────────────────────────────┤                     │
│ user_id          UUID FK (PK)        │                     │
│ organization_id  UUID FK (PK)        │                     │
│ role_id          UUID FK             │                     │
└──────────────────────────────────────┘                     │
                                                             │
               ┌────────────────────────────┐                │
               │    user_venue_scopes       │                │
               ├────────────────────────────┤                │
               │ user_id   UUID FK (PK)     │                │
               │ venue_id  UUID FK (PK)     │────────────────┘
               └────────────────────────────┘

┌──────────────────────────────────────┐
│          refresh_tokens              │  (NEW)
├──────────────────────────────────────┤
│ id              UUID PK              │
│ user_id         UUID FK              │
│ token_hash      VARCHAR(64)          │
│ expires_at      TIMESTAMPTZ          │
│ is_revoked      BOOL                 │
│ created_at      TIMESTAMPTZ          │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│           invitations                │  (NEW)
├──────────────────────────────────────┤
│ id              UUID PK              │
│ organization_id UUID FK              │
│ email           VARCHAR(255)         │
│ role_id         UUID FK              │
│ token_hash      VARCHAR(64)          │
│ status          VARCHAR(20)          │
│ expires_at      TIMESTAMPTZ          │
│ created_at      TIMESTAMPTZ          │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│     invitation_venue_scopes          │  (NEW)
├──────────────────────────────────────┤
│ invitation_id   UUID FK (PK)         │
│ venue_id        UUID FK (PK)         │
└──────────────────────────────────────┘
```

## Entities

### Organization (Existing)

The top-level tenant boundary. All data belongs to exactly one Organization.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK, default `gen_random_uuid()` | |
| name | VARCHAR(255) | NOT NULL | |
| created_at | TIMESTAMPTZ | NOT NULL, default `NOW()` | |

**Relationships**: Owns Venues (1:N), OrganizationRoles (1:N), UserOrganizationMappings (1:N), Invitations (1:N)

### Venue (Existing)

A physical or logical location operated by an Organization.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK, default `gen_random_uuid()` | |
| organization_id | UUID | FK → organizations.id, NOT NULL | CASCADE DELETE |
| name | VARCHAR(255) | NOT NULL | |
| created_at | TIMESTAMPTZ | NOT NULL, default `NOW()` | |

**Relationships**: Belongs to Organization (N:1), UserVenueScopes (1:N)
**Index**: `IX_venues_organization_id` on organization_id

### User (Existing)

An individual account identified by a unique email address.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK, default `gen_random_uuid()` | |
| email | VARCHAR(255) | NOT NULL, UNIQUE | |
| password_hash | TEXT | NOT NULL | BCrypt hash |
| created_at | TIMESTAMPTZ | NOT NULL, default `NOW()` | |

**Relationships**: UserOrganizationMappings (1:N), UserVenueScopes (1:N), RefreshTokens (1:N)
**Index**: `IX_users_email` UNIQUE on email

**Validation**: Email format (RFC 5322), password 8+ chars with at least one uppercase, one lowercase, one digit.

### OrganizationRole (Existing)

A named permission profile scoped to a single Organization. Boolean flags control access to specific features.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK, default `gen_random_uuid()` | |
| organization_id | UUID | FK → organizations.id, NOT NULL | CASCADE DELETE |
| role_name | VARCHAR(100) | NOT NULL | |
| can_manage_permissions | BOOL | NOT NULL, default false | |
| can_lock_budget | BOOL | NOT NULL, default false | |
| can_edit_settlement | BOOL | NOT NULL, default false | |
| can_sign_settlement | BOOL | NOT NULL, default false | |
| can_trigger_qbo_sync | BOOL | NOT NULL, default false | |
| can_map_qbo_accounts | BOOL | NOT NULL, default false | |
| can_view_financials | BOOL | NOT NULL, default true | |

**Relationships**: Belongs to Organization (N:1), UserOrganizationMappings (1:N)
**Index**: `unique_role_per_org` UNIQUE on (organization_id, role_name)

**Default Seed Roles** (provisioned on Organization creation):

| Role Name | manage_perms | lock_budget | edit_settle | sign_settle | qbo_sync | qbo_map | view_fin |
|---|---|---|---|---|---|---|---|
| Admin | true | true | true | true | true | true | true |
| Venue Manager | false | true | true | true | true | false | true |
| Promoter | false | true | false | false | false | false | true |
| External Bookkeeper | false | false | false | false | true | true | true |

### UserOrganizationMapping (Existing)

Links a User to an Organization with a specific Role. Composite PK ensures one role per org per user.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| user_id | UUID | PK, FK → users.id | CASCADE DELETE |
| organization_id | UUID | PK, FK → organizations.id | CASCADE DELETE |
| role_id | UUID | FK → organization_roles.id, NOT NULL | |

**Relationships**: User (N:1), Organization (N:1), OrganizationRole (N:1)

### UserVenueScope (Existing)

Optionally restricts a User's access to specific Venues. No rows = access to all venues in the organization.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| user_id | UUID | PK, FK → users.id | CASCADE DELETE |
| venue_id | UUID | PK, FK → venues.id | CASCADE DELETE |

**Relationships**: User (N:1), Venue (N:1)

### RefreshToken (New)

Stores hashed refresh tokens for the token refresh flow.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK, default `gen_random_uuid()` | |
| user_id | UUID | FK → users.id, NOT NULL | CASCADE DELETE |
| token_hash | VARCHAR(64) | NOT NULL | SHA-256 of raw token |
| expires_at | TIMESTAMPTZ | NOT NULL | 7-day window |
| is_revoked | BOOL | NOT NULL, default false | |
| created_at | TIMESTAMPTZ | NOT NULL, default `NOW()` | |

**Index**: `IX_refresh_tokens_user_id` on user_id
**Index**: `IX_refresh_tokens_token_hash` on token_hash

### Invitation (New)

Tracks pending, accepted, and expired team invitations.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK, default `gen_random_uuid()` | |
| organization_id | UUID | FK → organizations.id, NOT NULL | CASCADE DELETE |
| email | VARCHAR(255) | NOT NULL | Invitee email |
| role_id | UUID | FK → organization_roles.id, NOT NULL | Assigned role |
| token_hash | VARCHAR(64) | NOT NULL | SHA-256 of raw token |
| status | VARCHAR(20) | NOT NULL, default 'pending' | pending/accepted/expired |
| expires_at | TIMESTAMPTZ | NOT NULL | 7-day window |
| created_at | TIMESTAMPTZ | NOT NULL, default `NOW()` | |

**Index**: `IX_invitations_token_hash` on token_hash
**Index**: `IX_invitations_organization_id` on organization_id

### InvitationVenueScope (New)

Pre-assigns venue scopes to an invitation for application upon acceptance.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| invitation_id | UUID | PK, FK → invitations.id | CASCADE DELETE |
| venue_id | UUID | PK, FK → venues.id | CASCADE DELETE |

## State Transitions

### Invitation Status

```
[pending] ──accept──→ [accepted]
    │
    └──expire (cron/on-access)──→ [expired]
    │
    └──re-send──→ [pending] (new token, reset expiration)
```

## Validation Rules

- **Email**: Must be valid RFC 5322 format, max 255 chars, unique per user.
- **Password**: Minimum 8 characters, at least one uppercase, one lowercase, one digit.
- **Organization name**: Required, max 255 chars.
- **Venue name**: Required, max 255 chars, unique per organization (enforced at application layer).
- **Role name**: Required, max 100 chars, unique per organization (enforced at DB layer via unique index).
- **Invitation expiry**: 7 calendar days from creation.
- **Refresh token expiry**: 7 calendar days from issuance.
- **Access token expiry**: 1 hour from issuance.
