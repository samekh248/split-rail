import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getAccessToken } from '@/auth/tokenStorage';
import { getActiveVenueId } from '@/venue/activeVenueStorage';
import { apiFetch, ledgerPath } from './client';
import type {
  FinalizeSettlementRequest,
  ReverseSettlementRequest,
  SettlementPdfLinkDto,
  SettlementResultDto,
} from '@/types/generated-api';

/** Opens a URL in a new tab without relying on a post-async window.open call. */
function openUrlInNewTab(url: string): void {
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.target = '_blank';
  anchor.rel = 'noopener noreferrer';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

/** Opens a settlement PDF URL, using authenticated fetch for same-origin API links. */
export async function openSettlementPdfUrl(url: string): Promise<void> {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    openUrlInNewTab(url);
    return;
  }

  const token = getAccessToken();
  const headers: HeadersInit = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const venueId = getActiveVenueId();
  if (venueId) {
    headers['X-Active-Venue-Id'] = venueId;
  }

  const response = await fetch(url, { headers });
  if (!response.ok) {
    let detail = response.statusText;
    try {
      const body = (await response.json()) as { detail?: string; Detail?: string };
      detail = body.detail ?? body.Detail ?? detail;
    } catch {
      /* ignore parse errors */
    }
    throw new Error(`${response.status}: ${detail}`);
  }

  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);
  try {
    openUrlInNewTab(blobUrl);
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
  }
}

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
