# Quickstart & Validation: Settlement Signature Form UX and Drawing Performance

**Feature**: `078-settlement-signature-ux` | **Date**: 2026-07-02

Manual and automated validation for the settlement signature form and drawing performance. See [contracts/settlement-signature-ui.md](./contracts/settlement-signature-ui.md) and [data-model.md](./data-model.md).

## Prerequisites

- Node 20+
- Branch `078-settlement-signature-ux`
- Event ledger page with a user that has settlement sign permission

```bash
cd apps/web
npm install
```

## Automated tests

```bash
cd apps/web
npm run test -- tests/settlement/SignaturePad.test.tsx
npm run test -- tests/settlement/FinalizeSettlementPanel.test.tsx
```

**Expected**: All scenarios pass; ≥80% line/branch coverage on `SignaturePad.tsx`, `FinalizeSettlementPanel.tsx`, and test files.

## Scenario A — Signature form presentation (User Story 1, P1)

1. Render `SignaturePad` in isolation (or open finalize panel on event ledger).

**Expected**:

- Visible label **Artist signature**
- Bordered signing surface distinct from panel background
- Placeholder text **Sign here** when empty
- Horizontal baseline visible inside surface
- Helper hint below surface
- **Clear / Redo** uses secondary button styling

2. Draw a short stroke.

**Expected**: Placeholder hidden; ink visible on canvas.

3. Click **Clear / Redo**.

**Expected**: Canvas empty; placeholder and baseline cues return; `onChange(null)`.

## Scenario B — Drawing responsiveness (User Story 2, P1)

### Automated

Run `SignaturePad.test.tsx` performance regression test:

**Expected**: Simulated rapid `pointermove` events do **not** invoke `clearRect` on every move (full redraw only on stroke end / clear).

### Manual

1. Open event ledger finalize panel in browser.
2. Draw a long, continuous signature for 10+ seconds with many direction changes.

**Expected**: Ink follows pointer/finger with no visible lag; no slowdown as signature grows.

3. Clear and redraw several times.

**Expected**: Consistent responsiveness across attempts.

## Scenario C — Finalize workflow preserved (User Story 3, P2)

1. Open finalize panel; do not sign.

**Expected**: Finalize button disabled.

2. Sign only (no confirmation checkbox).

**Expected**: Finalize button still disabled.

3. Sign and check confirmation.

**Expected**: Finalize button enabled; submit succeeds with same payload shape as before.

4. Log in as user without sign permission (or mock `useCanSignSettlement` → `false`).

**Expected**: Finalize panel not rendered.

## Scenario D — Pending finalize guard (edge case)

1. Trigger finalize with slow network (or mock `isPending: true`).

**Expected**: Signature pad does not accept new strokes; clear button disabled.

## Scenario E — Responsive surface (edge case)

1. Resize viewport to narrow mobile width.

**Expected**: Signing surface spans available width; strokes align with pointer position (no horizontal drift).

## Coverage gate

```bash
cd apps/web
npm run test -- --coverage
```

**Expected**: Touched settlement component files meet ≥80% line/branch coverage (Constitution III). No backend coverage required for this slice.
