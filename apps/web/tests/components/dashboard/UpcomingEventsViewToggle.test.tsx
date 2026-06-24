import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { UpcomingEventsViewToggle } from '@/components/dashboard/UpcomingEventsViewToggle';

describe('UpcomingEventsViewToggle', () => {
  it('marks list as pressed when mode is list', () => {
    render(<UpcomingEventsViewToggle mode="list" onChange={vi.fn()} />);
    expect(screen.getByTestId('upcoming-view-list')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('upcoming-view-calendar')).toHaveAttribute('aria-pressed', 'false');
  });

  it('marks calendar as pressed when mode is calendar', () => {
    render(<UpcomingEventsViewToggle mode="calendar" onChange={vi.fn()} />);
    expect(screen.getByTestId('upcoming-view-calendar')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('upcoming-view-list')).toHaveAttribute('aria-pressed', 'false');
  });

  it('calls onChange when calendar is selected', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<UpcomingEventsViewToggle mode="list" onChange={onChange} />);

    await user.click(screen.getByTestId('upcoming-view-calendar'));
    expect(onChange).toHaveBeenCalledWith('calendar');
  });
});
