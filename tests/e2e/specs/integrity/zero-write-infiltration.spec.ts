import { test, expect } from '@playwright/test';
import { resetSeed, seedLifecycleEvent, getQboEgressRecords } from '../../fixtures/seed';

const API_BASE = process.env.API_BASE_URL ?? process.env.PREVIEW_BASE_URL ?? 'http://localhost:5000';

async function login(email: string, password: string): Promise<string> {
  const response = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const body = (await response.json()) as { accessToken: string };
  return body.accessToken;
}

test.describe('Zero write infiltration', () => {
  test('no mutating QBO egress recorded during sync', async ({ request }) => {
    const seed = await resetSeed();
    const lifecycle = await seedLifecycleEvent(seed.orgA.organizationId, seed.orgA.inScopeVenueId);
    const token = await login(seed.orgA.adminEmail, seed.orgA.adminPassword);
    const headers = { Authorization: `Bearer ${token}` };

    await request.post(`/api/venues/${lifecycle.venueId}/events/${lifecycle.eventId}/lock-budget`, { headers });
    await request.post(`/api/venues/${lifecycle.venueId}/events/${lifecycle.eventId}/settle`, {
      headers: { ...headers, 'Content-Type': 'application/json' },
      data: { signatureData: btoa('[[{"x":1,"y":2},{"x":3,"y":4}]]'), confirmed: true },
    });

    await request.post(`/api/venues/${lifecycle.venueId}/events/${lifecycle.eventId}/sync`, { headers });

    const records = await getQboEgressRecords();
    const mutating = records.filter((r) =>
      ['POST', 'PUT', 'DELETE', 'PATCH'].includes(r.method.toUpperCase()),
    );
    expect(mutating).toHaveLength(0);
  });
});
