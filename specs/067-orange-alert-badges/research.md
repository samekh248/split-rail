# Phase 0 Research: Alert and Action-Required Badges (SPLR-90)

All Technical Context items resolved. Decisions grounded in Linear SPLR-90, parent epic (`058-brand-theming-mhc`), dependency `059-mhc-design-tokens`, and current `apps/web` codebase on branch `067-orange-alert-badges`.

## D1. Delivery mechanism — shared CSS utilities vs React `Badge` component

**Decision**: Implement shared styles as **CSS utility classes** in `apps/web/src/index.css` (`.badge-action-required` with `.badge-alert` as a grouped alias). Do **not** introduce a mandatory `Badge.tsx` wrapper for this milestone.

**Rationale**:
- Linear SPLR-90 lists `index.css` as the primary repo path.
- Epic branch already defines `.badge-action-required` with token references and a passing CSS contract test (`badges.test.tsx`).
- Matches established M4 pattern from SPLR-88 (CSS-first shared classes).

**Alternatives considered**:
- **`components/ui/Badge.tsx` with variant prop**: cleaner long-term but expands scope; defer to post-M4 refactor (SPLR-91+).
- **Inline Tailwind-style utilities**: rejected — project uses plain CSS tokens.

## D2. Alert vs action-required — single visual treatment

**Decision**: Use **one shared orange pill style** for both "alert" and "action-required" semantics. Add `.badge-alert` as a **grouped selector alias** of `.badge-action-required` (same rules, no separate color variant).

**Rationale**:
- Spec assumption: "The shared badge treatment covers both alert and action-required semantics with a single visual style."
- Linear SPLR-90 lists both class names as utilities; alias avoids duplicate rule maintenance.
- Semantic meaning conveyed through label text ("Missing signature", "3 unmapped accounts"), not color differentiation.

**Alternatives considered**:
- **Separate `.badge-alert` color variant**: rejected — spec and epic define one orange pill.
- **Only `.badge-action-required` without alias**: rejected — Linear explicitly requests both names; alias satisfies without drift.

## D3. Variance data vs action-required badges — semantic split

**Decision**: **Keep distinct styling** for three categories:

| Category | Visual treatment | CSS hook |
|----------|------------------|----------|
| Action-required / alert labels | Solid orange pill, white bold text | `.badge-action-required` / `.badge-alert` |
| Flagged variance table cells | Warning background, emphasized numeric text | `.variance-cell--flagged` (existing warning tokens) |
| Ledger variance summary banner | Banner-style warning block | `.ledger-grid__variance-banner` (existing warning tokens) |
| Event-card variance indicator | Warning-tone pill (data semantics) | `.event-card__variance-badge` migrated to warning tokens — **not** orange action pill |

**Rationale**:
- Spec FR-004/FR-005 and SPLR-90 scope note: "variance flags may stay yellow for data semantics OR align warnings to orange — document choice."
- Collapsing variance cells into orange pills blurs numeric review vs workflow to-do (User Story 2).
- `.variance-cell--flagged` already uses `--color-warning-bg` and `--color-accent-orange-hover` — correct pattern.

**Alternatives considered**:
- **Orange pills for all variance surfaces**: rejected — violates FR-004 and increases reconciliation risk.
- **Remove event-card variance badge entirely**: rejected — users need at-a-glance variance signal; restyle with tokens instead.

## D4. Gap analysis — epic branch vs SPLR-90 acceptance

**Decision**: Treat shared badge CSS as **~40% complete** on current branch; implementation gaps:

| Surface | Current state | Gap |
|---------|---------------|-----|
| `.badge-action-required` in `index.css` | Token-based pill CSS present | ✅ Base utility complete |
| `badges.test.tsx` CSS contract | Tests orange, white, radius, weight | Extend: font-size 0.75rem, `.badge-alert` alias |
| EventCard bottleneck chips | `event-card__alert-chip` with legacy amber hex (`#fef3c7`, `#92400e`) | Add `badge-action-required`; remove hex from chip block |
| EventCard variance badge | `event-card__variance-badge` with legacy red hex (`#fee2e2`, `#991b1b`) | Migrate to warning tokens; keep separate from orange pill |
| UnmappedBanner | CSS hook `.unmapped-banner .badge-action-required` exists; TSX has no badge | Add badge span in toggle label |
| AccountingWorkloadList | Plain text alerts; `accounting-workload-list__badge` unstyled | Apply `badge-action-required` to unassigned count + alert labels |
| Ledger variance banner | Warning banner styling; no orange pill | ✅ Correct per D3 — verify only |
| `.variance-cell--flagged` | Warning tokens | ✅ Correct per D3 — verify only |
| Bottleneck filter toggle | Pill button, not action badge | Out of scope per spec |

**Rationale**: Epic tasks T030–T036 marked complete for CSS utility creation but TSX migration to consume the class on event cards and QBO surfaces was incomplete.

## D5. Class composition strategy

**Decision**: Apply shared badge class **alongside** existing BEM layout classes (e.g., `className="event-card__alert-chip badge-action-required"`). Remove color/typography rules from BEM blocks where shared utility supersedes them; retain layout-only rules (margin, align-self, flex).

**Rationale**:
- Matches SPLR-88 button migration pattern (explicit shared class + BEM layout).
- Enables RTL `toHaveClass('badge-action-required')` without parsing CSS selector lists.
- FR-009 requires updating tests that assert legacy class-only styling.

**Alternatives considered**:
- **Replace BEM chip classes entirely**: loses component-specific layout hooks; keep BEM for structure only.

## D6. Contrast — white label on Alpine Sunset at 12px bold

**Decision**: Badge label uses `--color-surface-white` on `--color-accent-orange` at `0.75rem` (12px) weight 700. Add explicit contrast pairing to `tokens.ts`:

```typescript
{ id: 'white-on-orange-badge', foreground: colors.surfaceWhite, background: colors.accentOrange, minRatio: 4.5 }
```

Validate in `contrast.test.ts` via existing `contrastPairings` loop.

**Rationale**:
- Spec FR-008 / SC-003 require WCAG AA 4.5:1 for badge label size.
- `#FFFFFF` on `#E65100` computes to ~4.6:1 — passes normal text threshold.
- Existing CTA pairing uses 3.0 minRatio for large UI text; badges need stricter 4.5 entry.

**Alternatives considered**:
- **Rely on CTA 3.0 pairing only**: insufficient for 12px badge labels per spec.
- **Dark brown text on orange**: fails brand spec (white bold text required).

## D7. Test strategy

**Decision**: Three-layer verification (mirrors SPLR-88):

1. **CSS contract** (`badges.test.tsx`): token references, pill radius, font-size, weight, `.badge-alert` alias grouped with `.badge-action-required`.
2. **Migration contract** (`badgeMigration.test.tsx`): FR-002/FR-003 surfaces render elements with `badge-action-required` class; variance badge does NOT use orange pill class.
3. **Contrast** (`contrast.test.ts` + `tokens.ts`): badge white-on-orange pairing ≥4.5:1.
4. **Legacy hex denylist** (`legacyPalette.test.ts`): no `#fef3c7`, `#92400e`, `#fee2e2`, `#991b1b` in event-card badge blocks after migration.

**Rationale**: Constitution III requires automated verification; CSS file-read + component tests match M4 patterns without visual snapshot tooling.

**Alternatives considered**:
- **Playwright visual regression**: out of scope for badge-only milestone.

## D8. Dependency on design tokens

**Decision**: Hard dependency on `059-mhc-design-tokens` merged. All badge rules MUST use `var(--color-*)` — no hardcoded brand hex in badge blocks (warning tokens for variance surfaces allowed via existing `:root` definitions).

**Rationale**: SPLR-90 Linear lists M1 as dependency; tokens already present in `:root`.

**Alternatives considered**: None — blocked without tokens.
