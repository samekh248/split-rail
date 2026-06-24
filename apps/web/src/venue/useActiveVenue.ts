import { useContext } from 'react';
import { VenueContext } from './VenueContext';

export function useActiveVenue() {
  const context = useContext(VenueContext);
  if (!context) {
    throw new Error('useActiveVenue must be used within VenueProvider');
  }
  return context;
}
