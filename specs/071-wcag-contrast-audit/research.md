# Phase 0 Research: WCAG AA Contrast Audit and Token Adjustments (SPLR-94)

All Technical Context items resolved. Decisions grounded in Linear SPLR-94, dependency specs `059`–`069`, and measured ratios from the current `apps/web` token set on branch `071-wcag-contrast-audit`.

## D1. Contrast tooling — extend existing `contrast.ts`

**Decision**: Extend `@/theme/contrast.ts` with **rgba compositing** (`compositeRgbaOnHex`) and **`meetsWcagAaLargeText`** (≥3:1). Do **not** add `colord` or other npm dependencies.

**Rationale**: M1 (`059-mhc-design-tokens`) already ships WCAG 2.1 relative-luminance math and Vitest coverage in `contrast.test.ts` / `designTokens.test.ts`. Opacity-derived tokens (`--color-text-muted`, `--color-border-subtle`) require alpha compositing against a known background before ratio calculation.

**Alternatives considered**:
- **WebAIM manual checker only**: rejected — not CI-enforceable; spec requires committed audit doc plus automated regression.
- **`colord` package**: rejected — unnecessary dependency for ~40 lines of math already partially implemented.

## D2. Baseline pairing measurements (current tokens)

Measured with WCAG relative-luminance formula (June 2026 codebase):

| Pairing | Ratio | AA normal (4.5:1) | AA large/UI (3:1) | Status |
|---------|-------|-------------------|-------------------|--------|
| Brown `#3E2723` on cream `#F4F1EA` | 12.25 | PASS | PASS | No change |
| Cream `#F4F1EA` on brown `#3E2723` | 12.25 | PASS | PASS | No change |
| White `#FFFFFF` on orange `#E65100` | 3.79 | FAIL | PASS | OK for bold CTA/badge (700 weight, ≥14px) |
| White on orange hover `#CC4900` | 4.65 | PASS | PASS | No change |
| Cream on orange `#E65100` | 3.36 | FAIL | PASS | Not used on CTAs (white already applied) |
| Muted `rgba(62,39,35,0.72)` composited on cream | 5.28 | PASS | PASS | No change |
| Muted composited on white | 5.96 | PASS | PASS | No change |
| Error `#b91c1c` on error-bg `#fef2f2` | 5.91 | PASS | PASS | No change |
| Success `#15803d` on success-bg `#f0fdf4` | 4.79 | PASS | PASS | No change |
| Warning brown on warning-bg `#fff3e0` | 12.60 | PASS | PASS | No change |
| Brown on white surface | 13.82 | PASS | PASS | No change |
| Orange focus ring on white | 3.79 | FAIL | PASS | UI component — passes 3:1 |
| Border subtle `rgba(62,39,35,0.15)` vs cream | 1.32 | — | **FAIL** | Remediate (D5) |
| Border subtle vs white surface | 1.33 | — | **FAIL** | Remediate (D5) |
| Disabled CTA: white at `opacity:0.6` on orange | 2.22 | FAIL | FAIL | Remediate (D6) |

**Rationale**: Three critical SPLR-94 pairings (brown/cream, white/orange, cream/brown nav) already pass for their in-use text categories. Remaining work is **semantic expansion**, **border UI contrast**, and **disabled-state treatment**.

## D3. Text-on-accent token — formalize existing practice

**Decision**: Add `--color-text-on-accent: var(--color-surface-white)` to `:root` and `colors.textOnAccent` in `tokens.ts`. Update `.btn-primary`, `.btn-primary--compact`, `.badge-action-required`, `.badge-alert` groups to reference `var(--color-text-on-accent)` instead of `var(--color-surface-white)` directly.

**Rationale**: Linear issue anticipates `--color-cta-text: #FFFFFF` when cream fails. Cream-on-orange fails normal-text AA; white-on-orange passes large/bold threshold (~3.8:1). Buttons and badges already use white — this change formalizes the semantic role without altering appearance.

**Alternatives considered**:
- **Switch CTAs to cream text**: rejected — 3.36:1 fails normal text; worse than white.
- **Darken orange globally**: rejected — brand guide locks `#E65100`; would cascade visual shift beyond accessibility fix.

## D4. Expand `contrastPairings` inventory

**Decision**: Grow `contrastPairings` in `tokens.ts` to cover:

1. **Core text** — brown-on-cream, brown-on-white, cream-on-brown (nav)
2. **Accent surfaces** — white-on-orange, white-on-orange-hover, white-on-orange badge (12px/700)
3. **Semantic feedback** — error, success, warning pairings
4. **Derived opacity** — muted-on-cream, muted-on-white
5. **UI components** — border-subtle vs cream, border-subtle vs white, focus-ring vs white
6. **Interactive states** — disabled CTA effective colors (post D6 remediation)

Each entry carries `{ id, foreground, background, minRatio, category }` where `category` is `normal-text` | `large-text` | `ui-component`.

**Rationale**: FR-001 requires systematic audit; single test loop over `contrastPairings` enforces CI regression (SPLR-95 precursor).

**Alternatives considered**:
- **Keep four pairings only**: insufficient for FR-001 scope.

## D5. Border subtle token — increase opacity for 3:1 UI contrast

**Decision**: Retune `--color-border-subtle` from `rgba(62, 39, 35, 0.15)` to approximately **`rgba(62, 39, 35, 0.50)`** (validated target: ~2.98:1 on white; may bump to `0.52` for margin). Re-measure on cream adjacency.

**Rationale**: WCAG 1.4.11 requires 3:1 for UI component boundaries (input borders, card separators). At 0.15 opacity borders are decorative-only and fail non-text contrast. 0.50 approaches 3:1 on white while staying subtler than solid brown.

**Alternatives considered**:
- **Solid `#bdb4ae` hex token**: acceptable fallback if rgba tuning insufficient on cream; prefer rgba for consistency with token derivation pattern.
- **Leave borders unchanged**: rejected — fails FR-004 for form inputs and container separators.

## D6. Disabled CTA contrast — replace opacity-only dimming

**Decision**: Replace `opacity: 0.6` on disabled primary/compact button groups with **explicit disabled tokens**:

```css
--color-accent-orange-disabled: /* ~#F0B899 or composited equivalent */;
--color-text-on-accent-disabled: /* passes 3:1 on disabled bg */;
```

Disabled rules set `background`, `color`, and `opacity: 1` (or `opacity: 1` with explicit colors) so effective contrast ≥3:1 for bold label text.

**Rationale**: `opacity: 0.6` on white-on-orange yields 2.22:1 — fails both normal and large text AA. Opacity affects entire subtree including text; explicit colors preserve button chrome dimming without crushing label contrast.

**Alternatives considered**:
- **Keep opacity, accept failure for disabled**: rejected — spec includes disabled states where text is still shown (FR edge case).
- **Hide disabled label text**: rejected — violates usability; disabled buttons still show labels.

## D7. Audit document — test-generated markdown

**Decision**: Commit `apps/web/src/brand/contrast-audit.md` with sections: Summary, Methodology, Pairing table (id, foreground, background, ratio, threshold, pass/fail, notes), Token changes (before/after). Generate table body from `contrastPairings` via a Vitest helper or small `scripts/generate-contrast-audit.ts` run in test (`contrastAudit.test.ts` verifies file exists and contains all pairing ids).

**Rationale**: FR-008 requires committed doc with before/after; generating from the same source as CI tests prevents doc/test drift.

**Alternatives considered**:
- **Hand-maintained markdown only**: rejected — drifts from `tokens.ts` over time.

## D8. Scope boundaries

**Decision**: **In scope**:
- `:root` token value adjustments and new semantic aliases
- Shared button/badge/border/disabled utility selectors in `index.css`
- `contrast.ts`, `tokens.ts`, theme Vitest modules, `contrast-audit.md`

**Out of scope**:
- AAA conformance (spec Assumptions)
- Playwright visual snapshots (deferred to SPLR-95 color regression)
- Backend changes
- Re-theming surfaces owned by open M4/M5 PRs beyond token consumption

**Rationale**: Aligns with spec Assumptions and Linear M6 placement.

## D9. Dependency sequencing

**Decision**: Implement after SPLR-91 (`068`) and SPLR-93 (`069`) merged or rebased atop this branch so audit reflects final token set.

**Rationale**: Linear `blockedBy` relations on SPLR-94.

**Alternatives considered**:
- **Audit now, re-audit later**: acceptable on feature branch but plan assumes dependencies landed to avoid double work.

## D10. Test strategy

**Decision**: Three-layer verification:

1. **Unit math** (`contrast.test.ts`) — compositing, ratio bounds, threshold helpers.
2. **Pairing gate** (`designTokens.test.ts`) — all `contrastPairings` meet `minRatio`.
3. **Audit artifact** (`contrastAudit.test.ts`) — `contrast-audit.md` exists; contains every pairing id; documents token before/after when values change.

Run full theme suite + `LoginForm` a11y test for FR-010 regression check.

**Rationale**: Constitution III; extends established M1/M4 CSS-read test patterns without new toolchain.
