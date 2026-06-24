# Quickstart & Validation Guide: Mobile Shell Theming (SPLR-87)

How to validate mobile top bar and navigation drawer theming. References [contracts/mobile-shell-theming.md](./contracts/mobile-shell-theming.md) and [data-model.md](./data-model.md).

## Prerequisites

- Node 22 + `npm install` in `apps/web`
- Branch `064-mobile-top-bar-drawer-theme`
- M1 tokens complete: `059-mhc-design-tokens` (`tests/theme/cssTokens.test.ts` passing)
- M2 logo wiring complete: `063-wire-logo-navigation` (wordmark in top bar + drawer header)

## Run dev server

```bash
cd apps/web
npm run dev
```

Sign in and open any authenticated shell route (e.g. dashboard).

## Automated tests (primary gate)

```bash
cd apps/web
npm run test -- tests/shell/TopBar.test.tsx tests/shell/MobileNavDrawer.test.tsx tests/theme/mobileShellTheming.test.ts
npm run test:coverage
npm run build
```

**Expected**: All shell theme tests pass; coverage ≥80% on modified shell files; build succeeds.

### Token hygiene

```bash
cd apps/web
rg '#3[eE]2723|#f4[fF]1[eE][aA]' src/components/shell --glob '*.tsx'
```

**Pass**: no hardcoded hex in shell TSX (colors belong in CSS tokens only).

### Icon hygiene

```bash
cd apps/web
rg '☰|×' src/components/shell
```

**Pass**: no Unicode menu/close glyphs in shell components after implementation.

---

## Manual validation checklist

### Mobile top bar (User Story 1)

1. Resize to ≤768px (or device toolbar).
2. **Without opening drawer**: top bar background is Lodgepole Brown; organization name is cream and legible.
3. Hamburger button shows cream bars icon on brown background.
4. Centered Split-Rail wordmark remains visible and legible.
5. Reload page and navigate between routes — no flash of transparent/light top bar before brown styles apply.

### Mobile drawer (User Story 2)

1. Tap hamburger → drawer opens.
2. Panel background is Lodgepole Brown; navigation links and profile area use cream text.
3. Wordmark visible at drawer header (SPLR-84).
4. Close via ×, backdrop, or Escape — no light-theme flash during open transition.
5. Nav link hover shows subtle light overlay (matches sidebar).

### Touch targets and focus (User Story 3)

1. Inspect hamburger and close buttons — each ≥44×44px.
2. Tab to menu and close controls — visible cream focus ring on brown background.

### Desktop regression (FR-009)

1. Resize to >768px.
2. Sidebar remains brown/cream; top bar is transparent with brown org name (no brown mobile bar).

---

## Reconciliation with existing code

| Surface | Expected status before implementation |
|---------|--------------------------------------|
| `MobileNavDrawer` panel | Brown/cream CSS likely present — verify + polish close button |
| `TopBar` | Transparent/light on mobile — **needs brown-bar CSS** |
| Menu/close icons | Unicode placeholders — **needs Font Awesome swap** |

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Light top bar on mobile | Mobile media block missing brown background | Add CSS per contract |
| Brown top bar on desktop | Mobile rules leaking above 768px | Scope rules inside `@media (max-width: 768px)` only |
| Unicode menu icon | FA not wired | Import `faBars` / `faXmark` per contract |
| Drawer looks correct but tests fail | Missing FA/icon assertions | Extend shell tests |
| Nav links dark text in drawer | `color` not inherited | Ensure panel sets `color: var(--color-bg-cream)` |
| Focus ring invisible | Orange ring on brown | Use cream outline per sidebar pattern |

---

## Next step

Run `/speckit-tasks` to generate implementation tasks for mobile shell theming.
