# Data Model: White-on-Cream Data Container Theming (SPLR-89)

This feature introduces **no persisted entities, API payloads, or database tables**. The model covers **shared data-container presentation classes**, **table header styling**, **depth treatments**, and **validation rules** — all client-side CSS and component className contracts.

## Data container entity (shared surface)

Applies to grouped selectors: `.block-section`, `.ledger-grid__summary`, `.artist-deal-panel`, `.ledger-grid__artists`, `.event-card` (and modal panel `.welcome-modal` with overlay-specific shadow).

| Attribute | Value |
|-----------|-------|
| Purpose | Bounded region presenting grouped financial or event information above cream workspace |
| Background | `var(--color-surface-white)` |
| Border | `1px solid var(--color-border-subtle)` |
| Corner radius | `var(--radius-card)` (8px) |
| Depth (inline cards) | `box-shadow: var(--shadow-soft)` |
| Depth (modal panel) | `box-shadow: var(--shadow-modal)` |
| Primary text | `var(--color-primary-brown)` on container body |
| Muted text | `var(--color-text-muted)` for secondary labels |

### Modal overlay entity (`.welcome-modal`)

| Attribute | Value |
|-----------|-------|
| Backdrop | `rgba(62, 39, 35, 0.5)` brown scrim (existing) |
| Panel | Same white surface entity; stronger modal shadow |
| Title typography | `var(--font-brand)`, Lodgepole Brown |
| Body typography | `var(--font-ui)`, muted brown |

## Table header row entity (`.ledger-table th`)

| Attribute | Value |
|-----------|-------|
| Purpose | Column labels in ledger grid tables |
| Background | `var(--color-bg-cream)` — warm cream-derived tint |
| Text | `var(--color-primary-brown)` via inherited body color |
| Border | `1px solid var(--color-border-subtle)` (cell borders via table rules) |
| Sticky behavior | When sticky, MUST retain cream header background (spec edge case) |

## Table body entity (`.ledger-table td`)

| Attribute | Value |
|-----------|-------|
| Background | Inherits white from parent container (`.block-section`) |
| Text | `var(--color-primary-brown)` |
| Inputs | `.ledger-input` uses token border and focus ring |

## In-scope selector matrix (FR-001 / FR-006)

| Component | CSS hook | TSX source | Milestone action |
|-----------|----------|------------|------------------|
| Ledger block section | `.block-section` | `BlockSection.tsx` | VERIFY CSS |
| Ledger summary strip | `.ledger-grid__summary` | `LedgerGrid.tsx` | VERIFY CSS |
| Artist deal panel | `.artist-deal-panel` | `ArtistDealPanel.tsx` | VERIFY CSS |
| Ledger artists wrapper | `.ledger-grid__artists` | `LedgerGrid.tsx` | VERIFY CSS |
| Dashboard event card | `.event-card` | `EventCard.tsx` | **MODIFY CSS** (`#fff` → token + depth) |
| Welcome / team modals | `.welcome-modal` | `WelcomeModal.tsx`, team modals | VERIFY CSS |
| Auth sign-in card | `.auth-layout__card` | `AuthLayout.tsx` | VERIFY only (M5) |
| Ledger table headers | `.ledger-table th` | `BlockSection.tsx` / ledger table markup | VERIFY CSS |

## Nested container rules

| Scenario | Rule |
|----------|------|
| White card inside white panel | Inner container MAY omit shadow; MUST retain border or spacing gap ≥ existing padding |
| Compact summary (`.ledger-grid__summary`) | MAY use reduced padding; MUST keep white background and depth treatment |
| Empty / loading inside card | MUST NOT reintroduce legacy gray panel backgrounds |

## Brand token map (consumption only — no new tokens required)

| Token | Usage in container styles |
|-------|----------------------------|
| `--color-surface-white` | Container panel background |
| `--color-bg-cream` | Page workspace; table header tint |
| `--color-border-subtle` | Container and table cell borders |
| `--color-primary-brown` | Primary text on white surfaces |
| `--color-text-muted` | Secondary text on white surfaces |
| `--radius-card` | Container corner radius (8px) |
| `--shadow-soft` | Inline card elevation |
| `--shadow-card` | Auth card elevation (alias of soft) |
| `--shadow-modal` | Modal panel elevation |
| `--font-brand` | Modal / section titles |
| `--font-ui` | Body and table data |

## Validation rules

| ID | Rule |
|----|------|
| VR-001 | In-scope container selectors MUST use `background: var(--color-surface-white)` — no `#fff` / `#ffffff` literals |
| VR-002 | In-scope containers MUST define `border: 1px solid var(--color-border-subtle)` OR equivalent token border |
| VR-003 | In-scope inline containers MUST use `border-radius: var(--radius-card)` unless layout-specific override documented |
| VR-004 | `.ledger-table th` MUST use `background: var(--color-bg-cream)` — NOT `#f8fafc` or cool-gray hex |
| VR-005 | `.event-card` MUST appear in the shared container selector group or match identical token properties |
| VR-006 | Modal panels (`.welcome-modal`) MUST use white surface + `--shadow-modal` |
| VR-007 | No `LEGACY_HEX_DENYLIST` values in in-scope container/table rules in `index.css` |
| VR-008 | Container color rules MUST NOT introduce hardcoded brand palette hex outside `:root` token block |
| VR-009 | Component `data-testid` values and render behavior MUST remain unchanged |

## Out of scope entities

| Entity | Deferred to |
|--------|-------------|
| Settings layout cards (`.settings-nav__item`, `.settings-layout__content`) | SPLR-91 legacy hex migration |
| Alert badge colors on event cards (variance/alert chips) | Later M4 badge milestone |
| Full application `#fff` audit | SPLR-91 |
| Authentication flow redesign | M5 (SPLR-92) |
