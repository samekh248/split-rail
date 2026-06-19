import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { BottleneckFilter } from '@/components/dashboard/BottleneckFilter';

describe('BottleneckFilter', () => {
  it('updates aria-pressed and calls onToggle', async () => {
    const onToggle = vi.fn();
    const user = userEvent.setup();

    const { rerender } = render(
      <BottleneckFilter active={false} onToggle={onToggle} alertedCount={2} />,
    );

    const toggle = screen.getByTestId('bottleneck-filter-toggle');
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(toggle).toHaveTextContent('Needs attention (2)');

    await user.click(toggle);
    expect(onToggle).toHaveBeenCalledTimes(1);

    rerender(<BottleneckFilter active onToggle={onToggle} alertedCount={2} />);
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
  });
});
