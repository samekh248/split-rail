# Test Coverage Contract: Workspace Navigation & Tenant Management UX

**Feature**: 017-vitest-workspace-navigation
**Date**: 2026-06-17

UI/test contract mapping functional requirements to verification targets. "Suite" entries name files under `apps/web/tests/**`; existing files are extended/consolidated. Rows marked **GAP** indicate missing coverage identified in the baseline audit.

## Coverage matrix

| ID | Requirement / scenario | Target under test | Suite (extend or add) | Key assertions |
|----|------------------------|-------------------|------------------------|----------------|
| W1 | FR-001 venue create CTA in zero-venue empty state | `DashboardHome` | `pages/DashboardHome.test.tsx` | `empty-state-add-venue` present for admin |
| W2 | FR-001 persistent shell "Add venue" when venues exist | `DashboardHome` | `pages/DashboardHome.test.tsx` **GAP** | shell action visible for permitted user with ≥1 venue |
| W3 | FR-002 no create CTA for restricted user (zero venues) | `DashboardHome` | `pages/DashboardHome.test.tsx` **GAP** | empty state without `empty-state-add-venue` for `memberProfile` |
| W4 | FR-002 no shell create for restricted user (venues exist) | `DashboardHome` | `pages/DashboardHome.test.tsx` **GAP** | no shell add-venue action for `memberProfile` |
| W5 | FR-003 empty/whitespace venue name blocked | `CreateVenuePage` | `pages/CreateVenuePage.test.tsx` | inline validation; no POST |
| W6 | FR-003 over-max-length venue name blocked | `CreateVenuePage` | `pages/CreateVenuePage.test.tsx` **GAP** | max-length message; submit blocked |
| W7 | FR-004 successful create → dashboard + active venue | `CreateVenuePage`, `VenueContext` | `pages/CreateVenuePage.test.tsx` | navigates to `/`; new venue selected |
| W8 | FR-005 unauthorized create-venue redirect | `CreateVenuePage` | `pages/CreateVenuePage.test.tsx` | silent redirect; form not shown |
| W9 | FR-006 event combobox lists venue-scoped events | `EventCombobox`, `DashboardHome` | `components/event/EventCombobox.test.tsx`, `pages/DashboardHome.test.tsx` | only active venue events; title/date visible |
| W10 | FR-006 select event updates ledger context | `DashboardHome` | `pages/DashboardHome.test.tsx` | `mock-ledger-page` shows new `eventId` |
| W11 | FR-007 no-events CTA for permitted user | `DashboardHome` | `pages/DashboardHome.test.tsx` | `empty-state-create-event` present |
| W12 | FR-007 no-events without CTA for restricted user | `DashboardHome` | `pages/DashboardHome.test.tsx` | heading present; create CTA absent |
| W13 | FR-008 inline create-event → ledger | `DashboardHome`, `EventFormPanel` | `pages/DashboardHome.test.tsx` **GAP**, `components/event/EventFormPanel.test.tsx` | new event selected; ledger shown |
| W14 | FR-009 venue switch clears event selection | `DashboardHome` | `pages/DashboardHome.test.tsx` | prior event cleared; venue B events load |
| W15 | FR-009a edit/delete out of scope | — | feature 015 suites | not in this matrix |
| W16 | FR-010 settings landing reachable; org + integrations nav | `SettingsLandingPage` | `pages/SettingsLandingPage.test.tsx` | cards present; navigation works |
| W17 | FR-011 Team card only for permitted users | `SettingsLandingPage` | `pages/SettingsLandingPage.test.tsx` | Team card shown/hidden by `useCanManageTeam` |
| W18 | FR-011 silent redirect from `/settings/team` | `TeamSettingsPage` | `pages/TeamSettingsPage.test.tsx` | redirect to `/settings`; no error |
| W19 | FR-012 placeholder org/integrations pages | `PlaceholderSettingsPage`, `App` | `pages/PlaceholderSettingsPage.test.tsx`, `App.test.tsx` | placeholder copy; routing intact |
| W20 | FR-012 rename forms deferred | — | future rename feature | not in this matrix |
| W21 | FR-013 invite form fields + email validation | `InviteMemberForm` | `components/team/InviteMemberForm.test.tsx` | fields present; invalid email blocked |
| W22 | FR-014 member list scoped data | `MemberList` | `components/team/MemberList.test.tsx` | email, role, scope summary |
| W23 | FR-014 invitation list scoped data | `InvitationList` | `components/team/InvitationList.test.tsx` | email, role, status, scope |
| W24 | FR-015 resend/cancel for pending; absent for accepted | `InvitationList` | `components/team/InvitationList.test.tsx` | actions match status |
| W25 | FR-015a edit modal save/cancel/last-admin | `MemberEditModal` | `components/team/MemberEditModal.test.tsx` | save persists; cancel aborts; last-admin error |
| W26 | FR-015b remove confirm pattern | `RemoveMemberConfirm` | `components/team/RemoveMemberConfirm.test.tsx` | confirm proceeds; cancel aborts |
| W27 | FR-016 team page integration | `TeamSettingsPage` | `pages/TeamSettingsPage.test.tsx` | invite form + lists render; submit invite |
| W28 | Edge: pending submit disabled | `CreateVenuePage`, `InviteMemberForm` | respective suites | submit disabled while pending |
| W29 | Edge: server error vs validation | `CreateVenuePage`, `InviteMemberForm` | respective suites | banner vs inline distinction |
| W30 | Edge: events load failure + retry | `DashboardHome` | `pages/DashboardHome.test.tsx` | alert + Retry button |
| W31 | Edge: stale venue fallback | `VenueContext` | `venue/VenueContext.test.tsx` | fallback to accessible venue |
| W32 | FR-018/FR-019 + SC-005 CI gate | full `apps/web` suite | CI (`vitest run --coverage`) | thresholds ≥80% satisfied |

## Contract rules

1. **Real source execution**: Each row renders/imports the actual module; stub only network/storage boundaries.
2. **Contract types only**: Fixtures from `@/types/generated-api` (Constitution VI).
3. **Scope fidelity**: Venue/event/member lists rendered verbatim from stubs (Constitution II).
4. **No duplicate ownership**: Auth/venue-switcher rows belong to feature 010; event edit/delete rows belong to feature 015; rename rows deferred.
5. **Silent redirect canonical**: W8 and W18 assert redirect without error messaging.
6. **Consolidation**: Extend existing files; de-duplicate when a row is already covered.

## Definition of Done (verification)

- All in-scope matrix rows (excluding W15, W20) have at least one passing test.
- **GAP** rows from baseline audit are closed during implementation.
- `vitest run --coverage` passes with thresholds met (W32 / SC-005).
- Suites run deterministically (SC-002) and within ~3 minutes locally (SC-003).
- Injected regression in permission gating or scope rendering fails at least one test (SC-004).
