# Quickstart & Validation Guide: Legacy Slate/Blue Color Token Migration (SPLR-91)

How to validate remaining hex-to-token migration. References [contracts/color-token-migration.md](./contracts/color-token-migration.md) and [data-model.md](./data-model.md).

## Prerequisites

- Node 22 + `npm install` in `apps/web`
- Branch `068-slateblue-token-migration`
- M4 dependency specs merged or rebased: `065-shared-button-styles`, `066-white-cream-containers`, `067-orange-alert-badges`
- M1 design tokens: `059-mhc-design-tokens` (`tests/theme/cssTokens.test.ts` passing)

## Run dev server

```bash
cd apps/web
npm run dev
```

Sign in and navigate to representative flows below.

## Automated tests (primary gate)

```bash
cd apps/web
npm run test -- tests/theme/legacyPalette.test.ts tests/theme/hexBudget.test.ts tests/theme/formFieldTokens.test.ts tests/theme/colorMigration.test.ts
npm run test:coverage
npm run build
```

**Expected**: All migration tests pass; existing theme tests unchanged; coverage ≥80% on modified files; build succeeds.

### Legacy denylist grep

```bash
cd apps/web
npm run test -- tests/theme/legacyPalette.test.ts
```

**Pass**: zero denylist matches (VR-001).

### Hex budget check

```bash
cd apps/web
npm run test -- tests/theme/hexBudget.test.ts
```

**Pass**: ≤5 hex literals outside `:root` (target 0) per FR-002.

### Raw hex grep (manual sanity)

```bash
cd apps/web
rg '#[0-9a-fA-F]{3,8}' src/index.css
```

**Pass**: matches only inside `:root` token block (lines 5–22 area). No `#fff`, `#dc2626`, `#fef3c7`, etc. in component rules.

### Component inline hex

```bash
cd apps/web
rg '#[0-9a-fA-F]{3,8}' src/components --glob '*.{tsx,ts,css}'
```

**Pass**: only `SignaturePad.tsx` `#111` (documented exception) or zero matches.

---

## Manual validation checklist

### Consistent palette (User Story 1)

1. **Settings layout**: Open settings. Header brown with cream text; content panels white on cream — no cool gray backgrounds.
2. **Dashboard empty state**: Trigger empty/error states. CTA and copy use warm palette; no slate or blue accents.
3. **Upcoming mini calendar**: Dashboard calendar day cells white with brown borders — not gray Tailwind tones.
4. **Financial health widget**: White container on cream page background.

### Form fields (User Story 2)

1. **Authentication**: Tab through login/register inputs. Default border subtle brown; focus ring orange; no blue outline.
2. **Team invite / venue forms**: Trigger validation error. Red error text and border; focus still orange when corrected.

### Status feedback (User Story 3)

1. **Team section**: Trigger success and error banners (invite flow). Success warm green tokens; error warm red tokens.
2. **Unassigned drawer**: Open accounting drawer with success/error states. Harmonized feedback colors; no cool `#ecfdf5` green leftover.
3. **Session expired**: Force session expiry notice (if testable). Warning-tone banner using brand tokens, not amber hex pills.

---

## FR migration audit

| FR | Surface | Pass criteria |
|----|---------|---------------|
| FR-001 | Global stylesheet | Denylist scan passes |
| FR-002 | Outside `:root` | Hex budget test passes |
| FR-003 | Form fields | Token test passes; visual brown/orange focus |
| FR-004 | Error banners/modals | Error token family only |
| FR-005 | Success/warning surfaces | Token references; session notice on warning tokens |
| FR-006 | `:root` | Success tokens only if ≥3 grouped refs |
| FR-007 | Components | No new brand hex except documented SignaturePad ink |

---

## Regression checks

- `tests/theme/buttons.test.tsx`, `badges.test.tsx`, `dataContainers.test.ts` MUST pass unchanged.
- Behavioral tests (auth, team, accounting, dashboard) MUST pass without assertion changes.
- Do not modify button, badge, or container CSS blocks owned by SPLR-88/89/90 unless fixing merge conflicts only.

---

## Related specs

- Tokens: `specs/059-mhc-design-tokens`
- Epic: `specs/058-brand-theming-mhc`
- Dependencies: `065-shared-button-styles`, `066-white-cream-containers`, `067-orange-alert-badges`
- Downstream: SPLR-94 (WCAG audit), SPLR-95 (automated color regression tests)
