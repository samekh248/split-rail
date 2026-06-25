import type { QueryClient } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from './client';
import type {
  CalendarPlacementDto,
  EventResponse,
  RegionResponse,
  VenueResponse,
} from '@/types/generated-api';

export interface CalendarPlacementsParams {
  from: string;
  to: string;
  regionId?: string | null;
  venueId?: string | null;
  includeCancelled?: boolean;
}

export function calendarPlacementsQueryKey(params: CalendarPlacementsParams) {
  return ['calendar', 'placements', params] as const;
}

export function buildCalendarPlacementFromEvent(
  event: EventResponse,
  venue?: VenueResponse,
  region?: RegionResponse,
): CalendarPlacementDto {
  const bookingPlacementStatus = event.bookingPlacementStatus ?? 'CONFIRMED';
  const isHold = bookingPlacementStatus === 'HOLD_1' || bookingPlacementStatus === 'HOLD_2';

  return {
    eventId: event.eventId,
    venueId: event.venueId,
    venueName: venue?.name ?? 'Unknown venue',
    regionId: venue?.regionId ?? region?.id ?? null,
    regionName: region?.name ?? null,
    title: event.title,
    eventDate: event.eventDate,
    bookingPlacementStatus,
    doorsTime: event.doorsTime ?? null,
    loadInTime: event.loadInTime ?? null,
    curfewTime: event.curfewTime ?? null,
    supportLineup: event.supportLineup ?? null,
    financialStatus: event.status ?? 'PRE_SHOW',
    isBudgetLocked: event.isBudgetLocked ?? false,
    qboTagName: event.qboTagName ?? '',
    hasLineItems: false,
    workspaceAllowed: event.workspaceAllowed ?? !isHold,
  };
}

export function upsertCalendarPlacementInCache(
  queryClient: QueryClient,
  placement: CalendarPlacementDto,
): void {
  const eventDate = placement.eventDate ?? '';
  const eventId = placement.eventId;

  if (!eventDate || !eventId) {
    return;
  }

  for (const [queryKey, existing] of queryClient.getQueriesData<CalendarPlacementDto[]>({
    queryKey: ['calendar', 'placements'],
  })) {
    if (!existing) {
      continue;
    }

    const params = queryKey[2] as CalendarPlacementsParams | undefined;
    if (!params?.from || !params?.to) {
      continue;
    }

    if (eventDate < params.from || eventDate > params.to) {
      continue;
    }

    const withoutExisting = existing.filter((item) => item.eventId !== eventId);
    queryClient.setQueryData(queryKey, [...withoutExisting, placement]);
  }
}

export async function refetchCalendarPlacements(queryClient: QueryClient): Promise<void> {
  await queryClient.refetchQueries({ queryKey: ['calendar', 'placements'] });
}

export function useCalendarPlacements(params: CalendarPlacementsParams | null) {
  return useQuery({
    queryKey: calendarPlacementsQueryKey(params ?? { from: '', to: '' }),
    queryFn: () => {
      if (!params) {
        return Promise.resolve([] as CalendarPlacementDto[]);
      }
      const search = new URLSearchParams({
        from: params.from,
        to: params.to,
      });
      if (params.regionId) {
        search.set('regionId', params.regionId);
      }
      if (params.venueId) {
        search.set('venueId', params.venueId);
      }
      if (params.includeCancelled) {
        search.set('includeCancelled', 'true');
      }
      return apiFetch<CalendarPlacementDto[]>(`/calendar/placements?${search.toString()}`);
    },
    enabled: Boolean(params?.from && params?.to),
    staleTime: 15_000,
  });
}
