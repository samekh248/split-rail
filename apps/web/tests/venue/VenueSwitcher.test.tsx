import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ALL_VENUES_LABEL, VenueSwitcher } from '@/components/venue/VenueSwitcher';
import { VenueProvider } from '@/venue/VenueContext';
import { setActiveVenueId } from '@/venue/activeVenueStorage';
import { mockWorkspaceFetch } from '../utils/mockWorkspaceFetch';

const REGION_WEST = { id: 'region-a', name: 'West', notes: null, venueCount: 1 };
const REGION_EAST = { id: 'region-b', name: 'East', notes: null, venueCount: 1 };

const VENUE_A = {
  id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  name: 'Hall A',
  organizationId: 'org-1',
  createdAt: '2026-01-01T00:00:00Z',
};

const VENUE_B = {
  id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  name: 'Hall B',
  organizationId: 'org-1',
  createdAt: '2026-01-01T00:00:00Z',
};

const VENUE_WEST = {
  id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  name: 'Hall A',
  organizationId: 'org-1',
  createdAt: '2026-01-01T00:00:00Z',
  regionId: 'region-a',
};

const VENUE_EAST = {
  id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  name: 'Hall B',
  organizationId: 'org-1',
  createdAt: '2026-01-01T00:00:00Z',
  regionId: 'region-b',
};

const VENUE_UNASSIGNED = {
  id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
  name: 'Loft',
  organizationId: 'org-1',
  createdAt: '2026-01-01T00:00:00Z',
  regionId: null,
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <VenueProvider>{children}</VenueProvider>
    </QueryClientProvider>
  );
}

describe('VenueSwitcher', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('defaults to All Venues when no venue is selected', async () => {
    mockWorkspaceFetch({ venues: [VENUE_A, VENUE_B] });

    const user = userEvent.setup();
    render(<VenueSwitcher />, { wrapper: createWrapper() });

    await waitFor(() =>
      expect(screen.getByTestId('venue-switcher-current')).toHaveTextContent(ALL_VENUES_LABEL),
    );
    await user.click(screen.getByTestId('venue-switcher-trigger'));

    expect(screen.getByRole('option', { name: ALL_VENUES_LABEL })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('option', { name: /Hall A/ })).toHaveAttribute('aria-selected', 'false');
  });

  it('lists All Venues and venues by name and indicates the active venue (C5.1, C5.2)', async () => {
    setActiveVenueId(VENUE_A.id);
    mockWorkspaceFetch({ venues: [VENUE_A, VENUE_B] });

    const user = userEvent.setup();
    render(<VenueSwitcher />, { wrapper: createWrapper() });

    await waitFor(() => expect(screen.getByTestId('venue-switcher-current')).toHaveTextContent('Hall A'));
    await user.click(screen.getByTestId('venue-switcher-trigger'));

    expect(screen.getByRole('option', { name: ALL_VENUES_LABEL })).toHaveAttribute(
      'aria-selected',
      'false',
    );
    expect(screen.getByRole('option', { name: /Hall A/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('option', { name: /Hall B/ })).toHaveAttribute('aria-selected', 'false');
  });

  it('calls setActiveVenue when a different venue is chosen (C5.3)', async () => {
    setActiveVenueId(VENUE_A.id);
    mockWorkspaceFetch({ venues: [VENUE_A, VENUE_B] });

    const user = userEvent.setup();
    render(<VenueSwitcher />, { wrapper: createWrapper() });

    await waitFor(() => expect(screen.getByTestId('venue-switcher-current')).toHaveTextContent('Hall A'));
    await user.click(screen.getByTestId('venue-switcher-trigger'));
    await user.click(screen.getByTestId(`venue-option-${VENUE_B.id}`));

    await waitFor(() => expect(screen.getByTestId('venue-switcher-current')).toHaveTextContent('Hall B'));
  });

  it('selects All Venues and clears active venue', async () => {
    setActiveVenueId(VENUE_A.id);
    mockWorkspaceFetch({ venues: [VENUE_A, VENUE_B] });

    const user = userEvent.setup();
    render(<VenueSwitcher />, { wrapper: createWrapper() });

    await waitFor(() => expect(screen.getByTestId('venue-switcher-current')).toHaveTextContent('Hall A'));
    await user.click(screen.getByTestId('venue-switcher-trigger'));
    await user.click(screen.getByTestId('venue-option-all'));

    await waitFor(() =>
      expect(screen.getByTestId('venue-switcher-current')).toHaveTextContent(ALL_VENUES_LABEL),
    );
  });

  it('is keyboard operable with accessible name and current selection (C5.4, FR-013)', async () => {
    setActiveVenueId(VENUE_A.id);
    mockWorkspaceFetch({ venues: [VENUE_A, VENUE_B] });

    const user = userEvent.setup();
    render(<VenueSwitcher />, { wrapper: createWrapper() });

    await waitFor(() => expect(screen.getByTestId('venue-switcher-trigger')).toBeInTheDocument());

    const trigger = screen.getByTestId('venue-switcher-trigger');
    expect(trigger).toHaveAttribute('aria-labelledby');
    expect(screen.getByTestId('venue-switcher-current')).toHaveTextContent('Hall A');

    trigger.focus();
    await user.keyboard('{Enter}');
    expect(screen.getByTestId('venue-switcher-menu')).toBeInTheDocument();

    await user.keyboard('{ArrowDown}{Enter}');
    await waitFor(() => expect(screen.getByTestId('venue-switcher-current')).toHaveTextContent('Hall B'));
  });

  it('renders server response verbatim without client filtering (C5.5, C5.7)', async () => {
    mockWorkspaceFetch({ venues: [VENUE_B] });

    const user = userEvent.setup();
    render(<VenueSwitcher />, { wrapper: createWrapper() });

    await waitFor(() =>
      expect(screen.getByTestId('venue-switcher-current')).toHaveTextContent(ALL_VENUES_LABEL),
    );
    await user.click(screen.getByTestId('venue-switcher-trigger'));
    expect(screen.getByRole('option', { name: /Hall B/ })).toBeInTheDocument();
  });

  it('renders nothing when no venues are accessible (C5.6)', async () => {
    mockWorkspaceFetch({ venues: [] });

    render(<VenueSwitcher />, { wrapper: createWrapper() });

    await waitFor(() => expect(screen.queryByTestId('venue-switcher')).not.toBeInTheDocument());
  });

  it('shows dropdown with All Venues for a single venue', async () => {
    mockWorkspaceFetch({ venues: [VENUE_A] });

    const user = userEvent.setup();
    render(<VenueSwitcher />, { wrapper: createWrapper() });

    await waitFor(() =>
      expect(screen.getByTestId('venue-switcher-current')).toHaveTextContent(ALL_VENUES_LABEL),
    );
    await user.click(screen.getByTestId('venue-switcher-trigger'));
    expect(screen.getByRole('option', { name: ALL_VENUES_LABEL })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Hall A/ })).toBeInTheDocument();
  });

  describe('region filter (US1)', () => {
    it('renders the region filter and narrows the option list to the selected region (T003)', async () => {
      mockWorkspaceFetch({
        venues: [VENUE_WEST, VENUE_EAST],
        regions: [REGION_WEST, REGION_EAST],
      });

      const user = userEvent.setup();
      render(<VenueSwitcher />, { wrapper: createWrapper() });

      await waitFor(() =>
        expect(screen.getByTestId('venue-switcher-current')).toHaveTextContent(ALL_VENUES_LABEL),
      );
      await user.click(screen.getByTestId('venue-switcher-trigger'));

      const filter = screen.getByTestId('venue-switcher-region-filter');
      expect(filter).toBeInTheDocument();

      await user.selectOptions(filter, REGION_WEST.id);

      expect(screen.getByRole('option', { name: ALL_VENUES_LABEL })).toBeInTheDocument();
      expect(screen.getByTestId(`venue-option-${VENUE_WEST.id}`)).toBeInTheDocument();
      expect(screen.queryByTestId(`venue-option-${VENUE_EAST.id}`)).not.toBeInTheDocument();
    });

    it('selecting a venue from a filtered list sets it as the active venue (T004)', async () => {
      mockWorkspaceFetch({
        venues: [VENUE_WEST, VENUE_EAST],
        regions: [REGION_WEST, REGION_EAST],
      });

      const user = userEvent.setup();
      render(<VenueSwitcher />, { wrapper: createWrapper() });

      await waitFor(() =>
        expect(screen.getByTestId('venue-switcher-current')).toHaveTextContent(ALL_VENUES_LABEL),
      );
      await user.click(screen.getByTestId('venue-switcher-trigger'));
      await user.selectOptions(screen.getByTestId('venue-switcher-region-filter'), REGION_WEST.id);
      await user.click(screen.getByTestId(`venue-option-${VENUE_WEST.id}`));

      await waitFor(() =>
        expect(screen.getByTestId('venue-switcher-current')).toHaveTextContent('Hall A'),
      );
    });

    it('resetting the filter to All regions restores the full venue list (T005)', async () => {
      mockWorkspaceFetch({
        venues: [VENUE_WEST, VENUE_EAST],
        regions: [REGION_WEST, REGION_EAST],
      });

      const user = userEvent.setup();
      render(<VenueSwitcher />, { wrapper: createWrapper() });

      await waitFor(() =>
        expect(screen.getByTestId('venue-switcher-current')).toHaveTextContent(ALL_VENUES_LABEL),
      );
      await user.click(screen.getByTestId('venue-switcher-trigger'));
      const filter = screen.getByTestId('venue-switcher-region-filter');
      await user.selectOptions(filter, REGION_WEST.id);
      expect(screen.queryByTestId(`venue-option-${VENUE_EAST.id}`)).not.toBeInTheDocument();

      await user.selectOptions(filter, 'all');

      expect(screen.getByTestId(`venue-option-${VENUE_WEST.id}`)).toBeInTheDocument();
      expect(screen.getByTestId(`venue-option-${VENUE_EAST.id}`)).toBeInTheDocument();
    });
  });

  describe('region grouping (US2)', () => {
    it('groups venues under region headings in alphabetical order when unfiltered (T009)', async () => {
      mockWorkspaceFetch({
        venues: [VENUE_WEST, VENUE_EAST],
        regions: [REGION_WEST, REGION_EAST],
      });

      const user = userEvent.setup();
      render(<VenueSwitcher />, { wrapper: createWrapper() });

      await waitFor(() =>
        expect(screen.getByTestId('venue-switcher-current')).toHaveTextContent(ALL_VENUES_LABEL),
      );
      await user.click(screen.getByTestId('venue-switcher-trigger'));

      const eastHeading = screen.getByTestId(`venue-switcher-section-${REGION_EAST.id}`);
      const westHeading = screen.getByTestId(`venue-switcher-section-${REGION_WEST.id}`);
      expect(eastHeading).toHaveTextContent('East');
      expect(westHeading).toHaveTextContent('West');
      expect(eastHeading.compareDocumentPosition(westHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('shows an Unassigned section only when a venue lacks a region (T010)', async () => {
      mockWorkspaceFetch({
        venues: [VENUE_WEST, VENUE_UNASSIGNED],
        regions: [REGION_WEST, REGION_EAST],
      });

      const user = userEvent.setup();
      render(<VenueSwitcher />, { wrapper: createWrapper() });

      await waitFor(() =>
        expect(screen.getByTestId('venue-switcher-current')).toHaveTextContent(ALL_VENUES_LABEL),
      );
      await user.click(screen.getByTestId('venue-switcher-trigger'));

      expect(screen.getByTestId('venue-switcher-section-unassigned')).toBeInTheDocument();
      expect(screen.queryByTestId(`venue-switcher-section-${REGION_EAST.id}`)).not.toBeInTheDocument();
    });

    it('always renders All Venues first, before any section heading (T011)', async () => {
      mockWorkspaceFetch({
        venues: [VENUE_WEST, VENUE_EAST],
        regions: [REGION_WEST, REGION_EAST],
      });

      const user = userEvent.setup();
      render(<VenueSwitcher />, { wrapper: createWrapper() });

      await waitFor(() =>
        expect(screen.getByTestId('venue-switcher-current')).toHaveTextContent(ALL_VENUES_LABEL),
      );
      await user.click(screen.getByTestId('venue-switcher-trigger'));

      const allOption = screen.getByRole('option', { name: ALL_VENUES_LABEL });
      const eastHeading = screen.getByTestId(`venue-switcher-section-${REGION_EAST.id}`);
      expect(allOption.compareDocumentPosition(eastHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('skips section headings during keyboard traversal and selection (T012)', async () => {
      mockWorkspaceFetch({
        venues: [VENUE_WEST, VENUE_EAST],
        regions: [REGION_WEST, REGION_EAST],
      });

      const user = userEvent.setup();
      render(<VenueSwitcher />, { wrapper: createWrapper() });

      await waitFor(() =>
        expect(screen.getByTestId('venue-switcher-current')).toHaveTextContent(ALL_VENUES_LABEL),
      );

      const trigger = screen.getByTestId('venue-switcher-trigger');
      trigger.focus();
      await user.keyboard('{Enter}');
      expect(screen.getByTestId('venue-switcher-menu')).toBeInTheDocument();

      // Highlight starts on "All Venues"; sections sort alphabetically (East, then West),
      // so one ArrowDown must skip the "East" heading and land on Hall B, not the heading.
      await user.keyboard('{ArrowDown}{Enter}');
      await waitFor(() => expect(screen.getByTestId('venue-switcher-current')).toHaveTextContent('Hall B'));
    });
  });

  describe('no-regions and empty-filter behavior (US3)', () => {
    it('hides the region filter and renders the flat list when the organization has zero regions (T016)', async () => {
      mockWorkspaceFetch({ venues: [VENUE_A, VENUE_B], regions: [] });

      const user = userEvent.setup();
      render(<VenueSwitcher />, { wrapper: createWrapper() });

      await waitFor(() =>
        expect(screen.getByTestId('venue-switcher-current')).toHaveTextContent(ALL_VENUES_LABEL),
      );
      await user.click(screen.getByTestId('venue-switcher-trigger'));

      expect(screen.queryByTestId('venue-switcher-region-filter')).not.toBeInTheDocument();
      expect(screen.getByRole('option', { name: /Hall A/ })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /Hall B/ })).toBeInTheDocument();
      expect(screen.queryByTestId(/venue-switcher-section-/)).not.toBeInTheDocument();
    });

    it('shows an empty-state message when a region filter matches no venues (T017)', async () => {
      // A region only ever appears as a filter option once it has a visible venue
      // (buildRegionFilterOptions), so the only way this branch is reached is a stale
      // selection (e.g. the selected venue's region changed after data refetched).
      // Simulate that by driving the underlying <select> value directly rather than
      // through the rendered options list.
      mockWorkspaceFetch({
        venues: [VENUE_WEST],
        regions: [REGION_WEST, REGION_EAST],
      });

      const user = userEvent.setup();
      render(<VenueSwitcher />, { wrapper: createWrapper() });

      await waitFor(() =>
        expect(screen.getByTestId('venue-switcher-current')).toHaveTextContent(ALL_VENUES_LABEL),
      );
      await user.click(screen.getByTestId('venue-switcher-trigger'));
      fireEvent.change(screen.getByTestId('venue-switcher-region-filter'), {
        target: { value: REGION_EAST.id },
      });

      expect(screen.getByTestId('venue-switcher-empty')).toBeInTheDocument();
      expect(screen.queryByTestId(`venue-option-${VENUE_WEST.id}`)).not.toBeInTheDocument();
    });
  });
});
