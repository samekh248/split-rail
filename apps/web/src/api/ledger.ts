import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { apiFetch, ledgerPath } from './client';
import type {
  CreateArtistRequest,
  CreateLineItemRequest,
  EventArtistDto,
  LedgerGridResponse,
  LineItemDto,
  LockBudgetResponse,
  UpdateArtistRequest,
  UpdateLineItemRequest,
} from '@/types/generated-api';

export const ledgerKeys = {
  all: ['ledger'] as const,
  grid: (venueId: string, eventId: string) =>
    [...ledgerKeys.all, venueId, eventId] as const,
};

export function useLedger(
  venueId: string,
  eventId: string,
  options?: Omit<UseQueryOptions<LedgerGridResponse>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: ledgerKeys.grid(venueId, eventId),
    queryFn: () =>
      apiFetch<LedgerGridResponse>(`${ledgerPath(venueId, eventId)}/ledger`),
    enabled: Boolean(venueId && eventId),
    ...options,
  });
}

export function useRecalculateLedger(venueId: string, eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<LedgerGridResponse>(
        `${ledgerPath(venueId, eventId)}/recalculate`,
        { method: 'POST' },
      ),
    onSuccess: (data) => {
      queryClient.setQueryData(ledgerKeys.grid(venueId, eventId), data);
    },
  });
}

export function useCreateLineItem(venueId: string, eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateLineItemRequest) =>
      apiFetch<LineItemDto>(`${ledgerPath(venueId, eventId)}/line-items`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ledgerKeys.grid(venueId, eventId),
      });
    },
  });
}

export function useUpdateLineItem(venueId: string, eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: UpdateLineItemRequest & { id: string }) =>
      apiFetch<LineItemDto>(
        `${ledgerPath(venueId, eventId)}/line-items/${id}`,
        { method: 'PUT', body: JSON.stringify(body) },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ledgerKeys.grid(venueId, eventId),
      });
    },
  });
}

export function useDeleteLineItem(venueId: string, eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`${ledgerPath(venueId, eventId)}/line-items/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ledgerKeys.grid(venueId, eventId),
      });
    },
  });
}

export function useCreateArtist(venueId: string, eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateArtistRequest) =>
      apiFetch<EventArtistDto>(`${ledgerPath(venueId, eventId)}/artists`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ledgerKeys.grid(venueId, eventId),
      });
    },
  });
}

export function useUpdateArtist(venueId: string, eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: UpdateArtistRequest & { id: string }) =>
      apiFetch<EventArtistDto>(
        `${ledgerPath(venueId, eventId)}/artists/${id}`,
        { method: 'PUT', body: JSON.stringify(body) },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ledgerKeys.grid(venueId, eventId),
      });
    },
  });
}

export function useDeleteArtist(venueId: string, eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`${ledgerPath(venueId, eventId)}/artists/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ledgerKeys.grid(venueId, eventId),
      });
    },
  });
}

export function useLockBudget(venueId: string, eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<LockBudgetResponse>(
        `${ledgerPath(venueId, eventId)}/lock-budget`,
        { method: 'POST' },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ledgerKeys.grid(venueId, eventId),
      });
    },
  });
}
