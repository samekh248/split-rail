import { test, expect } from '@playwright/test';
import { resetSeed, seedLifecycleEvent, mutateSettledEvent } from '../../fixtures/seed';

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

async function getSettlementHash(eventId: string): Promise<string> {
  const response = await fetch(`${API_BASE}/api/test-seed/settlement-hash/${eventId}`);
  const body = (await response.json()) as { hashHex: string };
  return body.hashHex;
}

test.describe('Audit immutability', () => {
  test('settlement document unchanged after underlying data mutation attempt', async ({ request }) => {
    const seed = await resetSeed();
    const lifecycle = await seedLifecycleEvent(seed.orgA.organizationId, seed.orgA.inScopeVenueId);
    const token = await login(seed.orgA.adminEmail, seed.orgA.adminPassword);
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
    const base = `/api/venues/${lifecycle.venueId}/events/${lifecycle.eventId}`;

    await request.post(`${base}/lock-budget`, { headers });
    await request.post(`${base}/settle`, {
      headers,
      data: { signatureData: btoa('[[{"x":10,"y":20},{"x":30,"y":40}]]'), confirmed: true },
    });

    const hashBefore = await getSettlementHash(lifecycle.eventId);

    const mutation = await mutateSettledEvent(lifecycle.eventId, 99999.99);
    expect(mutation.rejected).toBe(true);

    const hashAfter = await getSettlementHash(lifecycle.eventId);
    expect(hashAfter).toBe(hashBefore);
  });
});
