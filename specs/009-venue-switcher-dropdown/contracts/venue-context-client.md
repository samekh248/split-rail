# Contract: Venue Context Client Layer

**Feature**: `009-venue-switcher-dropdown` | **Phase 1** | **Date**: 2026-06-16

Behavioral contracts for the transport + state layer. These are frontend behavioral contracts (no new HTTP endpoints, no DTO changes). Each numbered behavior is independently testable with Vitest.

## C1. `activeVenueStorage` (session-scoped active venue)

Module: `apps/web/src/venue/activeVenueStorage.ts`

| # | Behavior |
|---|----------|
| C1.1 | `getActiveVenueId()` returns the stored uuid string, or `null` when nothing is stored. |
| C1.2 | `setActiveVenueId(id)` writes `id` to `sessionStorage` under key `activeVenueId`. |
| C1.3 | `clearActiveVenueId()` removes the key. |
| C1.4 | A malformed/empty stored value is treated as absent (`getActiveVenueId()` returns `null`). |
| C1.5 | Values are stored in `sessionStorage` (per-tab; cleared on tab close), never `localStorage`. |

## C2. `apiFetch` venue-context header injection

Module: `apps/web/src/api/client.ts` (extend existing `apiFetch` / `ApiFetchInit`)

| # | Behavior |
|---|----------|
| C2.1 | When an active venue id is present and `skipVenueContext` is not set, `apiFetch` attaches header `X-Active-Venue-Id: <activeVenueId>` to the request. |
| C2.2 | When `ApiFetchInit.skipVenueContext === true`, `apiFetch` omits the `X-Active-Venue-Id` header (used by the venues-list call — see C3). |
| C2.3 | When no active venue id is stored, `apiFetch` omits the header regardless of `skipVenueContext`. |
| C2.4 | The header is added alongside existing `Authorization`/`Content-Type` headers and does not disturb the existing 401→refresh→retry-once recovery (the retried request re-attaches the current header). |
| C2.5 | Caller-supplied `headers` continue to override/merge as today; venue header injection does not clobber explicitly provided headers. |

> Server contract already in place (no change): `VenueContextMiddleware` validates `X-Active-Venue-Id`; an inaccessible venue → `AuthorizationException` (HTTP 403); a valid venue → `ITenantContext.ActiveVenueId` set for the request.

## C3. `useVenues` list query

Module: `apps/web/src/api/venues.ts`

| # | Behavior |
|---|----------|
| C3.1 | `useVenues()` issues `GET /api/venues` with `skipVenueContext: true` so the response is the full server-scoped list and is **not** collapsed to the active venue. |
| C3.2 | The returned list is used verbatim (no client-side scope filtering). |
| C3.3 | Query exposes `isLoading`, `error`, and `refetch` for the dashboard's loading/empty/error-with-retry surfaces. |

## C4. `VenueProvider` / `useActiveVenue`

Modules: `apps/web/src/venue/VenueContext.tsx`, `apps/web/src/venue/useActiveVenue.ts`

| # | Behavior |
|---|----------|
| C4.1 | On mount, loads the scoped venue list via `useVenues()`. |
| C4.2 | Resolves `activeVenueId` per the resolution algorithm (data-model D5): remembered-if-still-accessible → else first venue → else `null`. |
| C4.3 | When it resolves a default (no valid remembered id), it persists that default via `setActiveVenueId`. |
| C4.4 | A remembered id absent from the fetched list is discarded and replaced by the default (FR-011); no error is surfaced for this case. |
| C4.5 | `setActiveVenue(id)` persists the id, updates context state, and causes venue-scoped queries to refetch under the new venue. |
| C4.6 | Exposes `{ venues, activeVenueId, activeVenue, isLoading, isError, refetch, setActiveVenue }`. |
| C4.7 | `useActiveVenue()` throws if used outside a `VenueProvider`. |
| C4.8 | When the list is empty, `activeVenueId` is `null` and `activeVenue` is `null`. |

## Test coverage (Vitest) mapped to contracts

| Test file | Covers |
|-----------|--------|
| `apps/web/tests/venue/activeVenueStorage.test.ts` | C1.1–C1.5 |
| `apps/web/tests/api/client.venueHeader.test.ts` | C2.1–C2.5 |
| `apps/web/tests/api/venues.test.tsx` (extend) | C3.1–C3.3 |
| `apps/web/tests/venue/VenueContext.test.tsx` | C4.1–C4.8 |

All paths counted toward the ≥80% frontend coverage gate (Constitution III).
