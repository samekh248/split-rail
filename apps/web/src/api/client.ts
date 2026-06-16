const API_BASE = '/api';

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('accessToken');
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { ...authHeaders(), ...init?.headers },
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
