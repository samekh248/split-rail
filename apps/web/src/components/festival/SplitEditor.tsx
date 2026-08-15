import { useMemo, useState } from 'react';
import { formatMoney } from '@/lib/money';
import type { ExpenseSourceSummaryResponse } from '@/types/generated-api';

export type SplitMethod = 'EQUAL' | 'PERCENTAGE' | 'FIXED_AMOUNT' | 'MANUAL_LINE';

export interface SplitTargetPreview {
  id: string;
  label: string;
  amount: string;
}

export interface SplitEditorProps {
  summary: ExpenseSourceSummaryResponse | null;
  method: SplitMethod;
  onMethodChange: (method: SplitMethod) => void;
  previewTargets: SplitTargetPreview[];
  canManage?: boolean;
}

const METHOD_OPTIONS: { value: SplitMethod; label: string }[] = [
  { value: 'EQUAL', label: 'Equal split' },
  { value: 'PERCENTAGE', label: 'Percentage' },
  { value: 'FIXED_AMOUNT', label: 'Fixed amount' },
  { value: 'MANUAL_LINE', label: 'Manual line' },
];

function parseAmount(value: string | undefined): number {
  const parsed = Number.parseFloat(value ?? '0');
  return Number.isFinite(parsed) ? parsed : 0;
}

export function SplitEditor({
  summary,
  method,
  onMethodChange,
  previewTargets,
  canManage = false,
}: SplitEditorProps) {
  const [expanded, setExpanded] = useState(true);

  const sourceAmount = parseAmount(summary?.sourceAmount);
  const overheadRemainder = parseAmount(summary?.remainingAtOverhead);
  const previewTotal = previewTargets.reduce(
    (sum, target) => sum + parseAmount(target.amount),
    0,
  );
  const reconciles =
    previewTargets.length === 0 || Math.abs(previewTotal + overheadRemainder - sourceAmount) < 0.005;

  const existingLines = useMemo(() => summary?.allocations ?? [], [summary?.allocations]);

  return (
    <section className="split-editor" data-testid="split-editor">
      <header className="split-editor__header">
        <h3 className="split-editor__title">Expense splits</h3>
        {summary ? (
          <p className="split-editor__source-label">{summary.label ?? 'Source expense'}</p>
        ) : null}
      </header>

      {canManage ? (
        <label className="split-editor__method-label">
          Split method
          <select
            className="split-editor__method"
            data-testid="split-method-select"
            value={method}
            onChange={(event) => onMethodChange(event.target.value as SplitMethod)}
          >
            {METHOD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {previewTargets.length > 0 ? (
        <div className="split-editor__preview" data-testid="split-target-preview">
          <button
            type="button"
            className="split-editor__preview-toggle"
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? 'Hide' : 'Show'} target preview ({previewTargets.length})
          </button>
          {expanded ? (
            <ul className="split-editor__preview-list">
              {previewTargets.map((target) => (
                <li key={target.id} data-testid={`split-preview-${target.id}`}>
                  <span>{target.label}</span>
                  <span>{formatMoney(target.amount)}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <p
        className={
          reconciles
            ? 'split-editor__reconcile split-editor__reconcile--ok'
            : 'split-editor__reconcile split-editor__reconcile--bad'
        }
        data-testid="split-reconcile-indicator"
      >
        {reconciles ? 'Split reconciles to source amount' : 'Split does not reconcile to source amount'}
      </p>

      <aside className="split-editor__overhead" data-testid="split-overhead-remainder">
        <strong>Overhead remainder:</strong> {formatMoney(String(overheadRemainder))}
        <span className="split-editor__overhead-note">
          Unallocated amounts stay at festival overhead.
        </span>
      </aside>

      {existingLines.length > 0 ? (
        <ul className="split-editor__existing">
          {existingLines.map((line) => (
            <li key={line.id} data-testid={`split-line-${line.id}`}>
              <span>{line.targetType}</span>
              <span>{formatMoney(line.calculatedAmount ?? '0')}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="split-editor__empty" data-testid="split-editor-empty">
          No splits recorded for this source yet.
        </p>
      )}

      {summary ? (
        <footer className="split-editor__footer">
          <span>Source: {formatMoney(summary.sourceAmount ?? '0')}</span>
          <span>Allocated: {formatMoney(summary.totalAllocated ?? '0')}</span>
        </footer>
      ) : null}
    </section>
  );
}
