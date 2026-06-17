# Contract: Team Invitation & User Management UI

**Feature**: `016-team-invitation-ui` | **Date**: 2026-06-17

UI and client-hook contracts. API types from `apps/web/src/types/generated-api.ts` only (Constitution VI). Backend REST contracts unchanged except extended `InvitationResponse` — see `specs/001-tenant-rbac-foundation/contracts/invitations.md` and `users.md`.

## `useCanManageTeam()` (NEW) — FR-012

```text
useCanManageTeam(): boolean
  = useUserProfile().data?.role?.permissions?.canManagePermissions ?? false
```

## `appRoute.ts` (NEW) — FR-001, FR-012, FR-013

| Function | Behavior |
|----------|----------|
| `getAppPath()` | Returns current path enum from `location.pathname` |
| `navigateToSettings()` | `pushState` → `/settings` |
| `navigateToTeamSettings()` | `pushState` → `/settings/team` |
| `navigateToDashboard()` | `pushState` → `/` |
| `getInviteTokenFromUrl()` | Parses `token` query param on `/accept-invite` |
| `useAppRoute()` | React hook subscribing to `popstate` |

Direct load of `/settings/team` when `!canManageTeam` → immediate `navigateToSettings()` (no member data rendered).

## `SettingsLayout` + `SettingsNav` (NEW) — FR-001, FR-001b

| Element | Visibility | Action |
|---------|------------|--------|
| Settings header / back to dashboard | always | `navigateToDashboard()` |
| Team nav item | `canManageTeam` | `navigateToTeamSettings()` |
| Organization nav item | always | placeholder route |
| Integrations nav item | always | placeholder route |

Placeholder pages: title + "Coming soon" body; no form controls (FR-001b).

## `DashboardHome` header (EXTEND) — FR-001

| Element | Visibility | Action |
|---------|------------|--------|
| Settings link/button | all authenticated users | `navigateToSettings()` |

## `TeamSettingsPage` (NEW) — FR-002–FR-011, FR-016, FR-017

**Guard**: redirect to `/settings` when profile loaded and `!canManageTeam`.

**Sections** (top to bottom):

1. `InviteMemberForm`
2. `InvitationList`
3. `MemberList`

### `InviteMemberForm`

| Field | Component | Validation |
|-------|-----------|------------|
| Email | `FormField` type `email` | `validateEmail` |
| Role | `<select>` from `useRoles()` | required |
| Venues | multi-select from `useVenues()` | optional; empty = all |

| Control | Behavior |
|---------|----------|
| Send invitation | `useCreateInvitation`; disabled while pending |
| Errors | inline field + banner for 409/400 |

### `InvitationList`

| Column | Source |
|--------|--------|
| Email | `invitation.email` |
| Role | `invitation.roleName` |
| Scope | `formatVenueScopeSummary(invitation.venueScopes)` |
| Status | `invitation.status` |
| Expires | formatted `expiresAt` |

| Row action | Condition | Hook |
|------------|-----------|------|
| Re-send | status ≠ accepted | `useResendInvitation` |
| Cancel | status ≠ accepted | `useCancelInvitation` |

### `MemberList`

| Column | Source |
|--------|--------|
| Email | `member.email` |
| Role | `member.role.roleName` |
| Scope | `formatVenueScopeSummary(member.venueScopes)` |

| Row action | Behavior |
|------------|----------|
| Edit | opens `MemberEditModal` |
| Remove | opens `RemoveMemberConfirm` |

## `MemberEditModal` (NEW) — FR-008, FR-009, FR-009a, FR-011

| Prop | Type |
|------|------|
| `member` | `UserListResponse` |
| `open` | boolean |
| `onClose` | () => void |
| `onSaved` | () => void |

**Layout**: modal dialog (`role="dialog"`, `aria-modal="true"`) — reuse welcome-modal backdrop/focus pattern.

**Fields**: role select, venue multi-select (same semantics as invite form).

| Control | Behavior |
|---------|----------|
| Save | PATCH role if changed; PUT venue-scopes if changed; close on success |
| Cancel | close without API (FR-009a) |

Last-admin 400 → inline error in modal, remain open.

## `RemoveMemberConfirm` (NEW) — FR-010, FR-010a

| Prop | Type |
|------|------|
| `member` | `UserListResponse` |
| `open` | boolean |
| `onConfirm` | async () => void |
| `onCancel` | () => void |

**Layout**: `role="alertdialog"` with explicit Confirm / Cancel.

Cancel → no DELETE (FR-010a).

## `AcceptInvitePage` (NEW) — FR-013–FR-015

| State | UI |
|-------|-----|
| missing token | link invalid message |
| form (new user) | password + confirm password, accept button |
| form (existing) | login fields or "Sign in to accept" |
| email mismatch | explanation + sign out button |
| invalid/expired | FR-014 copy |
| pending | disabled submit |

**Submit**: `POST /api/invitations/accept` with `{ token, password? }` via `skipAuthRecovery: true`.

**Success**: `setTokens` → fetch profile → `navigateToDashboard()`.

## API hooks summary

### `invitations.ts`

```text
useInvitations(): Query — GET /api/invitations (enabled: canManageTeam)
useCreateInvitation(): Mutation — POST /api/invitations
useResendInvitation(): Mutation — POST /api/invitations/{id}/resend
useCancelInvitation(): Mutation — DELETE /api/invitations/{id}
acceptInvitation(body): Promise<AcceptInvitationResponse> — POST /api/invitations/accept (anonymous)
```

### `users.ts`

```text
useOrgMembers(): Query — GET /api/users (enabled: canManageTeam)
useChangeMemberRole(): Mutation — PATCH /api/users/{id}/role
useUpdateMemberVenueScopes(): Mutation — PUT /api/users/{id}/venue-scopes
useRemoveMember(): Mutation — DELETE /api/users/{id}
```

### `roles.ts`

```text
useRoles(): Query — GET /api/roles (enabled: canManageTeam)
```

## Backend delta (DTO)

```csharp
// InvitationResponse — add field:
IReadOnlyList<VenueScopeDto> VenueScopes
```

Populated from `InvitationVenueScope` join on Send, List, Resend. Regenerate swagger after change.

## Accessibility

- Settings nav: semantic `<nav>` with `aria-current="page"` on active item.
- Modals: focus trap, Escape to cancel (edit modal and confirm dialog).
- Forms: labelled inputs, `aria-invalid`, errors `role="alert"`.
- Invitation/member tables: `<table>` or list with row actions as named buttons.

## Test contract highlights (Vitest)

| Test file | Covers |
|-----------|--------|
| `useCanManageTeam.test.ts` | permission hook |
| `TeamSettingsPage.test.tsx` | redirect, invite validation, list render |
| `MemberEditModal.test.tsx` | save, cancel, last-admin error |
| `RemoveMemberConfirm.test.tsx` | confirm vs cancel |
| `AcceptInvitePage.test.tsx` | invalid token, password validation, success navigation |
| `SettingsLandingPage.test.tsx` | Team link gated; placeholders visible |
| `DashboardHome.test.tsx` | Settings link for all users |

Coverage gate: ≥80% lines/branches on `apps/web` and `apps/api` per Constitution III.
