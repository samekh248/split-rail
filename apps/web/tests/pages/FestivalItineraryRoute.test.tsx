import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FestivalItineraryRoute } from '@/pages/FestivalItineraryRoute';

const itinerary = {
  days: [{ dayDate: '2026-08-14' }],
  stages: [{ id: 'stage-1', name: 'Main Stage' }],
  blocks: [
    {
      id: 'block-1',
      title: 'Headliner',
      dayDate: '2026-08-14',
      stageZoneId: 'stage-1',
      stageName: 'Main Stage',
      startTime: '20:00',
      endTime: '22:00',
      category: 'MUSIC',
      scheduleStatus: 'SCHEDULED',
      bookingStatus: 'CONFIRMED',
    },
  ],
};

const mutateAsync = vi.fn().mockResolvedValue({});
const refetch = vi.fn().mockResolvedValue({});

vi.mock('@/api/festivals', () => ({
  useItinerary: () => ({ data: itinerary, isLoading: false, isError: false, refetch }),
  usePublicItinerary: () => ({ data: { days: [], stages: [], blocks: [] }, isLoading: false, refetch }),
  useUpdateBlock: () => ({ mutateAsync }),
  useSetBlockStatus: () => ({ mutateAsync }),
  useSetBlockBookingStatus: () => ({ mutateAsync }),
  useSetPublishVisibility: () => ({ mutateAsync, isPending: false }),
  useBlockHistory: () => ({ data: [], isLoading: false }),
}));

vi.mock('@/lib/eventWorkspaceRoute', () => ({
  navigateToEventWorkspace: vi.fn(),
}));

vi.mock('@/components/festival/BlockEditorDrawer', () => ({
  BlockEditorDrawer: ({ open }: { open: boolean }) =>
    open ? <div data-testid="block-editor-drawer" /> : null,
}));

vi.mock('@/api/user', () => ({
  useUserProfile: vi.fn(),
}));

import { useUserProfile } from '@/api/user';

function renderRoute(permissions: Record<string, boolean>) {
  vi.mocked(useUserProfile).mockReturnValue({
    data: { role: { permissions } },
  } as ReturnType<typeof useUserProfile>);

  return render(
    <QueryClientProvider client={new QueryClient()}>
      <FestivalItineraryRoute venueId="venue-1" eventId="event-1" />
    </QueryClientProvider>,
  );
}

describe('FestivalItineraryRoute', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('gives schedule editing tools to a role that can manage the festival schedule', () => {
    renderRoute({ canManageFestivalSchedule: true, canPublishPublicItinerary: true });

    expect(screen.getByTestId('itinerary-add-block')).toBeInTheDocument();
  });

  it('renders the itinerary read-only for a role without schedule authority', () => {
    renderRoute({ canManageFestivalSchedule: false, canPublishPublicItinerary: false });

    expect(screen.getByTestId('festival-itinerary-page')).toBeInTheDocument();
    expect(screen.queryByTestId('itinerary-add-block')).not.toBeInTheDocument();
  });
});
