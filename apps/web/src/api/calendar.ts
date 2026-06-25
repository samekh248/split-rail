import { useQuery } from '@tanstack/react-query';
import { apiFetch } from './client';
import type { CalendarPlacementDto } from '@/types/generated-api';

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
