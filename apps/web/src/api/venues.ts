import { useQuery } from '@tanstack/react-query';
import { apiFetch } from './client';
import type { VenueResponse } from '@/types/generated-api';

export function useVenues() {
  return useQuery({
    queryKey: ['venues'],
    queryFn: () => apiFetch<VenueResponse[]>('/venues', { skipVenueContext: true }),
    staleTime: 60_000,
  });
}
