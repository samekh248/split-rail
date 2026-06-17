import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './client';
import type {
  CreateEventRequest,
  EventResponse,
  UpdateEventRequest,
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

export function useCreateEvent(venueId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateEventRequest) =>
      apiFetch<EventResponse>(`/venues/${venueId}/events`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      if (venueId) {
        void queryClient.invalidateQueries({ queryKey: eventsQueryKey(venueId) });
      }
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
    },
  });
}
