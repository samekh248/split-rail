# Quickstart & Validation Guide: Montana High Country Design Tokens (M1)

How to validate SPLR-79 token foundation. References [contracts/design-tokens.md](./contracts/design-tokens.md) and [data-model.md](./data-model.md).

## Prerequisites

- Node 22 + dependencies in `apps/web` (`npm install`)
- On branch `059-mhc-design-tokens`

## Run

```bash
cd apps/web
npm run dev      # http://localhost:5173 — visual spot-check
```

## Automated tests (primary verification)

```bash
cd apps/web
npm run test -- tests/theme/cssTokens.test.ts tests/theme/designTokens.test.ts
npm run test:coverage   # ≥80% gate on modified theme modules
npm run build             # FR-006 — production build must succeed
```

**Expected**: Both theme token test files pass; build succeeds.

---

## M1 validation checklist (SPLR-79)

### 1. Core color tokens

Open `apps/web/src/index.css` and confirm `:root` declares:

| Variable | Expected hex |
|----------|--------------|
| `--color-primary-brown` | `#3E2723` |
| `--color-accent-orange` | `#E65100` |
| `--color-bg-cream` | `#F4F1EA` |
| `--color-surface-white` | `#FFFFFF` |

### 2. Semantic derived tokens

Confirm presence of:

- `--color-text-on-light` → references primary brown
- `--color-text-on-dark` → references cream
- `--color-border-subtle` → brown @ ~15% opacity
- `--radius-button` → `4px`–`6px`
- `--shadow-card` → `0 2px 5px rgba(0, 0, 0, 0.05)`

### 3. Root and body defaults

In DevTools → Elements → `html` (`:root`):

- Computed `background-color` ≈ `#F4F1EA` (Canvas Cream)
- Computed `color` ≈ `#3E2723` (Lodgepole Brown)

On `body`: same cream background and brown text.

Inspect stylesheet: `background` and `color` on `:root` and `body` MUST use `var(--color-*)`, not raw hex.

### 4. No new brand hex outside token block

Scan the token definition block boundaries — brand palette hex (`#3E2723`, `#E65100`, `#F4F1EA`, `#FFFFFF`) MUST NOT be duplicated elsewhere in newly added code. (Legacy hex in existing component rules is acceptable until later milestones.)

### 5. TypeScript mirror parity

`apps/web/src/theme/tokens.ts` hex values MUST match `:root` declarations. `requiredCssVariables` MUST include all M1 variables listed in the contract.

---

## Visual spot-check (optional)

1. Load any page (login or dashboard).
2. Page background should appear warm off-white (cream), not cool gray (`#f6f7f9` / slate).
3. Default body text should appear dark brown, not slate (`#1e293b`).

Component-specific colors may still show legacy values — that is expected until downstream milestones.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `cssTokens.test.ts` fails on accent hex | Branch has WCAG-adjusted `#C45100` | Realign to `#E65100` per contract |
| `designTokens.test.ts` fails white-on-orange | Cream used on orange CTA | Use white label token for contrast pairing test |
| Build fails | CSS syntax error in token block | Validate `:root` braces and semicolons |
| Coverage gate fails | New `tokens.ts` exports untested | Add tests for new exports |

---

## Next milestones (after M1)

- **SPLR-80** — Import brand web fonts (Zilla Slab + Inter)
- **SPLR-81** — Global typography rules
- **SPLR-85+** — Component and shell theming (blocked until M1 complete)

Run `/speckit-tasks` to generate implementation tasks for this feature.
