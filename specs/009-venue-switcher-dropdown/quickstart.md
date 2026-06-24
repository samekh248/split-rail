# Quickstart & Validation: Dashboard Tenant/Venue Switching Dropdown

**Feature**: `009-venue-switcher-dropdown` | **Date**: 2026-06-16

A run/validation guide proving the venue switcher works end-to-end. Implementation details live in `tasks.md`; contracts in `contracts/`; state model in `data-model.md`.

## Prerequisites

- Repo dependencies installed (frontend workspace `apps/web`; E2E workspace `tests/e2e`).
- Backend API runnable (no backend changes are part of this feature).
- Seed data with: one organization, **two or more venues**, a **full-access user**, and a **venue-scoped user** assigned to a subset of venues.

## Frontend unit/component validation (Vitest + RTL)

Run from `apps/web`:

```bash
npm test
npm run test -- --coverage
```

Expected:

- All new suites pass: `tests/venue/activeVenueStorage.test.ts`, `tests/api/client.venueHeader.test.ts`, `tests/venue/VenueContext.test.tsx`, `tests/venue/VenueSwitcher.test.tsx`, plus extended `tests/api/venues.test.tsx` and `tests/pages/DashboardHome.test.tsx`.
- Coverage meets the ≥80% line/branch gate configured in `apps/web/vite.config.ts` (missing/unparseable coverage report = failing — Constitution III).

Key assertions to look for (see `contracts/`):

- The venues-list request does **not** send `X-Active-Venue-Id` (`skipVenueContext`), so the list is not collapsed (C3.1).
- All other venue-scoped requests **do** send `X-Active-Venue-Id` from the active venue (C2.1).
- Default/remembered/fallback active-venue resolution behaves per data-model D5 (C4.2–C4.4).

## Manual end-to-end validation

1. **Full-access user**: sign in → the dashboard header shows the venue switcher listing **all** org venues, with one marked active. *(FR-001, FR-002, FR-003)*
2. **Switch venue**: open the switcher, choose a different venue → the ledger view reloads with the new venue's default content within ~2s; the prior event is not carried over. *(FR-005, FR-006, SC-001)*
3. **Header sent**: in browser dev tools Network tab, confirm downstream requests carry `X-Active-Venue-Id` equal to the selected venue, while `GET /api/venues` does **not**. *(FR-007)*
4. **Persistence**: reload the page in the same tab → the previously selected venue is still active. Open a new tab → it resolves its own default (per-tab session). *(FR-009)*
5. **Scoped user**: sign in as the venue-scoped user → the switcher lists **only** assigned venues; unassigned venues are absent. *(FR-004)*
6. **Out-of-scope denial**: with the scoped user, attempt to activate/load an unassigned venue (e.g., via a crafted request) → server responds 403 and the active venue is unchanged. *(FR-008)*
7. **Fallback**: with a remembered selection in `sessionStorage` pointing at a now-inaccessible venue, reload → the app falls back to a default accessible venue with no error. *(FR-011)*
8. **Empty state**: a user with no accessible venues sees the "No venues yet" empty state and no broken switcher. *(FR-012)*
9. **Accessibility**: operate the switcher entirely via keyboard; verify it has an accessible name and exposes the current selection to assistive tech. *(FR-013)*

## Multi-user E2E validation (Playwright)

Run from `tests/e2e`:

```bash
npm run test:e2e -- specs/venue/venue-switching.spec.ts
```

Expected scenarios pass (see `contracts/ui-components.md` E1–E4): full-access sees all venues; scoped user sees only assigned; selecting updates the ledger and sends the header; out-of-scope venue denied.

## Definition of done (validation)

- [ ] All Vitest suites green; frontend coverage ≥80% (per-stack gate).
- [ ] Playwright venue-switching spec green.
- [ ] Manual steps 1–9 verified.
- [ ] No backend/DTO/swagger changes introduced (frontend-only slice).
