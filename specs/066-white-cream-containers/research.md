# Phase 0 Research: White-on-Cream Data Container Theming (SPLR-89)

All Technical Context items resolved. Decisions grounded in Linear SPLR-89, parent epic (`058-brand-theming-mhc`), dependencies `059-mhc-design-tokens` and cream background (SPLR-86), sibling milestone `065-shared-button-styles`, and current `apps/web` codebase on branch `066-white-cream-containers`.

## D1. Delivery mechanism — grouped CSS selectors vs shared React wrapper

**Decision**: Consolidate container styling via **grouped CSS selectors** in `apps/web/src/index.css`. Do **not** introduce a `Card.tsx` or `Surface.tsx` wrapper for this milestone.

**Rationale**:
- Linear SPLR-89 lists `index.css` and component CSS class hooks as primary repo paths.
- In-scope components already use stable BEM classes (`.block-section`, `.event-card`, `.welcome-modal`).
- Matches the CSS-first pattern established in SPLR-88 (`065-shared-button-styles`).

**Alternatives considered**:
- **`components/ui/Card.tsx` with variant prop**: cleaner long-term but expands scope beyond SPLR-89; would require refactoring every card call site.
- **CSS `@layer` or Tailwind `@apply`**: rejected — project uses plain CSS tokens, no Tailwind.

## D2. Depth treatment — border vs shadow vs both

**Decision**: Use **subtle border OR soft shadow**, not heavy stacking:
- Default data containers: `background: var(--color-surface-white)`, `border: 1px solid var(--color-border-subtle)`, `border-radius: var(--radius-card)`, `box-shadow: var(--shadow-soft)` (existing ledger pattern).
- Modals: retain stronger `var(--shadow-modal)` with white surface + subtle border (existing `.welcome-modal` pattern).

**Rationale**: Spec FR-002 warns against heavy border + shadow stacking. Current ledger containers already combine border + `--shadow-soft` lightly — acceptable baseline; event-card currently lacks shadow and uses `#fff`.

**Alternatives considered**:
- **Shadow-only (no border)**: rejected — borders aid nested white-on-white separation (spec edge case).
- **New `--shadow-card` everywhere**: `--shadow-soft` and `--shadow-card` are identical today; use `--shadow-soft` for inline cards, `--shadow-modal` for overlays.

## D3. Table header background — cream-derived tint

**Decision**: Table headers in ledger grids use **`var(--color-bg-cream)`** for `th` cells (already implemented on `.ledger-table th`). Do **not** introduce `#f8fafc` or other cool-gray literals. Optionally add `--color-table-header-bg: var(--color-bg-cream)` alias in `:root` if a semantic name aids SPLR-91 migration; not required if `.ledger-table th` remains the contract.

**Rationale**:
- Linear issue explicitly rejects slate `#f8fafc` headers.
- `--color-bg-cream` (#f4f1ea) is the canonical warm tint from M1 tokens.
- `legacyPalette.test.ts` already denylist `#f8fafc`.

**Alternatives considered**:
- **`--color-surface-muted`**: slightly different visual (6% brown overlay); cream is warmer and matches spec wording.
- **Global `th` background rule**: rejected — would affect settings tables outside scope; scope `.ledger-table th` and document in contract.

## D4. Gap analysis — current branch vs SPLR-89 acceptance

**Decision**: Treat container CSS as **~75% complete**; implement remaining gaps:

| Surface / selector | Current state | Gap |
|--------------------|---------------|-----|
| `.block-section` | Token white + border + shadow + `--radius-card` | ✅ Complete |
| `.ledger-grid__summary` | Token white + border + shadow | ✅ Complete |
| `.artist-deal-panel`, `.ledger-grid__artists` | Token white + border + shadow | ✅ Complete |
| `.welcome-modal` | Token white + border + `--shadow-modal` | ✅ Complete |
| `.auth-layout__card` | Token white + border + `--shadow-card` | ✅ Complete (M5 verify-only) |
| `.ledger-table th` | `background: var(--color-bg-cream)` | ✅ Complete |
| **`.event-card`** | **`background: #fff`**, border only, **no shadow**, `border-radius: 0.5rem` | **Align to tokens + depth + `--radius-card`** |
| Other `#fff` in `index.css` (settings nav, dashboard zones) | Hardcoded white | **Out of scope** — SPLR-91 unless selector is in FR-001 list |
| `LedgerGrid.theme.test.tsx` | Partial CSS contract | **Extend** for table headers, artist panel, event-card |
| `EventCard.theme.test.tsx` | Does not exist | **Add** class presence + optional CSS contract |

**Rationale**: FR-001/SC-001 require 100% of named primary containers; event-card is the largest visible gap on dashboard.

## D5. Selector consolidation strategy

**Decision**: Merge identical container property blocks into a **shared grouped selector** at the top of the container section:

```css
.block-section,
.ledger-grid__summary,
.artist-deal-panel,
.ledger-grid__artists,
.event-card { /* shared white-on-cream container base */ }
```

Retain component-specific layout rules (padding, flex, margins) on individual selectors below the shared block.

**Rationale**:
- Prevents future drift between ledger and dashboard cards (SC-001 side-by-side consistency).
- Reduces duplicate maintenance before SPLR-91 full hex migration.

**Alternatives considered**:
- **New `.surface-card` utility class on TSX**: requires TSX edits across components; CSS-only consolidation is lower risk for this milestone.
- **Leave duplicated blocks**: rejected — duplicates already diverged (event-card uses `#fff`).

## D6. Auth and modal scope boundary

**Decision**: **In-app operational modals** (`.welcome-modal`, team modals reusing `.welcome-modal` shell) are in scope and already tokenized. **Authentication card** (`.auth-layout__card`) is already aligned with tokens; spec allows M5 deferral — include in contract as reference-only with no mandatory change.

**Rationale**: Spec User Story 3 and Assumptions explicitly defer auth to M5 unless trivially aligned; current auth card already matches white container pattern.

## D7. Testing strategy

**Decision**: Three-layer verification:
1. **CSS contract file** (`dataContainers.test.ts`) — parse `index.css` for grouped selector token usage, deny `#f8fafc` in table header rules, assert `.event-card` uses `var(--color-surface-white)`.
2. **Extend** `LedgerGrid.theme.test.tsx` — `.ledger-table th` cream background, `.artist-deal-panel` white surface.
3. **Component smoke** — `EventCard.theme.test.tsx` asserts `.event-card` class on rendered card; optional computed-style checks deferred to CSS contract layer.

**Rationale**: Matches SPLR-88 button testing pattern (CSS contract + component class assertions). RTL computed styles are brittle in jsdom; CSS file parsing is stable.

**Alternatives considered**:
- **Playwright visual regression**: valuable but out of scope for this CSS milestone; manual quickstart covers visual audit.
- **Snapshot entire index.css**: too noisy; targeted regex contracts suffice.

## D8. Dependencies and ordering

**Decision**: Implementation may proceed once M1 tokens exist on branch (already present in `:root`). Full visual "pop off cream" requires cream workspace background on content routes (SPLR-86); container rules MUST remain valid on white fallback backgrounds (spec edge case).

**Rationale**: `:root` and `.event-ledger-page` already set cream; partial routes without cream still need readable containers.
