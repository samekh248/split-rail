# Contract: Grid Variance Derivation (Frontend)

**Feature**: 020-grid-variance-derivation  
**Extends**: [002-financial-ledger-grid/contracts/ledger.md](../../002-financial-ledger-grid/contracts/ledger.md)  
**Date**: 2026-06-18

Documents client-side variance derivation and display. REST ledger contract unchanged; monetary fields remain JSON strings.

## Library: `ledgerVariance.ts`

### `deriveVariance(qboActual, settlement)`

```typescript
function deriveVariance(
  qboActual: string | null | undefined,
  settlement: string | null | undefined,
): string;
```

- Returns `subtractMoney(normalize(qboActual), normalize(settlement))`.
- `normalize` maps null/undefined/empty to `'0.00'`.
- MUST NOT use JavaScript `number` for arithmetic.

### `resolveVarianceDisplay(input)`

```typescript
interface ResolveVarianceInput {
  qboActual: string | null | undefined;
  settlement: string | null | undefined;
  serverVariance: string | null | undefined;
}

interface ResolvedVariance {
  displayVariance: string;
  flagged: boolean;
  clientDerived: string;
  agreesWithServer: boolean;
}

function resolveVarianceDisplay(input: ResolveVarianceInput): ResolvedVariance;
```

**Rules**:

1. `clientDerived = deriveVariance(qboActual, settlement)`.
2. `agreesWithServer = compareMoney(clientDerived, serverVariance ?? '0.00') === 0`.
3. `displayVariance = agreesWithServer ? clientDerived : normalizeMoney(serverVariance ?? '0.00')`.
4. `flagged = isNonZeroVariance(displayVariance)`.

## Component: `VarianceCell`

### Props (updated)

```typescript
interface VarianceCellProps {
  qboActual: string | null | undefined;
  settlement: string | null | undefined;
  serverVariance: string | null | undefined;
}
```

### Behavior

```text
<td data-testid="variance-cell" data-flagged="{flagged}" class="variance-cell[--flagged]">
  {formatMoney(displayVariance)}
</td>
```

- MUST call `resolveVarianceDisplay` internally (or receive pre-resolved values from parent — prefer internal call for single source).
- MUST NOT accept a raw `variance` prop without `qboActual` / `settlement` (removes server-only passthrough).

### Test IDs (unchanged)

| Element | `data-testid` |
|---------|---------------|
| Variance cell | `variance-cell` |
| Flagged state | `data-flagged="true"` \| `"false"` |

## Component: `LedgerRow`

Passes row monetary fields to `VarianceCell`:

```tsx
<VarianceCell
  qboActual={row.qboActualValue}
  settlement={row.settlementValue}
  serverVariance={row.variance}
/>
```

## Component: `LedgerGrid`

### Reconciled variance banner

```typescript
const hasVarianceAlerts = blocks.some((block) =>
  (block.rows ?? []).some((row) =>
    resolveVarianceDisplay({
      qboActual: row.qboActualValue,
      settlement: row.settlementValue,
      serverVariance: row.variance,
    }).flagged,
  ),
);
```

Banner visibility unchanged: `isReconciled && hasVarianceAlerts` → `data-testid="variance-banner"`.

## Parity vectors (client tests)

| qboActual | settlement | Expected display |
|-----------|------------|------------------|
| `0.00` | `500.00` | `-500.00` |
| `1000.00` | `1000.00` | `0.00` |
| `1000.00` | `999.99` | `0.01` |
| `null` | `125.50` | `-125.50` |
| `200.00` | `null` | `200.00` |

When `serverVariance` matches derived value, `displayVariance` equals derived. When `serverVariance` intentionally differs in tests, `displayVariance` equals normalized server value.

## Out of scope

- Manual variance edit
- New API fields
- PDF export / settlement summary surfaces
- User-visible mismatch UI (server fallback only)
