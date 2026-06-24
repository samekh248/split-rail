# Quickstart & Validation Guide: Alert and Action-Required Badges (SPLR-90)

How to validate orange pill badge theming. References [contracts/alert-badge-styles.md](./contracts/alert-badge-styles.md) and [data-model.md](./data-model.md).

## Prerequisites

- Node 22 + `npm install` in `apps/web`
- Branch `067-orange-alert-badges`
- M1 design tokens merged: `059-mhc-design-tokens` (`tests/theme/cssTokens.test.ts` passing)

## Run dev server

```bash
cd apps/web
npm run dev
```

Sign in and navigate to representative flows below.

## Automated tests (primary gate)

```bash
cd apps/web
npm run test -- tests/theme/badges.test.tsx tests/theme/badgeMigration.test.tsx tests/theme/contrast.test.ts
npm run test -- tests/components/dashboard/EventCard.theme.test.tsx tests/components/dashboard/EventCard.test.tsx
npm run test -- tests/qbo/UnmappedBanner.test.tsx
npm run test:coverage
npm run build
```

**Expected**: All badge theme and migration tests pass; existing behavioral tests unchanged; coverage ≥80% on modified files; build succeeds.

### Legacy hex grep (event-card badges)

```bash
cd apps/web
rg '#fef3c7|#92400e|#fee2e2|#991b1b' src/index.css
```

**Pass**: no matches after migration (VR-008).

### Token hygiene in badge CSS block

```bash
cd apps/web
rg '\.badge-action-required[\s\S]*background:\s*#' src/index.css
```

**Pass**: badge utility uses `var(--color-accent-orange)` only.

---

## Manual validation checklist

### Action-required orange pills (User Story 1)

1. **Dashboard event cards**: Find an event with bottleneck alerts (e.g., "Missing signature", "Variance review needed", unmapped accounts). Confirm each alert chip is a compact **Alpine Sunset orange pill** with **white bold text**.
2. **Event ledger — unmapped banner**: Open an event with unassigned QBO transactions. Confirm the notice includes an orange pill badge label (not plain brown text only).
3. **Accounting overview**: Open `/accounting` (or equivalent) with events needing attention. Confirm unassigned counts and alert labels use orange pills.
4. **Cross-surface consistency**: Compare event-card alert chips vs unmapped banner badge — same pill shape, color, and typography.

### Variance vs action distinction (User Story 2)

1. **Ledger grid**: Open a reconciled event with non-zero variances. Flagged variance **cells** use light warning background — **not** solid orange pills.
2. **Ledger variance banner**: When present, confirm banner-style warning block (full width, warning background) — not a compact orange pill.
3. **Event card with variance**: Card shows variance indicator in **warning tones** (warm/yellow background) separate from orange bottleneck alert chips on the same card.

### Contrast on brand backgrounds (User Story 3)

1. View orange pill badges on **white event cards** (dashboard) — text readable at a glance.
2. View badges on **cream page background** (dashboard behind cards) — pill edge and label remain distinct.
3. Tab through alert regions — focus rings visible; screen reader announces label text.

---

## FR-002 / FR-003 migration audit

| Surface | Route / trigger | Pass criteria |
|---------|-----------------|---------------|
| EventCard bottleneck chips | Dashboard recent events | Orange pill + `badge-action-required` class |
| UnmappedBanner | Event ledger with unmapped txns | Orange pill badge in notice |
| Accounting workload | Accounting overview | Orange pills on unassigned + alerts |
| EventCard variance badge | Dashboard card with variance | Warning tokens only — **no** orange pill |
| Ledger variance cell | Reconciled ledger | Warning cell — **no** orange pill |

---

## Regression checks

- Existing `EventCard.test.tsx` behavioral tests (quick links, pin, lifecycle) MUST pass without assertion changes to alert **logic**.
- `UnmappedBanner.test.tsx` expand/collapse behavior unchanged.
- `deriveBottleneckAlerts` / `eventCardSummary` unit tests unchanged (label strings only, not styling).

---

## Related specs

- Tokens: `specs/059-mhc-design-tokens`
- Epic: `specs/058-brand-theming-mhc`
- Adjacent M4: `specs/065-shared-button-styles` (SPLR-88)
- Downstream: SPLR-91 (legacy hex migration)
