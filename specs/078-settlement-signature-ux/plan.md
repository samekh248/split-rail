# Implementation Plan: Settlement Signature Form UX and Drawing Performance

**Branch**: `078-settlement-signature-ux` | **Date**: 2026-07-02 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/078-settlement-signature-ux/spec.md`

## Summary

Restyle the settlement **signature capture** experience to read as a standard form field (labeled artist signature, bordered surface, "Sign here" placeholder, baseline cue, helper hint, secondary clear button) and **fix drawing lag** by removing full-canvas redraw from the `pointermove` path — incremental segment rendering during active strokes, full redraw only on stroke completion, clear, or mount. Wire `disabled` from `FinalizeSettlementPanel` while finalize is pending. **Frontend-only** — signature payload format and finalize API unchanged. Vitest + RTL coverage ≥80% on touched files.

## Technical Context

**Language/Version**: TypeScript 5.7 + React 18 (`apps/web` only)

**Primary Dependencies**: HTML Canvas 2D API; existing `SignaturePad` / `FinalizeSettlementPanel`; `FinalizeSettlementRequest` from `generated-api.ts`; `.form-field` and `.btn-secondary` patterns in `index.css`

**Storage**: N/A (in-memory stroke refs; base64 payload emitted to existing finalize mutation)

**Testing**: Vitest + React Testing Library — extend `SignaturePad.test.tsx`, `FinalizeSettlementPanel.test.tsx`; ≥80.0% line/branch coverage on touched frontend files (Constitution III); no backend changes; Playwright not required for this slice

**Target Platform**: Vite SPA — event ledger finalize settlement panel (`EventLedgerPage`)

**Project Type**: Web application (`apps/web` vertical slice; `apps/api` unchanged)

**Performance Goals**: O(1) canvas work per `pointermove` during active stroke; no perceptible ink lag during extended signing sessions (SC-002, SC-003)

**Constraints**: Constitution III — Vitest ≥80% coverage; Constitution VI — no hand-written API types; Constitution IX — no custom SVG icons for form chrome; signature payload format unchanged (FR-008); form chrome styled via design tokens only; canvas ink hex `#111` retained per existing exemption; ≥80.0% coverage gate on frontend touched files (backend N/A)

**Scale/Scope**: 2 modified components, 1 CSS block (`signature-pad*` BEM), 2 test files extended; 0 backend files

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Relevance | Status |
|-----------|-----------|--------|
| I. Core Mathematical Axioms | No monetary math in signature UI. | N/A |
| II. Multi-Tenant Isolation | Panel gated by existing permission hook; finalize scoped by venue/event. | N/A (existing) |
| III. Engineering Rigor | Vitest + RTL for pad and panel; ≥80% on touched files. | PASS (with tests) |
| IV. QBO Integration | No QBO mutations. | N/A |
| V. Ledger State Machine | Finalize triggers existing freeze path; no new mutation routes. | N/A |
| VI. Polyglot Contract | Uses `FinalizeSettlementRequest` from generated types only. | PASS |
| VII. EF Core Axioms | No backend queries. | N/A |
| VIII. Exception Governance | Finalize errors surfaced via existing mutation error UI. | PASS |
| IX. UI Iconography | No new icons required for signature form. | PASS |
| X. Dual-Platform Scripts | No deploy scripts in this feature. | N/A |

**Post-design re-check**: PASS. Frontend-only UX and rendering fix; Complexity Tracking not required.

## Project Structure

### Documentation (this feature)

```text
specs/078-settlement-signature-ux/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── settlement-signature-ui.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
apps/web/src/
├── components/settlement/
│   ├── SignaturePad.tsx                 # MODIFIED: form markup, incremental draw, disabled
│   └── FinalizeSettlementPanel.tsx      # MODIFIED: pass disabled={isPending}
└── index.css                            # MODIFIED: signature-pad BEM block

apps/web/tests/settlement/
├── SignaturePad.test.tsx                # MODIFIED: form DOM, perf spy, disabled
└── FinalizeSettlementPanel.test.tsx     # MODIFIED: pending disables pad (optional)
```

**Structure Decision**: Single vertical slice through `apps/web` settlement components. All signature form presentation and canvas performance logic stays in `SignaturePad`; panel only wires `disabled` during pending finalize.

## Implementation Phases

### Phase A — Incremental canvas rendering (P1)

1. Extract `applyStrokeStyle(ctx)` helper for shared ink settings.
2. Remove `redraw()` call from `handlePointerMove`; keep incremental `prev→curr` segment only.
3. Remove unnecessary `redraw()` from `handlePointerDown` (start stroke without clearing).
4. On `finishStroke` and `clear`, run full `redraw()` once.
5. Add test: spy `clearRect` — 200 simulated moves must not produce 200 clears.

### Phase B — Signature form markup (P1)

1. Wrap in `.form-field.signature-pad` with `<label htmlFor={canvasId}>Artist signature</label>`.
2. Add `.signature-pad__surface` container with placeholder, baseline, and canvas.
3. Toggle placeholder visibility via `revision` state when strokes exist.
4. Add hint paragraph with `aria-describedby` on canvas.
5. Style clear button as `.btn-secondary`; disable when empty or `disabled`.

### Phase C — CSS and responsive surface (P1–P2)

1. Add `signature-pad*` BEM block to `index.css` using design tokens.
2. Canvas `width: 100%` display with internal bitmap dimensions unchanged.
3. `touch-action: none` on canvas to prevent scroll interference while signing.

### Phase D — Finalize panel integration (P2)

1. Pass `disabled={finalize.isPending}` to `SignaturePad`.
2. Verify finalize button disable rules unchanged.
3. Extend panel test if needed for pending state.

### Phase E — Tests & coverage (all priorities)

1. `SignaturePad.test.tsx` — label, placeholder, baseline, hint, clear restores empty, disabled blocks input, incremental draw perf spy.
2. `FinalizeSettlementPanel.test.tsx` — existing workflow tests remain green.
3. Confirm ≥80% line/branch on touched files via `npm run test -- --coverage`.

## Risk & Mitigation

| Risk | Mitigation |
|------|------------|
| Orphan pixels if stroke ends mid-move without full redraw | Call full `redraw()` on `finishStroke` to reconcile canvas with `strokesRef` |
| Placeholder not hiding on first dot | Update `revision` on first point or on stroke complete |
| Pointer leave without up duplicates stroke | Guard `finishStroke` with `drawingRef` check (existing) |

## Complexity Tracking

> No constitution violations requiring justification.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |
