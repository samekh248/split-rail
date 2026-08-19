# Implementation Plan: Venue Visual Cleanup

**Branch**: `084-venue-visual-cleanup` | **Date**: 2026-08-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/084-venue-visual-cleanup/spec.md`

## Summary

Align the event-details festival card with the rest of the event workspace, put every authenticated section-level primary action on the right of its header or action row, and move the event-level Sync Now control out of a floating toolbar into the ledger hero action area. This is a frontend-only presentation change: a shared event-workspace inset, a reusable section-header action pattern in `index.css`, and targeted component markup updates. No API, DTO, permission, or QBO-sync behavior changes.

## Technical Context

**Language/Version**: TypeScript 5.7 (React 18.3), consuming the existing ASP.NET Core 8 / C# API (unchanged by this feature)

**Primary Dependencies**: Existing event workspace pages (`EventWorkspacePage`, `EventLedgerPage`), `FestivalModeCard`, `SyncNowButton`, Montana High Country CSS tokens and shared `.btn-primary` / `.btn-primary--compact` classes, Vitest + React Testing Library

**Storage**: N/A — no persistence, schema, or client-storage changes

**Testing**: Vitest + React Testing Library for layout wrappers, section-header action placement, Sync Now relocation, and CSS contract assertions; ≥80.0% line/branch coverage on changed frontend code (Constitution III). No backend tests or Playwright E2E — this is a single-user presentational change.

**Target Platform**: Browser-based web application (desktop and existing narrow-viewport breakpoints)

**Project Type**: Web application; frontend-only vertical slice in `apps/web`

**Performance Goals**: No new runtime cost; layout must not introduce horizontal overflow or unexpected action-row shift during Sync Now pending state

**Constraints**: Reuse existing design tokens, breakpoints, and button classes; no handwritten API types (Constitution VI); Sync Now permission, disabled, and pending behavior must remain identical (FR-007); empty-state, modal, auth, and inline compact controls stay out of scope per spec assumptions; no `deploy/` scripts

**Scale/Scope**: Event workspace layout (festival card + ledger), one shared CSS section-header pattern, a bounded inventory of authenticated section-level primary actions, and focused Vitest coverage; no new routes or entities

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Relevance | Status |
|---|---|---|
| I. Core Mathematical Axioms | No monetary calculations. | N/A |
| II. Multi-Tenant Isolation | No data retrieval or mutation changes. | N/A |
| III. Engineering Rigor | Add focused Vitest + RTL coverage and retain ≥80% coverage on changed frontend code. | PASS |
| IV. QBO Integration | Sync Now remains a read-only pull trigger already in the product; this feature only repositions the control. | PASS |
| V. Ledger State Machine | No ledger mutations. | N/A |
| VI. Polyglot Contract | No API contract changes or handwritten API types. | PASS |
| VII. EF Core Axioms | No backend persistence work. | N/A |
| VIII. Exception Governance | Existing Sync Now error surfacing via mutation state is unchanged. | PASS |
| IX. UI Iconography | No new icons; existing Font Awesome usage on festival and QBO surfaces is reused. | PASS |
| X. Dual-Platform Operator Scripts | No operator scripts. | N/A |

**Result**: PASS — no violations; no entries required in Complexity Tracking.

**Post-design re-check**: PASS. The design stays within existing SPA layout, CSS, and component boundaries. Sync Now keeps its current mutation, permission gate, and `workspace-focus-sync` deep-link hook.

## Project Structure

### Documentation (this feature)

```text
specs/084-venue-visual-cleanup/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── event-workspace-layout.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Created later by /speckit-tasks
```

### Source Code (repository root)

```text
apps/web/
├── src/
│   ├── index.css                                      # Shared workspace inset + section-header action pattern
│   ├── pages/
│   │   ├── EventWorkspacePage.tsx                     # Wrap festival card + ledger in shared inset
│   │   └── EventLedgerPage.tsx                        # Remove floating toolbar; keep focus hook
│   ├── components/
│   │   ├── festival/FestivalModeCard.tsx              # Consume shared inset; keep convert action on the right
│   │   ├── ledger/LedgerGrid.tsx                      # Host Sync Now in the event hero action cluster
│   │   ├── qbo/SyncNowButton.tsx                      # Unchanged behavior; may accept a className/wrapper hook
│   │   ├── qbo/QboIntegrationCard.tsx                 # Right-align section primary (Connect / reconnect)
│   │   └── settlement/FinalizeSettlementPanel.tsx     # Right-align section primary
│   └── lib/
│       └── workspaceFocusScroll.ts                    # Keep sync target; retarget to the new action cluster
└── tests/
    ├── pages/
    │   ├── EventWorkspacePage.test.tsx                # Shared inset wraps festival + ledger
    │   └── EventLedgerPage.test.tsx                   # No empty toolbar; focus target still present
    ├── components/festival/
    │   └── FestivalModeCard.test.tsx                  # New: spacing/alignment classes and convert action
    ├── components/ledger/
    │   └── LedgerGrid.test.tsx                        # Sync Now lives in the hero action cluster
    ├── qbo/
    │   └── SyncNowButton.test.tsx                     # Permission / pending / class behavior unchanged
    └── theme/
        └── sectionHeader.test.ts                      # CSS contract for shared header/action alignment
```

**Structure Decision**: Keep ownership in the existing event workspace and shared CSS. `EventWorkspacePage` owns the shared inset that currently diverges because `FestivalModeCard` is a sibling of padded `EventLedgerPage`. `LedgerGrid` already has a right-aligned hero action (`Lock Budget`); that cluster is the event-scoped home for Sync Now. Other authenticated section primaries opt into a shared CSS pattern instead of one-off floats.

## Implementation Phases

### Phase A — Shared event-workspace inset (P1)

1. Wrap `FestivalModeCard` and `EventLedgerPage` in a single `.event-workspace` container on `EventWorkspacePage`.
2. Move the ledger page’s `max-width` / horizontal padding onto that shared wrapper so festival and ledger share one inset.
3. Remove the festival card’s extra edge-hugging margins so it matches adjacent workspace cards at desktop and narrow widths.

### Phase B — Section primary action pattern (P1)

1. Add shared `.section-header` / `.section-header__actions` rules (or equivalent modifiers on existing BEM headers) that right-align the primary action and wrap cleanly.
2. Apply the pattern to authenticated section-level primaries in the inventory from [research.md](./research.md), excluding auth, modal, empty-state, and inline compact controls.
3. Preserve secondary actions as a grouped, visually subordinate cluster beside the primary.

### Phase C — Contextual Sync Now (P2)

1. Relocate Sync Now from `.event-ledger-page__toolbar` into the ledger hero action cluster.
2. Keep `data-testid="workspace-focus-sync"` on the action cluster (not an empty standalone row) so dashboard deep-links still scroll/focus.
3. Render no empty action area when the operator lacks sync permission.

### Phase D — Verification (P1–P2)

1. Cover festival/ledger shared inset, right-aligned section primaries, Sync Now placement, and the absent-permission case.
2. Confirm pending Sync Now label/disabled state does not shift the header.
3. Run focused Vitest tests, typecheck, and frontend coverage as required by the project gate.

## Complexity Tracking

> No constitution violations requiring justification.
