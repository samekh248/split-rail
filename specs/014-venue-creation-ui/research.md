# Phase 0 Research: Venue Creation UI with Empty-State CTA

**Feature**: `014-venue-creation-ui` | **Date**: 2026-06-17

This document resolves technical unknowns for the plan. Clarifications from `/speckit-clarify` (dedicated page, dual entry points, silent permission redirect) are incorporated.

## D1. Frontend-only; reuse existing `POST /api/venues`

- **Decision**: No backend or DTO changes. Wire `useCreateVenue()` to the existing `POST /api/venues` endpoint (`CreateVenueRequest` / `VenueResponse` from `generated-api.ts`). Permission is already enforced server-side via `[RequirePermission(can_manage_permissions)]`.
- **Rationale**: `VenuesController.Create` and `VenueService.CreateVenueAsync` exist with integration coverage (`VenuesControllerTests.CreateVenue_Returns201`, validation tests). SPLR-57 gap is exclusively missing UI + client hook.
- **Alternatives considered**:
  - *New batch-create or onboarding-specific endpoint*: rejected — unnecessary API surface (Constitution VI).
  - *Extend registration to auto-create a default venue*: rejected — out of spec scope; admins name venues explicitly.

## D2. Client-side path routing without `react-router`

- **Decision**: Introduce a minimal `dashboardRoute.ts` module using `window.location.pathname` + History API (`pushState` / `popstate`). Authenticated routes: `/` (workspace) and `/venues/new` (create page). No new npm dependency.
- **Rationale**: The app has no router today (`App.tsx` phase gate only). Clarification requires a bookmarkable create URL for silent permission redirect (FR-002c). `DashboardHome.test.tsx` already stubs `history.pushState`; the pattern is proven. Adding `react-router` is disproportionate for two routes.
- **Alternatives considered**:
  - *App-level enum state only (no URL)*: rejected — cannot satisfy direct-URL permission denial scenario.
  - *Hash routing (`#/venues/new`)*: rejected — uglier share/bookmark semantics; pathname is standard.
  - *Full `react-router` adoption*: deferred — larger migration touching auth gates; not required for this slice.

## D3. Permission gating mirrors backend: `canManagePermissions`

- **Decision**: Add `useCanManageVenues()` (alias of manage-permissions check) reading `useUserProfile().role.permissions.canManagePermissions`. Hide empty-state CTA, header "Add venue" link, and guard `CreateVenuePage` mount (silent `navigateToDashboard()` when false).
- **Rationale**: Matches `VenuesController` `[RequirePermission(PermissionNames.ManagePermissions)]` and spec assumption. Follows existing hooks (`useCanTriggerQboSync`, `useCanSignSettlement`).
- **Alternatives considered**:
  - *Infer Admin from role name string*: rejected — brittle vs permission flags.
  - *Attempt POST and handle 403*: rejected for entry-point visibility (FR-008); still used for mutation error display.

## D4. Reuse 006 form primitives and validation parity

- **Decision**: `CreateVenuePage` uses `AuthLayout`, `FormField`, and a new `validateVenueName()` in `auth/validation.ts` (required trimmed non-empty, max 200 chars) mirroring `NameValidation.MaxLength` and messages aligned with `OrganizationCreateStep`.
- **Rationale**: FR-011 requires visual/interaction parity with auth/onboarding forms. Client-side parity blocks invalid submits before network (SC-004), matching 006 research pattern.
- **Alternatives considered**:
  - *Inline-only validation from server 400*: rejected — fails SC-004 instant feedback goal.
  - *Duplicate max-length constant without comment*: rejected — document `200` matches `NameValidation.MaxLength` in comment only (not a TS import from backend).

## D5. Post-create: cache upsert, activate, navigate home

- **Decision**: `useCreateVenue` `onSuccess`: (1) upsert returned `VenueResponse` into TanStack Query `['venues']` cache; (2) persist + set active venue id via extended `VenueContext` helper `activateVenueId(id)` that does not require the id to pre-exist in the in-memory list; (3) `navigateToDashboard()` (`/`).
- **Rationale**: `setActiveVenue` today rejects ids not in `venues` array — race with refetch would block FR-006/FR-007. Upserting cache + permissive activate avoids flicker and satisfies auto-select. `invalidateQueries(['venues'])` still runs for server reconciliation.
- **Alternatives considered**:
  - *Refetch then pick last item*: rejected — ordering not guaranteed; flaky tests.
  - *Only refetch and rely on `resolveActiveVenueId`*: rejected — would not select newly created venue if a remembered id exists.

## D6. Entry points: empty-state CTA + header shell action

- **Decision**: `DashboardHome` empty state gets a link/button to `/venues/new`. Header row (beside `VenueSwitcher`) gets persistent `Add venue` when `useCanManageVenues()` — visible at zero or N venues per clarification Q2-C.
- **Rationale**: FR-002/FR-002a. Header placement keeps discoverability when ledger is visible; empty-state CTA preserves onboarding funnel.
- **Alternatives considered**:
  - *Venue switcher menu item only*: rejected — contradicts clarification (shell action, not switcher-only).
  - *Hide shell action when empty state showing*: rejected — clarification requires both at zero venues.

## D7. Cancel / back: return to dashboard preserving prior active venue

- **Decision**: Create page exposes Cancel link and treats browser back as leaving the form; both call `navigateToDashboard()` without mutation. `VenueContext` unchanged — remembered active venue remains.
- **Rationale**: Edge case from clarify session; no server call.

## D8. Duplicate venue names allowed

- **Decision**: UI does not block duplicate names client-side; server accepts duplicates (`VenueService` has no uniqueness constraint). Show server error only if API behavior changes.
- **Rationale**: Existing integration tests create multiple venues with distinct names but nothing prevents duplicates; spec edge case defers to backend rules.

## D9. Testing strategy (Constitution III)

- **Decision**: Vitest + RTL tests for: empty-state CTA visibility, header action visibility, permission hiding, create page validation, successful create navigation + active venue, silent redirect for non-permitted direct URL, duplicate-submit disable. Extend `DashboardHome.test.tsx`; add `CreateVenuePage.test.tsx`, `useCanManageVenues.test.ts`, `venues.test.tsx` (hook). No new backend tests (endpoint already covered).
- **Rationale**: Frontend-only delta; ≥80% coverage gate applies to `apps/web` thresholds in `vite.config.ts`. Backend unchanged — existing `VenuesControllerTests` satisfy API contract.
