# Contract: Settlement Signature Form (Frontend)

**Feature**: `078-settlement-signature-ux` | **Extends**: settlement finalize flow on event ledger  
**Date**: 2026-07-02

Types from `generated-api.ts` only for API payloads (Constitution VI). No REST changes.

## Component: `SignaturePad`

**Path**: `apps/web/src/components/settlement/SignaturePad.tsx`

### Props

```typescript
export interface SignaturePadProps {
  onChange?: (signatureBase64: string | null) => void;
  width?: number;
  height?: number;
  disabled?: boolean;
}
```

### Exported helper (unchanged)

```typescript
export function decodeSignaturePayload(base64: string): Point[][];
```

### DOM structure

```text
<div class="form-field signature-pad" data-testid="signature-pad">
  <label class="form-field__label signature-pad__label" for="signature-canvas-{id}">
    Artist signature
  </label>
  <div class="signature-pad__surface">
    <span
      class="signature-pad__placeholder[ signature-pad__placeholder--hidden]"
      data-testid="signature-placeholder"
      aria-hidden="true"
    >
      Sign here
    </span>
    <div class="signature-pad__baseline" aria-hidden="true" />
    <canvas
      id="signature-canvas-{id}"
      class="signature-pad__canvas"
      data-testid="signature-canvas"
      role="img"
      aria-label="Artist signature drawing area"
      aria-describedby="signature-pad-hint-{id}"
    />
  </div>
  <p id="signature-pad-hint-{id}" class="signature-pad__hint" data-testid="signature-hint">
    Use your finger or pointer to sign inside the box.
  </p>
  <div class="signature-pad__actions">
    <button
      type="button"
      class="btn-secondary"
      data-testid="signature-clear-btn"
      disabled={disabled || empty}
    >
      Clear / Redo
    </button>
  </div>
</div>
```

`{id}` may be `useId()` for stable label association.

### CSS tokens (required)

New BEM block in `index.css`:

```css
.signature-pad__surface {
  position: relative;
  width: 100%;
  min-height: 7.5rem;
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-card);
  background: var(--color-surface-white);
}

.signature-pad__placeholder {
  color: var(--color-text-muted);
  /* centered in surface when visible */
}

.signature-pad__baseline {
  border-bottom: 1px solid color-mix(in srgb, var(--color-primary-brown) 25%, transparent);
  /* positioned ~75% from top of surface */
}

.signature-pad__canvas {
  display: block;
  width: 100%;
  height: auto;
  touch-action: none;
}

.signature-pad__hint {
  font-size: 0.8125rem;
  color: var(--color-text-muted);
}
```

Canvas ink stroke style remains `#111` (existing intentional constant).

### Pointer behavior contract

| Handler | MUST | MUST NOT |
|---------|------|----------|
| `pointerdown` | Capture pointer; start `currentStrokeRef` | Call full redraw |
| `pointermove` (drawing) | Draw single segment `prev→curr` | Call `clearRect` / full redraw |
| `pointerup` / `pointerleave` | Push stroke; full redraw once; `onChange` | — |
| `clear` | Reset strokes; full redraw; `onChange(null)` | — |
| `disabled` | Ignore all pointer handlers | — |

### Payload contract (unchanged)

`onChange` emits:

- `null` when no strokes
- `btoa(JSON.stringify(Point[][]))` otherwise

Example: `[[{"x":10,"y":20},{"x":30,"y":40}]]` → base64 string.

Backend `SignatureValidator` accepts this format without modification.

## Component: `FinalizeSettlementPanel`

**Path**: `apps/web/src/components/settlement/FinalizeSettlementPanel.tsx`

### Integration changes

```typescript
<SignaturePad
  onChange={setSignatureData}
  disabled={finalize.isPending}
/>
```

All other props, gating (`useCanSignSettlement`), confirmation checkbox, and finalize button logic unchanged.

### Test IDs (unchanged unless noted)

| Element | Pattern |
|---------|---------|
| Panel | `finalize-settlement-panel` |
| Signature pad root | `signature-pad` |
| Canvas | `signature-canvas` |
| Placeholder | `signature-placeholder` |
| Hint | `signature-hint` |
| Clear | `signature-clear-btn` |
| Confirm checkbox | `finalize-confirm-checkbox` |
| Finalize button | `finalize-settlement-btn` |

### Fixture expectations

| Scenario | Expected |
|----------|----------|
| Panel load (authorized) | Label "Artist signature", bordered surface, placeholder visible, baseline present |
| After drawing | Placeholder hidden, `onChange` non-null |
| Clear | Placeholder visible, `onChange(null)` |
| No signature + confirm checked | Finalize disabled |
| Signature + no confirm | Finalize disabled |
| Signature + confirm | Finalize enabled |
| `isPending` | Canvas non-interactive, clear disabled |
| No sign permission | Panel not in DOM |
