import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './client';
import type { UpdateVenueRequest, VenueResponse } from '@/types/generated-api';

export function useVenues() {
  return useQuery({
    queryKey: ['venues'],
    queryFn: () => apiFetch<VenueResponse[]>('/venues', { skipVenueContext: true }),
    staleTime: 60_000,
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
