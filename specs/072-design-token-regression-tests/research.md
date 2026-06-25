# Phase 0 Research: Automated Design Token and Color Regression Tests (SPLR-95)

All Technical Context items resolved. Decisions grounded in Linear SPLR-95, dependency specs `059`–`071`, and the current `apps/web` theme test suite on branch `072-design-token-regression-tests`.

## D1. Expected value source — `tokens.ts` `colors` export

**Decision**: Treat `apps/web/src/theme/tokens.ts` `colors` (and a new `rootTokenParity` map linking CSS variable names to expected literals) as the **Expected Value Record**. Tests parse `index.css` `:root` and assert each mapped property matches the canonical value (case-insensitive hex; normalized rgba spacing).

**Rationale**: Spec FR-001/FR-007 require a single obvious location for intentional updates. `tokens.ts` already documents "test parity with :root in index.css" and feeds WCAG `contrastPairings`. Duplicating hex literals inside test files causes drift.

**Alternatives considered**:
- **Expected values only in test file**: rejected — violates FR-007 and duplicates `colors`.
- **Parse-only with hardcoded snapshot JSON**: rejected — second source of truth.

## D2. CSS parsing — shared `parseCssRoot` utility

**Decision**: Add `apps/web/src/theme/parseCssRoot.ts` exporting:

- `extractRootBlock(css: string): string`
- `parseRootCustomProperties(css: string): Map<string, string>` — keys like `--color-primary-brown`, values trimmed (hex, `var(...)`, `rgba(...)`)

Cover with `apps/web/tests/theme/parseCssRoot.test.ts` (or `tests/brand/` if preferred — place beside parser under `tests/theme/` for co-location with other theme unit tests).

**Rationale**: FR-005 forbids DOM; `cssTokens.test.ts`, `legacyPalette.test.ts`, and `hexBudget.test.ts` each reimplement `readFileSync` + regex extraction. Centralizing reduces flake risk and improves failure diagnostics.

**Alternatives considered**:
- **PostCSS parser dependency**: rejected — unnecessary for `:root` block extraction.
- **jsdom + getComputedStyle**: rejected — flaky, slow, violates spec edge case.

## D3. Brand test module location — `tests/brand/designTokens.test.ts`

**Decision**: Create `apps/web/tests/brand/designTokens.test.ts` per Linear SPLR-95 with describe blocks:

1. **`:root` token parity** — every `rootTokenParity` entry matches parsed CSS value.
2. **Required variables present** — every `requiredCssVariables` name exists in `:root`.
3. **Legacy hex denylist** — full `index.css` (lowercased) contains no `LEGACY_HEX_DENYLIST` entry.
4. **Failure messages** — assertions use token name in `expect` message (FR-008).

**Rationale**: Linear issue names this path explicitly; separates **brand identity regression** from **WCAG contrast** (`tests/theme/designTokens.test.ts`).

**Alternatives considered**:
- **Extend theme/designTokens.test.ts only**: rejected — conflates contrast math with hex parity; wrong file per issue.
- **Rename theme file**: rejected — breaks SPLR-94 import paths and CI references.

## D4. Overlap with existing theme tests

**Decision**: After brand suite lands:

- **Trim** `legacyPalette.test.ts` to a single smoke test delegating to shared helper OR remove file if brand suite fully subsumes it (keep one assertion path).
- **Trim** overlapping hex assertions in `cssTokens.test.ts` (core palette hex lines) that duplicate `rootTokenParity`; retain unique checks (body/root wiring, semantic alias patterns, selector-specific rules).
- **Keep** `hexBudget.test.ts`, `colorMigration.test.ts`, `formFieldTokens.test.ts` — they enforce migration constraints beyond SPLR-95 scope.

**Rationale**: Spec SC-004 requires deterministic CI; duplicate assertions across files create divergent failure modes. Migration tests remain valuable for component-level token usage.

**Alternatives considered**:
- **Delete all theme token tests**: rejected — loses SPLR-91 migration coverage.
- **Leave full duplication**: rejected — maintainers update one file, other fails unpredictably.

## D5. Legacy denylist — reuse `legacyPalette.ts`

**Decision**: Import `LEGACY_HEX_DENYLIST` from `@/theme/legacyPalette` (10 entries including required `#1e293b` and `#2563eb`). Do not shrink to two hex values — superset satisfies FR-004.

**Rationale**: File already exists with comment "forbidden in index.css after migration"; `legacyPalette.test.ts` already scans full stylesheet.

**Alternatives considered**:
- **Inline only two hex values in brand test**: rejected — weaker than existing denylist; regression if other legacy tones return.

## D6. Semantic `var()` aliases — parity strategy

**Decision**: `rootTokenParity` covers **primitive literals** in `:root` (hex and rgba). Semantic aliases (`--color-text-on-light: var(--color-primary-brown)`) are validated by:

1. Presence in `requiredCssVariables` (name exists).
2. Separate pattern assertions for known alias wiring (retain from `cssTokens.test.ts` or move to brand suite as structured expectations).

Do not recursively resolve `var()` chains in v1 — primitives are the regression surface; alias wiring tests catch miswiring without full CSS cascade engine.

**Rationale**: Spec edge case on `var()` references; accidental primitive change is the primary failure mode; alias tests catch structural breaks.

**Alternatives considered**:
- **Full var() resolver**: over-engineered for v1 scope.

## D7. npm script — `test:brand`

**Decision**: Add to `apps/web/package.json`:

```json
"test:brand": "vitest run tests/brand"
```

Default `npm test` already runs all tests including `tests/brand/` — satisfies FR-006 without changing CI entry point.

**Rationale**: Linear issue requests `test:brand` or inclusion in `npm test`; both achieved.

**Alternatives considered**:
- **Separate CI job**: unnecessary — existing web test job suffices.

## D8. Maintainer update documentation

**Decision**: Document in `quickstart.md` § "Updating expected brand values":

1. Update hex/rgba in `tokens.ts` `colors` and `rootTokenParity` (if split).
2. Update matching `:root` declarations in `index.css`.
3. Run `npm run test:brand` — fails until both align.
4. If adding a token: extend `requiredCssVariables`, `rootTokenParity`, and `:root`.
5. Legacy exception: add entry to `legacyPalette.ts` `LEGACY_HEX_EXCEPTIONS` (new optional array with `{ hex, reason, lineHint }`) only if unavoidable — default is zero exceptions.

**Rationale**: FR-007, SC-005 (&lt;10 min update path).

## D9. Relationship to SPLR-94 (071)

**Decision**: **No changes** to WCAG `contrastPairings` or `tests/theme/designTokens.test.ts` contrast loop. Brand suite is additive.

**Rationale**: Spec Assumptions explicitly complement contrast audit.

## D10. Test strategy and coverage

**Decision**: Three-layer verification:

1. **Parser unit** (`parseCssRoot.test.ts`) — extraction edge cases, malformed CSS guard.
2. **Brand regression** (`tests/brand/designTokens.test.ts`) — parity, presence, denylist.
3. **Integration** — `npm run test` + `npm run test:coverage` ≥80% on `parseCssRoot.ts` and any new `rootTokenParity` exports.

Optional manual validation: temporarily change one `:root` hex, confirm `test:brand` fails with token name, revert.

**Rationale**: Constitution III; feature is tests + small utility — coverage gate applies to new source files.
