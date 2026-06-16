# Phase 0 Research: Dashboard Tenant/Venue Switching Dropdown

**Feature**: `009-venue-switcher-dropdown` | **Date**: 2026-06-16

This document records the design decisions that resolve the unknowns for the plan. There were no open `NEEDS CLARIFICATION` markers after `/speckit-clarify`; the items below capture the grounding-driven decisions and the alternatives rejected.

## D1. Venue list scoping is enforced server-side; the client renders it verbatim

- **Decision**: Consume `GET /api/venues` as the authoritative, already-scoped accessible-venues list and render it as-is. Do **not** filter by `useUserProfile().venueScopes` on the client.
- **Rationale**: `VenueService.GetAccessibleVenueQuery(userId)` returns all org venues when the user has no `UserVenueScopes` rows (full access) and only assigned venues otherwise. This already satisfies FR-003/FR-004. Constitution II requires scope enforcement at the data layer; relying on the server-scoped list avoids leaking out-of-scope venue identities to the browser. This matches the clarification (Q1 → A).
- **Alternatives considered**:
  - *Fetch all org venues + filter client-side using `venueScopes`*: rejected — leaks venue names/ids to scoped users and duplicates authorization logic in the client (Constitution II violation risk).
  - *Backend enforce + client double-filter*: rejected — redundant; adds a second source of truth with no security benefit because the server list is already correct.
- **Use of `venueScopes`**: the profile's `venueScopes` is **not** used to build the list. It may optionally inform UI affordances (e.g., a "scoped access" hint) but is not required for correctness; the plan does not depend on it.

## D2. The venue-list request MUST omit `X-Active-Venue-Id`

- **Decision**: The `useVenues()` query opts out of venue-context header injection (`skipVenueContext: true`); all other venue-scoped requests include the header.
- **Rationale**: `ListAccessibleVenuesAsync` filters the returned list to **only the active venue** when the header is present — proven by `apps/api.tests/Integration/VenueContextSwitchingTests.cs` (`ActiveVenueHeader_FiltersListedVenues` returns 1 venue; `NoHeader_ReturnsAllAccessibleVenues` returns all). If the dropdown's own list request carried the active-venue header, the dropdown would collapse to a single option and switching would become impossible.
- **Alternatives considered**:
  - *Change the backend so the list ignores the header*: rejected — alters existing, tested behavior other callers may rely on; this feature is frontend-only.
  - *Add a separate "all venues" endpoint*: rejected — unnecessary DTO/endpoint churn (Constitution VI) when a per-request opt-out flag suffices.

## D3. Active venue is held in React context backed by `sessionStorage` (not the URL)

- **Decision**: Introduce a `VenueProvider` context holding `activeVenueId`, backed by a `sessionStorage` module (`activeVenueStorage.ts`). Replace the current `?venueId=` URL placeholder in `DashboardHome`.
- **Rationale**: The clarification (Q2 → A) specifies per-tab session-scoped persistence cleared on tab close — `sessionStorage` is the exact primitive. A single context value lets `apiFetch` (via the storage module) attach `X-Active-Venue-Id` globally without threading the id through every call site. This mirrors the proven `tokenStorage`/`AuthContext` split already in the codebase.
- **Alternatives considered**:
  - *URL query parameter (current approach)*: rejected — not aligned with the "session" persistence clarification, awkward to drive a global request header from, and exposes venue id in shareable links (out of scope for this iteration).
  - *`localStorage`*: rejected — persists across tabs/restarts; the clarification explicitly excludes cross-tab/cross-device persistence.
  - *React state only (no storage)*: rejected — would not survive reload within the session (FR-009).

## D4. `apiFetch` is the single injection point for `X-Active-Venue-Id`

- **Decision**: Extend `apiFetch` to read the active venue from `activeVenueStorage` and attach the `X-Active-Venue-Id` header by default, with `ApiFetchInit.skipVenueContext` to opt out (D2). The existing 401/refresh recovery is untouched and composes with the new header.
- **Rationale**: `apiFetch` is the sole outbound choke point; injecting here guarantees every venue-scoped request (ledger, settlement, QBO, events) carries the active venue with zero changes at call sites. Reading from a plain module (not React) keeps the client React-free and avoids an import cycle — the same boundary solution used for tokens.
- **Alternatives considered**:
  - *Per-call header threading*: rejected — error-prone, touches every API hook, easy to miss a call site.
  - *Importing `VenueContext` into `client.ts`*: rejected — creates a React/transport import cycle and breaks unit isolation.

## D5. Default selection, remembered restore, and fallback

- **Decision**: On load, the `VenueProvider` resolves the active venue as: (a) the remembered `sessionStorage` id **if** it appears in the freshly fetched scoped list; otherwise (b) the first venue in the scoped list; otherwise (c) none (empty state). A remembered id that is no longer accessible is discarded and replaced by (b).
- **Rationale**: Satisfies FR-010 (default on first load), FR-011 (graceful fallback when a remembered venue is no longer accessible, e.g., scope changed), and the "single accessible venue" / "no accessible venues" edge cases. Deterministic "first available" matches the documented assumption.
- **Alternatives considered**:
  - *Persist and trust the remembered id without re-validation*: rejected — a stale/out-of-scope id would cause 403s on every downstream request (FR-011 violation).

## D6. Switching venues resets the open event to the new venue's default (preserve view type)

- **Decision**: When the active venue changes, `DashboardHome` keeps showing the same view type (the event ledger) but loads the **new venue's default event** rather than carrying over the prior `eventId`.
- **Rationale**: Events belong to a specific venue, so the previously open `eventId` is meaningless under a new venue and would 404/forbid. The clarification (Q3 → B) chose "keep the same view type but load the new venue's default/equivalent content." Today the only downstream view is the ledger keyed by `(venueId, eventId)`; the default event resolution reuses the existing placeholder-default behavior until a richer event picker exists.
- **Alternatives considered**:
  - *Carry over the prior `eventId`*: rejected — guaranteed cross-venue 404/403 and confusing UX.
  - *Reset to a neutral landing with no view*: rejected — the clarification explicitly chose to preserve the view type.

## D7. Accessibility & states

- **Decision**: The `VenueSwitcher` is a keyboard-operable control with an accessible label and a clearly-indicated active option; it renders distinct single-venue and empty states, and the dashboard reuses the existing loading and error-with-retry surfaces for the venue list.
- **Rationale**: Satisfies FR-012/FR-013 and the corresponding edge cases, and keeps parity with existing accessible components (e.g., `InlineMappingDropdown`).
- **Alternatives considered**: *Native `<select>` only* — acceptable for MVP accessibility but the plan keeps the component free to use a custom listbox as long as keyboard + aria parity is met; tests assert behavior, not the specific element.

## Summary of resolved unknowns

| Unknown | Resolution |
|---------|-----------|
| Where is scope enforced? | Server-side; client renders verbatim (D1) |
| How to avoid the list collapsing? | `skipVenueContext` on the list call (D2) |
| Where does the active venue live? | React context + `sessionStorage` (D3) |
| How is the header sent everywhere? | Injected in `apiFetch` (D4) |
| Default / remembered / fallback rules | Validate-then-default-first (D5) |
| What happens to the open event on switch? | Reset to new venue default (D6) |
| Accessibility & states | Keyboard + aria; single/empty/loading/error (D7) |

All unknowns resolved. No backend changes, no new dependencies, no DTO/swagger changes.
