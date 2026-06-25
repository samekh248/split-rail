import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { VenueListGrouped } from '@/components/venue/VenueListGrouped';
import type { VenueRegionSection } from '@/lib/venueListView';

const VENUE = {
  id: 'venue-1',
  name: 'Hall A',
  organizationId: 'org-1',
  createdAt: '2026-06-01T00:00:00Z',
  regionId: 'region-a',
};

const SECTIONS: VenueRegionSection[] = [
  {
    sectionKey: 'region-a',
    title: 'West',
    venues: [VENUE],
  },
  {
    sectionKey: 'region-b',
    title: 'East',
    venues: [],
  },
  {
    sectionKey: 'unassigned',
    title: 'Unassigned',
    venues: [],
  },
];

describe('VenueListGrouped', () => {
  it('renders grouped sections with headings', () => {
    render(
      <VenueListGrouped
        sections={SECTIONS}
        canManage
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByTestId('venues-grouped-list')).toBeInTheDocument();
    expect(screen.getByTestId('venues-region-section-region-a')).toBeInTheDocument();
    expect(screen.getByText('West')).toBeInTheDocument();
    expect(screen.getByText('Hall A')).toBeInTheDocument();
  });

  it('shows empty message for sections without venues', () => {
    render(
      <VenueListGrouped
        sections={SECTIONS}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByTestId('venues-region-empty-region-b')).toHaveTextContent('No venues');
  });

  it('does not render a region column in grouped tables', () => {
    render(
      <VenueListGrouped
        sections={[SECTIONS[0]!]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.queryByRole('columnheader', { name: 'Region' })).not.toBeInTheDocument();
  });

  it('invokes edit and delete handlers', () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(
      <VenueListGrouped
        sections={[SECTIONS[0]!]}
        canManage
        onEdit={onEdit}
        onDelete={onDelete}
      />,
    );

    fireEvent.click(screen.getByTestId(`edit-venue-${VENUE.id}`));
    fireEvent.click(screen.getByTestId(`delete-venue-${VENUE.id}`));
    expect(onEdit).toHaveBeenCalledWith(VENUE);
    expect(onDelete).toHaveBeenCalledWith(VENUE);
  });
});
