# Quickstart Validation Guide: Top-Level Tenant Foundation & Granular RBAC

**Feature**: 001-tenant-rbac-foundation
**Date**: 2026-06-13

## Prerequisites

- .NET 8.0 SDK installed
- Docker running (for Testcontainers PostgreSQL)
- PostgreSQL instance available (local Docker or Cloud SQL proxy for dev)

## Setup

### 1. Start local PostgreSQL (if not using Cloud SQL proxy)

```bash
docker run -d --name split-rail-pg \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=devpass \
  -e POSTGRES_DB=split-rail-db \
  -p 5432:5432 \
  postgres:16
```

### 2. Configure local connection

Create/update `apps/api/.env`:
```
DB_PASSWORD=devpass
```

Verify `apps/api/appsettings.Development.json` has:
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=split-rail-db;Username=postgres;Include Error Detail=true"
  }
}
```

### 3. Apply migrations

```bash
cd apps/api
dotnet ef database update
```

### 4. Start the API

```bash
cd apps/api
dotnet run
```

The API starts at `https://localhost:5001` (or `http://localhost:5000`).

---

## Validation Scenarios

Each scenario proves a specific user story from the spec. Run them in order — later scenarios depend on data from earlier ones.

### Scenario 1: Registration + Organization Creation (User Story 1)

**Validates**: FR-001, FR-003, FR-007, SC-002, SC-007

1. **Register a new user**:
   ```bash
   curl -X POST http://localhost:5000/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@example.com","password":"SecurePass1"}'
   ```
   Expected: `201` with user ID and email.

2. **Login**:
   ```bash
   curl -X POST http://localhost:5000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@example.com","password":"SecurePass1"}'
   ```
   Expected: `200` with `accessToken`, `refreshToken`, `expiresIn: 3600`.

3. **Create an Organization** (use the access token from login):
   ```bash
   curl -X POST http://localhost:5000/api/organizations \
     -H "Authorization: Bearer <accessToken>" \
     -H "Content-Type: application/json" \
     -d '{"name":"Acme Venues"}'
   ```
   Expected: `201` with org ID. A new access token will be needed that includes the org_id claim (re-login after org creation).

4. **Verify default roles exist**:
   ```bash
   curl http://localhost:5000/api/roles \
     -H "Authorization: Bearer <accessToken>"
   ```
   Expected: `200` with exactly 4 roles (Admin, Venue Manager, Promoter, External Bookkeeper) matching the permission matrix in [data-model.md](data-model.md#default-seed-roles).

5. **Verify the creator has Admin role**:
   ```bash
   curl http://localhost:5000/api/users/me \
     -H "Authorization: Bearer <accessToken>"
   ```
   Expected: `200` with `role.roleName: "Admin"`.

### Scenario 2: Cross-Tenant Isolation (User Story 2)

**Validates**: FR-006, SC-001

1. **Register a second user and create a second Organization** (repeat Scenario 1 steps with `admin-b@example.com` and org name `Beta Events`).

2. **Attempt cross-tenant access** — use Org B's token to request Org A's venues:
   ```bash
   curl http://localhost:5000/api/venues \
     -H "Authorization: Bearer <orgB_accessToken>"
   ```
   Expected: `200` with empty list (Org B has no venues yet). Must NOT return any Org A data.

3. **Attempt direct ID access** — if you know an Org A venue ID, try to fetch it with Org B's token:
   ```bash
   curl http://localhost:5000/api/venues/<orgA_venueId> \
     -H "Authorization: Bearer <orgB_accessToken>"
   ```
   Expected: `404`. The venue must be invisible to Org B.

### Scenario 3: Authentication & Token Lifecycle (User Story 3)

**Validates**: FR-004, FR-005

1. **Access protected endpoint without token**:
   ```bash
   curl http://localhost:5000/api/users/me
   ```
   Expected: `401`.

2. **Access with expired token**: Use a token that has expired (wait 1 hour or use a test token with a past exp claim).
   Expected: `401`.

3. **Refresh the token**:
   ```bash
   curl -X POST http://localhost:5000/api/auth/refresh \
     -H "Content-Type: application/json" \
     -d '{"refreshToken":"<refreshToken>"}'
   ```
   Expected: `200` with new `accessToken` and `refreshToken`. Old refresh token is revoked.

4. **Use old refresh token again**:
   ```bash
   curl -X POST http://localhost:5000/api/auth/refresh \
     -H "Content-Type: application/json" \
     -d '{"refreshToken":"<old_refreshToken>"}'
   ```
   Expected: `401` — revoked token rejected.

### Scenario 4: Role-Based Permission Enforcement (User Story 4)

**Validates**: FR-008, FR-009

1. **Invite a user as Promoter** (see Scenario 6 below for invitation flow), then login as the Promoter.

2. **Attempt to manage permissions as Promoter**:
   ```bash
   curl -X PATCH http://localhost:5000/api/roles/<roleId> \
     -H "Authorization: Bearer <promoter_accessToken>" \
     -H "Content-Type: application/json" \
     -d '{"canLockBudget": true}'
   ```
   Expected: `403`.

3. **Toggle a permission as Admin**:
   ```bash
   curl -X PATCH http://localhost:5000/api/roles/<promoterRoleId> \
     -H "Authorization: Bearer <admin_accessToken>" \
     -H "Content-Type: application/json" \
     -d '{"canLockBudget": false}'
   ```
   Expected: `200` with updated role.

### Scenario 5: Venue Management & Venue Scoping (User Story 5)

**Validates**: FR-002, FR-010, FR-014

1. **Create venues**:
   ```bash
   curl -X POST http://localhost:5000/api/venues \
     -H "Authorization: Bearer <admin_accessToken>" \
     -H "Content-Type: application/json" \
     -d '{"name":"The Roxy"}'
   ```
   Repeat for "The Fillmore" and "Red Rocks". Expected: `201` each.

2. **Scope a user to one venue**:
   ```bash
   curl -X PUT http://localhost:5000/api/users/<userId>/venue-scopes \
     -H "Authorization: Bearer <admin_accessToken>" \
     -H "Content-Type: application/json" \
     -d '{"venueIds":["<roxyId>"]}'
   ```
   Expected: `200`.

3. **List venues as scoped user**:
   ```bash
   curl http://localhost:5000/api/venues \
     -H "Authorization: Bearer <scoped_user_accessToken>"
   ```
   Expected: `200` with only "The Roxy".

4. **Delete a venue**:
   ```bash
   curl -X DELETE http://localhost:5000/api/venues/<roxyId> \
     -H "Authorization: Bearer <admin_accessToken>"
   ```
   Expected: `204`. The scoped user's venue scope entry is cleaned up.

### Scenario 6: Team Invitation (User Story 6)

**Validates**: FR-011

1. **Send an invitation**:
   ```bash
   curl -X POST http://localhost:5000/api/invitations \
     -H "Authorization: Bearer <admin_accessToken>" \
     -H "Content-Type: application/json" \
     -d '{"email":"manager@example.com","roleId":"<venueManagerRoleId>","venueIds":["<venueId>"]}'
   ```
   Expected: `201` with invitation details.

2. **Accept the invitation** (the invitation email contains a token):
   ```bash
   curl -X POST http://localhost:5000/api/invitations/accept \
     -H "Content-Type: application/json" \
     -d '{"token":"<invitationToken>","password":"SecurePass1"}'
   ```
   Expected: `200` with access token for the new user in the org.

3. **Verify the new user's role and scope**:
   ```bash
   curl http://localhost:5000/api/users/me \
     -H "Authorization: Bearer <newUser_accessToken>"
   ```
   Expected: `200` with `role.roleName: "Venue Manager"` and the assigned venue scope.

4. **Non-admin tries to invite** (login as Promoter):
   ```bash
   curl -X POST http://localhost:5000/api/invitations \
     -H "Authorization: Bearer <promoter_accessToken>" \
     -H "Content-Type: application/json" \
     -d '{"email":"other@example.com","roleId":"<roleId>"}'
   ```
   Expected: `403`.

### Scenario 7: Last Admin Protection (Edge Case)

**Validates**: FR-013

1. **Attempt to change the only Admin to a different role**:
   ```bash
   curl -X PATCH http://localhost:5000/api/users/<adminUserId>/role \
     -H "Authorization: Bearer <admin_accessToken>" \
     -H "Content-Type: application/json" \
     -d '{"roleId":"<promoterRoleId>"}'
   ```
   Expected: `400` with "Cannot remove the last Admin".

2. **Attempt to remove the only Admin from the org**:
   ```bash
   curl -X DELETE http://localhost:5000/api/users/<adminUserId> \
     -H "Authorization: Bearer <admin_accessToken>"
   ```
   Expected: `400` with "Cannot remove the last Admin".

---

## Automated Test Run

```bash
cd apps/api.tests
dotnet test --verbosity normal
```

Expected: All tests pass. Coverage ≥ 80% (see [spec.md](spec.md) SC-008).

For coverage reporting:
```bash
dotnet test --collect:"XPlat Code Coverage" --results-directory ./coverage
```
