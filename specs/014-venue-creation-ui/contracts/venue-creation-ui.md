# Contract: Venue Creation UI

**Feature**: `014-venue-creation-ui` | **Date**: 2026-06-17

UI and client-hook contracts for venue creation. API types from `apps/web/src/types/generated-api.ts` only (Constitution VI). Backend `POST /api/venues` contract unchanged — see `specs/011-complete-organization-and/contracts/venues.md`.

## `useCreateVenue()` (NEW) — FR-005, FR-006, FR-009

```text
useCreateVenue(): UseMutationResult<VenueResponse, Error, CreateVenueRequest>
  mutationFn: POST /api/venues  (skipVenueContext: true)
  onSuccess:
    - upsert VenueResponse into query cache ['venues']
    - activateVenueId(created.id)
    - invalidateQueries(['venues'])
```

- Submit disabled while `isPending`.
- Maps `403` → user-visible permission error on page (defense in depth); `400` → validation message from `detail`.

## `useCanManageVenues()` (NEW) — FR-008

```text
useCanManageVenues(): boolean
  = useUserProfile().data?.role?.permissions?.canManagePermissions ?? false
```

## `dashboardRoute.ts` (NEW) — FR-002b, FR-002c

| Function | Behavior |
|----------|----------|
| `getDashboardPath()` | Returns `'/'` or `'/venues/new'` from `location.pathname` |
| `navigateToCreateVenue()` | `pushState` → `/venues/new` + `popstate` listeners |
| `navigateToDashboard()` | `pushState` → `/` |
| `useDashboardRoute()` | React hook subscribing to path changes |

Direct load of `/venues/new` must render create page when permitted; non-permitted → immediate `navigateToDashboard()` (silent, FR-002c).

## `CreateVenuePage` (NEW) — FR-003–FR-011

| Prop | Type | Notes |
|------|------|-------|
| *(none)* | — | Reads hooks internally |

**Layout**: `AuthLayout` title "Add venue", subtitle referencing organization.

**Fields**:

| Field | Component | Validation |
|-------|-----------|------------|
| Venue name | `FormField` type `text` | `validateVenueName` |

**Actions**:

| Control | Behavior |
|---------|----------|
| Submit | Calls `useCreateVenue`; on success → dashboard |
| Cancel | `navigateToDashboard()` without save |

**States**: idle, validating, pending (submit disabled), field error, submit error (retain entered name).

**Accessibility**: Same as `OrganizationCreateStep` — labelled input, `aria-invalid`, error `role="alert"`, keyboard submit.

## `DashboardHome` (EXTEND) — FR-001, FR-002, FR-002a

| Addition | Visibility | Action |
|----------|------------|--------|
| Empty-state primary CTA | `venues.length === 0 && canManage` | `navigateToCreateVenue()` |
| Read-only empty copy | `venues.length === 0 && !canManage` | No CTA (FR-008) |

Existing loading/error/ledger behavior unchanged.

## `DashboardShell` header action (EXTEND via `DashboardHome` header row) — FR-002a

| Element | Visibility | Action |
|---------|------------|--------|
| `Add venue` button/link | `canManage` (any venue count) | `navigateToCreateVenue()` |
| Hidden | `!canManage` | — |

Placed in `app__header-actions` beside `VenueSwitcher` and Sign out.

## `App.tsx` (EXTEND)

When `phase === 'authenticated'`:

```text
if path === '/venues/new' → <VenueProvider><CreateVenuePage /></VenueProvider>
else → <VenueProvider><DashboardHome /></VenueProvider> + WelcomeModal when justOnboarded
```

`CreateVenuePage` performs permission guard on mount (redirect if `!useCanManageVenues()`).

## `validateVenueName(name: string)` (NEW)

| Rule | Message (approx) |
|------|------------------|
| Empty / whitespace | `Venue name is required.` |
| Length > 200 after trim | `Venue name must be 200 characters or fewer.` |

Returns `undefined` when valid. Mirrors `NameValidation.MaxLength = 200`.

## Error mapping (create mutation)

| Status | UI |
|--------|-----|
| 400 validation | Inline/banner from API `detail` |
| 403 | Banner: generic permission or server detail |
| 401 | Handled by existing `apiFetch` refresh |
| 5xx / network | Banner: retry-friendly generic message |
