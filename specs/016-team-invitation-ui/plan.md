# Implementation Plan: Team Invitation & User Management UI

**Branch**: `016-team-invitation-ui` | **Date**: 2026-06-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/016-team-invitation-ui/spec.md` (Linear SPLR-60)

## Summary

Deliver a **Settings hub** (landing + placeholder sections) with a fully functional **Team** sub-page for users with `canManagePermissions`: invite by email, manage pending invitations, edit member role/venue scopes via modal, remove members with confirmation. Add an **accept-invitation** public route (`/accept-invite?token=`) for new and existing users. Primary work is **frontend** (`apps/web`); one **small backend DTO extension** adds `venueScopes` to `InvitationResponse` so pending invites show scope summaries per spec.

Grounding findings:

- **Invitation and user-management APIs exist** (`InvitationsController`, `UsersController`, `RolesController`) with integration tests from 001.
- **`InvitationResponse` lacks venue scopes** — list/create responses cannot satisfy FR-005 scope summary without extending the DTO + `InvitationService` projections.
- **`GET /api/users` has no `RequirePermission`** — all authenticated members can call it; UI gates Team page and hooks so non-admins never fetch member lists (defense in depth: do not mount Team queries when `!canManageTeam`).
- **No accept-invitation UI** — `POST /api/invitations/accept` is `[AllowAnonymous]`; tokens returned from send/resend are not emailed in dev (logged/stubbed); UI convention `/accept-invite?token=`.
- **Routing** extends 014 History API pattern (`dashboardRoute.ts` → `appRoute.ts`) — no `react-router`.
- **Modal pattern** reuses `WelcomeModal` backdrop/focus-trap semantics for member edit and removal confirm.

## Technical Context

**Language/Version**: C# / .NET 8 (`apps/api` minimal delta); TypeScript 5.7 + React 18 (`apps/web`)

**Primary Dependencies**: TanStack Query v5; existing `apiFetch` + auth token storage; `AuthLayout` + `FormField` (006); `WelcomeModal` dialog primitives; Vitest + RTL; xUnit + Testcontainers for invitation DTO extension

**Storage**: PostgreSQL (existing `invitations`, `user_organization_mappings`, `user_venue_scopes`); browser History API paths

**Testing**: Vitest + RTL for Settings shell, Team page, modals, accept flow, permission gates; extend xUnit `InvitationsControllerTests` for scope in list response; optional Playwright `tests/e2e/specs/team/invitation-flow.spec.ts`; ≥80.0% line/branch coverage enforced independently on backend and frontend (Constitution III)

**Target Platform**: Linux containerized API + Vite SPA (desktop-first dashboard)

**Project Type**: Web application (`apps/api` + `apps/web`)

**Performance Goals**: Single-member invite completable in &lt;2 minutes (SC-007); Settings/Team pages load member + invitation lists in one parallel fetch batch

**Constraints**: Constitution II — all mutations server-scoped to org; Constitution VI — types from `generated-api.ts` only after swagger regen; no role permission matrix editing; Settings visible to all org members but Team URL blocked for non-admins; ≥80.0% coverage both stacks; modal edit + confirm dialog per clarify session

**Scale/Scope**: ~20 new/modified frontend files; ~3 backend files + DTO; ~12 new/extended test files; routes `/settings`, `/settings/team`, `/settings/*` placeholders, `/accept-invite`

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Relevance | Status |
|-----------|-----------|--------|
| I. Core Mathematical Axioms | No monetary math. | N/A |
| II. Multi-Tenant Isolation | All APIs use tenant context + existing services; UI never calls Team endpoints when unauthorized. | PASS |
| III. Engineering Rigor | Vitest + xUnit; optional Playwright multi-user invite path; ≥80% coverage. | PASS (with tests) |
| IV. QBO Integration | No QBO interaction. | N/A |
| V. Ledger State Machine | No ledger mutations. | N/A |
| VI. Polyglot Contract | Extend `InvitationResponse` in C# DTO first; regen `generated-api.ts`; no hand-written TS API types. | PASS |
| VII. EF Core Axioms | Invitation list uses `.AsNoTracking().Include()` for venue scope names. | PASS |
| VIII. Exception Governance | Map API errors to inline/banner; no PII in client logs. | PASS |

**Post-design re-check**: PASS. Minimal DTO extension justified by spec FR-005; Complexity Tracking not required.

## Project Structure

### Documentation (this feature)

```text
specs/016-team-invitation-ui/
├── plan.md              # This file
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/
│   └── team-invitation-ui.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
apps/api/
├── DTOs/Invitations/
│   └── InvitationDtos.cs                # MODIFIED: venueScopes on InvitationResponse
└── Services/
    └── InvitationService.cs             # MODIFIED: project venue scopes in responses

apps/api.tests/Integration/
└── InvitationsControllerTests.cs          # EXTENDED: list/create scope assertions

apps/web/src/
├── api/
│   ├── invitations.ts                   # NEW: CRUD hooks + acceptInvitation
│   ├── users.ts                           # NEW: list, changeRole, updateScopes, remove
│   └── roles.ts                           # NEW: useRoles
├── auth/
│   ├── authApi.ts                         # MODIFIED: acceptInvitation + token bootstrap
│   ├── AuthContext.tsx                  # MODIFIED: acceptInvite flow helper
│   └── validation.ts                    # (reuse validateEmail, validatePassword)
├── hooks/
│   └── useCanManageTeam.ts                # NEW: canManagePermissions gate
├── lib/
│   └── appRoute.ts                        # NEW: extends dashboardRoute paths
├── components/settings/
│   ├── SettingsLayout.tsx                 # NEW: shell + sub-nav
│   ├── SettingsNav.tsx                    # NEW: Team link gated; placeholder links
│   └── PlaceholderSettingsPage.tsx        # NEW: coming-soon stub
├── components/team/
│   ├── InviteMemberForm.tsx               # NEW
│   ├── MemberList.tsx                     # NEW
│   ├── InvitationList.tsx                 # NEW
│   ├── MemberEditModal.tsx                # NEW
│   └── RemoveMemberConfirm.tsx            # NEW
├── pages/
│   ├── SettingsLandingPage.tsx            # NEW
│   ├── TeamSettingsPage.tsx               # NEW
│   └── AcceptInvitePage.tsx               # NEW
├── pages/DashboardHome.tsx                # MODIFIED: Settings nav link (all members)
└── App.tsx                                # MODIFIED: route branches + accept-invite

apps/web/tests/
├── api/invitations.test.tsx               # NEW
├── api/users.test.tsx                     # NEW
├── hooks/useCanManageTeam.test.ts         # NEW
├── lib/appRoute.test.ts                   # NEW
├── components/team/                       # NEW: form, modal, confirm tests
├── pages/SettingsLandingPage.test.tsx     # NEW
├── pages/TeamSettingsPage.test.tsx        # NEW
├── pages/AcceptInvitePage.test.tsx        # NEW
└── pages/DashboardHome.test.tsx           # MODIFIED: Settings link visibility

tests/e2e/specs/team/
└── invitation-flow.spec.ts                # NEW (optional): admin invite → accept → dashboard
```

**Structure Decision**: Mirror 014 routing + 015 component folders. Settings under `components/settings/` and `pages/`; team-specific UI in `components/team/`. Rename/extend route module to `appRoute.ts` (superset of dashboard paths). Minimal backend touch only for invitation scope projection.

## Implementation Phases

### Phase A — Routing, Settings shell, permission hook

1. `appRoute.ts` — paths: `/`, `/venues/new`, `/settings`, `/settings/team`, `/settings/organization`, `/settings/integrations`, `/accept-invite` (token query).
2. `useCanManageTeam()` — `canManagePermissions` from profile.
3. `SettingsLayout` + `SettingsNav` — Team link only when `canManageTeam`; placeholder links for all members.
4. `SettingsLandingPage` — hub cards; `PlaceholderSettingsPage` for non-Team stubs.
5. `DashboardHome` — **Settings** link in header for all authenticated users.
6. `App.tsx` — branch authenticated render on path; `/accept-invite` handled in unauthenticated + authenticated phases.

### Phase B — API hooks

1. `roles.ts` — `useRoles()` → `GET /api/roles`.
2. `users.ts` — `useOrgMembers`, `useChangeMemberRole`, `useUpdateMemberVenueScopes`, `useRemoveMember`.
3. `invitations.ts` — `useInvitations`, `useCreateInvitation`, `useResendInvitation`, `useCancelInvitation`, `acceptInvitation()` (anonymous POST).
4. Query keys: `['users']`, `['invitations']`, `['roles']`; invalidate on mutations.

### Phase C — Team settings page

1. `TeamSettingsPage` — permission guard → redirect `/settings` when `!canManageTeam`.
2. `InviteMemberForm` — email, role select, venue multi-select (empty = all venues); `validateEmail`; duplicate-submit guard.
3. `MemberList` + `InvitationList` — scope summary helper (`formatVenueScopeSummary`).
4. `MemberEditModal` — edit role + scopes; Save runs PATCH role then PUT venue-scopes; Cancel discards (FR-009a).
5. `RemoveMemberConfirm` — alertdialog confirm/cancel (FR-010/FR-010a); map last-admin 400 to inline error.

### Phase D — Accept invitation flow

1. `AcceptInvitePage` — read `token` from query; expired/invalid states (FR-014).
2. New user path: email display (from optional validate-token prefetch or accept 400 messaging), password fields, accept POST with token + password.
3. Existing user path: login form then accept; if logged-in email mismatch → prompt sign-out (research D8).
4. `authApi.acceptInvitation` — set tokens from `AcceptInvitationResponse`, refresh profile, navigate dashboard.
5. Skip org-create step — acceptance maps user to inviting org.

### Phase E — Backend scope on InvitationResponse + tests

1. Add `VenueScopes` to `InvitationResponse`; include in Send/List/Resend projections via `.Include(i => i.VenueScopes).ThenInclude(...)`.
2. Regenerate OpenAPI → `generated-api.ts`.
3. Extend integration tests; Vitest coverage ≥80%; optional E2E.

## Complexity Tracking

> No constitution violations requiring justification.

## Artifacts Generated

| Artifact | Path |
|----------|------|
| Research | [research.md](./research.md) |
| Data model | [data-model.md](./data-model.md) |
| UI contract | [contracts/team-invitation-ui.md](./contracts/team-invitation-ui.md) |
| Quickstart | [quickstart.md](./quickstart.md) |

**Next**: `/speckit-tasks` to generate `tasks.md`.
