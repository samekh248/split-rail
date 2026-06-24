# Phase 1 Data Model: Test Fixtures & Entities

**Feature**: 010-vitest-tests-auth
**Date**: 2026-06-16

This feature adds verification, so the "data model" is the set of **test fixtures and the entities they represent**. All fixture shapes are imported from `@/types/generated-api` (Constitution VI); the descriptions below capture the fields each scenario relies on, not new hand-written types.

## Entity: Auth Form Input

Represents what a user types into the login/registration forms.

| Field | Type (generated) | Used for | Validation under test |
|-------|------------------|----------|-----------------------|
| `email` | `LoginRequest.email` / register email | Login + Register | Required; must match email format; ≤255 chars |
| `password` | `LoginRequest.password` / register password | Login + Register | Required; ≥8 chars; upper + lower + digit |
| `organizationName` | register org name (`RegisterValues`) | Register only | Required (non-empty after trim) |

**Fixture variants**:
- `validLogin` = `{ email: 'user@example.com', password: 'Password1' }`
- `validRegister` = `{ email: 'owner@example.com', password: 'Password1', organizationName: 'Acme Touring' }`
- `emptyInput` = all blank (drives required-field validation)
- `malformedEmail` = `{ email: 'not-an-email', ... }`
- `weakPassword` = `{ password: 'short' }` (fails length/complexity)

## Entity: Auth Result / Form Error

Represents the outcome surfaced to the user after a submit.

| State | Source | Assertion |
|-------|--------|-----------|
| field validation error | client `validation.ts` | inline message adjacent to field; `aria-invalid`/`aria-describedby` set |
| form-level error | `formError` prop / `AuthContext.error` | `role="alert"` element with generic, non-PII message |
| pending | `pending` prop / `AuthContext.pending` | submit button disabled + progress label |
| session expired notice | `AuthContext.sessionExpired` | `role="status"` notice on login page |

## Entity: Accessible-Venues List

The scope-correct list the backend returns for the current user; the client renders it verbatim.

| Field | Type (generated) | Notes |
|-------|------------------|-------|
| `id` | `VenueResponse.id` (uuid) | option key + `data-testid` |
| `name` | `VenueResponse.name` | display label |
| `organizationId` | `VenueResponse.organizationId` | tenant association |
| `createdAt` | `VenueResponse.createdAt` | present in fixtures, not asserted |

**Fixture variants**:
- `multiVenue` = `[VENUE_A, VENUE_B]` (switching, active indication, keyboard nav)
- `scopedVenue` = `[VENUE_B]` only (restricted user — asserts out-of-scope `VENUE_A` never appears → single-venue display)
- `singleVenue` = `[VENUE_A]` (single-venue state)
- `noVenues` = `[]` (empty state / selector renders nothing; dashboard empty state)

## Entity: Active Venue Selection

The user's currently selected venue, persisted per-tab via session-scoped storage.

| Aspect | Mechanism | Assertion |
|--------|-----------|-----------|
| active venue id | `activeVenueStorage` (session-scoped) | restored on reload within session |
| active indication | `aria-selected="true"` on the active option | exactly one active option |
| switch | `setActiveVenue(id)` | `venue-switcher-current` updates to chosen venue |
| fallback | remembered id no longer in list | falls back to a default accessible venue, no error |

## Entity: Role / Permission Context

Drives whether existing permission-gated controls render. Sourced from `UserProfileResponse.role` (`RoleDetailDto.permissions` → `PermissionsDto`).

| Permission flag (generated) | Gated control | Assertion |
|-----------------------------|---------------|-----------|
| `canTriggerQboSync` | QBO sync trigger (`SyncNowButton`) | absent/disabled when false; present/enabled when true; sync stays read-only |
| `canSignSettlement` | settlement signing (`FinalizeSettlementPanel`) | absent/disabled when false; present when true |

**Fixture variants** (built from `UserProfileResponse`):
- `fullAccessProfile` = role with all permission flags `true`
- `restrictedProfile` = role with `canTriggerQboSync: false`, `canSignSettlement: false`
- `venueScopedProfile` = `venueScopes` limited to a subset (pairs with `scopedVenue` list)

## Fixture Conventions

- Centralize reusable fixtures (profiles, venues) to avoid per-file duplication during consolidation.
- All UUIDs are stable, well-formed constants.
- Monetary fields in any settlement fixture use the generated string/decimal-safe representation — never JS `number` math (Constitution I).
- Reset `sessionStorage`/`localStorage` and `vi.unstubAllGlobals()` in `beforeEach` for deterministic runs.
