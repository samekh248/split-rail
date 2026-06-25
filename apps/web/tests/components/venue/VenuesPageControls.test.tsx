import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { VenuesPageControls } from '@/components/venue/VenuesPageControls';
import { pickSelectFieldOption } from '../../utils/selectField';

const FILTER_OPTIONS = [
  { value: 'all' as const, label: 'All regions' },
  { value: 'region-a', label: 'West' },
  { value: 'unassigned' as const, label: 'Unassigned' },
];

describe('VenuesPageControls', () => {
  it('renders region filter when showRegionFilter is true', () => {
    render(
      <VenuesPageControls
        regionFilter="all"
        displayMode="flat"
        filterOptions={FILTER_OPTIONS}
        showRegionFilter
        showDisplayToggle
        canManageVenues
        onRegionFilterChange={vi.fn()}
        onDisplayModeChange={vi.fn()}
        onManageRegions={vi.fn()}
      />,
    );

    expect(screen.getByTestId('venues-region-filter')).toHaveTextContent('All regions');
  });

  it('hides region filter when showRegionFilter is false', () => {
    render(
      <VenuesPageControls
        regionFilter="all"
        displayMode="flat"
        filterOptions={[]}
        showRegionFilter={false}
        showDisplayToggle={false}
        canManageVenues
        onRegionFilterChange={vi.fn()}
        onDisplayModeChange={vi.fn()}
        onManageRegions={vi.fn()}
      />,
    );

    expect(screen.queryByTestId('venues-region-filter')).not.toBeInTheDocument();
  });

  it('calls onManageRegions when manage button is clicked', () => {
    const onManageRegions = vi.fn();
    render(
      <VenuesPageControls
        regionFilter="all"
        displayMode="flat"
        filterOptions={FILTER_OPTIONS}
        showRegionFilter
        showDisplayToggle
        canManageVenues
        onRegionFilterChange={vi.fn()}
        onDisplayModeChange={vi.fn()}
        onManageRegions={onManageRegions}
      />,
    );

    fireEvent.click(screen.getByTestId('venues-manage-regions'));
    expect(onManageRegions).toHaveBeenCalled();
  });

  it('changes display mode via select', async () => {
    const onDisplayModeChange = vi.fn();
    const user = userEvent.setup();
    render(
      <VenuesPageControls
        regionFilter="all"
        displayMode="flat"
        filterOptions={FILTER_OPTIONS}
        showRegionFilter
        showDisplayToggle
        canManageVenues={false}
        onRegionFilterChange={vi.fn()}
        onDisplayModeChange={onDisplayModeChange}
        onManageRegions={vi.fn()}
      />,
    );

    await pickSelectFieldOption(user, 'venues-display-mode', 'grouped');
    expect(onDisplayModeChange).toHaveBeenCalledWith('grouped');
  });

  it('shows no-regions helper text when provided', () => {
    render(
      <VenuesPageControls
        regionFilter="all"
        displayMode="flat"
        filterOptions={[]}
        showRegionFilter={false}
        showDisplayToggle={false}
        canManageVenues
        noRegionsHelperText="Create regions with Manage regions to organize venues by territory."
        onRegionFilterChange={vi.fn()}
        onDisplayModeChange={vi.fn()}
        onManageRegions={vi.fn()}
      />,
    );

    expect(screen.getByTestId('venues-no-regions-helper')).toHaveTextContent('Create regions');
  });
});
