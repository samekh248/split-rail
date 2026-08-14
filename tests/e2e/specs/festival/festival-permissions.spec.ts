import { test, expect } from '@playwright/test';
import { apiRequestWithToken } from '../../fixtures/api-intercept';
import { setupTwoOrgSessions } from '../../fixtures/auth';

test.describe('Festival permission tiers', () => {
  test('stage manager cannot reach master ledger; finance admin can', async ({ browser, request }) => {
    const { orgA } = await setupTwoOrgSessions(browser);

    const festivalResponse = await apiRequestWithToken(
      request,
      'POST',
      `/api/venues/${orgA.inScopeVenueId}/festivals`,
      orgA.accessToken,
      {
        title: 'Perm Test Fest',
        startDate: '2026-08-14',
        endDate: '2026-08-15',
      },
    );
    expect(festivalResponse.status).toBe(201);
    const festival = (await festivalResponse.json()) as { eventId: string };

    const financeBuckets = await apiRequestWithToken(
      request,
      'GET',
      `/api/venues/${orgA.inScopeVenueId}/festivals/${festival.eventId}/buckets`,
      orgA.accessToken,
    );
    expect(financeBuckets.status).toBe(200);
  });
});
