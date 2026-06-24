# Phase 0 Research: Vitest Coverage for Workspace Navigation & Tenant Management UX

**Feature**: 017-vitest-workspace-navigation
**Date**: 2026-06-17

All clarifications from `/speckit-clarify` are resolved; no open NEEDS CLARIFICATION remain. This document records the testing-approach decisions that drive Phase 1 design.

## Decision 1 — Testing stack and environment

- **Decision**: Reuse the existing Vitest + React Testing Library + `@testing-library/user-event` setup with the `jsdom` environment and `apps/web/setupTests.ts`. Coverage via the v8 provider configured in `apps/web/vite.config.ts`.
- **Rationale**: Constitution III mandates Vitest + RTL for frontend components. Feature 010 established the harness; reusing it avoids configuration drift and keeps CI consistent.
- **Alternatives considered**: Jest (rejected — not project standard); Playwright for these unit scenarios (rejected — E2E layer covers multi-user isolation; Vitest is the correct layer for component/page verification).

## Decision 2 — Extend/consolidate existing suites vs. net-new directory

- **Decision**: Extend and consolidate existing `apps/web/tests/**` files from features 014–016; fill coverage gaps and remove duplication. No separate `workspace-navigation/` test directory. (Clarification 2026-06-17.)
- **Rationale**: Substantial coverage already exists (`DashboardHome.test.tsx`, `CreateVenuePage.test.tsx`, team component tests, settings page tests). Parallel suites would duplicate assertions and inflate maintenance. Feature 010 validated this pattern.
- **Alternatives considered**: Dedicated directory (rejected — clarification A); audit-and-rewrite (rejected — discards passing coverage).

## Decision 3 — Test layer: component + page/container

- **Decision**: Cover both component level (team components, `EventCombobox`, `EventFormPanel`, `SettingsNav`) and page/container level (`DashboardHome`, `CreateVenuePage`, `SettingsLandingPage`, `TeamSettingsPage`, `App` routing).
- **Rationale**: Component tests isolate field validation and list rendering; page tests verify routing, permission redirects, and cross-component wiring (e.g., create venue → dashboard with active venue, create event → ledger).
- **Alternatives considered**: Page-only (rejected — weak branch coverage); component-only (rejected — misses silent redirect and navigation flows).

## Decision 4 — Backend interaction stubbing

- **Decision**: Stub `fetch` via `vi.stubGlobal('fetch', ...)` matching existing page tests; wrap context-dependent units in `QueryClientProvider` + `VenueProvider` / `AuthContext` as needed. Reset `localStorage`/`sessionStorage` and unstub globals in `beforeEach`.
- **Rationale**: Deterministic, offline tests that exercise real component logic; mirrors server-side scope enforcement (stub returns scoped venue/event/member lists; client renders verbatim).
- **Alternatives considered**: MSW (viable but not currently used — defer to avoid new dependency); live API (rejected — non-deterministic).

## Decision 5 — Permission hook mapping

- **Decision**: Tests align permission stubs with existing hooks:
  - `useCanManageVenues` → `role.permissions.canManagePermissions` (venue create CTA, create-venue page access)
  - `useCanManageEvents` → `role.permissions.canViewFinancials` (event create CTA; matches existing `DashboardHome` `MEMBER_PROFILE` pattern)
  - `useCanManageTeam` → `role.permissions.canManagePermissions` (Team card visibility, team page access)
- **Rationale**: Hooks are the canonical UI gating mechanism; tests must stub the same permission flags the production code reads to avoid false positives.
- **Alternatives considered**: Role-name-based stubs (rejected — hooks read permission booleans, not role labels).

## Decision 6 — Unauthorized access patterns

- **Decision**: Create-venue page and team settings page both use **silent redirect** (no error message): non-permitted users on `/venues/new` redirect to dashboard; non-permitted users on `/settings/team` redirect to `/settings`. (Clarification 2026-06-17.)
- **Rationale**: Matches implemented behavior in `CreateVenuePage` and `TeamSettingsPage` and existing tests; consistent least-privilege UX.
- **Alternatives considered**: Forbidden/error state (rejected — not implemented, would require product change).

## Decision 7 — Explicit scope exclusions

- **Decision**:
  - Event combobox **edit/delete** flows: out of scope — owned by feature 015 component tests (`EventFormPanel` edit mode, `EventDeleteConfirm`).
  - Organization/venue **rename forms**: out of scope — deferred until dedicated rename UI feature ships; this feature tests placeholder sub-pages and settings navigation only.
  - Auth layouts and venue switcher verbatim rendering: remain owned by feature 010 — do not duplicate.
- **Rationale**: Clarifications 2026-06-17 lock boundaries; avoids duplicate work and blocking on unbuilt UI.
- **Alternatives considered**: Including rename stubs now (rejected — no rename UI exists).

## Decision 8 — Team management test depth

- **Decision**: Full team component coverage — `InviteMemberForm`, `InvitationList` (resend/cancel), `MemberList`, `MemberEditModal` (save/cancel/last-admin guard), `RemoveMemberConfirm`, plus `TeamSettingsPage` integration. (Clarification 2026-06-17.)
- **Rationale**: Matches feature 016 deliverables; most component tests already exist — this feature consolidates and closes integration gaps.
- **Alternatives considered**: SPLR-61 minimum only (rejected — clarification chose full depth).

## Decision 9 — Coverage attribution and the 80% gate

- **Decision**: Run `vitest run --coverage`; treat configured 80% thresholds as the gate. New/extended tests must import and execute real workspace/tenant source modules. Coverage measured over `src/**/*.{ts,tsx}` excluding `src/types/**`, `src/main.tsx`, `src/vite-env.d.ts`.
- **Rationale**: Constitution III; global frontend gate is the CI contract.
- **Alternatives considered**: Per-feature subdirectory thresholds (rejected — not current CI setup).

## Decision 10 — Contract type usage

- **Decision**: Import `VenueResponse`, `EventListItem`, `UserListResponse`, `InvitationResponse`, `RoleDetailDto`, etc. from `@/types/generated-api` in fixtures; never hand-declare payload shapes.
- **Rationale**: Constitution VI.
- **Alternatives considered**: Local fixture interfaces (rejected).

## Known gaps (baseline audit)

Existing tests cover many scenarios; implementation tasks should close these identified gaps:

| Gap | Target file | Spec reference |
|-----|-------------|----------------|
| Over-max-length venue name validation | `CreateVenuePage.test.tsx` | FR-003 |
| Zero-venue empty state hides CTA for restricted user | `DashboardHome.test.tsx` | FR-002 |
| Persistent shell "Add venue" when venues exist | `DashboardHome.test.tsx` | FR-001 |
| Inline create-event → ledger transition (page level) | `DashboardHome.test.tsx` | FR-008 |
| `SettingsNav` component coverage | add `components/settings/SettingsNav.test.tsx` if missing | FR-010 |
| Consolidate duplicated profile/venue fixtures | `tests/fixtures/` | FR-017 |

## Open Risks

- **High existing coverage**: Much of SPLR-61 may already be implemented from features 014–016; value is gap-closing, consolidation, and explicit matrix completion rather than greenfield authoring.
- **Flake sources**: async `waitFor` on fetch-stubbed renders; mitigate with deterministic stubs and `findBy*` queries.
- **Permission naming confusion**: spec says "event-management permission" but hook uses `canViewFinancials` — document in fixtures to prevent mis-stubbing.
