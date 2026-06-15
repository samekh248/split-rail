import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, ledgerPath } from './client';
import type {
  FinalizeSettlementRequest,
  ReverseSettlementRequest,
  SettlementPdfLinkDto,
  SettlementResultDto,
} from '@/types/generated-api';

export function useFinalizeSettlement(venueId: string, eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: FinalizeSettlementRequest) =>
      apiFetch<SettlementResultDto>(`${ledgerPath(venueId, eventId)}/settle`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['ledger', venueId, eventId] });
    },
  });
}

export function useSettlementPdfLink(
  venueId: string,
  eventId: string,
  enabled: boolean,
) {
  return useQuery({
    queryKey: ['settlement-pdf', venueId, eventId],
    queryFn: () =>
      apiFetch<SettlementPdfLinkDto>(
        `${ledgerPath(venueId, eventId)}/settlement-pdf`,
      ),
    enabled: enabled && Boolean(venueId && eventId),
    staleTime: 60_000,
  });
}

export function useReverseSettlement(venueId: string, eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ReverseSettlementRequest) =>
      apiFetch<SettlementResultDto>(
        `${ledgerPath(venueId, eventId)}/reverse-settlement`,
        { method: 'POST', body: JSON.stringify(body) },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['ledger', venueId, eventId] });
    },
  });
}
