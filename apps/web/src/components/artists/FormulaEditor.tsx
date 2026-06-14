export const FORMULA_TOKENS = [
  'GrossRevenue',
  'TotalDeductions',
  'BaseGuarantee',
  'SplitPercentage',
] as const;

interface FormulaEditorProps {
  expression: string;
  onChange: (expression: string) => void;
  error?: string | null;
  disabled?: boolean;
}

export function FormulaEditor({
  expression,
  onChange,
  error,
  disabled = false,
}: FormulaEditorProps) {
  return (
    <div className="formula-editor" data-testid="formula-editor">
      <label htmlFor="formula-expression">Custom formula</label>
      <textarea
        id="formula-expression"
        className="formula-editor__textarea"
        value={expression}
        disabled={disabled}
        rows={3}
        data-testid="formula-textarea"
        onChange={(e) => onChange(e.target.value)}
        placeholder="(GrossRevenue - TotalDeductions) * SplitPercentage - BaseGuarantee"
      />
      <div className="formula-editor__tokens" data-testid="formula-tokens">
        <span className="formula-editor__tokens-label">Available tokens:</span>
        <ul>
          {FORMULA_TOKENS.map((token) => (
            <li key={token} data-testid={`token-${token}`}>
              {token}
            </li>
          ))}
        </ul>
      </div>
      {error && (
        <p className="formula-editor__error" role="alert" data-testid="formula-error">
          {error}
        </p>
      )}
    </div>
  );
}
