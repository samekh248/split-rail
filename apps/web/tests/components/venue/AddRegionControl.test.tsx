import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AddRegionControl } from '@/components/venue/AddRegionControl';

describe('AddRegionControl', () => {
  it('opens a small modal from the add-region button', async () => {
    const user = userEvent.setup();

    render(
      <AddRegionControl onSubmit={vi.fn().mockResolvedValue(true)} />,
    );

    expect(screen.queryByTestId('venues-add-region')).not.toBeInTheDocument();
    expect(screen.getByTestId('venues-add-region-open')).toBeInTheDocument();

    await user.click(screen.getByTestId('venues-add-region-open'));

    const modal = screen.getByTestId('venues-add-region');
    expect(modal).toHaveAttribute('role', 'dialog');
    expect(modal).toHaveClass('region-modal');
    expect(screen.getByLabelText('Region name')).toBeInTheDocument();
  });

  it('closes the modal without submitting when cancelled', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();

    render(<AddRegionControl onSubmit={onSubmit} />);

    await user.click(screen.getByTestId('venues-add-region-open'));
    await user.click(screen.getByTestId('venues-add-region-close'));

    expect(screen.queryByTestId('venues-add-region')).not.toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits the modal form and closes on success', async () => {
    const onSubmit = vi.fn().mockResolvedValue(true);
    const user = userEvent.setup();

    render(<AddRegionControl onSubmit={onSubmit} />);

    await user.click(screen.getByTestId('venues-add-region-open'));
    await user.type(screen.getByLabelText('Region name'), 'Mountain');
    await user.click(screen.getByTestId('venues-add-region-save'));

    expect(onSubmit).toHaveBeenCalledWith('Mountain');
    expect(screen.queryByTestId('venues-add-region')).not.toBeInTheDocument();
  });

  it('keeps the modal open when submit fails', async () => {
    const onSubmit = vi.fn().mockResolvedValue(false);
    const user = userEvent.setup();

    render(
      <AddRegionControl error="Unable to create region." onSubmit={onSubmit} />,
    );

    await user.click(screen.getByTestId('venues-add-region-open'));
    await user.type(screen.getByLabelText('Region name'), 'Mountain');
    await user.click(screen.getByTestId('venues-add-region-save'));

    expect(screen.getByTestId('venues-add-region')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Unable to create region.');
  });
});
