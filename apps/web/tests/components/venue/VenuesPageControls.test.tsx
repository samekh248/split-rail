import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { VenuesPageControls } from '@/components/venue/VenuesPageControls';

const FILTER_OPTIONS = [
  { value: 'all' as const, label: 'All regions' },
  { value: 'region-a', label: 'West' },
  { value: 'unassigned' as const, label: 'Unassigned' },
];

describe('VenuesPageControls', () => {
  it('renders region filter when hasRegions is true', () => {
    render(
      <VenuesPageControls
        regionFilter="all"
        filterOptions={FILTER_OPTIONS}
        hasRegions
        canManageVenues
        onRegionFilterChange={vi.fn()}
        onManageRegions={vi.fn()}
      />,
    );

    expect(screen.getByTestId('venues-region-filter')).toHaveTextContent('All regions');
  });

  it('hides region filter when hasRegions is false', () => {
    render(
      <VenuesPageControls
        regionFilter="all"
        filterOptions={[]}
        hasRegions={false}
        canManageVenues
        onRegionFilterChange={vi.fn()}
        onManageRegions={vi.fn()}
      />,
    );

    expect(screen.queryByTestId('venues-region-filter')).not.toBeInTheDocument();
  });

  it('renders nothing when there are no regions and the user cannot manage venues', () => {
    const { container } = render(
      <VenuesPageControls
        regionFilter="all"
        filterOptions={[]}
        hasRegions={false}
        canManageVenues={false}
        onRegionFilterChange={vi.fn()}
        onManageRegions={vi.fn()}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('calls onManageRegions when manage button is clicked', () => {
    const onManageRegions = vi.fn();
    render(
      <VenuesPageControls
        regionFilter="all"
        filterOptions={FILTER_OPTIONS}
        hasRegions
        canManageVenues
        onRegionFilterChange={vi.fn()}
        onManageRegions={onManageRegions}
      />,
    );

    fireEvent.click(screen.getByTestId('venues-manage-regions'));
    expect(onManageRegions).toHaveBeenCalled();
  });

  it('shows exactly one integrated create-regions prompt when there are zero regions', () => {
    render(
      <VenuesPageControls
        regionFilter="all"
        filterOptions={[]}
        hasRegions={false}
        canManageVenues
        onRegionFilterChange={vi.fn()}
        onManageRegions={vi.fn()}
      />,
    );

    expect(screen.getAllByTestId('venues-manage-regions')).toHaveLength(1);
    expect(screen.getByTestId('venues-manage-regions')).toHaveTextContent('Create your first region');
    expect(screen.queryByTestId('venues-no-regions-helper')).not.toBeInTheDocument();
  });

  it('labels the button "Manage regions" when regions already exist', () => {
    render(
      <VenuesPageControls
        regionFilter="all"
        filterOptions={FILTER_OPTIONS}
        hasRegions
        canManageVenues
        onRegionFilterChange={vi.fn()}
        onManageRegions={vi.fn()}
      />,
    );

    expect(screen.getByTestId('venues-manage-regions')).toHaveTextContent('Manage regions');
  });
});
