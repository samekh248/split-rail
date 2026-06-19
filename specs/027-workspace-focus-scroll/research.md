# Research: Workspace Focus Scroll Targets

**Feature**: `027-workspace-focus-scroll` | **Date**: 2026-06-18 | **Linear**: SPLR-67

## 1. Focus param propagation path

**Decision**: Read `focus` from `useEventWorkspaceRoute()` in `EventWorkspacePage` and pass it as an optional `focus?: WorkspaceFocus | null` prop to `EventLedgerPage`.

**Rationale**: `useEventWorkspaceRoute()` already exposes `focus: string | null` via `getWorkspaceFocusFromUrl()`. Prop drilling keeps scroll logic co-located with ledger DOM targets (FR-006). No new React context needed for a single parent→child hop.

**Alternatives considered**:
- React context for workspace focus → rejected; overkill for one consumer.
- Re-read URL inside `EventLedgerPage` → rejected; duplicates route hook and complicates tests.

## 2. Route hook must react to query-string changes

**Decision**: Extend `useEventWorkspaceRoute()` to track `window.location.search` (via `getWorkspaceFocusFromUrl()`) on every `popstate`, not only `pathname`.

**Rationale**: Re-navigation to the **same** event with a new `?focus=` value (FR-005a) changes the query string while pathname is unchanged. Current hook only updates `pathname` state, so focus would not re-trigger scroll.

**Alternatives considered**:
- Force pathname-only updates by always replacing full path → insufficient; same pathname case fails.
- Poll `location.search` on interval → rejected; event-driven popstate is sufficient because `pushPath`/`replacePath` dispatch `popstate`.

## 3. Scroll + keyboard focus implementation

**Decision**: New pure module `apps/web/src/lib/workspaceFocusScroll.ts` exporting:
- `WORKSPACE_FOCUS_TARGETS` map (`WorkspaceFocus` → root selector)
- `isRecognizedWorkspaceFocus(value: string | null): value is WorkspaceFocus`
- `scrollToWorkspaceFocus(focus: WorkspaceFocus, root?: HTMLElement): boolean` — uses `element.scrollIntoView({ block: 'start' })` then `querySelector` first focusable (`button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])`) within root; returns whether scroll ran.

**Rationale**: Centralizes TDD §6.3 mapping; testable without full page mount; avoids pixel offsets (FR-006). `scrollIntoView` is stable across viewports.

**Alternatives considered**:
- `window.scrollTo` with computed offsets → rejected; brittle on responsive layout.
- Per-component `useRef` chains only → rejected; harder to test mapping table in isolation.

## 4. Focus target selectors (TDD §6.3)

**Decision**: Map each `WorkspaceFocus` to existing `data-testid` roots:

| Focus | DOM target | First focusable fallback |
|-------|------------|--------------------------|
| `deal` | `[data-testid="artist-deal-panel"]` | Add artist / edit buttons inside panel |
| `settlement` | `[data-testid="ledger-grid"]` | `lock-budget-btn` or first settlement input |
| `signature` | `[data-testid="finalize-settlement-panel"]` | `signature-clear-btn` or canvas |
| `variance` | `[data-testid="variance-banner"]` | none (scroll-only per edge case) |
| `sync` | `[data-testid="event-ledger-page"]` toolbar wrapper (new `data-testid="workspace-focus-sync"`) | `sync-now-button` |

**Rationale**: Reuses established testids from ledger components. `variance-banner` is conditional (only when variances exist); helper returns `false` if missing — no error (edge case). Sync wraps toolbar + `UnmappedBanner` via a lightweight landmark wrapper.

**Alternatives considered**:
- New testid on every sub-panel → acceptable for sync wrapper only; avoid duplicating existing ids.

## 5. When to apply scroll

**Decision**: `EventLedgerPage` calls `scrollToWorkspaceFocus` in a `useEffect` when:
1. `focus` is a recognized value,
2. Ledger data has finished loading (`!isLoading && ledger`),
3. Dependencies include `focus`, `eventId`, `ledger` (re-run on event change and re-navigation).

Use `requestAnimationFrame` double-tick or `queueMicrotask` after paint if first attempt misses DOM (conditional panels).

**Rationale**: FR-003 defers until content exists; `FinalizeSettlementPanel` and `variance-banner` render conditionally.

**Alternatives considered**:
- Scroll on workspace page before ledger mount → rejected; targets not in DOM.
- `MutationObserver` → rejected; over-engineered for known load boundary.

## 6. Stripping focus on in-workspace navigation

**Decision**: No change to `navigateToEventWorkspace(venueId, eventId)` call sites — omitting third arg already builds path without `?focus=` (FR-007). Combobox `handleSelectEvent` and venue-switch effect already call without focus.

**Rationale**: Clarifications Q1/Q2; `buildEventWorkspacePath` only appends focus when provided.

**Alternatives considered**:
- Explicit `replacePath` to strip query on switch → redundant if navigation helper omits focus.

## 7. Invalid / unrecognized focus

**Decision**: `isRecognizedWorkspaceFocus` gate in `EventLedgerPage`; unknown strings no-op (FR-004). Empty string treated as unrecognized.

**Rationale**: Matches spec User Story 4; no user-facing error.

## 8. Testing strategy

**Decision**:
- `workspaceFocusScroll.test.ts` — mapping, recognized guard, scroll/focus mock behavior.
- `EventLedgerPage.test.tsx` — focus prop triggers scroll helper (mock module).
- `EventWorkspacePage.test.tsx` — passes focus from route hook; combobox navigation omits focus in URL (assert `window.location.search` empty).
- Extend `appRoute.test.ts` if hook search tracking added.

**Rationale**: Constitution III; SPLR-67 acceptance criteria; Playwright overview→workspace deferred to SPLR-68.

**Alternatives considered**:
- E2E only → rejected; slower feedback; Vitest covers wiring.

## 9. Backend scope

**Decision**: Frontend-only; no API, EF, or OpenAPI changes.

**Rationale**: Spec assumption; scroll is client UX on existing ledger layout.
