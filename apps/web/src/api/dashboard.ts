import { useMemo } from 'react';
import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { apiFetch } from './client';
import type { DashboardResponse, EventCardDto } from '@/types/generated-api';

export function dashboardQueryKey(venueId: string) {
  return ['dashboard', venueId] as const;
}

export interface MergedDashboardPartitions {
  pinnedEvents: EventCardDto[];
  tonightEvents: EventCardDto[];
  upcomingEvents: EventCardDto[];
  recentEvents: EventCardDto[];
}

export interface PinMutationVariables {
  venueId: string;
  eventId: string;
}

function dedupeByEventId(events: EventCardDto[]): EventCardDto[] {
  const seen = new Set<string>();
  return events.filter((event) => {
    const id = event.eventId;
    if (!id || seen.has(id)) {
      return false;
    }
    seen.add(id);
    return true;
  });
}

function mergePartitionArrays(arrays: EventCardDto[][]): EventCardDto[] {
  return dedupeByEventId(arrays.flat());
}

function emptyPartitions(): MergedDashboardPartitions {
  return {
    pinnedEvents: [],
    tonightEvents: [],
    upcomingEvents: [],
    recentEvents: [],
  };
}

export function applyPinOptimisticUpdate(
  queryClient: QueryClient,
  venueId: string,
  eventId: string,
  pinned: boolean,
): DashboardResponse | undefined {
  const key = dashboardQueryKey(venueId);
  const previous = queryClient.getQueryData<DashboardResponse>(key);
  if (!previous) {
    return undefined;
  }

  const updateEvent = (event: EventCardDto): EventCardDto =>
    event.eventId === eventId ? { ...event, isPinned: pinned } : event;

  const mapPartition = (events: EventCardDto[] | null | undefined) =>
    (events ?? []).map(updateEvent);

  let pinnedEvents = mapPartition(previous.pinnedEvents);
  const eventInDashboard = [
    ...(previous.tonightEvents ?? []),
    ...(previous.upcomingEvents ?? []),
    ...(previous.recentEvents ?? []),
    ...pinnedEvents,
  ].find((event) => event.eventId === eventId);

  if (pinned && eventInDashboard && !pinnedEvents.some((event) => event.eventId === eventId)) {
    pinnedEvents = [...pinnedEvents, { ...eventInDashboard, isPinned: true }];
  }
  if (!pinned) {
    pinnedEvents = pinnedEvents.filter((event) => event.eventId !== eventId);
  }

  const next: DashboardResponse = {
    ...previous,
    tonightEvents: mapPartition(previous.tonightEvents),
    upcomingEvents: mapPartition(previous.upcomingEvents),
    recentEvents: mapPartition(previous.recentEvents),
    pinnedEvents,
  };

  queryClient.setQueryData(key, next);
  return previous;
}

export function useDashboard(venueId: string | null) {
  return useQuery({
    queryKey: dashboardQueryKey(venueId ?? ''),
    queryFn: () => apiFetch<DashboardResponse>(`/venues/${venueId}/dashboard`),
    enabled: Boolean(venueId),
    staleTime: 30_000,
  });
}

export function useAllVenuesDashboard(venueIds: string[]) {
  const results = useQueries({
    queries: venueIds.map((venueId) => ({
      queryKey: dashboardQueryKey(venueId),
      queryFn: () => apiFetch<DashboardResponse>(`/venues/${venueId}/dashboard`),
      staleTime: 30_000,
    })),
  });

  const data = useMemo((): MergedDashboardPartitions | undefined => {
    if (venueIds.length === 0) {
      return undefined;
    }
    if (results.some((result) => result.isLoading)) {
      return undefined;
    }
    if (results.some((result) => result.isError)) {
      return undefined;
    }
    const dashboards = results
      .map((result) => result.data)
      .filter((dashboard): dashboard is DashboardResponse => dashboard != null);
    if (dashboards.length !== venueIds.length) {
      return emptyPartitions();
    }
    return {
      pinnedEvents: mergePartitionArrays(dashboards.map((dashboard) => dashboard.pinnedEvents ?? [])),
      tonightEvents: mergePartitionArrays(dashboards.map((dashboard) => dashboard.tonightEvents ?? [])),
      upcomingEvents: mergePartitionArrays(dashboards.map((dashboard) => dashboard.upcomingEvents ?? [])),
      recentEvents: mergePartitionArrays(dashboards.map((dashboard) => dashboard.recentEvents ?? [])),
    };
  }, [results, venueIds]);

  return {
    data,
    isLoading: venueIds.length > 0 && results.some((result) => result.isLoading),
    isError: results.some((result) => result.isError),
    refetch: () => Promise.all(results.map((result) => result.refetch())),
  };
}

export function usePinEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ venueId, eventId }: PinMutationVariables) =>
      apiFetch<void>(`/venues/${venueId}/events/${eventId}/pin`, { method: 'PUT' }),
    onMutate: async ({ venueId, eventId }) => {
      await queryClient.cancelQueries({ queryKey: dashboardQueryKey(venueId) });
      const previous = applyPinOptimisticUpdate(queryClient, venueId, eventId, true);
      return { previous, venueId };
    },
    onError: (_error, { venueId }, context) => {
      if (context?.previous) {
        queryClient.setQueryData(dashboardQueryKey(venueId), context.previous);
      }
    },
    onSettled: (_data, _error, { venueId }) => {
      void queryClient.invalidateQueries({ queryKey: dashboardQueryKey(venueId) });
    },
  });
}

export function useUnpinEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ venueId, eventId }: PinMutationVariables) =>
      apiFetch<void>(`/venues/${venueId}/events/${eventId}/pin`, { method: 'DELETE' }),
    onMutate: async ({ venueId, eventId }) => {
      await queryClient.cancelQueries({ queryKey: dashboardQueryKey(venueId) });
      const previous = applyPinOptimisticUpdate(queryClient, venueId, eventId, false);
      return { previous, venueId };
    },
    onError: (_error, { venueId }, context) => {
      if (context?.previous) {
        queryClient.setQueryData(dashboardQueryKey(venueId), context.previous);
      }
    },
    onSettled: (_data, _error, { venueId }) => {
      void queryClient.invalidateQueries({ queryKey: dashboardQueryKey(venueId) });
    },
  });
}
