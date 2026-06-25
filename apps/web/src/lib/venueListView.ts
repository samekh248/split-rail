import type { RegionResponse, VenueResponse } from '@/types/generated-api';
import type { VenueRegionFilter } from '@/lib/venueListViewStorage';

export type { VenueDisplayMode, VenueRegionFilter } from '@/lib/venueListViewStorage';

export interface RegionFilterOption {
  value: VenueRegionFilter;
  label: string;
}

export interface VenueRegionSection {
  sectionKey: string;
  title: string;
  venues: VenueResponse[];
}

function compareVenueNames(a: VenueResponse, b: VenueResponse): number {
  return (a.name ?? '').localeCompare(b.name ?? '', undefined, { sensitivity: 'base' });
}

function compareRegionNames(a: RegionResponse, b: RegionResponse): number {
  return (a.name ?? '').localeCompare(b.name ?? '', undefined, { sensitivity: 'base' });
}

export function sortVenuesByName(venues: VenueResponse[]): VenueResponse[] {
  return [...venues].sort(compareVenueNames);
}

export function filterVenuesByRegion(
  venues: VenueResponse[],
  regionFilter: VenueRegionFilter,
): VenueResponse[] {
  if (regionFilter === 'all') {
    return venues;
  }
  if (regionFilter === 'unassigned') {
    return venues.filter((venue) => !venue.regionId);
  }
  return venues.filter((venue) => venue.regionId === regionFilter);
}

export function buildRegionFilterOptions(
  venues: VenueResponse[],
  regions: RegionResponse[],
): RegionFilterOption[] {
  if (regions.length === 0) {
    return [];
  }

  const options: RegionFilterOption[] = [{ value: 'all', label: 'All regions' }];

  for (const region of [...regions].sort(compareRegionNames)) {
    if (!region.id) {
      continue;
    }
    const hasVisibleVenue = venues.some((venue) => venue.regionId === region.id);
    if (hasVisibleVenue) {
      options.push({ value: region.id, label: region.name ?? 'Unnamed region' });
    }
  }

  const hasUnassigned = venues.some((venue) => !venue.regionId);
  if (hasUnassigned) {
    options.push({ value: 'unassigned', label: 'Unassigned' });
  }

  return options;
}

function buildSection(
  sectionKey: string,
  title: string,
  venues: VenueResponse[],
): VenueRegionSection {
  return {
    sectionKey,
    title,
    venues: sortVenuesByName(venues),
  };
}

export function buildGroupedSections(
  venues: VenueResponse[],
  regions: RegionResponse[],
  regionFilter: VenueRegionFilter,
): VenueRegionSection[] {
  const sortedRegions = [...regions].sort(compareRegionNames);

  if (regionFilter === 'unassigned') {
    const unassigned = venues.filter((venue) => !venue.regionId);
    return [buildSection('unassigned', 'Unassigned', unassigned)];
  }

  if (regionFilter !== 'all') {
    const region = sortedRegions.find((entry) => entry.id === regionFilter);
    const title = region?.name ?? 'Region';
    const sectionVenues = venues.filter((venue) => venue.regionId === regionFilter);
    return [buildSection(regionFilter, title, sectionVenues)];
  }

  const sections: VenueRegionSection[] = sortedRegions
    .filter((region) => region.id)
    .map((region) =>
      buildSection(
        region.id!,
        region.name ?? 'Unnamed region',
        venues.filter((venue) => venue.regionId === region.id),
      ),
    );

  const unassigned = venues.filter((venue) => !venue.regionId);
  if (unassigned.length > 0) {
    sections.push(buildSection('unassigned', 'Unassigned', unassigned));
  }

  return sections;
}
