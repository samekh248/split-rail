import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PinToggleButton } from '@/components/PinToggleButton';

describe('PinToggleButton', () => {
  it('announces pin and unpin labels and reports pressed state', () => {
    const onToggle = vi.fn();
    const { rerender } = render(
      <PinToggleButton
        pinned={false}
        onToggle={onToggle}
        pinnedLabel="Unpin festival"
        unpinnedLabel="Pin festival"
        testId="pin-btn"
      />,
    );

    const button = screen.getByTestId('pin-btn');
    expect(button).toHaveAttribute('aria-label', 'Pin festival');
    expect(button).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(button);
    expect(onToggle).toHaveBeenCalledTimes(1);

    rerender(
      <PinToggleButton
        pinned
        onToggle={onToggle}
        pinnedLabel="Unpin festival"
        unpinnedLabel="Pin festival"
        testId="pin-btn"
      />,
    );

    expect(screen.getByTestId('pin-btn')).toHaveAttribute('aria-label', 'Unpin festival');
    expect(screen.getByTestId('pin-btn')).toHaveAttribute('aria-pressed', 'true');
  });
});
