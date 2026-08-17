# Phase 0 Research: Venue Visual Cleanup

All Technical Context items resolved — no `NEEDS CLARIFICATION` markers remain. Decisions grounded in the current `apps/web` event workspace on branch `084-venue-visual-cleanup`.

## D1. Why the festival section sits closer to the edges

**Decision**: Introduce a shared `.event-workspace` wrapper around `FestivalModeCard` and `EventLedgerPage` in `EventWorkspacePage.tsx`, and move the ledger’s `max-width: 1200px` plus horizontal padding onto that wrapper.

**Rationale**: `FestivalModeCard` is a sibling of `EventLedgerPage`, not a child. `.event-ledger-page` currently owns `max-width: 1200px; margin: 0 auto; padding: 1.5rem 1.25rem 2.5rem`, while `.festival-mode-card` has only card padding and `margin-bottom: 1rem`. Both sit inside `.app-shell__content`, which already applies `--shell-content-padding-x` (2rem desktop / 1rem narrow). The festival card therefore uses only the shell inset; the ledger adds a second inset. There is also no `.dashboard-home` CSS, so the page wrapper contributes nothing.

**Alternatives considered**:
- Give `.festival-mode-card` its own copy of the ledger max-width/padding — rejected: two independent insets will drift the next time either surface changes.
- Nest `FestivalModeCard` inside `EventLedgerPage` — rejected: festival is event-workspace chrome, not ledger data, and would couple QBO/ledger loading states to festival rendering.
- Remove ledger padding and rely only on shell padding — rejected: other 1200px pages (`venues-page`, `booking-calendar-page`) use the inner max-width pattern; the bug is inconsistency between siblings, not the inner constraint itself.

## D2. How to right-align section-level primary actions application-wide

**Decision**: Add a small shared CSS pattern — `.section-header` + `.section-header__actions` — and opt existing authenticated section headers into it. Do not create a React `SectionHeader` component unless markup duplication becomes worse than CSS reuse.

**Rationale**: Spec FR-003 is a placement rule, not a new widget. Several headers already implement the desired layout (`ledger-grid__header` uses `justify-content: space-between`; `venues-page__header` does the same; itinerary title uses `flex: 1` to push **Add block** right). The failures are one-off left-aligned action rows and the empty Sync Now toolbar. A CSS utility lets existing BEM blocks keep their names while converging on one wrap/alignment behavior, including `margin-left: auto` on the action cluster and `justify-content: flex-end` when the header stacks at `max-width: 768px`.

**Alternatives considered**:
- New `SectionHeader` React component wrapping every title/action pair — rejected: high churn across unrelated pages for a CSS concern; modal/empty-state exclusions become prop soup.
- Change only festival + Sync Now — rejected: FR-003 explicitly covers authenticated section-level primaries across the application.
- Flex the primary button itself with `margin-left: auto` and no header pattern — rejected: secondary actions would not stay grouped with the primary (spec edge case).

## D3. Section-level primary action inventory

**Decision**: Treat a control as in-scope when it is the primary action of a discrete authenticated content section’s header or action row. Apply the shared pattern to the following surfaces; leave the listed exclusions untouched.

**In-scope (must end right-aligned at desktop width)**:

| Surface | Current placement | Change |
|---|---|---|
| Event ledger hero (`Lock Budget`) | Already right via `ledger-grid__header` | Keep; become the host cluster for Sync Now |
| Event Sync Now | Standalone `.event-ledger-page__toolbar` with `justify-content: flex-end` and no title | Move into ledger hero actions (D4) |
| Festival convert prompt | Already `space-between` | Keep; verify after shared inset |
| Festival itinerary **Add block** | Already pushed right by flex title | Keep |
| Venues page header actions | Already `space-between` | Keep |
| Accounting **Sync all** | Already `margin-left: auto` | Keep; do not relocate (venue-wide control, already consistent) |
| QBO integration **Connect / Reconnect** | Left-aligned `.qbo-integration-card__actions` below body copy | Move/align as the section action cluster on the right |
| Finalize Settlement primary | Left-aligned `btn-primary` after the signature form | Right-align within the section action row; do not move it into a disconnected header above required inputs |

**Out of scope** (spec assumptions):

- Global navigation and shell chrome
- Modal confirmation/dismiss actions (`ConflictDialog`, `QboDisconnectModal`, `WelcomeModal`, team/venue modals)
- Full-page empty-state CTAs and retry buttons (`.dashboard-empty__cta`, `.dashboard-empty__retry`)
- Auth/onboarding submits (`LoginForm`, `RegisterForm`, `OrganizationCreateStep`)
- Compact inline row controls (ledger row actions, stage delete, artist row actions, mapping tabs)
- Form-internal secondary/cancel buttons

**Rationale**: Matches the spec’s definition of “primary button” and avoids restyling every orange button in the app. Finalize Settlement stays visually in the completion flow (checkbox + signature must remain associated) but the button itself is right-aligned in its action row.

**Alternatives considered**:
- Right-align every `.btn-primary` via global CSS — rejected: would break auth forms, empty states, and modal footers excluded by the spec.
- Skip QBO Connect because it is not on the event page — rejected: FR-003 is application-wide for section-level primaries.

## D4. Where Sync Now belongs

**Decision**: Render `SyncNowButton` inside the ledger hero action cluster (`.ledger-grid__header` / `.section-header__actions`) next to **Lock Budget**. Move `data-testid="workspace-focus-sync"` onto that cluster (or a wrapper around the rendered Sync Now control). Delete `.event-ledger-page__toolbar` once unused.

**Rationale**: The current toolbar is a flex-end row with a single button and no heading, sitting between the festival card and Unmapped Banner / ledger. That is the “floating in the middle of nowhere” symptom. The ledger hero already names the event and hosts the other event-level primary (**Lock Budget**), so Sync Now’s scope becomes the event without a new chrome bar. `WORKSPACE_FOCUS_TARGETS.sync` can keep the same test id; `scrollToWorkspaceFocus('sync')` continues to find a real action area.

**Permission / empty-space rule**: `SyncNowButton` already returns `null` when `useCanTriggerQboSync()` is false. Do not keep an empty toolbar/cluster in that case. If **Lock Budget** is also hidden, the hero still has the event title, so no blank action row remains. Attach `workspace-focus-sync` only when the Sync Now control is present, or attach it to the header itself without adding extra height when the button is absent — prefer the header so dashboard `?focus=sync` still lands on the event action area even if the operator cannot sync.

**Pending state**: Keep the existing label swap (`Syncing…`) and `disabled={triggerSync.isPending}`. Size the action cluster so the wider pending label does not shove the title (flex + gap already used by `ledger-grid__header`).

**Alternatives considered**:
- Put Sync Now on `FestivalModeCard` — rejected: sync is QBO/ledger scoped, and the card is hidden for standard events without festival-manage permission.
- Put Sync Now in the shell workspace bar beside the event combobox — rejected: mixes global chrome with an event mutation; FR-006 asks for an event action area, not a new top-bar control.
- Leave it in the toolbar and only add a label — rejected: a labeled floating row still sits apart from the event header the operator already scans.

## D5. Narrow-viewport wrapping

**Decision**: Reuse the existing `768px` ledger breakpoint. When a section header stacks, the action cluster goes full-width and `justify-content: flex-end` so the primary stays on the right edge of the section, not the left. Festival and ledger share the wrapper’s reduced padding (`1rem` to match current `.event-ledger-page` narrow padding) so neither overflows.

**Rationale**: `.ledger-grid__header` already switches to `flex-direction: column; align-items: stretch` at 768px. Extending that to the shared pattern satisfies FR-002/FR-004/SC-004 without a new breakpoint. Secondary actions wrap with the primary rather than overlapping titles.

**Alternatives considered**:
- Hide section primaries behind a kebab on narrow screens — rejected: out of scope and reduces discoverability of Sync Now / Lock Budget.
- Keep actions on one row with overflow scroll — rejected: SC-004 forbids horizontal scrolling of affected views.

## D6. Test strategy

**Decision**: Vitest + RTL only, following existing page/component/theme tests.

1. **Page tests** (`EventWorkspacePage.test.tsx`, `EventLedgerPage.test.tsx`): festival card and ledger share the workspace wrapper; no `.event-ledger-page__toolbar`; `workspace-focus-sync` still exists when the ledger hero renders; no empty action row without sync permission.
2. **Component tests**: new `FestivalModeCard.test.tsx` for convert vs active festival rendering and right-aligned convert action; `LedgerGrid` coverage that Sync Now (when provided) renders in the hero actions with Lock Budget; existing `SyncNowButton.test.tsx` remains the permission/pending contract.
3. **CSS contract** (`tests/theme/sectionHeader.test.ts`): assert `.section-header` / `.section-header__actions` (or the final class names) include right alignment and a wrap-friendly narrow rule, same style as `tests/theme/buttons.test.tsx`.
4. **Regression**: `workspaceFocusScroll.test.ts` keeps the `workspace-focus-sync` selector; `buttonMigration.test.ts` stays valid because Sync Now still uses `btn-primary--compact`.

Playwright is not required: this is a single-user layout change with no tenant-isolation workflow (Constitution III).

**Rationale**: FestivalModeCard currently has no dedicated test file; Constitution III requires verification on modified components. CSS contract tests are the established way this repo locks layout tokens without screenshot tests.

**Alternatives considered**:
- Visual snapshot/Playwright screenshot tests — rejected: higher flake cost for a spacing fix already expressible via classes and document structure.
- Backend tests — N/A; no API change.

## D7. No data or API work

**Decision**: Do not add DTOs, endpoints, feature flags, or generated-api types. `SyncNowButton` continues to use `useTriggerSync` / `useCanTriggerQboSync`. Festival visibility continues to use `event.eventType` and `useCanManageFestivalSchedule`.

**Rationale**: Spec assumptions state this feature introduces no new data, permissions, or backend behavior. FR-007/FR-008 require functional parity.

**Alternatives considered**: None — a layout-only change does not justify a contract regeneration cycle (Constitution VI).
