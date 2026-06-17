# Phase 0 Research: Team Invitation & User Management UI

**Feature**: `016-team-invitation-ui` | **Date**: 2026-06-17

Resolves technical unknowns for the plan. Clarifications from `/speckit-clarify` (Settings hub, Team sub-page, modal edit, removal confirm, Settings visible to all) are incorporated.

## D1. Primarily frontend; minimal backend for invitation scope display

- **Decision**: Implement UI against existing user/invitation/role endpoints. **Extend `InvitationResponse`** with `VenueScopeDto[] venueScopes` populated in `InvitationService` Send/List/Resend projections.
- **Rationale**: Spec FR-005 and User Story 1 require pending invitations show scope summary. Current DTO returns only `roleName` — insufficient for "scoped to one venue" display. Small DTO + projection change; no schema migration (`invitation_venue_scopes` already exists).
- **Alternatives considered**:
  - *Frontend-only, show role without scope on invitations*: rejected — fails acceptance scenario 3 in User Story 1.
  - *Separate GET invitation detail endpoint*: rejected — unnecessary API surface for list data already in DB.

## D2. Extend History API routing (`appRoute.ts`)

- **Decision**: Extend 014 `dashboardRoute.ts` into `appRoute.ts` (or expand in place) with paths: `/settings`, `/settings/team`, `/settings/organization`, `/settings/integrations`, `/accept-invite`. Token via `URLSearchParams` on accept route. No `react-router`.
- **Rationale**: App has no router; 014 pattern proven for bookmarkable URLs and permission redirects. Settings hub needs multiple sub-paths per clarify B (full scaffold).
- **Alternatives considered**:
  - *In-app tab state only*: rejected — cannot satisfy direct Team URL block/redirect (FR-012).
  - *Adopt react-router now*: rejected — disproportionate migration for ~5 paths.

## D3. Permission gating: `useCanManageTeam()` → `canManagePermissions`

- **Decision**: `useCanManageTeam()` reads `useUserProfile().role.permissions.canManagePermissions`. Team page, Team nav link, and Team API hooks mount only when true. Settings landing + placeholders visible to all members (clarify Q3-B).
- **Rationale**: Matches `[RequirePermission(ManagePermissions)]` on invitation mutations and user PATCH/PUT/DELETE. Aligns with `useCanManageVenues()` from 014. Non-admins redirected from `/settings/team` → `/settings` without member data fetch.
- **Alternatives considered**:
  - *Hide entire Settings for non-admins*: rejected — contradicts clarify Q3-B.
  - *Read-only Team for non-admins*: rejected — contradicts clarify Q3-B and Story 5.

## D4. Settings hub scaffold with placeholder sections

- **Decision**: `SettingsLandingPage` shows nav cards: **Team** (functional, gated link), **Organization**, **Integrations** (placeholder pages with "Coming soon" copy, no actions). Shared `SettingsLayout` wraps sub-pages.
- **Rationale**: Clarify Q2-B (full hub scaffold). Placeholders satisfy FR-001b without implementing future settings features.
- **Alternatives considered**:
  - *Team-only, no landing*: rejected — contradicts full hub clarification.
  - *Functional Organization settings*: rejected — out of spec scope (011 covers API; UI deferred).

## D5. Member edit via modal; removal via confirm dialog

- **Decision**: `MemberEditModal` (role `<select>`, venue `<multi-select>` or checkbox list) with Save/Cancel. Save: sequential `PATCH /users/{id}/role` then `PUT /users/{id}/venue-scopes` when either changed. `RemoveMemberConfirm` uses `role="alertdialog"` pattern (similar to `EventDeleteConfirm`).
- **Rationale**: Clarify Q4-B (modal) and Q5-A (confirm removal). Modal keeps member + invitation lists visible; confirm prevents accidental removal.
- **Alternatives considered**:
  - *Inline table editing*: rejected — clarify chose modal.
  - *Single combined backend endpoint for role+scopes*: rejected — out of scope; existing PATCH + PUT sufficient.

## D6. Accept invitation route and auth integration

- **Decision**: Public path `/accept-invite?token=`. Unauthenticated users see combined flow: optional password fields (new account) or login link; submit `POST /api/invitations/accept` with `{ token, password? }`. On 200, persist tokens via `setTokens`, bootstrap profile, set phase `authenticated`, navigate `/`. Expired/invalid → static error panel (FR-014).
- **Rationale**: Backend accept is `[AllowAnonymous]` and creates account when password supplied. No separate "validate token" endpoint — 404 from accept doubles as invalid/expired check.
- **Alternatives considered**:
  - *Reuse RegisterPage with query param*: rejected — registration creates new org; accept maps to existing org.
  - *Email magic link auto-login without password for new users*: rejected — backend requires password for new accounts.

## D7. Invitation link convention

- **Decision**: Document and use `/accept-invite?token={rawToken}` as the SPA link format. Dev/quickstart: obtain raw token from API test helper or integration test log (email delivery not implemented in MVP).
- **Rationale**: `InvitationService.SendInvitationAsync` returns raw token to controller but does not send email in codebase; UI must define stable link shape for manual/E2E testing.
- **Alternatives considered**:
  - *Hash route `#/accept?token`*: rejected — pathname query is consistent with future email templates.

## D8. Logged-in user with mismatched email on accept link

- **Decision**: If authenticated user's email ≠ invitation email (detected after accept 409/validation or pre-check against profile), show message: sign out and continue with invited email; provide Sign out button. Do not auto-switch accounts.
- **Rationale**: Multi-org switching deferred; safest UX avoids attaching wrong user to org. Accept endpoint keys off invitation email, not JWT subject.
- **Alternatives considered**:
  - *Silent accept for any logged-in user*: rejected — security/UX risk if session is wrong account.
  - *Auto-logout on page load*: rejected — disruptive if user opened link while admin session active.

## D9. Venue scope UX: empty selection = all venues

- **Decision**: Multi-select with explicit "All venues" toggle (default on). When all selected or none selected, send `venueIds: []` or omit per `CreateInvitationRequest` contract. Display summary: `"All venues"` vs comma-separated venue names.
- **Rationale**: Backend treats empty/missing `venueIds` as org-wide access (001 contracts). Matches spec User Story 1 scenario 4.
- **Alternatives considered**:
  - *Require explicit all-venues checkbox only*: rejected — empty array is established API semantics.

## D10. Testing strategy (Constitution III)

- **Decision**: Vitest + RTL for: Settings link visibility (all vs admin), Team nav gating, Team URL redirect, invite validation, modal save/cancel, removal confirm cancel, accept page states, `useCanManageTeam`. Extend `InvitationsControllerTests` for venue scopes in response. Optional Playwright: admin invites → copy token link → new browser context accepts → dashboard. Frontend ≥80% via `vite.config.ts`; backend unchanged except DTO — extend existing integration suite.
- **Rationale**: Constitution III requires automated verification; multi-user invite flow qualifies for optional E2E.
- **Alternatives considered**:
  - *Frontend-only tests, skip backend test update*: rejected — DTO change needs integration assertion.

## D11. `GET /api/users` open to all authenticated members

- **Decision**: **No backend change** in this slice. Team UI only mounts `useOrgMembers()` when `canManageTeam`. Document as known API permissiveness; hardening GET with `RequirePermission` is a separate security hardening task.
- **Rationale**: Spec FR-012 is UI-focused (no Team URL / no controls). Adding permission to GET would be behavior change beyond SPLR-60 scope.
- **Alternatives considered**:
  - *Add RequirePermission to GET /api/users now*: rejected — expands scope; may break undocumented consumers.
