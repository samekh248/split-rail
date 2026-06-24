# Quickstart & Validation Guide: Navigation Logo Wiring (SPLR-84)

How to validate dynamic logo placement in the navigation shell. References [contracts/navigation-logo-wiring.md](./contracts/navigation-logo-wiring.md) and [data-model.md](./data-model.md).

## Prerequisites

- Node 22 + `npm install` in `apps/web`
- Branch `063-wire-logo-navigation`
- SPLR-83 complete: `BrandLogo` component and `tests/theme/BrandLogo.test.tsx` passing
- Logo PNGs in `apps/web/public/brand/` (`sr-text.png`, `sr-badge.png`) — SPLR-82

## Run dev server

```bash
cd apps/web
npm run dev
```

Sign in and open any authenticated shell route (e.g. dashboard).

## Automated tests (primary gate)

```bash
cd apps/web
npm run test -- tests/shell/SidebarRail.test.tsx tests/shell/MobileNavDrawer.test.tsx tests/shell/TopBar.test.tsx
npm run test:coverage
npm run build
```

**Expected**: All shell logo tests pass; coverage ≥80% on modified shell files; build succeeds.

### Path hygiene

```bash
cd apps/web
rg '/brand/sr-' src/components/shell --glob '!**/assets.ts'
```

**Pass**: no matches in shell components.

---

## Manual validation checklist

### Desktop sidebar (User Story 1)

1. Open app at viewport width > 768px.
2. **Expanded (pinned)**: wordmark centered at top of left rail; ≥24px breathing room from nav links.
3. Click unpin → **collapsed**: compact badge at top; no label overflow.
4. Hover collapsed rail ~250ms → **hover overlay**: wordmark returns; move pointer away → badge returns.
5. Click brand control → navigates to dashboard (`/`).

### Mobile drawer (User Story 2)

1. Resize to ≤768px (or device toolbar).
2. Tap hamburger → drawer opens.
3. Wordmark visible at top of drawer panel (not "Menu" placeholder text).
4. Nav links below logo are not overlapped.
5. Close via ×, backdrop, or Escape.

### Mobile top bar (User Story 3)

1. At mobile width, without opening drawer.
2. Centered wordmark visible in top bar.
3. Menu button and organization name remain usable; no overlap with logo.

### Layout shift (SC-006)

1. Desktop: toggle pin/unpin rapidly.
2. **Pass**: no noticeable vertical jump in nav chrome from logo swap.

---

## Reconciliation with existing code

| Surface | Expected status before implementation |
|---------|--------------------------------------|
| `SidebarRail` | Likely already wired — verify + harden tests |
| `MobileNavDrawer` | CSS exists; JSX likely needs `BrandLogo` |
| `TopBar` | Needs center brand slot + mobile grid CSS |

If sidebar tests already pass variant assertions, focus implementation on mobile surfaces.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Broken image in shell | Missing PNG assets | Complete SPLR-82 |
| Badge shows when expanded | `showLabels` logic wrong | Check `pinnedExpanded \|\| hoverExpanded` |
| No mobile top bar logo | `TopBar` not wired or CSS `display: none` | Implement contract center slot |
| Drawer shows "Menu" text | `BrandLogo` not wired in drawer | Replace title per contract |
| Double padding / cramped logo | Shell + wrapper padding stack | Tune shell-specific `.brand-logo-wrapper` overrides |
| Test fails on src | Wrong variant prop | Match [data-model.md](./data-model.md) rules |

---

## Next step

Run `/speckit-tasks` to generate implementation tasks for gap-fill and test hardening.
