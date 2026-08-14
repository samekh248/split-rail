import { useQuery } from '@tanstack/react-query';
import { apiFetch } from './client';
import type {
  FestivalDayReportResponse,
  FestivalPnlReportResponse,
  FestivalSettlementStatusReportResponse,
  FestivalStageReportResponse,
  FestivalUnreconciledReportResponse,
  FestivalVarianceReportResponse,
} from '@/types/generated-api';

function reportQueryKey(venueId: string, eventId: string, layer: string, filters: Record<string, string> = {}) {
  return ['festival', venueId, eventId, 'reports', layer, filters] as const;
}

function buildQuery(filters: Record<string, string | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) {
      params.set(key, value);
    }
  }
  const query = params.toString();
  return query ? `?${query}` : '';
}

export function useFestivalPnlReport(
  venueId: string,
  eventId: string,
  category?: string,
  enabled = true,
) {
  const filters = { category: category ?? '' };
  return useQuery({
    queryKey: reportQueryKey(venueId, eventId, 'pnl', filters),
    queryFn: () =>
      apiFetch<FestivalPnlReportResponse>(
        `/venues/${venueId}/festivals/${eventId}/reports/pnl${buildQuery({ category })}`,
        { skipVenueContext: true },
      ),
    enabled: enabled && Boolean(venueId) && Boolean(eventId),
  });
}

export function useFestivalDayReport(
  venueId: string,
  eventId: string,
  filters: { category?: string; status?: string } = {},
  enabled = true,
) {
  return useQuery({
    queryKey: reportQueryKey(venueId, eventId, 'days', filters as Record<string, string>),
    queryFn: () =>
      apiFetch<FestivalDayReportResponse>(
        `/venues/${venueId}/festivals/${eventId}/reports/days${buildQuery(filters)}`,
        { skipVenueContext: true },
      ),
    enabled: enabled && Boolean(venueId) && Boolean(eventId),
  });
}

export function useFestivalStageReport(
  venueId: string,
  eventId: string,
  filters: { category?: string; status?: string } = {},
  enabled = true,
) {
  return useQuery({
    queryKey: reportQueryKey(venueId, eventId, 'stages', filters as Record<string, string>),
    queryFn: () =>
      apiFetch<FestivalStageReportResponse>(
        `/venues/${venueId}/festivals/${eventId}/reports/stages${buildQuery(filters)}`,
        { skipVenueContext: true },
      ),
    enabled: enabled && Boolean(venueId) && Boolean(eventId),
  });
}

export function useFestivalSettlementStatusReport(
  venueId: string,
  eventId: string,
  category?: string,
  enabled = true,
) {
  return useQuery({
    queryKey: reportQueryKey(venueId, eventId, 'settlement-status', { category: category ?? '' }),
    queryFn: () =>
      apiFetch<FestivalSettlementStatusReportResponse>(
        `/venues/${venueId}/festivals/${eventId}/reports/settlement-status${buildQuery({ category })}`,
        { skipVenueContext: true },
      ),
    enabled: enabled && Boolean(venueId) && Boolean(eventId),
  });
}

export function useFestivalUnreconciledReport(venueId: string, eventId: string, enabled = true) {
  return useQuery({
    queryKey: reportQueryKey(venueId, eventId, 'unreconciled'),
    queryFn: () =>
      apiFetch<FestivalUnreconciledReportResponse>(
        `/venues/${venueId}/festivals/${eventId}/reports/unreconciled`,
        { skipVenueContext: true },
      ),
    enabled: enabled && Boolean(venueId) && Boolean(eventId),
  });
}

export function useFestivalVarianceReport(
  venueId: string,
  eventId: string,
  filters: { category?: string; status?: string } = {},
  enabled = true,
) {
  return useQuery({
    queryKey: reportQueryKey(venueId, eventId, 'variance', filters as Record<string, string>),
    queryFn: () =>
      apiFetch<FestivalVarianceReportResponse>(
        `/venues/${venueId}/festivals/${eventId}/reports/variance${buildQuery(filters)}`,
        { skipVenueContext: true },
      ),
    enabled: enabled && Boolean(venueId) && Boolean(eventId),
  });
}
