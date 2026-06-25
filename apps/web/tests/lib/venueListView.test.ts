import { beforeEach, describe, expect, it } from 'vitest';
import {
  buildGroupedSections,
  buildRegionFilterOptions,
  filterVenuesByRegion,
  sortVenuesByName,
} from '@/lib/venueListView';
import type { RegionResponse, VenueResponse } from '@/types/generated-api';

const REGION_A: RegionResponse = { id: 'region-a', name: 'West', notes: null, venueCount: 2 };
const REGION_B: RegionResponse = { id: 'region-b', name: 'East', notes: null, venueCount: 0 };
const REGION_C: RegionResponse = { id: 'region-c', name: 'Central', notes: null, venueCount: 1 };

const VENUE_1: VenueResponse = {
  id: 'venue-1',
  name: 'Zebra Hall',
  organizationId: 'org-1',
  createdAt: '2026-01-01T00:00:00Z',
  regionId: 'region-a',
};

const VENUE_2: VenueResponse = {
  id: 'venue-2',
  name: 'Alpha Room',
  organizationId: 'org-1',
  createdAt: '2026-01-02T00:00:00Z',
  regionId: 'region-a',
};

const VENUE_3: VenueResponse = {
  id: 'venue-3',
  name: 'Mid Venue',
  organizationId: 'org-1',
  createdAt: '2026-01-03T00:00:00Z',
  regionId: 'region-c',
};

const VENUE_UNASSIGNED: VenueResponse = {
  id: 'venue-4',
  name: 'Loft',
  organizationId: 'org-1',
  createdAt: '2026-01-04T00:00:00Z',
  regionId: null,
};

const VENUES = [VENUE_1, VENUE_2, VENUE_3, VENUE_UNASSIGNED];
const REGIONS = [REGION_A, REGION_B, REGION_C];

describe('venueListView', () => {
  describe('sortVenuesByName', () => {
    it('sorts venues alphabetically by name', () => {
      expect(sortVenuesByName(VENUES).map((venue) => venue.name)).toEqual([
        'Alpha Room',
        'Loft',
        'Mid Venue',
        'Zebra Hall',
      ]);
    });
  });

  describe('filterVenuesByRegion', () => {
    it('returns all venues for all filter', () => {
      expect(filterVenuesByRegion(VENUES, 'all')).toHaveLength(4);
    });

    it('returns only unassigned venues', () => {
      expect(filterVenuesByRegion(VENUES, 'unassigned')).toEqual([VENUE_UNASSIGNED]);
    });

    it('returns only venues in the selected region', () => {
      expect(filterVenuesByRegion(VENUES, 'region-a')).toEqual([VENUE_1, VENUE_2]);
    });
  });

  describe('buildRegionFilterOptions', () => {
    it('returns empty list when organization has no regions', () => {
      expect(buildRegionFilterOptions(VENUES, [])).toEqual([]);
    });

    it('includes all, populated regions, and unassigned when applicable', () => {
      const options = buildRegionFilterOptions(VENUES, REGIONS);
      expect(options.map((option) => option.value)).toEqual([
        'all',
        'region-c',
        'region-a',
        'unassigned',
      ]);
    });

    it('omits unassigned when every venue is assigned', () => {
      const assignedOnly = VENUES.filter((venue) => venue.regionId);
      const options = buildRegionFilterOptions(assignedOnly, REGIONS);
      expect(options.some((option) => option.value === 'unassigned')).toBe(false);
    });

    it('omits regions with no visible venues', () => {
      const options = buildRegionFilterOptions(VENUES, REGIONS);
      expect(options.some((option) => option.value === 'region-b')).toBe(false);
    });
  });

  describe('buildGroupedSections', () => {
    it('groups all regions alphabetically with unassigned last', () => {
      const sections = buildGroupedSections(VENUES, REGIONS, 'all');
      expect(sections.map((section) => section.sectionKey)).toEqual([
        'region-c',
        'region-b',
        'region-a',
        'unassigned',
      ]);
      const west = sections.find((section) => section.sectionKey === 'region-a');
      expect(west?.venues.map((venue) => venue.name)).toEqual(['Alpha Room', 'Zebra Hall']);
    });

    it('includes empty region sections with no venues', () => {
      const sections = buildGroupedSections(VENUES, REGIONS, 'all');
      const east = sections.find((section) => section.sectionKey === 'region-b');
      expect(east?.venues).toEqual([]);
    });

    it('returns a single section for a region filter', () => {
      const sections = buildGroupedSections(VENUES, REGIONS, 'region-c');
      expect(sections).toHaveLength(1);
      expect(sections[0]?.title).toBe('Central');
      expect(sections[0]?.venues).toEqual([VENUE_3]);
    });

    it('returns only unassigned section for unassigned filter', () => {
      const sections = buildGroupedSections(VENUES, REGIONS, 'unassigned');
      expect(sections).toHaveLength(1);
      expect(sections[0]?.sectionKey).toBe('unassigned');
    });
  });
});
