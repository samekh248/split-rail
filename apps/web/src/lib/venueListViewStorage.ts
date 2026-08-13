export type VenueRegionFilter = 'all' | 'unassigned' | string;

const REGION_FILTER_COOKIE = 'venuesPageRegionFilter';
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

function writeCookie(name: string, value: string): void {
  if (typeof document === 'undefined') {
    return;
  }

  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${ONE_YEAR_SECONDS}; Path=/; SameSite=Lax`;
}

export function clearVenuesPageViewCookies(): void {
  if (typeof document === 'undefined') {
    return;
  }

  document.cookie = `${REGION_FILTER_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`;
}

export function readVenuesPageRegionFilter(): VenueRegionFilter | null {
  const value = readCookie(REGION_FILTER_COOKIE);
  if (!value) {
    return null;
  }
  if (value === 'all' || value === 'unassigned') {
    return value;
  }
  return value;
}

export function writeVenuesPageRegionFilter(value: VenueRegionFilter): void {
  writeCookie(REGION_FILTER_COOKIE, value);
}
