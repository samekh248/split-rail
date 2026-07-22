# Data Model: Settlement Signature Form UX and Drawing Performance

**Feature**: `078-settlement-signature-ux` | **Date**: 2026-07-02

No database schema or API changes. Describes client-side signature capture state, UI view model, and existing finalize contract consumption.

## API fields consumed (existing)

### `FinalizeSettlementRequest` (from `generated-api.ts`)

| Field | Use |
|-------|-----|
| `signatureData` | Base64-encoded JSON array of stroke point arrays submitted on finalize |
| `confirmed` | Must be `true` when submitting |

Submitted via `useFinalizeSettlement(venueId, eventId)` — unchanged.

### Permission hook

| Hook | Use |
|------|-----|
| `useCanSignSettlement()` | When `false`, `FinalizeSettlementPanel` returns `null` (FR-010) |

## Client type: `Point`

```typescript
interface Point {
  x: number;
  y: number;
}
```

Canvas-space coordinates; unchanged from current implementation.

## Client type: `SignatureStrokeData`

```typescript
type SignatureStrokeData = Point[][];
```

Serialized as `btoa(JSON.stringify(strokes))` for `onChange` / finalize payload. **Format unchanged** (FR-008).

## Client type: `SignaturePadProps` (extended)

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `onChange` | `(signatureBase64: string \| null) => void` | no | Emits `null` when empty; base64 payload when ≥1 point across strokes |
| `width` | `number` | no | Default `400`; internal canvas bitmap width |
| `height` | `number` | no | Default `120`; internal canvas bitmap height |
| `disabled` | `boolean` | no | Default `false`; when `true`, block pointer input and clear action |

## Client state: `SignaturePad` internal refs

| Ref / state | Purpose |
|-------------|---------|
| `strokesRef` | Completed strokes (`Point[][]`) |
| `currentStrokeRef` | In-progress stroke points |
| `drawingRef` | Whether pointer is down |
| `revision` (state) | Triggers re-render for empty vs. ink UI (placeholder visibility) |

## UI view model: empty vs. signed

| Condition | UI |
|-----------|-----|
| `strokesRef` empty and `currentStrokeRef` empty | Show placeholder "Sign here", baseline visible, `onChange(null)` |
| Any points captured | Hide placeholder, show ink on canvas, emit base64 on stroke complete |
| After clear | Restore empty row of table above |

## Component integration (`FinalizeSettlementPanel`)

```text
<section class="finalize-settlement-panel" data-testid="finalize-settlement-panel">
  <h3>Finalize Settlement</h3>
  <p>…instruction…</p>
  <SignaturePad
    onChange={setSignatureData}
    disabled={finalize.isPending}
  />
  <label>…confirmation checkbox…</label>
  <button data-testid="finalize-settlement-btn" disabled={!signatureData || !confirmed || isPending} />
</section>
```

Finalize button enablement rules unchanged (FR-009).

## Rendering lifecycle

| Event | Canvas action |
|-------|---------------|
| Mount | Full redraw (empty) |
| Pointer down | Start stroke; **no** full redraw |
| Pointer move | Incremental segment only |
| Pointer up / leave | Commit stroke to `strokesRef`; full redraw once; emit change |
| Clear | Reset refs; full redraw; emit `null` |
| `disabled` → `true` | Ignore pointer; clear button disabled |

## Accessibility

| Element | Requirement |
|---------|-------------|
| Label | `<label>` associated with canvas via `htmlFor` / `id` |
| Canvas | `role="img"` with `aria-label="Artist signature drawing area"` |
| Placeholder | `aria-hidden="true"` (decorative; label + hint convey purpose) |
| Hint | `id` referenced by `aria-describedby` on canvas |
| Clear button | Visible text "Clear / Redo"; disabled when `disabled` or empty |
