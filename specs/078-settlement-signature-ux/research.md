# Phase 0 Research: Settlement Signature Form UX and Drawing Performance

**Feature**: `078-settlement-signature-ux` | **Date**: 2026-07-02

## R1 — Root cause of drawing lag

- **Decision**: The performance regression is caused by `handlePointerMove` calling `redraw()` on every pointer event. `redraw()` clears the canvas and re-strokes **all** completed strokes from scratch — O(total points) per move. The incremental segment draw afterward duplicates work already covered by the full redraw.
- **Rationale**: Profiling the current `SignaturePad.tsx` shows `redraw()` invoked on both `pointerdown` and every `pointermove`. As stroke count and point density grow, frame time increases linearly, matching the reported "long time to render a path" symptom.
- **Alternatives considered**: Replace canvas with SVG paths — rejected (larger refactor, payload format unchanged). Throttle/debounce pointer events — rejected (introduces visible gaps). WebGL renderer — rejected (over-engineered for 2D ink).

## R2 — Incremental drawing strategy

- **Decision**: Split rendering into two paths:
  1. **Active stroke** (`pointermove`): append only the latest segment from `prev → curr` without clearing or replaying prior strokes.
  2. **Full redraw**: run only on mount, resize, stroke completion (`pointerup`/`pointerleave`), and clear — replaying `strokesRef` into the canvas once.
- **Rationale**: Standard canvas signature-pad pattern; keeps ink visually continuous while holding move-handler work to O(1) per event.
- **Alternatives considered**: Double-buffer offscreen canvas — rejected (unnecessary once full redraw is removed from move path). `requestAnimationFrame` batching alone — rejected (does not fix O(n) redraw cost).

## R3 — Signature form presentation

- **Decision**: Restructure `SignaturePad` markup to follow the existing `.form-field` BEM pattern used elsewhere in the app:
  - Visible `<label>` — "Artist signature"
  - Bounded `.signature-pad__surface` container with border, white background, and minimum height
  - Empty-state placeholder text — "Sign here" (hidden once ink exists)
  - Horizontal baseline rule at ~75% height inside the surface
  - Helper hint below the surface
  - `Clear / Redo` styled as `.btn-secondary`
- **Rationale**: `index.css` already defines `.form-field`, `.form-field__label`, and `.form-field__input` tokens; the signature pad currently has **no** dedicated CSS (unstyled canvas). Aligning with form-field conventions satisfies FR-001–FR-005 and FR-011 without new design language.
- **Alternatives considered**: Embed inside `FinalizeSettlementPanel` only — rejected (signature capture is self-contained in `SignaturePad`). Third-party signature library — rejected (no dependency, payload contract must stay stable).

## R4 — Canvas sizing and pointer alignment

- **Decision**: Keep internal canvas bitmap dimensions (`width`/`height` props, default 400×120) but make the **display** width responsive (`width: 100%` on canvas inside bordered surface). Retain existing `getBoundingClientRect` scale math so pointer coordinates map correctly on narrow viewports.
- **Rationale**: Spec edge case requires usable signing on mobile; coordinate scaling already exists and is tested implicitly via component structure.
- **Alternatives considered**: Fixed pixel canvas only — rejected (breaks narrow layouts). `devicePixelRatio` scaling — deferred (optional polish; not required for performance fix).

## R5 — Ink color and design tokens

- **Decision**: Retain the existing intentional canvas ink hex (`#111`) documented in source as non-chrome drawing color (SPLR-91 out-of-scope for token migration). Style the **form chrome** (border, label, placeholder, baseline) exclusively with existing CSS custom properties (`--color-border-subtle`, `--color-surface-white`, `--color-text-muted`, `--color-primary-brown`).
- **Rationale**: Constitution token rules apply to UI chrome; canvas stroke color is a rendering constant already exempted in codebase commentary.
- **Alternatives considered**: Map ink to `--color-primary-brown` — rejected for this slice (would change archived signature appearance vs. existing settlements).

## R6 — Disabled state during finalize submission

- **Decision**: Add optional `disabled?: boolean` prop to `SignaturePad`; when `true`, ignore pointer events and disable clear. `FinalizeSettlementPanel` passes `disabled={finalize.isPending}`.
- **Rationale**: Spec edge case — prevent signature mutation while finalize request is in flight.
- **Alternatives considered**: Overlay spinner only — rejected (does not block pointer input).

## R7 — Payload contract stability

- **Decision**: No changes to encoded payload format (`btoa(JSON.stringify(Point[][]))`) or `FinalizeSettlementRequest.signatureData`. Backend `SignatureValidator` unchanged.
- **Rationale**: FR-008; existing E2E integrity spec and xUnit validator tests remain valid.
- **Alternatives considered**: Compress/simplify stroke encoding — rejected (backend contract change).

## R8 — Test strategy

- **Decision**:
  - Extend `SignaturePad.test.tsx` — form structure (label, placeholder, baseline, hint), placeholder hides after stroke, incremental draw does not call `clearRect` on every move (spy), clear restores empty state, disabled blocks interaction.
  - Extend `FinalizeSettlementPanel.test.tsx` — unmock `SignaturePad` for one integration test OR add test that `disabled` prop wired when `isPending`; keep existing workflow tests.
  - Optional performance assertion: simulate 200 `pointermove` events and assert `clearRect` call count ≤ 2 (initial + optional stroke end), not 200.
- **Rationale**: Constitution III ≥80% on touched frontend files; performance fix is regression-prone without move-handler spy.
- **Alternatives considered**: Playwright draw simulation — deferred (unit-level spy sufficient for CI; manual quickstart covers perceived responsiveness).

## R9 — Backend / API impact

- **Decision**: None. Frontend-only vertical slice through `SignaturePad`, `FinalizeSettlementPanel`, and `index.css`.
- **Rationale**: Spec assumptions and FR-008 confirmed.
- **Alternatives considered**: Server-side signature rendering changes — out of scope.
