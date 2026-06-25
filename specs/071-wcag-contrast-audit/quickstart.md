# Quickstart & Validation Guide: WCAG AA Contrast Audit (SPLR-94)

How to validate contrast audit completion and token remediation. References [contracts/wcag-contrast-audit.md](./contracts/wcag-contrast-audit.md) and [data-model.md](./data-model.md).

## Prerequisites

- Node 22 + `npm install` in `apps/web`
- Branch `071-wcag-contrast-audit`
- Dependency specs merged or rebased: `068-slateblue-token-migration` (SPLR-91), `069-theme-auth-layout` / welcome onboarding (SPLR-93)
- M1 design tokens and contrast helpers: `059-mhc-design-tokens` (`tests/theme/contrast.test.ts`, `designTokens.test.ts` passing)

## Run dev server

```bash
cd apps/web
npm run dev
```

Sign in and spot-check representative surfaces below.

## Automated tests (primary gate)

```bash
cd apps/web
npm run test -- tests/theme/contrast.test.ts tests/theme/designTokens.test.ts tests/theme/contrastAudit.test.ts
npm run test -- tests/auth/LoginForm.test.tsx
npm run test -- tests/theme/
npm run test:coverage
npm run build
```

**Expected**: All contrast pairings pass; audit markdown present and complete; LoginForm a11y test passes; theme suite green; coverage ≥80% on modified files; build succeeds.

### Contrast pairing gate

```bash
cd apps/web
npm run test -- tests/theme/designTokens.test.ts
```

**Pass**: Every `contrastPairings` entry meets its `minRatio` (VR-001).

### Audit document check

```bash
cd apps/web
npm run test -- tests/theme/contrastAudit.test.ts
```

**Pass**: `src/brand/contrast-audit.md` exists; contains all pairing ids; token changes documented (VR-002, VR-003).

### A11y regression check

```bash
cd apps/web
npm run test -- tests/auth/LoginForm.test.tsx
```

**Pass**: `associates field errors with inputs for a11y` and related assertions unchanged (FR-010).

## Manual spot-check checklist

After automated gates pass, visually confirm on `npm run dev`:

| Surface | Check |
|---------|-------|
| Dashboard | Brown body text readable on cream; muted captions legible |
| Ledger grid | White container borders visible but subtle; not harsh |
| Primary CTA button | White bold label on orange; disabled state still readable |
| Orange badge (`badge-action-required`) | White label on orange pill |
| Sidebar navigation | Cream labels on brown background; focus ring visible |
| Mobile top bar | Cream text/icons on brown chrome |
| Form fields | Brown border visible on white input; orange focus ring |
| Error/success banners | Text readable on tinted backgrounds |

## Token grep sanity

Confirm new semantic token is wired:

```bash
cd apps/web
rg "color-text-on-accent" src/index.css src/theme/tokens.ts
```

**Pass**: `--color-text-on-accent` in `:root`; CTA and badge groups reference `var(--color-text-on-accent)`.

Confirm disabled CTAs avoid opacity-only dimming:

```bash
cd apps/web
rg "btn-primary:disabled" -A5 src/index.css
```

**Pass**: uses `--color-accent-orange-disabled` / `--color-text-on-accent-disabled`; not `opacity: 0.6` alone.

## Border token verification

```bash
cd apps/web
rg "color-border-subtle" src/index.css
```

**Pass**: `:root` value achieves ≥3:1 vs white and cream per `designTokens.test.ts` ui-component pairings.

## Coverage gate

```bash
cd apps/web
npm run test:coverage
```

**Pass**: `src/theme/contrast.ts`, `src/theme/tokens.ts`, and new test files ≥80% line and branch coverage.

## Definition of done

- [ ] All `contrastPairings` pass in CI
- [ ] `apps/web/src/brand/contrast-audit.md` committed with before/after for changed tokens
- [ ] `--color-text-on-accent` semantic token live
- [ ] Border and disabled CTA remediations applied
- [ ] No theme or LoginForm a11y test regressions
- [ ] Frontend coverage ≥80% on touched files
