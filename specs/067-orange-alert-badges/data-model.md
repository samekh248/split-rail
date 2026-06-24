# Data Model: Alert and Action-Required Badges (SPLR-90)

This feature introduces **no persisted entities, API payloads, or database tables**. The model covers **shared badge presentation classes**, **semantic badge categories**, **surface migration targets**, and **validation rules** — all client-side CSS and component className contracts.

## Badge style entities

### Action-required badge (`.badge-action-required` / `.badge-alert`)

| Attribute | Value |
|-----------|-------|
| Purpose | Discrete label signaling user must take a workflow step |
| Background | `var(--color-accent-orange)` |
| Label color | `var(--color-surface-white)` |
| Typography | `var(--font-ui)`, weight 700, size `0.75rem` (~12px) |
| Shape | `border-radius: 9999px` (pill) |
| Padding | `0.125rem 0.625rem` (compact inline) |
| Display | `inline-block` or `inline-flex` when combined with flex layout BEM |

**Alias rule**: `.badge-alert` MUST share identical rules via grouped selector (no separate color variant).

### Variance flag — data cell (`.variance-cell--flagged`)

| Attribute | Value |
|-----------|-------|
| Purpose | Highlight non-zero/concerning variance **numeric value** in ledger grid |
| Background | `var(--color-warning-bg)` |
| Text color | `var(--color-accent-orange-hover)` or `--color-warning-text` |
| Typography | weight 600 |
| **Must NOT** | Use `.badge-action-required` or solid orange pill fill |

### Variance summary banner (`.ledger-grid__variance-banner`)

| Attribute | Value |
|-----------|-------|
| Purpose | Contextual message after reconciliation when variances exist |
| Presentation | Full-width banner with warning background/border tokens |
| **Must NOT** | Compact orange pill styling |

### Event-card variance indicator (`.event-card__variance-badge`)

| Attribute | Value |
|-----------|-------|
| Purpose | At-a-glance "Variance" label on dashboard event cards (data semantics) |
| Presentation | Warning-tone pill using `--color-warning-*` tokens |
| **Must NOT** | Solid Alpine Sunset orange with white text (reserved for action badges) |

### Neutral informational chip (e.g., `.event-card__booking-badge`)

| Attribute | Value |
|-----------|-------|
| Purpose | Non-action metadata (booking preview) |
| Presentation | Muted surface; unchanged by this feature |
| **Must NOT** | Receive `badge-action-required` class |

## FR-002 / FR-003 migration targets

| Component / surface | Required class | Selector / test id |
|---------------------|----------------|---------------------|
| EventCard bottleneck alert chips | `badge-action-required` | `[data-testid^="event-card-alert-"]` |
| UnmappedBanner action label | `badge-action-required` | `[data-testid="unmapped-banner"]` badge span |
| AccountingWorkloadList unassigned count | `badge-action-required` | `.accounting-workload-list__badge` |
| AccountingWorkloadList alert labels | `badge-action-required` | `.accounting-workload-list__alerts li` |
| EventCard variance badge | **No** `badge-action-required` | `[data-testid^="event-card-variance-"]` uses warning tokens only |
| Ledger variance cell | **No** `badge-action-required` | `[data-testid="variance-cell"][data-flagged="true"]` |
| Ledger variance banner | **No** `badge-action-required` | `[data-testid="variance-banner"]` |

## Semantic category model

```text
Operational alert label ──> badge-action-required (orange pill)
        │
        ├── EventCard bottleneck chip
        ├── UnmappedBanner count/label
        └── AccountingWorkloadList badges

Numeric variance data ──> warning tokens (NOT orange pill)
        │
        ├── variance-cell--flagged
        ├── ledger-grid__variance-banner
        └── event-card__variance-badge

Neutral metadata ──> muted chip (unchanged)
        └── event-card__booking-badge
```

## Brand token map (consumption only — no new tokens)

| Token | Usage in badge styles |
|-------|----------------------|
| `--color-accent-orange` | Action-required badge fill |
| `--color-surface-white` | Action-required badge label |
| `--color-warning-bg` | Variance cell / event-card variance badge background |
| `--color-warning-border` | Variance banner border |
| `--color-warning-text` | Variance banner text |
| `--color-accent-orange-hover` | Flagged variance cell emphasis text |
| `--font-ui` | Badge typography |

## Validation rules

| ID | Rule |
|----|------|
| VR-001 | `.badge-action-required` background MUST be `var(--color-accent-orange)` |
| VR-002 | `.badge-action-required` label color MUST be `var(--color-surface-white)` |
| VR-003 | `.badge-action-required` MUST use pill radius (`9999px`) and font-size `0.75rem`, weight 700 |
| VR-004 | `.badge-alert` MUST be grouped with `.badge-action-required` (identical rules) |
| VR-005 | All FR-002/FR-003 surfaces MUST include `badge-action-required` in TSX `className` |
| VR-006 | `.variance-cell--flagged` MUST NOT share background with `.badge-action-required` |
| VR-007 | `[data-testid^="event-card-variance-"]` MUST NOT have class `badge-action-required` |
| VR-008 | No legacy amber/red hex (`#fef3c7`, `#92400e`, `#fee2e2`, `#991b1b`) in event-card badge CSS blocks |
| VR-009 | Badge color rules MUST NOT introduce hardcoded brand palette hex outside `:root` token block |
| VR-010 | White-on-orange badge contrast MUST be ≥4.5:1 (WCAG AA normal text) |

## Out of scope entities

| Entity | Deferred to |
|--------|-------------|
| Bottleneck filter toggle (`.bottleneck-filter`) | Separate control styling; not a badge label |
| Profile / brand logo badge variants | Unrelated "badge" naming |
| Full `Badge.tsx` component API | Optional future refactor (SPLR-91+) |
| Backend alert enums or API fields | No data model changes |
