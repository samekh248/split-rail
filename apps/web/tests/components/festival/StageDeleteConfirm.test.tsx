import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StageDeleteConfirm } from '@/components/festival/StageDeleteConfirm';

describe('StageDeleteConfirm', () => {
  it('warns when the stage still has programming blocks', () => {
    render(
      <StageDeleteConfirm
        stageName="Rodeo Arena"
        blockCount={3}
        open
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByTestId('stage-delete-confirm')).toBeInTheDocument();
    expect(screen.getByText(/3 programming blocks/)).toBeInTheDocument();
  });

  it('calls onConfirm from the destructive button', () => {
    const onConfirm = vi.fn();
    render(
      <StageDeleteConfirm
        stageName="Main Stage"
        open
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByTestId('stage-delete-confirm-button'));
    expect(onConfirm).toHaveBeenCalled();
  });
});
