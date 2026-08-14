import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ViewToggle } from '@/components/festival/ViewToggle';
import { clearItineraryViewMode, writeItineraryViewMode } from '@/lib/itineraryViewStorage';

describe('ViewToggle', () => {
  beforeEach(() => {
    clearItineraryViewMode();
  });

  it('shows the active view label', () => {
    render(<ViewToggle mode="internal" onChange={vi.fn()} />);
    expect(screen.getByTestId('festival-view-active-label')).toHaveTextContent('Internal view');
  });

  it('persists view mode via storage helper', () => {
    writeItineraryViewMode('public');
    render(<ViewToggle mode="public" onChange={vi.fn()} />);
    expect(screen.getByTestId('festival-view-active-label')).toHaveTextContent('Public view');
    expect(screen.getByTestId('festival-view-public')).toHaveAttribute('aria-pressed', 'true');
  });

  it('calls onChange when toggling views', () => {
    const onChange = vi.fn();
    render(<ViewToggle mode="internal" onChange={onChange} />);

    fireEvent.click(screen.getByTestId('festival-view-public'));
    expect(onChange).toHaveBeenCalledWith('public');
  });

  it('renders publish controls only when the user can publish', () => {
    const { rerender } = render(
      <ViewToggle mode="internal" onChange={vi.fn()} hasSelectedBlock canPublish={false} />,
    );
    expect(screen.queryByTestId('festival-publish-visibility')).not.toBeInTheDocument();

    rerender(
      <ViewToggle
        mode="internal"
        onChange={vi.fn()}
        hasSelectedBlock
        canPublish
        selectedBlockIsPublic={false}
        onPublishToggle={vi.fn()}
      />,
    );
    expect(screen.getByTestId('festival-publish-visibility')).toBeInTheDocument();
  });
});
