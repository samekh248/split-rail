# Phase 0 Research: Event Card Lifecycle Progress Bar

**Feature**: `077-event-card-progress-bar` | **Date**: 2026-07-02

## R1 — Milestone resolution utility (separate from dashboard phase)

- **Decision**: Add pure function `resolveEventCardProgressPosition(bookingPlacementStatus, eventDate, now?)` in `apps/web/src/lib/eventCardProgress.ts`, returning `{ activeMilestone, fillPercent, isCancelled }`. Reuse date parsing helpers from `eventLifecycle.ts` (`parseEventDate`, `startOfDay`, `isSameCalendarDay`) by exporting them or extracting shared `eventDateUtils.ts` if import cycles arise.
- **Rationale**: Progress milestones (Holds → Confirmed → Event date → Post-event) are **booking/calendar** stages, distinct from `deriveLifecyclePhase` (PreShow / NightOf / PostShow) used for quick links. A dedicated utility keeps FR-005 rules testable in isolation without conflating financial lifecycle.
- **Alternatives considered**: Extend `deriveLifecyclePhase` — rejected (different domain model, would break SPLR-64 consumers). Inline logic in EventCard — rejected (harder to test all edge-case branches).

## R2 — Hold 1 vs Hold 2 mapping

- **Decision**: Both `HOLD_1` and `HOLD_2` resolve to `activeMilestone: 'holds'` with identical `fillPercent` (first stop, ~0% or first-quarter fill per visual design). Tier distinction remains on `event-card__booking-badge` only (clarification session 2026-07-02).
- **Rationale**: User clarified single Holds bubble; booking badge already encodes tier via dashed styles.
- **Alternatives considered**: Sub-progress between Holds and Confirmed for Hold 2 — rejected (clarification).

## R3 — Cancelled placement treatment

- **Decision**: When `bookingPlacementStatus === 'CANCELLED'`, return `{ activeMilestone: null, isCancelled: true, fillPercent: 0 }`. UI applies modifier class `event-card__progress--cancelled` — all bubbles de-emphasized, no gradient fill, bar-level `aria-label` states "Cancelled booking".
- **Rationale**: Clarification chose full bar visible but no active milestone; avoids implying forward journey.
- **Alternatives considered**: Hide bar — rejected (clarification). Anchor at Holds — rejected (clarification).

## R4 — Legacy / missing placement and date

- **Decision**: `null`/`undefined` placement → treat as `CONFIRMED` (spec 073 migration rule). Missing `eventDate` → cap at `confirmed` milestone; `eventDate` and `postEvent` remain upcoming. Hold on show-day → Holds wins over calendar (clarification edge case).
- **Rationale**: Matches spec edge cases and existing `getBookingStatusLabel` fallback patterns.
- **Alternatives considered**: Unknown milestone — rejected (historical shows must display accurately).

## R5 — Component structure

- **Decision**: Extract `EventCardProgressBar` subcomponent at `apps/web/src/components/dashboard/EventCardProgressBar.tsx`; mount at bottom of `EventCard` `<article>` after main content. Props: `bookingPlacementStatus`, `eventDate`, `compact`, optional `now` for tests.
- **Rationale**: Keeps EventCard readable; enables focused Vitest file for progress bar interactions (tooltips, touch toggle, a11y).
- **Alternatives considered**: Inline JSX in EventCard only — rejected (progress bar has enough interaction/CSS to warrant separation).

## R6 — Gradient and design tokens

- **Decision**: CSS custom properties in `index.css`:
  - Track: `var(--color-surface-muted)` or `color-mix` on `--color-border-subtle`
  - Fill gradient: `linear-gradient(90deg, var(--color-accent-orange), var(--color-primary-brown))`
  - Bubble states: `--color-accent-orange` (active), `var(--color-primary-brown)` (completed), muted mix (upcoming), uniform muted (cancelled)
- **Rationale**: Uses existing MHC tokens from `:root` (spec 058/059); satisfies SC-005 without new hex literals. `color-mix` already used in event-card booking badge styles.
- **Alternatives considered**: SVG gradient — rejected (unnecessary complexity). Third-party progress component — rejected (no dependency in project).

## R7 — Compact label tooltips (hover, focus, touch)

- **Decision**: Lightweight controlled tooltip state in `EventCardProgressBar`:
  - Full cards: inline `<span class="event-card__progress-label">` under each bubble (abbreviated via CSS `text-overflow` on narrow widths if needed).
  - Compact: bubbles only; `openTooltipId` state toggles on `mouseenter`/`focus`, `click` (touch), dismiss on `blur`, outside click (`useEffect` + ref), or selecting another bubble.
  - Use `role="button"` + `tabIndex={0}` on bubbles for keyboard; `aria-label` per bubble always set (not tooltip-only).
- **Rationale**: No shared Tooltip library exists in codebase; booking badge uses native `title` but touch tap-toggle requires controlled popover per clarification Q4. Bubbles remain accessible without hover.
- **Alternatives considered**: Native `title` only — rejected (no touch support). Radix/shadcn tooltip — rejected (not in project deps).

## R8 — Test strategy

- **Decision**:
  - `eventCardProgress.test.ts` — pure milestone matrix (hold, confirmed, show-day, post-event, cancelled, missing date, legacy null placement, hold-on-show-day).
  - `EventCardProgressBar.test.tsx` — DOM, gradient classes, bubble states, compact tooltips (hover/focus/click), cancelled modifier, `aria-label`.
  - Extend `EventCard.test.tsx` — assert progress bar present at bottom in full + compact fixtures.
  - Optional theme regression in `EventCard.theme.test.tsx` — token class assertions.
- **Rationale**: Constitution III ≥80% on touched files; milestone matrix is highest regression risk.
- **Alternatives considered**: E2E-only — rejected (component slice sufficient; no multi-user flow).

## R9 — Backend / API impact

- **Decision**: None. Consume `bookingPlacementStatus` and `eventDate` already on `EventCardDto` / `EventResponse`.
- **Rationale**: FR-009; spec assumptions confirmed.
- **Alternatives considered**: New dashboard field for progress — rejected (derivable client-side).
