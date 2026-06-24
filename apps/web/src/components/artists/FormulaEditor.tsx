import { useRef } from 'react';

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const selectionRef = useRef({ start: 0, end: 0 });
  const hasFocusedRef = useRef(false);

  const trackSelection = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    selectionRef.current = {
      start: textarea.selectionStart ?? 0,
      end: textarea.selectionEnd ?? 0,
    };
  };

  const insertToken = (token: string) => {
    if (disabled) return;

    const textarea = textareaRef.current;
    let start: number;
    let end: number;

    if (textarea && document.activeElement === textarea) {
      start = textarea.selectionStart ?? 0;
      end = textarea.selectionEnd ?? start;
    } else if (hasFocusedRef.current) {
      ({ start, end } = selectionRef.current);
    } else {
      start = expression.length;
      end = expression.length;
    }

    const next = `${expression.slice(0, start)}${token}${expression.slice(end)}`;
    onChange(next);

    const cursor = start + token.length;
    selectionRef.current = { start: cursor, end: cursor };
    requestAnimationFrame(() => {
      if (!textareaRef.current) return;
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(cursor, cursor);
    });
  };

  return (
    <div className="formula-editor" data-testid="formula-editor">
      <label htmlFor="formula-expression">Custom formula</label>
      <textarea
        id="formula-expression"
        ref={textareaRef}
        className="formula-editor__textarea"
        value={expression}
        disabled={disabled}
        rows={3}
        data-testid="formula-textarea"
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => {
          hasFocusedRef.current = true;
          trackSelection();
        }}
        onSelect={trackSelection}
        onBlur={trackSelection}
        placeholder="(GrossRevenue - TotalDeductions) * SplitPercentage - BaseGuarantee"
      />
      <div className="formula-editor__tokens" data-testid="formula-tokens">
        <span className="formula-editor__tokens-label">Available tokens:</span>
        <ul>
          {FORMULA_TOKENS.map((token) => (
            <li key={token}>
              <button
                type="button"
                className="formula-editor__token-btn"
                data-testid={`token-insert-${token}`}
                disabled={disabled}
                onClick={() => insertToken(token)}
              >
                {token}
              </button>
              <span data-testid={`token-${token}`} className="sr-only">
                {token}
              </span>
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
