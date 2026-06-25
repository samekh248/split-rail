import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useVenues } from '@/api/venues';
import type { VenueResponse } from '@/types/generated-api';
import {
  clearActiveVenueId,
  getActiveVenueId,
  setActiveVenueId as persistActiveVenueId,
} from './activeVenueStorage';

export interface VenueContextValue {
  venues: VenueResponse[];
  activeVenueId: string | null;
  activeVenue: VenueResponse | null;
  isAllVenuesSelected: boolean;
  isLoading: boolean;
  isPending: boolean;
  isError: boolean;
  refetch: () => void;
  setActiveVenue: (id: string | null) => void;
  activateVenueId: (id: string) => void;
}

export const VenueContext = createContext<VenueContextValue | null>(null);

export function resolveActiveVenueId(venues: VenueResponse[]): string | null {
  if (venues.length === 0) {
    clearActiveVenueId();
    return null;
  }

  const remembered = getActiveVenueId();
  if (remembered && venues.some((venue) => venue.id === remembered)) {
    return remembered;
  }

  if (remembered) {
    clearActiveVenueId();
  }

  return null;
}

export function VenueProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const {
    data: venues = [],
    isLoading,
    isPending,
    isError,
    refetch,
  } = useVenues();
  const safeVenues = Array.isArray(venues) ? venues : [];
  const [activeVenueId, setActiveVenueIdState] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading || isError) {
      return;
    }
    setActiveVenueIdState(resolveActiveVenueId(safeVenues));
  }, [safeVenues, isLoading, isError]);

  const activateVenueId = useCallback((id: string) => {
    persistActiveVenueId(id);
    setActiveVenueIdState(id);
    void queryClient.invalidateQueries();
  }, [queryClient]);

  const setActiveVenue = useCallback(
    (id: string | null) => {
      if (id === null) {
        clearActiveVenueId();
        setActiveVenueIdState(null);
        void queryClient.invalidateQueries();
        return;
      }
      if (!safeVenues.some((venue) => venue.id === id)) {
        return;
      }
      activateVenueId(id);
    },
    [safeVenues, activateVenueId, queryClient],
  );

  const activeVenue = useMemo(
    () => safeVenues.find((venue) => venue.id === activeVenueId) ?? null,
    [safeVenues, activeVenueId],
  );

  const isAllVenuesSelected = activeVenueId === null && safeVenues.length > 0;

  const value = useMemo(
    () => ({
      venues: safeVenues,
      activeVenueId,
      activeVenue,
      isAllVenuesSelected,
      isLoading,
      isPending,
      isError,
      refetch: () => void refetch(),
      setActiveVenue,
      activateVenueId,
    }),
    [
      safeVenues,
      activeVenueId,
      activeVenue,
      isAllVenuesSelected,
      isLoading,
      isPending,
      isError,
      refetch,
      setActiveVenue,
      activateVenueId,
    ],
  );

  return <VenueContext.Provider value={value}>{children}</VenueContext.Provider>;
}
