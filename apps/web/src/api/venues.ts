import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './client';
import { useActiveVenue } from '@/venue/useActiveVenue';
import type { CreateVenueRequest, UpdateVenueRequest, VenueResponse } from '@/types/generated-api';

export function useVenues() {
  return useQuery({
    queryKey: ['venues'],
    queryFn: () => apiFetch<VenueResponse[]>('/venues', { skipVenueContext: true }),
    staleTime: 60_000,
  });
}

export function useCreateVenue() {
  const queryClient = useQueryClient();
  const { activateVenueId } = useActiveVenue();

  return useMutation({
    mutationFn: (body: CreateVenueRequest) =>
      apiFetch<VenueResponse>('/venues', {
        method: 'POST',
        body: JSON.stringify(body),
        skipVenueContext: true,
      }),
    onSuccess: (created) => {
      queryClient.setQueryData<VenueResponse[]>(['venues'], (existing) => {
        const list = existing ?? [];
        if (list.some((venue) => venue.id === created.id)) {
          return list;
        }
        return [...list, created];
      });
      activateVenueId(created.id);
      void queryClient.invalidateQueries({ queryKey: ['venues'] });
    },
  });
}

export function useUpdateVenue(venueId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateVenueRequest) =>
      apiFetch<VenueResponse>(`/venues/${venueId}`, {
        method: 'PUT',
        body: JSON.stringify(body),
        skipVenueContext: true,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['venues'] });
    },
  });
}
