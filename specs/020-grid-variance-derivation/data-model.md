# Data Model: Client-Side Ledger Variance Derivation

**Feature**: 020-grid-variance-derivation  
**Date**: 2026-06-18

No database or API schema changes. This document describes the **client-side view model** for variance display on existing `LineItemDto` rows from the ledger grid response.

## Existing API entity (unchanged)

### `LineItemDto` (from `generated-api.ts`)

| Field | Type | Role in this feature |
|-------|------|----------------------|
| `qboActualValue` | `string?` | Minuend for client derivation |
| `settlementValue` | `string?` | Subtrahend for client derivation |
| `variance` | `string?` | Authoritative server-computed value (`qboActual − settlement` on server) |
| `varianceFlagged` | `boolean?` | Server flag (`|variance| > 0`); superseded for display by client resolver when wired |

**Formula (server and client must agree)**:

```text
variance = qboActualValue − settlementValue
```

Null/missing monetary inputs normalize to `"0.00"` before subtraction.

## Client view model (new)

### `ResolvedVariance`

Ephemeral result of `resolveVarianceDisplay` — not persisted or sent to API.

| Field | Type | Description |
|-------|------|-------------|
| `displayVariance` | `string` | Two-decimal string shown in the grid |
| `flagged` | `boolean` | `true` when `\|displayVariance\| > 0.00` |
| `clientDerived` | `string` | Result of `subtractMoney(qboActual, settlement)` |
| `agreesWithServer` | `boolean` | `clientDerived === normalizeMoney(serverVariance ?? '0.00')` |

### Resolution rules

1. Compute `clientDerived = deriveVariance(qboActual, settlement)`.
2. If `agreesWithServer` → `displayVariance = clientDerived`.
3. If not → `displayVariance = normalizeMoney(serverVariance ?? '0.00')` (server wins).
4. `flagged = isNonZeroVariance(displayVariance)`.

## Relationships

```text
LedgerGridResponse
└── blocks[]
    └── rows[] (LineItemDto)
            ├── qboActualValue ──┐
            ├── settlementValue ─┼──► resolveVarianceDisplay() ──► VarianceCell
            └── variance ────────┘         (authoritative fallback)
```

## Validation rules

| Rule | Source |
|------|--------|
| No floating-point in derivation path | Constitution I; `subtractMoney` uses `bigint` cents |
| Variance is read-only | FR-008 |
| Display matches server when inputs agree | FR-004, SC-002 |
| Two decimal places on display | FR-002 |

## State transitions

Variance derivation is **stateless per render**: whenever row monetary fields change and React re-renders, `resolveVarianceDisplay` runs again. No local cache of variance independent of `qboActualValue` / `settlementValue`.
