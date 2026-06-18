# Research: Client-Side Ledger Variance Derivation

**Feature**: 020-grid-variance-derivation (Linear SPLR-31)  
**Date**: 2026-06-18

## 1. Where variance is computed today

**Decision**: Server computes variance in `LedgerService.ToLineItemDto` as `li.QboActualValue - li.SettlementValue` (`decimal`); DTO exposes `variance` and `varianceFlagged` (`Math.Abs(variance) > 0m`). Frontend `LedgerRow` passes `row.variance` directly to `VarianceCell` without client derivation.

**Rationale**: FR-016 (spec 002) requires dual computation. `subtractMoney` in `apps/web/src/lib/money.ts` already implements BigInt-cents subtraction but is unused in grid components.

**Alternatives considered**:
- **Remove server variance, client-only**: Rejected — server remains authoritative for API consumers and reconciliation audits.
- **New API field for client variance**: Rejected — violates spec assumption; derivation is a display concern.

## 2. Client derivation helper placement

**Decision**: Add `apps/web/src/lib/ledgerVariance.ts` with:
- `deriveVariance(qboActual, settlement)` — wraps `subtractMoney` with null/undefined → `'0.00'` normalization.
- `resolveVarianceDisplay({ qboActual, settlement, serverVariance })` — returns `{ displayVariance, flagged, clientDerived, agreesWithServer }`.

**Rationale**: Keeps `money.ts` as primitive ops; colocates FR-016 resolution logic (derive + server fallback) in one testable module. Mirrors `dealMathPreview.ts` pattern from spec 019.

**Alternatives considered**:
- **Inline in `VarianceCell`**: Rejected — `LedgerGrid` banner also needs derived flags; shared helper avoids duplication.
- **Extend `money.ts` only**: Rejected — mixes low-level cents math with row-resolution policy.

## 3. Display and highlighting on client/server mismatch

**Decision**: When `clientDerived !== serverVariance`, display `serverVariance` (FR-003). Highlighting (`flagged`) follows **displayed** variance via `isNonZeroVariance(displayVariance)` — not client-derived when they disagree.

**Rationale**: Users must never see a highlighted discrepancy that contradicts the displayed amount. Mismatch is a defect caught in tests (`agreesWithServer === false`); production path assumes agreement under normal operation (FR-004).

**Alternatives considered**:
- **Highlight from client-derived always**: Rejected — could flag a cell showing `$0.00`.
- **User-visible mismatch indicator**: Rejected — out of scope; mismatch should not occur in production.

## 4. Reconciled variance banner

**Decision**: Update `LedgerGrid` `hasVarianceAlerts` to use `resolveVarianceDisplay` per row instead of raw `row.varianceFlagged`, so banner reflects client-derived non-zero state when inputs agree with server.

**Rationale**: Spec edge case: "reconciled alert banner continues when any row has a non-zero **derived** variance." Server `varianceFlagged` should match when in agreement; using the same resolver keeps banner and cells consistent.

**Alternatives considered**:
- **Keep server `varianceFlagged` for banner**: Rejected — banner could disagree with cell display after settlement edits before refresh.

## 5. Backend changes

**Decision**: No backend code changes. Existing `ToLineItemDto` already satisfies server-side FR-016. Backend coverage for this feature is satisfied by existing integration paths that assert `variance` on ledger responses (spec 002 Scenario D).

**Rationale**: Spec explicitly states server contract unchanged. SPLR-31 is a frontend wiring gap.

**Alternatives considered**:
- **Add xUnit unit test for `ToLineItemDto` variance**: Optional nice-to-have; not required if no code touched.

## 6. Test strategy

**Decision**:
- **Vitest unit**: `ledgerVariance.test.ts` — derive, resolve, agreement, mismatch fallback, null inputs, boundary cents.
- **Vitest component**: Extend `VarianceCell.test.tsx` and `LedgerRow` tests (or new `LedgerRow.test.tsx`) with qbo/settlement props and derived display.
- **Vitest grid**: Extend `LedgerGrid.test.tsx` — banner uses derived flags.
- **Golden parity**: Client `deriveVariance('1000.00','999.99')` === server string `'0.01'` for vectors mirroring `money.test.ts`.

**Rationale**: Constitution III; feature is frontend-only. ≥80% coverage on touched files.

**Alternatives considered**:
- **Playwright E2E for variance**: Deferred — no multi-user flow; Vitest sufficient for display math.
