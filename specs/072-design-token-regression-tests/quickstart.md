# Quickstart & Validation Guide: Design Token and Color Regression (SPLR-95)

How to validate brand regression tests and update expected values after an approved palette change. References [contracts/design-token-regression.md](./contracts/design-token-regression.md) and [data-model.md](./data-model.md).

## Prerequisites

- Node 22 + `npm install` in `apps/web`
- Branch `072-design-token-regression-tests`
- Dependency milestones substantially complete: M1 tokens (`059`), SPLR-91 migration (`068`), SPLR-94 contrast audit (`071`)
- Existing theme suite passing: `npm run test -- tests/theme/`

## Run brand regression suite (primary gate)

```bash
cd apps/web
npm run test:brand
```

**Expected**: All parity, presence, and legacy-denylist tests pass.

### Full web test suite (CI parity)

```bash
cd apps/web
npm run test
npm run test:coverage
npm run build
```

**Expected**: Brand suite included in `npm test`; coverage ≥80% on `parseCssRoot.ts` and new token exports; build succeeds.

## Validate failure detection (negative test)

Temporarily change one primitive in `index.css` only:

```bash
# Example: edit --color-accent-orange to #E65101 in src/index.css
cd apps/web
npm run test:brand
```

**Expected**: Fail with message naming `--color-accent-orange` and showing expected vs actual. Revert before commit.

### Legacy hex negative test

Add `#2563eb` to a comment or unused rule in `index.css`, run `npm run test:brand`, confirm failure citing `#2563eb`. Revert.

## Parser unit tests

```bash
cd apps/web
npm run test -- tests/theme/parseCssRoot.test.ts
```

**Expected**: Root block extraction and property parsing pass edge cases (VR-004, VR-005).

## Updating expected brand values (maintainer procedure)

When design approves a palette change:

1. **Update canonical record** — edit `apps/web/src/theme/tokens.ts`:
   - `colors` object (hex/rgba literals)
   - `rootTokenParity` array (if not auto-derived)
   - `requiredCssVariables` if adding/removing a token name

2. **Update runtime CSS** — edit matching declarations in `apps/web/src/index.css` `:root` block.

3. **Verify**:

   ```bash
   cd apps/web
   npm run test:brand
   npm run test -- tests/theme/designTokens.test.ts   # contrast pairings if colors changed
   ```

4. **PR checklist** — describe intentional visual change; link design approval if applicable.

### Adding a new primary token

1. Add to `colors` and `rootTokenParity` in `tokens.ts`.
2. Add CSS variable to `:root` in `index.css`.
3. Append name to `requiredCssVariables`.
4. Run `npm run test:brand`.

### Adding a legacy hex exception (rare)

1. Add `{ hex, reason }` to `LEGACY_HEX_EXCEPTIONS` in `legacyPalette.ts`.
2. Update brand test to skip documented exception only.
3. Document in PR — exceptions should trend toward zero.

## Relationship to other theme tests

| Suite | Command | Purpose |
|-------|---------|---------|
| Brand regression | `npm run test:brand` | `:root` parity + legacy denylist (SPLR-95) |
| WCAG contrast | `npm run test -- tests/theme/designTokens.test.ts` | Contrast ratios (SPLR-94) |
| Hex budget | `npm run test -- tests/theme/hexBudget.test.ts` | Hex literals outside `:root` |
| Color migration | `npm run test -- tests/theme/colorMigration.test.ts` | Component token wiring |

## Coverage gate

```bash
cd apps/web
npm run test:coverage
```

**Pass**: `src/theme/parseCssRoot.ts` and modified `tokens.ts` exports ≥80% line and branch coverage.

## Definition of done

- [ ] `apps/web/tests/brand/designTokens.test.ts` covers parity, presence, and legacy denylist
- [ ] `parseCssRoot.ts` utility extracted with unit tests
- [ ] `npm run test:brand` script added
- [ ] Duplicate legacy/parity assertions removed or delegated from theme tests
- [ ] Maintainer update procedure verified (negative + positive path)
- [ ] `npm test` and CI pass; frontend coverage ≥80% on new files
- [ ] WCAG contrast suite still passes if palette unchanged
