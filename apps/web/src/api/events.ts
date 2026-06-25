import { useMemo } from 'react';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  buildCalendarPlacementFromEvent,
  refetchCalendarPlacements,
  upsertCalendarPlacementInCache,
} from './calendar';
import { regionsQueryKey } from './regions';
import { apiFetch } from './client';
import type {
  CreateEventRequest,
  EventResponse,
  RegionResponse,
  UpdateEventRequest,
  VenueResponse,
} from '@/types/generated-api';

export function eventsQueryKey(venueId: string) {
  return ['events', venueId] as const;
}

export function useEvents(venueId: string | null) {
  return useQuery({
    queryKey: eventsQueryKey(venueId ?? ''),
    queryFn: () => apiFetch<EventResponse[]>(`/venues/${venueId}/events`),
    enabled: Boolean(venueId),
    staleTime: 30_000,
  });
}

export function useAllVenuesEvents(venueIds: string[]) {
  const results = useQueries({
    queries: venueIds.map((venueId) => ({
      queryKey: eventsQueryKey(venueId),
      queryFn: () => apiFetch<EventResponse[]>(`/venues/${venueId}/events`),
      staleTime: 30_000,
    })),
  });

  const data = useMemo(
    () => results.flatMap((result) => result.data ?? []),
    [results],
  );

  return {
    data,
    isLoading: venueIds.length > 0 && results.some((result) => result.isLoading),
    isError: results.some((result) => result.isError),
    refetch: () => Promise.all(results.map((result) => result.refetch())),
  };
}

export function useCreateEvent(venueId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateEventRequest) =>
      apiFetch<EventResponse>(`/venues/${venueId}/events`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: async (created) => {
      if (venueId) {
        void queryClient.invalidateQueries({ queryKey: eventsQueryKey(venueId) });
      }

      const venues = queryClient.getQueryData<VenueResponse[]>(['venues']) ?? [];
      const venue = venues.find((item) => item.id === created.venueId);
      const regions = queryClient.getQueryData<RegionResponse[]>(regionsQueryKey()) ?? [];
      const region = regions.find((item) => item.id === venue?.regionId);

      upsertCalendarPlacementInCache(
        queryClient,
        buildCalendarPlacementFromEvent(created, venue, region),
      );
      await refetchCalendarPlacements(queryClient);
    },
  });
}

export function useUpdateEvent(venueId: string | null, eventId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: UpdateEventRequest) =>
      apiFetch<EventResponse>(`/venues/${venueId}/events/${eventId}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      if (venueId) {
        void queryClient.invalidateQueries({ queryKey: eventsQueryKey(venueId) });
      }
      void queryClient.invalidateQueries({ queryKey: ['calendar'] });
    },
  });
}

export function useDeleteEvent(venueId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (eventId: string) =>
      apiFetch<void>(`/venues/${venueId}/events/${eventId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      if (venueId) {
        void queryClient.invalidateQueries({ queryKey: eventsQueryKey(venueId) });
      }
      void queryClient.invalidateQueries({ queryKey: ['calendar'] });
    },
  });
}
