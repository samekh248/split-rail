import { getActiveVenueId } from '@/venue/activeVenueStorage';

const API_BASE = '/api';

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('accessToken');
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

function venueContextHeaders(path: string): HeadersInit {
  const normalizedPath = path.split('?')[0];
  if (normalizedPath === '/users/me' || normalizedPath.startsWith('/auth/')) {
    return {};
  }
  const venueId = getActiveVenueId();
  if (!venueId) {
    return {};
  }
  return { 'X-Active-Venue-Id': venueId };
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...authHeaders(),
      ...venueContextHeaders(path),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    let detail = response.statusText;
    try {
      const body = (await response.json()) as {
        detail?: string;
        Detail?: string;
        title?: string;
        Title?: string;
      };
      detail = body.detail ?? body.Detail ?? body.title ?? body.Title ?? detail;
    } catch {
      /* ignore parse errors */
    }
    throw new Error(`${response.status}: ${detail}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function ledgerPath(venueId: string, eventId: string): string {
  return `/venues/${venueId}/events/${eventId}`;
}

export { apiFetch };
