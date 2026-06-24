# Quickstart & Validation Guide: Brand Logo Component (SPLR-83)

How to validate SPLR-83 logo component. References [contracts/brand-logo.md](./contracts/brand-logo.md) and [data-model.md](./data-model.md).

## Prerequisites

- Node 22 + dependencies in `apps/web` (`npm install`)
- On branch `062-brand-logo-component`
- Logo PNG assets present under `apps/web/public/brand/` (SPLR-82): `sr-text.png`, `sr-badge.png`

## Run

```bash
cd apps/web
npm run dev      # http://localhost:5173
```

## Automated tests (primary verification)

```bash
cd apps/web
npm run test -- tests/theme/BrandLogo.test.tsx
npm run test:coverage   # ≥80% gate on BrandLogo.tsx
npm run build           # production build must succeed
```

**Expected**: All `BrandLogo` tests pass; build succeeds.

---

## SPLR-83 validation checklist

### 1. Asset registry

Open `apps/web/src/brand/assets.ts` and confirm:

| Constant | Path |
|----------|------|
| `BRAND_LOGO_TEXT` | `/brand/sr-text.png` |
| `BRAND_LOGO_BADGE` | `/brand/sr-badge.png` |

Grep for `/brand/sr-` — paths MUST appear only in `assets.ts`:

```bash
cd apps/web
rg '/brand/sr-' --glob '!src/brand/assets.ts'
```

**Pass**: no matches outside `assets.ts`.

### 2. Component API

Open `apps/web/src/components/brand/BrandLogo.tsx`:

- Accepts `variant: 'text' | 'badge'` (required)
- Optional `className`, `alt` defaulting to `'Split-Rail'`
- Renders `<img>` with `src` from `assets.ts` constants
- Wrapper uses class `brand-logo-wrapper`

### 3. CSS layout

In `apps/web/src/index.css` under `/* Brand logo */`:

- `.brand-logo-wrapper` has `padding: 1.5rem` (24px)
- `.brand-logo--text` has `max-height: 2.5rem`
- `.brand-logo--badge` has `width`/`height` `2.5rem`

### 4. Isolated render check (Storybook alternative)

With dev server running, temporarily render in a test page or use Vitest debug:

```bash
npm run test -- tests/theme/BrandLogo.test.tsx
```

Confirm four SPLR-83 cases pass (text, badge, custom alt, className).

### 5. Manual visual check (optional, requires SPLR-84 wiring or temp mount)

If logo is wired in sidebar (epic branch may already have this):

1. Expand sidebar → wordmark centered with comfortable padding.
2. Collapse sidebar → badge centered, no overflow.
3. Toggle rapidly → no noticeable vertical jump in nav chrome.

If not yet wired, skip to automated tests; visual check is SPLR-84 acceptance.

---

## Reconciliation with existing epic work

If `BrandLogo.tsx`, CSS, and tests already exist from `058-brand-theming-mhc`:

1. Run automated tests above.
2. Run path grep (step 1).
3. Compare component against [contracts/brand-logo.md](./contracts/brand-logo.md).
4. File gap tasks only for mismatches.

**Likely status on current branch**: implementation complete; SPLR-83 closes with verification + documentation traceability.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Broken image icon | PNG missing from `public/brand/` | Complete SPLR-82 asset delivery |
| Test fails on `src` | Path drift or hardcoded wrong URL | Fix `assets.ts`; component must import constants |
| Layout jump on collapse | Missing wrapper padding/min-height | Restore `.brand-logo-wrapper` flex + padding |
| `auth` test fails | Out of SPLR-83 scope | Auth tests are epic continuity; SPLR-83 gate is text+badge only |

---

## Next milestone (after SPLR-83)

- **SPLR-84** — Wire `BrandLogo` into navigation shell (sidebar, top bar, mobile drawer)

Run `/speckit-tasks` to generate implementation tasks for this feature.
