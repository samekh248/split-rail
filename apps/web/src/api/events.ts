import { useQuery } from '@tanstack/react-query';
import { apiFetch } from './client';
import type { EventResponse } from '@/types/generated-api';

export function eventsQueryKey(venueId: string) {
  return ['events', venueId] as const;
}

export function useEvents(venueId: string | null) {
  return useQuery({
    queryKey: eventsQueryKey(venueId ?? ''),
    queryFn: () => apiFetch<EventResponse[]>(`/venues/${venueId}/events`),
    enabled: !!venueId,
    staleTime: 60_000,
  });
}
