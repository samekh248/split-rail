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
  const { data: venues = [], isLoading, isError, refetch } = useVenues();
  const [activeVenueId, setActiveVenueIdState] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading || isError) {
      return;
    }
    setActiveVenueIdState(resolveActiveVenueId(venues));
  }, [venues, isLoading, isError]);

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
      if (!venues.some((venue) => venue.id === id)) {
        return;
      }
      activateVenueId(id);
    },
    [venues, activateVenueId, queryClient],
  );

  const activeVenue = useMemo(
    () => venues.find((venue) => venue.id === activeVenueId) ?? null,
    [venues, activeVenueId],
  );

  const isAllVenuesSelected = activeVenueId === null && venues.length > 0;

  const value = useMemo(
    () => ({
      venues,
      activeVenueId,
      activeVenue,
      isAllVenuesSelected,
      isLoading,
      isError,
      refetch: () => void refetch(),
      setActiveVenue,
      activateVenueId,
    }),
    [
      venues,
      activeVenueId,
      activeVenue,
      isAllVenuesSelected,
      isLoading,
      isError,
      refetch,
      setActiveVenue,
      activateVenueId,
    ],
  );

  return <VenueContext.Provider value={value}>{children}</VenueContext.Provider>;
}
