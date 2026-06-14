import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FORMULA_TOKENS, FormulaEditor } from '@/components/artists/FormulaEditor';

describe('FormulaEditor', () => {
  it('renders available token list', () => {
    render(<FormulaEditor expression="" onChange={() => undefined} />);

    expect(screen.getByTestId('formula-tokens')).toBeInTheDocument();
    for (const token of FORMULA_TOKENS) {
      expect(screen.getByTestId(`token-${token}`)).toHaveTextContent(token);
    }
  });

  it('calls onChange when expression is edited', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<FormulaEditor expression="" onChange={onChange} />);

    await user.type(screen.getByTestId('formula-textarea'), 'GrossRevenue');
    expect(onChange).toHaveBeenCalled();
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
