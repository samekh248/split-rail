# Quickstart & Validation Guide: Shared Button Styles (SPLR-88)

How to validate shared primary and secondary button theming. References [contracts/shared-button-styles.md](./contracts/shared-button-styles.md) and [data-model.md](./data-model.md).

## Prerequisites

- Node 22 + `npm install` in `apps/web`
- Branch `065-shared-button-styles`
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
npm run test -- tests/theme/buttons.test.tsx tests/theme/legacyPalette.test.ts tests/theme/buttonMigration.test.ts
npm run test -- tests/onboarding/WelcomeModal.theme.test.tsx tests/onboarding/OrganizationCreateStep.theme.test.tsx
npm run test -- tests/settlement/FinalizeSettlementPanel.test.tsx tests/components/qbo/SyncAllButton.test.tsx
npm run test:coverage
npm run build
```

**Expected**: All button theme and migration tests pass; existing behavioral tests unchanged; coverage ≥80% on modified files; build succeeds.

### Legacy slate grep (FR-007)

```bash
cd apps/web
rg '#1[eE]293[bB]' src --glob '*.{css,tsx,ts}'
```

**Pass**: no matches in submit-style button styling (denylist scan in `legacyPalette.test.ts` covers `index.css`).

### Token hygiene in button CSS block

```bash
cd apps/web
rg 'background:\s*#' src/index.css
```

**Pass**: no hardcoded hex backgrounds in button rules — accent/brown/cream via `var(--color-*)` only.

---

## Manual validation checklist

### Primary buttons (User Story 1)

1. **Login** (`/login`): submit button is Alpine Sunset orange, white bold label, rounded corners.
2. **Welcome modal** (first sign-in): "Get started" dismiss is orange primary styling.
3. **Dashboard empty state**: trigger an error/empty view → "Retry" button matches primary style.
4. **Accounting overview**: "Sync all" compact orange button in toolbar area.
5. **Event ledger**: "Sync Now" compact orange button; "Lock Budget" compact orange when visible.
6. **Settlement finalize**: draw signature, check confirm → "Finalize Settlement" is orange primary (not browser default gray).

For each: hover darkens accent slightly; Tab shows focus ring; disabled state is muted when form invalid.

### Secondary buttons (User Story 2)

1. Open a form with cancel + submit (e.g., team modal, event form, auth secondary action).
2. Confirm cancel/secondary uses brown border and text on white/cream — **not** orange fill.
3. Confirm primary submit beside it is clearly more prominent.

### Desktop and mobile

1. Repeat primary CTA checks at ≤768px — styling unchanged (colors are not viewport-gated).

---

## FR-005 migration audit

| Surface | Route / trigger | Pass criteria |
|---------|-----------------|---------------|
| Auth submit | `/login`, `/register` | Orange primary |
| Welcome dismiss | First-login modal | Orange primary |
| Dashboard retry | Empty/error dashboard | Orange primary |
| Sync now | Event ledger | Compact orange primary |
| Sync all | Accounting overview | Compact orange primary |
| Finalize settlement | Event ledger settlement panel | Orange primary |

---

## Regression checks

- Existing Playwright/Vitest behavioral tests for sync, finalize, and auth MUST pass without assertion changes to click handlers or API mocks.
- QBO sync permissions gating unchanged (`useCanTriggerQboSync`).
- Settlement finalize still requires signature + checkbox before enabling button.

---

## Related specs

- Tokens: `specs/059-mhc-design-tokens`
- Epic: `specs/058-brand-theming-mhc`
- Downstream: SPLR-91 (legacy hex migration), SPLR-92 (auth layout), SPLR-93 (onboarding flows)
