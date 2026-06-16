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
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
  setActiveVenue: (id: string) => void;
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

  const defaultId = venues[0]?.id ?? null;
  if (defaultId) {
    persistActiveVenueId(defaultId);
  }
  return defaultId;
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

  const setActiveVenue = useCallback(
    (id: string) => {
      if (!venues.some((venue) => venue.id === id)) {
        return;
      }
      persistActiveVenueId(id);
      setActiveVenueIdState(id);
      void queryClient.invalidateQueries();
    },
    [venues, queryClient],
  );

  const activeVenue = useMemo(
    () => venues.find((venue) => venue.id === activeVenueId) ?? null,
    [venues, activeVenueId],
  );

  const value = useMemo(
    () => ({
      venues,
      activeVenueId,
      activeVenue,
      isLoading,
      isError,
      refetch: () => void refetch(),
      setActiveVenue,
    }),
    [venues, activeVenueId, activeVenue, isLoading, isError, refetch, setActiveVenue],
  );

  return <VenueContext.Provider value={value}>{children}</VenueContext.Provider>;
}
