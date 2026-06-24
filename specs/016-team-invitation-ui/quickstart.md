# Quickstart & Validation: Team Invitation & User Management UI

**Feature**: `016-team-invitation-ui` | **Date**: 2026-06-17

Manual and automated validation for Settings hub, Team management, and accept-invitation flows. See [contracts/team-invitation-ui.md](./contracts/team-invitation-ui.md) and [data-model.md](./data-model.md).

## Prerequisites

- .NET 8 SDK, Node 20+, Docker (Testcontainers for backend suite if running full CI locally).
- Features 001 (RBAC + invitations API), 006 (auth forms), 009 (venues list), 014 (routing pattern) implemented.
- Admin user with `can_manage_permissions` (default Admin role).
- Second user with Promoter role (no manage permission) for gating checks.
- At least one venue in the org for scoped-invite scenarios.

```bash
# API
dotnet run --project apps/api/split-rail-api.csproj

# Web (separate terminal)
cd apps/web && npm run dev
```

## Scenario A — Settings hub and Team invite (User Story 1, P1)

1. Sign in as admin.
2. Click **Settings** in dashboard header.
3. Confirm landing shows Team, Organization, Integrations entries; Organization/Integrations show coming-soon.
4. Open **Team**.
5. Enter invitee email, select **Venue Manager**, select one venue, send.

**Expected**: Pending invitation appears with email, role, venue scope summary, status `pending`, expiry ~7 days out.

## Scenario B — Pending invitation management (User Story 2, P2)

1. On Team page, locate pending invitation.
2. Click **Re-send** — confirm success toast/banner; expiry refreshes.
3. Create another invite; click **Cancel** — row removed from active list.

**Expected**: Accepted invitations show no re-send/cancel actions.

## Scenario C — Member management (User Story 3, P3)

1. On Team page, click **Edit** on a non-admin member.
2. Change role and venue scopes; save.

**Expected**: Modal closes; list reflects changes.

3. Click **Remove** on a non-admin member; confirm dialog → confirm.

**Expected**: Member removed from list.

4. Attempt to demote/remove the sole admin.

**Expected**: Blocked with clear error; admin remains.

5. Open edit modal; cancel without saving.

**Expected**: No changes applied.

## Scenario D — Accept invitation (User Story 4, P4)

Obtain a raw invitation token (integration test log, API test, or dev helper after send).

1. Open `http://localhost:5173/accept-invite?token={rawToken}` in a fresh/incognito session.
2. Complete registration (password) or login as invited email; accept.

**Expected**: Land on dashboard with assigned role and venue scope reflected in venue switcher.

3. Open `/accept-invite?token=invalid`.

**Expected**: Clear invalid/expired message with guidance to contact administrator.

## Scenario E — Non-admin Settings access (User Story 5, P5)

1. Sign in as Promoter (no manage permission).
2. Open **Settings** from header.

**Expected**: Landing and placeholder pages available; **no Team** nav link.

3. Navigate directly to `http://localhost:5173/settings/team`.

**Expected**: Redirect to `/settings` without member/invitation data.

## Scenario F — Empty venue list at invite time

1. Admin in org with zero venues opens Team invite form.

**Expected**: Can still invite with all-venues scope; venue picker empty with explanatory copy.

## Automated tests

```bash
cd apps/web
npm run test -- tests/pages/TeamSettingsPage.test.tsx tests/pages/AcceptInvitePage.test.tsx tests/pages/SettingsLandingPage.test.tsx tests/hooks/useCanManageTeam.test.ts
npm run test:coverage
```

**Expected**: All tests pass; coverage thresholds ≥80% lines/branches/functions/statements.

Backend (invitation scope DTO + existing invitation tests):

```bash
dotnet test apps/api.tests/split-rail-api.tests.csproj --filter "FullyQualifiedName~InvitationsControllerTests"
```

Optional E2E:

```bash
cd tests/e2e && npx playwright test specs/team/invitation-flow.spec.ts
```

## Invitation link format

For manual testing and future email templates:

```text
{APP_ORIGIN}/accept-invite?token={rawToken}
```

Example: `http://localhost:5173/accept-invite?token=abc123...`
