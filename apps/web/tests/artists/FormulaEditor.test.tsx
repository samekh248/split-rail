import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FORMULA_TOKENS, FormulaEditor } from '@/components/artists/FormulaEditor';

describe('FormulaEditor', () => {
  it('renders available token list', () => {
    render(<FormulaEditor expression="" onChange={() => undefined} />);

    expect(screen.getByTestId('formula-tokens')).toBeInTheDocument();
    for (const token of FORMULA_TOKENS) {
      expect(screen.getByTestId(`token-insert-${token}`)).toHaveTextContent(token);
    }
  });

  it('calls onChange when expression is edited', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<FormulaEditor expression="" onChange={onChange} />);

    await user.type(screen.getByTestId('formula-textarea'), 'GrossRevenue');
    expect(onChange).toHaveBeenCalled();
  });

  it('inserts token at cursor position when token button is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<FormulaEditor expression="( - TotalDeductions)" onChange={onChange} />);

    const textarea = screen.getByTestId('formula-textarea') as HTMLTextAreaElement;
    textarea.setSelectionRange(1, 1);
    textarea.focus();

    await user.click(screen.getByTestId('token-insert-GrossRevenue'));

    expect(onChange).toHaveBeenCalledWith('(GrossRevenue - TotalDeductions)');
  });

  it('appends token when textarea is not focused', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<FormulaEditor expression="GrossRevenue" onChange={onChange} />);

    await user.click(screen.getByTestId('token-insert-TotalDeductions'));

    expect(onChange).toHaveBeenLastCalledWith('GrossRevenueTotalDeductions');
  });

  it('disables token buttons when editor is disabled', () => {
    render(<FormulaEditor expression="" onChange={() => undefined} disabled />);

    for (const token of FORMULA_TOKENS) {
      expect(screen.getByTestId(`token-insert-${token}`)).toBeDisabled();
    }
  });

  it('displays validation error when provided', () => {
    render(
      <FormulaEditor
        expression="bad()"
        onChange={() => undefined}
        error="Formula could not be evaluated."
      />,
    );

    expect(screen.getByTestId('formula-error')).toHaveTextContent(
      'Formula could not be evaluated.',
    );
  });
});
