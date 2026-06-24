# Quickstart & Validation Guide: White-on-Cream Data Container Theming (SPLR-89)

How to validate data card, modal, and table container theming. References [contracts/data-container-theming.md](./contracts/data-container-theming.md) and [data-model.md](./data-model.md).

## Prerequisites

- Node 22 + `npm install` in `apps/web`
- Branch `066-white-cream-containers`
- M1 design tokens merged: `059-mhc-design-tokens` (`tests/theme/cssTokens.test.ts` passing)
- Cream workspace background applied on content routes (SPLR-86) for full visual effect

## Run dev server

```bash
cd apps/web
npm run dev
```

Sign in and navigate to ledger and dashboard routes below.

## Automated tests (primary gate)

```bash
cd apps/web
npm run test -- tests/theme/dataContainers.test.ts tests/components/ledger/LedgerGrid.theme.test.tsx tests/components/dashboard/EventCard.theme.test.tsx
npm run test -- tests/ledger/LedgerGrid.test.tsx tests/components/dashboard/EventCard.test.tsx
npm run test -- tests/onboarding/WelcomeModal.theme.test.tsx
npm run test -- tests/theme/legacyPalette.test.ts
npm run test:coverage
npm run build
```

**Expected**: All container theme and existing behavioral tests pass; coverage ≥80% on modified files; build succeeds.

### Token hygiene in container CSS

```bash
cd apps/web
rg 'background:\s*#fff\b' src/index.css
```

**Pass**: no `#fff` in in-scope container selectors (`.event-card`, `.block-section`, etc.) — white via `var(--color-surface-white)` only.

### Cool-gray table header grep (FR-004)

```bash
cd apps/web
rg 'f8fafc|f1f5f9' src/index.css
```

**Pass**: no matches (denylist also enforced by `legacyPalette.test.ts`).

---

## Manual validation checklist

### Data cards on cream workspace (User Story 1)

1. **Event ledger** (`/events/:id/ledger`): block sections and summary strip appear as white cards with subtle depth on cream background.
2. **Artist deal panel** on same page: white panel consistent with block sections.
3. **Dashboard** (`/` or venue dashboard): event cards visually match ledger card treatment (white surface, soft shadow, rounded corners).
4. Side-by-side: ledger block section and dashboard event card share consistent background, border, and depth.

### Table headers (User Story 2)

1. On ledger page, expand a block with line items.
2. Confirm table header row uses warm cream tint (not cool gray).
3. Confirm body text is Lodgepole Brown and readable on white rows.

### Modals (User Story 3)

1. Trigger welcome modal (first sign-in) or team member edit modal.
2. Confirm modal panel is white with modal shadow on brown scrim backdrop.
3. Auth pages (`/login`): card is white on cream — verify only; no change required for M5 unless spec expands.

### Desktop and mobile

1. Repeat card and table checks at ≤768px — container colors are not viewport-gated.

---

## In-scope surface audit

| Surface | Route / trigger | Pass criteria |
|---------|-----------------|---------------|
| Block sections | Event ledger | White card, depth, cream page bg |
| Summary strip | Event ledger top | White card, depth |
| Artist deal panel | Event ledger artists | White card, depth |
| Event cards | Dashboard | White card (token, not `#fff`), depth |
| Welcome modal | First login | White modal panel |
| Ledger table headers | Event ledger grid | Cream tint headers |

---

## Regression checks

- Existing Vitest suites for `LedgerGrid`, `EventCard`, and `BlockSection` functional behavior MUST pass without assertion changes to CRUD, variance, or navigation handlers.
- No changes to API calls, permissions gating, or ledger editability rules.

---

## Related specs

- Tokens: `specs/059-mhc-design-tokens`
- Epic: `specs/058-brand-theming-mhc`
- Parallel M4: `specs/065-shared-button-styles`
- Downstream: SPLR-91 (legacy hex migration), SPLR-92 (auth layout M5)
