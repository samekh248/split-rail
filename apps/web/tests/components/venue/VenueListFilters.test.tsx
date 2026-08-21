import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { VenueListFilters } from '@/components/venue/VenueListFilters';
import { pickSelectFieldOption } from '../../utils/selectField';

const FILTER_OPTIONS = [
  { value: 'all' as const, label: 'All regions' },
  { value: 'region-a', label: 'West' },
  { value: 'unassigned' as const, label: 'Unassigned' },
];

describe('VenueListFilters', () => {
  it('renders as its own filter widget with the region control', () => {
    render(
      <VenueListFilters
        regionFilter="all"
        filterOptions={FILTER_OPTIONS}
        onRegionFilterChange={vi.fn()}
      />,
    );

    expect(screen.getByTestId('venue-list-filters')).toHaveAttribute('aria-label', 'Venue filters');
    expect(screen.getByTestId('venues-region-filter')).toHaveTextContent('All regions');
  });

  it('calls onRegionFilterChange when the region filter changes', async () => {
    const onRegionFilterChange = vi.fn();
    const user = userEvent.setup();

    render(
      <VenueListFilters
        regionFilter="all"
        filterOptions={FILTER_OPTIONS}
        onRegionFilterChange={onRegionFilterChange}
      />,
    );

    await pickSelectFieldOption(user, 'venues-region-filter', 'region-a');
    expect(onRegionFilterChange).toHaveBeenCalledWith('region-a');
  });
});
