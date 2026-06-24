# Phase 0 Research: Montana High Country Design Tokens (M1)

All Technical Context items resolved. Decisions grounded in Linear SPLR-79, the parent epic (`058-brand-theming-mhc`), and the current `apps/web` codebase on branch `059-mhc-design-tokens`.

## D1. Token file location — `:root` in `index.css`

**Decision**: Define all M1 tokens in the existing `:root` block at the top of `apps/web/src/index.css`. Do not extract to `styles/tokens.css` for this milestone.

**Rationale**:
- `main.tsx` already imports `./index.css`; zero bootstrap changes.
- Linear SPLR-79 lists `index.css` as the primary repo path; extraction is optional "if cleaner" — current token block is ~30 lines and manageable.
- Parent epic research (058) chose the same approach; avoids a second import ordering concern.

**Alternatives considered**:
- **`styles/tokens.css` imported from `main.tsx`**: cleaner separation but adds a file and import; defer until token block grows or M4 migration splits concerns.
- **TypeScript-only tokens with runtime injection**: rejected — CSS custom properties are the runtime source of truth for plain CSS architecture.

## D2. Semantic alias naming

**Decision**: Add explicit semantic aliases required by FR-002:

| Semantic purpose | CSS variable | Maps to |
|------------------|--------------|---------|
| Text on light surfaces | `--color-text-on-light` | `var(--color-primary-brown)` |
| Text on dark surfaces | `--color-text-on-dark` | `var(--color-bg-cream)` |
| Subtle border | `--color-border-subtle` | `rgba(62, 39, 35, 0.15)` or equivalent |
| Button radius | `--radius-button` | `6px` (within 4–6px brand range) |
| Card shadow | `--shadow-card` | `0 2px 5px rgba(0, 0, 0, 0.05)` per spec; retain `--shadow-soft` as alias if already referenced |

**Rationale**: FR-002 names these semantics explicitly. Aliases via `var()` keep a single hex source while giving downstream milestones stable semantic names.

**Alternatives considered**:
- **Reuse `--color-primary-brown` directly everywhere**: fails FR-002 explicit semantic token requirement; harder for non-developer stakeholders to audit.
- **Rename existing `--color-text-muted` to text-on-light**: rejected — muted text is a different semantic (reduced emphasis); keep both.

## D3. Alpine Sunset hex — brand guide vs WCAG-adjusted

**Decision**: Set `--color-accent-orange: #E65100` (brand guide / FR-001). Validate CTA contrast using **white label text** (`--color-surface-white`) on orange, not by substituting a darker orange hex.

**Rationale**:
- SPLR-79 and FR-001 specify `#E65100` explicitly.
- Current branch uses `#C45100` in CSS and `tokens.ts` — a WCAG workaround that diverges from the brand guide. M1 realigns to `#E65100` and relies on white-on-orange for 4.5:1 compliance (parent epic D6 pattern).
- Hover state may use `--color-accent-orange-hover` as a precomputed darker shade without changing the canonical accent token.

**Alternatives considered**:
- **Keep `#C45100` as canonical accent**: rejected — violates FR-001 and SPLR-79 acceptance criteria.
- **Document `#E65100` in tokens but use `#C45100` in components**: rejected — violates FR-005 single-source-of-truth principle.

## D4. TypeScript mirror for test parity

**Decision**: Maintain `apps/web/src/theme/tokens.ts` with canonical hex values matching `:root` declarations. Export `requiredCssVariables` array for file-scan tests. Extend array to include M1 semantic variables.

**Rationale**:
- Existing `cssTokens.test.ts` already reads `index.css` and cross-checks against `tokens.ts`.
- Avoids adding a CSS parser dependency.
- Constitution III requires automated verification; TS mirror is test infrastructure only (not a second runtime source).

**Alternatives considered**:
- **CSS-only tests with regex only**: sufficient for presence but duplicates hex literals in test file; mirror centralizes expected values.
- **PostCSS parser**: overkill for ~10 variables.

## D5. M1 test scope vs parent epic tests

**Decision**: M1 extends only token-contract tests (`cssTokens.test.ts`, `designTokens.test.ts`). Do **not** enable or require `legacyPalette.test.ts` pass in M1 — legacy hex removal from component rules is out of scope per spec assumptions.

**Rationale**:
- Spec edge case: "legacy hex values remain in component-level rules" is expected until later milestones.
- `legacyPalette.test.ts` scans entire `index.css` including component rules; running it green would require M4-scope migration.
- M1 tests focus on: (1) four core tokens present with correct hex, (2) semantic derived tokens present, (3) `:root` and `body` use `var()` references, (4) contrast pairings for brown-on-cream, cream-on-brown, white-on-orange.

**Alternatives considered**:
- **Scope legacy denylist to token block only in M1**: possible future enhancement; not required for SPLR-79 acceptance criteria.

## D6. Font tokens in M1 scope

**Decision**: **Out of scope** for M1 implementation. `--font-heading` and `--font-ui` may already exist from epic branch work; M1 does not add font loading or typography rules (deferred to SPLR-80 / SPLR-81).

**Rationale**:
- SPLR-79 Linear description lists only color tokens and derived values; typography is SPLR-80.
- Spec assumptions explicitly defer typography to subsequent milestones.
- Existing font variables in `index.css` are not removed but not required for M1 acceptance.

**Alternatives considered**:
- **Bundle SPLR-80 into M1**: rejected — violates spec scope boundary and blocks parallel milestone tracking.
