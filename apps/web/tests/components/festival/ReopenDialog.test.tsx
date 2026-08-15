import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ReopenDialog } from '@/components/festival/ReopenDialog';

describe('ReopenDialog', () => {
  it('requires reason code, note, and dispatch acknowledgement', async () => {
    const onConfirm = vi.fn();
    render(
      <ReopenDialog
        open
        requiresDispatchAcknowledgement
        onClose={vi.fn()}
        onConfirm={onConfirm}
      />,
    );

    await userEvent.type(screen.getByLabelText(/Reason code/), 'CORRECTION');
    await userEvent.type(screen.getByLabelText(/Reopen note/), 'Fix guarantee typo');

    const confirm = screen.getByRole('button', { name: 'Reopen' });
    expect(confirm).toBeDisabled();

    await userEvent.click(
      screen.getByRole('checkbox', {
        name: /already dispatched/i,
      }),
    );
    expect(confirm).toBeEnabled();

    await userEvent.click(confirm);
    expect(onConfirm).toHaveBeenCalledWith({
      reasonCode: 'CORRECTION',
      note: 'Fix guarantee typo',
      acknowledgeDispatched: true,
    });
  });
});
